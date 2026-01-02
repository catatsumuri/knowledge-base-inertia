<?php

namespace App\Http\Controllers;

use App\Models\Shout;
use App\Models\ShoutLink;
use App\Services\ImageMetadataService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ShoutboxController extends Controller
{
    public function index(): Response
    {
        $shouts = Shout::with(['user', 'links', 'replies.user', 'replies.links'])
            ->whereNull('parent_id') // トップレベルのshoutのみ
            ->latest()
            ->paginate(20);

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

        $imagePaths = [];
        $imageMetadata = [];

        if ($request->hasFile('images')) {
            $imageService = new ImageMetadataService;
            foreach ($request->file('images') as $image) {
                $result = $imageService->storeUploadedImage($image, 'shouts');
                $path = $result['path'];
                $imageMetadata[$path] = $result['metadata'];
                $imagePaths[] = $path;
            }
        }

        $shout = Shout::create([
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'content' => $validated['content'],
            'images' => empty($imagePaths) ? null : $imagePaths,
            'image_metadata' => empty($imageMetadata) ? null : $imageMetadata,
        ]);

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

        // 画像を削除
        if ($shout->images) {
            foreach ($shout->images as $imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
        }

        $shout->delete();

        return redirect()->back();
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
