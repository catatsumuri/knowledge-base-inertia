<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 先頭の / を削除してslugを正規化
        DB::table('markdown_documents')
            ->where('slug', 'like', '/%')
            ->get()
            ->each(function ($document) {
                DB::table('markdown_documents')
                    ->where('id', $document->id)
                    ->update([
                        'slug' => ltrim($document->slug, '/'),
                    ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // ロールバックは行わない（元の状態が不明瞭なため）
    }
};
