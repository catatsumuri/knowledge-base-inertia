<?php

namespace App\Http\Requests;

use App\Services\XApiService;
use Illuminate\Foundation\Http\FormRequest;

class TweetStoreRequest extends FormRequest
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
            'tweet_input' => [
                'required',
                'string',
                'max:500',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $xApiService = app(XApiService::class);
                    $tweetId = $xApiService->extractTweetId($value);

                    if ($tweetId === null) {
                        $fail(__('Please enter a valid tweet ID or URL'));
                    }
                },
            ],
        ];
    }
}
