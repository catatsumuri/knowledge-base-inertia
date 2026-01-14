import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FileText, Folder, GripVertical, Link2, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';

type NavigationNode = {
    type: 'folder' | 'document';
    slug: string;
    path: string;
    title: string;
    label?: string | null;
    status?: 'draft' | 'private' | 'published';
    index_slug?: string;
    index_title?: string;
    children?: NavigationNode[];
};

type DragState = {
    key: string;
    parentPath: string | null;
};

const nodeKey = (node: NavigationNode) => `${node.type}:${node.path}`;

const flattenTree = (
    nodes: NavigationNode[],
    parentPath: string | null = null,
    acc: Array<{
        node_type: 'folder' | 'document';
        node_path: string;
        parent_path: string | null;
        position: number;
        label: string | null;
    }> = [],
) => {
    nodes.forEach((node, index) => {
        acc.push({
            node_type: node.type,
            node_path: node.path,
            parent_path: parentPath,
            position: index,
            label: node.label?.trim() || null,
        });

        if (node.type === 'folder' && node.children?.length) {
            flattenTree(node.children, node.path, acc);
        }
    });

    return acc;
};

const updateChildrenForParent = (
    nodes: NavigationNode[],
    parentPath: string | null,
    updater: (children: NavigationNode[]) => NavigationNode[],
): NavigationNode[] => {
    if (!parentPath) {
        return updater(nodes);
    }

    return nodes.map((node) => {
        if (node.type !== 'folder') {
            return node;
        }

        if (node.path === parentPath) {
            return {
                ...node,
                children: updater(node.children ?? []),
            };
        }

        if (!node.children?.length) {
            return node;
        }

        return {
            ...node,
            children: updateChildrenForParent(node.children, parentPath, updater),
        };
    });
};

const reorderWithinList = (
    list: NavigationNode[],
    fromKey: string,
    toKey: string | null,
) => {
    const fromIndex = list.findIndex((node) => nodeKey(node) === fromKey);
    if (fromIndex === -1) {
        return list;
    }

    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);

    if (!toKey) {
        next.push(moved);
        return next;
    }

    const toIndex = next.findIndex((node) => nodeKey(node) === toKey);
    if (toIndex === -1) {
        next.push(moved);
        return next;
    }

    next.splice(toIndex, 0, moved);
    return next;
};

export default function NavigationOrder({
    tree,
}: {
    tree: NavigationNode[];
}) {
    const { __ } = useLang();
    const [currentTree, setCurrentTree] = useState<NavigationNode[]>(tree);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<string | null>(null);

    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [
            { title: __('Sitemap'), href: '/sitemap' },
            { title: __('Manage order'), href: '/app-settings/navigation-order' },
        ],
        [__],
    );

    const handleSave = () => {
        setIsSaving(true);
        router.post(
            '/app-settings/navigation-order',
            { items: flattenTree(currentTree) },
            {
                preserveScroll: true,
                onFinish: () => setIsSaving(false),
                onSuccess: () => setIsDirty(false),
            },
        );
    };

    const handleDragStart = (
        node: NavigationNode,
        parentPath: string | null,
    ) => (event: React.DragEvent) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('input,textarea,button,select')) {
            event.preventDefault();
            return;
        }
        const key = nodeKey(node);
        setDragState({ key, parentPath });
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', key);
    };

    const handleDragOver = (
        node: NavigationNode,
        parentPath: string | null,
    ) => (event: React.DragEvent) => {
        if (!dragState || dragState.parentPath !== parentPath) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        setDragOverKey(nodeKey(node));
    };

    const handleDrop = (
        node: NavigationNode,
        parentPath: string | null,
    ) => (event: React.DragEvent) => {
        if (!dragState || dragState.parentPath !== parentPath) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();

        setCurrentTree((previous) =>
            updateChildrenForParent(previous, parentPath, (children) =>
                reorderWithinList(children, dragState.key, nodeKey(node)),
            ),
        );
        setIsDirty(true);
        setDragState(null);
        setDragOverKey(null);
    };

    const handleDropToContainer =
        (parentPath: string | null) => (event: React.DragEvent) => {
            if (!dragState || dragState.parentPath !== parentPath) {
                return;
            }
            event.preventDefault();

            setCurrentTree((previous) =>
                updateChildrenForParent(previous, parentPath, (children) =>
                    reorderWithinList(children, dragState.key, null),
                ),
            );
            setIsDirty(true);
            setDragState(null);
            setDragOverKey(null);
        };

    const handleDragEnd = () => {
        setDragState(null);
        setDragOverKey(null);
    };

    const renderNode = (
        node: NavigationNode,
        parentPath: string | null,
        depth: number,
    ) => {
        const label =
            node.type === 'folder'
                ? node.label ?? node.index_title ?? node.title
                : node.title;
        const isActiveDrag = dragOverKey === nodeKey(node);
        const isEditing = editingKey === nodeKey(node);

        return (
            <div key={nodeKey(node)} className="space-y-1">
                <div
                    draggable
                    onDragStart={handleDragStart(node, parentPath)}
                    onDragOver={handleDragOver(node, parentPath)}
                    onDrop={handleDrop(node, parentPath)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                        'flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm transition',
                        isActiveDrag
                            ? 'border-primary/60 bg-primary/10'
                            : 'border-transparent hover:bg-accent/40',
                    )}
                    style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <GripVertical className="size-4 text-muted-foreground" />
                        {node.type === 'folder' ? (
                            <Folder className="size-4 text-muted-foreground" />
                        ) : (
                            <FileText className="size-4 text-muted-foreground" />
                        )}
                        {isEditing && node.type === 'folder' ? (
                            <Input
                                value={node.label ?? ''}
                                placeholder={node.index_title ?? node.title ?? ''}
                                onChange={(event) => {
                                    const nextLabel = event.target.value;
                                    setCurrentTree((previous) =>
                                        updateChildrenForParent(
                                            previous,
                                            parentPath,
                                            (children) =>
                                                children.map((child) =>
                                                    nodeKey(child) ===
                                                    nodeKey(node)
                                                        ? {
                                                              ...child,
                                                              label: nextLabel,
                                                          }
                                                        : child,
                                                ),
                                        ),
                                    );
                                    setIsDirty(true);
                                }}
                                onBlur={() => setEditingKey(null)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === 'Escape'
                                    ) {
                                        event.preventDefault();
                                        setEditingKey(null);
                                    }
                                }}
                                onMouseDown={(event) =>
                                    event.stopPropagation()
                                }
                                className="h-8"
                            />
                        ) : (
                            <span className="block truncate">{label}</span>
                        )}
                        {node.type === 'folder' && (
                            <button
                                type="button"
                                className="inline-flex items-center rounded-md p-1 text-muted-foreground transition hover:bg-accent/50 hover:text-foreground"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    const nextKey = isEditing
                                        ? null
                                        : nodeKey(node);
                                    setEditingKey(nextKey);
                                }}
                                onMouseDown={(event) =>
                                    event.stopPropagation()
                                }
                            >
                                <Pencil className="size-3.5" />
                            </button>
                        )}
                        {node.type === 'document' && node.status && (
                            <Badge variant="secondary" className="text-[10px]">
                                {node.status}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {node.type === 'folder' && node.index_slug && (
                            <Link2 className="size-3 text-muted-foreground" />
                        )}
                    </div>
                </div>
                {node.type === 'folder' && node.children?.length ? (
                    <div
                        className="space-y-1"
                        onDragOver={(event) => {
                            if (
                                dragState &&
                                dragState.parentPath === node.path
                            ) {
                                event.preventDefault();
                            }
                        }}
                        onDrop={handleDropToContainer(node.path)}
                    >
                        {node.children.map((child) =>
                            renderNode(child, node.path, depth + 1),
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Manage order')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <HeadingSmall
                        title={__('Manage order')}
                        description={__(
                            'Drag items within the same folder to adjust the public menu order.',
                        )}
                    />
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                    >
                        {isSaving ? __('Saving...') : __('Save')}
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{__('Menu structure')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="space-y-1"
                            onDragOver={(event) => {
                                if (dragState?.parentPath === null) {
                                    event.preventDefault();
                                }
                            }}
                            onDrop={handleDropToContainer(null)}
                        >
                            {currentTree.map((node) =>
                                renderNode(node, null, 0),
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
