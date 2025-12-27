<?php

namespace App\Http\Requests;

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
                Rule::unique('markdown_documents', 'slug')->ignore($this->route('markdown')),
            ],
            'title' => [
                $isUpdate ? 'required' : 'nullable',
                'string',
                'max:255',
            ],
            'content' => ['nullable', 'string'],
        ];
    }
}
