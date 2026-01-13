import { useLang } from '@/hooks/useLang';
import AppLayout from '@/layouts/app-layout';
import ShoutboxPanel from '@/pages/shoutbox/shoutbox-panel';
import { type BreadcrumbItem, type PaginatedData, type User } from '@/types';
import { Head } from '@inertiajs/react';

interface ShoutLink {
    id: number;
    shout_id: number;
    slug: string;
    created_at: string;
}

interface Shout {
    id: number;
    user_id: number;
    parent_id: number | null;
    content: string;
    images: string[] | null;
    created_at: string;
    user: User;
    links: ShoutLink[];
    replies?: Shout[];
}

interface ShoutboxIndexProps {
    shouts: PaginatedData<Shout>;
}

export default function ShoutboxIndex({ shouts }: ShoutboxIndexProps) {
    const { __ } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: __('Shoutbox'),
            href: '/shoutbox',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Shoutbox')} />
            <ShoutboxPanel
                shouts={shouts}
                containerClassName="p-4 md:px-8 lg:px-16"
            />
        </AppLayout>
    );
}
