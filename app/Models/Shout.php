<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Shout extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;

    protected $fillable = [
        'user_id',
        'parent_id',
        'content',
        'images',
        'image_metadata',
    ];

    protected $casts = [
        'images' => 'array',
        'image_metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(ShoutLink::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Shout::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Shout::class, 'parent_id');
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->useDisk('shoutbox-media');
    }

    /**
     * @return array<string, mixed>
     */
    public function toInertiaArray(): array
    {
        $images = $this->getMedia('images')
            ->map(fn (Media $media) => route('shoutbox.media.show', $media))
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'parent_id' => $this->parent_id,
            'content' => $this->content,
            'images' => $images === [] ? null : $images,
            'created_at' => $this->created_at?->toISOString(),
            'user' => $this->relationLoaded('user') ? $this->user : null,
            'links' => $this->relationLoaded('links') ? $this->links : [],
            'replies' => $this->relationLoaded('replies')
                ? $this->replies->map(
                    fn (Shout $reply) => $reply->toInertiaArray()
                )->values()->all()
                : [],
        ];
    }
}
