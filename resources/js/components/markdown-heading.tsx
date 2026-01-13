import { Link, Pencil } from 'lucide-react';
import { useRef } from 'react';

interface MarkdownHeadingProps
    extends React.HTMLAttributes<HTMLHeadingElement> {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    children?: React.ReactNode;
    onEditHeading?: (payload: { level: number; text: string }) => void;
}

export function MarkdownHeading({
    level,
    children,
    id,
    onEditHeading,
    ...props
}: MarkdownHeadingProps) {
    const Tag = `h${level}` as const;
    const headingRef = useRef<HTMLHeadingElement>(null);

    const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!id) return;

        // URLのハッシュを更新
        window.history.pushState(null, '', `#${id}`);

        // 要素にスムーススクロール
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // IDがない場合は通常の見出しとして表示
    const handleEditClick = () => {
        if (!onEditHeading || !headingRef.current) {
            return;
        }

        const headingText = headingRef.current.textContent?.trim() ?? '';
        if (!headingText) {
            return;
        }

        onEditHeading({ level, text: headingText });
    };

    if (!id) {
        return (
            <Tag ref={headingRef} {...props}>
                {children}
            </Tag>
        );
    }

    return (
        <Tag
            ref={headingRef}
            id={id}
            className="group relative scroll-mt-20"
            {...props}
        >
            <a
                href={`#${id}`}
                onClick={handleAnchorClick}
                className="absolute top-1/2 -left-6 hidden -translate-y-1/2 rounded p-1 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-accent hover:text-foreground md:inline-flex"
                aria-label="この見出しへのリンク"
                title="この見出しへのリンク"
            >
                <Link size={16} />
            </a>
            {onEditHeading && level === 2 && (
                <button
                    type="button"
                    onClick={handleEditClick}
                    className="absolute top-1/2 -right-6 hidden -translate-y-1/2 rounded p-1 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-accent hover:text-foreground md:inline-flex"
                    aria-label="この段落を編集する"
                    title="この段落を編集する"
                >
                    <Pencil size={16} />
                </button>
            )}
            {children}
        </Tag>
    );
}
