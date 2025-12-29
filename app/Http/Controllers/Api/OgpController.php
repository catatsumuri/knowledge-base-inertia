<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OgpMetadataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class OgpController extends Controller
{
    public function __construct(
        private OgpMetadataService $ogpService
    ) {}

    /**
     * OGPメタデータを取得する
     */
    public function fetch(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'url' => ['required', 'url', 'max:2048'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid URL',
                'messages' => $validator->errors(),
            ], 422);
        }

        $url = $request->input('url');

        // キャッシュキーを生成
        $cacheKey = 'ogp:'.md5($url);

        // キャッシュから取得（24時間）
        $metadata = Cache::remember($cacheKey, now()->addHours(24), function () use ($url) {
            return $this->ogpService->fetch($url);
        });

        if (! $metadata) {
            return response()->json([
                'error' => 'Failed to fetch OGP metadata',
            ], 404);
        }

        return response()->json($metadata);
    }
}
