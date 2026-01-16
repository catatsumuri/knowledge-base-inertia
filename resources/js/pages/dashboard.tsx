import { show } from '@/actions/App/Http/Controllers/MarkdownController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import ShoutboxPanel from '@/pages/shoutbox/shoutbox-panel';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type PaginatedData, type User } from '@/types';
import { Head, InfiniteScroll, Link } from '@inertiajs/react';

interface RecentDocument {
    slug: string;
    title: string;
    status: 'draft' | 'private' | 'published';
    updated_at: string | null;
    updated_by?: {
        name: string;
    } | null;
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
    parent_id: number | null;
    content: string;
    images: string[] | null;
    created_at: string;
    user: User;
    links: ShoutLink[];
    replies?: Shout[];
}

export default function Dashboard({
    recentDocuments,
    shouts,
}: {
    recentDocuments: PaginatedData<RecentDocument>;
    shouts: PaginatedData<Shout>;
}) {
    const { __ } = useLang();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Dashboard'),
            href: dashboard().url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Dashboard')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
                    <div className="min-w-0">
                        <ShoutboxPanel
                            shouts={shouts}
                            containerClassName="p-0"
                        />
                    </div>
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>
                                {__('Recently updated pages')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentDocuments.data.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {__('No recent updates.')}
                                </p>
                            ) : (
                                <InfiniteScroll
                                    data="recentDocuments"
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
                                    <div className="divide-y divide-border">
                                        {recentDocuments.data.map(
                                            (document: RecentDocument) => (
                                                <div
                                                    key={document.slug}
                                                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={
                                                                    show(
                                                                        document.slug,
                                                                    ).url
                                                                }
                                                                className="font-medium text-foreground hover:underline"
                                                            >
                                                                {document.title}
                                                            </Link>
                                                            {document.status ===
                                                                'draft' && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100"
                                                                >
                                                                    {__(
                                                                        'Draft',
                                                                    )}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground/70">
                                                            /{document.slug}
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-start gap-1 text-xs text-muted-foreground sm:items-end">
                                                        {document.updated_at && (
                                                            <span>
                                                                {new Date(
                                                                    document.updated_at,
                                                                ).toLocaleDateString(
                                                                    'ja-JP',
                                                                )}
                                                            </span>
                                                        )}
                                                        {document.updated_by && (
                                                            <span>
                                                                {__(
                                                                    'Last updated by',
                                                                )}
                                                                :{' '}
                                                                {
                                                                    document
                                                                        .updated_by
                                                                        .name
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </InfiniteScroll>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
