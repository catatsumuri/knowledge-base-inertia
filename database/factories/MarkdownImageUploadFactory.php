<?php

namespace Database\Factories;

use App\Models\MarkdownImageUpload;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MarkdownImageUpload>
 */
class MarkdownImageUploadFactory extends Factory
{
    protected $model = MarkdownImageUpload::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'path' => 'markdown-images/'.$this->faker->uuid.'.jpg',
            'metadata' => [
                'make' => $this->faker->company,
                'model' => $this->faker->word,
                'datetime_original' => $this->faker->dateTime->format('Y:m:d H:i:s'),
                'orientation' => $this->faker->randomElement([1, 3, 6, 8]),
                'gps' => [
                    'latitude' => $this->faker->latitude,
                    'longitude' => $this->faker->longitude,
                    'latitude_ref' => 'N',
                    'longitude_ref' => 'E',
                ],
            ],
        ];
    }
}
