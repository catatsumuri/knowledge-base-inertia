<?php

namespace App\Console\Commands;

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportAgentBrowserJaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'markdown:agent-browser-ja';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import database/agent-browser/README.ja.md into agent-browser/index.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourcePath = base_path('database/agent-browser/README.ja.md');
        $slug = 'agent-browser/index';
        $folderPath = 'agent-browser';
        $folderLabel = 'agent-browser';

        if (! is_file($sourcePath)) {
            $this->error("File not found: {$sourcePath}");

            return 1;
        }

        $contents = file_get_contents($sourcePath);
        if ($contents === false) {
            $this->error("Failed to read file: {$sourcePath}");

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

        $resolveTitleAndBody = static function (string $body): array {
            if (preg_match('/^\s*#\s+(.+)\s*$/m', $body, $matches)) {
                $title = trim($matches[1]);
                $body = preg_replace('/^\s*#\s+.+\s*$(\r?\n)?/m', '', $body, 1);

                return [$title, ltrim((string) $body)];
            }

            return ['agent-browser', $body];
        };

        [$title, $status, $body] = $extractFrontMatter($contents);

        if (! is_string($title) || $title === '') {
            [$title, $body] = $resolveTitleAndBody($body);
        }

        $status = is_string($status) && in_array($status, ['draft', 'private', 'published'], true)
            ? $status
            : 'published';

        $user = User::query()->orderBy('id')->first();
        if (! $user) {
            $this->error('No users found. Create a user before importing.');

            return 1;
        }

        DB::transaction(function () use ($slug, $title, $body, $status, $user, $folderPath, $folderLabel): void {
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

            $docItem = MarkdownNavigationItem::query()
                ->where('node_type', 'document')
                ->where('node_path', $slug)
                ->first();

            if ($docItem) {
                $docItem->update([
                    'parent_path' => $folderPath,
                    'position' => 0,
                ]);
            } else {
                MarkdownNavigationItem::query()->create([
                    'node_type' => 'document',
                    'node_path' => $slug,
                    'parent_path' => $folderPath,
                    'position' => 0,
                    'label' => null,
                ]);
            }
        });

        $this->info('Imported agent-browser/index.');

        return 0;
    }
}
