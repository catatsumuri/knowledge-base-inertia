<?php

namespace Tests\Unit\Services;

use App\Services\XApiService;
use PHPUnit\Framework\TestCase;

class XApiServiceTest extends TestCase
{
    private XApiService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // 実際のHTTPリクエストは送信せず、extractTweetId()のテストのみ実施
        // モックのClientを渡してconfig()関数の呼び出しを回避
        $mockClient = $this->createMock(\GuzzleHttp\Client::class);
        $this->service = new XApiService($mockClient);
    }

    public function test_ツイートidのみで抽出できる(): void
    {
        $result = $this->service->extractTweetId('1234567890123456789');

        $this->assertSame('1234567890123456789', $result);
    }

    public function test_x_comのurlからidを抽出できる(): void
    {
        $result = $this->service->extractTweetId('https://x.com/elonmusk/status/1234567890123456789');

        $this->assertSame('1234567890123456789', $result);
    }

    public function test_twitter_comのurlからidを抽出できる(): void
    {
        $result = $this->service->extractTweetId('https://twitter.com/elonmusk/status/1234567890123456789');

        $this->assertSame('1234567890123456789', $result);
    }

    public function test_i_web形式のurlからidを抽出できる(): void
    {
        $result = $this->service->extractTweetId('https://x.com/i/web/status/1234567890123456789');

        $this->assertSame('1234567890123456789', $result);
    }

    public function test_無効な形式でnullが返される(): void
    {
        $result = $this->service->extractTweetId('invalid');

        $this->assertNull($result);
    }

    public function test_短すぎるidでnullが返される(): void
    {
        $result = $this->service->extractTweetId('12345');

        $this->assertNull($result);
    }

    public function test_空文字列でnullが返される(): void
    {
        $result = $this->service->extractTweetId('');

        $this->assertNull($result);
    }

    public function test_前後の空白を除去してidを抽出できる(): void
    {
        $result = $this->service->extractTweetId('  1234567890123456789  ');

        $this->assertSame('1234567890123456789', $result);
    }
}
