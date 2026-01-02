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

    public function test_shoutbox_stores_metadata_for_jpeg_uploads(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $image = UploadedFile::fake()->image('photo.jpg');

        $response = $this->actingAs($user)->post(route('shoutbox.store'), [
            'content' => null,
            'images' => [$image],
        ]);

        $response->assertRedirect();

        $shout = Shout::query()->first();
        $this->assertNotNull($shout);
        $this->assertIsArray($shout->images);
        $this->assertIsArray($shout->image_metadata);
        $this->assertCount(1, $shout->images);

        $path = $shout->images[0];
        $this->assertArrayHasKey($path, $shout->image_metadata);
        Storage::disk('public')->assertExists($path);
    }

    public function test_markdown_upload_records_metadata_entry(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $image = UploadedFile::fake()->image('paste.jpg');

        $response = $this->actingAs($user)->post('/markdown/upload-image', [
            'image' => $image,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('imageUrl');

        $upload = MarkdownImageUpload::query()->first();
        $this->assertNotNull($upload);
        Storage::disk('public')->assertExists($upload->path);
    }
}
