<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_when_public_views_are_disabled(): void
    {
        config(['app.public_views' => false]);

        $response = $this->get(route('home'));

        $response->assertRedirect(route('login'));
    }

    public function test_guest_can_view_home_when_public_views_are_enabled(): void
    {
        config(['app.public_views' => true]);

        $response = $this->get(route('home'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('welcome'));
    }

    public function test_authenticated_user_can_view_home_when_public_views_are_disabled(): void
    {
        config(['app.public_views' => false]);

        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('home'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('welcome'));
    }
}
