<?php

namespace Tests\Feature;

use App\Models\Shout;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ShoutboxMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_shout_images_are_stored_in_media_library(): void
    {
        Storage::fake('shoutbox-media');

        $user = User::factory()->create();
        $image = UploadedFile::fake()->image('photo.jpg');

        $response = $this->actingAs($user)->post(route('shoutbox.store'), [
            'content' => 'Hello',
            'images' => [$image],
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('shouts', [
            'content' => 'Hello',
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('media', [
            'model_type' => Shout::class,
            'collection_name' => 'images',
        ]);
    }

    public function test_shout_media_requires_authentication(): void
    {
        Storage::fake('shoutbox-media');

        $user = User::factory()->create();
        $shout = Shout::factory()->create([
            'user_id' => $user->id,
        ]);

        $media = $shout->addMedia(UploadedFile::fake()->image('photo.jpg'))
            ->toMediaCollection('images');

        $this->get(route('shoutbox.media.show', $media))
            ->assertRedirect(route('login'));
    }
}
