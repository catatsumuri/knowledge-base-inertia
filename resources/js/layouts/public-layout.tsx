import AppLogo from '@/components/app-logo';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { type BreadcrumbItem } from '@/types';
import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';

type PublicLayoutProps = PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
}>;

export default function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <AppShell>
            <div className="border-b border-sidebar-border/80">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    <Link href="/pages" className="flex items-center space-x-2">
                        <AppLogo />
                    </Link>
                </div>
            </div>
            <AppContent>{children}</AppContent>
        </AppShell>
    );
}
