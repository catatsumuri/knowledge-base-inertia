<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkdownMoveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('slug')) {
            $this->merge([
                'slug' => ltrim((string) $this->input('slug'), '/'),
            ]);
        }
    }

    public function rules(): array
    {
        // GETリクエストの場合はバリデーションをスキップ
        if ($this->isMethod('get')) {
            return [];
        }

        $currentSlug = (string) $this->route('slug');

        return [
            'slug' => [
                'required',
                'string',
                'max:255',
                Rule::unique('markdown_documents', 'slug')->ignore($currentSlug, 'slug'),
            ],
        ];
    }
}
