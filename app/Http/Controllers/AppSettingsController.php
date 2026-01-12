<?php

namespace App\Http\Controllers;

use App\Http\Requests\MarkdownZipImportRequest;
use App\Models\MarkdownDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class AppSettingsController extends Controller
{
    /**
     * Display the application settings screen.
     */
    public function index(): Response
    {
        return Inertia::render('app-settings');
    }

    /**
     * Export all markdown documents as a zip archive.
     */
    public function exportMarkdown(): StreamedResponse
    {
        $documents = MarkdownDocument::query()
            ->with(['createdBy', 'updatedBy'])
            ->orderBy('slug')
            ->get();

        $path = tempnam(sys_get_temp_dir(), 'markdown-export-all-');
        $zip = new ZipArchive;

        if ($path === false || $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Unable to create export archive.');
        }

        foreach ($documents as $document) {
            $zip->addFromString(
                $document->slug.'.md',
                $this->buildExportContent($document)
            );
        }

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
    private function buildExportContent(MarkdownDocument $document): string
    {
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

        $frontMatter = "---\n".implode("\n", $lines)."\n---\n\n";
        $body = $document->content ?? '';

        return $frontMatter.$body."\n";
    }

    /**
     * Encode a YAML-safe string value.
     */
    private function yamlString(string $value): string
    {
        return (string) json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
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
            $fileData = $this->parseMarkdownFile($filePath, $relativePath);
            $files[] = $fileData;
        }

        // Clean up temp directory
        $this->removeDirectory($extraction['temp_dir']);

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

        // Store in session
        session([
            'markdown_zip_import_preview' => [
                'session_key' => $sessionKey,
                'uploaded_at' => now()->toISOString(),
                'files' => $files,
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
        $imported = 0;
        $skipped = 0;

        DB::transaction(function () use ($files, $conflictResolutions, $request, &$imported, &$skipped) {
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
                        $imported++;
                    }
                } else {
                    // Create new document
                    MarkdownDocument::query()->create([
                        'slug' => $slug,
                        'title' => $fileData['title'],
                        'content' => $fileData['content'],
                        'status' => $fileData['status'],
                        'created_by' => $request->user()->id,
                        'updated_by' => $request->user()->id,
                    ]);
                    $imported++;
                }
            }
        });

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
     * Parse a markdown file and extract metadata.
     *
     * @return array<string, mixed>
     */
    private function parseMarkdownFile(string $path, string $relativePath): array
    {
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
            'is_duplicate' => false,
            'validation_errors' => [],
        ];

        // Validate
        $fileData['validation_errors'] = $this->validateParsedFile($fileData);

        return $fileData;
    }

    /**
     * Validate a parsed file.
     *
     * @param  array<string, mixed>  $fileData
     * @return array<string>
     */
    private function validateParsedFile(array $fileData): array
    {
        $errors = [];

        if (empty($fileData['slug'])) {
            $errors[] = __('Slug is required in front matter or filename.');
        }

        return $errors;
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
}
