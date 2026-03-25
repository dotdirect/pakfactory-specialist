'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface BriefPanelEntranceProps {
  children: React.ReactNode;
  /** Delay in ms before starting the entrance animation. Default 200. */
  delayMs?: number;
  /** Duration of the transition in ms. Default 500. */
  durationMs?: number;
  className?: string;
}

export function BriefPanelEntrance({
  children,
  delayMs = 200,
  durationMs = 500,
  className,
}: BriefPanelEntranceProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      className={cn(
        'transition-all ease-out',
        entered
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6',
        className,
      )}
      style={{ transitionDuration: `${durationMs}ms` }}
    >
      {children}
    </div>
  );
}
