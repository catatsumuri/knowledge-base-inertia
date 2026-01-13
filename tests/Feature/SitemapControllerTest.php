<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * @group sitemap
 */
class SitemapControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitemap_page_can_be_rendered(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/sitemap');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->has('tree')
            ->where('canCreate', true)
        );
    }

    public function test_empty_tree_is_returned_when_no_documents_exist(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/sitemap');

        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->where('tree', [])
        );
    }

    public function test_flat_document_tree_is_built(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'title' => 'Home',
            'status' => 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'about',
            'title' => 'About',
            'status' => 'published',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/sitemap');

        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->has('tree', 2)
            ->where('tree.0.type', 'document')
            ->where('tree.0.slug', 'about')
            ->where('tree.0.title', 'About')
            ->where('tree.0.status', 'published')
            ->where('tree.1.type', 'document')
            ->where('tree.1.slug', 'index')
            ->where('tree.1.title', 'Home')
            ->where('tree.1.status', 'draft')
        );
    }

    public function test_nested_document_tree_is_built(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/advanced/optimization',
            'title' => 'Optimization',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/sitemap');

        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->has('tree', 1)
            ->where('tree.0.type', 'folder')
            ->where('tree.0.slug', 'guides')
            ->where('tree.0.title', 'Guides')
            ->has('tree.0.children', 2)
            ->where('tree.0.children.0.type', 'folder')
            ->where('tree.0.children.0.slug', 'advanced')
            ->has('tree.0.children.0.children', 1)
            ->where('tree.0.children.0.children.0.type', 'document')
            ->where('tree.0.children.0.children.0.slug', 'guides/advanced/optimization')
            ->where('tree.0.children.1.type', 'document')
            ->where('tree.0.children.1.slug', 'guides/getting-started')
        );
    }

    public function test_updated_by_information_is_included_in_tree(): void
    {
        $creator = User::factory()->create(['name' => 'Creator']);
        $updater = User::factory()->create(['name' => 'Updater']);

        MarkdownDocument::factory()->create([
            'slug' => 'test',
            'title' => 'Test',
            'created_by' => $creator->id,
            'updated_by' => $updater->id,
        ]);

        $response = $this->actingAs($creator)->get('/sitemap');

        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->has('tree.0.updated_by')
            ->where('tree.0.updated_by.name', 'Updater')
            ->has('tree.0.updated_at')
        );
    }

    public function test_eyecatch_thumbnail_is_included_in_tree(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $document = MarkdownDocument::factory()->create([
            'slug' => 'index',
            'title' => 'Home',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $document->addMedia(UploadedFile::fake()->image('eyecatch.jpg'))
            ->toMediaCollection('eyecatch');

        $response = $this->actingAs($user)->get('/sitemap');

        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->has('tree.0.eyecatch_thumb_url')
            ->where('tree.0.eyecatch_thumb_url', fn ($url) => is_string($url) && str_contains($url, '/markdown/media/'))
        );
    }

    public function test_mixed_flat_and_nested_tree_is_built_correctly(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'title' => 'Home',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'api/users',
            'title' => 'Users API',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'about',
            'title' => 'About',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/sitemap');

        $response->assertInertia(fn ($page) => $page
            ->component('sitemap')
            ->has('tree', 3)
            ->where('tree.0.type', 'folder')
            ->where('tree.0.slug', 'api')
            ->has('tree.0.children', 1)
            ->where('tree.0.children.0.slug', 'api/users')
            ->where('tree.1.type', 'document')
            ->where('tree.1.slug', 'about')
            ->where('tree.2.type', 'document')
            ->where('tree.2.slug', 'index')
        );
    }

    public function test_guests_cannot_access_sitemap(): void
    {
        $response = $this->get('/sitemap');

        $response->assertRedirect(route('login'));
    }
}
