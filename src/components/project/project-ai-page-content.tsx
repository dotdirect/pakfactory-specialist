'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {DualPanelLayout} from '@/components/layout/dual-panel-layout';
import {BriefPanel} from '@/components/project/brief-panel';
import {ProgressBar} from '@/components/project/progress-bar';
import {ProjectAiChatPanel} from '@/components/project/project-ai-chat-panel';
import {Skeleton} from '@/components/ui/skeleton';
import {useBriefStore} from '@/stores/brief-store';

function ProjectAiRightPanel() {
    const completion = useBriefStore((state) =>
        state.getCompletionPercentage(),
    );
    return (
        <div className="flex h-full flex-col gap-4 px-10">
            <div className="shrink-0  pt-4 pb-0">
                <ProgressBar value={completion} />
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col ">
                <div className="relative flex flex-1 flex-col overflow-hidden rounded-t-xl border border-border/50 bg-card shadow-2xl">
                    <BriefPanel hideProgressBar />
                </div>
            </div>
        </div>
    );
}

function ProjectAiContent() {
    const searchParams = useSearchParams();
    const fromHelp = searchParams.get('from') === 'help';
    const [briefVisible, setBriefVisible] = useState(!fromHelp);

    useEffect(() => {
        if (fromHelp) {
            const timer = setTimeout(() => setBriefVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [fromHelp]);

    if (fromHelp) {
        return (
            <div className="flex h-[calc(100vh-3.5rem)]">
                <div className="flex-1 h-full overflow-hidden">
                    <ProjectAiChatPanel />
                </div>
                <div
                    className={`h-full overflow-hidden bg-muted/30 transition-all duration-500 ease-out ${
                        briefVisible
                            ? 'w-1/2 opacity-100 translate-y-0'
                            : 'w-0 opacity-0 translate-y-8'
                    }`}
                >
                    <div className="h-full min-w-[400px]">
                        <ProjectAiRightPanel />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DualPanelLayout
            leftPanel={<ProjectAiChatPanel />}
            rightPanel={<ProjectAiRightPanel />}
        />
    );
}

function ProjectAiFallback() {
    return (
        <div className="flex h-[calc(100vh-3.5rem)] gap-4 p-4">
            <Skeleton className="h-full flex-1 rounded-lg" />
            <Skeleton className="h-full flex-1 rounded-lg" />
        </div>
    );
}

export function ProjectAiPageContent() {
    return (
        <Suspense fallback={<ProjectAiFallback />}>
            <ProjectAiContent />
        </Suspense>
    );
}
