/**
 * :::columns / :::card を HTML タグに変換する
 *
 * remark-directiveは同じフェンス長のネストを許可しないため、
 * HTMLタグに変換して rehypeRaw で処理します。
 */
export function preprocessColumnsSyntax(markdown: string): string {
    const lines = markdown.split(/\r?\n/);
    const output: string[] = [];
    let inColumns = false;
    let inCard = false;

    for (const line of lines) {
        const columnsMatch = line.match(/^(\s*):::columns\b(.*)$/);
        if (!inColumns && columnsMatch) {
            const attrs = parseDirectiveAttributes(columnsMatch[2]);
            output.push(`${columnsMatch[1]}<Columns${attrs}>`);
            inColumns = true;
            continue;
        }

        if (inColumns) {
            const cardMatch = line.match(/^(\s*):::card\b(.*)$/);
            if (!inCard && cardMatch) {
                const attrs = parseDirectiveAttributes(cardMatch[2]);
                output.push(`${cardMatch[1]}<Card${attrs}>`);
                inCard = true;
                continue;
            }

            const closingMatch = line.match(/^(\s*):::\s*$/);
            if (closingMatch) {
                if (inCard) {
                    output.push(`${closingMatch[1]}</Card>`);
                    inCard = false;
                    continue;
                }

                output.push(`${closingMatch[1]}</Columns>`);
                inColumns = false;
                continue;
            }
        }

        output.push(line);
    }

    return output.join('\n');
}

function parseDirectiveAttributes(trailing: string): string {
    const trimmed = trailing.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return '';
    }

    const inner = trimmed.slice(1, -1).trim();
    if (inner === '') {
        return '';
    }

    const attributes: string[] = [];
    const regex = /(\w+)=(".*?"|'.*?'|\S+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(inner)) !== null) {
        const key = match[1];
        let value = match[2];
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        attributes.push(`${key}="${escapeAttribute(value)}"`);
    }

    return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
}

function escapeAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
