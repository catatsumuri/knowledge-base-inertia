<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkdownSlugAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $payload = [];

        if ($this->has('slug')) {
            $payload['slug'] = ltrim((string) $this->input('slug'), '/');
        }

        if ($this->has('current_slug')) {
            $payload['current_slug'] = ltrim((string) $this->input('current_slug'), '/');
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }

    public function rules(): array
    {
        return [
            'slug' => ['required', 'string', 'max:255'],
            'current_slug' => ['nullable', 'string', 'max:255'],
        ];
    }
}
