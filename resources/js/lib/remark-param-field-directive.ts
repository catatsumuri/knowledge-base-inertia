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
 * ParamField 用のディレクティブ構文をサポートする remark プラグイン
 *
 * サポートする構文:
 * - :::param-field{header="X-Inertia" type="boolean"}
 * - :::param-field{body="component" type="string"}
 */
export function remarkParamFieldDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'param-field') {
                return;
            }

            const data = directiveNode.data || (directiveNode.data = {});
            data.hName = 'div';
            data.hProperties = {
                'data-param-field': 'true',
                'data-param-header': directiveNode.attributes?.header,
                'data-param-body': directiveNode.attributes?.body,
                'data-param-type': directiveNode.attributes?.type,
            };
        });
    };
}
