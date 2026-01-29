<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class MarkdownNavigationItem extends Model implements HasMedia
{
    use InteractsWithMedia;

    private const EYECATCH_LIGHT = 'eyecatch_light';

    private const EYECATCH_DARK = 'eyecatch_dark';

    private const EYECATCH_LEGACY = 'eyecatch';

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

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::EYECATCH_LIGHT)
            ->singleFile()
            ->useDisk('markdown-media');

        $this->addMediaCollection(self::EYECATCH_DARK)
            ->singleFile()
            ->useDisk('markdown-media');

        $this->addMediaCollection(self::EYECATCH_LEGACY)
            ->singleFile()
            ->useDisk('markdown-media');
    }

    public function eyecatchUrl(string $collection = self::EYECATCH_LIGHT): ?string
    {
        $media = $this->getFirstMedia($collection);

        if (! $media) {
            return null;
        }

        return route('markdown.media.show', $media);
    }

    public function eyecatchLightUrl(): ?string
    {
        return $this->eyecatchUrl(self::EYECATCH_LIGHT)
            ?? $this->eyecatchUrl(self::EYECATCH_LEGACY);
    }

    public function eyecatchDarkUrl(): ?string
    {
        return $this->eyecatchUrl(self::EYECATCH_DARK)
            ?? $this->eyecatchUrl(self::EYECATCH_LEGACY);
    }
}
