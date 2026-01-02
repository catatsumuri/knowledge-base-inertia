<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shout extends Model
{
    use HasFactory;

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
}
