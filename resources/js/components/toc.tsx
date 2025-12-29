import { TocNode } from '@/lib/parse-toc';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface TocListProps {
    toc: TocNode[];
    depth?: number;
    maxDepth: number;
}

function TocList({ toc, depth = 1, maxDepth }: TocListProps) {
    if (toc.length === 0) {
        return null;
    }

    return (
        <ol className="space-y-2">
            {toc.map((node) => {
                return (
                    <li key={node.id}>
                        <a
                            href={`#${node.id}`}
                            className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {node.text}
                        </a>
                        {depth < maxDepth && node.children.length > 0 && (
                            <div className="ml-4 mt-1.5 border-l border-border pl-3">
                                <TocList toc={node.children} maxDepth={maxDepth} depth={depth + 1} />
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

interface TocProps {
    toc: TocNode[];
    maxDepth?: number;
}

/**
 * 目次コンポーネント
 * @param toc TocNodeの配列
 * @param maxDepth 最大何層目までの見出しを目次に含めるか（デフォルト: 3）
 */
export function Toc({ toc, maxDepth = 3 }: TocProps) {
    const [isOpen, setIsOpen] = useState(true);

    if (toc.length === 0) {
        return null;
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold transition-colors hover:bg-accent"
            >
                <span className="text-sm">目次</span>
                <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="border-t border-border px-4 py-4">
                    <TocList toc={toc} maxDepth={maxDepth} />
                </div>
            )}
        </div>
    );
}
