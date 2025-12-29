<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarkdownImageUploadRequest;
use App\Http\Requests\MarkdownRequest;
use App\Models\MarkdownDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MarkdownController extends Controller
{
    /**
     * Display the index markdown document or show create form.
     */
    public function index(): Response|RedirectResponse
    {
        $indexDocument = MarkdownDocument::query()->where('slug', 'index')->first();

        if ($indexDocument) {
            return to_route('markdown.show', $indexDocument);
        }

        // indexドキュメントが存在しない場合はトップページ作成フォーム
        return Inertia::render('markdown/edit', [
            'document' => null,
            'isIndexDocument' => true,
        ]);
    }

    /**
     * Show the form for creating a new markdown document.
     */
    public function create(): Response
    {
        return Inertia::render('markdown/edit', [
            'document' => null,
            'isIndexDocument' => false,
        ]);
    }

    /**
     * Store a newly created markdown document in storage.
     */
    public function store(MarkdownRequest $request): RedirectResponse
    {
        $indexExists = MarkdownDocument::query()->where('slug', 'index')->exists();

        $data = $request->validated();

        // indexドキュメントが存在せず、slugがindexの場合のみ強制
        if (! $indexExists && ($data['slug'] ?? null) === 'index') {
            $data['slug'] = 'index';
        }

        $document = MarkdownDocument::query()->create([
            ...$data,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.show', $document->slug);
    }

    /**
     * Display the specified markdown document or show create form if not exists.
     */
    public function show(string $slug): Response
    {
        $document = MarkdownDocument::query()->where('slug', $slug)->first();

        if (! $document) {
            return Inertia::render('markdown/edit', [
                'document' => null,
                'isIndexDocument' => false,
                'slug' => $slug,
            ]);
        }

        $document->load(['createdBy', 'updatedBy']);

        return Inertia::render('markdown/show', [
            'document' => $document,
        ]);
    }

    /**
     * Show the form for editing the specified markdown document.
     */
    public function edit(string $slug): Response
    {
        $document = MarkdownDocument::query()->where('slug', $slug)->firstOrFail();

        return Inertia::render('markdown/edit', [
            'document' => $document,
        ]);
    }

    /**
     * Update the specified markdown document in storage.
     */
    public function update(MarkdownRequest $request, string $slug): RedirectResponse
    {
        $document = MarkdownDocument::query()->where('slug', $slug)->firstOrFail();

        $document->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.show', $document->slug);
    }

    /**
     * Remove the specified markdown document from storage.
     */
    public function destroy(string $slug): RedirectResponse
    {
        $document = MarkdownDocument::query()->where('slug', $slug)->firstOrFail();

        $document->delete();

        return to_route('markdown.index');
    }

    /**
     * Upload an image for markdown content.
     */
    public function uploadImage(MarkdownImageUploadRequest $request): RedirectResponse
    {
        $file = $request->file('image');
        $filename = Str::random(40).'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('markdown-images', $filename, 'public');

        // 相対URLを生成
        $url = '/storage/'.$path;

        return back()->with('imageUrl', $url);
    }
}
