<?php

namespace App\Http\Requests;

use App\Models\MarkdownDocument;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkdownRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $payload = [];

        if ($this->has('slug')) {
            $payload['slug'] = ltrim($this->slug, '/');
        }

        if ($this->has('status')) {
            $payload['status'] = $this->input('status');
        } elseif ($this->isMethod('post')) {
            $payload['status'] = 'draft';
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isUpdate = $this->route('markdown') !== null;

        return [
            'slug' => [
                $isUpdate ? 'nullable' : 'nullable',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) use ($isUpdate): void {
                    if ($isUpdate || ! is_string($value) || $value === '') {
                        return;
                    }

                    $hasChildren = MarkdownDocument::query()
                        ->where('slug', 'like', $value.'/%')
                        ->exists();

                    if ($hasChildren) {
                        $fail(__('The slug is unavailable because child pages already exist.'));

                        return;
                    }

                    $parts = explode('/', $value);
                    array_pop($parts);

                    if ($parts === []) {
                        return;
                    }

                    $parentSlug = implode('/', $parts);
                    $parentExists = MarkdownDocument::query()
                        ->where('slug', $parentSlug)
                        ->exists();

                    if ($parentExists) {
                        $fail(__('The slug is unavailable because a parent page already exists.'));
                    }
                },
                Rule::unique('markdown_documents', 'slug')->ignore($this->route('markdown')),
            ],
            'title' => [
                $isUpdate ? 'required' : 'nullable',
                'string',
                'max:255',
            ],
            'content' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'private', 'published'])],
            'eyecatch' => ['nullable', 'image', 'max:5120'],
            'topics' => ['nullable', 'array'],
            'topics.*' => ['required', 'string', 'max:50'],
        ];
    }
}
