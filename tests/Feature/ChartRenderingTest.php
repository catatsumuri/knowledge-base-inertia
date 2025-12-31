<?php

use App\Models\MarkdownDocument;
use App\Models\User;

uses()->group('chart', 'markdown');

test('レーダーチャートディレクティブを含むドキュメントを表示できる', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'content' => <<<'MD'
# チャートテスト

:::chart-radar{title="スキルレベル" height="400"}
JavaScript: 90
TypeScript: 85
React: 88
PHP: 75
Laravel: 80
:::
MD,
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('markdown.show', $document->slug));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('markdown/show')
        ->where('document.content', $document->content)
    );
});

test('タイトルなしのレーダーチャートを表示できる', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'content' => <<<'MD'
:::chart-radar
JavaScript: 90
TypeScript: 85
:::
MD,
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('markdown.show', $document->slug));

    $response->assertOk();
});

test('複数のチャートを含むドキュメントを表示できる', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'content' => <<<'MD'
# 複数チャート

:::chart-radar{title="フロントエンド"}
React: 90
Vue: 70
:::

:::chart-radar{title="バックエンド"}
PHP: 85
Node.js: 75
:::
MD,
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('markdown.show', $document->slug));

    $response->assertOk();
});

test('サイズ指定のレーダーチャートを表示できる', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'content' => <<<'MD'
:::chart-radar{title="カスタムサイズ" height="500" width="80%"}
JavaScript: 90
TypeScript: 85
React: 88
:::
MD,
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get(route('markdown.show', $document->slug));

    $response->assertOk();
});
