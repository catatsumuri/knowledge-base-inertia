import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/topics';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Tag } from 'lucide-react';

interface Topic {
    id: number;
    name: string;
    slug: string;
    documents_count: number;
    created_at: string;
    updated_at: string;
}

interface TopicsIndexProps {
    topics: Topic[];
}

export default function TopicsIndex({ topics }: TopicsIndexProps) {
    const { __ } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Topics'),
            href: '/topics',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Topics')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{__('Topics')}</h1>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    {topics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                            <Tag className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                {__('No topics found.')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {topics.map((topic) => (
                                <Link
                                    key={topic.id}
                                    href={show(topic.slug).url}
                                    className="group"
                                >
                                    <Card className="h-full p-4 transition-all hover:border-primary hover:shadow-md">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="h-4 w-4 shrink-0 text-primary" />
                                                    <h3 className="font-semibold text-foreground group-hover:text-primary">
                                                        {topic.name}
                                                    </h3>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0"
                                                >
                                                    {topic.documents_count}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>
                                                    {__('Created')}:{' '}
                                                    {new Date(
                                                        topic.created_at,
                                                    ).toLocaleDateString(
                                                        'ja-JP',
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
