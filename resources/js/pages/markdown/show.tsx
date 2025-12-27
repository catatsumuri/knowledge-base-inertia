import { edit, show } from '@/actions/App/Http/Controllers/MarkdownController';
import { CodeBlock } from '@/components/code-block';
import { MarkdownImage } from '@/components/markdown-image';
import { Button } from '@/components/ui/button';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { preprocessImageSize, remarkImageSize } from '@/lib/remark-image-size';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';

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

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Markdown'),
            href: show(document).url,
        },
        {
            title: document.title,
            href: show(document).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={document.title} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{document.title}</h1>
                    <Button asChild>
                        <Link href={edit(document).url}>{__('Edit')}</Link>
                    </Button>
                </div>

                <div className="prose prose-sm max-w-none rounded-xl border border-sidebar-border/70 p-6 prose-neutral dark:border-sidebar-border dark:prose-invert">
                    {document.content ? (
                        <ReactMarkdown
                            remarkPlugins={[
                                remarkGfm,
                                remarkDirective,
                                remarkZennDirective,
                                remarkImageSize,
                            ]}
                            components={{
                                code: CodeBlock,
                                img: MarkdownImage,
                            }}
                        >
                            {preprocessImageSize(document.content)}
                        </ReactMarkdown>
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
