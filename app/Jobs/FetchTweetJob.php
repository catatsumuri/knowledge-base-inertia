<?php

namespace App\Jobs;

use App\Concerns\HandlesTweetMedia;
use App\Models\Tweet;
use App\Models\TweetFetchJob as TweetFetchJobModel;
use App\Services\XApiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class FetchTweetJob implements ShouldQueue
{
    use HandlesTweetMedia;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $maxExceptions = 3;

    public int $timeout = 120;

    public function __construct(
        public int $tweetFetchJobId,
        public string $tweetId
    ) {}

    public function handle(XApiService $xApiService): void
    {
        $queueJob = $this->job;
        $connectionName = null;
        $queueName = null;

        if ($queueJob !== null) {
            $queueName = $queueJob->getQueue();
            if (method_exists($queueJob, 'getConnectionName')) {
                $connectionName = $queueJob->getConnectionName();
            }
        }

        Log::channel('tweet_queue')->debug('FetchTweetJob started', [
            'tweet_id' => $this->tweetId,
            'tweet_fetch_job_id' => $this->tweetFetchJobId,
            'queue_connection' => $connectionName ?? config('queue.default'),
            'queue_name' => $queueName ?? config('queue.connections.'.config('queue.default').'.queue'),
        ]);

        $tweetFetchJob = TweetFetchJobModel::find($this->tweetFetchJobId);

        if ($tweetFetchJob === null) {
            Log::channel('tweet_queue')->debug('FetchTweetJob record missing', [
                'tweet_id' => $this->tweetId,
                'tweet_fetch_job_id' => $this->tweetFetchJobId,
            ]);
            return;
        }

        // ステータスを処理中に更新
        $tweetFetchJob->update(['status' => 'processing']);

        $rawTweet = $xApiService->fetchTweetRaw($this->tweetId);

        // レート制限チェック
        $rateLimitReset = $xApiService->getLastRateLimitReset();

        Log::channel('tweet_queue')->debug('FetchTweetJob: rate limit check', [
            'tweet_id' => $this->tweetId,
            'raw_tweet_is_null' => $rawTweet === null,
            'rate_limit_reset' => $rateLimitReset,
        ]);

        if ($rateLimitReset !== null) {
            $resetAt = Carbon::createFromTimestamp($rateLimitReset);
            $now = now();

            // リセット時刻が未来の場合はその時刻まで、過去の場合は現在時刻から15分後
            if ($resetAt->isFuture()) {
                // 念のため max(0, ...) で負の値を防ぐ
                $delaySeconds = max(0, $resetAt->diffInSeconds($now)) + 5;
            } else {
                // リセット時刻が過去の場合は、現在時刻から15分後に設定
                $resetAt = $now->copy()->addMinutes(15);
                $delaySeconds = 15 * 60 + 5;
            }

            Log::channel('tweet_queue')->debug('FetchTweetJob: delayed due to rate limit', [
                'tweet_id' => $this->tweetId,
                'reset_at' => $resetAt->toISOString(),
                'delay_seconds' => $delaySeconds,
            ]);

            $tweetFetchJob->update([
                'status' => 'pending',
                'rate_limit_reset_at' => $resetAt,
            ]);

            // 現在のジョブを削除して、遅延付きで新しいジョブをディスパッチ
            // これによりリトライカウントがリセットされる
            $this->delete();
            self::dispatch($this->tweetFetchJobId, $this->tweetId)
                ->delay($delaySeconds);

            return;
        }

        // ツイート取得失敗
        if ($rawTweet === null) {
            throw new \Exception('ツイートの取得に失敗しました。削除済みまたは非公開の可能性があります。');
        }

        // ツイート保存処理
        $tweet = $rawTweet['data'] ?? [];
        $mediaEntries = $this->extractMediaEntries($rawTweet);
        $responseStatus = $rawTweet['_response']['status'] ?? null;
        $responseHeaders = $rawTweet['_response']['headers'] ?? null;

        $tweetModel = Tweet::updateOrCreate(
            ['tweet_id' => $this->tweetId],
            [
                'payload' => $rawTweet,
                'fetched_at' => now(),
                'text' => $tweet['text'] ?? null,
                'author_id' => $tweet['author_id'] ?? null,
                'lang' => $tweet['lang'] ?? null,
                'tweet_created_at' => isset($tweet['created_at'])
                    ? Carbon::parse($tweet['created_at'])
                    : null,
                'media_metadata' => $mediaEntries,
                'response_status' => $responseStatus,
                'response_headers' => $responseHeaders,
                'reply_count' => data_get($tweet, 'public_metrics.reply_count'),
            ]
        );

        $mediaEntriesWithIds = $this->storeTweetMedia($tweetModel, $mediaEntries);
        if ($mediaEntriesWithIds !== $mediaEntries) {
            $tweetModel->forceFill(['media_metadata' => $mediaEntriesWithIds])->save();
        }

        // 親ツイートの自動取得処理
        $this->fetchParentTweetIfNeeded($tweet, $tweetModel);

        // このツイートを参照している子ツイートの関係を更新
        $this->updateChildTweetsRelationship($tweetModel);

        // 成功時にステータス更新
        $tweetFetchJob->update([
            'status' => 'completed',
            'tweet_record_id' => $tweetModel->id,
            'error_message' => null,
        ]);

        // 成功時刻をキャッシュに保存（15分間有効）
        \Illuminate\Support\Facades\Cache::put(
            'x_api_last_success',
            now()->toISOString(),
            now()->addMinutes(15)
        );
    }

    /**
     * 親ツイートが存在する場合、自動的に取得する
     */
    private function fetchParentTweetIfNeeded(array $tweet, Tweet $tweetModel): void
    {
        // referenced_tweetsがない場合は何もしない
        if (! isset($tweet['referenced_tweets']) || ! is_array($tweet['referenced_tweets'])) {
            return;
        }

        // replied_toタイプの参照を探す
        $repliedTo = collect($tweet['referenced_tweets'])
            ->firstWhere('type', 'replied_to');

        if ($repliedTo === null || ! isset($repliedTo['id'])) {
            return;
        }

        $parentTweetId = $repliedTo['id'];

        // 既にDBに親ツイートが存在するかチェック
        $parentTweet = Tweet::where('tweet_id', $parentTweetId)->first();

        if ($parentTweet !== null) {
            // 既に存在する場合は、parent_tweet_idを更新
            $tweetModel->update(['parent_tweet_id' => $parentTweet->id]);

            Log::channel('tweet_queue')->debug('FetchTweetJob: parent tweet already exists', [
                'tweet_id' => $this->tweetId,
                'parent_tweet_id' => $parentTweetId,
            ]);

            return;
        }

        // 親ツイートが存在しない場合は、取得ジョブを作成
        $existingJob = TweetFetchJobModel::where('tweet_id', $parentTweetId)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if ($existingJob !== null) {
            // 既にジョブが存在する場合は何もしない
            Log::channel('tweet_queue')->debug('FetchTweetJob: parent fetch job already exists', [
                'tweet_id' => $this->tweetId,
                'parent_tweet_id' => $parentTweetId,
            ]);

            return;
        }

        // 新しいジョブを作成
        $jobRecord = TweetFetchJobModel::create([
            'tweet_id' => $parentTweetId,
            'status' => 'pending',
        ]);

        // 遅延なしでジョブをディスパッチ
        self::dispatch($jobRecord->id, $parentTweetId);

        Log::channel('tweet_queue')->debug('FetchTweetJob: parent fetch job created', [
            'tweet_id' => $this->tweetId,
            'parent_tweet_id' => $parentTweetId,
            'job_id' => $jobRecord->id,
        ]);
    }

    /**
     * このツイートを参照している子ツイートの関係を更新
     */
    private function updateChildTweetsRelationship(Tweet $tweetModel): void
    {
        // このツイートを参照している子ツイートを探す
        // payloadのreferenced_tweetsにこのツイートIDが含まれているツイートを探す
        $childTweets = Tweet::whereNotNull('payload')
            ->where('parent_tweet_id', null)
            ->get()
            ->filter(function (Tweet $tweet) use ($tweetModel) {
                $payload = $tweet->payload;

                if (! isset($payload['data']['referenced_tweets']) || ! is_array($payload['data']['referenced_tweets'])) {
                    return false;
                }

                // replied_toタイプで現在のツイートを参照しているかチェック
                $repliedTo = collect($payload['data']['referenced_tweets'])
                    ->firstWhere('type', 'replied_to');

                return $repliedTo !== null &&
                    isset($repliedTo['id']) &&
                    $repliedTo['id'] === $tweetModel->tweet_id;
            });

        if ($childTweets->isEmpty()) {
            return;
        }

        // 子ツイートのparent_tweet_idを更新
        foreach ($childTweets as $childTweet) {
            $childTweet->update(['parent_tweet_id' => $tweetModel->id]);

            \Illuminate\Support\Facades\Log::info('FetchTweetJob: 子ツイートの親子関係を更新', [
                'parent_tweet_id' => $tweetModel->tweet_id,
                'child_tweet_id' => $childTweet->tweet_id,
            ]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        $tweetFetchJob = TweetFetchJobModel::find($this->tweetFetchJobId);

        if ($tweetFetchJob !== null) {
            $tweetFetchJob->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
            ]);
        }
    }
}
