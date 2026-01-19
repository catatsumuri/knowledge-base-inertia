<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;

class XApiService
{
    private Client $client;

    private ?int $lastRateLimitReset = null;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'base_uri' => config('twitter.base_url'),
            'timeout' => config('twitter.request_timeout'),
            'headers' => [
                'Authorization' => 'Bearer '.config('twitter.bearer_token'),
                'User-Agent' => 'Laravel-X-API-Client/1.0',
            ],
        ]);
    }

    /**
     * 最後のレート制限リセット時刻（Unixタイムスタンプ）を取得
     */
    public function getLastRateLimitReset(): ?int
    {
        return $this->lastRateLimitReset;
    }

    /**
     * ツイートIDまたはURLからツイートデータを取得する
     *
     * @param  string  $idOrUrl  ツイートID（例: "1234567890123456789"）または
     *                           ツイートURL（例: "https://x.com/user/status/1234567890123456789"）
     * @return array{id: string, text: string, created_at: ?string, author_id: ?string, public_metrics: ?array, lang: ?string, possibly_sensitive: ?bool}|null
     */
    public function fetchTweet(string $idOrUrl): ?array
    {
        $tweetId = $this->extractTweetId($idOrUrl);

        if ($tweetId === null) {
            Log::warning('Invalid tweet ID or URL format', [
                'input' => $idOrUrl,
            ]);

            return null;
        }

        try {
            $response = $this->client->get("/2/tweets/{$tweetId}", [
                'query' => [
                    'tweet.fields' => config('twitter.default_tweet_fields'),
                ],
            ]);

            $data = json_decode((string) $response->getBody(), true);

            if (! isset($data['data'])) {
                Log::warning('Tweet data not found in response', [
                    'tweet_id' => $tweetId,
                    'response' => $data,
                ]);

                return null;
            }

            return $data['data'];
        } catch (RequestException $e) {
            $statusCode = $e->getResponse()?->getStatusCode();
            $responseBody = $e->getResponse()?->getBody()->getContents();

            // レート制限エラーの場合、リセット時刻を取得
            if ($statusCode === 429 && $e->getResponse()) {
                $rateLimitReset = $e->getResponse()->getHeader('x-rate-limit-reset');
                if (! empty($rateLimitReset)) {
                    $this->lastRateLimitReset = (int) $rateLimitReset[0];
                }
            }

            Log::warning('X API request failed', [
                'tweet_id' => $tweetId,
                'status_code' => $statusCode,
                'error' => $e->getMessage(),
                'response_body' => $responseBody,
                'rate_limit_reset' => $this->lastRateLimitReset,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('X API unexpected error', [
                'tweet_id' => $tweetId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * ツイートIDまたはURLからツイートIDを抽出する
     *
     * 対応フォーマット:
     * - "1234567890123456789"（ツイートIDのみ）
     * - "https://x.com/username/status/1234567890123456789"
     * - "https://twitter.com/username/status/1234567890123456789"
     * - "https://x.com/i/web/status/1234567890123456789"
     *
     * @param  string  $idOrUrl  ツイートIDまたはURL
     * @return string|null 抽出されたツイートID、失敗時はnull
     */
    public function extractTweetId(string $idOrUrl): ?string
    {
        $input = trim($idOrUrl);

        // ツイートIDのみの場合（数字のみで18-19桁）
        if (preg_match('/^\d{18,19}$/', $input)) {
            return $input;
        }

        // URL形式の場合
        // x.comまたはtwitter.comドメインのstatus/[ID]パターンをマッチ
        if (preg_match('#(?:x\.com|twitter\.com)/(?:\w+|i/web)/status/(\d{18,19})#i', $input, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
