import { CodeBlock } from '@/components/code-block';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'code-tabs-language';
const LANGUAGE_CHANGE_EVENT = 'code-tabs:language-change';

type PreferredSelection = {
    label?: string;
};

function getStoredSelection(): PreferredSelection | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        if (raw.startsWith('{')) {
            return JSON.parse(raw) as PreferredSelection;
        }

        return { label: raw };
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
            LANGUAGE_STORAGE_KEY,
            JSON.stringify(selection),
        );
    } catch {
        // localStorage が無効な環境では無視する
    }
}

interface CodeTab {
    language: string;
    label: string;
    code: string;
    meta?: string;
}

interface CodeTabsProps {
    tabs: CodeTab[];
}

/**
 * コードタブコンポーネント
 *
 * 複数言語のコードブロックをタブで切り替え表示
 */
export function CodeTabs({ tabs }: CodeTabsProps) {
    const [preferredSelection, setPreferredSelection] =
        useState<PreferredSelection | null>(() => getStoredSelection());
    const [selectedValue, setSelectedValue] = useState<string>('');
    const tabsWithValue = useMemo(
        () =>
            tabs.map((tab, index) => ({
                ...tab,
                value: `${tab.language}-${index}`,
            })),
        [tabs],
    );

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
            currentTab.label === preferredSelection.label
        ) {
            return;
        }

        const matchedTab = preferredSelection?.label
            ? tabsWithValue.find(
                  (tab) => tab.label === preferredSelection.label,
              )
            : null;
        const nextValue = matchedTab?.value ?? tabsWithValue[0].value;

        if (nextValue !== selectedValue) {
             
            setSelectedValue(nextValue);
        }
    }, [preferredSelection, tabsWithValue, selectedValue]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleLanguageChange = (event: Event) => {
            const customEvent = event as CustomEvent<PreferredSelection>;
            if (customEvent.detail?.label) {
                setPreferredSelection(customEvent.detail);
            }
        };

        window.addEventListener(
            LANGUAGE_CHANGE_EVENT,
            handleLanguageChange as EventListener,
        );

        return () => {
            window.removeEventListener(
                LANGUAGE_CHANGE_EVENT,
                handleLanguageChange as EventListener,
            );
        };
    }, []);

    if (!tabs || tabs.length === 0) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    コードブロックが見つかりません
                </p>
            </div>
        );
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

                    const nextSelection = {
                        label: selectedTab.label,
                    };

                    setPreferredSelection(nextSelection);
                    setSelectedValue(selectedTab.value);
                    setStoredSelection(nextSelection);

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent(LANGUAGE_CHANGE_EVENT, {
                                detail: nextSelection,
                            }),
                        );
                    }
                }}
                className="w-full"
            >
                <TabsList className="w-full justify-start rounded-t-lg rounded-b-none border-b bg-muted/50">
                    {tabsWithValue.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabsWithValue.map((tab) => (
                    <TabsContent
                        key={tab.value}
                        value={tab.value}
                        className="mt-0 rounded-t-none"
                    >
                        <CodeBlock className={`language-${tab.language}`}>
                            {tab.code}
                        </CodeBlock>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

/**
 * CodeTabs ラッパーコンポーネント
 *
 * data-code-tabs 属性から JSON をパースして CodeTabs に渡す
 */
export function CodeTabsWrapper({
    ...props
}: React.ComponentPropsWithoutRef<'div'> & Record<string, unknown>) {
    const rawTabs = props['data-code-tabs'] as string | undefined;
    const error = props['data-code-tabs-error'] as string | undefined;

    if (error) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                </p>
            </div>
        );
    }

    if (!rawTabs) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    コードタブデータが見つかりません
                </p>
            </div>
        );
    }

    let tabs: CodeTab[];
    try {
        tabs = JSON.parse(rawTabs) as CodeTab[];
    } catch {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    コードタブデータのパースに失敗しました
                </p>
            </div>
        );
    }

    return <CodeTabs tabs={tabs} />;
}
