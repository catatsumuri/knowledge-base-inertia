<?php

namespace Tests\Feature;

use App\Models\MarkdownDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodeTabsRenderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_with_code_tabs_directive_can_be_displayed(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
# コードタブのテスト

:::code-tabs
```vuejs:Vue.js
<script setup>
const form = useForm()
</script>
```

```react:React
import { Form } from '@inertiajs/react'
```
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
    }

    public function test_language_names_are_used_when_labels_are_omitted(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
:::code-tabs
```javascript
console.log('Hello');
```

```python
print('Hello')
```
:::
MD,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->get(route('markdown.show', $document->slug));

        $response->assertOk();
    }

    public function test_multiple_code_tabs_directives_can_be_displayed(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
# タブその1

:::code-tabs
```vue:Vue
<template>
```

```react:React
<Form>
```
:::

# タブその2

:::code-tabs
```php:PHP
Route::get();
```

```ruby:Ruby
get '/users'
```
:::
MD,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->get(route('markdown.show', $document->slug));

        $response->assertOk();
    }

    public function test_empty_code_tabs_show_an_error_message(): void
    {
        $user = User::factory()->create();
        $document = MarkdownDocument::factory()->create([
            'content' => <<<'MD'
:::code-tabs
:::
MD,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->get(route('markdown.show', $document->slug));

        $response->assertOk();
    }
}
