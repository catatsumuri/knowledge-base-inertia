<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarkdownLinkPrefixBrowserTest extends TestCase
{
    use RefreshDatabase;

    public function test_relative_links_use_markdown_prefix_in_markdown_route(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => <<<'MARKDOWN'
# Test Document

[Relative link](core-concepts/the-protocol)
[Absolute link](/about)
[External link](https://example.com)
[Fragment link](#heading)
MARKDOWN,
            'status' => 'published',
        ]);

        // このテストは手動でブラウザを使って確認する必要があります
        // または、Playwright MCPツールを使用してE2Eテストとして実行できます
        $this->markTestSkipped('This test requires browser automation with Playwright MCP');
    }

    public function test_relative_links_use_pages_prefix_in_public_pages_route(): void
    {
        config(['app.public_views' => true]);

        MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => <<<'MARKDOWN'
# Test Document

[Relative link](core-concepts/the-protocol)
[Absolute link](/about)
[External link](https://example.com)
[Fragment link](#heading)
MARKDOWN,
            'status' => 'published',
        ]);

        // このテストは手動でブラウザを使って確認する必要があります
        // または、Playwright MCPツールを使用してE2Eテストとして実行できます
        $this->markTestSkipped('This test requires browser automation with Playwright MCP');
    }
}
