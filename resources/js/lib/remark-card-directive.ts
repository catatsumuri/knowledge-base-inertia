import type { Root } from 'mdast';
import type { Node, Parent } from 'unist';
import { visitParents } from 'unist-util-visit-parents';

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
 * :::card ディレクティブを単体カードとしてレンダリングするためのプラグイン
 *
 * :::card{title="..." href="..." icon="..." cta="..." arrow="true"}
 * 内容
 * :::
 */
export function remarkCardDirective() {
    return (tree: Root) => {
        visitParents(tree, (node: Node, ancestors: Parent[]) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'card') {
                return;
            }

            // columns 内の card は columns が処理するのでスキップ
            const parentIsColumns = ancestors.some(
                (ancestor) =>
                    ancestor.type === 'containerDirective' &&
                    (ancestor as ContainerDirectiveNode).name === 'columns',
            );

            if (parentIsColumns) {
                return;
            }

            const data = directiveNode.data || (directiveNode.data = {});
            data.hName = 'div';
            data.hProperties = {
                'data-card-title': directiveNode.attributes?.title,
                'data-card-href': directiveNode.attributes?.href,
                'data-card-icon': directiveNode.attributes?.icon,
                'data-card-cta': directiveNode.attributes?.cta,
                'data-card-arrow': directiveNode.attributes?.arrow,
            };
        });
    };
}
