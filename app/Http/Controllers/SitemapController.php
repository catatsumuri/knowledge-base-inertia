<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use Inertia\Inertia;
use Inertia\Response;

class SitemapController extends Controller
{
    /**
     * Display the sitemap of all markdown documents.
     */
    public function index(): Response
    {
        $documents = MarkdownDocument::query()
            ->with(['createdBy', 'updatedBy'])
            ->orderBy('slug')
            ->get();

        $tree = $this->buildTree($documents);

        return Inertia::render('sitemap', [
            'tree' => $tree,
            'canCreate' => true,
        ]);
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

        // 最後のパート（ドキュメント自体）
        if (empty($parts)) {
            $tree[] = [
                'type' => 'document',
                'slug' => $document->slug,
                'title' => $document->title,
                'draft' => $document->draft,
                'updated_at' => $document->updated_at->toISOString(),
                'updated_by' => $document->updatedBy ? [
                    'name' => $document->updatedBy->name,
                ] : null,
            ];

            return;
        }

        // フォルダを探す
        $folderIndex = null;
        foreach ($tree as $index => $node) {
            if ($node['type'] === 'folder' && $node['slug'] === $part) {
                $folderIndex = $index;
                break;
            }
        }

        // フォルダが存在しない場合は作成
        if ($folderIndex === null) {
            $tree[] = [
                'type' => 'folder',
                'slug' => $part,
                'title' => ucfirst($part),
                'children' => [],
            ];
            $folderIndex = count($tree) - 1;
        }

        // 再帰的に次のレベルへ
        $this->addToTree($tree[$folderIndex]['children'], $parts, $document, $newPath);
    }
}
