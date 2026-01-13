<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * @group markdown
 */
class MarkdownReturnHeadingTest extends TestCase
{
    use RefreshDatabase;

    public function test_update_redirects_to_heading_when_return_heading_is_provided(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'title' => 'Original',
            'content' => '# Original',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->patch(
            route('markdown.update', $document->slug),
            [
                'title' => 'Updated',
                'content' => '# Updated',
                'return_heading' => 'x-inertia',
            ],
        );

        $response->assertRedirect(
            route('markdown.show', $document->slug).'#x-inertia',
        );
    }
}
