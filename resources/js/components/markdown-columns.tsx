import { ColumnsCard } from '@/components/columns-card';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface MarkdownColumnsProps {
    cols?: number | string;
    basePrefix?: string;
    children?: React.ReactNode;
    node?: unknown;
}

interface MarkdownCardProps {
    title?: string;
    href?: string;
    icon?: string;
    cta?: string;
    arrow?: string | boolean;
    children?: React.ReactNode;
    basePrefix?: string;
}

export function MarkdownColumns({
    cols = 2,
    basePrefix = '/markdown',
    children,
    node,
}: MarkdownColumnsProps) {
    const resolvedCols = resolveCols(cols);

    if (!resolvedCols) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="flex-shrink-0 text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    不正なcols値です（1-4の範囲で指定してください）
                </p>
            </div>
        );
    }

    const cards = extractCards(children);
    const resolvedCards = cards.length > 0 ? cards : extractCardsFromNode(node);

    if (resolvedCards.length === 0) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                <AlertCircle
                    className="flex-shrink-0 text-yellow-600 dark:text-yellow-400"
                    size={20}
                />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    カードが見つかりません
                </p>
            </div>
        );
    }

    const gridColsClass = getGridColsClass(resolvedCols);

    return (
        <div className={`not-prose my-6 grid gap-4 ${gridColsClass}`}>
            {resolvedCards.map((card, index) => (
                <ColumnsCard
                    key={index}
                    title={card.title}
                    href={card.href}
                    icon={card.icon}
                    content={card.content}
                    basePrefix={basePrefix}
                />
            ))}
        </div>
    );
}

export function MarkdownCard({
    title,
    href,
    icon,
    cta,
    arrow,
    basePrefix = '/markdown',
    children,
}: MarkdownCardProps) {
    const content = children;
    const showArrow = resolveArrow(arrow);

    return (
        <ColumnsCard
            title={title}
            href={href}
            icon={icon}
            content={content}
            cta={cta}
            arrow={showArrow}
            basePrefix={basePrefix}
        />
    );
}

function resolveCols(cols: number | string): number | null {
    const numeric = typeof cols === 'number' ? cols : parseInt(cols, 10);
    if (Number.isNaN(numeric) || numeric < 1 || numeric > 4) {
        return null;
    }

    return numeric;
}

function extractCards(children: React.ReactNode): Array<{
    title?: string;
    href?: string;
    icon?: string;
    content: string;
}> {
    return React.Children.toArray(children)
        .filter(
            (child): child is React.ReactElement<MarkdownCardProps> =>
                React.isValidElement(child) && child.type === MarkdownCard,
        )
        .map((card) => ({
            title: card.props.title,
            href: card.props.href,
            icon: card.props.icon,
            content: extractText(card.props.children),
        }));
}

function extractCardsFromNode(node: unknown): Array<{
    title?: string;
    href?: string;
    icon?: string;
    content: string;
}> {
    const nodeTyped = node as { children?: unknown[] };
    const children = Array.isArray(nodeTyped?.children)
        ? nodeTyped.children
        : [];

    return children
        .filter((child: unknown) => {
            const c = child as { type?: string; tagName?: string };
            return c?.type === 'element' && c.tagName === 'card';
        })
        .map((child: unknown) => {
            const c = child as {
                properties?: { title?: string; href?: string; icon?: string };
            };
            return {
                title: c.properties?.title,
                href: c.properties?.href,
                icon: c.properties?.icon,
                content: extractTextFromNode(child),
            };
        });
}

function extractText(node: React.ReactNode): string {
    if (node === null || node === undefined) {
        return '';
    }

    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(extractText).join('').trim();
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
        return extractText(node.props.children);
    }

    return '';
}

function resolveArrow(arrow: string | boolean | undefined): boolean {
    if (typeof arrow === 'boolean') {
        return arrow;
    }

    if (typeof arrow === 'string') {
        return arrow === 'true' || arrow === '1';
    }

    return false;
}

function extractTextFromNode(node: unknown): string {
    if (!node || typeof node !== 'object') {
        return '';
    }

    const n = node as { type?: string; value?: string; children?: unknown[] };

    if (n.type === 'text' && typeof n.value === 'string') {
        return n.value;
    }

    if (Array.isArray(n.children)) {
        return n.children.map(extractTextFromNode).join('').trim();
    }

    return '';
}

function getGridColsClass(cols: number): string {
    const colsMap: Record<number, string> = {
        1: 'md:grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
    };

    return colsMap[cols] || 'md:grid-cols-2';
}
