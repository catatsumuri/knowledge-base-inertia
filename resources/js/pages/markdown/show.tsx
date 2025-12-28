import { edit, show } from '@/actions/App/Http/Controllers/MarkdownController';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { Button } from '@/components/ui/button';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

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

    // ネストしたパスの場合、階層的なbreadcrumbsを生成
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const breadcrumbs: BreadcrumbItem[] = [
            {
                title: __('Markdown'),
                href: '/markdown',
            },
        ];

        const slugParts = document.slug.split('/');
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

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{document.title}</h1>
                    <Button asChild>
                        <Link href={edit(document.slug).url}>{__('Edit')}</Link>
                    </Button>
                </div>

                <div className="prose prose-sm max-w-none rounded-xl border border-sidebar-border/70 p-6 prose-neutral dark:border-sidebar-border dark:prose-invert">
                    {document.content ? (
                        <MarkdownViewer content={document.content} />
                    ) : (
                        <p className="text-muted-foreground">
                            {__('No content yet.')}
                        </p>
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
