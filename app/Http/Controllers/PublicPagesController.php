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

        $tree = $this->buildTree($documents);
        $this->promoteIndexDocuments($tree);

        return $tree;
    }

    /**
     * Build a hierarchical tree structure from documents.
     *
     * @param  \Illuminate\Database\Eloquent\Collection  $documents
     */
    private function buildTree($documents): array
    {
        $tree = [];

        foreach ($documents as $document) {
            $parts = explode('/', $document->slug);
            $this->addToTree($tree, $parts, $document);
        }

        $this->sortTree($tree);

        return $tree;
    }

    /**
     * Recursively add a document to the tree.
     *
     * @param  \App\Models\MarkdownDocument  $document
     */
    private function addToTree(array &$tree, array $parts, $document, string $currentPath = ''): void
    {
        $part = array_shift($parts);
        $newPath = $currentPath ? $currentPath.'/'.$part : $part;

        if (empty($parts)) {
            $tree[] = [
                'type' => 'document',
                'slug' => $document->slug,
                'title' => $document->title ?: $document->slug,
                'path' => $document->slug,
            ];

            return;
        }

        $folderIndex = null;
        foreach ($tree as $index => $node) {
            if ($node['type'] === 'folder' && $node['slug'] === $part) {
                $folderIndex = $index;
                break;
            }
        }

        if ($folderIndex === null) {
            $tree[] = [
                'type' => 'folder',
                'slug' => $part,
                'title' => ucfirst($part),
                'path' => $newPath,
                'children' => [],
            ];
            $folderIndex = count($tree) - 1;
        }

        $this->addToTree($tree[$folderIndex]['children'], $parts, $document, $newPath);
    }

    private function promoteIndexDocuments(array &$tree): void
    {
        foreach ($tree as &$node) {
            if (($node['type'] ?? '') !== 'folder') {
                continue;
            }

            $indexPosition = null;
            foreach ($node['children'] ?? [] as $index => $child) {
                if (
                    ($child['type'] ?? '') === 'document'
                    && ($node['path'] ?? '') !== ''
                    && $child['slug'] === $node['path'].'/index'
                ) {
                    $node['index_slug'] = $child['slug'];
                    $node['index_title'] = $child['title'];
                    $indexPosition = $index;
                    break;
                }
            }

            if ($indexPosition !== null) {
                array_splice($node['children'], $indexPosition, 1);
            }

            if (! empty($node['children'])) {
                $this->promoteIndexDocuments($node['children']);
            }
        }
    }

    /**
     * Sort tree nodes to show folders first, then documents.
     */
    private function sortTree(array &$tree): void
    {
        usort($tree, function (array $first, array $second): int {
            $firstWeight = ($first['type'] ?? '') === 'folder' ? 0 : 1;
            $secondWeight = ($second['type'] ?? '') === 'folder' ? 0 : 1;

            if ($firstWeight !== $secondWeight) {
                return $firstWeight <=> $secondWeight;
            }

            return strcmp($first['slug'] ?? '', $second['slug'] ?? '');
        });

        foreach ($tree as &$node) {
            if (($node['type'] ?? '') === 'folder' && isset($node['children'])) {
                $this->sortTree($node['children']);
            }
        }
    }
}
