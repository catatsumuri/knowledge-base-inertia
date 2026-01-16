/**
 * <ParamField> タグを :::param-field{...} 形式に変換するプリプロセッサ
 *
 * 変換例:
 * <ParamField header="X-Inertia" type="boolean">
 *   説明文
 * </ParamField>
 *
 * ↓
 *
 * :::param-field{header="X-Inertia" type="boolean"}
 * 説明文
 * :::
 */
export function preprocessParamField(content: string): string {
    // <ParamField ... > ... </ParamField> を検出する正規表現
    const paramFieldRegex = /<ParamField\s+([^>]+)>([\s\S]*?)<\/ParamField>/gi;

    return content.replace(
        paramFieldRegex,
        (match, attributesStr, innerContent) => {
            // 属性を解析
            const attributes: Record<string, string> = {};

            // header="..." や type="..." を抽出
            const attrRegex = /(\w+)="([^"]*)"/g;
            let attrMatch;

            while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
                attributes[attrMatch[1]] = attrMatch[2];
            }

            // 属性を {key="value"} 形式に変換
            const attrString = Object.entries(attributes)
                .map(([key, value]) => `${key}="${value}"`)
                .join(' ');

            // 内容の前後の空白を整理
            const trimmedContent = innerContent.trim();

            // :::param-field{...} 形式に変換
            return `:::param-field{${attrString}}\n${trimmedContent}\n:::`;
        },
    );
}
