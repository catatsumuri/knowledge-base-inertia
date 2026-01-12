<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get(route('app-settings'))->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_view_app_settings(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('app-settings'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('app-settings'));
    }

    public function test_authenticated_users_can_export_all_markdown_documents(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('app-settings.markdown-export'));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/zip');

        $content = $response->streamedContent();

        $this->assertStringStartsWith('PK', $content);
    }
}
