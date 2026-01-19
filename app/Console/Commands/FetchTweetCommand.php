<?php

namespace App\Console\Commands;

use App\Services\XApiService;
use Illuminate\Console\Command;

class FetchTweetCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tweet:fetch {id_or_url : ツイートIDまたはツイートURL}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'X (Twitter) APIからツイートを取得してコンソールに表示します';

    /**
     * Execute the console command.
     */
    public function handle(XApiService $xApiService): int
    {
        $input = $this->argument('id_or_url');

        $this->info("ツイートを取得中: {$input}");

        $tweet = $xApiService->fetchTweet($input);

        if ($tweet === null) {
            $rateLimitReset = $xApiService->getLastRateLimitReset();

            if ($rateLimitReset !== null) {
                // レート制限エラーの場合
                $now = time();
                $waitSeconds = $rateLimitReset - $now;

                if ($waitSeconds > 0) {
                    $waitMinutes = ceil($waitSeconds / 60);
                    $resetTime = date('Y-m-d H:i:s', $rateLimitReset);

                    $this->error('レート制限に達しました。');
                    $this->warn("リセット時刻: {$resetTime}");
                    $this->warn("あと約 {$waitMinutes} 分後に再度お試しください。");
                } else {
                    $this->error('レート制限エラーが発生しましたが、すでにリセット時刻を過ぎています。再度お試しください。');
                }
            } else {
                // その他のエラー
                $this->error('ツイートの取得に失敗しました。');
                $this->warn('以下を確認してください:');
                $this->line('  ・ツイートIDまたはURLが正しいか');
                $this->line('  ・ツイートが存在するか（削除されていないか）');
                $this->line('  ・Bearer Tokenが正しく設定されているか');
            }

            return 1;
        }

        $this->newLine();
        $this->displayTweet($tweet);

        return 0;
    }

    /**
     * ツイートデータをコンソールに整形表示する
     *
     * @param  array{id: string, text: string, created_at: ?string, author_id: ?string, public_metrics: ?array, lang: ?string}  $tweet
     */
    private function displayTweet(array $tweet): void
    {
        $this->line('┌─ ツイート情報 ─────────────────────────────────────────');
        $this->line('│');
        $this->line("│ ツイートID: {$tweet['id']}");

        if (isset($tweet['author_id'])) {
            $this->line("│ 投稿者ID: {$tweet['author_id']}");
        }

        if (isset($tweet['created_at'])) {
            $this->line("│ 投稿日時: {$tweet['created_at']}");
        }

        if (isset($tweet['lang'])) {
            $this->line("│ 言語: {$tweet['lang']}");
        }

        if (isset($tweet['public_metrics'])) {
            $metrics = $tweet['public_metrics'];
            $this->line('│');
            $this->line('│ エンゲージメント:');
            $this->line('│   ・リツイート: '.($metrics['retweet_count'] ?? 0));
            $this->line('│   ・いいね: '.($metrics['like_count'] ?? 0));
            $this->line('│   ・返信: '.($metrics['reply_count'] ?? 0));
            $this->line('│   ・引用: '.($metrics['quote_count'] ?? 0));
            $this->line('│   ・インプレッション: '.($metrics['impression_count'] ?? 0));
        }

        $this->line('│');
        $this->line('│ テキスト:');

        // テキストを複数行に分割して表示
        $textLines = explode("\n", $tweet['text']);
        foreach ($textLines as $line) {
            $this->line("│   {$line}");
        }

        $this->line('│');
        $this->line('└───────────────────────────────────────────────────────');
    }
}
