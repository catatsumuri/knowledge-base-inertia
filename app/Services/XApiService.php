<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Cache;
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
     * OAuth1認証情報のテスト用メソッド（自分のユーザー情報を取得）
     *
     * @return array<string, mixed>|null
     */
    public function verifyCredentials(): ?array
    {
        try {
            $response = $this->client->get('/2/users/me', [
                'headers' => $this->getAuthHeaders('GET', '/2/users/me', []),
            ]);

            $data = json_decode((string) $response->getBody(), true);
            $data['_response'] = [
                'status' => $response->getStatusCode(),
                'headers' => $response->getHeaders(),
            ];
            $data['_response'] = [
                'status' => $response->getStatusCode(),
                'headers' => $response->getHeaders(),
            ];
            $data['_response'] = [
                'status' => $response->getStatusCode(),
                'headers' => $response->getHeaders(),
            ];

            return $data;
        } catch (RequestException $e) {
            $statusCode = $e->getResponse()?->getStatusCode();
            $responseBody = $e->getResponse()?->getBody()->getContents();

            Log::error('認証情報の検証に失敗しました', [
                'status_code' => $statusCode,
                'error' => $e->getMessage(),
                'response_body' => $responseBody,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('認証情報の検証で予期しないエラーが発生しました', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
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

        $tweetFields = config('twitter.default_tweet_fields');
        $expansions = config('twitter.default_expansions');
        $mediaFields = config('twitter.default_media_fields');
        $userFields = config('twitter.default_user_fields');
        $cacheTtl = (int) config('twitter.tweet_cache_ttl', 0);
        $cacheKey = $this->getTweetCacheKey($tweetId, $tweetFields);

        if ($cacheTtl > 0) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached)) {
                return $cached;
            }
        }

        try {
            $query = [
                'tweet.fields' => $tweetFields,
            ];

            if (! empty($expansions)) {
                $query['expansions'] = $expansions;
            }

            if (! empty($mediaFields)) {
                $query['media.fields'] = $mediaFields;
            }

            if (! empty($userFields)) {
                $query['user.fields'] = $userFields;
            }

            $response = $this->client->get("/2/tweets/{$tweetId}", [
                'query' => $query,
                'headers' => $this->getAuthHeaders('GET', "/2/tweets/{$tweetId}", $query),
            ]);

            $data = json_decode((string) $response->getBody(), true);
            $data['_response'] = [
                'status' => $response->getStatusCode(),
                'headers' => $response->getHeaders(),
            ];

            if (! isset($data['data'])) {
                Log::warning('Tweet data not found in response', [
                    'tweet_id' => $tweetId,
                    'response' => $data,
                ]);

                return null;
            }

            if ($cacheTtl > 0) {
                Cache::put($cacheKey, $data['data'], $cacheTtl);
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
     * ツイート取得レスポンス（まるごと）を取得する
     *
     * @param  string  $idOrUrl  ツイートIDまたはURL
     * @return array<string, mixed>|null
     */
    public function fetchTweetRaw(string $idOrUrl): ?array
    {
        $tweetId = $this->extractTweetId($idOrUrl);

        if ($tweetId === null) {
            Log::warning('Invalid tweet ID or URL format', [
                'input' => $idOrUrl,
            ]);

            return null;
        }

        $tweetFields = config('twitter.default_tweet_fields');
        $expansions = config('twitter.default_expansions');
        $mediaFields = config('twitter.default_media_fields');
        $userFields = config('twitter.default_user_fields');
        $cacheTtl = (int) config('twitter.tweet_cache_ttl', 0);
        $cacheKey = $this->getTweetRawCacheKey($tweetId, $tweetFields);

        if ($cacheTtl > 0) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached)) {
                return $cached;
            }
        }

        try {
            $query = [
                'tweet.fields' => $tweetFields,
            ];

            if (! empty($expansions)) {
                $query['expansions'] = $expansions;
            }

            if (! empty($mediaFields)) {
                $query['media.fields'] = $mediaFields;
            }

            if (! empty($userFields)) {
                $query['user.fields'] = $userFields;
            }

            $response = $this->client->get("/2/tweets/{$tweetId}", [
                'query' => $query,
                'headers' => $this->getAuthHeaders('GET', "/2/tweets/{$tweetId}", $query),
            ]);

            $data = json_decode((string) $response->getBody(), true);

            if (! isset($data['data'])) {
                Log::warning('Tweet data not found in response', [
                    'tweet_id' => $tweetId,
                    'response' => $data,
                ]);

                return null;
            }

            if ($cacheTtl > 0) {
                Cache::put($cacheKey, $data, $cacheTtl);
            }

            return $data;
        } catch (RequestException $e) {
            $statusCode = $e->getResponse()?->getStatusCode();
            $responseBody = $e->getResponse()?->getBody()->getContents();

            if ($statusCode === 429 && $e->getResponse()) {
                $rateLimitReset = $e->getResponse()->getHeader('x-rate-limit-reset');
                $allHeaders = $e->getResponse()->getHeaders();

                Log::debug('X API 429レスポンスヘッダー', [
                    'all_headers' => $allHeaders,
                    'x_rate_limit_reset_header' => $rateLimitReset,
                ]);

                if (! empty($rateLimitReset)) {
                    $this->lastRateLimitReset = (int) $rateLimitReset[0];
                    Log::info('レート制限リセット時刻を設定', [
                        'reset_timestamp' => $this->lastRateLimitReset,
                    ]);
                } else {
                    Log::warning('x-rate-limit-resetヘッダーが見つかりません');
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
     * 会話IDに紐づくツイートID一覧を取得する（引用ツイートは除外）
     *
     * @return array<int, string>
     */
    public function fetchConversationTweetIds(string $conversationId): array
    {
        $tweetFields = config('twitter.default_tweet_fields');
        $expansions = config('twitter.default_expansions');
        $mediaFields = config('twitter.default_media_fields');
        $userFields = config('twitter.default_user_fields');

        $query = [
            'query' => "conversation_id:{$conversationId} -is:quote -is:retweet",
            'tweet.fields' => $tweetFields,
            'max_results' => 100,
        ];

        if (! empty($expansions)) {
            $query['expansions'] = $expansions;
        }

        if (! empty($mediaFields)) {
            $query['media.fields'] = $mediaFields;
        }

        if (! empty($userFields)) {
            $query['user.fields'] = $userFields;
        }

        $tweetIds = [];
        $nextToken = null;

        do {
            if ($nextToken !== null) {
                $query['next_token'] = $nextToken;
            } else {
                unset($query['next_token']);
            }

            try {
                $response = $this->client->get('/2/tweets/search/recent', [
                    'query' => $query,
                    'headers' => $this->getAuthHeaders('GET', '/2/tweets/search/recent', $query),
                ]);

                $data = json_decode((string) $response->getBody(), true);
                $items = $data['data'] ?? [];

                foreach ($items as $item) {
                    if (isset($item['id'])) {
                        $tweetIds[] = (string) $item['id'];
                    }
                }

                $meta = $data['meta'] ?? [];
                $newToken = $meta['next_token'] ?? null;

                dd([
                    'query' => $query,
                    'status' => $response->getStatusCode(),
                    'meta' => $meta,
                    'errors' => $data['errors'] ?? null,
                    'data_count' => count($items),
                    'reply_ids' => array_map(
                        fn (array $item) => $item['id'] ?? null,
                        array_filter($items, 'is_array')
                    ),
                ]);

                if ($newToken === $nextToken) {
                    break;
                }

                $nextToken = $newToken;
            } catch (RequestException $e) {
                $statusCode = $e->getResponse()?->getStatusCode();
                $responseBody = $e->getResponse()?->getBody()->getContents();

                if ($statusCode === 429 && $e->getResponse()) {
                    $rateLimitReset = $e->getResponse()->getHeader('x-rate-limit-reset');
                    if (! empty($rateLimitReset)) {
                        $this->lastRateLimitReset = (int) $rateLimitReset[0];
                    }
                }

                Log::warning('X API search request failed', [
                    'conversation_id' => $conversationId,
                    'status_code' => $statusCode,
                    'error' => $e->getMessage(),
                    'response_body' => $responseBody,
                    'rate_limit_reset' => $this->lastRateLimitReset,
                ]);

                break;
            } catch (\Exception $e) {
                Log::error('X API search unexpected error', [
                    'conversation_id' => $conversationId,
                    'error' => $e->getMessage(),
                ]);

                break;
            }
        } while ($nextToken !== null);

        return array_values(array_unique($tweetIds));
    }

    /**
     * ツイートキャッシュキーを生成する
     */
    private function getTweetCacheKey(string $tweetId, string $tweetFields): string
    {
        return 'tweet:'.$tweetId.':fields:'.md5($tweetFields);
    }

    /**
     * ツイート取得レスポンス（まるごと）のキャッシュキーを生成する
     */
    private function getTweetRawCacheKey(string $tweetId, string $tweetFields): string
    {
        return 'tweet:raw:'.$tweetId.':fields:'.md5($tweetFields);
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, string>
     */
    private function getAuthHeaders(string $method, string $path, array $query): array
    {
        if ($this->useOauth1()) {
            Log::info('OAuth1を使用します', [
                'method' => $method,
                'path' => $path,
            ]);
            $oauthHeader = $this->buildOauth1Header($method, $path, $query);
            if ($oauthHeader !== null) {
                Log::info('OAuth1 Authorizationヘッダーを生成しました');

                return ['Authorization' => $oauthHeader];
            }
            Log::warning('OAuth1ヘッダーの生成に失敗しました（認証情報が不足している可能性があります）');
        } else {
            Log::info('Bearer Tokenを使用します');
        }

        $bearer = (string) config('twitter.bearer_token');

        return $bearer !== '' ? ['Authorization' => 'Bearer '.$bearer] : [];
    }

    private function useOauth1(): bool
    {
        return (bool) config('twitter.use_oauth1');
    }

    /**
     * OAuth 1.0a Authorization header生成
     *
     * @param  array<string, mixed>  $query
     */
    private function buildOauth1Header(string $method, string $path, array $query): ?string
    {
        $consumerKey = (string) config('twitter.oauth1_consumer_key');
        $consumerSecret = (string) config('twitter.oauth1_consumer_secret');
        $token = (string) config('twitter.oauth1_access_token');
        $tokenSecret = (string) config('twitter.oauth1_access_token_secret');

        if ($consumerKey === '' || $consumerSecret === '' || $token === '' || $tokenSecret === '') {
            return null;
        }

        $oauthParams = [
            'oauth_consumer_key' => $consumerKey,
            'oauth_nonce' => bin2hex(random_bytes(16)),
            'oauth_signature_method' => 'HMAC-SHA1',
            'oauth_timestamp' => (string) time(),
            'oauth_token' => $token,
            'oauth_version' => '1.0',
        ];

        $signatureParams = $this->normalizeOauthParams(array_merge($query, $oauthParams));
        $baseUrl = rtrim((string) config('twitter.base_url'), '/').$path;
        $baseString = strtoupper($method)
            .'&'.$this->oauthEncode($baseUrl)
            .'&'.$this->oauthEncode($signatureParams);

        Log::debug('OAuth1署名生成', [
            'base_url' => $baseUrl,
            'method' => $method,
            'query_params' => $query,
            'signature_params' => $signatureParams,
            'base_string' => $baseString,
        ]);

        $signingKey = $this->oauthEncode($consumerSecret).'&'.$this->oauthEncode($tokenSecret);
        $oauthParams['oauth_signature'] = base64_encode(hash_hmac('sha1', $baseString, $signingKey, true));

        $headerParts = [];
        foreach ($oauthParams as $key => $value) {
            $headerParts[] = $this->oauthEncode((string) $key).'="'.$this->oauthEncode((string) $value).'"';
        }

        return 'OAuth '.implode(', ', $headerParts);
    }

    /**
     * @param  array<string, mixed>  $params
     */
    private function normalizeOauthParams(array $params): string
    {
        $pairs = [];

        foreach ($params as $key => $value) {
            if (is_array($value)) {
                foreach ($value as $item) {
                    $pairs[] = [$this->oauthEncode((string) $key), $this->oauthEncode((string) $item)];
                }

                continue;
            }

            $pairs[] = [$this->oauthEncode((string) $key), $this->oauthEncode((string) $value)];
        }

        usort($pairs, function ($left, $right) {
            if ($left[0] === $right[0]) {
                return $left[1] <=> $right[1];
            }

            return $left[0] <=> $right[0];
        });

        return implode('&', array_map(fn ($pair) => $pair[0].'='.$pair[1], $pairs));
    }

    private function oauthEncode(string $value): string
    {
        return str_replace('%7E', '~', rawurlencode($value));
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
