<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tweet>
 */
class TweetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tweetId = fake()->numerify('####################');
        $authorId = fake()->numerify('####################');

        return [
            'tweet_id' => $tweetId,
            'payload' => [
                'data' => [
                    'id' => $tweetId,
                    'text' => fake()->sentence(20),
                    'created_at' => now()->subDays(rand(1, 30))->toISOString(),
                    'author_id' => $authorId,
                    'public_metrics' => [
                        'retweet_count' => rand(0, 1000),
                        'like_count' => rand(0, 5000),
                        'reply_count' => rand(0, 500),
                        'quote_count' => rand(0, 100),
                        'bookmark_count' => rand(0, 200),
                        'impression_count' => rand(100, 10000),
                    ],
                ],
                'includes' => [
                    'users' => [
                        [
                            'id' => $authorId,
                            'name' => fake()->name(),
                            'username' => fake()->userName(),
                            'profile_image_url' => 'https://via.placeholder.com/48',
                            'verified' => fake()->boolean(10),
                        ],
                    ],
                ],
            ],
            'fetched_at' => now(),
        ];
    }
}
