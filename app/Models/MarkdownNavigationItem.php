<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarkdownNavigationItem extends Model
{
    protected $fillable = [
        'node_type',
        'node_path',
        'parent_path',
        'position',
        'label',
    ];

    protected $casts = [
        'position' => 'integer',
    ];
}
