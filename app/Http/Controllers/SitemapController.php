<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Services\MarkdownNavigationTreeBuilder;
use Inertia\Inertia;
use Inertia\Response;

class SitemapController extends Controller
{
    /**
     * Display the sitemap of all markdown documents.
     */
    public function index(MarkdownNavigationTreeBuilder $treeBuilder): Response
    {
        $documents = MarkdownDocument::query()
            ->with(['createdBy', 'updatedBy', 'media'])
            ->orderBy('slug')
            ->get();

        $navigationItems = MarkdownNavigationItem::query()->get();
        $tree = $treeBuilder->build(
            $documents,
            $navigationItems,
            promoteIndexDocuments: false,
            documentMapper: static fn (MarkdownDocument $document) => [
                'eyecatch_thumb_url' => $document->eyecatchThumbUrl(),
                'updated_at' => $document->updated_at?->toISOString(),
                'updated_by' => $document->updatedBy ? [
                    'name' => $document->updatedBy->name,
                ] : null,
            ],
        );

        return Inertia::render('sitemap', [
            'tree' => $tree,
            'canCreate' => true,
        ]);
    }
}
