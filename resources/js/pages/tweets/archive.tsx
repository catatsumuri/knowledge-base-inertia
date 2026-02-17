import { index } from '@/actions/App/Http/Controllers/TweetController';
import { Button } from '@/components/ui/button';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData } from '@/types';
import { Head, InfiniteScroll, Link } from '@inertiajs/react';
import { ArchiveX, ArrowLeft } from 'lucide-react';
import TweetCard from './tweet-card';

interface TweetAuthor {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
    verified?: boolean;
}

interface TweetMedia {
    media_key: string;
    type: 'photo' | 'video' | 'animated_gif';
    url?: string;
    preview_image_url?: string;
    width?: number;
    height?: number;
}

interface RelatedTweetPreview {
    id: number;
    tweet_id: string;
    text: string;
    author: TweetAuthor | null;
    media: TweetMedia[];
    created_at: string | null;
}

interface Tweet {
    id: number;
    tweet_id: string;
    tags: string[];
    text: string;
    author: TweetAuthor | null;
    media: TweetMedia[];
    reply_to_tweet_id?: string | null;
    parent?: RelatedTweetPreview | null;
    public_metrics: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
        quote_count: number;
    } | null;
    created_at: string | null;
    fetched_at: string | null;
    deleted_at?: string | null;
}

interface TweetsArchiveProps {
    tweets: PaginatedData<Tweet>;
}

export default function TweetsArchive({ tweets }: TweetsArchiveProps) {
    const { __ } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Saved Tweets'),
            href: '/tweets',
        },
        {
            title: __('Archive'),
            href: '/tweets/archive',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Archived Tweets')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold">
                        {__('Archived Tweets')}
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href={index()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {__('Back to Saved Tweets')}
                        </Link>
                    </Button>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <InfiniteScroll
                        data="tweets"
                        manual
                        next={({ loading, fetch, hasMore }) =>
                            hasMore && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={fetch}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? __('Loading...')
                                            : __('Load more')}
                                    </Button>
                                </div>
                            )
                        }
                    >
                        {tweets.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                                <ArchiveX className="h-12 w-12 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">
                                        {__('No archived tweets')}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {__('Archived tweets will appear here')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {tweets.data.map((tweet) => (
                                    <TweetCard
                                        key={tweet.id}
                                        tweet={tweet}
                                        mode="archived"
                                    />
                                ))}
                            </div>
                        )}
                    </InfiniteScroll>
                </div>
            </div>
        </AppLayout>
    );
}
