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
        Schema::create('markdown_navigation_items', function (Blueprint $table) {
            $table->id();
            $table->string('node_type', 20);
            $table->string('node_path');
            $table->string('parent_path')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->string('label')->nullable();
            $table->timestamps();

            $table->unique(['node_type', 'node_path']);
            $table->index(['parent_path', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('markdown_navigation_items');
    }
};
