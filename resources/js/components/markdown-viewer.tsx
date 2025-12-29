import { CodeBlock } from '@/components/code-block';
import { EmbedCard } from '@/components/embed-card';
import { MarkdownHeading } from '@/components/markdown-heading';
import { MarkdownImage } from '@/components/markdown-image';
import { remarkCodeMeta } from '@/lib/remark-code-meta';
import { preprocessImageSize, remarkImageSize } from '@/lib/remark-image-size';
import { remarkLinkifyToCard } from '@/lib/remark-linkify-to-card';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { preprocessZennSyntax } from '@/lib/remark-zenn-syntax';
import { Link } from '@inertiajs/react';
import { AlertCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
    content: string;
}

// Markdown内のリンクをInertia Linkに変換するコンポーネント
function MarkdownLink({ href, children, ...props }: React.ComponentPropsWithoutRef<'a'>) {
    // 脚注リンク（/markdown/#で始まる）をフラグメントのみに変換
    if (href && href.startsWith('/markdown/#')) {
        return (
            <a href={href.replace('/markdown/', '')} {...props}>
                {children}
            </a>
        );
    }

    // フラグメントのみのリンク（#で始まる）はそのまま
    if (href && href.startsWith('#')) {
        return <a href={href} {...props}>{children}</a>;
    }

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

// 埋め込みカードコンポーネント
function EmbedCardWrapper({ ...props }: React.ComponentPropsWithoutRef<'div'>) {
    const embedType = props['data-embed-type'] as 'github' | 'tweet' | 'youtube' | 'card';
    const embedUrl = props['data-embed-url'] as string;

    if (!embedType || !embedUrl) {
        return <div {...props} />;
    }

    return <EmbedCard type={embedType} url={embedUrl} />;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
    // Zenn式構文を標準remark-directive構文に変換してから画像サイズを処理
    const processedContent = preprocessImageSize(preprocessZennSyntax(content));

    return (
        <ReactMarkdown
            remarkPlugins={[
                remarkGfm,
                remarkBreaks,
                remarkDirective,
                remarkZennDirective,
                remarkImageSize,
                remarkCodeMeta,
                remarkLinkifyToCard,
            ]}
            rehypePlugins={[rehypeRaw, rehypeSlug]}
            components={{
                pre: ({ children }) => <>{children}</>,
                code: CodeBlock,
                img: MarkdownImage,
                aside: MessageBox,
                a: MarkdownLink,
                div: EmbedCardWrapper,
                h1: (props) => <MarkdownHeading level={1} {...props} />,
                h2: (props) => <MarkdownHeading level={2} {...props} />,
                h3: (props) => <MarkdownHeading level={3} {...props} />,
                h4: (props) => <MarkdownHeading level={4} {...props} />,
                h5: (props) => <MarkdownHeading level={5} {...props} />,
                h6: (props) => <MarkdownHeading level={6} {...props} />,
            }}
        >
            {processedContent}
        </ReactMarkdown>
    );
}
