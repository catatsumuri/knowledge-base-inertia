<?php

use App\Http\Controllers\AppSettingsController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PublicPagesController;
use App\Models\MarkdownDocument;
use App\Models\Shout;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('markdown/media/{media}/{conversion?}', [\App\Http\Controllers\MarkdownController::class, 'media'])
    ->name('markdown.media.show');

Route::get('pages', [PublicPagesController::class, 'index'])
    ->name('pages.index');
Route::get('pages/{slug}', [PublicPagesController::class, 'show'])
    ->where('slug', '.*')
    ->name('pages.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $recentDocuments = Inertia::scroll(fn () => MarkdownDocument::query()
            ->with('updatedBy')
            ->latest('updated_at')
            ->paginate(5)
            ->through(fn (MarkdownDocument $document) => [
                'slug' => $document->slug,
                'title' => $document->title,
                'status' => $document->status,
                'updated_at' => $document->updated_at?->toISOString(),
                'updated_by' => $document->updatedBy ? [
                    'name' => $document->updatedBy->name,
                ] : null,
            ]));

        $shouts = Shout::query()
            ->with(['user', 'links', 'media', 'replies.user', 'replies.links', 'replies.media'])
            ->whereNull('parent_id')
            ->latest()
            ->paginate(20)
            ->through(fn (Shout $shout) => $shout->toInertiaArray());

        return Inertia::render('dashboard', [
            'recentDocuments' => $recentDocuments,
            'shouts' => $shouts,
        ]);
    })->name('dashboard');

    Route::get('app-settings', [AppSettingsController::class, 'index'])
        ->name('app-settings');
    Route::get('app-settings/home-page/edit', [AppSettingsController::class, 'editHomePage'])
        ->name('app-settings.home-page.edit');
    Route::post('app-settings/home-page', [AppSettingsController::class, 'storeHomePage'])
        ->name('app-settings.home-page.store');
    Route::patch('app-settings/home-page', [AppSettingsController::class, 'updateHomePage'])
        ->name('app-settings.home-page.update');
    Route::delete('app-settings/home-page', [AppSettingsController::class, 'destroyHomePage'])
        ->name('app-settings.home-page.destroy');
    Route::get('app-settings/markdown/export', [AppSettingsController::class, 'exportMarkdown'])
        ->name('app-settings.markdown-export');
    Route::post('app-settings/markdown/import/preview', [AppSettingsController::class, 'previewZipImport'])
        ->name('app-settings.markdown-import-preview');
    Route::post('app-settings/markdown/import/execute', [AppSettingsController::class, 'executeZipImport'])
        ->name('app-settings.markdown-import-execute');
    Route::post('app-settings/markdown/import/cancel', [AppSettingsController::class, 'cancelZipImport'])
        ->name('app-settings.markdown-import-cancel');

    Route::get('sitemap', [\App\Http\Controllers\SitemapController::class, 'index'])->name('sitemap');

    Route::get('topics', [\App\Http\Controllers\TopicController::class, 'index'])->name('topics.index');
    Route::get('topics/{slug}', [\App\Http\Controllers\TopicController::class, 'show'])->name('topics.show');

    Route::get('shoutbox', [\App\Http\Controllers\ShoutboxController::class, 'index'])->name('shoutbox.index');
    Route::get('shoutbox/media/{media}', [\App\Http\Controllers\ShoutboxController::class, 'media'])->name('shoutbox.media.show');
    Route::post('shoutbox', [\App\Http\Controllers\ShoutboxController::class, 'store'])->name('shoutbox.store');
    Route::patch('shoutbox/{shout}', [\App\Http\Controllers\ShoutboxController::class, 'update'])->name('shoutbox.update');
    Route::delete('shoutbox/{shout}', [\App\Http\Controllers\ShoutboxController::class, 'destroy'])->name('shoutbox.destroy');

    Route::get('markdown', [\App\Http\Controllers\MarkdownController::class, 'index'])->name('markdown.index');
    Route::get('markdown/create', [\App\Http\Controllers\MarkdownController::class, 'create'])->name('markdown.create');
    Route::post('markdown', [\App\Http\Controllers\MarkdownController::class, 'store'])->name('markdown.store');
    Route::post('markdown/import', [\App\Http\Controllers\MarkdownController::class, 'import'])->name('markdown.import');
    Route::post('markdown/upload-image', [\App\Http\Controllers\MarkdownController::class, 'uploadImage'])->name('markdown.upload-image');
    Route::get('markdown/content-media/{media:uuid}', [\App\Http\Controllers\MarkdownController::class, 'contentMedia'])
        ->name('markdown.content-media.show');
    Route::get('api/markdown/search', [\App\Http\Controllers\MarkdownController::class, 'search'])->name('markdown.search');
    Route::get('api/markdown/slug-availability', [\App\Http\Controllers\MarkdownController::class, 'slugAvailability'])
        ->name('markdown.slug-availability');
    Route::get('api/topics/search', [\App\Http\Controllers\MarkdownController::class, 'searchTopics'])->name('topics.search');
    Route::post('api/markdown/translate', [\App\Http\Controllers\MarkdownController::class, 'translate'])->name('markdown.translate');
    Route::post('api/markdown/convert', [\App\Http\Controllers\MarkdownController::class, 'convertToMarkdown'])->name('markdown.convert');
    Route::post('api/markdown/convert-table', [\App\Http\Controllers\MarkdownController::class, 'convertToTable'])->name('markdown.convert-table');
    Route::get('markdown/{document:slug}/revisions', [\App\Http\Controllers\MarkdownController::class, 'revisions'])
        ->where('document', '.*')
        ->name('markdown.revisions');
    Route::post('markdown/{document:slug}/revisions/{revision}/restore', [\App\Http\Controllers\MarkdownController::class, 'restore'])
        ->where('document', '.*')
        ->name('markdown.restore');
    Route::post('markdown/export', [\App\Http\Controllers\MarkdownController::class, 'exportBulk'])->name('markdown.export-bulk');
    Route::post('markdown/delete', [\App\Http\Controllers\MarkdownController::class, 'destroyBulk'])->name('markdown.destroy-bulk');
    Route::post('markdown/status', [\App\Http\Controllers\MarkdownController::class, 'updateStatusBulk'])->name('markdown.status-bulk');
    Route::get('markdown/{slug}/export', [\App\Http\Controllers\MarkdownController::class, 'export'])->where('slug', '.*')->name('markdown.export');
    Route::get('markdown/{slug}/edit', [\App\Http\Controllers\MarkdownController::class, 'edit'])->where('slug', '.*')->name('markdown.edit');
    Route::patch('markdown/{slug}', [\App\Http\Controllers\MarkdownController::class, 'update'])->where('slug', '.*')->name('markdown.update');
    Route::match(['get', 'post'], 'markdown/{slug}/move', [\App\Http\Controllers\MarkdownController::class, 'move'])->where('slug', '.*')->name('markdown.move');
    Route::delete('markdown/{slug}', [\App\Http\Controllers\MarkdownController::class, 'destroy'])->where('slug', '.*')->name('markdown.destroy');
    Route::get('markdown/{slug}', [\App\Http\Controllers\MarkdownController::class, 'show'])->where('slug', '.*')->name('markdown.show');

    // OGP API
    Route::get('api/ogp', [\App\Http\Controllers\Api\OgpController::class, 'fetch'])->name('api.ogp.fetch');
});

require __DIR__.'/settings.php';
