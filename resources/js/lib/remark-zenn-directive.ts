import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Zenn式のディレクティブ構文をサポートするremarkプラグイン
 *
 * サポートする構文:
 * - :::message - メッセージボックス
 * - :::message alert - 警告メッセージボックス
 * - :::details タイトル - アコーディオン/トグル
 *
 * remark-directiveと組み合わせて使用します。
 */
export function remarkZennDirective() {
    return (tree: Root) => {
        visit(tree, (node: any) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            // message ディレクティブ
            if (node.name === 'message') {
                // :::message{.alert} または :::message{alert} のようなattributesをチェック
                const attributes = node.attributes || {};
                const className = attributes.className || attributes.class || '';
                const isAlert = className.includes('alert') || attributes.alert !== undefined;

                const messageType = isAlert ? 'alert' : 'message';

                // HTMLに変換
                const data = node.data || (node.data = {});
                data.hName = 'aside';
                data.hProperties = {
                    className: `msg ${messageType}`,
                };

                // 子要素内のcode要素をpre要素でラップ
                if (node.children) {
                    const newChildren: any[] = [];
                    for (const child of node.children) {
                        if (child.type === 'code') {
                            // paragraphノードをpre要素に変換し、その中にcode要素を配置
                            newChildren.push({
                                type: 'paragraph',
                                data: {
                                    hName: 'pre',
                                },
                                children: [child],
                            });
                        } else {
                            newChildren.push(child);
                        }
                    }
                    node.children = newChildren;
                }
            }

            // details ディレクティブ
            if (node.name === 'details') {
                // ラベル（タイトル）を取得
                // remark-directiveでは :::details タイトル の "タイトル" 部分は
                // 解析されず、最初の段落として扱われる可能性があります。
                // そのため、最初の段落をsummaryとして使用します。
                let summary = '詳細';
                const originalChildren = [...node.children];

                // 最初の子要素がparagraphの場合、それをsummaryとして使用
                if (
                    originalChildren.length > 0 &&
                    originalChildren[0].type === 'paragraph'
                ) {
                    const firstParagraph: any = originalChildren.shift();
                    // テキストを抽出
                    if (
                        firstParagraph.children &&
                        firstParagraph.children.length > 0
                    ) {
                        const textNode = firstParagraph.children[0];
                        if (textNode.type === 'text') {
                            summary = textNode.value;
                        }
                    }
                }

                const data = node.data || (node.data = {});
                data.hName = 'details';
                data.hProperties = {};

                // summary と details-content を設定
                node.children = [
                    {
                        type: 'html',
                        value: `<summary>${summary}</summary>`,
                    },
                    {
                        type: 'paragraph',
                        data: {
                            hName: 'div',
                            hProperties: { className: 'details-content' },
                        },
                        children: originalChildren,
                    },
                ];
            }
        });
    };
}
