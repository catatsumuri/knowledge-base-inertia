<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

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
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $document = MarkdownDocument::factory()->create([
            'slug' => 'index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $topic = Topic::factory()->create([
            'name' => 'Guides',
            'slug' => 'guides',
        ]);
        $document->topics()->attach($topic->id);
        $document->addMedia(UploadedFile::fake()->image('hero.jpg'))
            ->toMediaCollection('eyecatch');
        $contentMedia = $document->addMedia(UploadedFile::fake()->image('content.jpg'))
            ->toMediaCollection('content-images');
        $document->update([
            'content' => '![Hero](/markdown/content-media/'.$contentMedia->uuid.')',
        ]);

        $response = $this->actingAs($user)->get(route('app-settings.markdown-export'));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/zip');

        $content = $response->streamedContent();

        $this->assertStringStartsWith('PK', $content);

        $tempPath = tempnam(sys_get_temp_dir(), 'markdown-export-');
        $this->assertIsString($tempPath);
        file_put_contents($tempPath, $content);

        $zip = new ZipArchive;
        $zip->open($tempPath);
        $exported = $zip->getFromName('index.md');
        $imageContent = $zip->getFromName('assets/index/eyecatch.jpg');
        $contentImagePath = 'assets/index/content/'.$contentMedia->uuid.'.jpg';
        $contentImageContent = $zip->getFromName($contentImagePath);
        $zip->close();
        @unlink($tempPath);

        $this->assertIsString($exported);
        $this->assertStringContainsString('topics: ["Guides"]', $exported);
        $this->assertStringContainsString($contentImagePath, $exported);
        $this->assertIsString($imageContent);
        $this->assertIsString($contentImageContent);
    }

    public function test_zip_import_supports_topics(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $contents = "---\n".
            "title: \"Imported\"\n".
            "slug: \"docs/intro\"\n".
            "status: \"published\"\n".
            "topics: [\"Guides\", \"Intro\"]\n".
            "eyecatch: \"assets/docs/intro/eyecatch.jpg\"\n".
            "---\n\n".
            "![Hero](assets/docs/intro/content/hero.jpg)\n\n".
            "# Hello\n";

        $zipPath = tempnam(sys_get_temp_dir(), 'markdown-import-');
        $this->assertIsString($zipPath);

        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('docs/intro.md', $contents);
        $image = UploadedFile::fake()->image('eyecatch.jpg');
        $zip->addFromString(
            'assets/docs/intro/eyecatch.jpg',
            (string) file_get_contents($image->getPathname())
        );
        $contentImage = UploadedFile::fake()->image('hero.jpg');
        $zip->addFromString(
            'assets/docs/intro/content/hero.jpg',
            (string) file_get_contents($contentImage->getPathname())
        );
        $zip->close();

        $file = new UploadedFile($zipPath, 'import.zip', 'application/zip', null, true);

        $response = $this->actingAs($user)->post(route('app-settings.markdown-import-preview'), [
            'zip_file' => $file,
        ]);

        $response->assertOk();

        $preview = session('markdown_zip_import_preview');
        $this->assertIsArray($preview);
        $this->assertArrayHasKey('session_key', $preview);

        $response = $this->actingAs($user)->post(route('app-settings.markdown-import-execute'), [
            'session_key' => $preview['session_key'],
            'conflict_resolutions' => [],
        ]);

        $response->assertRedirect(route('app-settings'));

        $document = MarkdownDocument::query()->where('slug', 'docs/intro')->first();
        $this->assertNotNull($document);
        $this->assertStringContainsString('/markdown/content-media/', (string) $document->content);
        $this->assertDatabaseHas('topics', [
            'name' => 'Guides',
        ]);
        $guidesTopic = Topic::query()->where('name', 'Guides')->first();
        $this->assertNotNull($guidesTopic);
        $this->assertDatabaseHas('markdown_document_topic', [
            'markdown_document_id' => $document->id,
            'topic_id' => $guidesTopic->id,
        ]);
        $this->assertDatabaseHas('media', [
            'model_type' => MarkdownDocument::class,
            'model_id' => $document->id,
            'collection_name' => 'eyecatch',
        ]);
        $this->assertDatabaseHas('media', [
            'model_type' => MarkdownDocument::class,
            'model_id' => $document->id,
            'collection_name' => 'content-images',
        ]);

        @unlink($zipPath);
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
