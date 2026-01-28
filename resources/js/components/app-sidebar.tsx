import { index as markdownIndex } from '@/actions/App/Http/Controllers/MarkdownController';
import { index as sitemapIndex } from '@/actions/App/Http/Controllers/SitemapController';
import { index as tweetsIndex } from '@/actions/App/Http/Controllers/TweetController';
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
import { FileText, LayoutGrid, Network, Twitter } from 'lucide-react';
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
            title: __('Saved Tweets'),
            href: tweetsIndex(),
            icon: Twitter,
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
