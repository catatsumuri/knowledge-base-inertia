<?php

namespace Database\Seeders;

use App\Models\MarkdownDocument;
use App\Models\MarkdownDocumentRevision;
use App\Models\User;
use Illuminate\Database\Seeder;

class MarkdownDocumentRevisionSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $document = MarkdownDocument::first();
        $user = User::first();

        if (! $document || ! $user) {
            return;
        }

        MarkdownDocumentRevision::firstOrCreate(
            [
                'markdown_document_id' => $document->id,
                'title' => $document->title,
                'content' => $document->content,
            ],
            [
                'edited_by' => $user->id,
            ]
        );
    }
}
