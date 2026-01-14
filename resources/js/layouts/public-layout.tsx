import { AppContent } from '@/components/app-content';
import AppLogo from '@/components/app-logo';
import { AppShell } from '@/components/app-shell';
import { type BreadcrumbItem } from '@/types';
import { Link } from '@inertiajs/react';
import type { PropsWithChildren, ReactNode } from 'react';

type PublicLayoutProps = PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
    rightPane?: ReactNode;
}>;

export default function PublicLayout({
    children,
    rightPane,
}: PublicLayoutProps) {
    return (
        <AppShell>
            <div className="border-b border-sidebar-border/80">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    <Link href="/pages" className="flex items-center space-x-2">
                        <AppLogo />
                    </Link>
                </div>
            </div>
            <AppContent>
                {rightPane ? (
                    <div className="grid w-full gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <aside className="hidden lg:block">{rightPane}</aside>
                        <div className="min-w-0">{children}</div>
                    </div>
                ) : (
                    children
                )}
            </AppContent>
        </AppShell>
    );
}
