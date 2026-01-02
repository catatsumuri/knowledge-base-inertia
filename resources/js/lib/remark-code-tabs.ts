import type { ContainerDirective } from 'mdast-util-directive';
import type { Plugin } from 'unified';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

/**
 * :::code-tabs ディレクティブを処理するプラグイン
 *
 * 各コードブロックから言語とラベルを抽出し、
 * data-code-tabs 属性として JSON で埋め込む
 */
export const remarkCodeTabs: Plugin = () => {
    return (tree: Node) => {
        visit(tree, 'containerDirective', (node: ContainerDirective) => {
            if (node.name !== 'code-tabs') return;

            const tabs: Array<{
                language: string;
                label: string;
                code: string;
                meta?: string;
            }> = [];

            // 子ノードからコードブロックを抽出
            for (const child of node.children) {
                if (child.type === 'code') {
                    const meta = child.meta || '';
                    const [language, label] = parseCodeMeta(
                        child.lang || 'text',
                        meta,
                    );

                    tabs.push({
                        language,
                        label,
                        code: child.value,
                        meta: meta || undefined,
                    });
                }
            }

            if (tabs.length === 0) {
                // エラー表示用のノードに変換
                node.data = node.data || {};
                node.data.hName = 'div';
                node.data.hProperties = {
                    'data-code-tabs-error': 'コードブロックが見つかりません',
                };
                node.children = [];
                return;
            }

            // JSON シリアライズして data 属性に埋め込む
            node.data = node.data || {};
            node.data.hName = 'div';
            node.data.hProperties = {
                'data-code-tabs': JSON.stringify(tabs),
            };
            node.children = [];
        });
    };
};

/**
 * コードブロックのメタ情報から言語とラベルを抽出
 *
 * @param lang - 言語識別子
 * @param meta - メタ情報文字列
 * @returns [language, label] のタプル
 *
 * @example
 * parseCodeMeta('vuejs', 'Vue.js') => ['vuejs', 'Vue.js']
 * parseCodeMeta('javascript', '') => ['javascript', 'JavaScript']
 */
function parseCodeMeta(lang: string, meta: string): [string, string] {
    // メタ情報にラベルが含まれている場合（language:Label 形式）
    // remark-code-meta によって meta に変換される
    const labelMatch = meta.match(/^:(.+)$/);
    if (labelMatch) {
        return [lang, labelMatch[1].trim()];
    }

    const langLabelMatch = lang.match(/^([^:]+):(.+)$/);
    if (langLabelMatch) {
        return [langLabelMatch[1].trim(), langLabelMatch[2].trim()];
    }

    // ラベルがない場合は言語名を整形して使用
    return [lang, formatLanguageLabel(lang)];
}

/**
 * 言語識別子を表示用ラベルに変換
 */
function formatLanguageLabel(lang: string): string {
    const labels: Record<string, string> = {
        javascript: 'JavaScript',
        typescript: 'TypeScript',
        jsx: 'JSX',
        tsx: 'TSX',
        vue: 'Vue',
        vuejs: 'Vue.js',
        react: 'React',
        svelte: 'Svelte',
        php: 'PHP',
        python: 'Python',
        ruby: 'Ruby',
        go: 'Go',
        rust: 'Rust',
        java: 'Java',
        csharp: 'C#',
        cpp: 'C++',
        c: 'C',
        swift: 'Swift',
        kotlin: 'Kotlin',
        bash: 'Bash',
        shell: 'Shell',
        sql: 'SQL',
        html: 'HTML',
        css: 'CSS',
        scss: 'SCSS',
        sass: 'Sass',
        less: 'Less',
        json: 'JSON',
        yaml: 'YAML',
        xml: 'XML',
        markdown: 'Markdown',
        text: 'Text',
    };

    return (
        labels[lang.toLowerCase()] ||
        lang.charAt(0).toUpperCase() + lang.slice(1)
    );
}
