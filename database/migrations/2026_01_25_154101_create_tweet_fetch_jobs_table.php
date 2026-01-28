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
        Schema::create('tweet_fetch_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('tweet_id')->index();
            $table->string('job_uuid')->unique()->nullable();
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])
                ->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('rate_limit_reset_at')->nullable();
            $table->foreignId('tweet_record_id')
                ->nullable()
                ->constrained('tweets')
                ->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tweet_fetch_jobs');
    }
};
