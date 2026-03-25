'use client';

import * as React from 'react';
import {cn} from '@/lib/utils/cn';

export type AIGlowTheme = 'cosmic' | 'pink-blue' | 'google';

export interface AIGlowProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 'hover' = glow on hover; 'state' = controlled by isActive */
    trigger?: 'hover' | 'state';
    /** For trigger="state": when true, glow is visible */
    isActive?: boolean;
    /** Pill shape (rounded-full) */
    pill?: boolean;
    /** Color theme */
    theme?: AIGlowTheme;
    /** Animation duration (e.g. "3s") */
    speed?: string;
    /** Border radius (e.g. "12px") */
    radius?: string;
    /** Blur amount (e.g. "16px") */
    blur?: string;
    children: React.ReactNode;
}

/**
 * AI Glow Effect — animated rotating gradient border for AI-powered features.
 *
 * Children must have a solid background (e.g. bg-background, bg-card) — the beam
 * sweeps behind, so transparent backgrounds will show the gradient through.
 */
export function AIGlow({
    trigger = 'hover',
    isActive = false,
    pill = false,
    theme = 'cosmic',
    speed,
    radius,
    blur,
    className,
    children,
    style,
    ...rest
}: AIGlowProps) {
    const isStateTrigger = trigger === 'state';

    return (
        <div
            className={cn(
                'w-full',
                'ai-glow',
                `ai-glow--${trigger}`,
                `ai-glow--${theme}`,
                pill && 'ai-glow--pill',
                isStateTrigger && isActive && 'ai-glow--active',
                className,
            )}
            style={{
                ...style,
                ...(speed && ({'--glow-speed': speed} as React.CSSProperties)),
                ...(radius &&
                    ({'--glow-radius': radius} as React.CSSProperties)),
                ...(blur && ({'--glow-blur': blur} as React.CSSProperties)),
            }}
            {...rest}
        >
            <div className="ai-glow__blur" aria-hidden />
            <div className="ai-glow__border" aria-hidden />
            <div className="ai-glow__content z-10">{children}</div>
        </div>
    );
}
