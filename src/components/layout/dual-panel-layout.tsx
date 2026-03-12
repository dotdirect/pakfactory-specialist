'use client';

import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable';
import {cn} from '@/lib/utils/cn';

interface DualPanelLayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    className?: string;
    /** When true, the left column grows with content and the window scrolls; the right column stays in view and scrolls internally. */
    useWindowScroll?: boolean;
}

export function DualPanelLayout({
    leftPanel,
    rightPanel,
    className,
    useWindowScroll = false,
}: DualPanelLayoutProps) {
    return (
        <div
            className={cn(
                'bg-background-alt',
                useWindowScroll
                    ? 'min-h-[calc(100vh-3.5rem)]'
                    : 'h-[calc(100vh-3.5rem)]',
                className,
            )}
        >
            <ResizablePanelGroup
                orientation="horizontal"
                disabled={true}
                className={cn(
                    'container-fluid px-16 mx-auto',
                    useWindowScroll && 'h-auto min-h-[calc(100vh-3.5rem)] items-start',
                )}
            >
                <ResizablePanel
                    defaultSize={40}
                    minSize={30}
                    className={cn(useWindowScroll && 'h-auto')}
                >
                    <div
                        className={cn(
                            useWindowScroll
                                ? 'min-h-[calc(100vh-3.5rem)]'
                                : 'h-full overflow-hidden',
                        )}
                    >
                        {leftPanel}
                    </div>
                </ResizablePanel>

                {/* <ResizableHandle withHandle /> */}

                <ResizablePanel defaultSize={60} minSize={30}>
                    <div
                        className={cn(
                            'overflow-hidden',
                            useWindowScroll
                                ? 'h-[calc(100vh-3.5rem)] sticky top-14 shrink-0'
                                : 'h-full',
                        )}
                    >
                        {rightPanel}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
