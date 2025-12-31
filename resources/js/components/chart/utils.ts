/**
 * チャート用のカラーパレットを取得
 *
 * app.cssで定義されたCSS変数を使用
 * ライトモード・ダークモード両方に対応
 *
 * @returns カラー配列（CSS変数から取得）
 */
export function getChartColors(): string[] {
    return [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)',
    ];
}

/**
 * チャートサイズをパース
 *
 * @param size - サイズ指定（数値、px、%）
 * @param defaultSize - デフォルトサイズ
 * @returns パースされたサイズ（数値または文字列）
 *
 * @example
 * ```typescript
 * parseChartSize("400", 300) // 400
 * parseChartSize("80%", 300) // "80%"
 * parseChartSize(undefined, 300) // 300
 * ```
 */
export function parseChartSize(
    size?: string,
    defaultSize: number | string = 400,
): number | string {
    if (!size) {
        return defaultSize;
    }

    // パーセント指定の場合はそのまま返す
    if (size.endsWith('%')) {
        return size;
    }

    // 数値のみの場合はパース
    const parsed = parseInt(size, 10);
    return isNaN(parsed) ? defaultSize : parsed;
}
