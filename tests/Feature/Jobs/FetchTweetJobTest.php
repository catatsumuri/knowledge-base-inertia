<?php

namespace Tests\Feature\Jobs;

use App\Jobs\FetchTweetJob;
use App\Models\Tweet;
use App\Models\TweetFetchJob as TweetFetchJobModel;
use App\Services\XApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FetchTweetJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_親ツイートが自動的にキューに追加される(): void
    {
        Queue::fake();

        // XApiServiceをモック
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweetRaw')
            ->once()
            ->with('1234567890123456789')
            ->andReturn([
                'data' => [
                    'id' => '1234567890123456789',
                    'text' => 'これは返信ツイートです',
                    'created_at' => '2026-01-19T12:34:56.000Z',
                    'author_id' => '9876543210',
                    'lang' => 'ja',
                    'referenced_tweets' => [
                        [
                            'type' => 'replied_to',
                            'id' => '9999999999999999999',
                        ],
                    ],
                ],
            ]);

        $mockService->shouldReceive('getLastRateLimitReset')
            ->once()
            ->andReturn(null);

        // ジョブレコードを作成
        $jobRecord = TweetFetchJobModel::create([
            'tweet_id' => '1234567890123456789',
            'status' => 'pending',
        ]);

        // ジョブを実行
        $job = new FetchTweetJob($jobRecord->id, '1234567890123456789');
        $job->handle($mockService);

        // ツイートが保存されたことを確認
        $this->assertDatabaseHas('tweets', [
            'tweet_id' => '1234567890123456789',
            'text' => 'これは返信ツイートです',
        ]);

        // 親ツイートの取得ジョブが作成されたことを確認
        $this->assertDatabaseHas('tweet_fetch_jobs', [
            'tweet_id' => '9999999999999999999',
            'status' => 'pending',
        ]);

        // ジョブがディスパッチされたことを確認
        Queue::assertPushed(FetchTweetJob::class, function ($job) {
            return $job->tweetId === '9999999999999999999';
        });
    }

    public function test_親ツイートが取得されたときに子ツイートの関係が更新される(): void
    {
        // 子ツイートを先に保存（parent_tweet_idはnull）
        $childTweet = Tweet::create([
            'tweet_id' => '1234567890123456789',
            'payload' => [
                'data' => [
                    'id' => '1234567890123456789',
                    'text' => 'これは返信ツイートです',
                    'referenced_tweets' => [
                        [
                            'type' => 'replied_to',
                            'id' => '9999999999999999999',
                        ],
                    ],
                ],
            ],
            'fetched_at' => now(),
            'text' => 'これは返信ツイートです',
            'author_id' => '9876543210',
            'lang' => 'ja',
            'tweet_created_at' => now(),
        ]);

        $this->assertNull($childTweet->parent_tweet_id);

        // XApiServiceをモック（親ツイート取得）
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweetRaw')
            ->once()
            ->with('9999999999999999999')
            ->andReturn([
                'data' => [
                    'id' => '9999999999999999999',
                    'text' => 'これは親ツイートです',
                    'created_at' => '2026-01-19T12:00:00.000Z',
                    'author_id' => '9876543210',
                    'lang' => 'ja',
                ],
            ]);

        $mockService->shouldReceive('getLastRateLimitReset')
            ->once()
            ->andReturn(null);

        // 親ツイート取得ジョブレコードを作成
        $jobRecord = TweetFetchJobModel::create([
            'tweet_id' => '9999999999999999999',
            'status' => 'pending',
        ]);

        // ジョブを実行
        $job = new FetchTweetJob($jobRecord->id, '9999999999999999999');
        $job->handle($mockService);

        // 親ツイートが保存されたことを確認
        $parentTweet = Tweet::where('tweet_id', '9999999999999999999')->first();
        $this->assertNotNull($parentTweet);

        // 子ツイートのparent_tweet_idが更新されたことを確認
        $childTweet->refresh();
        $this->assertEquals($parentTweet->id, $childTweet->parent_tweet_id);
    }

    public function test_返信でないツイートは親ツイートを取得しない(): void
    {
        Queue::fake();

        // XApiServiceをモック
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweetRaw')
            ->once()
            ->with('1234567890123456789')
            ->andReturn([
                'data' => [
                    'id' => '1234567890123456789',
                    'text' => 'これは通常のツイートです',
                    'created_at' => '2026-01-19T12:34:56.000Z',
                    'author_id' => '9876543210',
                    'lang' => 'ja',
                ],
            ]);

        $mockService->shouldReceive('getLastRateLimitReset')
            ->once()
            ->andReturn(null);

        // ジョブレコードを作成
        $jobRecord = TweetFetchJobModel::create([
            'tweet_id' => '1234567890123456789',
            'status' => 'pending',
        ]);

        // ジョブを実行
        $job = new FetchTweetJob($jobRecord->id, '1234567890123456789');
        $job->handle($mockService);

        // ツイートが保存されたことを確認
        $this->assertDatabaseHas('tweets', [
            'tweet_id' => '1234567890123456789',
            'text' => 'これは通常のツイートです',
        ]);

        // 親ツイートの取得ジョブが作成されていないことを確認
        $this->assertDatabaseMissing('tweet_fetch_jobs', [
            'status' => 'pending',
        ]);

        // ジョブがディスパッチされていないことを確認（元のジョブ以外）
        Queue::assertNotPushed(FetchTweetJob::class);
    }

    public function test_既に存在する親ツイートの場合は関係のみ更新する(): void
    {
        Queue::fake();

        // 親ツイートを先に作成
        $parentTweet = Tweet::create([
            'tweet_id' => '9999999999999999999',
            'payload' => ['data' => ['id' => '9999999999999999999']],
            'fetched_at' => now(),
            'text' => 'これは親ツイートです',
            'author_id' => '9876543210',
            'lang' => 'ja',
            'tweet_created_at' => now(),
        ]);

        // XApiServiceをモック（子ツイート取得）
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweetRaw')
            ->once()
            ->with('1234567890123456789')
            ->andReturn([
                'data' => [
                    'id' => '1234567890123456789',
                    'text' => 'これは返信ツイートです',
                    'created_at' => '2026-01-19T12:34:56.000Z',
                    'author_id' => '9876543210',
                    'lang' => 'ja',
                    'referenced_tweets' => [
                        [
                            'type' => 'replied_to',
                            'id' => '9999999999999999999',
                        ],
                    ],
                ],
            ]);

        $mockService->shouldReceive('getLastRateLimitReset')
            ->once()
            ->andReturn(null);

        // ジョブレコードを作成
        $jobRecord = TweetFetchJobModel::create([
            'tweet_id' => '1234567890123456789',
            'status' => 'pending',
        ]);

        // ジョブを実行
        $job = new FetchTweetJob($jobRecord->id, '1234567890123456789');
        $job->handle($mockService);

        // 子ツイートが保存され、parent_tweet_idが設定されたことを確認
        $childTweet = Tweet::where('tweet_id', '1234567890123456789')->first();
        $this->assertNotNull($childTweet);
        $this->assertEquals($parentTweet->id, $childTweet->parent_tweet_id);

        // 新しいジョブが作成されていないことを確認（親ツイートは既に存在するため）
        $this->assertEquals(1, TweetFetchJobModel::count());

        // ジョブがディスパッチされていないことを確認
        Queue::assertNotPushed(FetchTweetJob::class);
    }
}
