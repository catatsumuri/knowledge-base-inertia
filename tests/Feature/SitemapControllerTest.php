<?php

use App\Models\MarkdownDocument;
use App\Models\User;

uses()->group('sitemap');

test('sitemapページにアクセスできる', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/sitemap');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('sitemap')
        ->has('tree')
    );
});

test('ドキュメントがない場合は空のツリーを返す', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/sitemap');

    $response->assertInertia(fn ($page) => $page
        ->component('sitemap')
        ->where('tree', [])
    );
});

test('フラットなドキュメントのツリーを構築する', function () {
    $user = User::factory()->create();

    MarkdownDocument::factory()->create([
        'slug' => 'index',
        'title' => 'Home',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    MarkdownDocument::factory()->create([
        'slug' => 'about',
        'title' => 'About',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get('/sitemap');

    $response->assertInertia(fn ($page) => $page
        ->component('sitemap')
        ->has('tree', 2)
        ->where('tree.0.type', 'document')
        ->where('tree.0.slug', 'about')
        ->where('tree.0.title', 'About')
        ->where('tree.1.type', 'document')
        ->where('tree.1.slug', 'index')
        ->where('tree.1.title', 'Home')
    );
});

test('ネストしたドキュメントの階層ツリーを構築する', function () {
    $user = User::factory()->create();

    MarkdownDocument::factory()->create([
        'slug' => 'guides/getting-started',
        'title' => 'Getting Started',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    MarkdownDocument::factory()->create([
        'slug' => 'guides/advanced/optimization',
        'title' => 'Optimization',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get('/sitemap');

    $response->assertInertia(fn ($page) => $page
        ->component('sitemap')
        ->has('tree', 1)
        ->where('tree.0.type', 'folder')
        ->where('tree.0.slug', 'guides')
        ->where('tree.0.title', 'Guides')
        ->has('tree.0.children', 2)
        ->where('tree.0.children.0.type', 'folder')
        ->where('tree.0.children.0.slug', 'advanced')
        ->has('tree.0.children.0.children', 1)
        ->where('tree.0.children.0.children.0.type', 'document')
        ->where('tree.0.children.0.children.0.slug', 'guides/advanced/optimization')
        ->where('tree.0.children.1.type', 'document')
        ->where('tree.0.children.1.slug', 'guides/getting-started')
    );
});

test('ドキュメントに更新者情報が含まれる', function () {
    $creator = User::factory()->create(['name' => 'Creator']);
    $updater = User::factory()->create(['name' => 'Updater']);

    MarkdownDocument::factory()->create([
        'slug' => 'test',
        'title' => 'Test',
        'created_by' => $creator->id,
        'updated_by' => $updater->id,
    ]);

    $response = $this->actingAs($creator)->get('/sitemap');

    $response->assertInertia(fn ($page) => $page
        ->component('sitemap')
        ->has('tree.0.updated_by')
        ->where('tree.0.updated_by.name', 'Updater')
        ->has('tree.0.updated_at')
    );
});

test('混在したフラットとネストのツリーを正しく構築する', function () {
    $user = User::factory()->create();

    MarkdownDocument::factory()->create([
        'slug' => 'index',
        'title' => 'Home',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    MarkdownDocument::factory()->create([
        'slug' => 'api/users',
        'title' => 'Users API',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    MarkdownDocument::factory()->create([
        'slug' => 'about',
        'title' => 'About',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get('/sitemap');

    $response->assertInertia(fn ($page) => $page
        ->component('sitemap')
        ->has('tree', 3)
        // aboutドキュメント
        ->where('tree.0.type', 'document')
        ->where('tree.0.slug', 'about')
        // apiフォルダ
        ->where('tree.1.type', 'folder')
        ->where('tree.1.slug', 'api')
        ->has('tree.1.children', 1)
        ->where('tree.1.children.0.slug', 'api/users')
        // indexドキュメント
        ->where('tree.2.type', 'document')
        ->where('tree.2.slug', 'index')
    );
});

test('ゲストはsitemapにアクセスできない', function () {
    $response = $this->get('/sitemap');

    $response->assertRedirect(route('login'));
});
