import { show as showDocument } from '@/actions/App/Http/Controllers/MarkdownController';
import { Badge } from '@/components/ui/badge';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { index } from '@/routes/topics';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { File, Tag } from 'lucide-react';

interface User {
    id: number;
    name: string;
}

interface Document {
    id: number;
    slug: string;
    title: string;
    status: 'draft' | 'private' | 'published';
    created_at: string;
    updated_at: string;
    created_by: User | null;
    updated_by: User | null;
}

interface PaginatedDocuments {
    data: Document[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface Topic {
    id: number;
    name: string;
    slug: string;
    created_at: string;
}

interface TopicsShowProps {
    topic: Topic;
    documents: PaginatedDocuments;
}

export default function TopicsShow({ topic, documents }: TopicsShowProps) {
    const { __ } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Topics'),
            href: index().url,
        },
        {
            title: topic.name,
            href: `/topics/${topic.slug}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${topic.name} - ${__('Topics')}`} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <Tag className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold">{topic.name}</h1>
                    <Badge variant="secondary">{documents.total}</Badge>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    {documents.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                            <File className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                {__('No documents found for this topic.')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {documents.data.map((document) => (
                                <div
                                    key={document.id}
                                    className="group flex items-start gap-3 rounded-md border border-border/50 bg-background p-4 transition-all hover:border-primary/50 hover:bg-accent/30"
                                >
                                    <File className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={
                                                    showDocument(document.slug)
                                                        .url
                                                }
                                                className="font-medium text-foreground hover:text-primary hover:underline"
                                            >
                                                {document.title}
                                            </Link>
                                            {document.status === 'draft' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100"
                                                >
                                                    {__('Draft')}
                                                </Badge>
                                            )}
                                            {document.status === 'private' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="border-slate-200/70 bg-slate-50 text-slate-900 dark:border-slate-400/30 dark:bg-slate-950/30 dark:text-slate-100"
                                                >
                                                    {__('Private')}
                                                </Badge>
                                            )}
                                            {document.status ===
                                                'published' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="border-emerald-200/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-100"
                                                >
                                                    {__('Published')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span>
                                                {__('Updated')}:{' '}
                                                {new Date(
                                                    document.updated_at,
                                                ).toLocaleDateString('ja-JP')}
                                            </span>
                                            {document.updated_by && (
                                                <span>
                                                    {__('By')}:{' '}
                                                    {document.updated_by.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {documents.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            {documents.links.map((link, index) => {
                                if (!link.url) {
                                    return (
                                        <span
                                            key={index}
                                            className="cursor-not-allowed rounded-md border border-border/50 bg-muted px-3 py-1 text-sm text-muted-foreground"
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    );
                                }

                                return (
                                    <Link
                                        key={index}
                                        href={link.url}
                                        className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                                            link.active
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border/50 bg-background text-foreground hover:border-primary/50 hover:bg-accent/30'
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
