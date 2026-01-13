<?php

namespace Tests\Unit;

use App\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TopicTest extends TestCase
{
    use RefreshDatabase;

    public function test_find_or_create_by_name_creates_new_topic(): void
    {
        $topic = Topic::findOrCreateByName('Laravel');

        $this->assertDatabaseHas('topics', [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);

        $this->assertEquals('Laravel', $topic->name);
        $this->assertEquals('laravel', $topic->slug);
    }

    public function test_find_or_create_by_name_finds_existing_topic(): void
    {
        Topic::factory()->create([
            'name' => 'React',
            'slug' => 'react',
        ]);

        $topic = Topic::findOrCreateByName('react');

        $this->assertEquals('React', $topic->name);
        $this->assertEquals(1, Topic::count());
    }

    public function test_find_or_create_by_name_is_case_insensitive(): void
    {
        Topic::factory()->create([
            'name' => 'PHP',
            'slug' => 'php',
        ]);

        $topicLower = Topic::findOrCreateByName('php');
        $topicUpper = Topic::findOrCreateByName('PHP');

        $this->assertEquals($topicLower->id, $topicUpper->id);
        $this->assertEquals(1, Topic::count());
    }
}
