import { previewZipImport } from '@/actions/App/Http/Controllers/AppSettingsController';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head } from '@inertiajs/react';
import { Download, Upload } from 'lucide-react';

export default function AppSettings() {
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
