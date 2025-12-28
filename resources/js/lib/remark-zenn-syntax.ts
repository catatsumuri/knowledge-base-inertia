/**
 * Zenn式のディレクティブ構文を標準のremark-directive構文に変換する
 *
 * :::message alert → :::message{.alert}
 * :::details タイトル → :::details[タイトル]
 */
export function preprocessZennSyntax(markdown: string): string {
    // :::message alert を :::message{.alert} に変換
    let result = markdown.replace(/:::message\s+alert\b/g, ':::message{.alert}');

    // :::details タイトル を :::details[タイトル] に変換
    // :::details の後にスペースと改行以外の文字がある場合
    result = result.replace(/:::details\s+(.+?)(\r?\n)/g, ':::details[$1]$2');

    return result;
}
