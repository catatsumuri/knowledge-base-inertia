<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * @group markdown
 */
class MarkdownMermaidRenderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_mermaid_code_block_is_displayed(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
# Mermaid Demo

```mermaid
graph TD
  A[Start] --> B{Choice}
  B -->|Yes| C[Success]
  B -->|No| D[Failure]
```
MD,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->get(route('markdown.show', $document->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.content', $document->content)
        );
    }
}
