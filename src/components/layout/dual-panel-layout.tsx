'use client';

import {useEffect, useState} from 'react';
import {ResizablePanelGroup, ResizablePanel} from '@/components/ui/resizable';
import {cn} from '@/lib/utils/cn';

interface DualPanelLayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    className?: string;
}

export function DualPanelLayout({
    leftPanel,
    rightPanel,
    className,
}: DualPanelLayoutProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const syncViewport = (event?: MediaQueryListEvent) => {
            setIsMobile(event?.matches ?? mediaQuery.matches);
        };

        syncViewport();
        mediaQuery.addEventListener('change', syncViewport);

        return () => {
            mediaQuery.removeEventListener('change', syncViewport);
        };
    }, []);

    return (
        <div
            className={cn(
                'h-[calc(100vh-5rem)] w-full min-w-0 bg-background-alt',
                className,
            )}
        >
            {isMobile ? (
                <div className="h-full w-full">
                    <div className="h-full overflow-hidden">{leftPanel}</div>
                </div>
            ) : (
                <ResizablePanelGroup
                    id="dual-panels"
                    defaultLayout={{left: 40, right: 60}}
                    orientation="horizontal"
                    disabled={true}
                    className="container-fluid mx-auto px-4 md:px-16"
                >
                    <ResizablePanel id="left" defaultSize={40} minSize={30}>
                        <div className="h-full overflow-hidden">
                            {leftPanel}
                        </div>
                    </ResizablePanel>

                    <ResizablePanel id="right" defaultSize={60} minSize={30}>
                        <div className="h-full overflow-hidden">
                            {rightPanel}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}
        </div>
    );
}
