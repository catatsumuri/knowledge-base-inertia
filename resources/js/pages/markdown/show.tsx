import { destroy, edit, show } from '@/actions/App/Http/Controllers/MarkdownController';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { Toc } from '@/components/toc';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';
import { useLang } from '@/hooks/useLang';
import { parseToc, type TocNode } from '@/lib/parse-toc';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Image as ImageIcon, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MarkdownDocument {
    id: number;
    slug: string;
    title: string;
    content: string | null;
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
    created_by?: {
        id: number;
        name: string;
        email: string;
    };
    updated_by?: {
        id: number;
        name: string;
        email: string;
    };
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

export default function Show({
    document,
    relatedShouts,
}: {
    document: MarkdownDocument;
    relatedShouts: Shout[];
}) {
    const { __ } = useLang();
    const getInitials = useInitials();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [toc, setToc] = useState<TocNode[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        if (contentRef.current && document.content) {
            const tocNodes = parseToc(contentRef.current);
            setToc(tocNodes);
        }
    }, [document.content]);

    // ネストしたパスの場合、階層的なbreadcrumbsを生成
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const breadcrumbs: BreadcrumbItem[] = [
            {
                title: __('Markdown'),
                href: '/markdown',
            },
        ];

        const slugParts = document.slug.split('/').filter((part) => part !== '');
        let currentPath = '';

        slugParts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === slugParts.length - 1;

            breadcrumbs.push({
                title: isLast ? document.title : part.charAt(0).toUpperCase() + part.slice(1),
                href: show(currentPath).url,
            });
        });

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    const openLightbox = (images: string[], index: number) => {
        setLightboxImages(images);
        setCurrentImageIndex(index);
        setLightboxOpen(true);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    };

    const renderContentWithLinks = (content: string) => {
        if (!content) return null;

        // @slug形式をリンクに変換
        const parts = content.split(/(@[a-zA-Z0-9_\-\/]+)/g);

        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const slug = part.slice(1);
                return (
                    <Link
                        key={index}
                        href={`/markdown/${slug}`}
                        className="text-primary hover:underline font-medium"
                    >
                        {part}
                    </Link>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={document.title} />

            <div className="flex flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{document.title}</h1>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href={edit(document.slug).url}>
                                <Pencil className="h-4 w-4" />
                                {__('Edit')}
                            </Link>
                        </Button>

                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                    {__('Delete')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{__('Delete Document')}</DialogTitle>
                                    <DialogDescription>
                                        <span className="block font-semibold text-foreground">
                                            {__('Are you sure you want to delete {title}?', { title: document.title })}
                                        </span>
                                        <span className="mt-2 block text-muted-foreground">
                                            {__('This action cannot be undone.')}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...destroy.form(document.slug)} onSuccess={() => setIsDeleteDialogOpen(false)}>
                                    {({ processing }) => (
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="outline" disabled={processing}>
                                                    {__('Cancel')}
                                                </Button>
                                            </DialogClose>
                                            <Button type="submit" variant="destructive" disabled={processing}>
                                                {processing ? __('Deleting...') : __('Delete')}
                                            </Button>
                                        </DialogFooter>
                                    )}
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex gap-8 px-4">
                    <div
                        ref={contentRef}
                        className="prose prose-sm min-w-0 max-w-[900px] flex-1 rounded-xl border border-sidebar-border/70 p-6 prose-neutral dark:border-sidebar-border dark:prose-invert"
                    >
                        {document.content ? (
                            <MarkdownViewer content={document.content} />
                        ) : (
                            <p className="text-muted-foreground">
                                {__('No content yet.')}
                            </p>
                        )}
                    </div>

                    {toc.length > 0 && (
                        <aside className="w-60 shrink-0">
                            <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
                                <Toc toc={toc} />
                            </div>
                        </aside>
                    )}
                </div>

                {document.updated_by && (
                    <div className="text-sm text-muted-foreground">
                        {__('Last updated by')}: {document.updated_by.name}
                    </div>
                )}

                {/* 関連するShout一覧 */}
                {relatedShouts && relatedShouts.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="size-5" />
                            <h2 className="text-xl font-semibold">
                                このページについてのディスカッション ({relatedShouts.length})
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {relatedShouts.map((shout) => (
                                <Card key={shout.id} className="p-4">
                                    <div className="flex gap-3">
                                        <Avatar className="size-10">
                                            <AvatarImage src={shout.user.avatar} />
                                            <AvatarFallback>{getInitials(shout.user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold">{shout.user.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(new Date(shout.created_at), 'PPP p', {
                                                            locale: ja,
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap break-words">
                                                {renderContentWithLinks(shout.content)}
                                            </p>

                                            {/* 画像 */}
                                            {shout.images && shout.images.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {shout.images.map((image, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() =>
                                                                openLightbox(
                                                                    shout.images!.map((img) => `/storage/${img}`),
                                                                    index,
                                                                )
                                                            }
                                                            className="group relative overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                                                        >
                                                            <img
                                                                src={`/storage/${image}`}
                                                                alt={`Image ${index + 1}`}
                                                                className="h-32 w-32 object-cover"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                                <ImageIcon className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 返信一覧 */}
                                            {shout.replies && shout.replies.length > 0 && (
                                                <div className="mt-4 space-y-3 border-l-2 pl-4">
                                                    {shout.replies.map((reply) => (
                                                        <div key={reply.id} className="flex gap-2">
                                                            <Avatar className="size-8">
                                                                <AvatarImage src={reply.user.avatar} />
                                                                <AvatarFallback>
                                                                    {getInitials(reply.user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-semibold">{reply.user.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {format(new Date(reply.created_at), 'PPP p', {
                                                                            locale: ja,
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                                                                    {renderContentWithLinks(reply.content)}
                                                                </p>
                                                                {reply.images && reply.images.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {reply.images.map((image, index) => (
                                                                            <button
                                                                                key={index}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openLightbox(
                                                                                        reply.images!.map((img) => `/storage/${img}`),
                                                                                        index,
                                                                                    )
                                                                                }
                                                                                className="group relative overflow-hidden rounded transition-opacity hover:opacity-90"
                                                                            >
                                                                                <img
                                                                                    src={`/storage/${image}`}
                                                                                    alt={`Image ${index + 1}`}
                                                                                    className="h-20 w-20 object-cover"
                                                                                />
                                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                                                                                    <ImageIcon className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="text-center">
                            <Button asChild variant="outline">
                                <Link href="/shoutbox">シャウトボックスで会話に参加</Link>
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
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <ChevronLeft className="size-6" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <ChevronRight className="size-6" />
                                    </Button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                                        {currentImageIndex + 1} / {lightboxImages.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
