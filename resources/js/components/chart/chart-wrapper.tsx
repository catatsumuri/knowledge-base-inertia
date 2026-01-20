import { parseKeyValueData } from '@/lib/chart-parsers';
import { AlertCircle } from 'lucide-react';
import { RadarChart } from './radar-chart';

/**
 * チャートラッパーコンポーネント
 *
 * data属性からチャートタイプとデータを取得し、
 * 適切なチャートコンポーネントをレンダリングします。
 *
 * サポートされているチャートタイプ:
 * - radar: レーダーチャート
 * - bar: 棒グラフ（将来実装）
 * - pie: 円グラフ（将来実装）
 * - line: 折れ線グラフ（将来実装）
 */
export function ChartWrapper({
    ...props
}: React.ComponentPropsWithoutRef<'div'> & Record<string, unknown>) {
    const chartType = props['data-chart-type'] as string | undefined;
    const rawData = props['data-chart-data'] as string | undefined;
    const title = props['data-chart-title'] as string | undefined;
    const height = props['data-chart-height'] as string | undefined;
    const width = props['data-chart-width'] as string | undefined;

    // チャート関連の属性がない場合は通常のdivとして表示
    if (!chartType || !rawData) {
        return <div {...props} />;
    }

    // データをパース
    let data;
    let parseError: Error | null = null;

    try {
        data = parseKeyValueData(rawData);
    } catch (error) {
        parseError = error instanceof Error ? error : new Error('不明なエラー');
    }

    // パースエラー時はエラー表示
    if (parseError) {
        return (
            <div className="my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    チャートデータのパースに失敗: {parseError.message}
                </p>
            </div>
        );
    }

    // dataが存在しない場合は表示しない（parseErrorで既にチェック済み）
    if (!data) {
        return null;
    }

    const chartProps = { data, title, height, width };

    // チャートタイプに応じてコンポーネントを選択
    switch (chartType) {
        case 'radar':
            return <RadarChart {...chartProps} />;

        // 将来的に追加
        // case 'bar':
        //     return <BarChart {...chartProps} />;
        // case 'pie':
        //     return <PieChart {...chartProps} />;
        // case 'line':
        //     return <LineChart {...chartProps} />;

        default:
            return (
                <div className="my-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                    <AlertCircle
                        className="text-yellow-600 dark:text-yellow-400"
                        size={20}
                    />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        未対応のチャートタイプ: {chartType}
                    </p>
                </div>
            );
    }
}
