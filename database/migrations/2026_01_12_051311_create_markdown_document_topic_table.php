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
        Schema::create('markdown_document_topic', function (Blueprint $table) {
            $table->id();
            $table->foreignId('markdown_document_id')
                ->constrained('markdown_documents')
                ->cascadeOnDelete();
            $table->foreignId('topic_id')
                ->constrained('topics')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['markdown_document_id', 'topic_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('markdown_document_topic');
    }
};
