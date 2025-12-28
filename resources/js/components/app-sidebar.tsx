import { index as markdownIndex } from '@/actions/App/Http/Controllers/MarkdownController';
import { index as sitemapIndex } from '@/actions/App/Http/Controllers/SitemapController';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useLang } from '@/hooks/useLang';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, FileText, Folder, LayoutGrid, Network } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { __ } = useLang();
    const mainNavItems: NavItem[] = [
        {
            title: __('Dashboard'),
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: __('Markdown'),
            href: markdownIndex(),
            icon: FileText,
        },
        {
            title: __('Sitemap'),
            href: sitemapIndex(),
            icon: Network,
        },
    ];

    const footerNavItems: NavItem[] = [
        {
            title: __('Repository'),
            href: 'https://github.com/laravel/react-starter-kit',
            icon: Folder,
        },
        {
            title: __('Documentation'),
            href: 'https://laravel.com/docs/starter-kits#react',
            icon: BookOpen,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
