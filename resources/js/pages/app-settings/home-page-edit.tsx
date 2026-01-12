import {
    storeHomePage,
    updateHomePage,
} from '@/actions/App/Http/Controllers/AppSettingsController';
import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { useState } from 'react';

interface MarkdownDocument {
    id: number;
    slug: string;
    title: string;
    content: string | null;
    status: string;
    is_home_page: boolean;
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
}

export default function HomePageEdit({
    document,
    templates,
}: {
    document: MarkdownDocument | null;
    templates: {
        key: string;
        title: string;
        content: string;
    }[];
}) {
    const { __ } = useLang();
    const [content, setContent] = useState(document?.content ?? '');
    const [activeTab, setActiveTab] = useState('edit');
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
        null,
    );

    const templateMap = Object.fromEntries(
        templates.map((template) => [template.key, template]),
    );

    const handleInsertTemplate = (templateKey: string) => {
        const template = templateMap[templateKey];

        if (!template) {
            return;
        }

        if (content.trim()) {
            setSelectedTemplate(templateKey);
            setShowTemplateDialog(true);
        } else {
            setContent(template.content);
        }
    };

    const confirmInsertTemplate = () => {
        if (selectedTemplate && templateMap[selectedTemplate]) {
            setContent(templateMap[selectedTemplate].content);
            setShowTemplateDialog(false);
            setSelectedTemplate(null);
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Application settings'),
            href: '/app-settings',
        },
        {
            title: document ? __('Edit home page') : __('Create home page'),
            href: '/app-settings/home-page/edit',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head
                title={document ? __('Edit home page') : __('Create home page')}
            />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <HeadingSmall
                    title={
                        document
                            ? __('Edit home page document')
                            : __('Create home page document')
                    }
                    description={__(
                        'This document will be displayed on the home page (/) and is always publicly accessible.',
                    )}
                />

                <Form
                    action={document ? updateHomePage() : storeHomePage()}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">{__('Title')}</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    placeholder={__('Home page title')}
                                    defaultValue={document?.title ?? ''}
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-600">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="content">
                                        {__('Content')}
                                    </Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    templates.length === 0
                                                }
                                            >
                                                <FileText className="h-4 w-4" />
                                                {__('Insert template')}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {templates.map((template) => (
                                                <DropdownMenuItem
                                                    key={template.key}
                                                    onClick={() =>
                                                        handleInsertTemplate(
                                                            template.key,
                                                        )
                                                    }
                                                >
                                                    {template.title}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
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
                                            id="content"
                                            value={content}
                                            onChange={(e) =>
                                                setContent(e.target.value)
                                            }
                                            placeholder={__(
                                                'Write your markdown content here...',
                                            )}
                                            className="min-h-[500px] font-mono"
                                        />
                                    </TabsContent>

                                    <TabsContent value="preview">
                                        <div className="prose prose-sm min-h-[500px] max-w-none rounded-md border p-4 prose-neutral dark:prose-invert">
                                            {content ? (
                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: content,
                                                    }}
                                                />
                                            ) : (
                                                <p className="text-muted-foreground">
                                                    {__(
                                                        'No content to preview',
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing ? __('Saving...') : __('Save')}
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/app-settings">
                                        {__('Cancel')}
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <AlertDialog
                open={showTemplateDialog}
                onOpenChange={setShowTemplateDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {__('Replace current content?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {__(
                                'This will replace your current content with the selected template. This action cannot be undone.',
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{__('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmInsertTemplate}>
                            {__('Replace')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
