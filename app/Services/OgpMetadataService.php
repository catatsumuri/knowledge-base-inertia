<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;
use Symfony\Component\DomCrawler\Crawler;

class OgpMetadataService
{
    public function __construct(
        private Client $client = new Client([
            'timeout' => 10,
            'allow_redirects' => true,
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (compatible; OGP-Fetcher/1.0)',
            ],
        ])
    ) {}

    /**
     * URLからOGPメタデータを取得する
     *
     * @param  string  $url  取得対象のURL
     * @return array{title: ?string, description: ?string, image: ?string, url: string}|null
     */
    public function fetch(string $url): ?array
    {
        try {
            // URLの検証
            if (! filter_var($url, FILTER_VALIDATE_URL)) {
                return null;
            }

            // HTTPリクエスト
            $response = $this->client->get($url);
            $html = (string) $response->getBody();

            // HTMLをパース
            $crawler = new Crawler($html);

            // OGPメタデータを抽出
            $metadata = [
                'title' => $this->extractOgpTag($crawler, 'og:title')
                    ?? $this->extractTitle($crawler),
                'description' => $this->extractOgpTag($crawler, 'og:description')
                    ?? $this->extractMetaTag($crawler, 'description'),
                'image' => $this->extractOgpTag($crawler, 'og:image'),
                'url' => $url,
            ];

            // タイトルが取得できない場合はnullを返す
            if (empty($metadata['title'])) {
                return null;
            }

            return $metadata;
        } catch (RequestException $e) {
            Log::warning('OGP fetch failed', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        } catch (\Exception $e) {
            Log::error('OGP fetch error', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * OGPメタタグの値を抽出
     */
    private function extractOgpTag(Crawler $crawler, string $property): ?string
    {
        try {
            $value = $crawler
                ->filterXPath("//meta[@property='{$property}']")
                ->first()
                ->attr('content');

            return ! empty($value) ? trim($value) : null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * 通常のmetaタグの値を抽出
     */
    private function extractMetaTag(Crawler $crawler, string $name): ?string
    {
        try {
            $value = $crawler
                ->filterXPath("//meta[@name='{$name}']")
                ->first()
                ->attr('content');

            return ! empty($value) ? trim($value) : null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * titleタグの値を抽出
     */
    private function extractTitle(Crawler $crawler): ?string
    {
        try {
            $value = $crawler->filterXPath('//title')->first()->text();

            return ! empty($value) ? trim($value) : null;
        } catch (\Exception) {
            return null;
        }
    }
}
