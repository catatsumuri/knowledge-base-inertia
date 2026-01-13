<?php

namespace Database\Factories;

use App\Models\Shout;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Shout>
 */
class ShoutFactory extends Factory
{
    protected $model = Shout::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'parent_id' => null,
            'content' => $this->faker->sentence(),
            'images' => null,
            'image_metadata' => null,
        ];
    }
}
