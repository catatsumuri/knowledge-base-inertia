import { show } from '@/actions/App/Http/Controllers/MarkdownController';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';

interface TreeNode {
    type: 'folder' | 'document';
    slug: string;
    title: string;
    updated_at?: string;
    updated_by?: {
        name: string;
    };
    children?: TreeNode[];
}

interface SitemapProps {
    tree: TreeNode[];
}

function TreeNodeComponent({ node, level = 0 }: { node: TreeNode; level?: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const { __ } = useLang();

    if (node.type === 'document') {
        return (
            <div
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                <File className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 items-baseline gap-3">
                    <Link
                        href={show(node.slug).url}
                        className="font-medium text-foreground hover:underline"
                    >
                        {node.title}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        {node.updated_at && (
                            <span>{new Date(node.updated_at).toLocaleDateString('ja-JP')}</span>
                        )}
                        {node.updated_by && (
                            <span className="text-xs">
                                {__('Last updated by')}: {node.updated_by.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger
                className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                {isOpen ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                {isOpen ? (
                    <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <Folder className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground">{node.title}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                {node.children?.map((child, index) => (
                    <TreeNodeComponent key={`${child.slug}-${index}`} node={child} level={level + 1} />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function Sitemap({ tree }: SitemapProps) {
    const { __ } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Sitemap'),
            href: '/sitemap',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Sitemap')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{__('Sitemap')}</h1>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <div className="space-y-1">
                        {tree.length === 0 ? (
                            <p className="text-muted-foreground">{__('No documents found.')}</p>
                        ) : (
                            tree.map((node, index) => (
                                <TreeNodeComponent key={`${node.slug}-${index}`} node={node} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
