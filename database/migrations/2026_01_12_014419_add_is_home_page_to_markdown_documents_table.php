<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('markdown_documents', function (Blueprint $table) {
            $table->boolean('is_home_page')->default(false)->after('status');
            $table->index('is_home_page');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('markdown_documents', function (Blueprint $table) {
            $table->dropIndex(['is_home_page']);
            $table->dropColumn('is_home_page');
        });
    }
};
