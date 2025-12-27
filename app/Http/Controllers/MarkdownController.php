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
        $isFirstDocument = MarkdownDocument::query()->count() === 0;

        $data = $request->validated();

        if ($isFirstDocument) {
            $data['slug'] = 'index';
            $data['title'] = __('Top page');
        }

        $document = MarkdownDocument::query()->create([
            ...$data,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.show', $document);
    }

    /**
     * Display the specified markdown document.
     */
    public function show(MarkdownDocument $document): Response
    {
        $document->load(['createdBy', 'updatedBy']);

        return Inertia::render('markdown/show', [
            'document' => $document,
        ]);
    }

    /**
     * Show the form for editing the specified markdown document.
     */
    public function edit(MarkdownDocument $document): Response
    {
        return Inertia::render('markdown/edit', [
            'document' => $document,
        ]);
    }

    /**
     * Update the specified markdown document in storage.
     */
    public function update(MarkdownRequest $request, MarkdownDocument $document): RedirectResponse
    {
        $document->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.show', $document);
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
