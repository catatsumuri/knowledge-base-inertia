import {
    destroy,
    forceDestroy,
    moveToShoutbox,
    restore,
} from '@/actions/App/Http/Controllers/TweetController';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { useLang } from '@/hooks/useLang';
import { cn } from '@/lib/utils';
import { Form, router } from '@inertiajs/react';
import {
    Archive,
    Hash,
    Heart,
    Loader2,
    MessageCircle,
    Quote,
    Repeat2,
    RotateCcw,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';

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

interface TweetCardProps {
    tweet: Tweet;
    mode?: 'active' | 'archived';
    availableTags?: string[];
    selectionMode?: boolean;
    selected?: boolean;
    onToggleSelect?: (tweetId: number) => void;
}

interface MarkdownPage {
    slug: string;
    title: string;
}

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};

export default function TweetCard({
    tweet,
    mode = 'active',
    availableTags = [],
    selectionMode = false,
    selected = false,
    onToggleSelect,
}: TweetCardProps) {
    const { __ } = useLang();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isShoutDialogOpen, setIsShoutDialogOpen] = useState(false);
    const [deleteOriginal, setDeleteOriginal] = useState(true);
    const [pageMentions, setPageMentions] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<MarkdownPage[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [isSavingTags, setIsSavingTags] = useState(false);
    const getInitials = useInitials();
    const initials = getInitials(tweet.author?.name || '');
    const mentionInputRef = useRef<HTMLTextAreaElement>(null);
    const isArchived = mode === 'archived';
    const tagSuggestionListId = `tweet-tag-suggestions-${tweet.id}`;
    const normalizedInput = tagInput.trim().replace(/^#/, '').toLowerCase();
    const filteredAvailableTags = availableTags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag !== '')
        .filter((tag, index, self) => self.indexOf(tag) === index)
        .filter((tag) => !tweet.tags.includes(tag))
        .filter((tag) =>
            normalizedInput === '' ? true : tag.includes(normalizedInput),
        )
        .slice(0, 20);

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteDialogOpen(true);
    };

    const handleShoutClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteOriginal(true);
        setPageMentions('');
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedSuggestionIndex(0);
        setMentionStart(null);
        setIsShoutDialogOpen(true);
    };

    const handlePageMentionChange = async (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setPageMentions(value);

        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-/]*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1];
            const start = cursorPosition - mentionMatch[0].length;
            setMentionStart(start);

            try {
                const response = await fetch(
                    `/api/markdown/search?q=${encodeURIComponent(query)}`,
                );
                const responseData = await response.json();
                setSuggestions(responseData);
                setShowSuggestions(responseData.length > 0);
                setSelectedSuggestionIndex(0);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
            }
        } else {
            setShowSuggestions(false);
            setMentionStart(null);
        }
    };

    const handlePageMentionKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex(
                (prev) => (prev + 1) % suggestions.length,
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex(
                (prev) => (prev - 1 + suggestions.length) % suggestions.length,
            );
        } else if (e.key === 'Enter' && suggestions.length > 0) {
            e.preventDefault();
            insertMention(suggestions[selectedSuggestionIndex].slug);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
        }
    };

    const insertMention = (slug: string) => {
        if (mentionStart === null) return;

        const textarea = mentionInputRef.current;
        if (!textarea) return;

        const beforeMention = pageMentions.substring(0, mentionStart);
        const afterCursor = pageMentions.substring(textarea.selectionStart);
        const newContent = beforeMention + '@' + slug + ' ' + afterCursor;

        setPageMentions(newContent);
        setShowSuggestions(false);
        setMentionStart(null);

        setTimeout(() => {
            const newCursorPos = beforeMention.length + slug.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
        }, 0);
    };

    const openTweetInNewTab = () => {
        window.open(`https://x.com/i/status/${tweet.tweet_id}`, '_blank');
    };

    const handleCardBodyClick = () => {
        if (selectionMode) {
            onToggleSelect?.(tweet.id);

            return;
        }

        openTweetInNewTab();
    };

    const updateTags = (nextTags: string[]) => {
        setIsSavingTags(true);
        const currentScrollTop =
            window.scrollY ?? document.documentElement.scrollTop ?? 0;

        router.post(
            `/tweets/${tweet.id}/tags`,
            { tags: nextTags },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    requestAnimationFrame(() => {
                        window.scrollTo({
                            top: currentScrollTop,
                            behavior: 'auto',
                        });
                    });
                },
                onFinish: () => setIsSavingTags(false),
            },
        );
    };

    const handleAddTag = () => {
        const normalized = tagInput.trim().replace(/^#/, '').toLowerCase();
        if (!normalized) return;
        if (tweet.tags.includes(normalized)) {
            setTagInput('');
            return;
        }
        updateTags([...tweet.tags, normalized]);
        setTagInput('');
    };

    const handleRemoveTag = (tag: string) => {
        updateTags(tweet.tags.filter((item) => item !== tag));
    };

    return (
        <>
            <Card
                className={cn(
                    'group flex h-full flex-col transition-all hover:border-primary hover:shadow-md',
                    selectionMode && 'cursor-pointer',
                    selected && 'border-primary ring-2 ring-primary/30',
                )}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            {selectionMode && (
                                <Checkbox
                                    checked={selected}
                                    onCheckedChange={() =>
                                        onToggleSelect?.(tweet.id)
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    className="mt-0.5"
                                />
                            )}
                            <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage
                                    src={tweet.author?.profile_image_url}
                                />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate font-semibold">
                                    {tweet.author?.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        @{tweet.author?.username}
                                    </p>
                                    {isArchived && (
                                        <Badge variant="secondary">
                                            {__('Archived')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {isArchived && (
                                <Form action={restore(tweet.id)}>
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon"
                                            disabled={processing}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    )}
                                </Form>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteClick}
                                className="shrink-0"
                            >
                                {isArchived ? (
                                    <Trash2 className="h-4 w-4" />
                                ) : (
                                    <Archive className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent
                    className="flex-1 cursor-pointer space-y-3"
                    onClick={handleCardBodyClick}
                >
                    <p className="line-clamp-4 text-sm">{tweet.text}</p>

                    {tweet.media.length > 0 && (
                        <div
                            className={cn(
                                'grid gap-1 overflow-hidden rounded-md',
                                tweet.media.length === 1 && 'grid-cols-1',
                                tweet.media.length === 2 && 'grid-cols-2',
                                tweet.media.length === 3 &&
                                    'grid-cols-2 grid-rows-2',
                                tweet.media.length >= 4 &&
                                    'grid-cols-2 grid-rows-2',
                            )}
                        >
                            {tweet.media.slice(0, 4).map((media, index) => (
                                <img
                                    key={media.media_key}
                                    src={media.url}
                                    alt=""
                                    className={cn(
                                        'h-full w-full object-cover',
                                        tweet.media.length === 1 &&
                                            'aspect-video',
                                        tweet.media.length === 2 &&
                                            'aspect-square',
                                        tweet.media.length === 3 &&
                                            index === 0 &&
                                            'row-span-2 aspect-square',
                                        tweet.media.length === 3 &&
                                            index > 0 &&
                                            'aspect-square',
                                        tweet.media.length >= 4 &&
                                            'aspect-square',
                                    )}
                                />
                            ))}
                        </div>
                    )}

                    {tweet.public_metrics && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Badge variant="secondary" className="gap-1">
                                <Heart className="h-3 w-3" />
                                {formatNumber(tweet.public_metrics.like_count)}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                                <Repeat2 className="h-3 w-3" />
                                {formatNumber(
                                    tweet.public_metrics.retweet_count,
                                )}
                            </Badge>
                            {tweet.public_metrics.reply_count > 0 && (
                                <Badge variant="secondary" className="gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    {formatNumber(
                                        tweet.public_metrics.reply_count,
                                    )}
                                </Badge>
                            )}
                            {tweet.public_metrics.quote_count > 0 && (
                                <Badge variant="secondary" className="gap-1">
                                    <Quote className="h-3 w-3" />
                                    {formatNumber(
                                        tweet.public_metrics.quote_count,
                                    )}
                                </Badge>
                            )}
                        </div>
                    )}

                    {!isArchived && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleShoutClick}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                {__('Send to Shoutbox')}
                            </Button>
                        </div>
                    )}

                    <div
                        className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            <span className="font-medium">{__('Tags')}</span>
                            {isSavingTags && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {tweet.tags.length === 0 ? (
                                <span className="text-xs text-muted-foreground">
                                    {__('No tags')}
                                </span>
                            ) : (
                                tweet.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="gap-1 rounded-full border-sky-400/30 bg-sky-500/10 px-2 py-0.5"
                                    >
                                        <span className="text-xs">#{tag}</span>
                                        <button
                                            type="button"
                                            className="text-muted-foreground transition-colors hover:text-foreground"
                                            onClick={() => handleRemoveTag(tag)}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                value={tagInput}
                                onChange={(event) =>
                                    setTagInput(event.target.value)
                                }
                                list={tagSuggestionListId}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                placeholder={__('Type a tag and press Enter')}
                                className="h-8 border-border/70 bg-background"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handleAddTag}
                                disabled={isSavingTags}
                            >
                                {__('Add')}
                            </Button>
                        </div>
                        {filteredAvailableTags.length > 0 && (
                            <datalist id={tagSuggestionListId}>
                                {filteredAvailableTags.map((tag) => (
                                    <option key={tag} value={tag} />
                                ))}
                            </datalist>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 削除確認ダイアログ */}
            <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isArchived
                                ? __('Delete Permanently')
                                : __('Archive Tweet')}
                        </DialogTitle>
                        <DialogDescription>
                            <span className="block font-semibold text-foreground">
                                {isArchived
                                    ? __(
                                          'Are you sure you want to permanently delete this tweet?',
                                      )
                                    : __(
                                          'Are you sure you want to archive this tweet?',
                                      )}
                            </span>
                            <span className="mt-2 block text-muted-foreground">
                                {isArchived
                                    ? __('This action cannot be undone.')
                                    : __(
                                          'You can restore it later from the archive.',
                                      )}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        action={
                            isArchived
                                ? forceDestroy(tweet.id)
                                : destroy(tweet.id)
                        }
                        onSuccess={() => setIsDeleteDialogOpen(false)}
                    >
                        {({ processing }) => (
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
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing
                                        ? __('Deleting...')
                                        : isArchived
                                          ? __('Delete Permanently')
                                          : __('Archive')}
                                </Button>
                            </DialogFooter>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isShoutDialogOpen}
                onOpenChange={setIsShoutDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__('Send to Shoutbox')}</DialogTitle>
                        <DialogDescription>
                            <span className="block font-semibold text-foreground">
                                {__(
                                    'Do you want to post this tweet to the shoutbox?',
                                )}
                            </span>
                            <span className="mt-2 block text-muted-foreground">
                                {__(
                                    'The text and media will be copied into a new shout.',
                                )}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <Form
                        action={moveToShoutbox(tweet.id)}
                        onSuccess={() => setIsShoutDialogOpen(false)}
                    >
                        {({ processing }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="delete_original"
                                    value={deleteOriginal ? '1' : '0'}
                                />
                                <input
                                    type="hidden"
                                    name="page_mentions"
                                    value={pageMentions}
                                />
                                <div className="space-y-2 py-2">
                                    <Label
                                        htmlFor={`page-mentions-${tweet.id}`}
                                    >
                                        {__('Mention pages')}
                                    </Label>
                                    <div className="relative">
                                        <Textarea
                                            id={`page-mentions-${tweet.id}`}
                                            ref={mentionInputRef}
                                            value={pageMentions}
                                            onChange={handlePageMentionChange}
                                            onKeyDown={handlePageMentionKeyDown}
                                            placeholder={__(
                                                'Type @ to select pages',
                                            )}
                                            className="min-h-[80px] resize-none"
                                        />
                                        {showSuggestions &&
                                            suggestions.length > 0 && (
                                                <Card className="absolute top-[calc(100%-8px)] left-0 z-50 mt-2 max-h-56 w-full gap-0 overflow-y-auto p-0">
                                                    {suggestions.map(
                                                        (suggestion, index) => (
                                                            <button
                                                                key={
                                                                    suggestion.slug
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    insertMention(
                                                                        suggestion.slug,
                                                                    )
                                                                }
                                                                className={`w-full border-b px-4 py-2 text-left leading-none hover:bg-muted ${
                                                                    index ===
                                                                    selectedSuggestionIndex
                                                                        ? 'bg-muted'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <div className="leading-none font-medium">
                                                                    @
                                                                    {
                                                                        suggestion.slug
                                                                    }
                                                                </div>
                                                                <div className="text-sm leading-none text-muted-foreground">
                                                                    {
                                                                        suggestion.title
                                                                    }
                                                                </div>
                                                            </button>
                                                        ),
                                                    )}
                                                </Card>
                                            )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-2">
                                    <Checkbox
                                        id={`delete-original-${tweet.id}`}
                                        checked={deleteOriginal}
                                        onCheckedChange={(checked) =>
                                            setDeleteOriginal(checked === true)
                                        }
                                    />
                                    <Label
                                        htmlFor={`delete-original-${tweet.id}`}
                                    >
                                        {__(
                                            'Archive original tweet after posting',
                                        )}
                                    </Label>
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
                                            ? __('Posting...')
                                            : __('Post to Shoutbox')}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
