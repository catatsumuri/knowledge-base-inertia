<?php

namespace Tests\Unit;

use Tests\TestCase;

class AppSettingsTranslationsTest extends TestCase
{
    public function test_app_settings_translation_keys_exist_in_starter_kit_json(): void
    {
        $keys = [
            'Application settings',
            'Manage application-level configuration.',
            'Markdown export',
            'Export all markdown documents as a zip file using their paths.',
            'Export all',
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
