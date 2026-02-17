import type { ContainerDirective } from 'mdast-util-directive';
import type { Plugin } from 'unified';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirectiveNode extends ContainerDirective {
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

/**
 * :::tabs / :::tab ディレクティブを処理するプラグイン
 */
export const remarkTabsDirective: Plugin = () => {
    return (tree: Node) => {
        visit(tree, 'containerDirective', (node: ContainerDirective) => {
            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name === 'tabs') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'tabs';
                directiveNode.data.hProperties = {
                    'data-tabs-sync':
                        directiveNode.attributes?.sync ?? undefined,
                    'data-tabs-border-bottom':
                        directiveNode.attributes?.borderBottom ?? undefined,
                };
            }

            if (directiveNode.name === 'tab') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'tab';
                directiveNode.data.hProperties = {
                    'data-tab-title': directiveNode.attributes?.title,
                    'data-tab-icon': directiveNode.attributes?.icon,
                };
            }
        });
    };
};
