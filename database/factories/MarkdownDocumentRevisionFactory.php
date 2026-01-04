<?php

namespace Database\Factories;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MarkdownDocumentRevision>
 */
class MarkdownDocumentRevisionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'markdown_document_id' => MarkdownDocument::factory(),
            'title' => fake()->sentence(),
            'content' => fake()->paragraphs(3, true),
            'edited_by' => User::factory(),
        ];
    }
}
