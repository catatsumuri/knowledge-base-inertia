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
        Schema::table('tweets', function (Blueprint $table) {
            $table->foreignId('parent_tweet_id')->nullable()->after('id')->constrained('tweets')->nullOnDelete();
            $table->index('parent_tweet_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tweets', function (Blueprint $table) {
            $table->dropForeign(['parent_tweet_id']);
            $table->dropIndex(['parent_tweet_id']);
            $table->dropColumn('parent_tweet_id');
        });
    }
};
