import {
    destroyHomePage,
    editHomePage,
    previewZipImport,
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { Download, Home, Pencil, Trash2, Upload } from 'lucide-react';

export default function AppSettings({
    publicViews,
    homeDocument,
}: {
    publicViews: boolean;
    homeDocument: {
        id: number;
        slug: string;
        title: string;
        updated_at: string;
    } | null;
}) {
    const { __ } = useLang();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Application settings'),
            href: '/app-settings',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Application settings')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="space-y-4">
                    <HeadingSmall
                        title={__('Application settings')}
                        description={__(
                            'Manage application-level configuration.',
                        )}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{__('Public views')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                {__(
                                    'Allow unauthenticated users to view public pages.',
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {__('Environment variable')}: PUBLIC_VIEWS
                            </p>
                        </div>
                        <Badge
                            variant={publicViews ? 'default' : 'destructive'}
                        >
                            {publicViews ? __('Enabled') : __('Disabled')}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{__('Home page document')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {__(
                                'Configure a custom markdown document as your home page. If not set, the default welcome page will be shown.',
                            )}
                        </p>

                        {homeDocument ? (
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-md border p-4">
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {homeDocument.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {__('Last updated')}:{' '}
                                        {new Date(
                                            homeDocument.updated_at,
                                        ).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={editHomePage()}>
                                            <Pencil className="h-4 w-4" />
                                            {__('Edit')}
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Trash2 className="h-4 w-4" />
                                                {__('Delete')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    {__(
                                                        'Delete home page document',
                                                    )}
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {__(
                                                        'Are you sure you want to delete the home page document? The default welcome page will be shown instead.',
                                                    )}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    {__('Cancel')}
                                                </AlertDialogCancel>
                                                <AlertDialogAction asChild>
                                                    <Link
                                                        href={destroyHomePage()}
                                                        method="delete"
                                                        as="button"
                                                    >
                                                        {__('Delete')}
                                                    </Link>
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ) : (
                            <Button asChild variant="outline">
                                <Link href={editHomePage()}>
                                    <Home className="h-4 w-4" />
                                    {__('Create home page document')}
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{__('Markdown export')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {__(
                                'Export all markdown documents as a zip file using their paths.',
                            )}
                        </p>
                        <Button asChild variant="outline">
                            <a href="/app-settings/markdown/export">
                                <Download className="h-4 w-4" />
                                {__('Export all')}
                            </a>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{__('Markdown import')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <p className="text-sm text-muted-foreground">
                            {__(
                                'Import multiple markdown documents from a zip file',
                            )}
                        </p>
                        <Form action={previewZipImport()}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        name="zip_file"
                                        accept=".zip"
                                        required
                                    />
                                </div>
                                <Button type="submit">
                                    <Upload className="h-4 w-4" />
                                    {__('Preview import')}
                                </Button>
                            </div>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
