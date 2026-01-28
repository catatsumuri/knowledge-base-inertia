<?php

namespace App\Http\Controllers;

use App\Concerns\HandlesTweetMedia;
use App\Http\Requests\TweetStoreRequest;
use App\Jobs\FetchTweetJob;
use App\Models\Shout;
use App\Models\Tweet;
use App\Models\TweetFetchJob as TweetFetchJobModel;
use App\Services\XApiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class TweetController extends Controller
{
    use HandlesTweetMedia;

    /**
     * Display a listing of saved tweets.
     */
    public function index(): Response
    {
        $tweets = Inertia::scroll(fn () => Tweet::query()
            ->latest('fetched_at')
            ->paginate(12)
            ->through(fn (Tweet $tweet) => [
                'id' => $tweet->id,
                'tweet_id' => $tweet->tweet_id,
                'text' => $tweet->text ?? $tweet->payload['data']['text'] ?? '',
                'author' => $tweet->payload['includes']['users'][0] ?? null,
                'media' => $this->formatMediaForDisplay($tweet),
                'public_metrics' => $tweet->payload['data']['public_metrics'] ?? null,
                'created_at' => $tweet->tweet_created_at?->toISOString()
                    ?? $tweet->payload['data']['created_at'] ?? null,
                'fetched_at' => $tweet->fetched_at?->toISOString(),
            ]));

        return Inertia::render('tweets/index', [
            'tweets' => $tweets,
        ]);
    }

    /**
     * Store a newly fetched tweet in storage.
     */
    public function store(TweetStoreRequest $request, XApiService $xApiService): RedirectResponse
    {
        $input = $request->validated()['tweet_input'];
        $tweetId = $xApiService->extractTweetId($input);

        if ($tweetId === null) {
            return redirect()->back()->withErrors([
                'tweet_input' => __('Please enter a valid tweet ID or URL'),
            ]);
        }

        // 既存ツイートチェック（キャッシュから即座に返す）
        $existingTweet = Tweet::where('tweet_id', $tweetId)->first();
        if ($existingTweet !== null) {
            // fetched_atを更新して最新化
            $existingTweet->update(['fetched_at' => now()]);

            return redirect()->back()->with([
                'message' => __('This tweet was already saved.'),
            ]);
        }

        // 処理中・待機中のジョブがあるかチェック
        $pendingJob = TweetFetchJobModel::where('tweet_id', $tweetId)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if ($pendingJob !== null) {
            return redirect()->back()->with([
                'message' => __('This tweet is already being fetched.'),
            ]);
        }

        // ジョブレコード作成
        $jobRecord = TweetFetchJobModel::create([
            'tweet_id' => $tweetId,
            'status' => 'pending',
        ]);

        // 前回成功時刻を確認してレート制限を考慮
        $lastSuccess = \Illuminate\Support\Facades\Cache::get('x_api_last_success');
        $delaySeconds = 0;

        if ($lastSuccess !== null) {
            $lastSuccessTime = \Illuminate\Support\Carbon::parse($lastSuccess);
            $nextAvailableTime = $lastSuccessTime->addMinutes(15);
            $now = now();

            if ($now->lessThan($nextAvailableTime)) {
                // まだ15分経過していない場合は遅延
                $delaySeconds = $nextAvailableTime->diffInSeconds($now) + 5;

                $jobRecord->update([
                    'rate_limit_reset_at' => $nextAvailableTime,
                ]);
            }
        }

        // ジョブをキューにディスパッチ（遅延あり/なし）
        if ($delaySeconds > 0) {
            FetchTweetJob::dispatch($jobRecord, $tweetId)->delay($delaySeconds);
        } else {
            FetchTweetJob::dispatch($jobRecord, $tweetId);
        }

        return redirect()->back()->with([
            'message' => __('Tweet fetch has been queued.'),
        ]);
    }

    public function moveToShoutbox(Request $request, Tweet $tweet): RedirectResponse
    {
        $shouldDeleteOriginal = $request->boolean('delete_original', true);
        $pageMentions = trim((string) $request->input('page_mentions', ''));
        $content = $tweet->text ?? $tweet->payload['data']['text'] ?? '';
        $mediaEntries = $this->extractShoutMediaEntries($tweet);
        $mediaEntries = array_slice($mediaEntries, 0, 4);

        $contentWithMentions = $content;
        if ($pageMentions !== '') {
            $contentWithMentions = trim($contentWithMentions) === ''
                ? $pageMentions
                : rtrim($contentWithMentions)."\n\n".$pageMentions;
        }

        if (trim($contentWithMentions) === '' && $mediaEntries === []) {
            return redirect()->back()->withErrors([
                'tweet' => __('This tweet has no text or media to post.'),
            ]);
        }

        $shout = Shout::create([
            'user_id' => $request->user()->id,
            'parent_id' => null,
            'content' => $contentWithMentions,
            'images' => null,
            'image_metadata' => null,
        ]);

        foreach ($mediaEntries as $entry) {
            $mediaId = $entry['media_id'] ?? null;
            $sourceUrl = $entry['source_url'] ?? null;

            if ($mediaId !== null) {
                $media = Media::query()->find($mediaId);
                if ($media !== null && $media->model_type === Tweet::class && $media->model_id === $tweet->id) {
                    if (str_starts_with((string) $media->mime_type, 'image/')) {
                        $shout->addMedia($media->getPath())->toMediaCollection('images');

                        continue;
                    }
                }
            }

            if (is_string($sourceUrl) && $sourceUrl !== '') {
                $shout->addMediaFromUrl($sourceUrl)->toMediaCollection('images');
            }
        }

        $this->saveMentionedLinks($shout, $shout->content);

        if ($shouldDeleteOriginal) {
            $tweet->delete();
        }

        return redirect()->route('shoutbox.index');
    }

    /**
     * Remove the specified tweet from storage.
     */
    public function destroy(Tweet $tweet): RedirectResponse
    {
        $tweet->delete();

        return redirect()->back();
    }

    /**
     * Get active fetch jobs for progress display.
     */
    public function fetchJobs(): \Illuminate\Http\JsonResponse
    {
        $jobs = TweetFetchJobModel::query()
            ->whereIn('status', ['pending', 'processing', 'failed'])
            ->latest('updated_at')
            ->limit(20)
            ->get()
            ->map(fn (TweetFetchJobModel $job) => [
                'id' => $job->id,
                'tweet_id' => $job->tweet_id,
                'status' => $job->status,
                'error_message' => $job->error_message,
                'rate_limit_reset_at' => $job->rate_limit_reset_at?->toISOString(),
                'created_at' => $job->created_at->toISOString(),
            ]);

        return response()->json(['jobs' => $jobs]);
    }

    /**
     * Retry a failed fetch job.
     */
    public function retryFetchJob(int $jobId): RedirectResponse
    {
        $jobRecord = TweetFetchJobModel::find($jobId);

        if ($jobRecord === null) {
            return redirect()->back()->withErrors([
                'job' => __('Job not found.'),
            ]);
        }

        if ($jobRecord->status !== 'failed') {
            return redirect()->back()->withErrors([
                'job' => __('Only failed jobs can be retried.'),
            ]);
        }

        // ステータスをpendingにリセット
        $jobRecord->update([
            'status' => 'pending',
            'error_message' => null,
            'rate_limit_reset_at' => null,
        ]);

        // 前回成功時刻を確認してレート制限を考慮
        $lastSuccess = \Illuminate\Support\Facades\Cache::get('x_api_last_success');
        $delaySeconds = 0;

        if ($lastSuccess !== null) {
            $lastSuccessTime = \Illuminate\Support\Carbon::parse($lastSuccess);
            $nextAvailableTime = $lastSuccessTime->addMinutes(15);
            $now = now();

            if ($now->lessThan($nextAvailableTime)) {
                // まだ15分経過していない場合は遅延
                $delaySeconds = $nextAvailableTime->diffInSeconds($now) + 5;

                $jobRecord->update([
                    'rate_limit_reset_at' => $nextAvailableTime,
                ]);
            }
        }

        // 新しいジョブをディスパッチ（遅延あり/なし）
        if ($delaySeconds > 0) {
            FetchTweetJob::dispatch($jobRecord, $jobRecord->tweet_id)->delay($delaySeconds);
        } else {
            FetchTweetJob::dispatch($jobRecord, $jobRecord->tweet_id);
        }

        return redirect()->back()->with([
            'message' => __('Job has been queued for retry.'),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function extractShoutMediaEntries(Tweet $tweet): array
    {
        $mediaEntries = $tweet->media_metadata ?? [];
        if (! is_array($mediaEntries) || $mediaEntries === []) {
            $mediaEntries = $tweet->payload['includes']['media'] ?? [];
        }

        $entries = [];

        foreach ($mediaEntries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $type = $entry['type'] ?? null;
            $sourceUrl = $entry['source_url'] ?? $entry['url'] ?? null;
            $previewUrl = $entry['preview_image_url'] ?? null;

            if ($type === 'video' || $type === 'animated_gif') {
                $sourceUrl = $previewUrl;
            }

            $entries[] = [
                'media_id' => $entry['media_id'] ?? null,
                'source_url' => $sourceUrl,
                'type' => $type,
            ];
        }

        return array_values(array_filter($entries, fn ($entry) => $entry['source_url'] !== null));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function formatMediaForDisplay(Tweet $tweet): array
    {
        $mediaEntries = $tweet->media_metadata ?? $tweet->payload['includes']['media'] ?? [];
        if (! is_array($mediaEntries)) {
            return [];
        }

        $formatted = [];
        foreach ($mediaEntries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $type = $entry['type'] ?? null;
            $url = $entry['source_url'] ?? $entry['url'] ?? null;
            if ($type === 'video' || $type === 'animated_gif') {
                $url = $entry['preview_image_url'] ?? $url;
            }

            if ($url !== null) {
                $formatted[] = [
                    'media_key' => $entry['media_key'] ?? ($entry['media_id'] ?? Str::random(8)),
                    'type' => $type,
                    'url' => $url,
                    'preview_image_url' => $entry['preview_image_url'] ?? null,
                    'width' => $entry['width'] ?? null,
                    'height' => $entry['height'] ?? null,
                ];
            }
        }

        return $formatted;
    }

    private function saveMentionedLinks(Shout $shout, ?string $content): void
    {
        if (empty($content)) {
            return;
        }

        preg_match_all('/@([a-zA-Z0-9_\-\/]+)/', $content, $matches);

        if (empty($matches[1])) {
            return;
        }

        $slugs = array_unique($matches[1]);
        foreach ($slugs as $slug) {
            $shout->links()->create([
                'slug' => $slug,
            ]);
        }
    }
}
