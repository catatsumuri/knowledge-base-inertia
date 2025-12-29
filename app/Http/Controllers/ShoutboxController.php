<?php

namespace App\Http\Controllers;

use App\Models\Shout;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ShoutboxController extends Controller
{
    public function index(): Response
    {
        $shouts = Shout::with('user')
            ->latest()
            ->paginate(20);

        return Inertia::render('shoutbox/index', [
            'shouts' => $shouts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:1000'],
            'images' => ['nullable', 'array', 'max:4'],
            'images.*' => ['image', 'max:5120'], // 5MB max
        ]);

        $imagePaths = [];

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('shouts', 'public');
                $imagePaths[] = $path;
            }
        }

        Shout::create([
            'user_id' => $request->user()->id,
            'content' => $validated['content'],
            'images' => empty($imagePaths) ? null : $imagePaths,
        ]);

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
}
