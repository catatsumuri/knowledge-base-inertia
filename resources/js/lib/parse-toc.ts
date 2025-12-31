export interface TocNode {
    text: string;
    id: string;
    level: number;
    children: TocNode[];
}

/**
 * HTML要素から目次を生成
 * @param element HTML要素
 * @returns TocNodeの配列
 */
export function parseToc(element: HTMLElement): TocNode[] {
    const headings = Array.from(element.querySelectorAll('h1, h2, h3'));

    const headingsToc = headings.map((heading) => ({
        level: parseInt(heading.tagName.slice(1), 10),
        text: heading.textContent?.trim() || '',
        id: heading.id,
        children: [] as TocNode[],
    }));

    // 先頭に出現したHeadingタグは最上位の階層とする
    // 以降に出現したHeadingタグは、最上位の階層の最後のHeadingタグのレベルと比較して同じか大きければ末尾に追加、
    // 小さい場合は一つ下の階層で同様の判定を行う。最下位の階層の最後のHeadingタグのレベルよりも低い場合は、さらに下の階層に追加する。
    return headingsToc.reduce((acc: TocNode[], current: TocNode): TocNode[] => {
        let array = acc; // current TOC を投入するターゲットとなる配列。トップレベルから初めて条件を満たすたびにネストする

        while (true) {
            if (
                array.length === 0 ||
                array[array.length - 1].level >= current.level
            ) {
                // ターゲット配列が空（最初のheadings）のときはcurrentを先頭に追加
                // ターゲット配列の末尾レベルがcurrentと比べて同じか大きければarrayの末尾に追加
                break;
            }

            // それ以外の場合は走査するarrayを末尾のchildrenにする
            array = array[array.length - 1].children;
        }

        array.push(current);
        return acc;
    }, []);
}
