<?php

namespace Database\Seeders;

use App\Models\MarkdownDocument;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $testUser = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        // ZennのMarkdown記法一覧ドキュメント
        $zennContent = file_get_contents(base_path('zenn-editor/packages/zenn-cli/articles/100-example-markdown-guide.md'));
        // Frontmatter（YAMLヘッダー）を除去
        $zennContent = preg_replace('/^---\n.*?\n---\n/s', '', $zennContent);

        MarkdownDocument::firstOrCreate(
            ['slug' => 'zenn-syntax-test'],
            [
                'title' => 'ZennのMarkdown記法一覧',
                'content' => $zennContent,
                'created_by' => $testUser->id,
                'updated_by' => $testUser->id,
            ]
        );
    }
}
