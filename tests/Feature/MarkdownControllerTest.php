<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\MarkdownDocumentRevision;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;
use ZipArchive;

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
            'status' => 'draft',
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
            'status' => 'draft',
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
            'content' => '<figure><img src="/images/sample.jpg" alt="Sample" /><figcaption>Sample caption</figcaption></figure>',
        ]);

        $response = $this->actingAs($user)->get(route('markdown.show', $document->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->has('document')
            ->where('document.content', $document->content)
            ->where('document.status', 'draft')
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

    public function test_nested_index_document_is_rendered_when_parent_slug_is_requested(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'getting-started/index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.show', 'getting-started'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', $document->slug)
        );
    }

    public function test_nested_index_document_is_rendered_when_trailing_slash_is_provided(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'core-concepts/index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/markdown/core-concepts/');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', $document->slug)
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
            'status' => 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.show', 'category/subcategory/page'));
    }

    public function test_document_cannot_be_created_when_child_pages_exist(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'getting-started/index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post('/markdown', [
            'slug' => 'getting-started',
            'title' => 'Getting Started',
            'content' => '# Intro',
        ]);

        $response->assertSessionHasErrors(['slug']);
    }

    public function test_nested_document_cannot_be_created_when_parent_page_exists(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create([
            'slug' => 'welcome',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post('/markdown', [
            'slug' => 'welcome/test',
            'title' => 'Welcome Child',
            'content' => '# Child',
        ]);

        $response->assertSessionHasErrors(['slug']);
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

    public function test_table_conversion_returns_markdown_table(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => [
                            'content' => "| 日付 | 項目 | 金額 |\n| --- | --- | --- |\n| 1/1 | コーヒー | 150円 |",
                        ],
                    ],
                ],
            ]),
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/api/markdown/convert-table', [
            'text' => "1/1 コーヒー 150円\n1/2 カップ麺 250円",
        ]);

        $response->assertOk();
        $response->assertJson([
            'markdown' => "| 日付 | 項目 | 金額 |\n| --- | --- | --- |\n| 1/1 | コーヒー | 150円 |",
        ]);
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
            ->where('lang.Translate selection with AI', '選択をAIで翻訳する')
            ->where('lang.Convert selection to Markdown', '選択をMarkdown構造にする')
            ->where('lang.Convert selection to AI table', '選択をAIでテーブル化する')
        );
    }

    public function test_slug_availability_returns_unavailable_for_existing_slug(): void
    {
        $user = User::factory()->create();
        MarkdownDocument::factory()->create([
            'slug' => 'existing-slug',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.slug-availability', [
            'slug' => 'existing-slug',
        ]));

        $response->assertOk();
        $response->assertJson([
            'available' => false,
        ]);
    }

    public function test_edit_page_can_be_rendered_with_jump_query(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'title' => 'Jumpable Title',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.edit', $document->slug).'?jump=42');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/edit')
            ->where('document.title', 'Jumpable Title')
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
            'status' => 'published',
        ];

        $response = $this->actingAs($user)->patch(route('markdown.update', $document->slug), $data);

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
            'title' => 'Updated Title',
            'content' => 'Updated content',
            'status' => 'published',
            'updated_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.show', $document->slug));
    }

    public function test_document_can_be_moved_to_new_slug(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'original-slug',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.move', $document->slug), [
            'slug' => 'new-slug',
        ]);

        $response->assertRedirect(route('markdown.edit', 'new-slug'));
        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
            'slug' => 'new-slug',
        ]);
    }

    public function test_document_move_fails_when_child_pages_exist(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'parent',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocument::factory()->create([
            'slug' => 'parent/child',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.move', $document->slug), [
            'slug' => 'parent-moved',
        ]);

        $response->assertSessionHasErrors('slug');
        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
            'slug' => 'parent',
        ]);
    }

    public function test_move_get_route_redirects_to_edit(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'move-target',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.move', $document->slug));

        $response->assertRedirect(route('markdown.edit', $document->slug));
    }

    public function test_markdown_image_upload_attaches_to_document(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'image' => UploadedFile::fake()->image('content.jpg'),
            'document_id' => $document->id,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('imageUrl');

        $this->assertDatabaseHas('media', [
            'model_type' => MarkdownDocument::class,
            'model_id' => $document->id,
            'collection_name' => 'content-images',
        ]);
    }

    public function test_markdown_image_upload_creates_document_when_slug_is_missing(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'image' => UploadedFile::fake()->image('content.jpg'),
            'slug' => 'drafts/image-first',
        ]);

        $document = MarkdownDocument::query()->where('slug', 'drafts/image-first')->first();
        $this->assertNotNull($document);

        $response->assertRedirect(route('markdown.edit', $document->slug));

        $this->assertDatabaseHas('media', [
            'model_type' => MarkdownDocument::class,
            'model_id' => $document->id,
            'collection_name' => 'content-images',
        ]);
    }

    public function test_document_update_creates_revision(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'title' => 'Original Title',
            'content' => 'Original content',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->patch(route('markdown.update', $document->slug), [
            'title' => 'Next Title',
            'content' => 'Next content',
        ]);

        $this->assertDatabaseHas('markdown_document_revisions', [
            'markdown_document_id' => $document->id,
            'title' => 'Original Title',
            'content' => 'Original content',
            'edited_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.show', $document->slug));
    }

    public function test_document_can_be_exported_with_metadata(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create([
            'name' => 'Exporter',
            'email' => 'exporter@example.com',
        ]);

        $document = MarkdownDocument::factory()->create([
            'slug' => 'welcome',
            'title' => 'Welcome',
            'content' => '# Hello',
            'status' => 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
        $topic = Topic::factory()->create([
            'name' => 'Guides',
            'slug' => 'guides',
        ]);
        $document->topics()->attach($topic->id);

        $response = $this->actingAs($user)->get(route('markdown.export', $document->slug));

        $response->assertOk();
        $response->assertHeader('content-type', 'text/markdown; charset=UTF-8');
        $response->assertHeader('content-disposition', 'attachment; filename=welcome.md');

        $content = $response->streamedContent();

        $this->assertStringContainsString("---\n", $content);
        $this->assertStringContainsString('title: "Welcome"', $content);
        $this->assertStringContainsString('slug: "welcome"', $content);
        $this->assertStringContainsString('status: "draft"', $content);
        $this->assertStringContainsString('created_by_id: '.$user->id, $content);
        $this->assertStringContainsString('updated_by_id: '.$user->id, $content);
        $this->assertStringContainsString('created_by:', $content);
        $this->assertStringContainsString('  name: "Exporter"', $content);
        $this->assertStringContainsString('  email: "exporter@example.com"', $content);
        $this->assertStringContainsString('topics: ["Guides"]', $content);
        $this->assertStringContainsString("# Hello\n", $content);
    }

    public function test_document_export_creates_zip_when_content_images_exist(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $document = MarkdownDocument::factory()->create([
            'slug' => 'image-doc',
            'title' => 'Image Doc',
            'content' => null,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $media = $document->addMedia(UploadedFile::fake()->image('content.png'))
            ->toMediaCollection('content-images');
        $imageUrl = route('markdown.content-media.show', $media);

        $document->update([
            'content' => "![Alt]({$imageUrl})",
        ]);

        $response = $this->actingAs($user)->get(route('markdown.export', $document->slug));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/zip');
        $response->assertDownload('image-doc.zip');

        $content = $response->streamedContent();

        $this->assertStringStartsWith('PK', $content);

        $tempPath = tempnam(sys_get_temp_dir(), 'markdown-export-');
        $this->assertIsString($tempPath);
        file_put_contents($tempPath, $content);

        $zip = new ZipArchive;
        $zip->open($tempPath);
        $markdownContent = $zip->getFromName('image-doc.md');
        $imagePath = 'assets/image-doc/content/'.$media->uuid.'.png';
        $imageContent = $zip->getFromName($imagePath);
        $zip->close();
        @unlink($tempPath);

        $this->assertIsString($markdownContent);
        $this->assertStringContainsString($imagePath, $markdownContent);
        $this->assertIsString($imageContent);
    }

    public function test_document_export_preserves_image_size_specification(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $document = MarkdownDocument::factory()->create([
            'slug' => 'sized-image-doc',
            'title' => 'Sized Image Doc',
            'content' => null,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $media = $document->addMedia(UploadedFile::fake()->image('content.png'))
            ->toMediaCollection('content-images');
        $imageUrl = route('markdown.content-media.show', $media);

        $document->update([
            'content' => "![画像]({$imageUrl} =500x)\n\n![画像2]({$imageUrl} =300x200)",
        ]);

        $response = $this->actingAs($user)->get(route('markdown.export', $document->slug));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/zip');

        $content = $response->streamedContent();
        $tempPath = tempnam(sys_get_temp_dir(), 'markdown-export-');
        $this->assertIsString($tempPath);
        file_put_contents($tempPath, $content);

        $zip = new ZipArchive;
        $zip->open($tempPath);
        $markdownContent = $zip->getFromName('sized-image-doc.md');
        $zip->close();
        @unlink($tempPath);

        $this->assertIsString($markdownContent);
        $imagePath = 'assets/sized-image-doc/content/'.$media->uuid.'.png';
        $this->assertStringContainsString("{$imagePath} =500x", $markdownContent);
        $this->assertStringContainsString("{$imagePath} =300x200", $markdownContent);
    }

    public function test_document_can_be_imported_from_zip(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $contents = "---\n".
            "title: \"Imported\"\n".
            "slug: \"imports/zip\"\n".
            "status: \"draft\"\n".
            "eyecatch: \"assets/imports/zip/eyecatch.jpg\"\n".
            "---\n\n".
            "![Hero](assets/imports/zip/content/hero.jpg)\n";

        $zipPath = tempnam(sys_get_temp_dir(), 'markdown-import-');
        $this->assertIsString($zipPath);

        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('imports/zip.md', $contents);
        $image = UploadedFile::fake()->image('eyecatch.jpg');
        $zip->addFromString(
            'assets/imports/zip/eyecatch.jpg',
            (string) file_get_contents($image->getPathname())
        );
        $contentImage = UploadedFile::fake()->image('hero.jpg');
        $zip->addFromString(
            'assets/imports/zip/content/hero.jpg',
            (string) file_get_contents($contentImage->getPathname())
        );
        $zip->close();

        $file = new UploadedFile($zipPath, 'import.zip', 'application/zip', null, true);

        $response = $this->actingAs($user)->post(route('markdown.import'), [
            'markdown' => $file,
        ]);

        $response->assertRedirect(route('markdown.show', 'imports/zip'));

        $document = MarkdownDocument::query()->where('slug', 'imports/zip')->first();
        $this->assertNotNull($document);
        $this->assertNotNull($document->getFirstMedia('eyecatch'));
        $this->assertNotEmpty($document->getMedia('content-images'));
        $this->assertStringContainsString('/markdown/content-media/', (string) $document->content);

        @unlink($zipPath);
    }

    public function test_markdown_document_can_be_imported(): void
    {
        $user = User::factory()->create();

        $contents = "---\n".
            "title: \"Imported\"\n".
            "slug: \"imports/welcome\"\n".
            "status: \"private\"\n".
            "topics: [\"Guides\", \"Onboarding\"]\n".
            "---\n\n".
            "# Hello\n";

        $file = UploadedFile::fake()->createWithContent('welcome.md', $contents);

        $response = $this->actingAs($user)->post(route('markdown.import'), [
            'markdown' => $file,
        ]);

        $response->assertRedirect(route('markdown.show', 'imports/welcome'));

        $this->assertDatabaseHas('markdown_documents', [
            'slug' => 'imports/welcome',
            'title' => 'Imported',
            'status' => 'private',
            'content' => "# Hello\n",
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $document = MarkdownDocument::query()->where('slug', 'imports/welcome')->first();
        $this->assertNotNull($document);
        $this->assertDatabaseHas('topics', [
            'name' => 'Guides',
        ]);
        $this->assertDatabaseHas('topics', [
            'name' => 'Onboarding',
        ]);
        $guidesTopic = Topic::query()->where('name', 'Guides')->first();
        $this->assertNotNull($guidesTopic);
        $this->assertDatabaseHas('markdown_document_topic', [
            'markdown_document_id' => $document->id,
            'topic_id' => $guidesTopic->id,
        ]);
    }

    public function test_multiple_documents_can_be_exported_as_zip(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();

        $first = MarkdownDocument::factory()->create([
            'slug' => 'welcome',
            'title' => 'Welcome',
            'content' => '# Welcome',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
        $first->addMedia(UploadedFile::fake()->image('eyecatch.png'))
            ->toMediaCollection('eyecatch');

        $second = MarkdownDocument::factory()->create([
            'slug' => 'guides/getting-started',
            'title' => 'Getting Started',
            'content' => '# Getting Started',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.export-bulk'), [
            'slugs' => [$first->slug, $second->slug],
        ]);

        $response->assertOk();
        $response->assertHeader('content-type', 'application/zip');

        $content = $response->streamedContent();

        $this->assertStringStartsWith('PK', $content);

        $tempPath = tempnam(sys_get_temp_dir(), 'markdown-export-');
        $this->assertIsString($tempPath);
        file_put_contents($tempPath, $content);

        $zip = new ZipArchive;
        $zip->open($tempPath);
        $imageContent = $zip->getFromName('assets/welcome/eyecatch.png');
        $zip->close();
        @unlink($tempPath);

        $this->assertIsString($imageContent);
    }

    public function test_export_uses_document_status(): void
    {
        $user = User::factory()->create();

        $document = MarkdownDocument::factory()->create([
            'slug' => 'public-doc',
            'title' => 'Public Doc',
            'content' => '# Public',
            'status' => 'published',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.export', $document->slug));

        $response->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('status: "published"', $content);
    }

    public function test_markdown_media_requires_access(): void
    {
        Storage::fake('markdown-media');
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'public-doc',
            'status' => 'published',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
        $media = $document->addMedia(UploadedFile::fake()->image('eyecatch.jpg'))
            ->toMediaCollection('eyecatch');

        config(['app.public_views' => false]);

        $this->get(route('markdown.media.show', $media))
            ->assertForbidden();

        config(['app.public_views' => true]);

        $this->get(route('markdown.media.show', $media))
            ->assertOk();
    }

    public function test_revision_list_page_can_be_rendered(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocumentRevision::factory()->create([
            'markdown_document_id' => $document->id,
            'edited_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('markdown.revisions', $document->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/revisions')
            ->has('document')
            ->has('revisions', 2)
            ->where('revisions.0.is_current', true)
            ->has('revisions.0.content')
        );
    }

    public function test_revision_list_supports_nested_slugs(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'laravel/auth-scaffolding-history/version7/revision',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        MarkdownDocumentRevision::factory()->create([
            'markdown_document_id' => $document->id,
            'edited_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(
            route('markdown.revisions', $document->slug)
        );

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/revisions')
            ->has('revisions', 2)
            ->where('revisions.0.is_current', true)
        );
    }

    public function test_revision_restore_supports_nested_slugs(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'slug' => 'laravel/auth-scaffolding-history/version7/revision',
            'title' => 'Original Title',
            'content' => 'Original content',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $revision = MarkdownDocumentRevision::factory()->create([
            'markdown_document_id' => $document->id,
            'title' => 'Restored Title',
            'content' => 'Restored content',
            'edited_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(
            route('markdown.restore', [$document->slug, $revision->id])
        );

        $response->assertRedirect(route('markdown.revisions', $document->slug));

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
            'title' => 'Restored Title',
            'content' => 'Restored content',
        ]);
    }

    public function test_revision_can_be_restored(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'title' => 'Current Title',
            'content' => 'Current content',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $revision = MarkdownDocumentRevision::factory()->create([
            'markdown_document_id' => $document->id,
            'title' => 'Previous Title',
            'content' => 'Previous content',
            'edited_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.restore', [
            'document' => $document->slug,
            'revision' => $revision->id,
        ]));

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
            'title' => 'Previous Title',
            'content' => 'Previous content',
            'updated_by' => $user->id,
        ]);

        $this->assertDatabaseHas('markdown_document_revisions', [
            'markdown_document_id' => $document->id,
            'title' => 'Current Title',
            'content' => 'Current content',
            'edited_by' => $user->id,
        ]);

        $response->assertRedirect(route('markdown.revisions', $document->slug));
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
        Storage::fake('markdown-media');

        $user = User::factory()->create();

        $file = UploadedFile::fake()->image('test.jpg', 100, 100);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'slug' => 'test-upload',
            'image' => $file,
        ]);

        $document = MarkdownDocument::query()->where('slug', 'test-upload')->first();
        $this->assertNotNull($document);

        $response->assertRedirect(route('markdown.edit', 'test-upload'));
        $response->assertSessionHas('imageUrl');

        $imageUrl = session('imageUrl');
        $this->assertStringContainsString('/markdown/content-media/', $imageUrl);

        $media = $document->getFirstMedia('content-images');
        $this->assertNotNull($media);
        Storage::disk('markdown-media')->assertExists($media->getPathRelativeToRoot());
    }

    public function test_non_image_uploads_are_rejected(): void
    {
        $user = User::factory()->create();

        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'slug' => 'test-pdf',
            'image' => $file,
        ]);

        $response->assertSessionHasErrors(['image']);
    }

    public function test_oversized_uploads_are_rejected(): void
    {
        $user = User::factory()->create();

        $file = UploadedFile::fake()->image('large.jpg')->size(6144);

        $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
            'slug' => 'test-large',
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

    public function test_documents_can_be_deleted_in_bulk(): void
    {
        $user = User::factory()->create();

        $first = MarkdownDocument::factory()->create([
            'slug' => 'bulk-one',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $second = MarkdownDocument::factory()->create([
            'slug' => 'bulk-two',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.destroy-bulk'), [
            'slugs' => [$first->slug, $second->slug],
        ]);

        $this->assertDatabaseMissing('markdown_documents', [
            'id' => $first->id,
        ]);

        $this->assertDatabaseMissing('markdown_documents', [
            'id' => $second->id,
        ]);

        $response->assertRedirect(route('sitemap'));
    }

    public function test_documents_can_be_updated_in_bulk_status(): void
    {
        $user = User::factory()->create();

        $first = MarkdownDocument::factory()->create([
            'slug' => 'bulk-status-one',
            'status' => 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $second = MarkdownDocument::factory()->create([
            'slug' => 'bulk-status-two',
            'status' => 'draft',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('markdown.status-bulk'), [
            'slugs' => [$first->slug, $second->slug],
            'status' => 'published',
        ]);

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $first->id,
            'status' => 'published',
            'updated_by' => $user->id,
        ]);

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $second->id,
            'status' => 'published',
            'updated_by' => $user->id,
        ]);

        $response->assertRedirect(route('sitemap'));
    }

    public function test_guests_cannot_bulk_delete_documents(): void
    {
        $document = MarkdownDocument::factory()->create();

        $response = $this->post(route('markdown.destroy-bulk'), [
            'slugs' => [$document->slug],
        ]);

        $this->assertDatabaseHas('markdown_documents', [
            'id' => $document->id,
        ]);

        $response->assertRedirect(route('login'));
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

    public function test_document_can_be_created_with_topics(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create(['slug' => 'index']);

        $response = $this->actingAs($user)->post(route('markdown.store'), [
            'slug' => 'test-with-topics',
            'title' => 'Test Document',
            'content' => '# Content',
            'topics' => ['Laravel', 'PHP', 'Testing'],
        ]);

        $document = MarkdownDocument::where('slug', 'test-with-topics')->first();

        $this->assertCount(3, $document->topics);
        $this->assertTrue($document->topics->contains('name', 'Laravel'));
        $this->assertTrue($document->topics->contains('name', 'PHP'));
        $this->assertTrue($document->topics->contains('name', 'Testing'));

        $response->assertRedirect(route('markdown.show', 'test-with-topics'));
    }

    public function test_document_topics_can_be_updated(): void
    {
        $user = User::factory()->create();

        $document = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $topic1 = \App\Models\Topic::factory()->create(['name' => 'OldTopic']);
        $document->topics()->attach($topic1);

        $response = $this->actingAs($user)->patch(
            route('markdown.update', $document->slug),
            [
                'title' => $document->title,
                'content' => $document->content,
                'topics' => ['NewTopic', 'AnotherTopic'],
            ],
        );

        $document->refresh();

        $this->assertCount(2, $document->topics);
        $this->assertFalse($document->topics->contains('name', 'OldTopic'));
        $this->assertTrue($document->topics->contains('name', 'NewTopic'));
        $this->assertTrue($document->topics->contains('name', 'AnotherTopic'));
    }

    public function test_duplicate_topics_are_prevented(): void
    {
        $user = User::factory()->create();

        MarkdownDocument::factory()->create(['slug' => 'index']);

        $response = $this->actingAs($user)->post(route('markdown.store'), [
            'slug' => 'test-duplicates',
            'title' => 'Test',
            'content' => '# Test',
            'topics' => ['Laravel', 'laravel', 'LARAVEL'],
        ]);

        $document = MarkdownDocument::where('slug', 'test-duplicates')->first();

        // 大文字小文字関係なく1つのtopicだけ作成される
        $this->assertCount(1, $document->topics);
        $this->assertDatabaseCount('topics', 1);
    }

    public function test_topics_search_api_returns_filtered_results(): void
    {
        $user = User::factory()->create();

        \App\Models\Topic::factory()->create(['name' => 'Laravel']);
        \App\Models\Topic::factory()->create(['name' => 'React']);
        \App\Models\Topic::factory()->create(['name' => 'PHP']);

        $response = $this->actingAs($user)->get('/api/topics/search?q=La');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['name' => 'Laravel']);
    }

    public function test_shows_folder_view_when_direct_children_exist_but_no_document(): void
    {
        $user = User::factory()->create();

        // Create direct children documents
        MarkdownDocument::factory()->create([
            'slug' => 'parent/child1',
            'title' => 'Child 1',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
        MarkdownDocument::factory()->create([
            'slug' => 'parent/child2',
            'title' => 'Child 2',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/markdown/parent');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/folder')
            ->where('slug', 'parent')
            ->has('children', 2)
            ->where('hasIndex', false)
        );
    }

    public function test_does_not_show_folder_view_for_grandchildren(): void
    {
        $user = User::factory()->create();

        // Create direct child
        MarkdownDocument::factory()->create([
            'slug' => 'parent/child',
            'title' => 'Child',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
        // Create grandchild (should not be included in folder view)
        MarkdownDocument::factory()->create([
            'slug' => 'parent/child/grandchild',
            'title' => 'Grandchild',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->get('/markdown/parent');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/folder')
            ->has('children', 1)
            ->where('children.0.slug', 'parent/child')
        );
    }

    public function test_updates_folder_label(): void
    {
        $user = User::factory()->create();

        // Create a child document to make it a folder
        MarkdownDocument::factory()->create([
            'slug' => 'parent/child',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->patchJson('/markdown/folder/parent/label', [
                'label' => 'My Custom Label',
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('markdown_navigation_items', [
            'node_type' => 'folder',
            'node_path' => 'parent',
            'label' => 'My Custom Label',
            'parent_path' => null,
        ]);
    }

    public function test_shows_edit_form_when_no_children_exist(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/markdown/nonexistent');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/edit')
            ->where('document', null)
        );
    }

    public function test_folder_page_shows_index_status(): void
    {
        $user = User::factory()->create();

        // Create a child document to make it a folder
        MarkdownDocument::factory()->create([
            'slug' => 'parent/child',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        // First test: no index document - shows folder view
        $response = $this->actingAs($user)->get('/markdown/parent');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/folder')
            ->where('hasIndex', false)
        );

        // Create index document
        MarkdownDocument::factory()->create([
            'slug' => 'parent/index',
            'title' => 'Parent Index',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        // Second test: with index document - shows the index document (not folder view)
        $response = $this->actingAs($user)->get('/markdown/parent');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('markdown/show')
            ->where('document.slug', 'parent/index')
        );
    }
}
