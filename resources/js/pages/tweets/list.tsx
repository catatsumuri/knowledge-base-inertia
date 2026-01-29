import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type PaginatedData } from '@/types';
import { Head, InfiniteScroll, Link, Form } from '@inertiajs/react';
import {
    Download,
    ExternalLink,
    Image as ImageIcon,
    List,
    Upload,
    Twitter,
} from 'lucide-react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemo, useState } from 'react';

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

interface TweetsListProps {
    tweets: PaginatedData<Tweet>;
}

export default function TweetsList({ tweets }: TweetsListProps) {
    const { __ } = useLang();
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const csrfToken =
        typeof window === 'undefined'
            ? ''
            : (window.document
                  .querySelector('meta[name="csrf-token"]')
                  ?.getAttribute('content') ?? '');
    const formatDateTime = (value?: string | null) => {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
    };
    const selectedIdsString = useMemo(
        () => selectedIds.join(','),
        [selectedIds],
    );
    const allIdsOnPage = useMemo(
        () => tweets.data.map((tweet) => tweet.id),
        [tweets.data],
    );
    const allSelectedOnPage =
        allIdsOnPage.length > 0 &&
        allIdsOnPage.every((id) => selectedIds.includes(id));

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Saved Tweets'),
            href: '/tweets',
        },
        {
            title: __('All Tweets'),
            href: '/tweets/list',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('All Tweets')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-muted-foreground" />
                        <h1 className="text-2xl font-bold">
                            {__('All Tweets')}
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <form
                            action="/tweets/export"
                            method="post"
                            className="contents"
                            target="_blank"
                        >
                            <input type="hidden" name="_token" value={csrfToken} />
                            <input
                                type="hidden"
                                name="ids"
                                value={selectedIdsString}
                            />
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={selectedIds.length === 0}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {__('Export')}
                            </Button>
                        </form>
                        <Button
                            variant="outline"
                            onClick={() => setShowImportDialog(true)}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {__('Import')}
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={selectedIds.length === 0}
                                >
                                    {__('Delete permanently')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {__('Delete selected tweets?')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {__(
                                            'This action cannot be undone.',
                                        )}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        {__('Cancel')}
                                    </AlertDialogCancel>
                                    <Form
                                        action="/tweets/bulk-force-delete"
                                        method="post"
                                    >
                                        <input
                                            type="hidden"
                                            name="ids"
                                            value={selectedIdsString}
                                        />
                                        <AlertDialogAction asChild>
                                            <Button type="submit" variant="destructive">
                                                {__('Delete permanently')}
                                            </Button>
                                        </AlertDialogAction>
                                    </Form>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="secondary" asChild>
                            <Link href="/tweets">
                                <Twitter className="mr-2 h-4 w-4" />
                                {__('Saved Tweets')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="select-all"
                                checked={allSelectedOnPage}
                                onCheckedChange={(checked) => {
                                    if (checked === true) {
                                        setSelectedIds((prev) => [
                                            ...new Set([
                                                ...prev,
                                                ...allIdsOnPage,
                                            ]),
                                        ]);
                                    } else {
                                        setSelectedIds((prev) =>
                                            prev.filter(
                                                (id) =>
                                                    !allIdsOnPage.includes(id),
                                            ),
                                        );
                                    }
                                }}
                            />
                            <Label htmlFor="select-all">
                                {__('Select all on this page')}
                            </Label>
                        </div>
                        <span>
                            {__('Selected')}: {selectedIds.length}
                        </span>
                    </div>
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
                                        {__('No tweets found')}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {__(
                                            'Imported and archived tweets will appear here',
                                        )}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-border rounded-md border border-border/60">
                                {tweets.data.map((tweet) => (
                                    <div
                                        key={tweet.id}
                                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Checkbox
                                                    checked={selectedIds.includes(
                                                        tweet.id,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) => {
                                                        setSelectedIds(
                                                            (prev) => {
                                                                if (
                                                                    checked ===
                                                                    true
                                                                ) {
                                                                    return [
                                                                        ...new Set(
                                                                            [
                                                                                ...prev,
                                                                                tweet.id,
                                                                            ],
                                                                        ),
                                                                    ];
                                                                }
                                                                return prev.filter(
                                                                    (id) =>
                                                                        id !==
                                                                        tweet.id,
                                                                );
                                                            },
                                                        );
                                                    }}
                                                />
                                                <span className="text-sm font-semibold">
                                                    {tweet.author?.name ?? 'Unknown'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    @{tweet.author?.username ?? 'unknown'}
                                                </span>
                                                {tweet.deleted_at && (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        {__('Archived')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-foreground">
                                                {tweet.text || '—'}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <span>
                                                    {__('Created')}: {formatDateTime(tweet.created_at)}
                                                </span>
                                                <span>
                                                    {__('Fetched')}: {formatDateTime(tweet.fetched_at)}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {tweet.media?.length ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <a
                                                href={`https://x.com/i/status/${tweet.tweet_id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                {__('Open')}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </InfiniteScroll>
                </div>
            </div>

            <Dialog
                open={showImportDialog}
                onOpenChange={setShowImportDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__('Import Tweets')}</DialogTitle>
                        <DialogDescription>
                            {__('Select a JSON export file to import')}
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        action="/tweets/import"
                        method="post"
                        encType="multipart/form-data"
                        onSuccess={() => setShowImportDialog(false)}
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="import_file">
                                        {__('Import file')}
                                    </Label>
                                    <Input
                                        id="import_file"
                                        name="import_file"
                                        type="file"
                                        accept="application/json"
                                    />
                                    {errors.import_file && (
                                        <p className="text-sm text-destructive">
                                            {errors.import_file}
                                        </p>
                                    )}
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={processing}
                                        >
                                            {__('Cancel')}
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={processing}>
                                        {processing
                                            ? __('Importing...')
                                            : __('Import')}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
