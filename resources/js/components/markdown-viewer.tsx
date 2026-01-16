import { ChartWrapper } from '@/components/chart/chart-wrapper';
import { CodeBlock } from '@/components/code-block';
import { CodeTabsWrapper } from '@/components/code-tabs';
import { ColumnsWrapper } from '@/components/columns-wrapper';
import { EmbedCard } from '@/components/embed-card';
import { MarkdownCard, MarkdownColumns } from '@/components/markdown-columns';
import { MarkdownHeading } from '@/components/markdown-heading';
import { MarkdownImage } from '@/components/markdown-image';
import { ParamField } from '@/components/param-field';
import { remarkChartDirective } from '@/lib/remark-chart-directive';
import { remarkCardDirective } from '@/lib/remark-card-directive';
import { remarkCodeMeta } from '@/lib/remark-code-meta';
import { remarkCodeTabs } from '@/lib/remark-code-tabs';
import { preprocessImageSize, remarkImageSize } from '@/lib/remark-image-size';
import { remarkLinkifyToCard } from '@/lib/remark-linkify-to-card';
import { remarkParamFieldDirective } from '@/lib/remark-param-field-directive';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { preprocessColumnsSyntax } from '@/lib/remark-columns-syntax';
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
    onEditHeading?: (payload: { level: number; text: string }) => void;
    basePrefix?: string;
}

// Markdown内のリンクをInertia Linkに変換するコンポーネント
function MarkdownLink({
    href,
    children,
    basePrefix = '/markdown',
    ...props
}: React.ComponentPropsWithoutRef<'a'> & { basePrefix?: string }) {
    // 脚注リンク（/markdown/#または/pages/#で始まる）をフラグメントのみに変換
    if (
        href &&
        (href.startsWith('/markdown/#') || href.startsWith('/pages/#'))
    ) {
        return (
            <a href={href.replace(/^\/(markdown|pages)\//, '')} {...props}>
                {children}
            </a>
        );
    }

    // フラグメントのみのリンク（#で始まる）はそのまま
    if (href && href.startsWith('#')) {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
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

    // 内部リンクの場合、相対パスは現在のbasePrefixを基準にする
    let internalHref = href || '';
    if (internalHref && !internalHref.startsWith('/')) {
        internalHref = `${basePrefix}/${internalHref}`;
    }

    return (
        <Link href={internalHref} {...props}>
            {children}
        </Link>
    );
}

// Zenn式messageボックスのカスタムコンポーネント
function MessageBox({
    children,
    className,
    ...props
}: React.ComponentPropsWithoutRef<'aside'>) {
    const isMessage = className?.includes('message');
    const isAlert = className?.includes('alert');

    if (!isMessage && !isAlert) {
        return (
            <aside className={className} {...props}>
                {children}
            </aside>
        );
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
    const embedType = props['data-embed-type'] as
        | 'github'
        | 'tweet'
        | 'youtube'
        | 'card';
    const embedUrl = props['data-embed-url'] as string;

    if (!embedType || !embedUrl) {
        return <div {...props} />;
    }

    return <EmbedCard type={embedType} url={embedUrl} />;
}

export function MarkdownViewer({
    content,
    onEditHeading,
    basePrefix = '/markdown',
}: MarkdownViewerProps) {
    // Zenn式構文を標準remark-directive構文に変換してから画像サイズを処理
    const processedContent = preprocessImageSize(
        preprocessColumnsSyntax(preprocessZennSyntax(content)),
    );

    return (
        <ReactMarkdown
            remarkPlugins={[
                remarkGfm,
                remarkBreaks,
                remarkDirective,
                remarkZennDirective,
                remarkChartDirective,
                remarkParamFieldDirective,
                remarkCardDirective,
                remarkCodeTabs,
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
                a: (props) => (
                    <MarkdownLink {...props} basePrefix={basePrefix} />
                ),
                columns: (props: any) => (
                    <MarkdownColumns {...props} basePrefix={basePrefix} />
                ),
                card: (props: any) => (
                    <MarkdownCard {...props} basePrefix={basePrefix} />
                ),
                div: (props: any) => {
                    // コードタブの場合
                    if (
                        props['data-code-tabs'] ||
                        props['data-code-tabs-error']
                    ) {
                        return <CodeTabsWrapper {...props} />;
                    }
                    // チャートの場合
                    if (props['data-chart-type']) {
                        return <ChartWrapper {...props} />;
                    }
                    // 埋め込みカードの場合
                    if (props['data-embed-type']) {
                        return <EmbedCardWrapper {...props} />;
                    }
                    if (props['data-param-field'] !== undefined) {
                        return (
                            <ParamField
                                header={props['data-param-header']}
                                body={props['data-param-body']}
                                type={props['data-param-type']}
                            >
                                {props.children}
                            </ParamField>
                        );
                    }
                    if (props['data-card-title'] || props['data-card-href']) {
                        return (
                            <MarkdownCard
                                title={props['data-card-title']}
                                href={props['data-card-href']}
                                icon={props['data-card-icon']}
                                cta={props['data-card-cta']}
                                arrow={props['data-card-arrow']}
                                basePrefix={basePrefix}
                            >
                                {props.children}
                            </MarkdownCard>
                        );
                    }
                    // Columnsの場合
                    if (
                        props['data-columns-config'] ||
                        props['data-columns-cards'] ||
                        props['data-columns-error']
                    ) {
                        return <ColumnsWrapper {...props} basePrefix={basePrefix} />;
                    }
                    // それ以外は通常のdiv
                    return <div {...props} />;
                },
                paramfield: (props: any) => (
                    <ParamField
                        header={props.header}
                        body={props.body}
                        type={props.type}
                    >
                        {props.children}
                    </ParamField>
                ),
                h1: (props) => (
                    <MarkdownHeading
                        level={1}
                        onEditHeading={onEditHeading}
                        {...props}
                    />
                ),
                h2: (props) => (
                    <MarkdownHeading
                        level={2}
                        onEditHeading={onEditHeading}
                        {...props}
                    />
                ),
                h3: (props) => (
                    <MarkdownHeading
                        level={3}
                        onEditHeading={onEditHeading}
                        {...props}
                    />
                ),
                h4: (props) => (
                    <MarkdownHeading
                        level={4}
                        onEditHeading={onEditHeading}
                        {...props}
                    />
                ),
                h5: (props) => (
                    <MarkdownHeading
                        level={5}
                        onEditHeading={onEditHeading}
                        {...props}
                    />
                ),
                h6: (props) => (
                    <MarkdownHeading
                        level={6}
                        onEditHeading={onEditHeading}
                        {...props}
                    />
                ),
            }}
        >
            {processedContent}
        </ReactMarkdown>
    );
}
