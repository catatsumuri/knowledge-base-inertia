/* eslint-disable react-hooks/static-components */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLucideIcon } from '@/lib/lucide-icon-mapper';
import { Link } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

interface ColumnsCardProps {
    title?: string;
    href?: string;
    icon?: string;
    content?: React.ReactNode;
    cta?: string;
    arrow?: boolean;
    basePrefix?: string;
}

/**
 * Columnsディレクティブ内の個別カードコンポーネント
 */
export function ColumnsCard({
    title,
    href,
    icon,
    content,
    cta,
    arrow = false,
    basePrefix = '/markdown',
}: ColumnsCardProps) {
    // リンクの正規化（markdown-viewer.tsxのMarkdownLinkと同じロジック）
    const normalizedHref = normalizeHref(href, basePrefix);
    const isExternalLink =
        normalizedHref && normalizedHref.match(/^https?:\/\//);

    // アイコンコンポーネントの取得（動的アイコン選択のため、useMemoで最適化）

    const IconComponent = useMemo(() => {
        if (!icon) return null;
        return getLucideIcon(icon);
    }, [icon]);

    // カードの内容
    const cardContent = (
        <Card className="group h-full cursor-pointer border transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
                <div className="flex items-start gap-3">
                    {icon && IconComponent ? (
                        <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                            {IconComponent && (
                                <IconComponent className="h-5 w-5 text-primary" />
                            )}
                        </div>
                    ) : icon && !IconComponent ? (
                        // アイコンが指定されているが見つからない場合
                        <div className="flex-shrink-0 rounded-lg bg-destructive/10 p-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                        </div>
                    ) : null}
                    <CardTitle className="text-base leading-tight">
                        {title || 'タイトルなし'}
                    </CardTitle>
                </div>
            </CardHeader>
            {content !== undefined && content !== null && (
                <CardContent>
                    {typeof content === 'string' ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {content}
                        </p>
                    ) : (
                        <div className="text-sm leading-relaxed text-muted-foreground">
                            {content}
                        </div>
                    )}
                </CardContent>
            )}
            {cta && (
                <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <span>{cta}</span>
                        {arrow ? <span aria-hidden="true">&rarr;</span> : null}
                    </div>
                </CardContent>
            )}
        </Card>
    );

    // リンクがある場合はLinkでラップ
    if (normalizedHref) {
        if (isExternalLink) {
            return (
                <a
                    href={normalizedHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block no-underline"
                >
                    {cardContent}
                </a>
            );
        }

        return (
            <Link href={normalizedHref} className="block no-underline">
                {cardContent}
            </Link>
        );
    }

    // リンクがない場合はそのまま表示
    return cardContent;
}

/**
 * リンクの正規化（markdown-viewer.tsxのMarkdownLinkと同じロジック）
 */
function normalizeHref(
    href: string | undefined,
    basePrefix: string,
): string | undefined {
    if (!href) {
        return undefined;
    }

    // 外部リンクまたは絶対パスの場合はそのまま
    if (href.match(/^https?:\/\//) || href.startsWith('/')) {
        return href;
    }

    // 相対パスの場合はbasePrefixを付与
    return `${basePrefix}/${href}`;
}
