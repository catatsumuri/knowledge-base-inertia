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
        config(['app.public_views' => true]);

        $response = $this->actingAs($user)->get(route('app-settings'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('app-settings')
            ->where('publicViews', true)
        );
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

    public function test_authenticated_users_can_create_home_page_document(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('app-settings.home-page.store'), [
            'title' => 'New Home Page',
            'content' => '# Welcome',
        ]);

        $response->assertRedirect(route('app-settings'));
        $this->assertDatabaseHas('markdown_documents', [
            'title' => 'New Home Page',
            'is_home_page' => true,
        ]);
    }

    public function test_creating_new_home_page_unsets_existing_home_page(): void
    {
        $user = User::factory()->create();
        $oldHomeDocument = MarkdownDocument::factory()->create([
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $this->actingAs($user)->post(route('app-settings.home-page.store'), [
            'title' => 'New Home Page',
            'content' => '# New Welcome',
        ]);

        $oldHomeDocument->refresh();
        $this->assertFalse($oldHomeDocument->is_home_page);

        // 新しいホームページドキュメントが作成されたことを確認
        $newHomeDocument = MarkdownDocument::getHomePage();
        $this->assertNotNull($newHomeDocument);
        $this->assertEquals('New Home Page', $newHomeDocument->title);
    }

    public function test_authenticated_users_can_update_home_page_document(): void
    {
        $user = User::factory()->create();
        $homeDocument = MarkdownDocument::factory()->create([
            'title' => 'Original Title',
            'content' => '# Original Content',
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->patch(route('app-settings.home-page.update'), [
            'title' => 'Updated Title',
            'content' => '# Updated Content',
        ]);

        $response->assertRedirect(route('app-settings'));

        $homeDocument->refresh();
        $this->assertEquals('Updated Title', $homeDocument->title);
        $this->assertEquals('# Updated Content', $homeDocument->content);
    }

    public function test_authenticated_users_can_delete_home_page_document(): void
    {
        $user = User::factory()->create();
        $homeDocument = MarkdownDocument::factory()->create([
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->delete(route('app-settings.home-page.destroy'));

        $response->assertRedirect(route('app-settings'));
        $this->assertDatabaseMissing('markdown_documents', [
            'id' => $homeDocument->id,
        ]);
    }

    public function test_unauthenticated_users_cannot_create_home_page_document(): void
    {
        $response = $this->post(route('app-settings.home-page.store'), [
            'title' => 'New Home Page',
            'content' => '# Welcome',
        ]);

        $response->assertRedirect(route('login'));
    }
}
