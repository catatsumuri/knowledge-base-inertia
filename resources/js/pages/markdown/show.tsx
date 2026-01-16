import {
    destroy,
    edit,
    show,
} from '@/actions/App/Http/Controllers/MarkdownController';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { PublicPagesMenu } from '@/components/public-pages-menu';
import { Toc } from '@/components/toc';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import PublicLayout from '@/layouts/public-layout';
import { extractPlainText } from '@/lib/extract-plain-text';
import { parseToc, type TocNode } from '@/lib/parse-toc';
import { cn } from '@/lib/utils';
import { show as showTopic } from '@/routes/topics';
import { type BreadcrumbItem, type SharedData, type User } from '@/types';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
    AlertTriangle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Image as ImageIcon,
    List,
    MessageSquare,
    Pencil,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const normalizeHeadingText = (text: string) =>
    text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

const findHeadingOffset = (
    content: string,
    headingText: string,
    level: number,
) => {
    const normalizedTarget = normalizeHeadingText(headingText);
    if (!normalizedTarget) {
        return null;
    }

    const lines = content.split(/\r?\n/);
    const lineBreakLength = content.includes('\r\n') ? 2 : 1;
    let offset = 0;
    let inCodeBlock = false;

    for (const line of lines) {
        if (/^```/.test(line)) {
            inCodeBlock = !inCodeBlock;
        }

        if (!inCodeBlock) {
            const headingMatch = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/.exec(line);
            if (headingMatch && headingMatch[1].length === level) {
                const lineText = normalizeHeadingText(headingMatch[2]);
                if (lineText === normalizedTarget) {
                    return offset;
                }
            }
        }

        offset += line.length + lineBreakLength;
    }

    return null;
};

interface MarkdownDocument {
    id: number;
    slug: string;
    title: string;
    content: string | null;
    status: 'draft' | 'private' | 'published';
    created_by:
        | number
        | {
              id: number;
              name: string;
              email: string;
          };
    updated_by:
        | number
        | {
              id: number;
              name: string;
              email: string;
          };
    created_at: string;
    updated_at: string;
    topics?: Array<{ id: number; name: string; slug: string }>;
    eyecatch_url?: string | null;
}

interface ShoutLink {
    id: number;
    shout_id: number;
    slug: string;
    created_at: string;
}

interface Shout {
    id: number;
    user_id: number;
    content: string;
    images: string[] | null;
    created_at: string;
    user: User;
    links: ShoutLink[];
    replies?: Shout[];
}

interface PublicPageNode {
    type: 'folder' | 'document';
    slug: string;
    title: string;
    label?: string | null;
    path?: string;
    index_slug?: string;
    index_title?: string;
    children?: PublicPageNode[];
}

export default function Show({
    document,
    relatedShouts,
    canCreate,
    isPublic = false,
    isHomePage = false,
    pageTree = [],
}: {
    document: MarkdownDocument;
    relatedShouts: Shout[];
    canCreate: boolean;
    isPublic?: boolean;
    isHomePage?: boolean;
    pageTree?: PublicPageNode[];
}) {
    const { __ } = useLang();
    const getInitials = useInitials();
    const page = usePage<SharedData>();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [toc, setToc] = useState<TocNode[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newSlug, setNewSlug] = useState('');
    const [showToc, setShowToc] = useState(() => {
        if (typeof window === 'undefined') return true;
        const stored = window.localStorage.getItem('toc-visible');
        return stored !== null ? stored === 'true' : true;
    });
    const importInputRef = useRef<HTMLInputElement>(null);
    const tocWrapperRef = useRef<HTMLDivElement>(null);
    const tocOffsetTopRef = useRef(0);
    const [isMobile, setIsMobile] = useState(false);
    const [isTocFloating, setIsTocFloating] = useState(false);
    const isPublicView = Boolean(isPublic);
    const canManage = canCreate && !isPublicView;
    const updatedBy =
        document.updated_by && typeof document.updated_by === 'object'
            ? document.updated_by
            : null;

    // OGPメタデータの生成
    const description = document.content
        ? extractPlainText(document.content, 160)
        : `${document.title} - Knowledge Base`;
    const currentUrl =
        typeof window !== 'undefined'
            ? window.location.href
            : `${page.props.app?.url || ''}${page.url}`;
    const imageUrl = document.eyecatch_url
        ? document.eyecatch_url.startsWith('http')
            ? document.eyecatch_url
            : `${page.props.app?.url || ''}${document.eyecatch_url}`
        : null;

    useEffect(() => {
        if (contentRef.current && document.content) {
            const tocNodes = parseToc(contentRef.current);
            setToc(tocNodes);
        }
    }, [document.content]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const updateMobile = () => setIsMobile(mediaQuery.matches);

        updateMobile();
        mediaQuery.addEventListener('change', updateMobile);

        return () => {
            mediaQuery.removeEventListener('change', updateMobile);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !tocWrapperRef.current) {
            return;
        }

        const updateMetrics = () => {
            if (!tocWrapperRef.current) {
                return;
            }

            const rect = tocWrapperRef.current.getBoundingClientRect();
            tocOffsetTopRef.current = rect.top + window.scrollY;
        };

        updateMetrics();
        window.addEventListener('resize', updateMetrics);

        return () => {
            window.removeEventListener('resize', updateMetrics);
        };
    }, [toc.length]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isMobile) {
            return;
        }

        const onScroll = () => {
            setIsTocFloating(window.scrollY >= tocOffsetTopRef.current);
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, [isMobile]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem('toc-visible', String(showToc));
    }, [showToc]);

    // ネストしたパスの場合、階層的なbreadcrumbsを生成
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const breadcrumbs: BreadcrumbItem[] = [
            {
                title: __('Markdown'),
                href: '/markdown',
            },
        ];

        const slugParts = document.slug
            .split('/')
            .filter((part) => part !== '');
        let currentPath = '';

        slugParts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === slugParts.length - 1;

            breadcrumbs.push({
                title: isLast
                    ? document.title
                    : part.charAt(0).toUpperCase() + part.slice(1),
                href: show(currentPath).url,
            });
        });

        return breadcrumbs;
    };

    const breadcrumbs = isPublicView || isHomePage ? [] : generateBreadcrumbs();

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSlug.trim()) {
            router.visit(`/markdown/${newSlug.trim()}`);
        }
    };

    const openLightbox = (images: string[], index: number) => {
        setLightboxImages(images);
        setCurrentImageIndex(index);
        setLightboxOpen(true);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex(
            (prev) =>
                (prev - 1 + lightboxImages.length) % lightboxImages.length,
        );
    };

    const mentionBasePath = isPublicView ? '/pages' : '/markdown';

    const handleEditHeading = ({
        level,
        text,
        id,
    }: {
        level: number;
        text: string;
        id?: string;
    }) => {
        if (!document.content) {
            router.visit(edit(document.slug).url);
            return;
        }

        const offset = findHeadingOffset(document.content, text, level);
        const editUrl = edit(document.slug).url;

        if (typeof offset !== 'number') {
            router.visit(editUrl);
            return;
        }

        const clampedOffset = Math.max(
            0,
            Math.min(offset, document.content.length),
        );
        const params = new URLSearchParams({
            jump: clampedOffset.toString(),
        });

        if (id) {
            params.set('return_heading', id);
        }

        router.visit(`${editUrl}?${params.toString()}`);
    };

    const renderContentWithLinks = (content: string) => {
        if (!content) return null;

        // @slug形式をリンクに変換
        const parts = content.split(/(@[a-zA-Z0-9_\-/]+)/g);

        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const slug = part.slice(1);
                return (
                    <Link
                        key={index}
                        href={`${mentionBasePath}/${slug}`}
                        className="font-medium text-primary hover:underline"
                    >
                        {part}
                    </Link>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    const contentBody = (
        <div
            ref={contentRef}
            className="prose prose-sm w-full max-w-[900px] min-w-0 rounded-xl border border-sidebar-border/70 p-6 prose-neutral dark:border-sidebar-border dark:prose-invert [&_figcaption]:text-center"
        >
            {document.content ? (
                <MarkdownViewer
                    content={document.content}
                    onEditHeading={canManage ? handleEditHeading : undefined}
                    basePrefix={isPublicView ? '/pages' : '/markdown'}
                />
            ) : (
                <p className="text-muted-foreground">{__('No content yet.')}</p>
            )}
        </div>
    );

    const content = (
        <div className="flex flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">
                            {document.title || '新規ページ'}
                        </h1>
                        {document.status === 'draft' && (
                            <Badge variant="secondary">{__('Draft')}</Badge>
                        )}
                    </div>
                    {document.eyecatch_url && (
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70">
                            <img
                                src={document.eyecatch_url}
                                alt={document.title}
                                className="h-56 w-full object-cover"
                            />
                        </div>
                    )}
                    {document.topics && document.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {document.topics.map((topic) => (
                                <Link
                                    key={topic.id}
                                    href={showTopic(topic.slug).url}
                                >
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                                    >
                                        {topic.name}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {toc.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => setShowToc((prev) => !prev)}
                        >
                            <List className="h-4 w-4" />
                            {showToc ? __('Hide TOC') : __('Show TOC')}
                        </Button>
                    )}
                    {canManage && (
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateForm(!showCreateForm)}
                        >
                            <Plus className="h-4 w-4" />
                            新規作成
                        </Button>
                    )}
                    {canManage && document.id && (
                        <>
                            <Button asChild>
                                <Link href={edit(document.slug).url}>
                                    <Pencil className="h-4 w-4" />
                                    {__('Edit')}
                                </Link>
                            </Button>

                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".md,.zip,text/markdown,text/plain,application/zip"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];

                                    if (!file) {
                                        return;
                                    }

                                    router.post(
                                        '/markdown/import',
                                        {
                                            markdown: file,
                                        },
                                        {
                                            onFinish: () => {
                                                event.target.value = '';
                                            },
                                        },
                                    );
                                }}
                            />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        {__('Actions')}
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            importInputRef.current?.click();
                                        }}
                                    >
                                        <Upload className="h-4 w-4" />
                                        {__('Import')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <a
                                            href={`/markdown/${document.slug}/export`}
                                        >
                                            <Download className="h-4 w-4" />
                                            {__('Export')}
                                        </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            setIsDeleteDialogOpen(true);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {__('Delete')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Dialog
                                open={isDeleteDialogOpen}
                                onOpenChange={setIsDeleteDialogOpen}
                            >
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {__('Delete Document')}
                                        </DialogTitle>
                                        <DialogDescription>
                                            <span className="block font-semibold text-foreground">
                                                {__(
                                                    'Are you sure you want to delete {title}?',
                                                    {
                                                        title: document.title,
                                                    },
                                                )}
                                            </span>
                                            <span className="mt-2 block text-muted-foreground">
                                                {__(
                                                    'This action cannot be undone.',
                                                )}
                                            </span>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form
                                        action={destroy(document.slug)}
                                        onSuccess={() =>
                                            setIsDeleteDialogOpen(false)
                                        }
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
                                                        : __('Delete')}
                                                </Button>
                                            </DialogFooter>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            {/* 新規作成フォーム */}
            {canManage && showCreateForm && (
                <Card className="p-4">
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="slug">ページスラッグ</Label>
                            <Input
                                id="slug"
                                type="text"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value)}
                                placeholder="例: getting-started, api/introduction"
                                autoFocus
                                className="font-mono"
                            />
                            <p className="text-sm text-muted-foreground">
                                URL: /markdown/{newSlug || '...'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setNewSlug('');
                                }}
                            >
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={!newSlug.trim()}>
                                作成
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {document.status === 'draft' && (
                <Alert className="border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100">
                    <AlertTriangle />
                    <AlertTitle>{__('Draft')}</AlertTitle>
                    <AlertDescription>
                        <p>
                            {__(
                                'This page is marked as draft and may be incomplete.',
                            )}
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col gap-6 px-3 lg:flex-row lg:gap-8">
                {showToc && toc.length > 0 && (
                    <aside className="order-1 w-full shrink-0 lg:order-2 lg:w-60">
                        <div
                            ref={tocWrapperRef}
                            className={cn(
                                'z-20 w-full',
                                isMobile && isTocFloating
                                    ? 'fixed inset-x-0 top-0 bg-background/95 shadow-sm backdrop-blur'
                                    : 'relative',
                                'lg:backdrop-blur-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:bg-transparent',
                            )}
                        >
                            <Toc toc={toc} />
                        </div>
                    </aside>
                )}

                <div
                    className={cn(
                        'order-2 min-w-0 flex-1 lg:order-1',
                        showToc && isMobile && isTocFloating ? 'pt-14' : '',
                    )}
                >
                    {contentBody}
                </div>
            </div>

            {!isPublicView && updatedBy && (
                <div className="text-sm text-muted-foreground">
                    {__('Last updated by')}: {updatedBy.name}
                </div>
            )}

            {/* 関連するShout一覧 */}
            {relatedShouts && relatedShouts.length > 0 && (
                <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="size-5" />
                        <h2 className="text-xl font-semibold">
                            このページについてのディスカッション (
                            {relatedShouts.length})
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {relatedShouts.map((shout) => (
                            <Card key={shout.id} className="p-4">
                                <div className="flex gap-3">
                                    <Avatar className="size-10">
                                        <AvatarImage src={shout.user.avatar} />
                                        <AvatarFallback>
                                            {getInitials(shout.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold">
                                                    {shout.user.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(
                                                        new Date(
                                                            shout.created_at,
                                                        ),
                                                        'PPP p',
                                                        {
                                                            locale: ja,
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="mt-2 break-words whitespace-pre-wrap">
                                            {renderContentWithLinks(
                                                shout.content,
                                            )}
                                        </p>

                                        {/* 画像 */}
                                        {shout.images &&
                                            shout.images.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {shout.images.map(
                                                        (image, index) => (
                                                            <button
                                                                key={index}
                                                                type="button"
                                                                onClick={() =>
                                                                    openLightbox(
                                                                        shout.images ??
                                                                            [],
                                                                        index,
                                                                    )
                                                                }
                                                                className="group relative overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                                                            >
                                                                <img
                                                                    src={image}
                                                                    alt={`Image ${index + 1}`}
                                                                    className="h-32 w-32 object-cover"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                                    <ImageIcon className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                                </div>
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                            )}

                                        {/* 返信一覧 */}
                                        {shout.replies &&
                                            shout.replies.length > 0 && (
                                                <div className="mt-4 space-y-3 border-l-2 pl-4">
                                                    {shout.replies.map(
                                                        (reply) => (
                                                            <div
                                                                key={reply.id}
                                                                className="flex gap-2"
                                                            >
                                                                <Avatar className="size-8">
                                                                    <AvatarImage
                                                                        src={
                                                                            reply
                                                                                .user
                                                                                .avatar
                                                                        }
                                                                    />
                                                                    <AvatarFallback>
                                                                        {getInitials(
                                                                            reply
                                                                                .user
                                                                                .name,
                                                                        )}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-semibold">
                                                                            {
                                                                                reply
                                                                                    .user
                                                                                    .name
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {format(
                                                                                new Date(
                                                                                    reply.created_at,
                                                                                ),
                                                                                'PPP p',
                                                                                {
                                                                                    locale: ja,
                                                                                },
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                                                                        {renderContentWithLinks(
                                                                            reply.content,
                                                                        )}
                                                                    </p>
                                                                    {reply.images &&
                                                                        reply
                                                                            .images
                                                                            .length >
                                                                            0 && (
                                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                                {reply.images.map(
                                                                                    (
                                                                                        image,
                                                                                        index,
                                                                                    ) => (
                                                                                        <button
                                                                                            key={
                                                                                                index
                                                                                            }
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                openLightbox(
                                                                                                    reply.images ??
                                                                                                        [],
                                                                                                    index,
                                                                                                )
                                                                                            }
                                                                                            className="group relative overflow-hidden rounded transition-opacity hover:opacity-90"
                                                                                        >
                                                                                            <img
                                                                                                src={
                                                                                                    image
                                                                                                }
                                                                                                alt={`Image ${index + 1}`}
                                                                                                className="h-20 w-20 object-cover"
                                                                                            />
                                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                                                                <ImageIcon className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                                                            </div>
                                                                                        </button>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="text-center">
                        <Button asChild variant="outline">
                            <Link href="/shoutbox">
                                シャウトボックスで会話に参加
                            </Link>
                        </Button>
                    </div>
                </div>
            )}

            {/* 画像ライトボックス */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-4xl p-0">
                    <div className="relative">
                        <img
                            src={lightboxImages[currentImageIndex]}
                            alt="Full size"
                            className="h-auto w-full"
                        />
                        {lightboxImages.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={prevImage}
                                    className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                >
                                    <ChevronLeft className="size-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={nextImage}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                >
                                    <ChevronRight className="size-6" />
                                </Button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                                    {currentImageIndex + 1} /{' '}
                                    {lightboxImages.length}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );

    const headContent = (
        <Head title={document.title}>
            {/* OGP メタタグ */}
            <meta property="og:title" content={document.title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content="article" />
            <meta property="og:url" content={currentUrl} />
            {imageUrl && <meta property="og:image" content={imageUrl} />}

            {/* Twitter Card メタタグ */}
            <meta
                name="twitter:card"
                content={imageUrl ? 'summary_large_image' : 'summary'}
            />
            <meta name="twitter:title" content={document.title} />
            <meta name="twitter:description" content={description} />
            {imageUrl && <meta name="twitter:image" content={imageUrl} />}

            {/* 標準メタタグ */}
            <meta name="description" content={description} />
        </Head>
    );

    if (isPublicView) {
        return (
            <PublicLayout
                rightPane={
                    pageTree.length > 0 ? (
                        <PublicPagesMenu
                            tree={pageTree}
                            currentSlug={document.slug}
                        />
                    ) : null
                }
            >
                {headContent}
                {content}
            </PublicLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {headContent}
            {content}
        </AppLayout>
    );
}
