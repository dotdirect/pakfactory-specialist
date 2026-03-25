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
}

export function DualPanelLayout({
    leftPanel,
    rightPanel,
    className,
}: DualPanelLayoutProps) {
    return (
        <div
            className={cn(
                'h-[calc(100vh-5rem)] w-full min-w-0 bg-background-alt',
                className,
            )}
        >
            <ResizablePanelGroup
                id="dual-panels"
                defaultLayout={{ left: 40, right: 60 }}
                orientation="horizontal"
                disabled={true}
                className="container-fluid px-16 mx-auto"
            >
                <ResizablePanel id="left" defaultSize={40} minSize={30}>
                    <div className="h-full overflow-hidden">{leftPanel}</div>
                </ResizablePanel>

                {/* <ResizableHandle withHandle /> */}

                <ResizablePanel id="right" defaultSize={60} minSize={30}>
                    <div className="h-full overflow-hidden">{rightPanel}</div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
