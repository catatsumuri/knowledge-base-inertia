<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * @group markdown
 */
class MarkdownParamFieldRenderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_param_field_directive_is_passed_to_page(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
# Param Field Demo

:::param-field{header="X-Inertia" type="boolean"}
Set to `true` to indicate this is an Inertia request.
:::

:::param-field{body="component" type="string"}
The name of the JavaScript page component.
:::
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
