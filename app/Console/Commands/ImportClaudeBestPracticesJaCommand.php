<?php

namespace App\Console\Commands;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportClaudeBestPracticesJaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'markdown:claudecode-best-practices-ja';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import database/claudecode/claude-best-practices-ja.md into claudecode/claude-best-practices-ja.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourcePath = base_path('database/claudecode/claude-best-practices-ja.md');
        $slug = 'claudecode/claude-best-practices-ja';
        $folderPath = 'claudecode';
        $folderLabel = 'Claude Code';

        if (! is_file($sourcePath)) {
            $this->error("File not found: {$sourcePath}");

            return 1;
        }

        $contents = file_get_contents($sourcePath);
        if ($contents === false) {
            $this->error("Failed to read file: {$sourcePath}");

            return 1;
        }

        $normalizeContent = static function (string $body): string {
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

        [$title, $status, $body] = $extractFrontMatter($contents);
        $body = $normalizeContent($body);

        if (! is_string($title) || $title === '') {
            [$title, $body] = $resolveTitleAndBody($body, $slug);
        }
        $status = is_string($status) && in_array($status, ['draft', 'private', 'published'], true)
            ? $status
            : 'published';

        $user = User::query()->orderBy('id')->first();
        if (! $user) {
            $this->error('No users found. Create a user before importing.');

            return 1;
        }

        DB::transaction(function () use (
            $slug,
            $title,
            $body,
            $status,
            $user,
            $folderPath,
            $folderLabel
        ): void {
            $document = MarkdownDocument::query()->where('slug', $slug)->first();
            if ($document) {
                $document->update([
                    'title' => $title,
                    'content' => $body,
                    'status' => $status,
                    'updated_by' => $user->id,
                ]);
            } else {
                MarkdownDocument::query()->create([
                    'slug' => $slug,
                    'title' => $title,
                    'content' => $body,
                    'status' => $status,
                    'created_by' => $user->id,
                    'updated_by' => $user->id,
                ]);
            }

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

            $docItem = MarkdownNavigationItem::query()
                ->where('node_type', 'document')
                ->where('node_path', $slug)
                ->first();

            if (! $docItem) {
                $position = MarkdownNavigationItem::query()
                    ->where('parent_path', $folderPath)
                    ->max('position');
                $position = $position !== null ? ((int) $position + 1) : 0;

                MarkdownNavigationItem::query()->create([
                    'node_type' => 'document',
                    'node_path' => $slug,
                    'parent_path' => $folderPath,
                    'position' => $position,
                    'label' => null,
                ]);
            }
        });

        $this->info('Imported claudecode/claude-best-practices-ja.');

        return 0;
    }
}
