/**
 * 埋め込みカードコンポーネント
 * GitHub, Twitter, YouTube, 一般的なURLカードを表示
 */
import { extractYoutubeVideoParameters } from '@/lib/url-matcher';
import { ExternalLink, Github } from 'lucide-react';
import React from 'react';
import { Tweet } from 'react-tweet';

interface EmbedCardProps {
    url: string;
    type: 'github' | 'tweet' | 'youtube' | 'card';
}

/**
 * GitHubカード埋め込み
 */
function GithubEmbed({ url }: { url: string }) {
    return (
        <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 transition-colors hover:bg-muted"
            >
                <Github className="mt-1 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{url}</div>
                    <div className="mt-1 text-xs text-muted-foreground">GitHub</div>
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
            </a>
        </div>
    );
}

/**
 * URLからツイートIDを抽出する
 */
function extractTweetId(url: string): string | null {
    // https://twitter.com/username/status/1234567890
    // https://x.com/username/status/1234567890
    const match = url.match(/\/(twitter|x)\.com\/[^/]+\/status\/(\d+)/);
    return match ? match[2] : null;
}

/**
 * Twitter/X埋め込み
 */
function TweetEmbed({ url }: { url: string }) {
    const tweetId = extractTweetId(url);

    if (!tweetId) {
        return <LinkCard url={url} />;
    }

    return (
        <div className="my-4 flex justify-center">
            <Tweet id={tweetId} />
        </div>
    );
}

/**
 * YouTube埋め込み
 */
function YoutubeEmbed({ url }: { url: string }) {
    const params = extractYoutubeVideoParameters(url);

    if (!params?.videoId) {
        return <LinkCard url={url} />;
    }

    const time = Math.min(Number(params.start || 0), 48 * 60 * 60); // 48時間以内
    const startQuery = time ? `?start=${time}` : '';

    return (
        <div className="my-4 flex justify-center">
            <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-black">
                <div className="relative" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${params.videoId}${startQuery}`}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        className="absolute inset-0 size-full"
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * 一般的なリンクカード
 */
function LinkCard({ url }: { url: string }) {
    const [metadata, setMetadata] = React.useState<{
        title?: string;
        description?: string;
        image?: string;
    } | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    // URLからドメイン名を抽出
    const domain = (() => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    })();

    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const data = await response.json();
                    setMetadata(data);
                } else {
                    setError(true);
                }
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, [url]);

    // ローディング中
    if (loading) {
        return (
            <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3 p-4">
                    <ExternalLink className="mt-1 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
                        <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted"></div>
                    </div>
                </div>
            </div>
        );
    }

    // エラーまたはメタデータ取得失敗時はシンプルな表示
    if (error || !metadata) {
        return (
            <div className="my-4 overflow-hidden rounded-lg border border-border bg-card">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-muted"
                >
                    <ExternalLink className="mt-1 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{url}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{domain}</div>
                    </div>
                </a>
            </div>
        );
    }

    // OGPメタデータを含むリッチなカード表示
    return (
        <div className="not-prose my-3">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-all hover:border-foreground/20 hover:bg-muted"
            >
                {metadata.image && (
                    <div className="shrink-0">
                        <img
                            src={metadata.image}
                            alt=""
                            className="size-16 rounded object-cover"
                            loading="lazy"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-foreground">
                        {metadata.title || url}
                    </div>
                    {metadata.description && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {metadata.description}
                        </div>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground/70">
                        {domain}
                    </div>
                </div>
            </a>
        </div>
    );
}

/**
 * 埋め込みカードのメインコンポーネント
 */
export function EmbedCard({ url, type }: EmbedCardProps) {
    switch (type) {
        case 'github':
            return <GithubEmbed url={url} />;
        case 'tweet':
            return <TweetEmbed url={url} />;
        case 'youtube':
            return <YoutubeEmbed url={url} />;
        case 'card':
            return <LinkCard url={url} />;
        default:
            return <LinkCard url={url} />;
    }
}
