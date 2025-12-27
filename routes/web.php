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

    Route::get('markdown', [\App\Http\Controllers\MarkdownController::class, 'index'])->name('markdown.index');
    Route::get('markdown/create', [\App\Http\Controllers\MarkdownController::class, 'create'])->name('markdown.create');
    Route::post('markdown', [\App\Http\Controllers\MarkdownController::class, 'store'])->name('markdown.store');
    Route::post('markdown/upload-image', [\App\Http\Controllers\MarkdownController::class, 'uploadImage'])->name('markdown.upload-image');
    Route::get('markdown/{document}', [\App\Http\Controllers\MarkdownController::class, 'show'])->name('markdown.show');
    Route::get('markdown/{document}/edit', [\App\Http\Controllers\MarkdownController::class, 'edit'])->name('markdown.edit');
    Route::patch('markdown/{document}', [\App\Http\Controllers\MarkdownController::class, 'update'])->name('markdown.update');
});

require __DIR__.'/settings.php';
