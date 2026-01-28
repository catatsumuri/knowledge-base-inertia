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
        public TweetFetchJobModel $tweetFetchJob,
        public string $tweetId
    ) {}

    public function handle(XApiService $xApiService): void
    {
        // ステータスを処理中に更新
        $this->tweetFetchJob->update(['status' => 'processing']);

        $rawTweet = $xApiService->fetchTweetRaw($this->tweetId);

        // レート制限チェック
        $rateLimitReset = $xApiService->getLastRateLimitReset();

        \Illuminate\Support\Facades\Log::info('FetchTweetJob: レート制限チェック', [
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

            \Illuminate\Support\Facades\Log::info('FetchTweetJob: レート制限により遅延', [
                'tweet_id' => $this->tweetId,
                'reset_at' => $resetAt->toISOString(),
                'delay_seconds' => $delaySeconds,
            ]);

            $this->tweetFetchJob->update([
                'status' => 'pending',
                'rate_limit_reset_at' => $resetAt,
            ]);

            // 現在のジョブを削除して、遅延付きで新しいジョブをディスパッチ
            // これによりリトライカウントがリセットされる
            $this->delete();
            self::dispatch($this->tweetFetchJob, $this->tweetId)
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
            ]
        );

        $mediaEntriesWithIds = $this->storeTweetMedia($tweetModel, $mediaEntries);
        if ($mediaEntriesWithIds !== $mediaEntries) {
            $tweetModel->forceFill(['media_metadata' => $mediaEntriesWithIds])->save();
        }

        // 成功時にステータス更新
        $this->tweetFetchJob->update([
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

    public function failed(\Throwable $exception): void
    {
        $this->tweetFetchJob->update([
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
        ]);
    }
}
