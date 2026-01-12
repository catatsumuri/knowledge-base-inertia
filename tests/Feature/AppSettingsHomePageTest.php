<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppSettingsHomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_view_home_page_edit(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('app-settings.home-page.edit'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('app-settings/home-page-edit')
            ->has('templates')
        );
    }
}
