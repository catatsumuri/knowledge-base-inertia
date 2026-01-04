<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarkdownDocumentRevision extends Model
{
    /** @use HasFactory<\Database\Factories\MarkdownDocumentRevisionFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'markdown_document_id',
        'title',
        'content',
        'edited_by',
    ];

    /**
     * Get the document this revision belongs to.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(MarkdownDocument::class, 'markdown_document_id');
    }

    /**
     * Get the user who created this revision.
     */
    public function editedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }
}
