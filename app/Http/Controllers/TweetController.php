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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TweetController extends Controller
{
    use HandlesTweetMedia;

    /**
     * Display a listing of saved tweets.
     */
    public function index(): Response
    {
        $tweets = Inertia::scroll(fn () => Tweet::query()
            ->with(['parent' => fn ($query) => $query->withTrashed()])
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
                'reply_to_tweet_id' => $this->extractRepliedToId($tweet),
                'parent' => $tweet->parent === null ? null : [
                    'id' => $tweet->parent->id,
                    'tweet_id' => $tweet->parent->tweet_id,
                    'text' => $tweet->parent->text ?? $tweet->parent->payload['data']['text'] ?? '',
                    'author' => $tweet->parent->payload['includes']['users'][0] ?? null,
                    'media' => $this->formatMediaForDisplay($tweet->parent),
                    'created_at' => $tweet->parent->tweet_created_at?->toISOString()
                        ?? $tweet->parent->payload['data']['created_at'] ?? null,
                ],
            ]));

        return Inertia::render('tweets/index', [
            'tweets' => $tweets,
            'archivedCount' => Tweet::onlyTrashed()->count(),
        ]);
    }

    /**
     * Display a listing of archived tweets.
     */
    public function archive(): Response
    {
        $tweets = Inertia::scroll(fn () => Tweet::onlyTrashed()
            ->with(['parent' => fn ($query) => $query->withTrashed()])
            ->latest('deleted_at')
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
                'deleted_at' => $tweet->deleted_at?->toISOString(),
                'reply_to_tweet_id' => $this->extractRepliedToId($tweet),
                'parent' => $tweet->parent === null ? null : [
                    'id' => $tweet->parent->id,
                    'tweet_id' => $tweet->parent->tweet_id,
                    'text' => $tweet->parent->text ?? $tweet->parent->payload['data']['text'] ?? '',
                    'author' => $tweet->parent->payload['includes']['users'][0] ?? null,
                    'media' => $this->formatMediaForDisplay($tweet->parent),
                    'created_at' => $tweet->parent->tweet_created_at?->toISOString()
                        ?? $tweet->parent->payload['data']['created_at'] ?? null,
                ],
            ]));

        return Inertia::render('tweets/archive', [
            'tweets' => $tweets,
        ]);
    }

    /**
     * Display a listing of all tweets, including archived ones.
     */
    public function listAll(): Response
    {
        $tweets = Inertia::scroll(fn () => Tweet::withTrashed()
            ->with(['parent' => fn ($query) => $query->withTrashed()])
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
                'deleted_at' => $tweet->deleted_at?->toISOString(),
                'reply_to_tweet_id' => $this->extractRepliedToId($tweet),
                'parent' => $tweet->parent === null ? null : [
                    'id' => $tweet->parent->id,
                    'tweet_id' => $tweet->parent->tweet_id,
                    'text' => $tweet->parent->text ?? $tweet->parent->payload['data']['text'] ?? '',
                    'author' => $tweet->parent->payload['includes']['users'][0] ?? null,
                    'media' => $this->formatMediaForDisplay($tweet->parent),
                    'created_at' => $tweet->parent->tweet_created_at?->toISOString()
                        ?? $tweet->parent->payload['data']['created_at'] ?? null,
                ],
            ]));

        return Inertia::render('tweets/list', [
            'tweets' => $tweets,
        ]);
    }

    /**
     * Store a newly fetched tweet in storage.
     */
    public function store(TweetStoreRequest $request, XApiService $xApiService): RedirectResponse
    {
        $validated = $request->validated();
        $input = $validated['tweet_input'];
        $tweetId = $xApiService->extractTweetId($input);

        if ($tweetId === null) {
            return redirect()->back()->withErrors([
                'tweet_input' => __('Please enter a valid tweet ID or URL'),
            ]);
        }

        // 既存ツイートチェック（キャッシュから即座に返す）
        $existingTweet = Tweet::withTrashed()->where('tweet_id', $tweetId)->first();
        if ($existingTweet !== null) {
            $wasTrashed = $existingTweet->trashed();
            if ($wasTrashed) {
                $existingTweet->restore();
            }
            // fetched_atを更新して最新化
            $existingTweet->update(['fetched_at' => now()]);

            return redirect()->back()->with([
                'message' => $wasTrashed
                    ? __('This tweet was restored from archive.')
                    : __('This tweet was already saved.'),
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
            FetchTweetJob::dispatch($jobRecord->id, $tweetId)->delay($delaySeconds);
        } else {
            FetchTweetJob::dispatch($jobRecord->id, $tweetId);
        }

        Log::channel('tweet_queue')->debug('Tweet fetch job queued', [
            'tweet_id' => $tweetId,
            'job_id' => $jobRecord->id,
            'delay_seconds' => $delaySeconds,
            'queue_connection' => config('queue.default'),
            'queue_name' => config('queue.connections.'.config('queue.default').'.queue'),
            'request_path' => $request->path(),
        ]);

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
     * Archive the specified tweet.
     */
    public function destroy(Tweet $tweet): RedirectResponse
    {
        $tweet->delete();

        return redirect()->back()->with([
            'message' => __('Tweet archived.'),
        ]);
    }

    /**
     * Restore an archived tweet.
     */
    public function restore(Tweet $tweet): RedirectResponse
    {
        if ($tweet->trashed()) {
            $tweet->restore();
        }

        return redirect()->back()->with([
            'message' => __('Tweet restored.'),
        ]);
    }

    /**
     * Permanently delete an archived tweet.
     */
    public function forceDestroy(Tweet $tweet): RedirectResponse
    {
        $tweet->forceDelete();

        return redirect()->back()->with([
            'message' => __('Tweet deleted permanently.'),
        ]);
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
     * Export all tweets (including archived) as JSON.
     */
    public function export(Request $request): StreamedResponse|RedirectResponse
    {
        $idsInput = $request->input('ids', '');
        $ids = [];

        if (is_string($idsInput) && $idsInput !== '') {
            $ids = array_filter(
                array_map('intval', explode(',', $idsInput)),
                fn (int $id) => $id > 0
            );
        } elseif (is_array($idsInput)) {
            $ids = array_filter(
                array_map('intval', $idsInput),
                fn (int $id) => $id > 0
            );
        }

        $ids = array_values(array_unique($ids));

        if ($ids === []) {
            return redirect()->back()->withErrors([
                'export' => __('Please select tweets to export.'),
            ]);
        }

        $tweets = Tweet::withTrashed()
            ->whereIn('id', $ids)
            ->orderBy('id')
            ->get();

        $filename = 'tweets-export.json';
        $total = $tweets->count();
        if ($total === 1) {
            $tweet = $tweets->first();
            $author = $tweet?->payload['includes']['users'][0]['username'] ?? 'tweet';
            $safeAuthor = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $author) ?: 'tweet';
            $safeTweetId = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) ($tweet?->tweet_id ?? ''));
            $filename = $safeAuthor.'-'.$safeTweetId.'.json';
        } elseif ($total > 1) {
            $tweet = $tweets->first();
            $author = $tweet?->payload['includes']['users'][0]['username'] ?? 'tweets';
            $safeAuthor = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $author) ?: 'tweets';
            $safeTweetId = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) ($tweet?->tweet_id ?? ''));
            $filename = $safeAuthor.'-'.$safeTweetId.'-plus-'.($total - 1).'.json';
        }

        $payload = [
            'version' => 1,
            'exported_at' => now()->toISOString(),
            'tweets' => $tweets
                ->map(fn (Tweet $tweet) => [
                    'tweet_id' => $tweet->tweet_id,
                    'payload' => $tweet->payload ?? [],
                    'fetched_at' => $tweet->fetched_at?->toISOString(),
                    'text' => $tweet->text,
                    'author_id' => $tweet->author_id,
                    'lang' => $tweet->lang,
                    'tweet_created_at' => $tweet->tweet_created_at?->toISOString(),
                    'media_metadata' => $tweet->media_metadata ?? [],
                    'reply_count' => $tweet->reply_count,
                    'deleted_at' => $tweet->deleted_at?->toISOString(),
                ])
                ->values()
                ->all(),
        ];

        return response()->streamDownload(function () use ($payload) {
            echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }, $filename, [
            'Content-Type' => 'application/json',
        ]);
    }

    /**
     * Permanently delete selected tweets (including archived).
     */
    public function bulkForceDelete(Request $request): RedirectResponse
    {
        $idsInput = $request->input('ids', '');
        $ids = [];

        if (is_string($idsInput) && $idsInput !== '') {
            $ids = array_filter(
                array_map('intval', explode(',', $idsInput)),
                fn (int $id) => $id > 0
            );
        } elseif (is_array($idsInput)) {
            $ids = array_filter(
                array_map('intval', $idsInput),
                fn (int $id) => $id > 0
            );
        }

        $ids = array_values(array_unique($ids));

        if ($ids === []) {
            return redirect()->back()->withErrors([
                'bulk_delete' => __('Please select tweets to delete.'),
            ]);
        }

        Tweet::withTrashed()->whereIn('id', $ids)->forceDelete();

        return redirect()->back()->with([
            'message' => __('Selected tweets deleted permanently.'),
        ]);
    }

    /**
     * Import tweets from JSON export.
     */
    public function import(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:json', 'max:20480'],
        ]);

        $file = $validated['import_file'];
        $contents = file_get_contents($file->getRealPath());

        if (! is_string($contents) || trim($contents) === '') {
            return redirect()->back()->withErrors([
                'import_file' => __('Invalid import file.'),
            ]);
        }

        $decoded = json_decode($contents, true);
        if (! is_array($decoded) || ! isset($decoded['tweets']) || ! is_array($decoded['tweets'])) {
            return redirect()->back()->withErrors([
                'import_file' => __('Invalid import file.'),
            ]);
        }

        $imported = 0;
        $skipped = 0;

        foreach ($decoded['tweets'] as $item) {
            if (! is_array($item) || empty($item['tweet_id'])) {
                $skipped++;

                continue;
            }

            $tweetId = (string) $item['tweet_id'];
            $payload = is_array($item['payload'] ?? null) ? $item['payload'] : [];

            $tweet = Tweet::withTrashed()->where('tweet_id', $tweetId)->first();
            if ($tweet === null) {
                $tweet = new Tweet(['tweet_id' => $tweetId]);
            }

            $tweet->forceFill([
                'payload' => $payload,
                'fetched_at' => isset($item['fetched_at']) ? \Illuminate\Support\Carbon::parse($item['fetched_at']) : null,
                'text' => $item['text'] ?? null,
                'author_id' => $item['author_id'] ?? null,
                'lang' => $item['lang'] ?? null,
                'tweet_created_at' => isset($item['tweet_created_at'])
                    ? \Illuminate\Support\Carbon::parse($item['tweet_created_at'])
                    : null,
                'media_metadata' => is_array($item['media_metadata'] ?? null) ? $item['media_metadata'] : null,
                'reply_count' => isset($item['reply_count']) ? (int) $item['reply_count'] : null,
            ]);

            if (! empty($item['deleted_at'])) {
                $tweet->deleted_at = \Illuminate\Support\Carbon::parse($item['deleted_at']);
            } else {
                $tweet->deleted_at = null;
            }

            $tweet->save();
            $imported++;
        }

        return redirect()->back()->with([
            'message' => __('Tweets imported.'),
            'imported' => $imported,
            'skipped' => $skipped,
        ]);
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
            FetchTweetJob::dispatch($jobRecord->id, $jobRecord->tweet_id)->delay($delaySeconds);
        } else {
            FetchTweetJob::dispatch($jobRecord->id, $jobRecord->tweet_id);
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

    private function extractRepliedToId(Tweet $tweet): ?string
    {
        $referencedTweets = $tweet->payload['data']['referenced_tweets'] ?? null;
        if (! is_array($referencedTweets) || $referencedTweets === []) {
            return null;
        }

        $repliedTo = collect($referencedTweets)->firstWhere('type', 'replied_to');
        if (! is_array($repliedTo) || ! isset($repliedTo['id'])) {
            return null;
        }

        return (string) $repliedTo['id'];
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
