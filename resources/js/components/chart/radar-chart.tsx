import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart as RechartsRadar,
    ResponsiveContainer,
} from 'recharts';
import type { RadarChartProps } from './types';
import { parseChartSize } from './utils';

/**
 * チャート用のカラーパレット
 * ライトモード・ダークモード両方で視認性の良い色を使用
 */
const CHART_COLORS = {
    light: [
        '#ea580c', // オレンジ
        '#0891b2', // シアン
        '#4338ca', // インディゴ
        '#ca8a04', // イエロー
        '#dc2626', // レッド
    ],
    dark: [
        '#a78bfa', // パープル
        '#4ade80', // グリーン
        '#facc15', // イエロー
        '#c084fc', // パープル
        '#fb923c', // オレンジ
    ],
};

/**
 * 現在のテーマに応じた色を取得
 */
function getChartColors(): string[] {
    if (typeof window === 'undefined') {
        return CHART_COLORS.light;
    }

    const isDark = document.documentElement.classList.contains('dark');
    return isDark ? CHART_COLORS.dark : CHART_COLORS.light;
}

/**
 * レーダーチャートコンポーネント
 *
 * Rechartsを使用してレーダーチャートを描画します。
 * ダークモード対応、レスポンシブ対応済み。
 *
 * @param data - チャートデータポイント配列
 * @param title - チャートタイトル（オプション）
 * @param height - チャート高さ（px または %、デフォルト: 400）
 * @param width - チャート幅（px または %、デフォルト: 100%）
 */
export function RadarChart({ data, title, height, width }: RadarChartProps) {
    const [colors, setColors] = useState<string[]>(getChartColors);

    useEffect(() => {
        // ダークモードの切り替えを監視
        const observer = new MutationObserver(() => {
            setColors(getChartColors());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    // データが空の場合はエラー表示
    if (!data || data.length === 0) {
        return (
            <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <AlertCircle
                    className="text-red-600 dark:text-red-400"
                    size={20}
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                    チャートデータが空です
                </p>
            </div>
        );
    }

    const chartHeight = parseChartSize(height, 400);
    const chartWidth = parseChartSize(width, '100%');

    return (
        <div className="not-prose my-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            {title && (
                <div className="mb-4 text-center text-base font-medium text-gray-700 dark:text-gray-300">
                    {title}
                </div>
            )}
            <ResponsiveContainer
                width={chartWidth as any}
                height={chartHeight as any}
            >
                <RechartsRadar
                    data={data}
                    margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                >
                    <PolarGrid
                        stroke="currentColor"
                        className="stroke-gray-300 dark:stroke-gray-600"
                    />
                    <PolarAngleAxis
                        dataKey="name"
                        tick={{ fill: '#374151', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: '#374151', fontSize: 11 }}
                    />
                    <Radar
                        name="Value"
                        dataKey="value"
                        stroke={colors[0]}
                        fill={colors[0]}
                        fillOpacity={0.3}
                        strokeWidth={2}
                    />
                </RechartsRadar>
            </ResponsiveContainer>
        </div>
    );
}
