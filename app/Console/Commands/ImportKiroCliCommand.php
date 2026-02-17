<?php

namespace App\Console\Commands;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportKiroCliCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'markdown:kiro-cli';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import database/kiro-cli/*.md into kiro-cli/*.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourceDir = base_path('database/kiro-cli');
        $folderPath = 'kiro-cli';
        $folderLabel = 'Kiro CLI';

        if (! is_dir($sourceDir)) {
            $this->error("Directory not found: {$sourceDir}");

            return 1;
        }

        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (! $file->isFile()) {
                continue;
            }

            $ext = strtolower($file->getExtension());
            if (! in_array($ext, ['md', 'mdx'], true)) {
                continue;
            }

            $files[] = $file->getPathname();
        }

        sort($files, SORT_STRING);

        if ($files === []) {
            $this->error("No markdown files found in: {$sourceDir}");

            return 1;
        }

        $extractFrontMatter = static function (string $contents): array {
            if (! preg_match('/\A---\r?\n(.*?)\r?\n---\r?\n?/s', $contents, $matches)) {
                return [null, null, $contents];
            }

            $frontMatter = $matches[1];
            $body = substr($contents, strlen($matches[0]));
            $body = preg_replace('/^\s+/', '', $body);

            $title = null;
            $status = null;

            foreach (preg_split('/\r?\n/', $frontMatter) as $line) {
                $line = trim((string) $line);

                if (str_starts_with($line, 'title:')) {
                    $value = trim(substr($line, strlen('title:')));
                    $title = preg_replace('/^["\']|["\']$/', '', $value);

                    continue;
                }

                if (str_starts_with($line, 'status:')) {
                    $value = trim(substr($line, strlen('status:')));
                    $status = preg_replace('/^["\']|["\']$/', '', $value);
                }
            }

            return [$title, $status, $body];
        };

        $resolveTitleAndBody = static function (string $body, string $slug): array {
            if (preg_match('/^\s*#\s+(.+)\s*$/m', $body, $matches)) {
                $title = trim($matches[1]);
                $body = preg_replace('/^\s*#\s+.+\s*$(\r?\n)?/m', '', $body, 1);

                return [$title, ltrim((string) $body)];
            }

            $parts = explode('/', $slug);
            $last = $parts !== [] ? (string) array_pop($parts) : $slug;
            $normalized = str_replace(['-', '_'], ' ', $last);

            return [trim(Str::title($normalized)), $body];
        };

        $user = User::query()->orderBy('id')->first();
        if (! $user) {
            $this->error('No users found. Create a user before importing.');

            return 1;
        }

        $entries = [];

        foreach ($files as $file) {
            $relative = str_replace($sourceDir.DIRECTORY_SEPARATOR, '', $file);
            $relative = str_replace('\\', '/', $relative);
            $slugWithoutExt = preg_replace('/\.(md|mdx)$/i', '', $relative) ?? $relative;
            $slugWithoutExt = ltrim($slugWithoutExt, '/');
            $slug = $folderPath.'/'.$slugWithoutExt;

            $contents = file_get_contents($file);
            if ($contents === false) {
                $this->error("Failed to read file: {$file}");

                return 1;
            }

            [$title, $status, $body] = $extractFrontMatter($contents);

            if (! is_string($title) || $title === '') {
                [$title, $body] = $resolveTitleAndBody($body, $slugWithoutExt);
            }

            $status = is_string($status) && in_array($status, ['draft', 'private', 'published'], true)
                ? $status
                : 'published';

            $entries[] = [
                'slug' => $slug,
                'title' => $title,
                'content' => $body,
                'status' => $status,
            ];
        }

        DB::transaction(function () use ($entries, $user, $folderPath, $folderLabel): void {
            $folderItem = MarkdownNavigationItem::query()
                ->where('node_type', 'folder')
                ->where('node_path', $folderPath)
                ->first();

            if ($folderItem) {
                $folderItem->update(['label' => $folderLabel]);
            } else {
                $position = MarkdownNavigationItem::query()
                    ->whereNull('parent_path')
                    ->max('position');
                $position = $position !== null ? ((int) $position + 1) : 0;

                MarkdownNavigationItem::query()->create([
                    'node_type' => 'folder',
                    'node_path' => $folderPath,
                    'parent_path' => null,
                    'position' => $position,
                    'label' => $folderLabel,
                ]);
            }

            foreach ($entries as $index => $entry) {
                $document = MarkdownDocument::query()
                    ->where('slug', $entry['slug'])
                    ->first();

                if ($document) {
                    $document->update([
                        'title' => $entry['title'],
                        'content' => $entry['content'],
                        'status' => $entry['status'],
                        'updated_by' => $user->id,
                    ]);
                } else {
                    MarkdownDocument::query()->create([
                        'slug' => $entry['slug'],
                        'title' => $entry['title'],
                        'content' => $entry['content'],
                        'status' => $entry['status'],
                        'created_by' => $user->id,
                        'updated_by' => $user->id,
                    ]);
                }

                $docItem = MarkdownNavigationItem::query()
                    ->where('node_type', 'document')
                    ->where('node_path', $entry['slug'])
                    ->first();

                if ($docItem) {
                    $docItem->update([
                        'parent_path' => $folderPath,
                        'position' => $index,
                    ]);
                } else {
                    MarkdownNavigationItem::query()->create([
                        'node_type' => 'document',
                        'node_path' => $entry['slug'],
                        'parent_path' => $folderPath,
                        'position' => $index,
                        'label' => null,
                    ]);
                }
            }
        });

        $this->info('Imported '.count($entries).' Kiro CLI document(s).');

        return 0;
    }
}
