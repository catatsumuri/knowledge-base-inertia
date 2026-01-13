<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

/**
 * @group markdown
 */
class MarkdownTranslationTest extends TestCase
{
    use RefreshDatabase;

    public function test_translation_api_requires_authentication(): void
    {
        $response = $this->postJson('/api/markdown/translate', [
            'text' => 'Hello World',
        ]);

        $response->assertUnauthorized();
    }

    public function test_japanese_text_can_be_translated_to_english(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => [
                            'content' => '[EN] Hello World',
                        ],
                    ],
                ],
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
            'text' => 'こんにちは世界',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'original',
            'translated',
            'source_lang',
            'target_lang',
        ]);
        $response->assertJson([
            'original' => 'こんにちは世界',
            'source_lang' => 'ja',
            'target_lang' => 'en',
        ]);
        $this->assertIsString($response->json('translated'));
        $this->assertStringContainsString('[EN]', $response->json('translated'));
    }

    public function test_english_text_can_be_translated_to_japanese(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => [
                            'content' => '[日本語] こんにちは世界',
                        ],
                    ],
                ],
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
            'text' => 'Hello World',
        ]);

        $response->assertOk();
        $response->assertJson([
            'original' => 'Hello World',
            'source_lang' => 'en',
            'target_lang' => 'ja',
        ]);
        $this->assertStringContainsString('[日本語]', $response->json('translated'));
    }

    public function test_text_field_is_required(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/markdown/translate', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('text');
    }

    public function test_text_field_must_be_a_string(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
            'text' => 12345,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('text');
    }

    public function test_text_field_must_be_within_10000_characters(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
            'text' => str_repeat('a', 10001),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('text');
    }

    public function test_empty_text_cannot_be_translated(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
            'text' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('text');
    }

    public function test_translation_api_accepts_xsrf_token_header_from_cookie(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => [
                            'content' => '[日本語] こんにちは世界',
                        ],
                    ],
                ],
            ]),
        ]);

        $user = User::factory()->create();

        $this->withMiddleware();

        $pageResponse = $this->actingAs($user)->get('/markdown/create');
        $cookieJar = [];
        foreach ($pageResponse->headers->getCookies() as $cookie) {
            $cookieJar[$cookie->getName()] = $cookie->getValue();
        }

        $this->assertArrayHasKey('XSRF-TOKEN', $cookieJar);

        $response = $this->actingAs($user)
            ->withCookies($cookieJar)
            ->withHeader('X-XSRF-TOKEN', $cookieJar['XSRF-TOKEN'])
            ->postJson('/api/markdown/translate', [
                'text' => 'Hello World',
            ]);

        $response->assertOk();
    }
}
