<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pages_are_not_available_when_disabled(): void
    {
        config(['app.public_views' => false]);

        MarkdownDocument::factory()->create([
            'slug' => 'index',
        ]);

        $this->get('/pages')->assertNotFound();
        $this->get('/pages/index')->assertNotFound();
    }

    public function test_public_pages_index_renders_when_enabled(): void
    {
        config(['app.public_views' => true]);

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'title' => 'Public Index',
            'status' => 'published',
        ]);

        $response = $this->get('/pages');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', 'index')
            ->where('canCreate', false)
            ->where('isPublic', true)
        );
    }

    public function test_public_pages_show_renders_when_enabled(): void
    {
        config(['app.public_views' => true]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'status' => 'published',
        ]);

        $response = $this->get('/pages/guides/getting-started');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', 'guides/getting-started')
            ->where('canCreate', false)
            ->where('isPublic', true)
        );
    }

    public function test_draft_pages_are_not_visible_on_public_routes(): void
    {
        config(['app.public_views' => true]);

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'title' => 'Draft Index',
            'status' => 'draft',
        ]);

        $this->get('/pages')->assertNotFound();
    }
}
