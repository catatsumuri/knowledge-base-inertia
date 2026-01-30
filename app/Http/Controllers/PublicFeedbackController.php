<?php

namespace App\Http\Controllers;

use App\Http\Requests\PublicFeedbackRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;

class PublicFeedbackController extends Controller
{
    /**
     * Store a new feedback from a public page.
     */
    public function store(PublicFeedbackRequest $request): RedirectResponse
    {
        // Ensure public views are enabled
        if (! config('app.public_views')) {
            abort(404);
        }

        $validated = $request->validated();

        // Build Slack notification message
        $message = "📝 公開ページフィードバック受信\n\n";
        $message .= "ページ: {$validated['page_slug']}\n";

        if (isset($validated['page_url'])) {
            $message .= "URL: {$validated['page_url']}\n";
        }

        $message .= "\nフィードバック内容:\n{$validated['feedback_content']}\n\n";
        $message .= '送信日時: '.now()->format('Y-m-d H:i:s');

        // Send Slack notification and keep a dedicated feedback log
        Log::channel('feedback_notifications')->info($message);

        session()->forget('public_feedback_captcha_answer');

        return back();
    }
}
