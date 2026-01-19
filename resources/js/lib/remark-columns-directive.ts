import type { Root } from 'mdast';
import type { Node, Parent } from 'unist';
import { SKIP, visitParents } from 'unist-util-visit-parents';

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

interface CardData {
    title?: string;
    href?: string;
    icon?: string;
    content: string;
}

/**
 * :::columns と :::card ディレクティブをサポートするremarkプラグイン
 *
 * サポートする構文:
 * :::columns{cols=2}
 *   :::card{title="タイトル" href="/path" icon="clock"}
 *   内容
 *   :::
 * :::
 */
export function remarkColumnsDirective() {
    return (tree: Root) => {
        visitParents(tree, (node: Node, ancestors: Parent[]) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            // cardディレクティブの処理
            if (directiveNode.name === 'card') {
                // 親がcolumnsかどうかをチェック
                const parentIsColumns = ancestors.some(
                    (ancestor) =>
                        ancestor.type === 'containerDirective' &&
                        (ancestor as ContainerDirectiveNode).name === 'columns',
                );

                // columns内のcardは何もしない（親のcolumnsが処理する）
                if (parentIsColumns) {
                    return;
                }

                // columnsの直後に配置されるcardは救済対象として許可
                const parent = ancestors[ancestors.length - 1] as
                    | Parent
                    | undefined;
                if (parent && Array.isArray(parent.children)) {
                    const index = parent.children.indexOf(node);
                    if (index > 0) {
                        const previous = parent.children[index - 1];
                        if (
                            previous?.type === 'containerDirective' &&
                            (previous as ContainerDirectiveNode).name ===
                                'columns'
                        ) {
                            return;
                        }
                    }
                }

                setErrorState(
                    directiveNode,
                    ':::card は :::columns 内でのみ使用できます',
                );

                return;
            }

            // columnsディレクティブの処理
            if (directiveNode.name === 'columns') {
                const cards: CardData[] = [];

                // 属性からcols値を取得（デフォルト: 2）
                const colsAttr = directiveNode.attributes?.cols;
                const cols = colsAttr ? parseInt(colsAttr, 10) : 2;

                // cols値のバリデーション（1-4の範囲）
                if (isNaN(cols) || cols < 1 || cols > 4) {
                    setErrorState(
                        directiveNode,
                        `不正なcols値です: ${colsAttr}（1-4の範囲で指定してください）`,
                    );
                    return;
                }

                // 子要素から:::cardディレクティブを抽出
                for (const child of directiveNode.children) {
                    if (
                        child.type === 'containerDirective' &&
                        (child as ContainerDirectiveNode).name === 'card'
                    ) {
                        const cardNode = child as ContainerDirectiveNode;
                        const cardData = extractCardData(cardNode);
                        cards.push(cardData);
                    }
                }

                // remark-directiveのネスト制約でcardが兄弟ノードになる場合の救済
                const parent = ancestors[ancestors.length - 1] as
                    | Parent
                    | undefined;
                if (parent && Array.isArray(parent.children)) {
                    const index = parent.children.indexOf(node);
                    if (index !== -1) {
                        const siblingCardIndexes: number[] = [];

                        for (
                            let i = index + 1;
                            i < parent.children.length;
                            i += 1
                        ) {
                            const sibling = parent.children[i];
                            if (
                                sibling?.type === 'containerDirective' &&
                                (sibling as ContainerDirectiveNode).name ===
                                    'card'
                            ) {
                                const cardNode =
                                    sibling as ContainerDirectiveNode;
                                const cardData = extractCardData(cardNode);
                                cards.push(cardData);
                                siblingCardIndexes.push(i);
                                continue;
                            }

                            break;
                        }

                        // 収集したcardノードを親から取り除く
                        for (
                            let i = siblingCardIndexes.length - 1;
                            i >= 0;
                            i -= 1
                        ) {
                            parent.children.splice(siblingCardIndexes[i], 1);
                        }
                    }
                }

                if (cards.length === 0) {
                    setErrorState(
                        directiveNode,
                        ':::columns 内に :::card が見つかりません',
                    );
                    return;
                }

                // data属性に設定
                const data = directiveNode.data || (directiveNode.data = {});
                data.hName = 'div';
                data.hProperties = {
                    'data-columns-config': JSON.stringify({ cols }),
                    'data-columns-cards': JSON.stringify(cards),
                };

                // 子要素をクリア（Reactコンポーネント側でレンダリング）
                directiveNode.children = [];

                // 子ノードの訪問をスキップ
                return SKIP;
            }
        });
    };
}

/**
 * cardノードからデータを抽出
 */
function extractCardData(cardNode: ContainerDirectiveNode): CardData {
    return {
        title: cardNode.attributes?.title,
        href: cardNode.attributes?.href,
        icon: cardNode.attributes?.icon,
        content: extractTextContent(cardNode.children),
    };
}

/**
 * ノード配列からテキストコンテンツを再帰的に抽出
 */
function extractTextContent(nodes: Node[]): string {
    return nodes
        .map((node) => {
            if (node.type === 'text') {
                return (node as any).value;
            }
            if (node.type === 'paragraph' && (node as any).children) {
                return extractTextContent((node as any).children);
            }
            return '';
        })
        .join('\n')
        .trim();
}

/**
 * エラー状態を設定
 */
function setErrorState(node: ContainerDirectiveNode, message: string) {
    const data = node.data || (node.data = {});
    data.hName = 'div';
    data.hProperties = {
        'data-columns-error': message,
    };
    node.children = [];
}
