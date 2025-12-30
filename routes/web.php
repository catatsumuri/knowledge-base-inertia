<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('sitemap', [\App\Http\Controllers\SitemapController::class, 'index'])->name('sitemap');

    Route::get('shoutbox', [\App\Http\Controllers\ShoutboxController::class, 'index'])->name('shoutbox.index');
    Route::post('shoutbox', [\App\Http\Controllers\ShoutboxController::class, 'store'])->name('shoutbox.store');
    Route::patch('shoutbox/{shout}', [\App\Http\Controllers\ShoutboxController::class, 'update'])->name('shoutbox.update');
    Route::delete('shoutbox/{shout}', [\App\Http\Controllers\ShoutboxController::class, 'destroy'])->name('shoutbox.destroy');

    Route::get('markdown', [\App\Http\Controllers\MarkdownController::class, 'index'])->name('markdown.index');
    Route::get('markdown/create', [\App\Http\Controllers\MarkdownController::class, 'create'])->name('markdown.create');
    Route::post('markdown', [\App\Http\Controllers\MarkdownController::class, 'store'])->name('markdown.store');
    Route::post('markdown/upload-image', [\App\Http\Controllers\MarkdownController::class, 'uploadImage'])->name('markdown.upload-image');
    Route::get('api/markdown/search', [\App\Http\Controllers\MarkdownController::class, 'search'])->name('markdown.search');
    Route::get('markdown/{slug}/edit', [\App\Http\Controllers\MarkdownController::class, 'edit'])->where('slug', '.*')->name('markdown.edit');
    Route::patch('markdown/{slug}', [\App\Http\Controllers\MarkdownController::class, 'update'])->where('slug', '.*')->name('markdown.update');
    Route::delete('markdown/{slug}', [\App\Http\Controllers\MarkdownController::class, 'destroy'])->where('slug', '.*')->name('markdown.destroy');
    Route::get('markdown/{slug}', [\App\Http\Controllers\MarkdownController::class, 'show'])->where('slug', '.*')->name('markdown.show');

    // OGP API
    Route::get('api/ogp', [\App\Http\Controllers\Api\OgpController::class, 'fetch'])->name('api.ogp.fetch');
});

require __DIR__.'/settings.php';
