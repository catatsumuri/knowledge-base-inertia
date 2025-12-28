import type { Paragraph, Root } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirectiveNode extends Node {
    type: 'containerDirective';
    name: string;
    attributes?: Record<string, string | undefined>;
    children: Node[];
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

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
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            // message ディレクティブ
            if (directiveNode.name === 'message') {
                // :::message{.alert} または :::message{alert} のようなattributesをチェック
                const attributes = directiveNode.attributes || {};
                const className = attributes.className || attributes.class || '';
                const isAlert = className.includes('alert') || attributes.alert !== undefined;

                const messageType = isAlert ? 'alert' : 'message';

                // HTMLに変換
                const data = directiveNode.data || (directiveNode.data = {});
                data.hName = 'aside';
                data.hProperties = {
                    className: `msg ${messageType}`,
                };

                // 子要素内のcode要素をpre要素でラップ
                if (directiveNode.children) {
                    const newChildren: Node[] = [];
                    for (const child of directiveNode.children) {
                        if (child.type === 'code') {
                            // paragraphノードをpre要素に変換し、その中にcode要素を配置
                            newChildren.push({
                                type: 'paragraph',
                                data: {
                                    hName: 'pre',
                                },
                                children: [child],
                            } as Paragraph);
                        } else {
                            newChildren.push(child);
                        }
                    }
                    directiveNode.children = newChildren;
                }
            }

            // details ディレクティブ
            if (directiveNode.name === 'details') {
                // ラベル（タイトル）を取得
                // remark-directiveでは :::details タイトル の "タイトル" 部分は
                // 解析されず、最初の段落として扱われる可能性があります。
                // そのため、最初の段落をsummaryとして使用します。
                let summary = '詳細';
                const originalChildren = [...directiveNode.children];

                // 最初の子要素がparagraphの場合、それをsummaryとして使用
                if (
                    originalChildren.length > 0 &&
                    originalChildren[0].type === 'paragraph'
                ) {
                    const firstParagraph = originalChildren.shift() as Paragraph;
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

                const data = directiveNode.data || (directiveNode.data = {});
                data.hName = 'details';
                data.hProperties = {};

                // summary と details-content を設定
                directiveNode.children = [
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
                    } as Paragraph,
                ];
            }
        });
    };
}
