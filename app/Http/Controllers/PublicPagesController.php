<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use Inertia\Inertia;
use Inertia\Response;

class PublicPagesController extends Controller
{
    /**
     * Display the public index page.
     */
    public function index(): Response
    {
        $this->ensurePublicViewsEnabled();

        $document = MarkdownDocument::query()
            ->where('slug', 'index')
            ->where('status', 'published')
            ->first();

        if (! $document) {
            abort(404);
        }

        return $this->renderDocument($document);
    }

    /**
     * Display the public page for the given slug.
     */
    public function show(string $slug): Response
    {
        $this->ensurePublicViewsEnabled();

        $slug = trim($slug, '/');
        $document = MarkdownDocument::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $document) {
            abort(404);
        }

        return $this->renderDocument($document);
    }

    private function renderDocument(MarkdownDocument $document): Response
    {
        $document->load(['createdBy', 'updatedBy']);

        return Inertia::render('markdown/show', [
            'document' => $document,
            'relatedShouts' => [],
            'canCreate' => false,
            'isPublic' => true,
        ]);
    }

    private function ensurePublicViewsEnabled(): void
    {
        if (! config('app.public_views')) {
            abort(404);
        }
    }
}
