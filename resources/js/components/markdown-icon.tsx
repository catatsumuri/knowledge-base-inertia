import { getLucideIcon } from '@/lib/lucide-icon-mapper';
import { useMemo } from 'react';

interface MarkdownIconProps {
    icon?: string;
    className?: string;
}

export function MarkdownIcon({ icon, className }: MarkdownIconProps) {
    const Icon = useMemo(() => getLucideIcon(icon), [icon]);
    if (!icon || !Icon) {
        return null;
    }

    return (
        <span className={className}>
            <Icon className="inline-block h-4 w-4 align-text-bottom text-foreground/60" />
        </span>
    );
}
