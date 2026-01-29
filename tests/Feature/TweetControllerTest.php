<?php

namespace Tests\Feature;

use App\Models\Tweet;
use App\Models\User;
use App\Services\XApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class TweetControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_requires_authentication(): void
    {
        $response = $this->get(route('tweets.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_index_displays_tweets_with_pagination(): void
    {
        $user = User::factory()->create();
        Tweet::factory()->count(15)->create();

        $response = $this->actingAs($user)->get(route('tweets.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('tweets/index')
            ->has('tweets.data', 12) // 12件/ページ
            ->has('archivedCount')
        );
    }

    public function test_store_requires_authentication(): void
    {
        $response = $this->post(route('tweets.store'), [
            'tweet_input' => '1234567890123456789',
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_store_validates_required_input(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('tweets.store'), [
            'tweet_input' => '',
        ]);

        $response->assertSessionHasErrors('tweet_input');
    }

    public function test_store_saves_tweet_successfully(): void
    {
        $user = User::factory()->create();

        $mockService = Mockery::mock(XApiService::class);
        $mockService->shouldReceive('extractTweetId')
            ->twice() // バリデーションとコントローラーで2回
            ->with('1234567890123456789')
            ->andReturn('1234567890123456789');

        $mockService->shouldReceive('fetchTweetRaw')
            ->once()
            ->with('1234567890123456789')
            ->andReturn([
                'data' => [
                    'id' => '1234567890123456789',
                    'text' => 'Test tweet',
                ],
                'includes' => [],
            ]);

        $mockService->shouldReceive('getLastRateLimitReset')
            ->once()
            ->andReturn(null);

        $this->app->instance(XApiService::class, $mockService);

        $response = $this->actingAs($user)->post(route('tweets.store'), [
            'tweet_input' => '1234567890123456789',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('tweets', [
            'tweet_id' => '1234567890123456789',
        ]);
    }

    public function test_store_prevents_duplicate_tweets(): void
    {
        $user = User::factory()->create();
        Tweet::factory()->create(['tweet_id' => '1234567890123456789']);

        $response = $this->actingAs($user)->post(route('tweets.store'), [
            'tweet_input' => '1234567890123456789',
        ]);

        $response->assertSessionHas('message');
        $response->assertRedirect();
    }

    public function test_store_handles_rate_limit_error(): void
    {
        $this->markTestSkipped('レート制限処理のテストはジョブ実行が複雑なため一旦スキップ');
    }

    public function test_store_handles_tweet_not_found_error(): void
    {
        $this->markTestSkipped('ジョブ失敗処理のテストはジョブ実行が複雑なため一旦スキップ');
    }

    public function test_destroy_requires_authentication(): void
    {
        $tweet = Tweet::factory()->create();

        $response = $this->delete(route('tweets.destroy', $tweet));

        $response->assertRedirect(route('login'));
    }

    public function test_destroy_deletes_tweet_successfully(): void
    {
        $user = User::factory()->create();
        $tweet = Tweet::factory()->create();

        $response = $this->actingAs($user)->delete(route('tweets.destroy', $tweet));

        $response->assertRedirect();
        $this->assertSoftDeleted('tweets', [
            'id' => $tweet->id,
        ]);
    }

    public function test_destroy_returns_404_for_nonexistent_tweet(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->delete(route('tweets.destroy', 99999));

        $response->assertNotFound();
    }

    public function test_restore_restores_archived_tweet(): void
    {
        $user = User::factory()->create();
        $tweet = Tweet::factory()->create();
        $tweet->delete();

        $response = $this->actingAs($user)->post(route('tweets.restore', $tweet));

        $response->assertRedirect();
        $this->assertDatabaseHas('tweets', [
            'id' => $tweet->id,
            'deleted_at' => null,
        ]);
    }

    public function test_force_destroy_removes_archived_tweet(): void
    {
        $user = User::factory()->create();
        $tweet = Tweet::factory()->create();
        $tweet->delete();

        $response = $this->actingAs($user)->delete(route('tweets.force-destroy', $tweet));

        $response->assertRedirect();
        $this->assertDatabaseMissing('tweets', [
            'id' => $tweet->id,
        ]);
    }
}
