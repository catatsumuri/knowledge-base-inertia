<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Services\MarkdownNavigationTreeBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class NavigationOrderController extends Controller
{
    public function index(MarkdownNavigationTreeBuilder $treeBuilder): Response
    {
        $documents = MarkdownDocument::query()
            ->orderBy('slug')
            ->get();

        $navigationItems = MarkdownNavigationItem::query()->get();

        return Inertia::render('app-settings/navigation-order', [
            'tree' => $treeBuilder->build($documents, $navigationItems),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.node_type' => ['required', 'in:folder,document'],
            'items.*.node_path' => ['required', 'string'],
            'items.*.parent_path' => ['nullable', 'string'],
            'items.*.position' => ['required', 'integer', 'min:0'],
            'items.*.label' => ['nullable', 'string', 'max:255'],
        ]);

        $now = now();
        $items = array_map(static function (array $item) use ($now): array {
            return [
                'node_type' => $item['node_type'],
                'node_path' => $item['node_path'],
                'parent_path' => $item['parent_path'],
                'position' => $item['position'],
                'label' => $item['label'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $data['items']);

        DB::transaction(static function () use ($items): void {
            MarkdownNavigationItem::query()->delete();

            if ($items !== []) {
                MarkdownNavigationItem::query()->insert($items);
            }
        });

        return back();
    }
}
