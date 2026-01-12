<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DetectTrailingSlash
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // リクエストURIに末尾スラッシュがあるかどうかを検出
        $requestUri = $request->server('REQUEST_URI') ?? $request->getRequestUri();
        $path = parse_url($requestUri, PHP_URL_PATH) ?? '';

        if (str_ends_with($path, '/') && $path !== '/') {
            $request->attributes->set('has_trailing_slash', true);
        }

        return $next($request);
    }
}
