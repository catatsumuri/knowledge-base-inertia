import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLucideIcon } from '@/lib/lucide-icon-mapper';
import type { ReactNode } from 'react';
import { Children, isValidElement, useEffect, useMemo, useState } from 'react';

const TABS_STORAGE_KEY = 'markdown-tabs-selection';
const TABS_CHANGE_EVENT = 'markdown-tabs:selection-change';

interface MarkdownTabsProps {
    sync?: string | boolean;
    borderBottom?: string | boolean;
    children?: ReactNode;
}

interface MarkdownTabProps {
    title?: string;
    icon?: string;
    children?: ReactNode;
}

interface TabEntry {
    title: string;
    icon?: string;
    content: ReactNode;
    value: string;
}

type PreferredSelection = {
    title?: string;
};

function getStoredSelection(): PreferredSelection | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as PreferredSelection;
    } catch {
        return null;
    }
}

function setStoredSelection(selection: PreferredSelection) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            TABS_STORAGE_KEY,
            JSON.stringify(selection),
        );
    } catch {
        // localStorage が無効な環境では無視する
    }
}

function resolveBoolean(
    value: string | boolean | undefined,
    fallback: boolean,
) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value !== 'false' && value !== '0';
    }

    return fallback;
}

export function MarkdownTabs({
    sync = true,
    borderBottom = true,
    children,
    ...rest
}: MarkdownTabsProps & Record<string, unknown>) {
    const dataSync = rest['data-tabs-sync'] as string | boolean | undefined;
    const dataBorder = rest['data-tabs-border-bottom'] as
        | string
        | boolean
        | undefined;
    const isSyncEnabled = resolveBoolean(dataSync ?? sync, true);
    const showBorderBottom = resolveBoolean(dataBorder ?? borderBottom, true);

    const resolvedTabs = extractTabs(children);

    const tabsWithValue = useMemo(
        () =>
            resolvedTabs.map((tab, index) => ({
                ...tab,
                value: `${tab.title}-${index}`,
            })),
        [resolvedTabs],
    );

    const [preferredSelection, setPreferredSelection] =
        useState<PreferredSelection | null>(() =>
            isSyncEnabled ? getStoredSelection() : null,
        );
    const [selectedValue, setSelectedValue] = useState<string>('');

    useEffect(() => {
        if (tabsWithValue.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedValue('');
            return;
        }

        const currentTab = tabsWithValue.find(
            (tab) => tab.value === selectedValue,
        );
        if (
            currentTab &&
            preferredSelection &&
            currentTab.title === preferredSelection.title
        ) {
            return;
        }

        const matchedTab =
            preferredSelection?.title && isSyncEnabled
                ? tabsWithValue.find(
                      (tab) => tab.title === preferredSelection.title,
                  )
                : null;
        const nextValue = matchedTab?.value ?? tabsWithValue[0].value;

        if (nextValue !== selectedValue) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedValue(nextValue);
        }
    }, [preferredSelection, tabsWithValue, selectedValue, isSyncEnabled]);

    useEffect(() => {
        if (!isSyncEnabled || typeof window === 'undefined') {
            return undefined;
        }

        const handleSelectionChange = (event: Event) => {
            const customEvent = event as CustomEvent<PreferredSelection>;
            if (customEvent.detail?.title) {
                setPreferredSelection(customEvent.detail);
            }
        };

        window.addEventListener(
            TABS_CHANGE_EVENT,
            handleSelectionChange as EventListener,
        );

        return () => {
            window.removeEventListener(
                TABS_CHANGE_EVENT,
                handleSelectionChange as EventListener,
            );
        };
    }, [isSyncEnabled]);

    if (tabsWithValue.length === 0) {
        return null;
    }

    return (
        <div className="not-prose my-6">
            <Tabs
                value={selectedValue}
                onValueChange={(value) => {
                    const selectedTab = tabsWithValue.find(
                        (tab) => tab.value === value,
                    );
                    if (!selectedTab) {
                        return;
                    }

                    setSelectedValue(selectedTab.value);

                    if (isSyncEnabled) {
                        const nextSelection = { title: selectedTab.title };
                        setPreferredSelection(nextSelection);
                        setStoredSelection(nextSelection);

                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                                new CustomEvent(TABS_CHANGE_EVENT, {
                                    detail: nextSelection,
                                }),
                            );
                        }
                    }
                }}
                className="w-full"
            >
                <TabsList
                    className={[
                        'w-full justify-start gap-2 rounded-full bg-muted/40 p-1',
                        showBorderBottom
                            ? 'border border-border/60'
                            : 'border-0',
                    ].join(' ')}
                >
                    {tabsWithValue.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className={[
                                'h-9 flex-none rounded-full border border-transparent px-4 text-sm font-semibold',
                                'text-foreground/70 transition-colors',
                                'hover:bg-background/70 hover:text-foreground',
                                'data-[state=active]:bg-background data-[state=active]:text-foreground',
                                'data-[state=active]:border-emerald-500/30 data-[state=active]:shadow-sm',
                            ].join(' ')}
                        >
                            {tab.icon ? <TabIcon name={tab.icon} /> : null}
                            <span>{tab.title}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabsWithValue.map((tab) => (
                    <TabsContent
                        key={tab.value}
                        value={tab.value}
                        className="mt-4"
                    >
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                            {tab.content}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

export function MarkdownTab({ children }: MarkdownTabProps) {
    return <>{children}</>;
}

function TabIcon({ name }: { name: string }) {
    const Icon = useMemo(() => getLucideIcon(name), [name]);
    if (!Icon) {
        return null;
    }

    return <Icon className="h-5 w-5 text-foreground/60" />;
}

function extractTabs(children: ReactNode): TabEntry[] {
    const nodes = Children.toArray(children);
    const tabs: TabEntry[] = [];

    nodes.forEach((child, index) => {
        if (!isValidElement(child)) {
            return;
        }

        const props = child.props as MarkdownTabProps & {
            'data-tab-title'?: string;
            'data-tab-icon'?: string;
            title?: string;
            icon?: string;
        };

        const title =
            props.title ?? props['data-tab-title'] ?? `Tab ${index + 1}`;

        if (!props.title && !props['data-tab-title']) {
            return;
        }

        const icon = props.icon ?? props['data-tab-icon'];

        tabs.push({
            title,
            icon,
            content: props.children,
            value: `${title}-${index}`,
        });
    });

    return tabs;
}
