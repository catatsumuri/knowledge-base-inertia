<?php

namespace Database\Seeders;

use App\Models\MarkdownImageUpload;
use Illuminate\Database\Seeder;

class MarkdownImageUploadSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        MarkdownImageUpload::factory()->count(5)->create();
    }
}
