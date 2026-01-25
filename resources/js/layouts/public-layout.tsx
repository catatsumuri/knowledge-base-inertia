import { AppContent } from '@/components/app-content';
import AppLogo from '@/components/app-logo';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useLang } from '@/hooks/useLang';
import { type BreadcrumbItem } from '@/types';
import { Link } from '@inertiajs/react';
import { List } from 'lucide-react';
import { type PropsWithChildren, type ReactNode } from 'react';

type PublicLayoutProps = PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
    rightPane?: ReactNode;
    firstLevelTitle?: string | null;
    firstLevelEyecatchLightUrl?: string | null;
    firstLevelEyecatchDarkUrl?: string | null;
}>;

export default function PublicLayout({
    children,
    rightPane,
    firstLevelTitle,
    firstLevelEyecatchLightUrl,
    firstLevelEyecatchDarkUrl,
}: PublicLayoutProps) {
    const { __ } = useLang();

    return (
        <AppShell>
            <div className="border-b border-sidebar-border/80">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    <Link href="/pages" className="flex items-center space-x-2">
                        <AppLogo
                            title={firstLevelTitle}
                            titleLogoLightUrl={firstLevelEyecatchLightUrl}
                            titleLogoDarkUrl={firstLevelEyecatchDarkUrl}
                        />
                    </Link>
                </div>
            </div>
            <AppContent>
                {rightPane ? (
                    <div className="grid w-full gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    type="button"
                                    className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg lg:hidden"
                                >
                                    <List className="mr-2 size-4" />
                                    {__('Pages')}
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-[85vw] max-w-xs p-0"
                            >
                                <SheetHeader className="sr-only">
                                    <SheetTitle>{__('Pages')}</SheetTitle>
                                </SheetHeader>
                                <div className="h-full overflow-y-auto p-4">
                                    {rightPane}
                                </div>
                            </SheetContent>
                        </Sheet>
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
