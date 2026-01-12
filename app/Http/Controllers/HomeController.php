<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class HomeController extends Controller
{
    /**
     * Display the home page.
     */
    public function index(): Response|RedirectResponse
    {
        $homeDocument = MarkdownDocument::getHomePage();

        if ($homeDocument) {
            // ホームページドキュメントが設定されている場合は常に表示
            $homeDocument->load(['createdBy', 'updatedBy']);

            return Inertia::render('markdown/show', [
                'document' => $homeDocument,
                'relatedShouts' => [],
                'canCreate' => auth()->check(),
                'isPublic' => true,
                'isHomePage' => true,
            ]);
        }

        // ホームページドキュメントが設定されていない場合は既存のロジック
        if (! config('app.public_views') && ! auth()->check()) {
            return redirect()->route('login');
        }

        return Inertia::render('welcome', [
            'canRegister' => Features::enabled(Features::registration()),
        ]);
    }
}
