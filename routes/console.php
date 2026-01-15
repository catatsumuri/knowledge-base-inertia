<?php

use App\Models\MarkdownDocument;
use App\Models\MarkdownNavigationItem;
use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('markdown:import-v2-ja', function () {
    $basePath = base_path('database/v2-ja');

    if (! is_dir($basePath)) {
        $this->error("Directory not found: {$basePath}");

        return 1;
    }

    $files = [];
    $iterator = new \RecursiveIteratorIterator(
        new \RecursiveDirectoryIterator($basePath, \RecursiveDirectoryIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if (! $file->isFile() || $file->getExtension() !== 'mdx') {
            continue;
        }

        $files[] = $file->getPathname();
    }

    if ($files === []) {
        $this->error('No .mdx files found to import.');

        return 1;
    }

    $extractFrontMatter = static function (string $contents): array {
        if (! preg_match('/\A---\R(.*?)\R---\R?/s', $contents, $matches)) {
            return [null, null, $contents];
        }

        $frontMatter = $matches[1];
        $body = substr($contents, strlen($matches[0]));
        $body = ltrim($body, "\r\n");

        $title = null;
        $type = null;
        $status = null;

        foreach (preg_split('/\R/', $frontMatter) as $line) {
            $line = trim((string) $line);

            if (str_starts_with($line, 'title:')) {
                $value = trim(substr($line, strlen('title:')));
                $title = trim($value, " \t\n\r\0\x0B\"'");
                continue;
            }

            if (str_starts_with($line, 'type:')) {
                $value = trim(substr($line, strlen('type:')));
                $type = trim($value, " \t\n\r\0\x0B\"'");
                continue;
            }

            if (str_starts_with($line, 'status:')) {
                $value = trim(substr($line, strlen('status:')));
                $status = trim($value, " \t\n\r\0\x0B\"'");
            }
        }

        return [$title, $status ?? $type, $body];
    };

    $navigationSpec = [
        [
            'slug' => 'getting-started',
            'label' => 'はじめに',
            'children' => [
                'getting-started/index',
                'getting-started/demo-application',
                'getting-started/upgrade-guide',
            ],
        ],
        [
            'slug' => 'installation',
            'label' => 'インストール',
            'children' => [
                'installation/server-side-setup',
                'installation/client-side-setup',
                'installation/community-adapters',
            ],
        ],
        [
            'slug' => 'core-concepts',
            'label' => 'コア概念',
            'children' => [
                'core-concepts/who-is-it-for',
                'core-concepts/how-it-works',
                'core-concepts/the-protocol',
            ],
        ],
        [
            'slug' => 'the-basics',
            'label' => '基本',
            'children' => [
                'the-basics/pages',
                'the-basics/responses',
                'the-basics/redirects',
                'the-basics/routing',
                'the-basics/title-and-meta',
                'the-basics/links',
                'the-basics/manual-visits',
                'the-basics/forms',
                'the-basics/file-uploads',
                'the-basics/validation',
                'the-basics/view-transitions',
            ],
        ],
        [
            'slug' => 'data-props',
            'label' => 'データとプロップス',
            'children' => [
                'data-props/shared-data',
                'data-props/flash-data',
                'data-props/partial-reloads',
                'data-props/deferred-props',
                'data-props/merging-props',
                'data-props/once-props',
                'data-props/polling',
                'data-props/prefetching',
                'data-props/load-when-visible',
                'data-props/infinite-scroll',
                'data-props/remembering-state',
            ],
        ],
        [
            'slug' => 'security',
            'label' => 'セキュリティ',
            'children' => [
                'security/authentication',
                'security/authorization',
                'security/csrf-protection',
                'security/history-encryption',
            ],
        ],
        [
            'slug' => 'advanced',
            'label' => '応用',
            'children' => [
                'advanced/asset-versioning',
                'advanced/code-splitting',
                'advanced/error-handling',
                'advanced/events',
                'advanced/progress-indicators',
                'advanced/scroll-management',
                'advanced/server-side-rendering',
                'advanced/testing',
                'advanced/typescript',
            ],
        ],
    ];

    $documents = [];
    $slugs = [];

    foreach ($files as $path) {
        $relative = str_replace($basePath.DIRECTORY_SEPARATOR, '', $path);
        $relative = str_replace('\\', '/', $relative);
        $slug = preg_replace('/\.mdx$/', '', $relative) ?? $relative;
        $slug = ltrim($slug, '/');

        $contents = file_get_contents($path);
        if ($contents === false) {
            $this->error("Failed to read {$relative}");

            return 1;
        }

        [$title, $statusValue, $body] = $extractFrontMatter($contents);
        $title = $title && $title !== '' ? $title : Str::title(str_replace(['-', '_'], ' ', basename($slug)));
        $body = $body === '' ? null : preg_replace(
            '/\((\/?)v2\//',
            '($1',
            $body
        );

        if (is_string($body)) {
            $body = rtrim($body)."\n\n> https://inertiajs.com/docs/v2/{$slug}\n";
        }

        $status = 'private';
        if (is_string($statusValue) && in_array($statusValue, ['draft', 'private', 'published'], true)) {
            $status = $statusValue;
        }

        $documents[] = [
            'slug' => $slug,
            'title' => $title,
            'content' => $body,
            'status' => $status,
        ];
        $slugs[] = $slug;
    }

    $duplicateSlugs = array_keys(array_filter(array_count_values($slugs), static fn ($count) => $count > 1));
    if ($duplicateSlugs !== []) {
        $this->error('Duplicate slugs detected: '.implode(', ', $duplicateSlugs));

        return 1;
    }

    $existing = MarkdownDocument::query()
        ->whereIn('slug', $slugs)
        ->pluck('slug')
        ->all();

    if ($existing !== []) {
        $this->error('Import aborted, existing slugs found: '.implode(', ', $existing));

        return 1;
    }

    $expectedSlugs = [];
    foreach ($navigationSpec as $group) {
        foreach ($group['children'] as $childSlug) {
            $expectedSlugs[] = $childSlug;
        }
    }

    $missingSlugs = array_values(array_diff($expectedSlugs, $slugs));
    if ($missingSlugs !== []) {
        $this->error('Import aborted, expected slugs missing: '.implode(', ', $missingSlugs));

        return 1;
    }

    $extraSlugs = array_values(array_diff($slugs, $expectedSlugs));
    if ($extraSlugs !== []) {
        $this->error('Import aborted, unexpected slugs found: '.implode(', ', $extraSlugs));

        return 1;
    }

    $user = User::query()->orderBy('id')->first();
    if (! $user) {
        $this->error('No users found. Create a user before importing.');

        return 1;
    }

    DB::transaction(function () use ($documents, $user, $navigationSpec): void {
        foreach ($documents as $document) {
            MarkdownDocument::query()->create([
                'slug' => $document['slug'],
                'title' => $document['title'],
                'content' => $document['content'],
                'status' => $document['status'],
                'created_by' => $user->id,
                'updated_by' => $user->id,
            ]);
        }

        MarkdownNavigationItem::query()->delete();

        $now = now();
        $navItems = [];

        foreach ($navigationSpec as $groupIndex => $group) {
            $navItems[] = [
                'node_type' => 'folder',
                'node_path' => $group['slug'],
                'parent_path' => null,
                'position' => $groupIndex,
                'label' => $group['label'],
                'created_at' => $now,
                'updated_at' => $now,
            ];

            foreach ($group['children'] as $childIndex => $childSlug) {
                $navItems[] = [
                    'node_type' => 'document',
                    'node_path' => $childSlug,
                    'parent_path' => $group['slug'],
                    'position' => $childIndex,
                    'label' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        MarkdownNavigationItem::query()->insert($navItems);
    });

    $this->info('Imported '.count($documents).' documents.');
})->purpose('Import database/v2 markdown content without v2 prefix (JA).');
