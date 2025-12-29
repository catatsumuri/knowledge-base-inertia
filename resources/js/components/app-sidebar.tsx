import { index as markdownIndex } from '@/actions/App/Http/Controllers/MarkdownController';
import { index as shoutboxIndex } from '@/actions/App/Http/Controllers/ShoutboxController';
import { index as sitemapIndex } from '@/actions/App/Http/Controllers/SitemapController';
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
import { FileText, LayoutGrid, MessageSquare, Network } from 'lucide-react';
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
            title: __('Shoutbox'),
            href: shoutboxIndex(),
            icon: MessageSquare,
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
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
