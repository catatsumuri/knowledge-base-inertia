<?php

namespace Tests\Unit;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarkdownDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_home_page_returns_home_document(): void
    {
        $user = User::factory()->create();
        $homeDocument = MarkdownDocument::factory()->create([
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $result = MarkdownDocument::getHomePage();

        $this->assertNotNull($result);
        $this->assertEquals($homeDocument->id, $result->id);
        $this->assertTrue($result->is_home_page);
    }

    public function test_get_home_page_returns_null_when_no_home_document(): void
    {
        $result = MarkdownDocument::getHomePage();

        $this->assertNull($result);
    }

    public function test_has_home_page_returns_true_when_home_document_exists(): void
    {
        $user = User::factory()->create();
        MarkdownDocument::factory()->create([
            'is_home_page' => true,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $this->assertTrue(MarkdownDocument::hasHomePage());
    }

    public function test_has_home_page_returns_false_when_no_home_document(): void
    {
        $this->assertFalse(MarkdownDocument::hasHomePage());
    }
}
