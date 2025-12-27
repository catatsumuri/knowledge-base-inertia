<?php

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

uses()->group('markdown');

test('indexドキュメントが存在する場合はリダイレクトする', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'slug' => 'index',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get('/markdown');

    $response->assertRedirect(route('markdown.show', $document));
});

test('ドキュメントが存在しない場合は編集ページを表示する', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/markdown');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('markdown/edit')
        ->where('document', null)
        ->where('isIndexDocument', true)
    );
});

test('新規作成ページを表示する', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/markdown/create');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('markdown/edit'));
});

test('最初のドキュメントはindexスラッグとトップページタイトルで作成される', function () {
    $user = User::factory()->create();

    $data = [
        'content' => '# Hello World',
    ];

    $response = $this->actingAs($user)->post('/markdown', $data);

    $this->assertDatabaseHas('markdown_documents', [
        'slug' => 'index',
        'title' => 'Top page',
        'content' => '# Hello World',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $document = MarkdownDocument::where('slug', 'index')->first();
    $response->assertRedirect(route('markdown.show', $document));
});

test('2つ目以降のドキュメントは指定されたスラッグとタイトルで作成される', function () {
    $user = User::factory()->create();

    MarkdownDocument::factory()->create([
        'slug' => 'index',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $data = [
        'slug' => 'test-document',
        'title' => 'Test Document',
        'content' => '# Hello World',
    ];

    $response = $this->actingAs($user)->post('/markdown', $data);

    $this->assertDatabaseHas('markdown_documents', [
        'slug' => 'test-document',
        'title' => 'Test Document',
        'content' => '# Hello World',
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $document = MarkdownDocument::where('slug', 'test-document')->first();
    $response->assertRedirect(route('markdown.show', $document));
});

test('ドキュメントを表示する', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get(route('markdown.show', $document));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('markdown/show')
        ->has('document')
    );
});

test('ドキュメント編集ページを表示する', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->get(route('markdown.edit', $document));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('markdown/edit'));
});

test('ドキュメントを更新する', function () {
    $user = User::factory()->create();
    $document = MarkdownDocument::factory()->create([
        'created_by' => $user->id,
        'updated_by' => $user->id,
    ]);

    $data = [
        'title' => 'Updated Title',
        'content' => 'Updated content',
    ];

    $response = $this->actingAs($user)->patch(route('markdown.update', $document), $data);

    $this->assertDatabaseHas('markdown_documents', [
        'id' => $document->id,
        'title' => 'Updated Title',
        'content' => 'Updated content',
        'updated_by' => $user->id,
    ]);

    $response->assertRedirect(route('markdown.show', $document));
});

test('ゲストはマークダウンルートにアクセスできない', function () {
    $document = MarkdownDocument::factory()->create();

    $this->get('/markdown')->assertRedirect(route('login'));
    $this->get('/markdown/create')->assertRedirect(route('login'));
    $this->post('/markdown', [])->assertRedirect(route('login'));
    $this->get(route('markdown.show', $document))->assertRedirect(route('login'));
    $this->get(route('markdown.edit', $document))->assertRedirect(route('login'));
    $this->patch(route('markdown.update', $document), [])->assertRedirect(route('login'));
});

test('画像をアップロードしてURLを返す', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $file = \Illuminate\Http\UploadedFile::fake()->image('test.jpg', 100, 100);

    $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
        'image' => $file,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('imageUrl');

    $imageUrl = session('imageUrl');
    expect($imageUrl)->toStartWith('/storage/markdown-images/');

    // ファイルが保存されていることを確認
    $filename = basename($imageUrl);
    Storage::disk('public')->assertExists('markdown-images/'.$filename);
});

test('画像以外のファイルをアップロードを拒否する', function () {
    $user = User::factory()->create();

    $file = \Illuminate\Http\UploadedFile::fake()->create('document.pdf', 100);

    $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
        'image' => $file,
    ]);

    $response->assertSessionHasErrors(['image']);
});

test('サイズ超過のファイルアップロードを拒否する', function () {
    $user = User::factory()->create();

    // 6MB (制限は5MB)
    $file = \Illuminate\Http\UploadedFile::fake()->image('large.jpg')->size(6144);

    $response = $this->actingAs($user)->post(route('markdown.upload-image'), [
        'image' => $file,
    ]);

    $response->assertSessionHasErrors(['image']);
});

test('画像アップロードには認証が必要', function () {
    $file = \Illuminate\Http\UploadedFile::fake()->image('test.jpg');

    $response = $this->post(route('markdown.upload-image'), [
        'image' => $file,
    ]);

    $response->assertRedirect(route('login'));
});
