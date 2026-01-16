import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ChevronRight,
    FileText,
    Folder,
    FolderOpen,
    Link2,
} from 'lucide-react';
import { useMemo } from 'react';

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

interface PublicPagesMenuProps {
    tree: PublicPageNode[];
    currentSlug: string;
}

const getPublicPageUrl = (slug: string) => {
    if (slug === 'index') {
        return '/pages';
    }

    return `/pages/${slug}`;
};

export function PublicPagesMenu({ tree, currentSlug }: PublicPagesMenuProps) {
    const normalizedSlug = useMemo(
        () => currentSlug.replace(/^\/+|\/+$/g, ''),
        [currentSlug],
    );

    const renderNode = (node: PublicPageNode, level: number) => {
        if (node.type === 'document') {
            const isActive = normalizedSlug === node.slug;
            return (
                <Link
                    key={node.slug}
                    href={getPublicPageUrl(node.slug)}
                    className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
                        isActive
                            ? 'bg-accent/40 font-semibold text-foreground'
                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                    )}
                    style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
                >
                    <FileText className="size-3.5 shrink-0 opacity-70" />
                    {node.title}
                </Link>
            );
        }

        const label = node.label ?? node.index_title ?? node.title;
        const isActive =
            (node.index_slug && normalizedSlug === node.index_slug) ||
            (node.path && normalizedSlug.startsWith(`${node.path}/`));
        const children = node.children ?? [];
        const link = node.index_slug ? getPublicPageUrl(node.index_slug) : null;

        return (
            <div key={node.path ?? node.slug}>
                {link ? (
                    <Link
                        href={link}
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
                            isActive
                                ? 'bg-accent/40 font-semibold text-foreground'
                                : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                        )}
                        style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
                    >
                        {isActive ? (
                            <FolderOpen className="size-3.5 shrink-0 opacity-70" />
                        ) : (
                            <Folder className="size-3.5 shrink-0 opacity-70" />
                        )}
                        {label}
                        <Link2 className="ml-auto size-3 shrink-0 opacity-50" />
                    </Link>
                ) : (
                    <div
                        className={cn(
                            'flex items-center gap-2 px-2 py-1 text-sm',
                            isActive
                                ? 'bg-accent/40 font-semibold text-foreground'
                                : 'text-muted-foreground',
                        )}
                        style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
                    >
                        <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                        {label}
                    </div>
                )}
                {children.length > 0 && (
                    <div className="space-y-0.5">
                        {children.map((child) => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="rounded-xl border border-sidebar-border/70 bg-background/80 p-4 shadow-sm">
                <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Pages
                </div>
                <nav className="space-y-0.5">
                    {tree.map((node) => renderNode(node, 0))}
                </nav>
            </div>
        </div>
    );
}
