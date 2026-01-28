import { Button } from '@/components/ui/button';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData } from '@/types';
import { Head, InfiniteScroll } from '@inertiajs/react';
import { Plus, Twitter } from 'lucide-react';
import { useState } from 'react';
import AddTweetDialog from './add-tweet-dialog';
import FetchJobsSection from './fetch-jobs-section';
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

interface Tweet {
    id: number;
    tweet_id: string;
    text: string;
    author: TweetAuthor | null;
    media: TweetMedia[];
    public_metrics: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
        quote_count: number;
    } | null;
    created_at: string | null;
    fetched_at: string | null;
}

interface TweetsIndexProps {
    tweets: PaginatedData<Tweet>;
}

export default function TweetsIndex({ tweets }: TweetsIndexProps) {
    const { __ } = useLang();
    const [showAddDialog, setShowAddDialog] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Saved Tweets'),
            href: '/tweets',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Saved Tweets')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">
                        {__('Saved Tweets')}
                    </h1>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {__('Add Tweet')}
                    </Button>
                </div>

                {/* 新規追加ダイアログ */}
                <AddTweetDialog
                    open={showAddDialog}
                    onOpenChange={setShowAddDialog}
                />

                {/* 進行状況セクション */}
                <FetchJobsSection />

                {/* ツイート一覧 */}
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
                                <Twitter className="h-12 w-12 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">
                                        {__('No saved tweets yet')}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {__('Add your first tweet to get started')}
                                    </p>
                                </div>
                                <Button onClick={() => setShowAddDialog(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {__('Add Tweet')}
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {tweets.data.map((tweet) => (
                                    <TweetCard key={tweet.id} tweet={tweet} />
                                ))}
                            </div>
                        )}
                    </InfiniteScroll>
                </div>
            </div>
        </AppLayout>
    );
}
