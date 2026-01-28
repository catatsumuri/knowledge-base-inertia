<?php

namespace App\Concerns;

use App\Models\Tweet;
use Illuminate\Support\Str;

trait HandlesTweetMedia
{
    /**
     * @param  array<string, mixed>  $rawTweet
     * @return array<int, array<string, mixed>>
     */
    private function extractMediaEntries(array $rawTweet): array
    {
        $mediaKeys = $rawTweet['data']['attachments']['media_keys'] ?? [];
        if (! is_array($mediaKeys) || $mediaKeys === []) {
            return [];
        }

        $includesMedia = $rawTweet['includes']['media'] ?? [];
        if (! is_array($includesMedia) || $includesMedia === []) {
            return [];
        }

        $mediaByKey = [];
        foreach ($includesMedia as $mediaItem) {
            if (is_array($mediaItem) && isset($mediaItem['media_key'])) {
                $mediaByKey[$mediaItem['media_key']] = $mediaItem;
            }
        }

        $entries = [];
        foreach ($mediaKeys as $mediaKey) {
            if (! isset($mediaByKey[$mediaKey])) {
                continue;
            }

            $mediaItem = $mediaByKey[$mediaKey];
            $entries[] = [
                'media_key' => $mediaKey,
                'type' => $mediaItem['type'] ?? null,
                'source_url' => $this->resolveMediaUrl($mediaItem),
                'preview_image_url' => $mediaItem['preview_image_url'] ?? null,
                'width' => $mediaItem['width'] ?? null,
                'height' => $mediaItem['height'] ?? null,
                'alt_text' => $mediaItem['alt_text'] ?? null,
            ];
        }

        return $entries;
    }

    /**
     * @param  array<string, mixed>  $mediaItem
     */
    private function resolveMediaUrl(array $mediaItem): ?string
    {
        $type = $mediaItem['type'] ?? null;

        if ($type === 'photo') {
            return $mediaItem['url'] ?? null;
        }

        if ($type === 'video' || $type === 'animated_gif') {
            $variants = $mediaItem['variants'] ?? [];
            if (! is_array($variants)) {
                return $mediaItem['preview_image_url'] ?? null;
            }

            $videoVariants = array_values(array_filter($variants, function ($variant) {
                return is_array($variant)
                    && ($variant['content_type'] ?? null) === 'video/mp4'
                    && isset($variant['url']);
            }));

            if ($videoVariants === []) {
                return $mediaItem['preview_image_url'] ?? null;
            }

            usort($videoVariants, function ($left, $right) {
                return ($right['bit_rate'] ?? 0) <=> ($left['bit_rate'] ?? 0);
            });

            return $videoVariants[0]['url'] ?? null;
        }

        return $mediaItem['url'] ?? null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $mediaEntries
     * @return array<int, array<string, mixed>>
     */
    private function storeTweetMedia(Tweet $tweet, array $mediaEntries): array
    {
        if ($mediaEntries === []) {
            return $mediaEntries;
        }

        $updatedEntries = [];

        foreach ($mediaEntries as $entry) {
            $mediaKey = $entry['media_key'] ?? null;
            $sourceUrl = $entry['source_url'] ?? null;

            if ($mediaKey !== null) {
                $existingMedia = $tweet->media()
                    ->where('custom_properties->media_key', $mediaKey)
                    ->first();

                if ($existingMedia !== null) {
                    $entry['media_id'] = $existingMedia->id;
                    $updatedEntries[] = $entry;

                    continue;
                }
            }

            if (! is_string($sourceUrl) || $sourceUrl === '') {
                $updatedEntries[] = $entry;

                continue;
            }

            try {
                $fileName = $this->buildMediaFileName(
                    $tweet->tweet_id,
                    $mediaKey,
                    $sourceUrl,
                    $entry['type'] ?? null
                );

                $media = $tweet->addMediaFromUrl($sourceUrl)
                    ->usingFileName($fileName)
                    ->withCustomProperties([
                        'media_key' => $mediaKey,
                        'source_url' => $sourceUrl,
                        'type' => $entry['type'] ?? null,
                    ])
                    ->toMediaCollection('media');

                $entry['media_id'] = $media->id;
            } catch (\Throwable $e) {
                // 無視して続行（UI上で表示するため、最低限metadataだけ保持）
            }

            $updatedEntries[] = $entry;
        }

        return $updatedEntries;
    }

    private function buildMediaFileName(string $tweetId, ?string $mediaKey, string $url, ?string $type): string
    {
        $path = (string) parse_url($url, PHP_URL_PATH);
        $extension = pathinfo($path, PATHINFO_EXTENSION);

        if ($extension === '') {
            if ($type === 'video' || $type === 'animated_gif') {
                $extension = 'mp4';
            } elseif ($type === 'photo') {
                $extension = 'jpg';
            }
        }

        $suffix = $mediaKey ?? Str::random(8);
        $fileName = "tweet-{$tweetId}-{$suffix}";

        return $extension !== '' ? "{$fileName}.{$extension}" : $fileName;
    }
}
