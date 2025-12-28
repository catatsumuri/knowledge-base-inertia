import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * コードブロックのメタ情報を保存するremarkプラグイン
 *
 * ```diff php:routes/web.php のようなメタ情報を
 * node.data.hProperties.metastring に保存してReactコンポーネントで利用可能にします。
 */
export function remarkCodeMeta() {
    return (tree: Root) => {
        visit(tree, 'code', (node: any) => {
            // メタ情報が存在する場合のみ処理
            if (node.meta) {
                const data = node.data || (node.data = {});
                const hProperties = data.hProperties || (data.hProperties = {});
                hProperties.metastring = node.meta;
            }
        });
    };
}
