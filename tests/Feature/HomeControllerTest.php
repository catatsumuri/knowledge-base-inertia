<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_page_shows_custom_document_when_configured(): void
    {
        $user = User::factory()->create();
        $homeDocument = MarkdownDocument::factory()->create([
            'title' => 'Custom Home Page',
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->get(route('home'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('isHomePage', true)
            ->where('isPublic', true)
            ->where('document.id', $homeDocument->id)
        );
    }

    public function test_home_page_is_always_public_regardless_of_public_views_setting(): void
    {
        config(['app.public_views' => false]);

        $user = User::factory()->create();
        MarkdownDocument::factory()->create([
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        // 未認証ユーザーでもアクセス可能
        $response = $this->get(route('home'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('isHomePage', true)
        );
    }

    public function test_home_page_shows_welcome_when_not_configured(): void
    {
        config(['app.public_views' => true]);

        $response = $this->get(route('home'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('welcome')
        );
    }

    public function test_home_page_redirects_to_login_when_not_configured_and_public_views_disabled(): void
    {
        config(['app.public_views' => false]);

        // 未認証ユーザーの場合
        $response = $this->get(route('home'));

        $response->assertRedirect(route('login'));
    }
}
