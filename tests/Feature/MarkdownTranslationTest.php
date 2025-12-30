<?php

use App\Models\User;

uses()->group('markdown');

test('翻訳APIは認証が必要', function () {
    $response = $this->postJson('/api/markdown/translate', [
        'text' => 'Hello World',
    ]);

    $response->assertUnauthorized();
});

test('日本語テキストを英語に翻訳できる', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
        'text' => 'こんにちは世界',
    ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'original',
        'translated',
        'source_lang',
        'target_lang',
    ]);
    $response->assertJson([
        'original' => 'こんにちは世界',
        'source_lang' => 'ja',
        'target_lang' => 'en',
    ]);
    expect($response->json('translated'))->toBeString();
    expect($response->json('translated'))->toContain('[EN]');
});

test('英語テキストを日本語に翻訳できる', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
        'text' => 'Hello World',
    ]);

    $response->assertOk();
    $response->assertJson([
        'original' => 'Hello World',
        'source_lang' => 'en',
        'target_lang' => 'ja',
    ]);
    expect($response->json('translated'))->toContain('[日本語]');
});

test('textフィールドが必須', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/markdown/translate', []);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('text');
});

test('textフィールドは文字列でなければならない', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
        'text' => 12345,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('text');
});

test('textフィールドは10000文字以内でなければならない', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
        'text' => str_repeat('a', 10001),
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('text');
});

test('空のテキストは翻訳できない', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/markdown/translate', [
        'text' => '',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('text');
});
