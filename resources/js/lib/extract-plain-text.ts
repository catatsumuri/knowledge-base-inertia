/**
 * Markdownからプレーンテキストを抽出する
 * OGP descriptionなどで使用
 */
export function extractPlainText(markdown: string, maxLength = 200): string {
    if (!markdown) return '';

    let text = markdown
        // コードブロックを除去
        .replace(/```[\s\S]*?```/g, '')
        // インラインコードを除去
        .replace(/`([^`]+)`/g, '$1')
        // 画像を除去
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        // リンクをテキストのみに
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // 見出し記号を除去
        .replace(/^#{1,6}\s+/gm, '')
        // 太字・斜体を除去
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // 箇条書き記号を除去
        .replace(/^[*\-+]\s+/gm, '')
        // 番号付きリストを除去
        .replace(/^\d+\.\s+/gm, '')
        // 引用記号を除去
        .replace(/^>\s+/gm, '')
        // HTMLタグを除去
        .replace(/<[^>]+>/g, '')
        // 複数の改行を1つに
        .replace(/\n{2,}/g, '\n')
        // 前後の空白を除去
        .trim();

    // 指定文字数で切り詰め
    if (text.length > maxLength) {
        text = text.substring(0, maxLength).trim() + '...';
    }

    return text;
}
