<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TweetFetchJob extends Model
{
    protected $fillable = [
        'tweet_id',
        'job_uuid',
        'status',
        'error_message',
        'rate_limit_reset_at',
        'tweet_record_id',
    ];

    protected function casts(): array
    {
        return [
            'rate_limit_reset_at' => 'datetime',
        ];
    }

    public function tweet(): BelongsTo
    {
        return $this->belongsTo(Tweet::class, 'tweet_record_id');
    }
}
