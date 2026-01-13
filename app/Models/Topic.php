<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Topic extends Model
{
    /** @use HasFactory<\Database\Factories\TopicFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
    ];

    /**
     * Get the markdown documents associated with this topic.
     */
    public function markdownDocuments(): BelongsToMany
    {
        return $this->belongsToMany(MarkdownDocument::class, 'markdown_document_topic')
            ->withTimestamps();
    }

    /**
     * Get or create a topic by name.
     */
    public static function findOrCreateByName(string $name): self
    {
        $slug = Str::slug($name);

        return static::query()
            ->where('slug', $slug)
            ->firstOrCreate(
                ['slug' => $slug],
                ['name' => $name]
            );
    }
}
