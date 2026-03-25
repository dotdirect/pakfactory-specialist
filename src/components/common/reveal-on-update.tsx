'use client';

import {cn} from '@/lib/utils/cn';

const REVEAL_TRANSITION_MS = 200;

interface RevealOnUpdateProps {
    /** When true, animate to opacity 1; when false, opacity 0. Parent controls when to reveal. */
    show: boolean;
    children: React.ReactNode;
    className?: string;
}

export function RevealOnUpdate({
    show,
    children,
    className,
}: RevealOnUpdateProps) {
    return (
        <span
            className={cn(
                'inline-block min-h-[1.25em] min-w-[2ch]',
                className,
            )}
            style={{
                opacity: show ? 1 : 0,
                transition: `opacity ${REVEAL_TRANSITION_MS}ms ease-out`,
            }}
            aria-hidden={!show}
        >
            {children}
        </span>
    );
}
