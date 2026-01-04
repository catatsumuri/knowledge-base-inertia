<?php

namespace App\Http\Requests;

use App\Models\MarkdownDocument;
use App\Models\MarkdownDocumentRevision;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class MarkdownRevisionRestoreRequest extends FormRequest
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $document = $this->route('document');
            $revision = $this->route('revision');

            if (
                $document instanceof MarkdownDocument &&
                $revision instanceof MarkdownDocumentRevision &&
                $revision->markdown_document_id !== $document->id
            ) {
                $validator->errors()->add(
                    'revision',
                    'The selected revision does not belong to this document.'
                );
            }
        });
    }
}
