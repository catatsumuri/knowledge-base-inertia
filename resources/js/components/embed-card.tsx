/**
 * 埋め込みカードコンポーネント
 * GitHub, Twitter, YouTube, 一般的なURLカードを表示
 */
import { extractYoutubeVideoParameters } from '@/lib/url-matcher';
import { ExternalLink, Github } from 'lucide-react';
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
    // URLからドメイン名を抽出
    const domain = (() => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    })();

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
