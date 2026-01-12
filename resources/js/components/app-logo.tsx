import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    const title = 'thinkstream';

    return (
        <>
            <AppLogoIcon className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">
                {title}
            </span>
        </>
    );
}
