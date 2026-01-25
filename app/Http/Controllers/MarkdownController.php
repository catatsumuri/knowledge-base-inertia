<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarkdownBulkDeleteRequest;
use App\Http\Requests\MarkdownBulkStatusRequest;
use App\Http\Requests\MarkdownExportRequest;
use App\Http\Requests\MarkdownImageUploadRequest;
use App\Http\Requests\MarkdownImportRequest;
use App\Http\Requests\MarkdownMoveRequest;
use App\Http\Requests\MarkdownRequest;
use App\Http\Requests\MarkdownRevisionRestoreRequest;
use App\Http\Requests\MarkdownSlugAvailabilityRequest;
use App\Http\Requests\MarkdownTranslateRequest;
use App\Models\MarkdownDocument;
use App\Models\MarkdownDocumentRevision;
use App\Models\MarkdownNavigationItem;
use App\Models\Shout;
use App\Models\ShoutLink;
use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use OpenAI\Laravel\Facades\OpenAI;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class MarkdownController extends Controller
{
    /**
     * Display the index markdown document.
     */
    public function index(): Response|RedirectResponse
    {
        $document = MarkdownDocument::query()->where('slug', 'index')->first();

        if ($document) {
            return redirect()->route('markdown.show', 'index');
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
        $indexExists = MarkdownDocument::query()->where('slug', 'index')->exists();

        $data = $request->validated();

        // indexドキュメントが存在せず、slugが提供されていない場合は自動的にindexドキュメントとして作成
        if (! $indexExists && empty($data['slug'])) {
            $data['slug'] = 'index';
            $data['title'] = 'Top page';
        }

        $document = MarkdownDocument::query()->create([
            ...$data,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        if ($request->hasFile('eyecatch')) {
            $document->addMediaFromRequest('eyecatch')->toMediaCollection('eyecatch');
        }

        // Topics同期
        if (isset($data['topics']) && is_array($data['topics'])) {
            $this->syncTopics($document, $data['topics']);
        }

        return to_route('markdown.show', $document->slug);
    }

    /**
     * Import a markdown document from an uploaded file.
     */
    public function import(MarkdownImportRequest $request): RedirectResponse
    {
        $file = $request->file('markdown');

        if ($file && strtolower((string) $file->getClientOriginalExtension()) === 'zip') {
            return $this->importFromZip($request, $file);
        }

        $contents = $file->get();
        $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents ?? '') ?? '';

        [$frontMatter, $body] = $this->extractFrontMatter($contents);

        $slug = $this->resolveImportSlug($frontMatter, $file->getClientOriginalName());

        if (MarkdownDocument::query()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages([
                'markdown' => __('A document with this slug already exists.'),
            ]);
        }

        $status = $this->resolveImportStatus($frontMatter);
        $title = $this->resolveImportTitle($frontMatter, $slug);

        $document = MarkdownDocument::query()->create([
            'slug' => $slug,
            'title' => $title,
            'content' => $body === '' ? null : $body,
            'status' => $status,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        // Topics処理
        if (isset($frontMatter['topics']) && is_array($frontMatter['topics'])) {
            $this->syncTopics($document, $frontMatter['topics']);
        }

        return to_route('markdown.show', $document->slug);
    }

    private function importFromZip(MarkdownImportRequest $request, UploadedFile $file): RedirectResponse
    {
        $extraction = $this->extractZipFile($file);
        $markdownFiles = $extraction['markdown_files'];

        try {
            if (count($markdownFiles) !== 1) {
                throw ValidationException::withMessages([
                    'markdown' => __('Zip file must contain a single markdown file.'),
                ]);
            }

            $markdownPath = $markdownFiles[0];
            $relativePath = str_replace($extraction['temp_dir'].'/', '', $markdownPath);
            $contents = file_get_contents($markdownPath);

            if ($contents === false) {
                throw ValidationException::withMessages([
                    'markdown' => __('Unable to read markdown file from zip.'),
                ]);
            }

            $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents) ?? '';

            [$frontMatter, $body] = $this->extractFrontMatter($contents);

            $slug = $this->resolveImportSlug($frontMatter, $relativePath);

            if (MarkdownDocument::query()->where('slug', $slug)->exists()) {
                throw ValidationException::withMessages([
                    'markdown' => __('A document with this slug already exists.'),
                ]);
            }

            $status = $this->resolveImportStatus($frontMatter);
            $title = $this->resolveImportTitle($frontMatter, $slug);

            $document = MarkdownDocument::query()->create([
                'slug' => $slug,
                'title' => $title,
                'content' => $body === '' ? null : $body,
                'status' => $status,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            if (isset($frontMatter['topics']) && is_array($frontMatter['topics'])) {
                $this->syncTopics($document, $frontMatter['topics']);
            }

            $fileData = [
                'eyecatch' => $this->normalizeEyecatchPath($frontMatter['eyecatch'] ?? null),
                'content_images' => $this->extractContentImagePaths($body),
            ];

            $this->attachEyecatchFromImport($document, $fileData, $extraction['temp_dir']);

            $updatedContent = $this->attachContentImagesFromImport(
                $document,
                $document->content,
                $fileData['content_images'],
                $extraction['temp_dir']
            );

            if ($updatedContent !== $document->content) {
                $document->update(['content' => $updatedContent]);
            }

            return to_route('markdown.show', $document->slug);
        } finally {
            $this->removeDirectory($extraction['temp_dir']);
        }
    }

    public function slugAvailability(MarkdownSlugAvailabilityRequest $request): JsonResponse
    {
        $data = $request->validated();
        $slug = ltrim((string) $data['slug'], '/');
        $currentSlug = isset($data['current_slug'])
            ? ltrim((string) $data['current_slug'], '/')
            : null;

        if ($currentSlug !== null && $currentSlug === $slug) {
            return response()->json([
                'available' => false,
                'message' => __('Slug is unchanged.'),
            ]);
        }

        if (MarkdownDocument::query()->where('slug', $slug)->exists()) {
            return response()->json([
                'available' => false,
                'message' => __('Slug is already in use.'),
            ]);
        }

        try {
            $this->ensureSlugAvailable($slug);
        } catch (ValidationException $exception) {
            $errors = $exception->errors();
            $message = $errors['slug'][0] ?? __('Slug is not available.');

            return response()->json([
                'available' => false,
                'message' => $message,
            ]);
        }

        return response()->json([
            'available' => true,
            'message' => __('Slug is available.'),
        ]);
    }

    /**
     * Display the specified markdown document or show create form if not exists.
     */
    public function show(Request $request, string $slug): Response
    {
        $hasTrailingSlash = $request->attributes->get('has_trailing_slash', false);
        $slug = trim($slug, '/');
        $document = $this->resolveDocumentBySlug($slug);

        if (! $document) {
            // If any descendant exists, treat as folder view.
            $hasDescendants = MarkdownDocument::query()
                ->where('slug', 'like', $slug.'/%')
                ->exists();

            if ($hasDescendants) {
                return $this->showFolder($slug);
            }

            $formSlug = $slug;

            if ($hasTrailingSlash && $slug !== '' && $slug !== 'index') {
                $formSlug = $slug.'/index';
            }

            return Inertia::render('markdown/edit', [
                'document' => null,
                'isIndexDocument' => $slug === 'index',
                'slug' => $formSlug,
            ]);
        }

        $document->load(['createdBy', 'updatedBy', 'topics']);

        // このページにメンションしているshoutを取得（返信も含む）
        $relatedShouts = ShoutLink::query()
            ->where('slug', $document->slug)
            ->with([
                'shout.user',
                'shout.links',
                'shout.media',
                'shout.replies.user',
                'shout.replies.links',
                'shout.replies.media',
            ])
            ->latest()
            ->limit(20)
            ->get()
            ->pluck('shout')
            ->filter()
            ->map(fn (Shout $shout) => $shout->toInertiaArray())
            ->values();

        return Inertia::render('markdown/show', [
            'document' => [
                ...$document->toArray(),
                'eyecatch_url' => $document->eyecatchUrl(),
            ],
            'relatedShouts' => $relatedShouts,
            'canCreate' => true,
            'isPublic' => false,
        ]);
    }

    /**
     * Export the specified markdown document with metadata.
     */
    public function export(string $slug): StreamedResponse
    {
        $document = $this->resolveDocumentBySlug($slug);

        if (! $document) {
            abort(404);
        }

        $document->load(['createdBy', 'updatedBy', 'topics', 'media']);

        if ($this->shouldExportAsZip($document)) {
            $path = tempnam(sys_get_temp_dir(), 'markdown-export-');
            $zip = new ZipArchive;

            if ($path === false || $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                abort(500, 'Unable to create export archive.');
            }

            $zip->addFromString(
                $document->slug.'.md',
                $this->buildExportContent($document, $zip)
            );

            $this->addEyecatchToZip($zip, $document);
            $zip->close();

            $filename = str_replace('/', '-', $document->slug).'.zip';

            return response()->streamDownload(
                static function () use ($path): void {
                    $stream = fopen($path, 'rb');

                    if ($stream !== false) {
                        fpassthru($stream);
                        fclose($stream);
                    }

                    @unlink($path);
                },
                $filename,
                ['Content-Type' => 'application/zip']
            );
        }

        $content = $this->buildExportContent($document);
        $filename = str_replace('/', '-', $document->slug).'.md';

        return response()->streamDownload(
            static function () use ($content): void {
                echo $content;
            },
            $filename,
            ['Content-Type' => 'text/markdown; charset=UTF-8']
        );
    }

    /**
     * Export multiple markdown documents as a zip file.
     */
    public function exportBulk(MarkdownExportRequest $request): StreamedResponse
    {
        $slugs = $request->validated()['slugs'];

        $documents = MarkdownDocument::query()
            ->whereIn('slug', $slugs)
            ->with(['createdBy', 'updatedBy', 'topics', 'media'])
            ->get()
            ->keyBy('slug');

        $path = tempnam(sys_get_temp_dir(), 'markdown-export-');
        $zip = new ZipArchive;

        if ($path === false || $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Unable to create export archive.');
        }

        foreach ($slugs as $slug) {
            $document = $documents->get($slug);

            if (! $document) {
                continue;
            }

            $zip->addFromString(
                $document->slug.'.md',
                $this->buildExportContent($document, $zip)
            );

            $this->addEyecatchToZip($zip, $document);
        }

        $zip->close();

        $filename = 'markdown-export-'.now()->format('Ymd-His').'.zip';

        return response()->streamDownload(
            static function () use ($path): void {
                $stream = fopen($path, 'rb');

                if ($stream !== false) {
                    fpassthru($stream);
                    fclose($stream);
                }

                @unlink($path);
            },
            $filename,
            ['Content-Type' => 'application/zip']
        );
    }

    /**
     * Delete multiple markdown documents.
     */
    public function destroyBulk(MarkdownBulkDeleteRequest $request): RedirectResponse
    {
        $slugs = $request->validated()['slugs'];

        MarkdownDocument::query()
            ->whereIn('slug', $slugs)
            ->delete();

        return to_route('sitemap');
    }

    /**
     * Update the status for multiple markdown documents.
     */
    public function updateStatusBulk(MarkdownBulkStatusRequest $request): RedirectResponse
    {
        $data = $request->validated();

        MarkdownDocument::query()
            ->whereIn('slug', $data['slugs'])
            ->update([
                'status' => $data['status'],
                'updated_by' => $request->user()->id,
            ]);

        return to_route('sitemap');
    }

    /**
     * Show the form for editing the specified markdown document.
     */
    public function edit(string $slug): Response
    {
        $document = MarkdownDocument::query()
            ->where('slug', $slug)
            ->with('topics')
            ->firstOrFail();

        return Inertia::render('markdown/edit', [
            'document' => [
                ...$document->toArray(),
                'eyecatch_url' => $document->eyecatchUrl(),
            ],
        ]);
    }

    /**
     * Update the specified markdown document in storage.
     */
    public function update(MarkdownRequest $request, string $slug): RedirectResponse
    {
        $document = MarkdownDocument::query()->where('slug', $slug)->firstOrFail();
        $data = $request->validated();
        $returnHeading = $request->string('return_heading')->trim()->toString();
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

        if ($request->hasFile('eyecatch')) {
            $document->clearMediaCollection('eyecatch');
            $document->addMediaFromRequest('eyecatch')->toMediaCollection('eyecatch');
        }

        // Topics同期
        if (isset($data['topics'])) {
            $topicNames = is_array($data['topics']) ? $data['topics'] : [];
            $this->syncTopics($document, $topicNames);
        }

        if ($returnHeading !== '') {
            return redirect()->to(
                route('markdown.show', $document->slug).'#'.rawurlencode($returnHeading),
            );
        }

        return to_route('markdown.show', $document->slug);
    }

    public function move(MarkdownMoveRequest $request, string $slug): RedirectResponse
    {
        if ($request->isMethod('get')) {
            return to_route('markdown.edit', $slug);
        }

        $document = MarkdownDocument::query()->where('slug', $slug)->firstOrFail();
        $newSlug = ltrim((string) $request->validated()['slug'], '/');

        $hasChildren = MarkdownDocument::query()
            ->where('slug', 'like', $document->slug.'/%')
            ->exists();

        if ($hasChildren) {
            return back()->withErrors([
                'slug' => __('Cannot move because child pages exist.'),
            ]);
        }

        if ($newSlug === $document->slug) {
            return back()->withErrors([
                'slug' => __('Slug is unchanged.'),
            ]);
        }

        try {
            $this->ensureSlugAvailable($newSlug);
        } catch (ValidationException $exception) {
            return back()->withErrors($exception->errors());
        }

        $document->update([
            'slug' => $newSlug,
            'updated_by' => $request->user()->id,
        ]);

        return to_route('markdown.edit', $newSlug);
    }

    /**
     * Display the revision list for the specified document.
     */
    public function revisions(MarkdownDocument $document): Response
    {
        $document->load('updatedBy');

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
                'is_current' => false,
            ]);

        $currentRevision = [
            'id' => 0,
            'title' => $document->title,
            'content' => $document->content,
            'created_at' => $document->updated_at?->toISOString(),
            'edited_by' => $document->updatedBy ? [
                'id' => $document->updatedBy->id,
                'name' => $document->updatedBy->name,
                'email' => $document->updatedBy->email,
            ] : null,
            'is_current' => true,
        ];

        return Inertia::render('markdown/revisions', [
            'document' => [
                'id' => $document->id,
                'slug' => $document->slug,
                'title' => $document->title,
            ],
            'revisions' => $revisions->prepend($currentRevision)->values(),
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
        $data = $request->validated();
        $document = null;

        if (isset($data['document_id'])) {
            $document = MarkdownDocument::query()->find($data['document_id']);
        }

        if (! $document && isset($data['slug'])) {
            $slug = ltrim((string) $data['slug'], '/');
            if ($slug !== '') {
                $document = MarkdownDocument::query()->where('slug', $slug)->first();

                if (! $document) {
                    $this->ensureSlugAvailable($slug);
                    $document = MarkdownDocument::query()->create([
                        'slug' => $slug,
                        'title' => $this->titleFromSlug($slug),
                        'content' => null,
                        'status' => 'draft',
                        'created_by' => $request->user()->id,
                        'updated_by' => $request->user()->id,
                    ]);
                }
            }
        }

        if (! $document) {
            abort(404);
        }

        $media = $document->addMediaFromRequest('image')
            ->toMediaCollection('content-images');
        $url = route('markdown.content-media.show', $media);

        return to_route('markdown.edit', $document->slug)->with('imageUrl', $url);
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

    /**
     * Resolve a markdown document by slug, falling back to slug/index.
     */
    private function resolveDocumentBySlug(string $slug): ?MarkdownDocument
    {
        $normalizedSlug = trim($slug, '/');

        $document = MarkdownDocument::query()->where('slug', $normalizedSlug)->first();

        if (! $document) {
            $document = MarkdownDocument::query()
                ->where('slug', $normalizedSlug.'/index')
                ->first();
        }

        return $document;
    }

    /**
     * Build markdown export content with front matter metadata.
     */
    private function buildExportContent(
        MarkdownDocument $document,
        ?ZipArchive $zip = null
    ): string {
        $lines = [
            'title: '.$this->yamlString($document->title ?? ''),
            'slug: '.$this->yamlString($document->slug),
            'status: '.$this->yamlString($document->status ?? 'draft'),
            'created_at: '.$this->yamlString($document->created_at?->toISOString() ?? ''),
            'updated_at: '.$this->yamlString($document->updated_at?->toISOString() ?? ''),
            'created_by_id: '.(string) ($document->created_by ?? ''),
            'updated_by_id: '.(string) ($document->updated_by ?? ''),
        ];

        if ($document->createdBy) {
            $lines[] = 'created_by:';
            $lines[] = '  id: '.$document->createdBy->id;
            $lines[] = '  name: '.$this->yamlString($document->createdBy->name);
            $lines[] = '  email: '.$this->yamlString($document->createdBy->email);
        }

        if ($document->updatedBy) {
            $lines[] = 'updated_by:';
            $lines[] = '  id: '.$document->updatedBy->id;
            $lines[] = '  name: '.$this->yamlString($document->updatedBy->name);
            $lines[] = '  email: '.$this->yamlString($document->updatedBy->email);
        }

        $eyecatchPath = $this->eyecatchExportPath($document);
        if ($eyecatchPath) {
            $lines[] = 'eyecatch: '.$this->yamlString($eyecatchPath);
        }

        if ($document->relationLoaded('topics') && $document->topics->isNotEmpty()) {
            $topicNames = $document->topics->pluck('name')->toArray();
            $lines[] = 'topics: '.(string) json_encode($topicNames, JSON_UNESCAPED_UNICODE);
        }

        $frontMatter = "---\n".implode("\n", $lines)."\n---\n\n";
        $body = $document->content ?? '';

        if ($zip !== null) {
            $body = $this->replaceContentImagesForExport($document, $body, $zip);
        }

        return $frontMatter.$body."\n";
    }

    private function shouldExportAsZip(MarkdownDocument $document): bool
    {
        if ($document->getFirstMedia('eyecatch')) {
            return true;
        }

        $content = $document->content ?? '';

        if ($content === '') {
            return false;
        }

        if (! preg_match_all('/!\\[[^\\]]*\\]\\(([^)]+)\\)/', $content, $matches)) {
            return false;
        }

        $contentMediaIds = $document->media
            ->where('collection_name', 'content-images')
            ->pluck('uuid')
            ->all();

        if ($contentMediaIds === []) {
            return false;
        }

        foreach ($matches[1] as $url) {
            $path = parse_url($url, PHP_URL_PATH) ?? $url;

            if (! preg_match('#/markdown/content-media/([0-9a-fA-F-]{36})#', $path, $idMatch)) {
                continue;
            }

            $mediaId = $idMatch[1];

            if (in_array($mediaId, $contentMediaIds, true)) {
                return true;
            }
        }

        return false;
    }

    private function replaceContentImagesForExport(
        MarkdownDocument $document,
        string $content,
        ZipArchive $zip
    ): string {
        if ($content === '') {
            return $content;
        }

        $contentMedia = $document->media
            ->where('collection_name', 'content-images')
            ->keyBy('uuid');

        return preg_replace_callback(
            '/!\\[[^\\]]*\\]\\(([^)]+)\\)/',
            function (array $matches) use ($document, $contentMedia, $zip): string {
                $url = $matches[1];

                // サイズ指定（=widthxheight）を分離
                $sizeSpec = '';
                if (preg_match('/\s+(=[0-9]*x[0-9]*)$/', $url, $sizeMatch)) {
                    $sizeSpec = $sizeMatch[1];
                    $url = preg_replace('/\s+=[0-9]*x[0-9]*$/', '', $url);
                }

                $path = parse_url($url, PHP_URL_PATH) ?? $url;

                if (! preg_match('#/markdown/content-media/([0-9a-fA-F-]{36})#', $path, $idMatch)) {
                    return $matches[0];
                }

                $mediaId = $idMatch[1];
                $media = $contentMedia->get($mediaId);

                if (! $media) {
                    return $matches[0];
                }

                $exportPath = $this->contentImageExportPath($document, $media);

                if ($exportPath === null) {
                    return $matches[0];
                }

                $pathOnDisk = $media->getPath();

                if ($pathOnDisk === '' || ! is_file($pathOnDisk)) {
                    return $matches[0];
                }

                $zip->addFile($pathOnDisk, $exportPath);

                // サイズ指定を保持して置換
                $newUrl = $exportPath.($sizeSpec !== '' ? ' '.$sizeSpec : '');

                return str_replace($matches[1], $newUrl, $matches[0]);
            },
            $content
        ) ?? $content;
    }

    private function contentImageExportPath(
        MarkdownDocument $document,
        Media $media
    ): ?string {
        $extension = pathinfo($media->file_name, PATHINFO_EXTENSION);
        $suffix = $extension !== '' ? '.'.$extension : '';

        $identifier = $media->uuid ?: (string) Str::uuid();

        return 'assets/'.$document->slug.'/content/'.$identifier.$suffix;
    }

    /**
     * Extract front matter (if present) and return parsed data and body.
     *
     * @return array{0: array<string, mixed>, 1: string}
     */
    private function extractFrontMatter(string $contents): array
    {
        if (! preg_match('/\A---\R(.*?)\R---\R?/s', $contents, $matches)) {
            return [[], $contents];
        }

        $frontMatter = $this->parseFrontMatterLines($matches[1]);
        $body = substr($contents, strlen($matches[0]));
        $body = ltrim($body, "\r\n");

        return [$frontMatter, $body];
    }

    /**
     * @return array{temp_dir: string, markdown_files: array<string>}
     */
    private function extractZipFile(UploadedFile $file): array
    {
        $tempDir = sys_get_temp_dir().'/markdown-import-'.Str::random(16);
        mkdir($tempDir, 0755, true);

        $zip = new ZipArchive;
        $zipPath = $file->getRealPath();

        if ($zip->open($zipPath) !== true) {
            $this->removeDirectory($tempDir);

            throw ValidationException::withMessages([
                'markdown' => __('Unable to open zip file.'),
            ]);
        }

        $uncompressedSize = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            if ($stat) {
                $uncompressedSize += $stat['size'];
            }
        }

        if ($uncompressedSize > 100 * 1024 * 1024) {
            $zip->close();
            $this->removeDirectory($tempDir);

            throw ValidationException::withMessages([
                'markdown' => __('Zip file is too large when uncompressed (max 100MB).'),
            ]);
        }

        if ($zip->numFiles > 500) {
            $zip->close();
            $this->removeDirectory($tempDir);

            throw ValidationException::withMessages([
                'markdown' => __('Zip file contains too many files (max 500).'),
            ]);
        }

        $zip->extractTo($tempDir);
        $zip->close();

        $markdownFiles = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($tempDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $fileInfo) {
            if (
                $fileInfo->isFile() &&
                in_array(strtolower($fileInfo->getExtension()), ['md', 'markdown', 'txt'], true)
            ) {
                $markdownFiles[] = $fileInfo->getRealPath();
            }
        }

        if ($markdownFiles === []) {
            $this->removeDirectory($tempDir);

            throw ValidationException::withMessages([
                'markdown' => __('No markdown files found in zip archive.'),
            ]);
        }

        return [
            'temp_dir' => $tempDir,
            'markdown_files' => $markdownFiles,
        ];
    }

    private function normalizeEyecatchPath(mixed $eyecatch): ?string
    {
        if (! is_string($eyecatch)) {
            return null;
        }

        $eyecatch = trim($eyecatch);

        return $eyecatch === '' ? null : ltrim($eyecatch, '/');
    }

    /**
     * @return array<int, string>
     */
    private function extractContentImagePaths(string $content): array
    {
        if ($content === '') {
            return [];
        }

        preg_match_all('/!\\[[^\\]]*\\]\\(([^)]+)\\)/', $content, $matches);

        $paths = [];

        foreach ($matches[1] ?? [] as $url) {
            if (! is_string($url) || $url === '') {
                continue;
            }

            $path = parse_url($url, PHP_URL_PATH) ?? $url;
            $path = ltrim($path, '/');

            if (str_starts_with($path, 'assets/')) {
                $paths[] = $path;
            }
        }

        return array_values(array_unique($paths));
    }

    /**
     * @param  array<string, mixed>  $fileData
     */
    private function attachEyecatchFromImport(
        MarkdownDocument $document,
        array $fileData,
        ?string $tempDir
    ): void {
        if (! $tempDir || empty($fileData['eyecatch'])) {
            return;
        }

        $relativePath = $fileData['eyecatch'];

        if (! is_string($relativePath)) {
            return;
        }

        $path = $tempDir.'/'.ltrim($relativePath, '/');

        if (! is_file($path)) {
            return;
        }

        $document->clearMediaCollection('eyecatch');
        $document->addMedia($path)->toMediaCollection('eyecatch');
    }

    /**
     * @param  array<int, string>  $contentImages
     */
    private function attachContentImagesFromImport(
        MarkdownDocument $document,
        ?string $content,
        array $contentImages,
        ?string $tempDir
    ): ?string {
        if (! $tempDir || $content === null || $content === '' || $contentImages === []) {
            return $content;
        }

        $document->clearMediaCollection('content-images');

        $replacements = [];

        foreach ($contentImages as $relativePath) {
            if (! is_string($relativePath) || $relativePath === '') {
                continue;
            }

            $path = $tempDir.'/'.ltrim($relativePath, '/');

            if (! is_file($path)) {
                continue;
            }

            $media = $document->addMedia($path)->toMediaCollection('content-images');
            $replacements[$relativePath] = route('markdown.content-media.show', $media);
        }

        return $this->replaceContentImagePaths($content, $replacements);
    }

    /**
     * @param  array<string, string>  $replacements
     */
    private function replaceContentImagePaths(string $content, array $replacements): string
    {
        if ($content === '' || $replacements === []) {
            return $content;
        }

        return preg_replace_callback(
            '/!\\[[^\\]]*\\]\\(([^)]+)\\)/',
            function (array $matches) use ($replacements): string {
                $url = $matches[1];
                $path = parse_url($url, PHP_URL_PATH) ?? $url;
                $path = ltrim($path, '/');

                if (! isset($replacements[$path])) {
                    return $matches[0];
                }

                return str_replace($url, $replacements[$path], $matches[0]);
            },
            $content
        ) ?? $content;
    }

    /**
     * Parse front matter lines into key/value pairs.
     *
     * @return array<string, mixed>
     */
    private function parseFrontMatterLines(string $frontMatter): array
    {
        $data = [];

        foreach (preg_split('/\R/', $frontMatter) as $line) {
            $line = trim((string) $line);

            if ($line === '' || ! str_contains($line, ':')) {
                continue;
            }

            [$key, $value] = explode(':', $line, 2);
            $key = trim($key);
            $value = trim($value);

            if ($key === '') {
                continue;
            }

            if ($value === '') {
                $data[$key] = '';

                continue;
            }

            $decoded = json_decode($value, true);

            $data[$key] = json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }

        return $data;
    }

    /**
     * Resolve slug for imported markdown.
     */
    private function resolveImportSlug(array $frontMatter, string $originalName): string
    {
        $slug = $frontMatter['slug'] ?? pathinfo($originalName, PATHINFO_FILENAME);
        $slug = is_string($slug) ? trim($slug) : '';
        $slug = ltrim($slug, '/');

        if ($slug === '') {
            throw ValidationException::withMessages([
                'markdown' => __('Slug is required in front matter or filename.'),
            ]);
        }

        return $slug;
    }

    /**
     * Resolve status for imported markdown.
     */
    private function resolveImportStatus(array $frontMatter): string
    {
        $status = $frontMatter['status'] ?? 'draft';

        if (! is_string($status)) {
            return 'draft';
        }

        return in_array($status, ['draft', 'private', 'published'], true)
            ? $status
            : 'draft';
    }

    /**
     * Resolve title for imported markdown.
     */
    private function resolveImportTitle(array $frontMatter, string $slug): string
    {
        $title = $frontMatter['title'] ?? $slug;

        return is_string($title) && $title !== '' ? $title : $slug;
    }

    private function titleFromSlug(string $slug): string
    {
        $trimmedSlug = trim($slug, '/');
        $parts = $trimmedSlug === '' ? [] : explode('/', $trimmedSlug);
        $last = $parts !== [] ? (string) array_pop($parts) : $trimmedSlug;
        $normalized = str_replace(['-', '_'], ' ', $last);

        return trim(Str::title($normalized));
    }

    private function ensureSlugAvailable(string $slug): void
    {
        $hasChildren = MarkdownDocument::query()
            ->where('slug', 'like', $slug.'/%')
            ->exists();

        if ($hasChildren) {
            throw ValidationException::withMessages([
                'slug' => __('The slug is unavailable because child pages already exist.'),
            ]);
        }

        $parts = explode('/', $slug);
        array_pop($parts);

        if ($parts === []) {
            return;
        }

        $parentSlug = implode('/', $parts);
        $parentExists = MarkdownDocument::query()
            ->where('slug', $parentSlug)
            ->exists();

        if ($parentExists) {
            throw ValidationException::withMessages([
                'slug' => __('The slug is unavailable because a parent page already exists.'),
            ]);
        }
    }

    public function media(
        Request $request,
        Media $media,
        ?string $conversion = null
    ): BinaryFileResponse {
        if (! in_array($media->collection_name, ['eyecatch', 'eyecatch_light', 'eyecatch_dark'], true)) {
            abort(404);
        }

        $document = null;
        $navigationItem = null;

        if ($media->model_type === MarkdownDocument::class) {
            $document = $media->model;

            if (! $document instanceof MarkdownDocument) {
                abort(404);
            }
        } elseif ($media->model_type === MarkdownNavigationItem::class) {
            $navigationItem = $media->model;

            if (! $navigationItem instanceof MarkdownNavigationItem) {
                abort(404);
            }
        } else {
            abort(404);
        }

        $user = $request->user();

        if (! $user) {
            if (! config('app.public_views')) {
                abort(403);
            }

            if ($document && $document->status !== 'published') {
                abort(403);
            }
        }

        if ($conversion !== null && $conversion !== 'thumb') {
            abort(404);
        }

        $path = $media->getPath($conversion ?? '');

        if ($conversion !== null && ! is_file($path)) {
            $path = $media->getPath();
        }

        if ($path === '') {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => $media->mime_type ?? 'application/octet-stream',
        ]);
    }

    public function contentMedia(Request $request, Media $media): BinaryFileResponse
    {
        if ($media->model_type !== MarkdownDocument::class) {
            abort(404);
        }

        $document = $media->model;

        if (! $document instanceof MarkdownDocument) {
            abort(404);
        }

        if ($media->collection_name !== 'content-images') {
            abort(404);
        }

        if (! $request->user()) {
            abort(403);
        }

        $path = $media->getPath();

        if ($path === '') {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => $media->mime_type ?? 'application/octet-stream',
        ]);
    }

    /**
     * Search for topics by name.
     */
    public function searchTopics(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        $topicsQuery = Topic::query()
            ->select('id', 'name', 'slug')
            ->orderBy('name');

        if ($query !== '') {
            $topicsQuery->where('name', 'like', "%{$query}%");
        }

        $topics = $topicsQuery->limit(10)->get();

        return response()->json($topics);
    }

    /**
     * Sync topics for a markdown document.
     *
     * @param  array<int, string>  $topicNames
     */
    private function syncTopics(MarkdownDocument $document, array $topicNames): void
    {
        $topicIds = [];

        foreach ($topicNames as $name) {
            $name = trim($name);

            if ($name === '') {
                continue;
            }

            $topic = Topic::findOrCreateByName($name);
            $topicIds[] = $topic->id;
        }

        $document->topics()->sync($topicIds);
    }

    private function eyecatchExportPath(MarkdownDocument $document): ?string
    {
        $media = $document->getFirstMedia('eyecatch');

        if (! $media) {
            return null;
        }

        $extension = pathinfo($media->file_name, PATHINFO_EXTENSION);
        $suffix = $extension !== '' ? '.'.$extension : '';

        return 'assets/'.$document->slug.'/eyecatch'.$suffix;
    }

    private function addEyecatchToZip(ZipArchive $zip, MarkdownDocument $document): void
    {
        $media = $document->getFirstMedia('eyecatch');

        if (! $media) {
            return;
        }

        $path = $media->getPath();

        if ($path === '') {
            return;
        }

        $exportPath = $this->eyecatchExportPath($document);

        if (! $exportPath) {
            return;
        }

        $zip->addFile($path, $exportPath);
    }

    /**
     * Remove a directory and all its contents recursively.
     */
    private function removeDirectory(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                rmdir($file->getRealPath());
            } else {
                unlink($file->getRealPath());
            }
        }

        rmdir($dir);
    }

    /**
     * Encode a YAML-safe string value.
     */
    private function yamlString(string $value): string
    {
        return (string) json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Display folder management view for slugs with direct children.
     */
    private function showFolder(string $slug): Response
    {
        // Get only direct children (not grandchildren)
        $children = MarkdownDocument::query()
            ->select(['slug', 'title', 'status'])
            ->where('slug', 'like', $slug.'/%')
            ->where('slug', 'not like', $slug.'/%/%')
            ->orderBy('slug')
            ->get()
            ->map(fn ($doc) => [
                'slug' => $doc->slug,
                'title' => $doc->title,
                'status' => $doc->status,
                'path' => $doc->slug,
                'type' => 'document',
            ])
            ->toArray();

        // Check if index document exists
        $indexDocument = MarkdownDocument::query()
            ->where('slug', $slug.'/index')
            ->first();

        // Get folder label
        $navigationItem = MarkdownNavigationItem::query()
            ->where('node_type', 'folder')
            ->where('node_path', $slug)
            ->first();

        return Inertia::render('markdown/folder', [
            'slug' => $slug,
            'label' => $navigationItem?->label,
            'eyecatchLightUrl' => $navigationItem?->eyecatchLightUrl(),
            'eyecatchDarkUrl' => $navigationItem?->eyecatchDarkUrl(),
            'children' => $children,
            'hasIndex' => $indexDocument !== null,
            'canCreate' => true,
        ]);
    }

    /**
     * Update folder eyecatch.
     */
    public function updateFolderEyecatch(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'eyecatch' => ['nullable', 'file', 'mimes:jpg,jpeg,png,svg', 'max:5120'],
            'remove' => ['nullable', 'boolean'],
            'variant' => ['required', 'string', 'in:light,dark'],
        ]);

        $slug = trim($slug, '/');
        if ($slug === '') {
            abort(404);
        }

        // Calculate parent path
        $parts = explode('/', $slug);
        array_pop($parts);
        $parentPath = count($parts) > 0 ? implode('/', $parts) : null;

        $navigationItem = MarkdownNavigationItem::query()->updateOrCreate(
            [
                'node_type' => 'folder',
                'node_path' => $slug,
            ],
            [
                'parent_path' => $parentPath,
                'position' => 0,
            ]
        );

        $collection = $data['variant'] === 'dark' ? 'eyecatch_dark' : 'eyecatch_light';

        if (! empty($data['remove'])) {
            $navigationItem->clearMediaCollection($collection);

            return response()->json([
                'success' => true,
                'eyecatch_url' => null,
            ]);
        }

        if (! $request->hasFile('eyecatch')) {
            return response()->json([
                'success' => false,
                'message' => __('Eyecatch file is required.'),
            ], 422);
        }

        $navigationItem->clearMediaCollection($collection);
        $navigationItem->addMediaFromRequest('eyecatch')->toMediaCollection($collection);

        return response()->json([
            'success' => true,
            'eyecatch_url' => $navigationItem->eyecatchUrl($collection),
        ]);
    }
    /**
     * Update folder label.
     */
    public function updateFolderLabel(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
        ]);

        // Calculate parent path
        $parts = explode('/', $slug);
        array_pop($parts);
        $parentPath = count($parts) > 0 ? implode('/', $parts) : null;

        MarkdownNavigationItem::query()->updateOrCreate(
            [
                'node_type' => 'folder',
                'node_path' => $slug,
            ],
            [
                'label' => $data['label'] ?: null,
                'parent_path' => $parentPath,
                'position' => 0,
            ]
        );

        return response()->json(['success' => true]);
    }
}
