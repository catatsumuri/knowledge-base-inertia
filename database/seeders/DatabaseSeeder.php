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
        // $zennContent = file_get_contents(base_path('zenn-editor/packages/zenn-cli/articles/100-example-markdown-guide.md'));
        // Frontmatter（YAMLヘッダー）を除去
        // $zennContent = preg_replace('/^---\n.*?\n---\n/s', '', $zennContent);
        // $zennContent .= <<<'MARKDOWN'

        /*
        :::code-tabs
        ```bash:VueJS
        npm install @inertiajs/vue3@^2.0
        ```

        ```bash:React
        npm install @inertiajs/react@^2.0
        ```

        ```bash:Svelte
        npm install @inertiajs/svelte@^2.0
        ```
        // :::
        // MARKDOWN;

                MarkdownDocument::firstOrCreate(
                    ['slug' => 'zenn-syntax-test'],
                    [
                        'title' => 'ZennのMarkdown記法一覧',
                        'content' => $zennContent,
                        'created_by' => $testUser->id,
                        'updated_by' => $testUser->id,
                    ]
                );
         */

        // はじめにページ
        MarkdownDocument::firstOrCreate(
            ['slug' => 'welcome'],
            [
                'title' => 'はじめに',
                'content' => <<<'MARKDOWN'
# ようこそ！

このナレッジベースへようこそ。

## 機能紹介

このアプリケーションでは以下の機能が利用できます：

### ドキュメント管理
- **Markdown記法**でドキュメントを作成・編集
- リアルタイムプレビュー
- 画像アップロード対応
- リッチなリンクカード（OGP対応）

### シャウトボックス
- Twitter風のタイムライン
- 画像投稿（最大4枚、トリミング・フィルター機能付き）
- インライン編集機能
- テキストなし画像のみの投稿も可能

## 使い方

1. サイドバーから各機能にアクセス
2. Markdownページでドキュメントを作成
3. シャウトボックスで気軽につぶやき

詳しい使い方は各ページをご覧ください。
MARKDOWN
                ,
                'created_by' => $testUser->id,
                'updated_by' => $testUser->id,
            ]
        );

        MarkdownDocument::firstOrCreate(
            ['slug' => 'index'],
            [
                'title' => 'Index',
                'content' => <<<'MARKDOWN'
# ドキュメント一覧

## Inertia.js

- [Inertia.js ドキュメント (日本語)](inertia-ja-docs/getting-started/index) - Inertia.js v2の非公式日本語訳ドキュメント
MARKDOWN
                ,
                'status' => 'published',
                'created_by' => $testUser->id,
                'updated_by' => $testUser->id,
            ]
        );
    }
}
