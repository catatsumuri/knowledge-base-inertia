import { edit, show } from '@/actions/App/Http/Controllers/MarkdownController';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { History } from 'lucide-react';
import { useState } from 'react';

interface Revision {
    id: number;
    title: string;
    content: string | null;
    created_at: string;
    edited_by?: {
        id: number;
        name: string;
        email: string;
    };
}

interface MarkdownDocument {
    id: number;
    slug: string;
    title: string;
}

export default function Revisions({
    document,
    revisions,
}: {
    document: MarkdownDocument;
    revisions: Revision[];
}) {
    const { __ } = useLang();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleRevision = (revisionId: number) => {
        setSelectedIds((current) => {
            if (current.includes(revisionId)) {
                return current.filter((id) => id !== revisionId);
            }

            if (current.length >= 2) {
                return [current[1], revisionId];
            }

            return [...current, revisionId];
        });
    };

    const selectedRevisions = revisions.filter((revision) =>
        selectedIds.includes(revision.id),
    );

    const [olderRevision, newerRevision] = [...selectedRevisions].sort(
        (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const diffLines =
        olderRevision && newerRevision
            ? buildLineDiff(
                  olderRevision.content ?? '',
                  newerRevision.content ?? '',
              )
            : [];

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Markdown'),
            href: '/markdown',
        },
        {
            title: document.title,
            href: show(document.slug).url,
        },
        {
            title: '編集履歴',
            href: `/markdown/${document.slug}/revisions`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="編集履歴" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <History className="size-5" />
                        <h1 className="text-2xl font-bold">編集履歴</h1>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={edit(document.slug).url}>編集に戻る</Link>
                    </Button>
                </div>

                <Card className="space-y-3 p-4">
                    <div className="text-sm text-muted-foreground">
                        2つのバージョンにチェックを入れると差分が表示されます。
                    </div>
                    {selectedRevisions.length !== 2 ? (
                        <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
                            {selectedRevisions.length === 0
                                ? 'まだ選択されていません。'
                                : 'あと1つ選択してください。'}
                        </div>
                    ) : (
                        <div className="rounded-md border p-4">
                            <div className="mb-3 flex flex-col gap-1 text-sm">
                                <span className="font-semibold text-foreground">
                                    {olderRevision.title || '無題'} →{' '}
                                    {newerRevision.title || '無題'}
                                </span>
                                <span className="text-muted-foreground">
                                    {format(
                                        new Date(olderRevision.created_at),
                                        'PPP p',
                                        {
                                            locale: ja,
                                        },
                                    )}{' '}
                                    →{' '}
                                    {format(
                                        new Date(newerRevision.created_at),
                                        'PPP p',
                                        {
                                            locale: ja,
                                        },
                                    )}
                                </span>
                            </div>
                            <pre className="max-h-[420px] overflow-auto text-xs leading-relaxed">
                                {diffLines.map((line, index) => (
                                    <div
                                        key={`${line.type}-${index}`}
                                        className={
                                            line.type === 'add'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                                : line.type === 'remove'
                                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                                                  : 'text-muted-foreground'
                                        }
                                    >
                                        {line.type === 'add'
                                            ? '+ '
                                            : line.type === 'remove'
                                              ? '- '
                                              : '  '}
                                        {line.text || ' '}
                                    </div>
                                ))}
                            </pre>
                        </div>
                    )}
                </Card>

                <Card className="divide-y">
                    {revisions.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                            まだ履歴はありません。
                        </div>
                    ) : (
                        revisions.map((revision) => (
                            <div
                                key={revision.id}
                                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 flex-col gap-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(
                                                revision.id,
                                            )}
                                            onChange={() =>
                                                toggleRevision(revision.id)
                                            }
                                            className="size-4 accent-foreground"
                                        />
                                        <span className="truncate font-medium">
                                            {revision.title || '無題'}
                                        </span>
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        {format(
                                            new Date(revision.created_at),
                                            'PPP p',
                                            {
                                                locale: ja,
                                            },
                                        )}
                                        {revision.edited_by && (
                                            <>
                                                {' '}
                                                ・更新者:{' '}
                                                {revision.edited_by.name}
                                            </>
                                        )}
                                    </p>
                                </div>
                                <Form
                                    action={`/markdown/${document.slug}/revisions/${revision.id}/restore`}
                                    method="post"
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            disabled={processing}
                                        >
                                            復元
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

type DiffLine = {
    type: 'add' | 'remove' | 'same';
    text: string;
};

const buildLineDiff = (previous: string, next: string): DiffLine[] => {
    const previousLines = previous.split('\n');
    const nextLines = next.split('\n');
    const matrix = Array.from({ length: previousLines.length + 1 }, () =>
        Array(nextLines.length + 1).fill(0),
    );

    for (let i = 1; i <= previousLines.length; i += 1) {
        for (let j = 1; j <= nextLines.length; j += 1) {
            if (previousLines[i - 1] === nextLines[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    const diff: DiffLine[] = [];
    let i = previousLines.length;
    let j = nextLines.length;

    while (i > 0 && j > 0) {
        if (previousLines[i - 1] === nextLines[j - 1]) {
            diff.unshift({ type: 'same', text: previousLines[i - 1] });
            i -= 1;
            j -= 1;
        } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
            diff.unshift({ type: 'remove', text: previousLines[i - 1] });
            i -= 1;
        } else {
            diff.unshift({ type: 'add', text: nextLines[j - 1] });
            j -= 1;
        }
    }

    while (i > 0) {
        diff.unshift({ type: 'remove', text: previousLines[i - 1] });
        i -= 1;
    }

    while (j > 0) {
        diff.unshift({ type: 'add', text: nextLines[j - 1] });
        j -= 1;
    }

    return diff;
};
