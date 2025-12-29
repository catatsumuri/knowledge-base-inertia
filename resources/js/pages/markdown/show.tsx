import { destroy, edit, show } from '@/actions/App/Http/Controllers/MarkdownController';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { Toc } from '@/components/toc';
import { Button } from '@/components/ui/button';
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
import { useLang } from '@/hooks/useLang';
import { parseToc, type TocNode } from '@/lib/parse-toc';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
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

export default function Show({ document }: { document: MarkdownDocument }) {
    const { __ } = useLang();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [toc, setToc] = useState<TocNode[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

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
            </div>
        </AppLayout>
    );
}
