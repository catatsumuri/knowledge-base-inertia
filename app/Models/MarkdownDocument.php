<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MarkdownDocument extends Model implements HasMedia
{
    /** @use HasFactory<\Database\Factories\MarkdownDocumentFactory> */
    use HasFactory;

    use InteractsWithMedia;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'slug',
        'title',
        'content',
        'status',
        'is_home_page',
        'created_by',
        'updated_by',
    ];

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Get the user who created this document.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this document.
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the revisions for this document.
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(MarkdownDocumentRevision::class, 'markdown_document_id');
    }

    /**
     * Get the topics associated with this document.
     */
    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class, 'markdown_document_topic')
            ->withTimestamps()
            ->orderBy('name');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('eyecatch')
            ->singleFile()
            ->useDisk('markdown-media');

        $this->addMediaCollection('content-images')
            ->useDisk('markdown-media');
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 46, 46)
            ->performOnCollections('eyecatch')
            ->nonQueued();
    }

    public function eyecatchUrl(): ?string
    {
        $media = $this->getFirstMedia('eyecatch');

        if (! $media) {
            return null;
        }

        return route('markdown.media.show', $media);
    }

    public function eyecatchThumbUrl(): ?string
    {
        $media = $this->getFirstMedia('eyecatch');

        if (! $media) {
            return null;
        }

        return route('markdown.media.show', [
            'media' => $media,
            'conversion' => 'thumb',
        ]);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_home_page' => 'boolean',
        ];
    }

    /**
     * Get the home page document.
     */
    public static function getHomePage(): ?self
    {
        return static::query()
            ->where('is_home_page', true)
            ->first();
    }

    /**
     * Check if a home page document exists.
     */
    public static function hasHomePage(): bool
    {
        return static::query()
            ->where('is_home_page', true)
            ->exists();
    }
}
