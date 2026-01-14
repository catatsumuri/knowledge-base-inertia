<?php

namespace App\Services;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use Illuminate\Support\Collection;

class MarkdownNavigationTreeBuilder
{
    /**
     * @param  \Illuminate\Support\Collection<int, MarkdownDocument>  $documents
     * @param  \Illuminate\Support\Collection<int, MarkdownNavigationItem>  $navigationItems
     */
    public function build(
        Collection $documents,
        Collection $navigationItems,
        bool $promoteIndexDocuments = true
    ): array {
        $tree = [];

        foreach ($documents as $document) {
            $parts = explode('/', $document->slug);
            $this->addToTree($tree, $parts, $document);
        }

        $orderMap = $this->buildOrderMap($navigationItems);
        $labelMap = $this->buildLabelMap($navigationItems);
        $this->applyLabels($tree, $labelMap);
        $this->sortTree($tree, $orderMap);

        if ($promoteIndexDocuments) {
            $this->promoteIndexDocuments($tree);
        }

        return $tree;
    }

    /**
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
                'path' => $document->slug,
                'title' => $document->title ?: $document->slug,
                'status' => $document->status,
            ];

            return;
        }

        $folderIndex = null;
        foreach ($tree as $index => $node) {
            if (($node['type'] ?? '') === 'folder' && ($node['path'] ?? '') === $newPath) {
                $folderIndex = $index;
                break;
            }
        }

        if ($folderIndex === null) {
            $tree[] = [
                'type' => 'folder',
                'slug' => $part,
                'path' => $newPath,
                'title' => ucfirst($part),
                'children' => [],
            ];
            $folderIndex = count($tree) - 1;
        }

        $this->addToTree($tree[$folderIndex]['children'], $parts, $document, $newPath);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, MarkdownNavigationItem>  $navigationItems
     */
    private function buildOrderMap(Collection $navigationItems): array
    {
        $map = [];

        foreach ($navigationItems as $item) {
            $key = $item->node_type.'|'.$item->node_path;
            $map[$key] = $item->position;
        }

        return $map;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, MarkdownNavigationItem>  $navigationItems
     */
    private function buildLabelMap(Collection $navigationItems): array
    {
        $map = [];

        foreach ($navigationItems as $item) {
            if (! $item->label) {
                continue;
            }

            $key = $item->node_type.'|'.$item->node_path;
            $map[$key] = $item->label;
        }

        return $map;
    }

    private function applyLabels(array &$tree, array $labelMap): void
    {
        foreach ($tree as &$node) {
            $key = ($node['type'] ?? '').'|'.($node['path'] ?? '');

            if (($node['type'] ?? '') === 'folder' && isset($labelMap[$key])) {
                $node['label'] = $labelMap[$key];
            }

            if (($node['type'] ?? '') === 'folder' && isset($node['children'])) {
                $this->applyLabels($node['children'], $labelMap);
            }
        }
    }

    private function sortTree(array &$tree, array $orderMap): void
    {
        usort($tree, function (array $first, array $second) use ($orderMap): int {
            $firstKey = ($first['type'] ?? '').'|'.($first['path'] ?? '');
            $secondKey = ($second['type'] ?? '').'|'.($second['path'] ?? '');

            $firstPosition = $orderMap[$firstKey] ?? null;
            $secondPosition = $orderMap[$secondKey] ?? null;

            if ($firstPosition !== null && $secondPosition !== null) {
                return $firstPosition <=> $secondPosition;
            }

            if ($firstPosition !== null) {
                return -1;
            }

            if ($secondPosition !== null) {
                return 1;
            }

            $firstWeight = ($first['type'] ?? '') === 'folder' ? 0 : 1;
            $secondWeight = ($second['type'] ?? '') === 'folder' ? 0 : 1;

            if ($firstWeight !== $secondWeight) {
                return $firstWeight <=> $secondWeight;
            }

            return strcmp($first['slug'] ?? '', $second['slug'] ?? '');
        });

        foreach ($tree as &$node) {
            if (($node['type'] ?? '') === 'folder' && isset($node['children'])) {
                $this->sortTree($node['children'], $orderMap);
            }
        }
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
                    && ($child['path'] ?? '') === $node['path'].'/index'
                ) {
                    $node['index_slug'] = $child['path'];
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
}
