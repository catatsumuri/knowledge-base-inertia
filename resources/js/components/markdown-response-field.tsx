import { ParamField } from '@/components/param-field';
import type { ReactNode } from 'react';

interface MarkdownResponseFieldProps {
    name?: string;
    type?: string;
    required?: string | boolean;
    default?: string | boolean;
    children?: ReactNode;
}

function resolveBoolean(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value !== 'false' && value !== '0';
    }

    return false;
}

export function MarkdownResponseField({
    name,
    type,
    required,
    default: defaultValue,
    children,
}: MarkdownResponseFieldProps) {
    const flags: string[] = [];

    if (resolveBoolean(required)) {
        flags.push('required');
    }

    if (defaultValue !== undefined) {
        flags.push(`default: ${defaultValue}`);
    }

    return (
        <ParamField header={name} type={type}>
            {flags.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {flags.map((flag) => (
                        <span
                            key={flag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-900"
                        >
                            {flag}
                        </span>
                    ))}
                </div>
            ) : null}
            {children}
        </ParamField>
    );
}
