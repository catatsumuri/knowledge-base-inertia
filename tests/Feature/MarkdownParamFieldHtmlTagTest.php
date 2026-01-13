<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * @group markdown
 */
class MarkdownParamFieldHtmlTagTest extends TestCase
{
    use RefreshDatabase;

    public function test_param_field_html_tag_is_passed_to_page(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
# Param Field HTML Tag

<paramfield header="Vary" type="string">
  HTMLとJSONレスポンスを正しく区別するために、`X-Inertia`に設定します。
</paramfield>
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
