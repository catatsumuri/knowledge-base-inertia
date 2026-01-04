<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarkdownImageUploadRequest;
use App\Http\Requests\MarkdownRequest;
use App\Http\Requests\MarkdownRevisionRestoreRequest;
use App\Http\Requests\MarkdownTranslateRequest;
use App\Models\MarkdownDocument;
use App\Models\MarkdownDocumentRevision;
use App\Models\MarkdownImageUpload;
use App\Models\ShoutLink;
use App\Services\ImageMetadataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use OpenAI\Laravel\Facades\OpenAI;

class MarkdownController extends Controller
{
    /**
     * Display the index markdown document.
     */
    public function index(): Response
    {
        return $this->show('index');
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
            $indexDocument = MarkdownDocument::query()
                ->where('slug', $slug.'/index')
                ->first();

            if ($indexDocument) {
                $document = $indexDocument;
            }
        }

        if (! $document) {
            return Inertia::render('markdown/edit', [
                'document' => null,
                'isIndexDocument' => $slug === 'index',
                'slug' => $slug,
            ]);
        }

        $document->load(['createdBy', 'updatedBy']);

        // このページにメンションしているshoutを取得（返信も含む）
        $relatedShouts = ShoutLink::query()
            ->where('slug', $document->slug)
            ->with(['shout.user', 'shout.links', 'shout.replies.user', 'shout.replies.links'])
            ->latest()
            ->limit(20)
            ->get()
            ->pluck('shout')
            ->filter();

        return Inertia::render('markdown/show', [
            'document' => $document,
            'relatedShouts' => $relatedShouts,
            'canCreate' => true,
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
        $data = $request->validated();
        $hasChanges = $document->title !== ($data['title'] ?? null)
            || $document->content !== ($data['content'] ?? null);

        if ($hasChanges) {
            $document->revisions()->create([
                'title' => $document->title,
                'content' => $document->content,
                'edited_by' => $request->user()->id,
            ]);
        }

        $document->update([
            ...$data,
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.show', $document->slug);
    }

    /**
     * Display the revision list for the specified document.
     */
    public function revisions(MarkdownDocument $document): Response
    {
        $revisions = $document->revisions()
            ->with('editedBy')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (MarkdownDocumentRevision $revision) => [
                'id' => $revision->id,
                'title' => $revision->title,
                'content' => $revision->content,
                'created_at' => $revision->created_at->toISOString(),
                'edited_by' => $revision->editedBy ? [
                    'id' => $revision->editedBy->id,
                    'name' => $revision->editedBy->name,
                    'email' => $revision->editedBy->email,
                ] : null,
            ]);

        return Inertia::render('markdown/revisions', [
            'document' => [
                'id' => $document->id,
                'slug' => $document->slug,
                'title' => $document->title,
            ],
            'revisions' => $revisions,
        ]);
    }

    /**
     * Restore a specific revision of the markdown document.
     */
    public function restore(
        MarkdownRevisionRestoreRequest $request,
        MarkdownDocument $document,
        MarkdownDocumentRevision $revision
    ): RedirectResponse {
        $document->revisions()->create([
            'title' => $document->title,
            'content' => $document->content,
            'edited_by' => $request->user()->id,
        ]);

        $document->update([
            'title' => $revision->title,
            'content' => $revision->content,
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.revisions', $document->slug);
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
     * Search for markdown documents by slug or title.
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        $documentsQuery = MarkdownDocument::query()->select('slug', 'title');

        if (! empty($query)) {
            $documentsQuery->where(function ($q) use ($query) {
                $q->where('slug', 'like', "%{$query}%")
                    ->orWhere('title', 'like', "%{$query}%");
            });
        }

        $documents = $documentsQuery->limit(10)->get();

        return response()->json($documents);
    }

    /**
     * Upload an image for markdown content.
     */
    public function uploadImage(MarkdownImageUploadRequest $request): RedirectResponse
    {
        $file = $request->file('image');
        $imageService = new ImageMetadataService;
        $result = $imageService->storeUploadedImage($file, 'markdown-images');
        $path = $result['path'];

        MarkdownImageUpload::create([
            'user_id' => $request->user()->id,
            'path' => $path,
            'metadata' => $result['metadata'],
        ]);

        // 相対URLを生成
        $url = '/storage/'.$path;

        return back()->with('imageUrl', $url);
    }

    /**
     * Translate the given text using OpenAI API.
     */
    public function translate(MarkdownTranslateRequest $request): JsonResponse
    {
        $text = $request->validated()['text'];

        // 言語自動検出
        $sourceLang = $this->detectLanguage($text);
        $targetLang = $sourceLang === 'ja' ? 'en' : 'ja';

        try {
            // OpenAI APIで翻訳
            $translated = $this->translateWithOpenAI($text, $sourceLang, $targetLang);
        } catch (\Throwable $exception) {
            $errorId = (string) Str::uuid();

            Log::error('Markdown translation failed.', [
                'error_id' => $errorId,
                'user_id' => $request->user()?->id,
                'text_length' => mb_strlen($text),
                'source_lang' => $sourceLang,
                'target_lang' => $targetLang,
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => "Translation failed. Error ID: {$errorId}. ".$exception->getMessage(),
            ], 502);
        }

        return response()->json([
            'original' => $text,
            'translated' => $translated,
            'source_lang' => $sourceLang,
            'target_lang' => $targetLang,
        ]);
    }

    /**
     * Detect the language of the given text.
     */
    private function detectLanguage(string $text): string
    {
        // 日本語の文字（ひらがな、カタカナ、漢字）が含まれているか判定
        if (preg_match('/[\x{3040}-\x{309F}\x{30A0}-\x{30FF}\x{4E00}-\x{9FAF}]/u', $text)) {
            return 'ja';
        }

        return 'en';
    }

    /**
     * Translate text using OpenAI API.
     */
    private function translateWithOpenAI(string $text, string $sourceLang, string $targetLang): string
    {
        $sourceLanguage = $sourceLang === 'ja' ? 'Japanese' : 'English';
        $targetLanguage = $targetLang === 'ja' ? 'Japanese' : 'English';

        $result = OpenAI::chat()->create([
            'model' => 'gpt-4o-mini',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => "You are a professional translator. Translate the following text from {$sourceLanguage} to {$targetLanguage}. Output only the translated text, without any additional explanations or comments.",
                ],
                [
                    'role' => 'user',
                    'content' => $text,
                ],
            ],
        ]);

        return $result->choices[0]->message->content;
    }

    /**
     * Convert plain text to structured Markdown.
     */
    public function convertToMarkdown(MarkdownTranslateRequest $request): JsonResponse
    {
        $text = $request->validated()['text'];

        try {
            // OpenAI APIでMarkdown構造に変換
            $markdown = $this->convertToMarkdownWithOpenAI($text);
        } catch (\Throwable $exception) {
            $errorId = (string) Str::uuid();

            Log::error('Markdown conversion failed.', [
                'error_id' => $errorId,
                'user_id' => $request->user()?->id,
                'text_length' => mb_strlen($text),
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => "Conversion failed. Error ID: {$errorId}. ".$exception->getMessage(),
            ], 502);
        }

        return response()->json([
            'original' => $text,
            'markdown' => $markdown,
        ]);
    }

    /**
     * Convert plain text to a Markdown table.
     */
    public function convertToTable(MarkdownTranslateRequest $request): JsonResponse
    {
        $text = $request->validated()['text'];

        try {
            $markdown = $this->convertToTableWithOpenAI($text);
        } catch (\Throwable $exception) {
            $errorId = (string) Str::uuid();

            Log::error('Markdown table conversion failed.', [
                'error_id' => $errorId,
                'user_id' => $request->user()?->id,
                'text_length' => mb_strlen($text),
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => "Table conversion failed. Error ID: {$errorId}. ".$exception->getMessage(),
            ], 502);
        }

        return response()->json([
            'original' => $text,
            'markdown' => $markdown,
        ]);
    }

    /**
     * Convert plain text to Markdown using OpenAI API.
     */
    private function convertToMarkdownWithOpenAI(string $text): string
    {
        $result = OpenAI::chat()->create([
            'model' => 'gpt-4o-mini',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a Markdown formatting expert. Convert the given plain text into well-structured Markdown format.

Rules:
- Detect code blocks and wrap them with appropriate language tags (```javascript, ```php, ```html, etc.)
- Identify headings and format them with # symbols
- Convert lists to proper Markdown lists (- or 1.)
- Preserve code examples exactly as they are
- Detect file paths and format them as inline code (`path/to/file`)
- Keep the original language (do not translate)
- Output ONLY the Markdown formatted text, no explanations

Examples:
Input: "This is a title\n\nSome text here"
Output: "# This is a title\n\nSome text here"

Input: "Example:\nfunction test() { return true; }"
Output: "Example:\n```javascript\nfunction test() { return true; }\n```"',
                ],
                [
                    'role' => 'user',
                    'content' => $text,
                ],
            ],
        ]);

        return $result->choices[0]->message->content;
    }

    /**
     * Convert plain text to a Markdown table using OpenAI API.
     */
    private function convertToTableWithOpenAI(string $text): string
    {
        $result = OpenAI::chat()->create([
            'model' => 'gpt-4o-mini',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a Markdown table expert. Convert the given text into a Markdown table.

Rules:
- If the input already contains a Markdown table, preserve its header and existing rows
- If the input contains table rows but no header/separator, infer a header and treat all rows as data
- If a separator row exists but the first row looks like data (dates, numbers, currency), treat it as data and infer a new header
- Append new rows parsed from any following plain text lines
- Keep column count and order exactly as the existing table
- If a row has fewer columns, leave missing cells empty
- If a row has more columns, merge extras into the last column
- Infer column boundaries and headers from the text when there is no table
- Always include a header row and separator row
- Keep the original language (do not translate)
- Preserve values exactly (currency symbols, units, punctuation)
- Output ONLY the Markdown table, no explanations

Example:
Input:
| 日付 | 項目 | 金額 | 支払い方法 |
| --- | --- | --- | --- |
| 1/1 | コーヒー | 150円 |  |
1/2 カップ麺 250円 現金
1/3 書籍 1200円 クレカ

Output:
| 日付 | 項目 | 金額 | 支払い方法 |
| --- | --- | --- | --- |
| 1/1 | コーヒー | 150円 |  |
| 1/2 | カップ麺 | 250円 | 現金 |
| 1/3 | 書籍 | 1200円 | クレカ |',
                ],
                [
                    'role' => 'user',
                    'content' => $text,
                ],
            ],
        ]);

        return $result->choices[0]->message->content;
    }
}
