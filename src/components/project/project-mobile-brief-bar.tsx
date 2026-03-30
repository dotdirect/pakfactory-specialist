'use client';

import {cn} from '@/lib/utils/cn';

interface ProjectMobileBriefBarProps {
    preparedForLabel: string;
    onOpen: () => void;
    className?: string;
}

export function ProjectMobileBriefBar({
    preparedForLabel,
    onOpen,
    className,
}: ProjectMobileBriefBarProps) {
    return (
        <div className={cn('px-4 pb-2 md:hidden', className)}>
            <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-muted/60 px-5 py-4 text-left shadow-sm transition-colors hover:bg-muted"
            >
                <span className="truncate pr-4 text-base text-foreground">
                    {preparedForLabel}
                </span>
                <span className="shrink-0 text-base font-semibold text-foreground">
                    View
                </span>
            </button>
        </div>
    );
}
