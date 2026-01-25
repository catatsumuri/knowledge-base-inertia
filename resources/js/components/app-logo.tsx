import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import AppLogoIcon from './app-logo-icon';

type AppLogoProps = {
    title?: string | null;
    titleLogoLightUrl?: string | null;
    titleLogoDarkUrl?: string | null;
};

export default function AppLogo({
    title: customTitle,
    titleLogoLightUrl,
    titleLogoDarkUrl,
}: AppLogoProps = {}) {
    const { props } = usePage<SharedData>();
    const defaultTitle = props.name?.toLowerCase() || 'thinkstream';
    const lightLogo = titleLogoLightUrl || titleLogoDarkUrl || null;
    const darkLogo = titleLogoDarkUrl || titleLogoLightUrl || null;
    const hasLogo = Boolean(lightLogo || darkLogo);

    return (
        <>
            {customTitle ? (
                <span className="flex items-center gap-2">
                    {hasLogo ? (
                        <>
                            {lightLogo && (
                                <img
                                    src={lightLogo}
                                    alt={customTitle}
                                    className="h-7 max-w-[180px] object-contain dark:hidden"
                                />
                            )}
                            {darkLogo && (
                                <img
                                    src={darkLogo}
                                    alt={customTitle}
                                    className="hidden h-7 max-w-[180px] object-contain dark:block"
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <AppLogoIcon className="h-6 w-6 text-primary" />
                            <span className="text-xl font-semibold text-foreground">
                                {customTitle}
                            </span>
                        </>
                    )}
                    <span className="text-xs font-normal text-muted-foreground">
                        powered by {defaultTitle}
                    </span>
                </span>
            ) : (
                <>
                    <AppLogoIcon className="h-6 w-6 text-primary" />
                    <span className="text-xl font-semibold text-foreground">
                        {defaultTitle}
                    </span>
                </>
            )}
        </>
    );
}
