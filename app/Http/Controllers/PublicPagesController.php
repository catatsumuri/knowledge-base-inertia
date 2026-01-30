<?php

namespace App\Http\Controllers;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Services\MarkdownNavigationTreeBuilder;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Honeypot\Honeypot;

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

        $left = random_int(1, 9);
        $right = random_int(1, 9);
        $captchaQuestion = "{$left} + {$right}";
        session(['public_feedback_captcha_answer' => $left + $right]);

        $firstLevelTitle = null;
        $firstLevelEyecatchLightUrl = null;
        $firstLevelEyecatchDarkUrl = null;
        $parentFolderEyecatchLightUrl = null;
        $parentFolderEyecatchDarkUrl = null;

        $firstLevelNavigationItem = $this->getFirstLevelNavigationItem($document->slug);
        $parentNavigationItem = $this->getParentNavigationItem($document->slug);

        if (config('markdown.use_first_level_as_title')) {
            $firstLevelTitle = $firstLevelNavigationItem?->label;
        }

        $firstLevelEyecatchLightUrl = $firstLevelNavigationItem?->eyecatchLightUrl();
        $firstLevelEyecatchDarkUrl = $firstLevelNavigationItem?->eyecatchDarkUrl();
        $parentFolderEyecatchLightUrl = $parentNavigationItem?->eyecatchLightUrl();
        $parentFolderEyecatchDarkUrl = $parentNavigationItem?->eyecatchDarkUrl();

        return Inertia::render('markdown/show', [
            'document' => [
                ...$document->toArray(),
                'eyecatch_url' => $document->eyecatchUrl(),
            ],
            'relatedShouts' => [],
            'canCreate' => false,
            'isPublic' => true,
            'honeypot' => new Honeypot(config('honeypot')),
            'captcha' => [
                'question' => $captchaQuestion,
            ],
            'pageTree' => $this->buildPublicTree(),
            'firstLevelTitle' => $firstLevelTitle,
            'firstLevelEyecatchLightUrl' => $firstLevelEyecatchLightUrl,
            'firstLevelEyecatchDarkUrl' => $firstLevelEyecatchDarkUrl,
            'parentFolderEyecatchLightUrl' => $parentFolderEyecatchLightUrl,
            'parentFolderEyecatchDarkUrl' => $parentFolderEyecatchDarkUrl,
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

    private function getFirstLevelNavigationItem(string $slug): ?MarkdownNavigationItem
    {
        // スラッグから第一階層のパスを抽出
        $parts = explode('/', $slug);
        if (count($parts) === 0) {
            return null;
        }

        $firstLevelPath = $parts[0];

        // ナビゲーションアイテムから第一階層のラベルを取得
        return MarkdownNavigationItem::query()
            ->where('node_type', 'folder')
            ->where('node_path', $firstLevelPath)
            ->whereNull('parent_path')
            ->first();
    }

    private function getParentNavigationItem(string $slug): ?MarkdownNavigationItem
    {
        $parts = explode('/', $slug);

        if (count($parts) <= 1) {
            return null;
        }

        array_pop($parts);
        $parentPath = implode('/', $parts);

        return MarkdownNavigationItem::query()
            ->where('node_type', 'folder')
            ->where('node_path', $parentPath)
            ->first();
    }
}
