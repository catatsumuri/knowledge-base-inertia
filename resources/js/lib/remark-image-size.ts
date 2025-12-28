import type { Image, Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Zenn式の画像サイズ指定構文（=WIDTHxHEIGHT）をサポートするremarkプラグイン
 *
 * サポートする構文:
 * - ![alt](url =500x) - 幅のみ指定
 * - ![alt](url =500x300) - 幅と高さを指定
 *
 * このプラグインは、クエリパラメータ形式（?__width__=500&__height__=300）を検出し、
 * HTML属性に変換します。Markdown文字列の前処理が必要です。
 */
export function remarkImageSize() {
    return (tree: Root) => {
        visit(tree, 'image', (node: Image) => {
            if (!node.url) {
                return;
            }

            // クエリパラメータからサイズ情報を抽出
            const urlObj = new URL(node.url, 'http://dummy');
            const width = urlObj.searchParams.get('__width__');
            const height = urlObj.searchParams.get('__height__');

            if (width || height) {
                // クエリパラメータを削除
                urlObj.searchParams.delete('__width__');
                urlObj.searchParams.delete('__height__');

                // クリーンなURLを生成（相対URLの場合はpathname + searchのみ）
                const cleanUrl = node.url.startsWith('http')
                    ? urlObj.toString()
                    : urlObj.pathname + (urlObj.search || '');

                node.url = cleanUrl;

                // data属性にサイズ情報を追加
                if (!node.data) {
                    node.data = {};
                }

                if (!node.data.hProperties) {
                    node.data.hProperties = {};
                }

                if (width) {
                    node.data.hProperties.width = width;
                }

                if (height) {
                    node.data.hProperties.height = height;
                }
            }
        });
    };
}

/**
 * Zenn式の画像サイズ構文を前処理する関数
 *
 * ![alt](url =WIDTHxHEIGHT) を ![alt](url?__width__=WIDTH&__height__=HEIGHT) に変換
 */
export function preprocessImageSize(markdown: string): string {
    return markdown.replace(
        /!\[([^\]]*)\]\(([^\s)]+)\s+=(\d+)x(\d*)\)/g,
        (match, alt, url, width, height) => {
            const params = new URLSearchParams();
            params.set('__width__', width);
            if (height) {
                params.set('__height__', height);
            }
            const separator = url.includes('?') ? '&' : '?';
            return `![${alt}](${url}${separator}${params.toString()})`;
        },
    );
}
