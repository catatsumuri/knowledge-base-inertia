import {
    convertToMarkdown,
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
import { Form, Head, router, usePage } from '@inertiajs/react';
import { Languages, LoaderCircle, Table2, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface MarkdownDocument {
    id: number;
    slug: string;
    title: string;
    content: string | null;
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

    const handleTranslate = async () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const selectedText = content.substring(selectionStart, selectionEnd);

        if (!selectedText.trim()) {
            alert(__('Please select text to translate'));
            return;
        }

        setIsTranslating(true);

        try {
            const baseErrorMessage = __(
                'Translation failed. Please try again.',
            );

            // CSRFトークンを取得
            const metaTag = window.document.querySelector(
                'meta[name="csrf-token"]',
            );
            const csrfToken = metaTag
                ? metaTag.getAttribute('content') || ''
                : '';

            const response = await fetch(translate.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ text: selectedText }),
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
                    ? `${baseErrorMessage} ${detailMessage}${statusInfo}`
                    : `${baseErrorMessage}${statusInfo}`;
                throw new Error(message);
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `${baseErrorMessage} Unexpected response type: ${contentType}`,
                );
            }

            const data = (await response.json()) as {
                translated: string;
            };
            const { translated } = data;

            // Undo対応の置換（execCommandを使用）
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);

            // execCommandを試す
            const success = window.document.execCommand(
                'insertText',
                false,
                translated,
            );

            if (success) {
                // execCommandが成功した場合、Reactのステートを更新
                const newContent =
                    content.substring(0, selectionStart) +
                    translated +
                    content.substring(selectionEnd);
                setContent(newContent);
                textarea.setSelectionRange(
                    selectionStart + translated.length,
                    selectionStart + translated.length,
                );
            } else {
                // フォールバック
                const newContent =
                    content.substring(0, selectionStart) +
                    translated +
                    content.substring(selectionEnd);
                setContent(newContent);
                setTimeout(() => {
                    textarea.setSelectionRange(
                        selectionStart + translated.length,
                        selectionStart + translated.length,
                    );
                }, 0);
            }
        } catch (error) {
            console.error('Translation error:', error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : __('Translation failed. Please try again.');
            alert(message);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleConvert = async () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const selectedText = content.substring(selectionStart, selectionEnd);

        if (!selectedText.trim()) {
            alert(__('Please select text to convert'));
            return;
        }

        setIsConverting(true);

        try {
            const baseErrorMessage = __('Conversion failed. Please try again.');

            // CSRFトークンを取得
            const metaTag = window.document.querySelector(
                'meta[name="csrf-token"]',
            );
            const csrfToken = metaTag
                ? metaTag.getAttribute('content') || ''
                : '';

            const response = await fetch(convertToMarkdown.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ text: selectedText }),
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
                    ? `${baseErrorMessage} ${detailMessage}${statusInfo}`
                    : `${baseErrorMessage}${statusInfo}`;
                throw new Error(message);
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `${baseErrorMessage} Unexpected response type: ${contentType}`,
                );
            }

            const data = (await response.json()) as {
                markdown: string;
            };
            const { markdown } = data;

            // Undo対応の置換（execCommandを使用）
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);

            // execCommandを試す
            const success = window.document.execCommand(
                'insertText',
                false,
                markdown,
            );

            if (success) {
                // execCommandが成功した場合、Reactのステートを更新
                const newContent =
                    content.substring(0, selectionStart) +
                    markdown +
                    content.substring(selectionEnd);
                setContent(newContent);
                textarea.setSelectionRange(
                    selectionStart + markdown.length,
                    selectionStart + markdown.length,
                );
            } else {
                // フォールバック
                const newContent =
                    content.substring(0, selectionStart) +
                    markdown +
                    content.substring(selectionEnd);
                setContent(newContent);
                setTimeout(() => {
                    textarea.setSelectionRange(
                        selectionStart + markdown.length,
                        selectionStart + markdown.length,
                    );
                }, 0);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : __('Conversion failed. Please try again.');
            alert(message);
        } finally {
            setIsConverting(false);
        }
    };

    const handleTableConvert = async () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const selectedText = content.substring(selectionStart, selectionEnd);

        if (!selectedText.trim()) {
            alert(__('Please select text to convert'));
            return;
        }

        setIsTableConverting(true);

        try {
            const baseErrorMessage = __(
                'Table conversion failed. Please try again.',
            );

            const metaTag = window.document.querySelector(
                'meta[name="csrf-token"]',
            );
            const csrfToken = metaTag
                ? metaTag.getAttribute('content') || ''
                : '';

            const response = await fetch('/api/markdown/convert-table', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ text: selectedText }),
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
                    ? `${baseErrorMessage} ${detailMessage}${statusInfo}`
                    : `${baseErrorMessage}${statusInfo}`;
                throw new Error(message);
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `${baseErrorMessage} Unexpected response type: ${contentType}`,
                );
            }

            const data = (await response.json()) as {
                markdown: string;
            };
            const { markdown } = data;

            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);

            const success = window.document.execCommand(
                'insertText',
                false,
                markdown,
            );

            if (success) {
                const newContent =
                    content.substring(0, selectionStart) +
                    markdown +
                    content.substring(selectionEnd);
                setContent(newContent);
                textarea.setSelectionRange(
                    selectionStart + markdown.length,
                    selectionStart + markdown.length,
                );
            } else {
                const newContent =
                    content.substring(0, selectionStart) +
                    markdown +
                    content.substring(selectionEnd);
                setContent(newContent);
                setTimeout(() => {
                    textarea.setSelectionRange(
                        selectionStart + markdown.length,
                        selectionStart + markdown.length,
                    );
                }, 0);
            }
        } catch (error) {
            console.error('Table conversion error:', error);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : __('Table conversion failed. Please try again.');
            alert(message);
        } finally {
            setIsTableConverting(false);
        }
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
                <h1 className="text-2xl font-bold">
                    {document ? __('Edit document') : __('Create new document')}
                </h1>

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
                                            (isIndexDocument ? 'index' : '')
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
