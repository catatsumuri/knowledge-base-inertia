import { archive } from '@/actions/App/Http/Controllers/TweetController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData } from '@/types';
import { Head, InfiniteScroll, Link, router, usePage } from '@inertiajs/react';
import {
    Archive,
    CheckCheck,
    Hash,
    List,
    Plus,
    Send,
    Twitter,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
}

interface TweetsIndexProps {
    tweets: PaginatedData<Tweet>;
    archivedCount: number;
    activeTag?: string | null;
    tagGroups: Array<{ tag: string; count: number }>;
}

export default function TweetsIndex({
    tweets,
    archivedCount,
    activeTag,
    tagGroups,
}: TweetsIndexProps) {
    const { __ } = useLang();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedTweetIds, setSelectedTweetIds] = useState<number[]>([]);
    const [showBulkShoutDialog, setShowBulkShoutDialog] = useState(false);
    const [bulkMode, setBulkMode] = useState<'separate' | 'merged'>('separate');
    const [bulkDeleteOriginal, setBulkDeleteOriginal] = useState(true);
    const [bulkMentions, setBulkMentions] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const page = usePage();
    const errors = page.props.errors as Record<string, string> | undefined;
    const flash = page.props.flash as
        | { error?: string; success?: string; info?: string }
        | undefined;
    const errorMessage = errors?.tweet ?? flash?.error ?? null;
    const infoMessage = !errorMessage
        ? (flash?.info ?? flash?.success ?? null)
        : null;
    const allCount = tweets.meta?.total ?? tweets.data.length;
    const selectedCount = selectedTweetIds.length;
    const currentPageTweetIds = useMemo(
        () => tweets.data.map((tweet) => tweet.id),
        [tweets.data],
    );
    const allCurrentPageSelected =
        currentPageTweetIds.length > 0 &&
        currentPageTweetIds.every((id) => selectedTweetIds.includes(id));

    const toggleSelection = (tweetId: number) => {
        setSelectedTweetIds((prev) =>
            prev.includes(tweetId)
                ? prev.filter((id) => id !== tweetId)
                : [...prev, tweetId],
        );
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedTweetIds([]);
    };

    const submitBulkShoutbox = () => {
        if (selectedTweetIds.length === 0) {
            return;
        }

        setBulkProcessing(true);
        router.post(
            '/tweets/shoutbox/bulk',
            {
                ids: selectedTweetIds,
                mode: bulkMode,
                delete_original: bulkDeleteOriginal,
                page_mentions: bulkMentions,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setShowBulkShoutDialog(false);
                    setBulkMentions('');
                    exitSelectionMode();
                },
                onFinish: () => setBulkProcessing(false),
            },
        );
    };

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
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold">{__('Saved Tweets')}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/tweets/list">
                                <List className="mr-2 h-4 w-4" />
                                {__('All Tweets')}
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={archive()}>
                                <Archive className="mr-2 h-4 w-4" />
                                {archivedCount > 0
                                    ? `${__('Archive')} (${archivedCount})`
                                    : __('Archive')}
                            </Link>
                        </Button>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {__('Add Tweet')}
                        </Button>
                        <Button
                            variant={selectionMode ? 'default' : 'outline'}
                            onClick={() =>
                                selectionMode
                                    ? exitSelectionMode()
                                    : setSelectionMode(true)
                            }
                        >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            {selectionMode
                                ? __('Done selecting')
                                : __('Select cards')}
                        </Button>
                    </div>
                </div>

                {/* 新規追加ダイアログ */}
                <AddTweetDialog
                    open={showAddDialog}
                    onOpenChange={setShowAddDialog}
                />

                {(errorMessage || infoMessage) && (
                    <Alert variant={errorMessage ? 'destructive' : 'default'}>
                        <AlertTitle>
                            {errorMessage ? __('Error') : __('Info')}
                        </AlertTitle>
                        <AlertDescription>
                            {errorMessage ?? infoMessage}
                        </AlertDescription>
                    </Alert>
                )}

                {/* 進行状況セクション */}
                <FetchJobsSection />

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* ツイート一覧 */}
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                        {activeTag && (
                            <div className="mb-4 flex items-center gap-2">
                                <Badge variant="secondary">#{activeTag}</Badge>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/tweets">
                                        {__('Clear filter')}
                                    </Link>
                                </Button>
                            </div>
                        )}
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
                                            {activeTag
                                                ? __(
                                                      'No tweets found for this tag',
                                                  )
                                                : __('No saved tweets yet')}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {activeTag
                                                ? __(
                                                      'Try another tag or clear the filter',
                                                  )
                                                : __(
                                                      'Add your first tweet to get started',
                                                  )}
                                        </p>
                                    </div>
                                    {!activeTag && (
                                        <Button
                                            onClick={() =>
                                                setShowAddDialog(true)
                                            }
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {__('Add Tweet')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {tweets.data.map((tweet) => (
                                        <TweetCard
                                            key={tweet.id}
                                            tweet={tweet}
                                            selectionMode={selectionMode}
                                            selected={selectedTweetIds.includes(
                                                tweet.id,
                                            )}
                                            onToggleSelect={toggleSelection}
                                        />
                                    ))}
                                </div>
                            )}
                        </InfiniteScroll>
                    </div>

                    <aside className="lg:sticky lg:top-4">
                        <div className="overflow-hidden rounded-2xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border">
                            <div className="border-b border-border/60 bg-linear-to-r from-sky-500/15 via-cyan-500/5 to-transparent p-4">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-sky-500/20 p-1.5 text-sky-600 dark:text-sky-300">
                                        <Hash className="h-4 w-4" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {__('Tag Explorer')}
                                    </h2>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {__('Browse and group tweets by tags')}
                                </p>
                            </div>

                            <div className="space-y-2 p-3">
                                <Link
                                    href="/tweets"
                                    className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-muted"
                                >
                                    <span>{__('All tags')}</span>
                                    <Badge
                                        variant={
                                            !activeTag ? 'default' : 'outline'
                                        }
                                    >
                                        {allCount}
                                    </Badge>
                                </Link>

                                {tagGroups.length === 0 ? (
                                    <p className="rounded-xl px-3 py-4 text-xs text-muted-foreground">
                                        {__('No tags yet')}
                                    </p>
                                ) : (
                                    <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                                        {tagGroups.map((group) => {
                                            const isActive =
                                                activeTag === group.tag;

                                            return (
                                                <Link
                                                    key={group.tag}
                                                    href={`/tweets?tag=${encodeURIComponent(group.tag)}`}
                                                    className="group flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm transition-all hover:border-sky-400/40 hover:bg-sky-500/5"
                                                >
                                                    <span className="truncate">
                                                        #{group.tag}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            isActive
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {group.count}
                                                    </Badge>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>

                {selectionMode && (
                    <div className="fixed right-4 bottom-4 left-4 z-40 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur lg:left-auto lg:w-[720px]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary">
                                    {selectedCount}
                                </Badge>
                                <span>{__('selected')}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        if (allCurrentPageSelected) {
                                            setSelectedTweetIds((prev) =>
                                                prev.filter(
                                                    (id) =>
                                                        !currentPageTweetIds.includes(
                                                            id,
                                                        ),
                                                ),
                                            );

                                            return;
                                        }

                                        setSelectedTweetIds((prev) => [
                                            ...new Set([
                                                ...prev,
                                                ...currentPageTweetIds,
                                            ]),
                                        ]);
                                    }}
                                >
                                    {allCurrentPageSelected
                                        ? __('Unselect visible')
                                        : __('Select visible')}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={selectedCount === 0}
                                    onClick={() => setShowBulkShoutDialog(true)}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {__('Send to Shoutbox')}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={exitSelectionMode}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    {__('Clear selection')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Dialog
                open={showBulkShoutDialog}
                onOpenChange={setShowBulkShoutDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {__('Send selected tweets to Shoutbox')}
                        </DialogTitle>
                        <DialogDescription>
                            {__('Choose how to post the selected tweets.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{__('Posting mode')}</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant={
                                        bulkMode === 'separate'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setBulkMode('separate')}
                                >
                                    {__('One shout per tweet')}
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        bulkMode === 'merged'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setBulkMode('merged')}
                                >
                                    {__('Merge into one shout')}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {bulkMode === 'merged'
                                    ? __(
                                          'Media is attached from the first selected tweet.',
                                      )
                                    : __(
                                          'Each tweet is posted separately with its media.',
                                      )}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bulk-mentions">
                                {__('Mention pages')}
                            </Label>
                            <Textarea
                                id="bulk-mentions"
                                value={bulkMentions}
                                onChange={(event) =>
                                    setBulkMentions(event.target.value)
                                }
                                placeholder={__('Type @ to select pages')}
                                className="min-h-[90px] resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="bulk-delete-original"
                                checked={bulkDeleteOriginal}
                                onCheckedChange={(checked) =>
                                    setBulkDeleteOriginal(checked === true)
                                }
                            />
                            <Label htmlFor="bulk-delete-original">
                                {__('Archive original tweets after posting')}
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={bulkProcessing}
                            onClick={() => setShowBulkShoutDialog(false)}
                        >
                            {__('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={bulkProcessing || selectedCount === 0}
                            onClick={submitBulkShoutbox}
                        >
                            {bulkProcessing ? __('Posting...') : __('Post')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
