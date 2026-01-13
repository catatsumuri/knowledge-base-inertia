<?php

namespace App\Http\Controllers;

use App\Models\Shout;
use App\Models\ShoutLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ShoutboxController extends Controller
{
    public function index(): Response
    {
        $shouts = Shout::with([
            'user',
            'links',
            'media',
            'replies.user',
            'replies.links',
            'replies.media',
        ])
            ->whereNull('parent_id') // トップレベルのshoutのみ
            ->latest()
            ->paginate(20)
            ->through(fn (Shout $shout) => $shout->toInertiaArray());

        return Inertia::render('shoutbox/index', [
            'shouts' => $shouts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'parent_id' => ['nullable', 'exists:shouts,id'],
            'content' => ['nullable', 'string', 'max:1000'],
            'images' => ['nullable', 'array', 'max:4'],
            'images.*' => ['image', 'max:5120'], // 5MB max
        ]);

        // コンテンツまたは画像のいずれかが必要
        if (empty($validated['content']) && ! $request->hasFile('images')) {
            return redirect()->back()->withErrors([
                'content' => 'コンテンツまたは画像のいずれかを入力してください。',
            ]);
        }

        $shout = Shout::create([
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'content' => $validated['content'],
            'images' => null,
            'image_metadata' => null,
        ]);

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $shout->addMedia($image)->toMediaCollection('images');
            }
        }

        // @slug形式のリンクを抽出して保存
        $this->saveMentionedLinks($shout, $validated['content']);

        return redirect()->back();
    }

    public function update(Request $request, Shout $shout): RedirectResponse
    {
        // 投稿者のみ編集可能
        if ($shout->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'content' => ['nullable', 'string', 'max:1000'],
        ]);

        // コンテンツまたは画像のいずれかが必要
        if (empty($validated['content']) && empty($shout->images)) {
            return redirect()->back()->withErrors([
                'content' => 'コンテンツまたは画像のいずれかを入力してください。',
            ]);
        }

        $shout->update([
            'content' => $validated['content'],
        ]);

        // 既存のリンクを削除して新しいリンクを保存
        $shout->links()->delete();
        $this->saveMentionedLinks($shout, $validated['content']);

        return redirect()->back();
    }

    public function destroy(Request $request, Shout $shout): RedirectResponse
    {
        // 投稿者のみ削除可能
        if ($shout->user_id !== $request->user()->id) {
            abort(403);
        }

        $shout->delete();

        return redirect()->back();
    }

    public function media(Request $request, Media $media): BinaryFileResponse
    {
        if ($media->model_type !== Shout::class) {
            abort(404);
        }

        $path = $media->getPath();

        if ($path === '') {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => $media->mime_type ?? 'application/octet-stream',
        ]);
    }

    private function saveMentionedLinks(Shout $shout, ?string $content): void
    {
        if (empty($content)) {
            return;
        }

        // @slug形式のメンションを抽出（@の後に英数字、ハイフン、アンダースコア、スラッシュが続くパターン）
        preg_match_all('/@([a-zA-Z0-9_\-\/]+)/', $content, $matches);

        if (empty($matches[1])) {
            return;
        }

        // 重複を除去してリンクを保存
        $slugs = array_unique($matches[1]);
        foreach ($slugs as $slug) {
            ShoutLink::create([
                'shout_id' => $shout->id,
                'slug' => $slug,
            ]);
        }
    }
}
