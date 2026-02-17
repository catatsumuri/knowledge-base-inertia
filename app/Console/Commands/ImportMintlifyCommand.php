<?php

namespace App\Console\Commands;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportMintlifyCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'markdown:mintlify';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import database/mintlify/*.md into mintlify/*.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourceDir = base_path('database/mintlify');
        $folderPath = 'mintlify';
        $folderLabel = 'Mintlify';

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

        $normalizeContent = static function (string $body): string {
            // Mintlify components links -> internal mintlify path
            $body = preg_replace(
                '/href=([\"\'])\/components(\/[^\"\']*)?\1/',
                'href=$1mintlify/components$2$1',
                $body
            );

            $convertTagAttributes = static function (string $raw): string {
                $attributes = [];

                if (preg_match_all('/([A-Za-z][\w-]*)\s*=\s*(\{[^}]*\}|\"[^\"]*\"|\'[^\']*\')/', $raw, $matches, PREG_SET_ORDER)) {
                    foreach ($matches as $match) {
                        $key = $match[1];
                        $value = trim($match[2]);

                        if (str_starts_with($value, '{') && str_ends_with($value, '}')) {
                            $value = trim(substr($value, 1, -1));
                        }

                        if ($value === 'true' || $value === 'false' || is_numeric($value)) {
                            $attributes[] = $key.'='.$value;
                        } else {
                            $value = trim($value, "\"'");
                            $value = addcslashes($value, '"');
                            $attributes[] = $key.'="'.$value.'"';
                        }
                    }
                }

                if ($attributes === []) {
                    return '';
                }

                return '{'.implode(' ', $attributes).'}';
            };

            $transformOutsideCodeFences = static function (string $source, callable $callback): string {
                $lines = preg_split('/\r?\n/', $source);
                $output = [];
                $buffer = [];
                $inFence = false;
                $fenceMarker = '';

                foreach ($lines as $line) {
                    if (! $inFence && preg_match('/^\s*(`{3,}|~{3,})/', $line, $match)) {
                        if ($buffer !== []) {
                            $output[] = $callback(implode("\n", $buffer));
                            $buffer = [];
                        }
                        $inFence = true;
                        $fenceMarker = $match[1];
                        $output[] = $line;

                        continue;
                    }

                    if ($inFence && preg_match('/^\s*'.preg_quote($fenceMarker, '/').'/', $line)) {
                        $inFence = false;
                        $fenceMarker = '';
                        $output[] = $line;

                        continue;
                    }

                    if ($inFence) {
                        $output[] = $line;

                        continue;
                    }

                    $buffer[] = $line;
                }

                if ($buffer !== []) {
                    $output[] = $callback(implode("\n", $buffer));
                }

                return implode("\n", $output);
            };

            // Convert <Tabs>/<Tab> to directive syntax (keep code fences untouched)
            $body = $transformOutsideCodeFences($body, static function (string $segment) use ($convertTagAttributes): string {
                $segment = preg_replace_callback('/<Tabs\b([^>]*)>\s*/i', static function ($matches) use ($convertTagAttributes) {
                    // Use 4-colon fence to allow nested :::tab blocks
                    return '::::tabs'.$convertTagAttributes($matches[1])."\n";
                }, $segment);
                $segment = preg_replace('/\s*<\/Tabs>/i', "\n::::\n", $segment);

                $segment = preg_replace_callback('/<Tab\b([^>]*)>\s*/i', static function ($matches) use ($convertTagAttributes) {
                    return ':::tab'.$convertTagAttributes($matches[1])."\n";
                }, $segment);
                $segment = preg_replace('/\s*<\/Tab>/i', "\n:::\n", $segment);

                return $segment;
            });

            $body = preg_replace('/<Tip>\s*/i', ":::message\n", $body);
            $body = preg_replace('/\s*<\/Tip>/i', "\n:::\n", $body);
            $body = preg_replace('/<Callout>\s*/i', ":::message alert\n", $body);
            $body = preg_replace('/\s*<\/Callout>/i', "\n:::\n", $body);
            $body = preg_replace('/<Warning>\s*/i', ":::message alert\n", $body);
            $body = preg_replace('/\s*<\/Warning>/i', "\n:::\n", $body);

            // Normalize code fences: remove theme={...} and convert ```lang rest -> ```lang:rest
            $body = preg_replace('/^(\s*```[^\n`]*)\s+theme=\{[^}]*\}\s*$/m', '$1', $body);
            $body = preg_replace('/^(\s*```)([^\s`:]+)\s+([^\n`]+)$/m', '$1$2:$3', $body);

            $body = preg_replace_callback(
                '/<Steps>([\s\S]*?)<\/Steps>/',
                static function ($matches) {
                    $content = $matches[1];

                    // Steps内の先頭4スペースを削除
                    $content = preg_replace('/^ {4}/m', '', $content);
                    $content = preg_replace('/^ {4}/m', '', $content);

                    return $content;
                },
                $body
            );
            $body = preg_replace_callback(
                '/<Step\b([^>]*)>/',
                static function ($matches) {
                    if (! preg_match('/title="([^"]*)"/', $matches[1], $titleMatch)) {
                        return "###\n";
                    }

                    $title = trim($titleMatch[1]);

                    return "### {$title}\n";
                },
                $body
            );
            $body = preg_replace('/<\/Step>/', '', $body);

            return $body ?? '';
        };

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
            $contents = file_get_contents($file);
            if ($contents === false) {
                $this->error("Failed to read file: {$file}");

                return 1;
            }

            $relative = ltrim(str_replace($sourceDir, '', $file), DIRECTORY_SEPARATOR);
            $relative = str_replace(DIRECTORY_SEPARATOR, '/', $relative);
            $slugSuffix = preg_replace('/\.(md|mdx)$/i', '', $relative) ?? $relative;
            $slug = $folderPath.'/'.$slugSuffix;

            [$title, $status, $body] = $extractFrontMatter($contents);
            $body = $normalizeContent($body);

            if (! is_string($title) || $title === '') {
                [$title, $body] = $resolveTitleAndBody($body, $slug);
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
                $folderItem->update([
                    'label' => $folderLabel,
                ]);
            } else {
                $position = MarkdownNavigationItem::query()
                    ->where('parent_path', null)
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

            foreach ($entries as $entry) {
                $document = MarkdownDocument::query()->where('slug', $entry['slug'])->first();
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

                if (! $docItem) {
                    $position = MarkdownNavigationItem::query()
                        ->where('parent_path', $folderPath)
                        ->max('position');
                    $position = $position !== null ? ((int) $position + 1) : 0;

                    MarkdownNavigationItem::query()->create([
                        'node_type' => 'document',
                        'node_path' => $entry['slug'],
                        'parent_path' => $folderPath,
                        'position' => $position,
                        'label' => null,
                    ]);
                }
            }
        });

        $this->info('Imported mintlify documents: '.count($entries).'.');

        return 0;
    }
}
