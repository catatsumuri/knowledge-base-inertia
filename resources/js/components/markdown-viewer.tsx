import { CodeBlock } from '@/components/code-block';
import { MarkdownImage } from '@/components/markdown-image';
import { remarkCodeMeta } from '@/lib/remark-code-meta';
import { preprocessImageSize, remarkImageSize } from '@/lib/remark-image-size';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { preprocessZennSyntax } from '@/lib/remark-zenn-syntax';
import { Link } from '@inertiajs/react';
import { AlertCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
    content: string;
}

// Markdown内のリンクをInertia Linkに変換するコンポーネント
function MarkdownLink({ href, children, ...props }: React.ComponentPropsWithoutRef<'a'>) {
    // 外部リンク（http://またはhttps://で始まる）かどうかを判定
    const isExternalLink = href && href.match(/^https?:\/\//);

    if (isExternalLink) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
            </a>
        );
    }

    // 内部リンクの場合、相対パスは/markdown/を基準にする
    let internalHref = href || '';
    if (internalHref && !internalHref.startsWith('/')) {
        internalHref = `/markdown/${internalHref}`;
    }

    return (
        <Link href={internalHref} {...props}>
            {children}
        </Link>
    );
}

// Zenn式messageボックスのカスタムコンポーネント
function MessageBox({ children, className, ...props }: React.ComponentPropsWithoutRef<'aside'>) {
    const isMessage = className?.includes('message');
    const isAlert = className?.includes('alert');

    if (!isMessage && !isAlert) {
        return <aside className={className} {...props}>{children}</aside>;
    }

    const Icon = isAlert ? AlertCircle : Info;

    return (
        <aside className={className} {...props}>
            <Icon className="msg-symbol" size={20} />
            <div className="msg-content">{children}</div>
        </aside>
    );
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
    // Zenn式構文を標準remark-directive構文に変換してから画像サイズを処理
    const processedContent = preprocessImageSize(preprocessZennSyntax(content));

    return (
        <ReactMarkdown
            remarkPlugins={[
                remarkGfm,
                remarkDirective,
                remarkZennDirective,
                remarkImageSize,
                remarkCodeMeta,
            ]}
            rehypePlugins={[rehypeRaw]}
            components={{
                pre: ({ children }) => <>{children}</>,
                code: CodeBlock,
                img: MarkdownImage,
                aside: MessageBox,
                a: MarkdownLink,
            }}
        >
            {processedContent}
        </ReactMarkdown>
    );
}
