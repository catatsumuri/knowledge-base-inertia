<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Tweet extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;

    protected $fillable = [
        'tweet_id',
        'payload',
        'fetched_at',
        'text',
        'author_id',
        'lang',
        'tweet_created_at',
        'media_metadata',
    ];

    protected $casts = [
        'payload' => 'array',
        'fetched_at' => 'datetime',
        'tweet_created_at' => 'datetime',
        'media_metadata' => 'array',
    ];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('media')
            ->useDisk('tweet-media');
    }
}
