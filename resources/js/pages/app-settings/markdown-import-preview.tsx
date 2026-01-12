import {
    cancelZipImport,
    executeZipImport,
} from '@/actions/App/Http/Controllers/AppSettingsController';
import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Form, Head } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, FileText, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ImportFileData {
    original_path: string;
    slug: string;
    title: string;
    status: string;
    content: string | null;
    is_duplicate: boolean;
    existing_document?: {
        slug: string;
        title: string;
        updated_at: string;
    };
    validation_errors: string[];
}

interface Props {
    session_key: string;
    files: ImportFileData[];
    stats: {
        total: number;
        new: number;
        duplicates: number;
        errors: number;
    };
}

export default function MarkdownImportPreview({
    session_key,
    files,
    stats,
}: Props) {
    const { __ } = useLang();
    const [conflictResolutions, setConflictResolutions] = useState<
        Record<string, 'overwrite' | 'skip'>
    >({});

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Application settings'),
            href: '/app-settings',
        },
        {
            title: __('Import preview'),
            href: '',
        },
    ];

    // Initialize conflict resolutions with 'skip' for all duplicates
    useEffect(() => {
        const initial: Record<string, 'overwrite' | 'skip'> = {};
        files
            .filter((f) => f.is_duplicate)
            .forEach((f) => {
                initial[f.slug] = 'skip';
            });
        setConflictResolutions(initial);
    }, [files]);

    const handleOverwriteAll = () => {
        const updated: Record<string, 'overwrite' | 'skip'> = {};
        files
            .filter((f) => f.is_duplicate)
            .forEach((f) => {
                updated[f.slug] = 'overwrite';
            });
        setConflictResolutions(updated);
    };

    const handleSkipAll = () => {
        const updated: Record<string, 'overwrite' | 'skip'> = {};
        files
            .filter((f) => f.is_duplicate)
            .forEach((f) => {
                updated[f.slug] = 'skip';
            });
        setConflictResolutions(updated);
    };

    const handleResolutionChange = (
        slug: string,
        value: 'overwrite' | 'skip',
    ) => {
        setConflictResolutions((prev) => ({
            ...prev,
            [slug]: value,
        }));
    };

    const hasErrors = stats.errors > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Import preview')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="space-y-4">
                    <HeadingSmall
                        title={__('Import preview')}
                        description={__(
                            'Review the files that will be imported',
                        )}
                    />
                </div>

                {/* Statistics Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>{__('Import Summary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">
                                    {__('Total files')}
                                </span>
                                <span className="text-2xl font-bold">
                                    {stats.total}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">
                                    {__('New documents')}
                                </span>
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {stats.new}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">
                                    {__('Duplicate documents')}
                                </span>
                                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {stats.duplicates}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">
                                    {__('Files with errors')}
                                </span>
                                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {stats.errors}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Error Alert */}
                {hasErrors && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {__(
                                'Some files have errors and cannot be imported. Please fix these errors before proceeding.',
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Bulk Actions Card */}
                {stats.duplicates > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{__('Bulk Actions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleOverwriteAll}
                            >
                                {__('Overwrite all duplicates')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkipAll}
                            >
                                {__('Skip all duplicates')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Files Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>{__('Files to Import')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{__('Status')}</TableHead>
                                    <TableHead>{__('Title')}</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead className="text-right">
                                        {__('Action')}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {files.map((file, index) => {
                                    const hasError =
                                        file.validation_errors.length > 0;
                                    const isDuplicate = file.is_duplicate;
                                    const isNew = !isDuplicate && !hasError;

                                    return (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {hasError && (
                                                    <Badge
                                                        variant="destructive"
                                                        className="flex w-fit items-center gap-1"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                        {__('Error')}
                                                    </Badge>
                                                )}
                                                {isDuplicate && (
                                                    <Badge
                                                        variant="default"
                                                        className="flex w-fit items-center gap-1 bg-yellow-500 hover:bg-yellow-600"
                                                    >
                                                        <AlertCircle className="h-3 w-3" />
                                                        {__('Duplicate')}
                                                    </Badge>
                                                )}
                                                {isNew && (
                                                    <Badge
                                                        variant="default"
                                                        className="flex w-fit items-center gap-1 bg-green-500 hover:bg-green-600"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {__('New')}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">
                                                        {file.title}
                                                    </span>
                                                    {hasError && (
                                                        <div className="text-sm text-red-600 dark:text-red-400">
                                                            {file.validation_errors.join(
                                                                ', ',
                                                            )}
                                                        </div>
                                                    )}
                                                    {isDuplicate &&
                                                        file.existing_document && (
                                                            <div className="text-sm text-muted-foreground">
                                                                {__(
                                                                    'Existing:',
                                                                )}{' '}
                                                                {
                                                                    file
                                                                        .existing_document
                                                                        .title
                                                                }
                                                            </div>
                                                        )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                                                    {file.slug}
                                                </code>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isDuplicate && (
                                                    <RadioGroup
                                                        value={
                                                            conflictResolutions[
                                                                file.slug
                                                            ] || 'skip'
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            handleResolutionChange(
                                                                file.slug,
                                                                value as
                                                                    | 'overwrite'
                                                                    | 'skip',
                                                            )
                                                        }
                                                        className="flex gap-4"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem
                                                                value="overwrite"
                                                                id={`overwrite-${index}`}
                                                            />
                                                            <Label
                                                                htmlFor={`overwrite-${index}`}
                                                                className="cursor-pointer text-sm"
                                                            >
                                                                {__(
                                                                    'Overwrite',
                                                                )}
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem
                                                                value="skip"
                                                                id={`skip-${index}`}
                                                            />
                                                            <Label
                                                                htmlFor={`skip-${index}`}
                                                                className="cursor-pointer text-sm"
                                                            >
                                                                {__('Skip')}
                                                            </Label>
                                                        </div>
                                                    </RadioGroup>
                                                )}
                                                {isNew && (
                                                    <span className="text-sm text-muted-foreground">
                                                        {__('Will be created')}
                                                    </span>
                                                )}
                                                {hasError && (
                                                    <span className="text-sm text-red-600 dark:text-red-400">
                                                        {__('Cannot import')}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between gap-4">
                    <Form action={cancelZipImport()}>
                        <Button type="submit" variant="outline">
                            {__('Cancel')}
                        </Button>
                    </Form>
                    <Form action={executeZipImport()}>
                        <input
                            type="hidden"
                            name="session_key"
                            value={session_key}
                        />
                        {Object.entries(conflictResolutions).map(
                            ([slug, resolution]) => (
                                <input
                                    key={slug}
                                    type="hidden"
                                    name={`conflict_resolutions[${slug}]`}
                                    value={resolution}
                                />
                            ),
                        )}
                        <Button type="submit" disabled={hasErrors}>
                            <FileText className="h-4 w-4" />
                            {__('Execute import')}
                        </Button>
                    </Form>
                </div>
            </div>
        </AppLayout>
    );
}
