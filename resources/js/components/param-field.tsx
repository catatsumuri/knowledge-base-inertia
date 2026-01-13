import { Link2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface ParamFieldProps {
    header?: string;
    body?: string;
    type?: string;
    children?: ReactNode;
}

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function ParamField({ header, body, type, children }: ParamFieldProps) {
    const title = header || body || '';
    const id = title ? `param-${toSlug(title)}` : undefined;

    return (
        <div
            className="not-prose border-t border-slate-200 py-4 last:border-b dark:border-slate-800"
            id={id}
        >
            <div className="flex gap-3">
                <a
                    href={id ? `#${id}` : undefined}
                    className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-800 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:text-slate-300"
                    aria-label={title ? `${title}のアンカー` : 'アンカー'}
                >
                    <Link2 className="h-4 w-4" />
                </a>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-sky-700 dark:text-sky-300">
                            {title || 'unknown'}
                        </span>
                        {type ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                {type}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
