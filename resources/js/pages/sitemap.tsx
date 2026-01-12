import { show } from '@/actions/App/Http/Controllers/MarkdownController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    File,
    Folder,
    FolderOpen,
    Plus,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface TreeNode {
    type: 'folder' | 'document';
    slug: string;
    title: string;
    status?: 'draft' | 'private' | 'published';
    updated_at?: string;
    updated_by?: {
        name: string;
    };
    children?: TreeNode[];
}

interface SitemapProps {
    tree: TreeNode[];
    canCreate: boolean;
}

function TreeNodeComponent({
    node,
    level = 0,
    forceOpen = false,
    selectionEnabled = false,
    selectedSlugs,
    onToggleSelect,
}: {
    node: TreeNode;
    level?: number;
    forceOpen?: boolean;
    selectionEnabled?: boolean;
    selectedSlugs: Set<string>;
    onToggleSelect: (slug: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { __ } = useLang();

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
        }
    }, [forceOpen]);

    if (node.type === 'document') {
        return (
            <div
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                {selectionEnabled && (
                    <Checkbox
                        checked={selectedSlugs.has(node.slug)}
                        onCheckedChange={() => onToggleSelect(node.slug)}
                        aria-label={__('Select {title}', {
                            title: node.title,
                        })}
                        className="mt-0.5"
                    />
                )}
                <File className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline gap-3">
                        <Link
                            href={show(node.slug).url}
                            className="font-medium text-foreground hover:underline"
                        >
                            {node.title}
                        </Link>
                        {node.status === 'draft' && (
                            <Badge
                                variant="secondary"
                                className="border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100"
                            >
                                {__('Draft')}
                            </Badge>
                        )}
                        {node.status === 'private' && (
                            <Badge
                                variant="secondary"
                                className="border-slate-200/70 bg-slate-50 text-slate-900 dark:border-slate-400/30 dark:bg-slate-950/30 dark:text-slate-100"
                            >
                                {__('Private')}
                            </Badge>
                        )}
                        {node.status === 'published' && (
                            <Badge
                                variant="secondary"
                                className="border-emerald-200/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-100"
                            >
                                {__('Published')}
                            </Badge>
                        )}
                        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                            {node.updated_at && (
                                <span>
                                    {new Date(
                                        node.updated_at,
                                    ).toLocaleDateString('ja-JP')}
                                </span>
                            )}
                            {node.updated_by && (
                                <span className="text-xs">
                                    {__('Last updated by')}:{' '}
                                    {node.updated_by.name}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                        /{node.slug}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Collapsible open={forceOpen ? true : isOpen} onOpenChange={setIsOpen}>
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
                <span className="font-semibold text-foreground">
                    {node.title}
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                {node.children?.map((child, index) => (
                    <TreeNodeComponent
                        key={`${child.slug}-${index}`}
                        node={child}
                        level={level + 1}
                        forceOpen={forceOpen}
                        selectionEnabled={selectionEnabled}
                        selectedSlugs={selectedSlugs}
                        onToggleSelect={onToggleSelect}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function Sitemap({ tree, canCreate }: SitemapProps) {
    const { __ } = useLang();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newSlug, setNewSlug] = useState('');
    const [selectionEnabled, setSelectionEnabled] = useState(false);
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(
        () => new Set(),
    );
    const [csrfToken, setCsrfToken] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<
        'draft' | 'private' | 'published' | ''
    >('');

    const handleCreateSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (newSlug.trim()) {
            router.visit(`/markdown/${newSlug.trim()}`);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const token =
            window.document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';
        setCsrfToken(token);
    }, []);

    const toggleSelection = () => {
        setSelectionEnabled((prev) => !prev);
        setSelectedSlugs(new Set());
    };

    const collectDocumentSlugs = (nodes: TreeNode[]): string[] => {
        return nodes.flatMap((node) => {
            if (node.type === 'document') {
                return [node.slug];
            }

            return node.children ? collectDocumentSlugs(node.children) : [];
        });
    };

    const handleSelectAll = () => {
        const slugs = collectDocumentSlugs(tree);
        setSelectedSlugs(new Set(slugs));
    };

    const handleClearAll = () => {
        setSelectedSlugs(new Set());
    };

    const handleToggleSelect = (slug: string) => {
        setSelectedSlugs((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            return next;
        });
    };

    const selectedList = Array.from(selectedSlugs);
    const statusLabels: Record<string, string> = {
        draft: __('Draft'),
        private: __('Private'),
        published: __('Published'),
    };

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
                    <div className="flex gap-2">
                        <Button
                            variant={selectionEnabled ? 'default' : 'outline'}
                            onClick={toggleSelection}
                        >
                            {selectionEnabled
                                ? __('Exit selection mode')
                                : __('Enter selection mode')}
                        </Button>
                        {selectionEnabled && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleSelectAll}
                                >
                                    {__('Select all')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleClearAll}
                                >
                                    {__('Clear selection')}
                                </Button>
                            </>
                        )}
                        {canCreate && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setShowCreateForm(!showCreateForm)
                                }
                            >
                                <Plus className="h-4 w-4" />
                                {__('Create new document')}
                            </Button>
                        )}
                    </div>
                </div>

                {canCreate && showCreateForm && (
                    <Card className="p-4">
                        <form
                            onSubmit={handleCreateSubmit}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="slug">{__('Slug')}</Label>
                                <Input
                                    id="slug"
                                    type="text"
                                    value={newSlug}
                                    onChange={(event) =>
                                        setNewSlug(event.target.value)
                                    }
                                    placeholder={__(
                                        'Example: getting-started, api/introduction',
                                    )}
                                    autoFocus
                                    className="font-mono"
                                />
                                <p className="text-sm text-muted-foreground">
                                    {__('URL: /markdown/{slug}', {
                                        slug: newSlug || '...',
                                    })}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewSlug('');
                                    }}
                                >
                                    {__('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!newSlug.trim()}
                                >
                                    {__('Create')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 dark:border-sidebar-border">
                    <div className="space-y-1">
                        {tree.length === 0 ? (
                            <p className="text-muted-foreground">
                                {__('No documents found.')}
                            </p>
                        ) : (
                            tree.map((node, index) => (
                                <TreeNodeComponent
                                    key={`${node.slug}-${index}`}
                                    node={node}
                                    forceOpen={selectionEnabled}
                                    selectionEnabled={selectionEnabled}
                                    selectedSlugs={selectedSlugs}
                                    onToggleSelect={handleToggleSelect}
                                />
                            ))
                        )}
                    </div>
                </div>

                {selectionEnabled && (
                    <div className="flex flex-col gap-3 rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <div className="text-sm text-muted-foreground">
                            {__('Selected pages')}: {selectedList.length}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Label className="text-xs text-muted-foreground sm:w-24">
                                {__('Status')}
                            </Label>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) =>
                                    setSelectedStatus(
                                        value as
                                            | 'draft'
                                            | 'private'
                                            | 'published',
                                    )
                                }
                            >
                                <SelectTrigger className="sm:max-w-xs">
                                    <SelectValue
                                        placeholder={__('Select status')}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">
                                        {__('Draft')}
                                    </SelectItem>
                                    <SelectItem value="private">
                                        {__('Private')}
                                    </SelectItem>
                                    <SelectItem value="published">
                                        {__('Published')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <form
                                method="post"
                                action="/markdown/export"
                                className="flex items-center"
                            >
                                <input
                                    type="hidden"
                                    name="_token"
                                    value={csrfToken}
                                />
                                {selectedList.map((slug) => (
                                    <input
                                        key={`export-${slug}`}
                                        type="hidden"
                                        name="slugs[]"
                                        value={slug}
                                    />
                                ))}
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={selectedList.length === 0}
                                >
                                    {__('Export selected')}
                                </Button>
                            </form>
                            <Dialog
                                open={isStatusDialogOpen}
                                onOpenChange={setIsStatusDialogOpen}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            selectedList.length === 0 ||
                                            !selectedStatus
                                        }
                                    >
                                        {__('Update status')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {__('Change status')}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {__(
                                                'Change status of selected pages to {status}.',
                                                {
                                                    status:
                                                        statusLabels[
                                                            selectedStatus
                                                        ],
                                                },
                                            )}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                            >
                                                {__('Cancel')}
                                            </Button>
                                        </DialogClose>
                                        <form
                                            id="bulk-status-form"
                                            method="post"
                                            action="/markdown/status"
                                        >
                                            <input
                                                type="hidden"
                                                name="_token"
                                                value={csrfToken}
                                            />
                                            <input
                                                type="hidden"
                                                name="status"
                                                value={selectedStatus}
                                            />
                                            {selectedList.map((slug) => (
                                                <input
                                                    key={`status-${slug}`}
                                                    type="hidden"
                                                    name="slugs[]"
                                                    value={slug}
                                                />
                                            ))}
                                        </form>
                                        <Button
                                            type="submit"
                                            form="bulk-status-form"
                                        >
                                            {__('Update status')}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Dialog
                                open={isDeleteDialogOpen}
                                onOpenChange={setIsDeleteDialogOpen}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={selectedList.length === 0}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {__('Delete selected')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {__('Delete selected pages')}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {__(
                                                'This action cannot be undone.',
                                            )}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                            >
                                                {__('Cancel')}
                                            </Button>
                                        </DialogClose>
                                        <form
                                            id="bulk-delete-form"
                                            method="post"
                                            action="/markdown/delete"
                                        >
                                            <input
                                                type="hidden"
                                                name="_token"
                                                value={csrfToken}
                                            />
                                            {selectedList.map((slug) => (
                                                <input
                                                    key={`delete-${slug}`}
                                                    type="hidden"
                                                    name="slugs[]"
                                                    value={slug}
                                                />
                                            ))}
                                        </form>
                                        <Button
                                            type="submit"
                                            form="bulk-delete-form"
                                            variant="destructive"
                                        >
                                            {__('Delete')}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
