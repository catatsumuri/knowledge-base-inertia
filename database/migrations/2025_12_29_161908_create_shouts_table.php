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
        Schema::create('shouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('shouts')->onDelete('cascade');
            $table->text('content')->nullable();
            $table->json('images')->nullable();
            $table->timestamps();
        });

        Schema::create('shout_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shout_id')->constrained()->onDelete('cascade');
            $table->string('slug');
            $table->timestamps();

            $table->index(['shout_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shout_links');
        Schema::dropIfExists('shouts');
    }
};
