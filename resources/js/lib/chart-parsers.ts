import type { ChartDataPoint } from '@/components/chart/types';

/**
 * キー: 値形式のテキストをChartDataPoint配列に変換
 *
 * @param content - 改行区切りの「キー: 値」形式のテキスト
 * @returns パースされたチャートデータポイント配列
 * @throws 数値変換に失敗した場合にエラーをスロー
 *
 * @example
 * ```typescript
 * const data = parseKeyValueData("JavaScript: 90\nTypeScript: 85");
 * // [{ name: "JavaScript", value: 90 }, { name: "TypeScript", value: 85 }]
 * ```
 */
export function parseKeyValueData(content: string): ChartDataPoint[] {
    return content
        .split('\n')
        .filter((line) => line.trim() && line.includes(':'))
        .map((line) => {
            const [name, valueStr] = line.split(':').map((s) => s.trim());
            const value = parseFloat(valueStr);

            if (isNaN(value)) {
                throw new Error(
                    `Invalid number: ${valueStr} in line "${line}"`,
                );
            }

            return { name, value };
        });
}
