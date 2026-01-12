import {
    convertToMarkdown,
    convertToTable,
    edit,
    show,
    store,
    translate,
    update,
    uploadImage,
} from '@/actions/App/Http/Controllers/MarkdownController';
import { MarkdownViewer } from '@/components/markdown-viewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { History, Languages, LoaderCircle, Table2, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MarkdownDocument {
    id: number;
    slug: string;
    title: string;
    content: string | null;
    status: 'draft' | 'private' | 'published';
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
}

export default function Edit({
    document,
    isIndexDocument = false,
    slug,
}: {
    document: MarkdownDocument | null;
    isIndexDocument?: boolean;
    slug?: string;
}) {
    const { __ } = useLang();
    const [content, setContent] = useState(document?.content ?? '');
    const [status, setStatus] = useState<'draft' | 'private' | 'published'>(
        document?.status ?? 'draft',
    );
    const [activeTab, setActiveTab] = useState('edit');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isTableConverting, setIsTableConverting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { props } = usePage<{ imageUrl?: string }>();
    const previousImageUrlRef = useRef<string | undefined>();

    // 画像アップロード後のURL挿入処理
    useEffect(() => {
        if (
            props.imageUrl &&
            props.imageUrl !== previousImageUrlRef.current &&
            textareaRef.current
        ) {
            previousImageUrlRef.current = props.imageUrl;

            const textarea = textareaRef.current;
            const { selectionStart, selectionEnd } = textarea;
            const markdown = `![画像](${props.imageUrl})`;

            setContent((prevContent) => {
                const newContent =
                    prevContent.substring(0, selectionStart) +
                    markdown +
                    prevContent.substring(selectionEnd);

                // カーソル位置を調整
                setTimeout(() => {
                    const newPosition = selectionStart + markdown.length;
                    textarea.setSelectionRange(newPosition, newPosition);
                    textarea.focus();
                }, 0);

                return newContent;
            });
        }
    }, [props.imageUrl]);

    const replaceSelectedText = (
        selectionStart: number,
        selectionEnd: number,
        nextText: string,
    ) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            return;
        }

        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);

        const inserted = window.document.execCommand(
            'insertText',
            false,
            nextText,
        );

        if (!inserted) {
            textarea.setRangeText(
                nextText,
                selectionStart,
                selectionEnd,
                'end',
            );
        }

        setContent(textarea.value);
    };

    const getCsrfToken = () => {
        const metaTag = window.document.querySelector(
            'meta[name="csrf-token"]',
        );
        return metaTag ? metaTag.getAttribute('content') || '' : '';
    };

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith('image/')) {
            return;
        }

        router.post(
            uploadImage.url(),
            { image: file },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find((file) => file.type.startsWith('image/'));

        if (imageFile) {
            handleImageUpload(imageFile);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = Array.from(e.clipboardData.items);
        const imageItem = items.find((item) => item.type.startsWith('image/'));

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (file) {
                handleImageUpload(file);
            }
        }
    };

    const submitAiRequest = async ({
        url,
        emptyMessage,
        errorMessage,
        resultKey,
        onStart,
        onFinish,
    }: {
        url: string;
        emptyMessage: string;
        errorMessage: string;
        resultKey: 'translated' | 'markdown';
        onStart: () => void;
        onFinish: () => void;
    }) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            return;
        }

        const { selectionStart, selectionEnd } = textarea;
        const selectedText = textarea.value.substring(
            selectionStart,
            selectionEnd,
        );

        if (!selectedText.trim()) {
            alert(emptyMessage);
            return;
        }

        onStart();

        try {
            const token = getCsrfToken();
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': token,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    text: selectedText,
                    _token: token,
                }),
            });

            if (!response.ok) {
                let detailMessage = '';
                const contentType = response.headers.get('content-type') ?? '';

                if (contentType.includes('application/json')) {
                    const data = (await response.json()) as {
                        message?: string;
                        errors?: Record<string, string[]>;
                    };
                    detailMessage =
                        data?.message ??
                        (data?.errors &&
                            Object.values(data.errors).flat().at(0)) ??
                        '';
                } else {
                    detailMessage = (await response.text()).trim();
                }

                const statusInfo = ` (status: ${response.status})`;
                const message = detailMessage
                    ? `${errorMessage} ${detailMessage}${statusInfo}`
                    : `${errorMessage}${statusInfo}`;
                throw new Error(message);
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `${errorMessage} Unexpected response type: ${contentType}`,
                );
            }

            const data = (await response.json()) as Record<string, string>;
            let result = data[resultKey];
            if (!result) {
                throw new Error(
                    `${errorMessage} Missing ${resultKey} in response.`,
                );
            }

            const trailingNewlines = selectedText.match(/\n+$/)?.[0];
            if (trailingNewlines) {
                result = result.replace(/\n+$/, '') + trailingNewlines;
            }

            replaceSelectedText(selectionStart, selectionEnd, result);
        } catch (error) {
            console.error('AI request error:', error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : errorMessage;
            alert(message);
        } finally {
            onFinish();
        }
    };

    const handleTranslate = () => {
        submitAiRequest({
            url: translate.url(),
            emptyMessage: __('Please select text to translate'),
            errorMessage: __('Translation failed. Please try again.'),
            resultKey: 'translated',
            onStart: () => setIsTranslating(true),
            onFinish: () => setIsTranslating(false),
        });
    };

    const handleConvert = () => {
        submitAiRequest({
            url: convertToMarkdown.url(),
            emptyMessage: __('Please select text to convert'),
            errorMessage: __('Conversion failed. Please try again.'),
            resultKey: 'markdown',
            onStart: () => setIsConverting(true),
            onFinish: () => setIsConverting(false),
        });
    };

    const handleTableConvert = () => {
        submitAiRequest({
            url: convertToTable.url(),
            emptyMessage: __('Please select text to convert'),
            errorMessage: __('Table conversion failed. Please try again.'),
            resultKey: 'markdown',
            onStart: () => setIsTableConverting(true),
            onFinish: () => setIsTableConverting(false),
        });
    };

    // ネストしたパスの場合、階層的なbreadcrumbsを生成
    const generateBreadcrumbs = (): BreadcrumbItem[] => {
        const breadcrumbs: BreadcrumbItem[] = [
            {
                title: __('Markdown'),
                href: '/markdown',
            },
        ];

        // 新規作成ページ（存在しないページへのアクセス）
        if (!document && slug) {
            const slugParts = slug.split('/').filter((part) => part !== '');
            let currentPath = '';

            slugParts.forEach((part) => {
                currentPath += (currentPath ? '/' : '') + part;

                breadcrumbs.push({
                    title: part.charAt(0).toUpperCase() + part.slice(1),
                    href: show(currentPath).url,
                });
            });

            return breadcrumbs;
        }

        // 通常の新規作成ページ
        if (!document) {
            breadcrumbs.push({
                title: __('Create'),
                href: '/markdown/create',
            });
            return breadcrumbs;
        }

        // 既存ドキュメントの編集
        const slugParts = document.slug
            .split('/')
            .filter((part) => part !== '');
        let currentPath = '';

        slugParts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === slugParts.length - 1;

            breadcrumbs.push({
                title: isLast
                    ? document.title
                    : part.charAt(0).toUpperCase() + part.slice(1),
                href: show(currentPath).url,
            });
        });

        breadcrumbs.push({
            title: __('Edit'),
            href: edit(document.slug).url,
        });

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={document ? __('Edit') : __('Create')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">
                        {document
                            ? __('Edit document')
                            : __('Create new document')}
                    </h1>
                    {document && (
                        <Button asChild variant="outline">
                            <Link href={`/markdown/${document.slug}/revisions`}>
                                <History className="h-4 w-4" />
                                編集履歴
                            </Link>
                        </Button>
                    )}
                </div>

                <Form
                    action={document ? update(document.slug) : store()}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            {!document && (
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">{__('Slug')}</Label>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        required
                                        placeholder="my-document"
                                        defaultValue={
                                            slug ??
                                            document?.slug ??
                                            (isIndexDocument
                                                ? 'index'
                                                : 'core-concepts/index')
                                        }
                                        readOnly={isIndexDocument}
                                        className={
                                            isIndexDocument
                                                ? 'cursor-not-allowed bg-muted'
                                                : ''
                                        }
                                    />
                                    {errors.slug && (
                                        <p className="text-sm text-red-600">
                                            {errors.slug}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="title">{__('Title')}</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    placeholder={__('Document title')}
                                    defaultValue={
                                        document?.title ??
                                        (isIndexDocument ? __('Top page') : '')
                                    }
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-600">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">{__('Status')}</Label>
                                <select
                                    id="status"
                                    name="status"
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(
                                            event.target.value as typeof status,
                                        )
                                    }
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    <option value="draft">{__('Draft')}</option>
                                    <option value="private">
                                        {__('Private')}
                                    </option>
                                    <option value="published">
                                        {__('Published')}
                                    </option>
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="content">{__('Content')}</Label>
                                <input
                                    type="hidden"
                                    name="content"
                                    value={content}
                                />

                                <Tabs
                                    value={activeTab}
                                    onValueChange={setActiveTab}
                                >
                                    <TabsList>
                                        <TabsTrigger value="edit">
                                            {__('Edit')}
                                        </TabsTrigger>
                                        <TabsTrigger value="preview">
                                            {__('Preview')}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="edit">
                                        {/* ツールバー */}
                                        <div className="mb-2 flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleTranslate}
                                                disabled={
                                                    isTranslating || processing
                                                }
                                            >
                                                {isTranslating ? (
                                                    <>
                                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                        {__('Translating...')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Languages className="mr-2 h-4 w-4" />
                                                        {__('AI Translation')}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleConvert}
                                                disabled={
                                                    isConverting || processing
                                                }
                                            >
                                                {isConverting ? (
                                                    <>
                                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                        {__('Converting...')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 className="mr-2 h-4 w-4" />
                                                        {__(
                                                            'Markdown Conversion',
                                                        )}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleTableConvert}
                                                disabled={
                                                    isTableConverting ||
                                                    processing
                                                }
                                            >
                                                {isTableConverting ? (
                                                    <>
                                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                        {__(
                                                            'Converting table...',
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Table2 className="mr-2 h-4 w-4" />
                                                        {__('AI Table')}
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <Textarea
                                            ref={textareaRef}
                                            id="content"
                                            value={content}
                                            onChange={(e) =>
                                                setContent(e.target.value)
                                            }
                                            onDrop={handleDrop}
                                            onDragOver={(e) =>
                                                e.preventDefault()
                                            }
                                            onPaste={handlePaste}
                                            placeholder={__(
                                                'Write your markdown content here...',
                                            )}
                                            className="min-h-[500px] font-mono"
                                        />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {__(
                                                'Tip: Drag & drop or paste images to upload',
                                            )}
                                        </p>
                                    </TabsContent>

                                    <TabsContent value="preview">
                                        <div className="prose prose-sm min-h-[500px] max-w-none rounded-md border p-4 prose-neutral dark:prose-invert">
                                            <MarkdownViewer content={content} />
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {errors.content && (
                                    <p className="text-sm text-red-600">
                                        {errors.content}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing ? __('Saving...') : __('Save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
