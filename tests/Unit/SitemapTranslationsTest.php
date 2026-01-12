<?php

namespace Tests\Unit;

use Tests\TestCase;

class SitemapTranslationsTest extends TestCase
{
    public function test_sitemap_translation_keys_exist_in_starter_kit_json(): void
    {
        $keys = [
            'Selection on',
            'Selection off',
            'Enter selection mode',
            'Exit selection mode',
            'Select all',
            'Clear selection',
            'Selected pages',
            'Export selected',
            'Select {title}',
            'Example: getting-started, api/introduction',
            'URL: /markdown/{slug}',
            'Private',
            'Published',
            'Update status',
            'Change status',
            'Change status of selected pages to {status}.',
            'Select status',
        ];

        $this->assertTranslationKeysExist('en', $keys);
        $this->assertTranslationKeysExist('ja', $keys);
    }

    private function assertTranslationKeysExist(string $locale, array $keys): void
    {
        $path = base_path("lang/{$locale}/starter-kit.json");
        $contents = file_get_contents($path);

        $this->assertNotFalse($contents);

        $translations = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

        foreach ($keys as $key) {
            $this->assertTrue(
                array_key_exists($key, $translations),
                "Missing translation key [{$key}] in [{$locale}].",
            );
        }
    }
}
