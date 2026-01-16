import { ColumnsCard } from '@/components/columns-card';
import { AlertCircle } from 'lucide-react';

interface CardData {
    title?: string;
    href?: string;
    icon?: string;
    content: string;
}

interface ColumnsConfig {
    cols: number;
}

interface ColumnsWrapperProps extends React.ComponentPropsWithoutRef<'div'> {
    basePrefix?: string;
}

/**
 * Columnsディレクティブのラッパーコンポーネント
 *
 * data-columns-config と data-columns-cards からデータをパースし、
 * グリッドレイアウトで複数のカードを表示
 */
export function ColumnsWrapper({
    basePrefix = '/markdown',
    ...props
}: ColumnsWrapperProps) {
    const rawConfig = props['data-columns-config'] as string | undefined;
    const rawCards = props['data-columns-cards'] as string | undefined;
    const error = props['data-columns-error'] as string | undefined;

    // エラー表示
    if (error) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="flex-shrink-0 text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                </p>
            </div>
        );
    }

    // データのパース
    let config: ColumnsConfig;
    let cards: CardData[];

    try {
        config = rawConfig ? JSON.parse(rawConfig) : { cols: 2 };
        cards = rawCards ? JSON.parse(rawCards) : [];
    } catch (parseError) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="flex-shrink-0 text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    Columnsデータのパースに失敗しました
                </p>
            </div>
        );
    }

    if (cards.length === 0) {
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

    // グリッドクラスの生成（cols値に応じて）
    const gridColsClass = getGridColsClass(config.cols);

    return (
        <div className={`not-prose my-6 grid gap-4 ${gridColsClass}`}>
            {cards.map((card, index) => (
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

/**
 * cols値に応じたTailwind gridクラスを生成
 * レスポンシブ対応: モバイルは常に1列、タブレット以上で指定列数
 */
function getGridColsClass(cols: number): string {
    const colsMap: Record<number, string> = {
        1: 'md:grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
    };

    return colsMap[cols] || 'md:grid-cols-2'; // デフォルトは2列
}
