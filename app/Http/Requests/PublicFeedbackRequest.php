<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublicFeedbackRequest extends FormRequest
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
            'feedback_content' => ['required', 'string', 'max:2000'],
            'page_slug' => ['required', 'string'],
            'page_url' => ['nullable', 'string'],
            'captcha_answer' => ['required', 'integer'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'feedback_content.required' => 'フィードバック内容を入力してください。',
            'feedback_content.max' => 'フィードバック内容は2000文字以内で入力してください。',
            'page_slug.required' => 'ページスラッグが必要です。',
            'captcha_answer.required' => 'スパム対策の回答を入力してください。',
            'captcha_answer.integer' => 'スパム対策の回答は数値で入力してください。',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $expected = session('public_feedback_captcha_answer');
            if ($expected === null) {
                $validator->errors()->add('captcha_answer', 'スパム対策の回答を再入力してください。');

                return;
            }

            if ((int) $this->input('captcha_answer') !== (int) $expected) {
                $validator->errors()->add('captcha_answer', 'スパム対策の回答が違います。');
            }
        });
    }
}
