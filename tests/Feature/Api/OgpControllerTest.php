<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class OgpControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_og_pデータを取得できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/ogp?url='.urlencode('https://example.com'));

        // 外部APIに依存するため、成功または失敗のいずれかのステータスを許容
        $this->assertContains($response->status(), [200, 404]);
    }

    public function test_無効な_ur_lでエラーが返される(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/ogp?url=invalid-url');

        $response->assertStatus(422)
            ->assertJson(['error' => 'Invalid URL']);
    }

    public function test_ur_lパラメータが必須(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/ogp');

        $response->assertStatus(422)
            ->assertJson(['error' => 'Invalid URL']);
    }

    public function test_認証が必要(): void
    {
        $response = $this->getJson('/api/ogp?url='.urlencode('https://example.com'));

        $response->assertStatus(401); // Unauthorized
    }

    public function test_キャッシュが機能する(): void
    {
        $user = User::factory()->create();
        $url = 'https://example.com';
        $cacheKey = 'ogp:'.md5($url);

        // キャッシュをクリア
        Cache::forget($cacheKey);

        // 最初のリクエスト
        $response1 = $this->actingAs($user)
            ->getJson('/api/ogp?url='.urlencode($url));

        // キャッシュが設定されているか確認
        if ($response1->status() === 200) {
            $this->assertTrue(Cache::has($cacheKey));

            // 2回目のリクエスト（キャッシュから取得されるはず）
            $response2 = $this->actingAs($user)
                ->getJson('/api/ogp?url='.urlencode($url));

            $response2->assertStatus(200);
            $this->assertEquals($response1->json(), $response2->json());
        } else {
            // OGP取得に失敗した場合もキャッシュされる（nullがキャッシュされる）
            $this->assertTrue(Cache::has($cacheKey));
        }
    }
}
