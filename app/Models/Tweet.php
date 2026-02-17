<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Tweet extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;
    use SoftDeletes;

    protected $fillable = [
        'tweet_id',
        'payload',
        'fetched_at',
        'text',
        'author_id',
        'lang',
        'tweet_created_at',
        'media_metadata',
        'parent_tweet_id',
        'response_status',
        'response_headers',
        'reply_count',
        'tags',
    ];

    protected $casts = [
        'payload' => 'array',
        'fetched_at' => 'datetime',
        'tweet_created_at' => 'datetime',
        'media_metadata' => 'array',
        'deleted_at' => 'datetime',
        'response_status' => 'integer',
        'response_headers' => 'array',
        'reply_count' => 'integer',
        'tags' => 'array',
    ];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('media')
            ->useDisk('tweet-media');
    }

    /**
     * 親ツイート（返信先）
     */
    public function parent(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tweet::class, 'parent_tweet_id');
    }

    /**
     * 返信ツイート（このツイートへの返信）
     */
    public function replies(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Tweet::class, 'parent_tweet_id');
    }
}
