import { Link } from 'lucide-react';

interface MarkdownHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    children?: React.ReactNode;
}

export function MarkdownHeading({ level, children, id, ...props }: MarkdownHeadingProps) {
    const Tag = `h${level}` as const;

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
    if (!id) {
        return <Tag {...props}>{children}</Tag>;
    }

    return (
        <Tag id={id} className="group relative scroll-mt-20" {...props}>
            <a
                href={`#${id}`}
                onClick={handleAnchorClick}
                className="absolute -left-6 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100 md:inline-flex"
                aria-label="この見出しへのリンク"
                title="この見出しへのリンク"
            >
                <Link size={16} />
            </a>
            {children}
        </Tag>
    );
}
