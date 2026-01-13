<?php

namespace Tests\Feature;

use App\Models\MarkdownImageUpload;
use App\Models\Shout;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageMetadataUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_shoutbox_stores_images_in_media_library(): void
    {
        Storage::fake('shoutbox-media');

        $user = User::factory()->create();
        $image = UploadedFile::fake()->image('photo.jpg');

        $response = $this->actingAs($user)->post(route('shoutbox.store'), [
            'content' => null,
            'images' => [$image],
        ]);

        $response->assertRedirect();

        $shout = Shout::query()->first();
        $this->assertNotNull($shout);
        $this->assertNull($shout->images);
        $this->assertNull($shout->image_metadata);

        $media = $shout->getFirstMedia('images');
        $this->assertNotNull($media);
        $this->assertDatabaseHas('media', [
            'model_type' => Shout::class,
            'model_id' => $shout->id,
            'collection_name' => 'images',
        ]);
        Storage::disk('shoutbox-media')->assertExists(
            $media->getPathRelativeToRoot()
        );
    }

    public function test_markdown_upload_records_metadata_entry(): void
    {
        Storage::fake('markdown-media');

        $user = User::factory()->create();
        $image = UploadedFile::fake()->image('paste.jpg');

        $response = $this->actingAs($user)->post('/markdown/upload-image', [
            'slug' => 'test-page',
            'image' => $image,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('imageUrl');

        // MediaLibraryを使用しているため、media テーブルを確認
        $this->assertDatabaseHas('media', [
            'collection_name' => 'content-images',
        ]);

        // ドキュメントが作成されたことを確認
        $document = \App\Models\MarkdownDocument::query()->where('slug', 'test-page')->first();
        $this->assertNotNull($document);

        $media = $document->getFirstMedia('content-images');
        $this->assertNotNull($media);
        Storage::disk('markdown-media')->assertExists($media->getPathRelativeToRoot());
    }
}
