import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import AppLogoIcon from './app-logo-icon';

type AppLogoProps = {
    title?: string | null;
};

export default function AppLogo({ title: customTitle }: AppLogoProps = {}) {
    const { props } = usePage<SharedData>();
    const defaultTitle = props.name?.toLowerCase() || 'thinkstream';

    return (
        <>
            <AppLogoIcon className="h-6 w-6 text-primary" />
            {customTitle ? (
                <span className="flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold text-foreground">
                        {customTitle}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                        powered by {defaultTitle}
                    </span>
                </span>
            ) : (
                <span className="text-xl font-semibold text-foreground">
                    {defaultTitle}
                </span>
            )}
        </>
    );
}
