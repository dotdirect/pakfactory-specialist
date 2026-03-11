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
                'h-[calc(100vh-3.5rem)] bg-background-alt',
                className,
            )}
        >
            <ResizablePanelGroup
                orientation="horizontal"
                disabled={true}
                className="container-fluid px-16 mx-auto"
            >
                <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="h-full overflow-hidden">{leftPanel}</div>
                </ResizablePanel>

                {/* <ResizableHandle withHandle /> */}

                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="h-full overflow-hidden">{rightPanel}</div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
