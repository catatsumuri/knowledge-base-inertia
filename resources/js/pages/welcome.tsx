import { Button } from '@/components/ui/button';
import { useLang } from '@/hooks/useLang';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Brain, Sparkles, Zap } from 'lucide-react';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const { __ } = useLang();

    return (
        <div className="min-h-screen bg-background">
            <Head title={__('Welcome')} />
            <header className="fixed top-0 right-0 left-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xl font-semibold text-foreground"
                    >
                        <Brain className="h-6 w-6 text-primary" />
                        <span>thinkstream</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {__('Dashboard')}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {__('Log in')}
                                </Link>
                                {canRegister && (
                                    <Button size="sm" variant="outline" asChild>
                                        <Link href={register()}>
                                            {__('Register')}
                                        </Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-20">
                <div className="flex flex-col items-center text-center">
                    <h1 className="mb-6 max-w-4xl font-sans text-5xl font-bold tracking-tight text-balance text-foreground md:text-6xl lg:text-7xl">
                        {__('Let your thoughts')}
                        <br />
                        <span className="text-primary">
                            {__('flow as a stream')}
                        </span>
                    </h1>

                    <p className="mb-12 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground md:text-xl">
                        {__(
                            'Thinkstream is an innovative platform that organizes and visualizes ideas to unlock your creativity.',
                        )}
                    </p>

                    <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-accent/5 to-background px-6 py-10 text-center sm:max-w-3xl sm:px-10">
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
                                {__('Start your journey today')}
                            </h2>
                            <p className="text-base text-pretty text-muted-foreground sm:text-lg">
                                {__(
                                    'Start for free and begin exploring your ideas right away.',
                                )}
                            </p>
                        </div>
                        <Button size="lg" className="group gap-2" asChild>
                            <Link href="/pages">
                                {__('Go to pages')}
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="pointer-events-none absolute top-1/3 left-8 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute right-8 bottom-0 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
            </section>

            <section id="features" className="mx-auto max-w-7xl px-6 py-20">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-balance text-foreground md:text-4xl">
                        {__('Three core features')}
                        <br />
                        {__('to organize your thinking')}
                    </h2>
                    <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">
                        {__(
                            'Use a simple, intuitive interface to make the most of every idea.',
                        )}
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-8 transition-all hover:shadow-lg">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Brain className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                            {__('Thought visualization')}
                        </h3>
                        <p className="leading-relaxed text-muted-foreground">
                            {__(
                                'Transform complex ideas into clear visuals so you can see the flow instantly.',
                            )}
                        </p>
                    </div>

                    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-8 transition-all hover:shadow-lg">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                            {__('Real-time sync')}
                        </h3>
                        <p className="leading-relaxed text-muted-foreground">
                            {__(
                                'Access everything from anywhere with instant syncing across devices.',
                            )}
                        </p>
                    </div>

                    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-8 transition-all hover:shadow-lg">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                            {__('Guided clarity')}
                        </h3>
                        <p className="leading-relaxed text-muted-foreground">
                            {__(
                                'Use structured prompts and checklists to keep ideas clear and actionable.',
                            )}
                        </p>
                    </div>
                </div>
            </section>

            <footer className="border-t border-border bg-muted/30">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-12 md:flex-row">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Brain className="h-5 w-5 text-primary" />
                        <span className="font-semibold">thinkstream</span>
                        <span>{__('All rights reserved')} © 2026</span>
                    </div>
                    <nav className="flex gap-6 text-sm text-muted-foreground">
                        <Link
                            href="/pages"
                            className="transition-colors hover:text-foreground"
                        >
                            {__('Pages')}
                        </Link>
                        <Link
                            href={login()}
                            className="transition-colors hover:text-foreground"
                        >
                            {__('Log in')}
                        </Link>
                        {canRegister && (
                            <Link
                                href={register()}
                                className="transition-colors hover:text-foreground"
                            >
                                {__('Register')}
                            </Link>
                        )}
                    </nav>
                </div>
            </footer>
        </div>
    );
}
