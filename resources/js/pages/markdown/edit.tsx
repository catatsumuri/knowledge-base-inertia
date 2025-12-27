import {
    edit,
    show,
    store,
    update,
    uploadImage,
} from '@/actions/App/Http/Controllers/MarkdownController';
import { CodeBlock } from '@/components/code-block';
import { MarkdownImage } from '@/components/markdown-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { preprocessImageSize, remarkImageSize } from '@/lib/remark-image-size';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';

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
}: {
    document: MarkdownDocument | null;
    isIndexDocument?: boolean;
}) {
    const { __ } = useLang();
    const [content, setContent] = useState(document?.content ?? '');
    const [activeTab, setActiveTab] = useState('edit');
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

    const breadcrumbs: BreadcrumbItem[] = document
        ? [
              {
                  title: __('Markdown'),
                  href: show(document).url,
              },
              {
                  title: document.title,
                  href: show(document).url,
              },
              {
                  title: __('Edit'),
                  href: edit(document).url,
              },
          ]
        : [
              {
                  title: __('Markdown'),
                  href: '/markdown',
              },
              {
                  title: __('Create'),
                  href: '/markdown/create',
              },
          ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={document ? __('Edit') : __('Create')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <h1 className="text-2xl font-bold">
                    {document ? __('Edit document') : __('Create new document')}
                </h1>

                <Form
                    {...(document ? update.form(document) : store.form())}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            {!document && !isIndexDocument && (
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">{__('Slug')}</Label>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        required
                                        placeholder="my-document"
                                        defaultValue={document?.slug ?? ''}
                                    />
                                    {errors.slug && (
                                        <p className="text-sm text-red-600">
                                            {errors.slug}
                                        </p>
                                    )}
                                </div>
                            )}

                            {!isIndexDocument && (
                                <div className="grid gap-2">
                                    <Label htmlFor="title">{__('Title')}</Label>
                                    <Input
                                        id="title"
                                        name="title"
                                        required
                                        placeholder={__('Document title')}
                                        defaultValue={document?.title ?? ''}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-red-600">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>
                            )}

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
                                            <ReactMarkdown
                                                remarkPlugins={[
                                                    remarkGfm,
                                                    remarkDirective,
                                                    remarkZennDirective,
                                                    remarkImageSize,
                                                ]}
                                                components={{
                                                    code: CodeBlock,
                                                    img: MarkdownImage,
                                                }}
                                            >
                                                {preprocessImageSize(content)}
                                            </ReactMarkdown>
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
