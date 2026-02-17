/**
 * リンクをカード埋め込みに変換するremarkプラグイン
 * Zenn Editorのmd-linkify-to-cardを参考に実装
 */
import type { Html, Link, Paragraph, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';
import { isGithubUrl, isTweetUrl, isYoutubeUrl } from './url-matcher';

export type EmbedType = 'github' | 'tweet' | 'youtube' | 'card';

/**
 * 段落内のリンクが単独行かどうかを判定する
 */
function isStandaloneLinkInParagraph(paragraph: Paragraph): Link | null {
    // 段落の子要素が1つのみで、それがリンクの場合
    if (
        paragraph.children.length === 1 &&
        paragraph.children[0].type === 'link'
    ) {
        return paragraph.children[0] as Link;
    }

    // テキストとリンクの組み合わせの場合
    // 例: "\nURL" や "URL\n" のようなパターンをチェック
    const children = paragraph.children;

    // リンクを探す
    const linkIndex = children.findIndex((child) => child.type === 'link');
    if (linkIndex === -1) return null;

    const link = children[linkIndex] as Link;

    // リンクの前後がテキストのみで、かつ空白文字や改行のみの場合は単独とみなす
    const isOnlyWhitespaceOrBreak = (node: unknown) => {
        if ((node as { type?: string }).type === 'text') {
            return ((node as Text).value?.trim() ?? '') === '';
        }
        if ((node as { type?: string }).type === 'break') {
            return true;
        }
        return false;
    };

    const beforeLink = children.slice(0, linkIndex);
    const afterLink = children.slice(linkIndex + 1);

    const isStandalone =
        beforeLink.every(isOnlyWhitespaceOrBreak) &&
        afterLink.every(isOnlyWhitespaceOrBreak);

    return isStandalone ? link : null;
}

/**
 * URLの種類を判定する
 */
function detectEmbedType(url: string): EmbedType {
    if (isTweetUrl(url)) return 'tweet';
    if (isYoutubeUrl(url)) return 'youtube';
    if (isGithubUrl(url)) return 'github';
    return 'card';
}

/**
 * カード埋め込み用のHTMLノードを生成する
 */
function createEmbedNode(url: string, embedType: EmbedType): Html {
    return {
        type: 'html',
        value: `<div data-embed-type="${embedType}" data-embed-url="${url}"></div>`,
    };
}

/**
 * remark-linkify-to-cardプラグイン
 */
export function remarkLinkifyToCard() {
    return (tree: Root) => {
        visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
            // 段落内に単独のリンクがあるかチェック
            const standaloneLink = isStandaloneLinkInParagraph(node);
            if (!standaloneLink) return;

            // リンクのURLを取得
            const url = standaloneLink.url;
            if (!url) return;

            // 外部リンク（httpまたはhttps）でない場合はスキップ
            if (!url.match(/^https?:\/\//)) return;

            // URLの種類を判定
            const embedType = detectEmbedType(url);

            // カード埋め込みノードを作成
            const embedNode = createEmbedNode(url, embedType);

            // 元の段落ノードを埋め込みノードで置換
            if (parent && typeof index === 'number') {
                parent.children[index] =
                    embedNode as unknown as (typeof parent.children)[number];
            }
        });
    };
}
