import { ChartWrapper } from '@/components/chart/chart-wrapper';
import { CodeBlock } from '@/components/code-block';
import { CodeTabsWrapper } from '@/components/code-tabs';
import { ColumnsWrapper } from '@/components/columns-wrapper';
import { EmbedCard } from '@/components/embed-card';
import { MarkdownCard, MarkdownColumns } from '@/components/markdown-columns';
import { MarkdownHeading } from '@/components/markdown-heading';
import { MarkdownIcon } from '@/components/markdown-icon';
import { MarkdownImage } from '@/components/markdown-image';
import { MarkdownResponseField } from '@/components/markdown-response-field';
import { MarkdownTab, MarkdownTabs } from '@/components/markdown-tabs';
import { ParamField } from '@/components/param-field';
import { preprocessParamField } from '@/lib/preprocess-param-field';
import { remarkCardDirective } from '@/lib/remark-card-directive';
import { remarkChartDirective } from '@/lib/remark-chart-directive';
import { remarkCodeMeta } from '@/lib/remark-code-meta';
import { remarkCodeTabs } from '@/lib/remark-code-tabs';
import { preprocessColumnsSyntax } from '@/lib/remark-columns-syntax';
import { preprocessImageSize, remarkImageSize } from '@/lib/remark-image-size';
import { remarkLinkifyToCard } from '@/lib/remark-linkify-to-card';
import { remarkParamFieldDirective } from '@/lib/remark-param-field-directive';
import { remarkTabsDirective } from '@/lib/remark-tabs-directive';
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
    onEditHeading?: (payload: { level: number; text: string }) => void;
    basePrefix?: string;
}

// Markdown内のリンクをInertia Linkに変換するコンポーネント
type MarkdownLinkProps = React.ComponentPropsWithoutRef<'a'> & {
    basePrefix?: string;
};

function MarkdownLink({
    href,
    children,
    basePrefix = '/markdown',
    ...props
}: MarkdownLinkProps) {
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
        // @ts-expect-error - ReactMarkdown props vs Inertia Link props mismatch
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
interface EmbedCardWrapperProps extends React.ComponentPropsWithoutRef<'div'> {
    'data-embed-type'?: 'github' | 'tweet' | 'youtube' | 'card';
    'data-embed-url'?: string;
}

function EmbedCardWrapper({ ...props }: EmbedCardWrapperProps) {
    const embedType = props['data-embed-type'];
    const embedUrl = props['data-embed-url'];

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
        preprocessColumnsSyntax(
            preprocessZennSyntax(preprocessParamField(content)),
        ),
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
                remarkTabsDirective,
                remarkImageSize,
                remarkCodeMeta,
                remarkLinkifyToCard,
            ]}
            rehypePlugins={[rehypeRaw, rehypeSlug]}
            components={
                {
                    pre: ({ children }: { children?: React.ReactNode }) => (
                        <>{children}</>
                    ),
                    code: (props: Record<string, unknown>) => (
                        <CodeBlock {...props} />
                    ),
                    img: MarkdownImage,
                    aside: MessageBox,
                    a: (props: Record<string, unknown>) => (
                        <MarkdownLink {...props} basePrefix={basePrefix} />
                    ),
                    columns: (props: Record<string, unknown>) => (
                        <MarkdownColumns {...props} basePrefix={basePrefix} />
                    ),
                    card: (props: Record<string, unknown>) => (
                        <MarkdownCard {...props} basePrefix={basePrefix} />
                    ),
                    tabs: (props: Record<string, unknown>) => (
                        <MarkdownTabs {...props} />
                    ),
                    tab: (props: Record<string, unknown>) => (
                        <MarkdownTab {...props} />
                    ),
                    icon: (props: Record<string, unknown>) => (
                        <MarkdownIcon
                            icon={props.icon as string | undefined}
                            className={props.className as string | undefined}
                        />
                    ),
                    responsefield: (props: Record<string, unknown>) => (
                        <MarkdownResponseField
                            name={props.name as string | undefined}
                            type={props.type as string | undefined}
                            required={
                                props.required as string | boolean | undefined
                            }
                            default={
                                props.default as string | boolean | undefined
                            }
                        >
                            {props.children as React.ReactNode}
                        </MarkdownResponseField>
                    ),
                    div: (props: Record<string, unknown>) => {
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
                                    header={
                                        props['data-param-header'] as
                                            | string
                                            | undefined
                                    }
                                    body={
                                        props['data-param-body'] as
                                            | string
                                            | undefined
                                    }
                                    type={
                                        props['data-param-type'] as
                                            | string
                                            | undefined
                                    }
                                >
                                    {props.children as React.ReactNode}
                                </ParamField>
                            );
                        }
                        if (
                            props['data-card-title'] ||
                            props['data-card-href']
                        ) {
                            return (
                                <MarkdownCard
                                    title={
                                        props['data-card-title'] as
                                            | string
                                            | undefined
                                    }
                                    href={
                                        props['data-card-href'] as
                                            | string
                                            | undefined
                                    }
                                    icon={
                                        props['data-card-icon'] as
                                            | string
                                            | undefined
                                    }
                                    cta={
                                        props['data-card-cta'] as
                                            | string
                                            | undefined
                                    }
                                    arrow={
                                        props['data-card-arrow'] as
                                            | string
                                            | boolean
                                            | undefined
                                    }
                                    basePrefix={basePrefix}
                                >
                                    {props.children as React.ReactNode}
                                </MarkdownCard>
                            );
                        }
                        // Columnsの場合
                        if (
                            props['data-columns-config'] ||
                            props['data-columns-cards'] ||
                            props['data-columns-error']
                        ) {
                            return (
                                <ColumnsWrapper
                                    {...props}
                                    basePrefix={basePrefix}
                                />
                            );
                        }
                        // それ以外は通常のdiv
                        return <div {...props} />;
                    },
                    paramfield: (props: Record<string, unknown>) => (
                        <ParamField
                            header={props.header as string}
                            body={props.body as string}
                            type={props.type as string}
                        >
                            {props.children as React.ReactNode}
                        </ParamField>
                    ),
                    h1: (props: Record<string, unknown>) => (
                        <MarkdownHeading
                            level={1}
                            onEditHeading={onEditHeading}
                            {...props}
                        />
                    ),
                    h2: (props: Record<string, unknown>) => (
                        <MarkdownHeading
                            level={2}
                            onEditHeading={onEditHeading}
                            {...props}
                        />
                    ),
                    h3: (props: Record<string, unknown>) => (
                        <MarkdownHeading
                            level={3}
                            onEditHeading={onEditHeading}
                            {...props}
                        />
                    ),
                    h4: (props: Record<string, unknown>) => (
                        <MarkdownHeading
                            level={4}
                            onEditHeading={onEditHeading}
                            {...props}
                        />
                    ),
                    h5: (props: Record<string, unknown>) => (
                        <MarkdownHeading
                            level={5}
                            onEditHeading={onEditHeading}
                            {...props}
                        />
                    ),
                    h6: (props: Record<string, unknown>) => (
                        <MarkdownHeading
                            level={6}
                            onEditHeading={onEditHeading}
                            {...props}
                        />
                    ),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
            }
        >
            {processedContent}
        </ReactMarkdown>
    );
}
