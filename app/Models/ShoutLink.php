<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShoutLink extends Model
{
    protected $fillable = [
        'shout_id',
        'slug',
    ];

    public function shout(): BelongsTo
    {
        return $this->belongsTo(Shout::class);
    }

    public function markdownDocument(): BelongsTo
    {
        return $this->belongsTo(MarkdownDocument::class, 'slug', 'slug');
    }
}
