<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkdownImageUploadRequest extends FormRequest
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
        return [
            'document_id' => ['nullable', 'integer', 'exists:markdown_documents,id', 'required_without:slug'],
            'slug' => ['nullable', 'string', 'max:255', 'required_without:document_id'],
            'image' => ['required', 'image', 'max:5120', 'mimes:jpg,jpeg,png,gif,webp,svg'],
        ];
    }
}
