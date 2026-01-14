<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarkdownLinkPrefixTest extends TestCase
{
    use RefreshDatabase;

    public function test_markdown_route_passes_markdown_context(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => '[Link to protocol](core-concepts/the-protocol)',
            'status' => 'published',
        ]);

        $response = $this->actingAs($user)->get('/markdown/guides/getting-started');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', 'guides/getting-started')
            ->where('isPublic', false)
        );
    }

    public function test_public_pages_route_passes_public_context(): void
    {
        config(['app.public_views' => true]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => '[Link to protocol](core-concepts/the-protocol)',
            'status' => 'published',
        ]);

        $response = $this->get('/pages/guides/getting-started');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', 'guides/getting-started')
            ->where('isPublic', true)
        );
    }

    public function test_markdown_links_preserve_prefix_in_markdown_route(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => <<<'MARKDOWN'
# Test Links

- [Relative link](core-concepts/the-protocol)
- [Absolute link](/about)
- [External link](https://example.com)
- [Fragment link](#heading)
MARKDOWN,
            'status' => 'published',
        ]);

        $response = $this->actingAs($user)->get('/markdown/guides/getting-started');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('isPublic', false)
            ->has('document.content')
        );

        // コンテンツにはMarkdown形式のリンクが含まれていることを確認
        $content = $response->viewData('page')['props']['document']['content'];
        $this->assertStringContainsString('[Relative link](core-concepts/the-protocol)', $content);
    }

    public function test_markdown_links_preserve_prefix_in_public_pages_route(): void
    {
        config(['app.public_views' => true]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => <<<'MARKDOWN'
# Test Links

- [Relative link](core-concepts/the-protocol)
- [Absolute link](/about)
- [External link](https://example.com)
- [Fragment link](#heading)
MARKDOWN,
            'status' => 'published',
        ]);

        $response = $this->get('/pages/guides/getting-started');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('isPublic', true)
            ->has('document.content')
        );

        // コンテンツにはMarkdown形式のリンクが含まれていることを確認
        $content = $response->viewData('page')['props']['document']['content'];
        $this->assertStringContainsString('[Relative link](core-concepts/the-protocol)', $content);
    }
}
