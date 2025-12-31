import type { Root } from 'mdast';
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
 * チャート用のディレクティブ構文をサポートするremarkプラグイン
 *
 * サポートする構文:
 * - :::chart-radar - レーダーチャート
 * - :::chart-bar - 棒グラフ（将来実装）
 * - :::chart-pie - 円グラフ（将来実装）
 *
 * 属性:
 * - title - チャートのタイトル
 * - height - チャートの高さ（px または %）
 * - width - チャートの幅（px または %）
 *
 * @example
 * ```markdown
 * :::chart-radar{title="スキル評価" height="400"}
 * JavaScript: 90
 * TypeScript: 85
 * React: 88
 * :::
 * ```
 */
export function remarkChartDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            // chart-radar, chart-bar, chart-pie などを検出
            if (directiveNode.name.startsWith('chart-')) {
                const chartType = directiveNode.name.replace('chart-', '');

                // 子要素からデータ文字列を抽出
                const dataContent = extractTextContent(directiveNode.children);

                // data.hProperties にチャートデータと属性を設定
                const data = directiveNode.data || (directiveNode.data = {});
                data.hName = 'div';
                data.hProperties = {
                    'data-chart-type': chartType,
                    'data-chart-data': dataContent,
                    'data-chart-title': directiveNode.attributes?.title,
                    'data-chart-height': directiveNode.attributes?.height,
                    'data-chart-width': directiveNode.attributes?.width,
                };

                // 子要素をクリア（div要素として表示するため）
                directiveNode.children = [];
            }
        });
    };
}

/**
 * ノード配列からテキストコンテンツを再帰的に抽出
 *
 * @param nodes - MDASノード配列
 * @returns 抽出されたテキスト
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
