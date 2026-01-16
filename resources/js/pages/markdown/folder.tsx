import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Edit, FileText, Folder, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

type DocumentStatus = 'draft' | 'private' | 'published';

interface ChildDocument {
    slug: string;
    title: string;
    status: DocumentStatus;
    path: string;
    type: 'document';
}

interface FolderPageProps {
    slug: string;
    label?: string | null;
    children: ChildDocument[];
    hasIndex: boolean;
    canCreate: boolean;
}

export default function FolderPage({
    slug,
    label: initialLabel,
    children,
    hasIndex,
    canCreate,
}: FolderPageProps) {
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [label, setLabel] = useState(initialLabel || '');
    const [isSaving, setIsSaving] = useState(false);

    // Generate folder title from slug if no label is set
    const folderTitle = initialLabel || slug.split('/').pop() || slug;

    const handleSaveLabel = async () => {
        if (isSaving) return;

        setIsSaving(true);

        try {
            const response = await fetch(`/markdown/folder/${slug}/label`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
                body: JSON.stringify({ label: label.trim() || null }),
            });

            if (response.ok) {
                setIsEditingLabel(false);
                // Reload to update the label
                router.reload();
            } else {
                alert('フォルダーラベルの更新に失敗しました');
            }
        } catch {
            alert('フォルダーラベルの更新に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setLabel(initialLabel || '');
        setIsEditingLabel(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveLabel();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    };

    const getStatusBadgeVariant = (
        status: DocumentStatus
    ): 'default' | 'secondary' | 'outline' => {
        switch (status) {
            case 'published':
                return 'default';
            case 'private':
                return 'secondary';
            case 'draft':
                return 'outline';
            default:
                return 'default';
        }
    };

    const handleCreateOrEditIndex = () => {
        const indexSlug = `${slug}/index`;
        if (hasIndex) {
            router.visit(`/markdown/${indexSlug}/edit`);
        } else {
            router.visit(`/markdown/${indexSlug}/edit`);
        }
    };

    return (
        <AppLayout>
            <Head title={`${folderTitle} - フォルダー管理`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Folder Header */}
                <div className="flex items-center gap-3">
                    <Folder className="size-8 text-muted-foreground" />
                    {isEditingLabel ? (
                        <div className="flex flex-1 items-center gap-2">
                            <Input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onBlur={handleSaveLabel}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    slug.split('/').pop() || 'フォルダー名'
                                }
                                className="max-w-md"
                                autoFocus
                                disabled={isSaving}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                            >
                                キャンセル
                            </Button>
                        </div>
                    ) : (
                        <>
                            <HeadingSmall
                                title={folderTitle}
                                description={`パス: ${slug}`}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setIsEditingLabel(true)}
                                className="shrink-0"
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Index Document Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Indexドキュメント
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm text-muted-foreground">
                            {hasIndex
                                ? 'このフォルダーにはindexドキュメントが存在します。'
                                : 'このフォルダーのindexドキュメントを作成できます。'}
                        </p>
                        <Button
                            onClick={handleCreateOrEditIndex}
                            disabled={!canCreate}
                        >
                            {hasIndex ? (
                                <>
                                    <Edit className="mr-2 size-4" />
                                    Indexドキュメントを編集
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 size-4" />
                                    Indexドキュメントを作成
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Children Documents Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            子ドキュメント
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {children.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                子ドキュメントはありません。
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {children.map((child) => (
                                    <Link
                                        key={child.slug}
                                        href={`/markdown/${child.slug}`}
                                        className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40"
                                    >
                                        <FileText className="size-5 text-muted-foreground" />
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {child.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {child.slug}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={getStatusBadgeVariant(
                                                child.status
                                            )}
                                        >
                                            {child.status}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
