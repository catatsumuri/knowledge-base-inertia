<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tweets', function (Blueprint $table) {
            $table->longText('text')->nullable()->after('tweet_id');
            $table->string('author_id')->nullable()->after('text');
            $table->string('lang', 10)->nullable()->after('author_id');
            $table->timestamp('tweet_created_at')->nullable()->after('lang');
            $table->json('media_metadata')->nullable()->after('tweet_created_at');
        });
    }

    public function down(): void
    {
        Schema::table('tweets', function (Blueprint $table) {
            $table->dropColumn([
                'text',
                'author_id',
                'lang',
                'tweet_created_at',
                'media_metadata',
            ]);
        });
    }
};
