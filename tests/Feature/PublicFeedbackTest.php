<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PublicFeedbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('honeypot.enabled', false);
    }

    public function test_public_feedback_is_not_available_when_public_views_disabled(): void
    {
        Config::set('app.public_views', false);

        $response = $this->withSession(['public_feedback_captcha_answer' => 3])->post('/pages/feedback', [
            'feedback_content' => 'Test feedback',
            'page_slug' => 'test-page',
            'page_url' => 'http://example.com/pages/test-page',
            'captcha_answer' => 3,
        ]);

        $response->assertStatus(404);
    }

    public function test_can_submit_feedback_successfully(): void
    {
        Config::set('app.public_views', true);

        Log::shouldReceive('channel')
            ->with('feedback_notifications')
            ->once()
            ->andReturnSelf();

        Log::shouldReceive('info')
            ->once()
            ->withArgs(function ($message) {
                return str_contains($message, '📝 公開ページフィードバック受信') &&
                    str_contains($message, 'Test feedback') &&
                    str_contains($message, 'test-page');
            });

        $response = $this->withSession(['public_feedback_captcha_answer' => 5])->post('/pages/feedback', [
            'feedback_content' => 'Test feedback',
            'page_slug' => 'test-page',
            'page_url' => 'http://example.com/pages/test-page',
            'captcha_answer' => 5,
        ]);

        $response->assertRedirect();
    }

    public function test_feedback_content_is_required(): void
    {
        Config::set('app.public_views', true);

        $response = $this->withSession(['public_feedback_captcha_answer' => 1])->post('/pages/feedback', [
            'feedback_content' => '',
            'page_slug' => 'test-page',
            'captcha_answer' => 1,
        ]);

        $response->assertSessionHasErrors(['feedback_content']);
    }

    public function test_feedback_content_has_max_length(): void
    {
        Config::set('app.public_views', true);

        $longContent = str_repeat('a', 2001);

        $response = $this->withSession(['public_feedback_captcha_answer' => 2])->post('/pages/feedback', [
            'feedback_content' => $longContent,
            'page_slug' => 'test-page',
            'captcha_answer' => 2,
        ]);

        $response->assertSessionHasErrors(['feedback_content']);
    }

    public function test_page_slug_is_required(): void
    {
        Config::set('app.public_views', true);

        $response = $this->withSession(['public_feedback_captcha_answer' => 4])->post('/pages/feedback', [
            'feedback_content' => 'Test feedback',
            'captcha_answer' => 4,
        ]);

        $response->assertSessionHasErrors(['page_slug']);
    }

    public function test_slack_notification_is_sent(): void
    {
        Config::set('app.public_views', true);

        Log::shouldReceive('channel')
            ->with('feedback_notifications')
            ->once()
            ->andReturnSelf();

        Log::shouldReceive('info')
            ->once()
            ->withArgs(function ($message) {
                return str_contains($message, '📝 公開ページフィードバック受信') &&
                    str_contains($message, 'フィードバック内容:') &&
                    str_contains($message, '送信日時:');
            });

        $this->withSession(['public_feedback_captcha_answer' => 6])->post('/pages/feedback', [
            'feedback_content' => 'Great documentation!',
            'page_slug' => 'getting-started',
            'page_url' => 'http://example.com/pages/getting-started',
            'captcha_answer' => 6,
        ]);
    }

    public function test_captcha_answer_is_required(): void
    {
        Config::set('app.public_views', true);

        $response = $this->withSession(['public_feedback_captcha_answer' => 7])->post('/pages/feedback', [
            'feedback_content' => 'Test feedback',
            'page_slug' => 'test-page',
        ]);

        $response->assertSessionHasErrors(['captcha_answer']);
    }

    public function test_captcha_answer_must_match(): void
    {
        Config::set('app.public_views', true);

        $response = $this->withSession(['public_feedback_captcha_answer' => 8])->post('/pages/feedback', [
            'feedback_content' => 'Test feedback',
            'page_slug' => 'test-page',
            'captcha_answer' => 3,
        ]);

        $response->assertSessionHasErrors(['captcha_answer']);
    }
}
