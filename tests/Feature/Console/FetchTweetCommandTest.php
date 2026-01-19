<?php

namespace Tests\Feature\Console;

use App\Services\XApiService;
use Tests\TestCase;

class FetchTweetCommandTest extends TestCase
{
    public function test_有効なツイートidでコマンドが成功する(): void
    {
        // XApiServiceをモック
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweet')
            ->once()
            ->with('1234567890123456789')
            ->andReturn([
                'id' => '1234567890123456789',
                'text' => 'これはテストツイートです',
                'created_at' => '2026-01-19T12:34:56.000Z',
                'author_id' => '9876543210',
                'lang' => 'ja',
                'public_metrics' => [
                    'retweet_count' => 10,
                    'reply_count' => 5,
                    'like_count' => 50,
                    'quote_count' => 2,
                    'impression_count' => 1000,
                ],
            ]);

        $this->artisan('tweet:fetch', ['id_or_url' => '1234567890123456789'])
            ->expectsOutput('ツイートを取得中: 1234567890123456789')
            ->assertExitCode(0);
    }

    public function test_無効なidでエラーメッセージが表示される(): void
    {
        // XApiServiceをモック
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweet')
            ->once()
            ->with('invalid')
            ->andReturn(null);

        $this->artisan('tweet:fetch', ['id_or_url' => 'invalid'])
            ->expectsOutput('ツイートを取得中: invalid')
            ->expectsOutput('ツイートの取得に失敗しました。ツイートIDまたはURLが正しいか確認してください。')
            ->assertExitCode(1);
    }

    public function test_urlからツイートを取得できる(): void
    {
        // XApiServiceをモック
        $mockService = $this->mock(XApiService::class);
        $mockService->shouldReceive('fetchTweet')
            ->once()
            ->with('https://x.com/user/status/1234567890123456789')
            ->andReturn([
                'id' => '1234567890123456789',
                'text' => 'URLからの取得テスト',
                'created_at' => '2026-01-19T12:34:56.000Z',
                'author_id' => '9876543210',
                'lang' => 'ja',
            ]);

        $this->artisan('tweet:fetch', ['id_or_url' => 'https://x.com/user/status/1234567890123456789'])
            ->assertExitCode(0);
    }
}
