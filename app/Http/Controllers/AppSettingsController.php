<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarkdownZipImportRequest;
use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class AppSettingsController extends Controller
{
    /**
     * Display the application settings screen.
     */
    public function index(): Response
    {
        $homeDocument = MarkdownDocument::getHomePage();
        $openAiConfigured = filled(config('openai.api_key'));

        return Inertia::render('app-settings', [
            'publicViews' => config('app.public_views'),
            'openAiConfigured' => $openAiConfigured,
            'homeDocument' => $homeDocument ? [
                'id' => $homeDocument->id,
                'slug' => $homeDocument->slug,
                'title' => $homeDocument->title,
                'updated_at' => $homeDocument->updated_at?->toISOString(),
            ] : null,
        ]);
    }

    /**
     * Export all markdown documents as a zip archive.
     */
    public function exportMarkdown(): StreamedResponse
    {
        $documents = MarkdownDocument::query()
            ->with(['createdBy', 'updatedBy', 'topics', 'media'])
            ->orderBy('slug')
            ->get();

        $navigationItems = MarkdownNavigationItem::query()
            ->orderBy('parent_path')
            ->orderBy('position')
            ->get();

        $path = tempnam(sys_get_temp_dir(), 'markdown-export-all-');
        $zip = new ZipArchive;

        if ($path === false || $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Unable to create export archive.');
        }

        foreach ($documents as $document) {
            $zip->addFromString(
                $document->slug.'.md',
                $this->buildExportContent($document, $zip)
            );
            $this->addEyecatchToZip($zip, $document);
        }

        $zip->addFromString(
            'navigation.json',
            json_encode(
                [
                    'version' => 1,
                    'items' => $navigationItems->map(static fn (MarkdownNavigationItem $item) => [
                        'node_type' => $item->node_type,
                        'node_path' => $item->node_path,
                        'parent_path' => $item->parent_path,
                        'position' => $item->position,
                        'label' => $item->label,
                    ])->values()->all(),
                ],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            )."\n"
        );

        $zip->close();

        $filename = 'markdown-export-all-'.now()->format('Ymd-His').'.zip';

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

                return str_replace($url, $exportPath, $matches[0]);
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
     * Encode a YAML-safe string value.
     */
    private function yamlString(string $value): string
    {
        return (string) json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Load home page templates from local markdown files.
     *
     * @return array<int, array{key: string, title: string, content: string}>
     */
    private function loadHomePageTemplates(): array
    {
        $templatesPath = base_path('templates');

        if (! File::isDirectory($templatesPath)) {
            return [];
        }

        $templates = [];

        foreach (File::files($templatesPath) as $file) {
            if ($file->getExtension() !== 'md') {
                continue;
            }

            $key = $file->getBasename('.md');
            $contents = File::get($file->getPathname());

            $templates[] = $this->parseHomePageTemplate($key, $contents);
        }

        usort(
            $templates,
            fn (array $first, array $second): int => strcmp($first['key'], $second['key'])
        );

        return $templates;
    }

    /**
     * Parse a home page template for title and content.
     *
     * @return array{key: string, title: string, content: string}
     */
    private function parseHomePageTemplate(string $key, string $contents): array
    {
        $title = null;
        $body = $contents;

        if (preg_match('/^---\\s*\\R(.*?)\\R---\\s*\\R/s', $contents, $matches) === 1) {
            $frontMatter = $matches[1];
            $body = substr($contents, strlen($matches[0]));

            foreach (preg_split('/\\R/', $frontMatter) as $line) {
                if (! str_contains($line, ':')) {
                    continue;
                }

                [$field, $value] = explode(':', $line, 2);

                if (trim($field) === 'title') {
                    $title = trim($value);
                    break;
                }
            }
        }

        if ($title === null || $title === '') {
            $title = Str::title(str_replace(['-', '_'], ' ', $key));
        }

        $title = trim($title, " \t\n\r\0\x0B\"'");

        return [
            'key' => $key,
            'title' => $title,
            'content' => ltrim($body),
        ];
    }

    /**
     * Preview zip import by parsing and validating all markdown files.
     */
    public function previewZipImport(MarkdownZipImportRequest $request): Response
    {
        set_time_limit(300); // 5 minutes

        $file = $request->file('zip_file');

        if (! $file) {
            abort(422, 'No zip file provided.');
        }

        $extraction = $this->extractZipFile($file);
        $files = [];

        foreach ($extraction['markdown_files'] as $filePath) {
            $relativePath = str_replace($extraction['temp_dir'].'/', '', $filePath);
            $fileData = $this->parseMarkdownFile(
                $filePath,
                $relativePath,
                $extraction['temp_dir']
            );
            $files[] = $fileData;
        }

        // Check for duplicates
        $files = $this->checkDuplicates($files);

        // Calculate statistics
        $stats = [
            'total' => count($files),
            'new' => count(array_filter($files, fn ($f) => ! $f['is_duplicate'] && empty($f['validation_errors']))),
            'duplicates' => count(array_filter($files, fn ($f) => $f['is_duplicate'])),
            'errors' => count(array_filter($files, fn ($f) => ! empty($f['validation_errors']))),
        ];

        // Generate session key
        $sessionKey = 'zip_import_'.Str::random(16);

        $navigationItems = $this->parseNavigationFile($extraction['temp_dir']);
        $navigationPresent = $navigationItems !== null;

        // Store in session
        session([
            'markdown_zip_import_preview' => [
                'session_key' => $sessionKey,
                'uploaded_at' => now()->toISOString(),
                'temp_dir' => $extraction['temp_dir'],
                'files' => $files,
                'navigation_present' => $navigationPresent,
                'navigation_items' => $navigationItems ?? [],
            ],
        ]);

        return Inertia::render('app-settings/markdown-import-preview', [
            'session_key' => $sessionKey,
            'files' => $files,
            'stats' => $stats,
        ]);
    }

    /**
     * Execute the zip import based on user selections.
     */
    public function executeZipImport(Request $request): RedirectResponse
    {
        $sessionKey = $request->input('session_key');
        $conflictResolutions = $request->input('conflict_resolutions', []);

        // Validate manually to avoid redirect issues
        if (empty($sessionKey)) {
            $message = __('Invalid import session.');
            \Log::error('ZIP IMPORT FAILED: '.$message);

            return redirect()->route('app-settings')
                ->with('error', $message);
        }

        $previewData = session('markdown_zip_import_preview');

        if (! $previewData || $previewData['session_key'] !== $sessionKey) {
            $message = __('Import session expired. Please try again.');
            \Log::error('ZIP IMPORT FAILED: '.$message);

            return redirect()->route('app-settings')
                ->with('error', $message);
        }

        $files = $previewData['files'];
        $tempDir = $previewData['temp_dir'] ?? null;
        $navigationItems = $previewData['navigation_items'] ?? [];
        $navigationPresent = (bool) ($previewData['navigation_present'] ?? false);
        $imported = 0;
        $skipped = 0;

        DB::transaction(function () use (
            $files,
            $conflictResolutions,
            $request,
            $tempDir,
            $navigationItems,
            $navigationPresent,
            &$imported,
            &$skipped
        ) {
            foreach ($files as $fileData) {
                // Skip files with validation errors
                if (! empty($fileData['validation_errors'])) {
                    $skipped++;

                    continue;
                }

                $slug = $fileData['slug'];
                $resolution = $conflictResolutions[$slug] ?? 'skip';

                // Handle duplicates based on resolution
                if ($fileData['is_duplicate']) {
                    if ($resolution === 'skip') {
                        $skipped++;

                        continue;
                    }
                    // overwrite: update existing document
                    $document = MarkdownDocument::query()->where('slug', $slug)->first();
                    if ($document) {
                        $document->update([
                            'title' => $fileData['title'],
                            'content' => $fileData['content'],
                            'status' => $fileData['status'],
                            'updated_by' => $request->user()->id,
                        ]);
                        $this->syncTopics($document, $fileData['topics'] ?? []);
                        $this->attachEyecatchFromImport($document, $fileData, $tempDir);
                        $updatedContent = $this->attachContentImagesFromImport(
                            $document,
                            $fileData['content'] ?? null,
                            $fileData['content_images'] ?? [],
                            $tempDir
                        );
                        if ($updatedContent !== $document->content) {
                            $document->update(['content' => $updatedContent]);
                        }
                        $imported++;
                    }
                } else {
                    // Create new document
                    $document = MarkdownDocument::query()->create([
                        'slug' => $slug,
                        'title' => $fileData['title'],
                        'content' => $fileData['content'],
                        'status' => $fileData['status'],
                        'created_by' => $request->user()->id,
                        'updated_by' => $request->user()->id,
                    ]);
                    $this->syncTopics($document, $fileData['topics'] ?? []);
                    $this->attachEyecatchFromImport($document, $fileData, $tempDir);
                    $updatedContent = $this->attachContentImagesFromImport(
                        $document,
                        $fileData['content'] ?? null,
                        $fileData['content_images'] ?? [],
                        $tempDir
                    );
                    if ($updatedContent !== $document->content) {
                        $document->update(['content' => $updatedContent]);
                    }
                    $imported++;
                }
            }

            if ($navigationPresent) {
                $this->syncNavigationItems($navigationItems);
            }
        });

        if (is_string($tempDir) && $tempDir !== '') {
            $this->removeDirectory($tempDir);
        }

        // Clear session
        session()->forget('markdown_zip_import_preview');

        $message = __('Imported :count documents', ['count' => $imported]);
        \Log::info('ZIP IMPORT SUCCESS: '.$message, [
            'imported' => $imported,
            'skipped' => $skipped,
            'total' => count($files),
        ]);

        return redirect()->route('app-settings')
            ->with('success', $message);
    }

    /**
     * Cancel the zip import and clear session data.
     */
    public function cancelZipImport(Request $request): RedirectResponse
    {
        $previewData = session('markdown_zip_import_preview');
        $tempDir = is_array($previewData) ? ($previewData['temp_dir'] ?? null) : null;

        if (is_string($tempDir) && $tempDir !== '') {
            $this->removeDirectory($tempDir);
        }

        session()->forget('markdown_zip_import_preview');

        $message = __('Import cancelled');
        \Log::info('ZIP IMPORT CANCELLED: '.$message);

        return redirect()->route('app-settings')
            ->with('info', $message);
    }

    /**
     * Extract zip file and return temp directory and markdown files.
     *
     * @return array{temp_dir: string, markdown_files: array<string>}
     */
    private function extractZipFile($file): array
    {
        $tempDir = sys_get_temp_dir().'/markdown-import-'.Str::random(16);
        mkdir($tempDir, 0755, true);

        $zip = new ZipArchive;
        $zipPath = $file->getRealPath();

        if ($zip->open($zipPath) !== true) {
            throw ValidationException::withMessages([
                'zip_file' => __('Unable to open zip file.'),
            ]);
        }

        // Check for zip bomb
        $uncompressedSize = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            if ($stat) {
                $uncompressedSize += $stat['size'];
            }
        }

        if ($uncompressedSize > 100 * 1024 * 1024) { // 100MB
            $zip->close();
            throw ValidationException::withMessages([
                'zip_file' => __('Zip file is too large when uncompressed (max 100MB).'),
            ]);
        }

        if ($zip->numFiles > 500) {
            $zip->close();
            throw ValidationException::withMessages([
                'zip_file' => __('Zip file contains too many files (max 500).'),
            ]);
        }

        $zip->extractTo($tempDir);
        $zip->close();

        // Find all .md files recursively
        $markdownFiles = [];
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($tempDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && in_array(strtolower($file->getExtension()), ['md', 'markdown'])) {
                $markdownFiles[] = $file->getRealPath();
            }
        }

        if (empty($markdownFiles)) {
            $this->removeDirectory($tempDir);
            throw ValidationException::withMessages([
                'zip_file' => __('No markdown files found in zip archive.'),
            ]);
        }

        return [
            'temp_dir' => $tempDir,
            'markdown_files' => $markdownFiles,
        ];
    }

    /**
     * Parse navigation.json if available.
     *
     * @return array<int, array<string, mixed>>|null
     */
    private function parseNavigationFile(string $tempDir): ?array
    {
        $path = rtrim($tempDir, '/').'/navigation.json';

        if (! is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);
        if ($contents === false) {
            return null;
        }

        $decoded = json_decode($contents, true);
        if (! is_array($decoded)) {
            return null;
        }

        $items = $decoded['items'] ?? null;
        if (! is_array($items)) {
            return null;
        }

        return $this->normalizeNavigationItems($items);
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<int, array<string, mixed>>
     */
    private function normalizeNavigationItems(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $nodeType = $item['node_type'] ?? null;
            $nodePath = $item['node_path'] ?? null;

            if (! is_string($nodeType) || ! in_array($nodeType, ['folder', 'document'], true)) {
                continue;
            }

            if (! is_string($nodePath) || $nodePath === '') {
                continue;
            }

            $parentPath = $item['parent_path'] ?? null;
            $position = $item['position'] ?? 0;
            $label = $item['label'] ?? null;

            $normalizedItem = [
                'node_type' => $nodeType,
                'node_path' => $nodePath,
                'parent_path' => is_string($parentPath) && $parentPath !== '' ? $parentPath : null,
                'position' => is_numeric($position) ? (int) $position : 0,
                'label' => is_string($label) && $label !== '' ? $label : null,
            ];

            $key = $normalizedItem['node_type'].'|'.$normalizedItem['node_path'];
            $normalized[$key] = $normalizedItem;
        }

        return array_values($normalized);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncNavigationItems(array $items): void
    {
        MarkdownNavigationItem::query()->delete();

        if ($items === []) {
            return;
        }

        $now = now();
        $payload = array_map(static function (array $item) use ($now): array {
            return [
                'node_type' => $item['node_type'],
                'node_path' => $item['node_path'],
                'parent_path' => $item['parent_path'] ?? null,
                'position' => $item['position'] ?? 0,
                'label' => $item['label'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $items);

        MarkdownNavigationItem::query()->insert($payload);
    }

    /**
     * Parse a markdown file and extract metadata.
     *
     * @return array<string, mixed>
     */
    private function parseMarkdownFile(
        string $path,
        string $relativePath,
        string $tempDir
    ): array {
        $contents = file_get_contents($path);
        if ($contents === false) {
            return [
                'original_path' => $relativePath,
                'slug' => '',
                'title' => '',
                'status' => 'draft',
                'content' => '',
                'is_duplicate' => false,
                'validation_errors' => [__('Unable to read file.')],
            ];
        }

        // Remove BOM
        $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents) ?? '';

        [$frontMatter, $body] = $this->extractFrontMatter($contents);

        // Resolve slug
        $slug = $frontMatter['slug'] ?? pathinfo($relativePath, PATHINFO_FILENAME);
        $slug = is_string($slug) ? trim($slug) : '';
        $slug = ltrim($slug, '/');

        // Resolve title
        $title = $frontMatter['title'] ?? $slug;
        $title = is_string($title) && $title !== '' ? $title : $slug;

        // Resolve status
        $status = $frontMatter['status'] ?? 'draft';
        if (! is_string($status)) {
            $status = 'draft';
        }
        $status = in_array($status, ['draft', 'private', 'published'], true) ? $status : 'draft';

        $fileData = [
            'original_path' => $relativePath,
            'slug' => $slug,
            'title' => $title,
            'status' => $status,
            'content' => $body === '' ? null : $body,
            'topics' => $this->normalizeTopics($frontMatter['topics'] ?? []),
            'eyecatch' => $this->normalizeEyecatchPath($frontMatter['eyecatch'] ?? null),
            'content_images' => $this->extractContentImagePaths($body),
            'is_duplicate' => false,
            'validation_errors' => [],
        ];

        // Validate
        $fileData['validation_errors'] = $this->validateParsedFile(
            $fileData,
            $tempDir
        );

        return $fileData;
    }

    /**
     * Validate a parsed file.
     *
     * @param  array<string, mixed>  $fileData
     * @return array<string>
     */
    private function validateParsedFile(array $fileData, string $tempDir): array
    {
        $errors = [];

        if (empty($fileData['slug'])) {
            $errors[] = __('Slug is required in front matter or filename.');
        }

        if (! empty($fileData['eyecatch']) && ! is_string($fileData['eyecatch'])) {
            $errors[] = __('Eyecatch must be a string path.');
        }

        if (
            is_string($fileData['eyecatch']) &&
            $fileData['eyecatch'] !== ''
        ) {
            $eyecatchPath = $tempDir.'/'.ltrim($fileData['eyecatch'], '/');
            if (! is_file($eyecatchPath)) {
                $errors[] = __('Eyecatch file not found in zip.');
            }
        }

        if (! empty($fileData['content_images']) && is_array($fileData['content_images'])) {
            foreach ($fileData['content_images'] as $imagePath) {
                if (! is_string($imagePath) || $imagePath === '') {
                    continue;
                }

                $path = $tempDir.'/'.ltrim($imagePath, '/');
                if (! is_file($path)) {
                    $errors[] = __('Content image file not found in zip.');
                    break;
                }
            }
        }

        return $errors;
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
     * Check for duplicate slugs in existing documents.
     *
     * @param  array<array<string, mixed>>  $files
     * @return array<array<string, mixed>>
     */
    private function checkDuplicates(array $files): array
    {
        $slugs = array_filter(array_column($files, 'slug'));

        if (empty($slugs)) {
            return $files;
        }

        $existingDocuments = MarkdownDocument::query()
            ->whereIn('slug', $slugs)
            ->get()
            ->keyBy('slug');

        foreach ($files as &$file) {
            $slug = $file['slug'];
            if ($existingDocuments->has($slug)) {
                $existing = $existingDocuments->get($slug);
                $file['is_duplicate'] = true;
                $file['existing_document'] = [
                    'slug' => $existing->slug,
                    'title' => $existing->title,
                    'updated_at' => $existing->updated_at?->toISOString(),
                ];
            }
        }

        return $files;
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
     * Normalize front matter topics into a list of strings.
     *
     * @return array<int, string>
     */
    private function normalizeTopics(mixed $topics): array
    {
        if (is_string($topics)) {
            $topics = trim($topics);

            if ($topics === '') {
                return [];
            }

            $topics = array_map('trim', explode(',', $topics));
        }

        if (! is_array($topics)) {
            return [];
        }

        $normalized = [];

        foreach ($topics as $topic) {
            if (! is_string($topic)) {
                continue;
            }

            $topic = trim($topic);

            if ($topic !== '') {
                $normalized[] = $topic;
            }
        }

        return array_values(array_unique($normalized));
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

    /**
     * Attach eyecatch file from zip import when available.
     *
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
        if (! $tempDir || $content === null || $content === '' || empty($contentImages)) {
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
     * Show the form for editing the home page document.
     */
    public function editHomePage(): Response
    {
        $document = MarkdownDocument::getHomePage();

        return Inertia::render('app-settings/home-page-edit', [
            'document' => $document,
            'templates' => $this->loadHomePageTemplates(),
        ]);
    }

    /**
     * Store a newly created home page document in storage.
     */
    public function storeHomePage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $validated) {
            // 既存のホームページドキュメントのフラグを解除
            MarkdownDocument::query()
                ->where('is_home_page', true)
                ->update(['is_home_page' => false]);

            // 新しいホームページドキュメントを作成
            MarkdownDocument::query()->create([
                'slug' => 'home-'.Str::random(8),
                'title' => $validated['title'],
                'content' => $validated['content'] ?? null,
                'status' => 'published',
                'is_home_page' => true,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);
        });

        return redirect()->route('app-settings')
            ->with('success', __('Home page document created successfully.'));
    }

    /**
     * Update the home page document in storage.
     */
    public function updateHomePage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
        ]);

        $document = MarkdownDocument::getHomePage();

        if (! $document) {
            abort(404, 'Home page document not found.');
        }

        $document->update([
            'title' => $validated['title'],
            'content' => $validated['content'] ?? null,
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('app-settings')
            ->with('success', __('Home page document updated successfully.'));
    }

    /**
     * Remove the home page document from storage.
     */
    public function destroyHomePage(): RedirectResponse
    {
        $document = MarkdownDocument::getHomePage();

        if (! $document) {
            return redirect()->route('app-settings')
                ->with('error', __('Home page document not found.'));
        }

        $document->delete();

        return redirect()->route('app-settings')
            ->with('success', __('Home page document deleted successfully. The default welcome page will be shown.'));
    }
}
