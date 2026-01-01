<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * @group markdown
 */
class MarkdownControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_document_redirects_when_it_exists(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/markdown');

        $response->assertRedirect(route('markdown.show', $document->slug));
    }

    public function test_edit_page_is_rendered_when_index_document_is_missing(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/markdown');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/edit')
            ->where('document', null)
            ->where('isIndexDocument', true)
        );
    }

    public function test_create_page_can_be_rendered(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/markdown/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('markdown/edit'));
    }

    public function test_first_document_is_created_as_index_with_top_page_title(): void
    {
        $user = User::factory()->create();

        $data = [
            'content' => '# Hello World',
        ];

        $response = $this->actingAs($user)->post('/markdown', $data);

        $this->assertDatabaseHas('markdown_documents', [
            'slug' => 'index',
            'title' => 'Top page',
            'content' => '# Hello World',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $document = MarkdownDocument::where('slug', 'index')->first();
        $response->assertRedirect(route('markdown.show', $document->slug));
    }

    public function test_subsequent_documents_are_created_with_given_slug_and_title(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $data = [
            'slug' => 'test-document',
            'title' => 'Test Document',
            'content' => '# Hello World',
        ];

        $response = $this->actingAs($user)->post('/markdown', $data);

        $this->assertDatabaseHas('markdown_documents', [
            'slug' => 'test-document',
            'title' => 'Test Document',
            'content' => '# Hello World',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $document = MarkdownDocument::where('slug', 'test-document')->first();
        $response->assertRedirect(route('markdown.show', $document->slug));
    }

    public function test_document_show_page_is_rendered(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.show', $document->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->has('document')
            ->where('canCreate', true)
        );
    }

    public function test_edit_page_is_rendered_when_document_is_missing(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('markdown.show', 'non-existent-page'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/edit')
            ->where('document', null)
            ->where('isIndexDocument', false)
            ->where('slug', 'non-existent-page')
        );
    }

    public function test_nested_slug_document_can_be_created(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $data = [
            'slug' => 'category/subcategory/page',
            'title' => 'Nested Page',
            'content' => '# Nested content',
        ];

        $response = $this->actingAs($user)->post('/markdown', $data);

        $this->assertDatabaseHas('markdown_documents', [
            'slug' => 'category/subcategory/page',
            'title' => 'Nested Page',
            'content' => '# Nested content',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.show', 'category/subcategory/page'));
    }

    public function test_nested_slug_document_can_be_rendered(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'parent/child',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.show', 'parent/child'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->has('document')
            ->where('document.slug', 'parent/child')
        );
    }

    public function test_edit_page_is_rendered_when_nested_document_is_missing(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('markdown.show', 'link2/child'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/edit')
            ->where('document', null)
            ->where('isIndexDocument', false)
            ->where('slug', 'link2/child')
        );
    }

    public function test_nested_document_can_be_updated(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'section/article',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $data = [
            'title' => 'Updated Nested Title',
            'content' => 'Updated nested content',
        ];

        $response = $this->actingAs($user)->patch(route('markdown.update', 'section/article'), $data);

        $this->assertDatabaseHas('markdown_documents', [
            'slug' => 'section/article',
            'title' => 'Updated Nested Title',
            'content' => 'Updated nested content',
            'updated_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.show', 'section/article'));
    }

    public function test_edit_page_can_be_rendered(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'title' => 'Editable Title',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.edit', $document->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/edit')
            ->where('document.title', 'Editable Title')
        );
    }

    public function test_document_can_be_updated(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $data = [
            'title' => 'Updated Title',
            'content' => 'Updated content',
        ];

        $response = $this->actingAs($user)->patch(route('markdown.update', $document->slug), $data);

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
            'title' => 'Updated Title',
            'content' => 'Updated content',
            'updated_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.show', $document->slug));
    }

    public function test_guests_cannot_access_markdown_routes(): void
    {
        $document = MarkdownDocument::factory()->create();

        $this->get('/markdown')->assertRedirect(route('login'));
        $this->get('/markdown/create')->assertRedirect(route('login'));
        $this->post('/markdown', [])->assertRedirect(route('login'));
        $this->get(route('markdown.show', $document->slug))->assertRedirect(route('login'));
        $this->get(route('markdown.edit', $document->slug))->assertRedirect(route('login'));
        $this->patch(route('markdown.update', $document->slug), [])->assertRedirect(route('login'));
    }

    public function test_image_upload_returns_a_url(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();

        $file = UploadedFile::fake()->image('test.jpg', 100, 100);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'image' => $file,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('imageUrl');

        $imageUrl = session('imageUrl');
        $this->assertStringStartsWith('/storage/markdown-images/', $imageUrl);

        $filename = basename($imageUrl);
        Storage::disk('public')->assertExists('markdown-images/'.$filename);
    }

    public function test_non_image_uploads_are_rejected(): void
    {
        $user = User::factory()->create();

        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'image' => $file,
        ]);

        $response->assertSessionHasErrors(['image']);
    }

    public function test_oversized_uploads_are_rejected(): void
    {
        $user = User::factory()->create();

        $file = UploadedFile::fake()->image('large.jpg')->size(6144);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'image' => $file,
        ]);

        $response->assertSessionHasErrors(['image']);
    }

    public function test_image_upload_requires_authentication(): void
    {
        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->post(route('markdown.upload-image'), [
            'image' => $file,
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_document_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->delete(route('markdown.destroy', $document->slug));

        $this->assertDatabaseMissing('markdown_documents', [
            'id' => $document->id,
        ]);

        $response->assertRedirect(route('markdown.index'));
    }

    public function test_nested_document_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'parent/child',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->delete(route('markdown.destroy', 'parent/child'));

        $this->assertDatabaseMissing('markdown_documents', [
            'id' => $document->id,
        ]);

        $response->assertRedirect(route('markdown.index'));
    }

    public function test_guests_cannot_delete_documents(): void
    {
        $document = MarkdownDocument::factory()->create();

        $response = $this->delete(route('markdown.destroy', $document->slug));

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
        ]);

        $response->assertRedirect(route('login'));
    }
}
