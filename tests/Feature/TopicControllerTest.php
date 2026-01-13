<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TopicControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_requires_authentication(): void
    {
        $response = $this->get(route('topics.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_index_displays_all_topics_with_document_counts(): void
    {
        $user = User::factory()->create();

        $topic1 = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);
        $topic2 = Topic::create(['name' => 'PHP', 'slug' => 'php']);
        $topic3 = Topic::create(['name' => 'React', 'slug' => 'react']);

        // Create documents for topics
        $doc1 = MarkdownDocument::factory()->create(['created_by' => $user->id, 'status' => 'published']);
        $doc2 = MarkdownDocument::factory()->create(['created_by' => $user->id, 'status' => 'published']);
        $doc3 = MarkdownDocument::factory()->create(['created_by' => $user->id, 'status' => 'published']);

        $doc1->topics()->attach([$topic1->id, $topic2->id]);
        $doc2->topics()->attach([$topic1->id]);
        $doc3->topics()->attach([$topic2->id]);

        $response = $this->actingAs($user)->get(route('topics.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/index')
            ->has('topics', 3)
            ->where('topics.0.slug', 'laravel') // 2 documents, alphabetically first
            ->where('topics.0.documents_count', 2)
            ->where('topics.1.slug', 'php') // 2 documents, alphabetically second
            ->where('topics.1.documents_count', 2)
            ->where('topics.2.slug', 'react') // 0 documents
            ->where('topics.2.documents_count', 0)
        );
    }

    public function test_show_requires_authentication(): void
    {
        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $response = $this->get(route('topics.show', $topic->slug));

        $response->assertRedirect(route('login'));
    }

    public function test_show_returns_404_for_nonexistent_topic(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('topics.show', 'nonexistent'));

        $response->assertNotFound();
    }

    public function test_show_displays_published_documents_to_all_authenticated_users(): void
    {
        $creator = User::factory()->create();
        $otherUser = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $publishedDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'status' => 'published',
        ]);

        $publishedDoc->topics()->attach($topic->id);

        $response = $this->actingAs($otherUser)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('topic.slug', 'laravel')
            ->has('documents.data', 1)
            ->where('documents.data.0.slug', $publishedDoc->slug)
        );
    }

    public function test_show_hides_draft_documents_from_non_creators(): void
    {
        $creator = User::factory()->create();
        $otherUser = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $draftDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'status' => 'draft',
        ]);

        $draftDoc->topics()->attach($topic->id);

        $response = $this->actingAs($otherUser)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('topic.slug', 'laravel')
            ->has('documents.data', 0)
        );
    }

    public function test_show_displays_draft_documents_to_creator(): void
    {
        $creator = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $draftDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'status' => 'draft',
        ]);

        $draftDoc->topics()->attach($topic->id);

        $response = $this->actingAs($creator)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('topic.slug', 'laravel')
            ->has('documents.data', 1)
            ->where('documents.data.0.slug', $draftDoc->slug)
        );
    }

    public function test_show_hides_private_documents_from_non_creators(): void
    {
        $creator = User::factory()->create();
        $otherUser = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $privateDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'status' => 'private',
        ]);

        $privateDoc->topics()->attach($topic->id);

        $response = $this->actingAs($otherUser)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('topic.slug', 'laravel')
            ->has('documents.data', 0)
        );
    }

    public function test_show_displays_private_documents_to_creator(): void
    {
        $creator = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $privateDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'status' => 'private',
        ]);

        $privateDoc->topics()->attach($topic->id);

        $response = $this->actingAs($creator)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('topic.slug', 'laravel')
            ->has('documents.data', 1)
            ->where('documents.data.0.slug', $privateDoc->slug)
        );
    }

    public function test_show_displays_draft_documents_to_updater(): void
    {
        $creator = User::factory()->create();
        $updater = User::factory()->create();
        $otherUser = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $draftDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'updated_by' => $updater->id,
            'status' => 'draft',
        ]);

        $draftDoc->topics()->attach($topic->id);

        // Updater can see the draft document
        $response = $this->actingAs($updater)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 1)
            ->where('documents.data.0.slug', $draftDoc->slug)
        );

        // Other users cannot see the draft document
        $response = $this->actingAs($otherUser)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 0)
        );
    }

    public function test_show_displays_private_documents_to_updater(): void
    {
        $creator = User::factory()->create();
        $updater = User::factory()->create();
        $otherUser = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $privateDoc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'updated_by' => $updater->id,
            'status' => 'private',
        ]);

        $privateDoc->topics()->attach($topic->id);

        // Updater can see the private document
        $response = $this->actingAs($updater)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 1)
            ->where('documents.data.0.slug', $privateDoc->slug)
        );

        // Other users cannot see the private document
        $response = $this->actingAs($otherUser)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 0)
        );
    }

    public function test_show_paginates_documents_correctly(): void
    {
        $user = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        // Create 25 published documents
        $documents = MarkdownDocument::factory()->count(25)->create([
            'created_by' => $user->id,
            'status' => 'published',
        ]);

        foreach ($documents as $doc) {
            $doc->topics()->attach($topic->id);
        }

        // First page should have 20 documents
        $response = $this->actingAs($user)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('documents.per_page', 20)
            ->where('documents.total', 25)
            ->where('documents.current_page', 1)
            ->where('documents.last_page', 2)
            ->has('documents.data', 20)
        );

        // Second page should have 5 documents
        $response = $this->actingAs($user)->get(route('topics.show', ['slug' => $topic->slug, 'page' => 2]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->where('documents.current_page', 2)
            ->has('documents.data', 5)
        );
    }

    public function test_show_orders_documents_by_updated_at_descending(): void
    {
        $user = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $oldDoc = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'status' => 'published',
            'updated_at' => now()->subDays(10),
        ]);

        $newDoc = MarkdownDocument::factory()->create([
            'created_by' => $user->id,
            'status' => 'published',
            'updated_at' => now()->subDays(1),
        ]);

        $oldDoc->topics()->attach($topic->id);
        $newDoc->topics()->attach($topic->id);

        $response = $this->actingAs($user)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 2)
            ->where('documents.data.0.slug', $newDoc->slug)
            ->where('documents.data.1.slug', $oldDoc->slug)
        );
    }

    public function test_show_includes_creator_and_updater_information(): void
    {
        $creator = User::factory()->create(['name' => 'Creator User']);
        $updater = User::factory()->create(['name' => 'Updater User']);

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        $doc = MarkdownDocument::factory()->create([
            'created_by' => $creator->id,
            'updated_by' => $updater->id,
            'status' => 'published',
        ]);

        $doc->topics()->attach($topic->id);

        $response = $this->actingAs($creator)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 1)
            ->where('documents.data.0.created_by.name', 'Creator User')
            ->where('documents.data.0.updated_by.name', 'Updater User')
        );
    }

    public function test_show_combines_published_and_owned_draft_documents(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $topic = Topic::create(['name' => 'Laravel', 'slug' => 'laravel']);

        // User1's draft document
        $draftDoc = MarkdownDocument::factory()->create([
            'created_by' => $user1->id,
            'status' => 'draft',
        ]);

        // User2's published document
        $publishedDoc = MarkdownDocument::factory()->create([
            'created_by' => $user2->id,
            'status' => 'published',
        ]);

        // User2's draft document (should not be visible to user1)
        $otherDraftDoc = MarkdownDocument::factory()->create([
            'created_by' => $user2->id,
            'status' => 'draft',
        ]);

        $draftDoc->topics()->attach($topic->id);
        $publishedDoc->topics()->attach($topic->id);
        $otherDraftDoc->topics()->attach($topic->id);

        // User1 should see their own draft and user2's published document
        $response = $this->actingAs($user1)->get(route('topics.show', $topic->slug));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('topics/show')
            ->has('documents.data', 2)
        );

        // Verify user1 can see their draft and the published doc
        $data = $response->viewData('page')['props']['documents']['data'];
        $slugs = collect($data)->pluck('slug')->toArray();

        $this->assertContains($draftDoc->slug, $slugs);
        $this->assertContains($publishedDoc->slug, $slugs);
        $this->assertNotContains($otherDraftDoc->slug, $slugs);
    }
}
