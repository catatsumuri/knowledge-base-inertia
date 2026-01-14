<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Services\MarkdownNavigationTreeBuilder;
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
            'document' => [
                ...$document->toArray(),
                'eyecatch_url' => $document->eyecatchUrl(),
            ],
            'relatedShouts' => [],
            'canCreate' => false,
            'isPublic' => true,
            'pageTree' => $this->buildPublicTree(),
        ]);
    }

    private function ensurePublicViewsEnabled(): void
    {
        if (! config('app.public_views')) {
            abort(404);
        }
    }

    private function buildPublicTree(): array
    {
        $documents = MarkdownDocument::query()
            ->where('status', 'published')
            ->orderBy('slug')
            ->get();

        $navigationItems = MarkdownNavigationItem::query()->get();

        return app(MarkdownNavigationTreeBuilder::class)
            ->build($documents, $navigationItems);
    }
}
