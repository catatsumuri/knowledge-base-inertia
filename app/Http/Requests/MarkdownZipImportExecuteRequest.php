<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkdownZipImportExecuteRequest extends FormRequest
{
    /**
     * The route to redirect to if validation fails.
     */
    protected $redirectRoute = 'app-settings';

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
            'session_key' => [
                'required',
                'string',
            ],
            'conflict_resolutions' => [
                'nullable',
                'array',
            ],
            'conflict_resolutions.*' => [
                'in:overwrite,skip',
            ],
        ];
    }
}
