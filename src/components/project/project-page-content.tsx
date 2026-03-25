'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {DualPanelLayout} from '@/components/layout/dual-panel-layout';
import {ProjectChatPanel} from '@/components/project/project-chat-panel';
import {BriefPanel} from '@/components/project/brief-panel';
import {BriefPanelEntrance} from '@/components/project/brief-panel-entrance';
import {Skeleton} from '@/components/ui/skeleton';

function ProjectContent() {
    const searchParams = useSearchParams();
    const fromHelp = searchParams.get('from') === 'help-center';
    const [pageFadeIn, setPageFadeIn] = useState(!fromHelp);

    useEffect(() => {
        if (fromHelp) {
            const id = requestAnimationFrame(() => setPageFadeIn(true));
            return () => cancelAnimationFrame(id);
        }
    }, [fromHelp]);

    const content = (
        <DualPanelLayout
            leftPanel={<ProjectChatPanel />}
            rightPanel={
                <BriefPanelEntrance className="h-full">
                    <BriefPanel />
                </BriefPanelEntrance>
            }
        />
    );

    if (fromHelp) {
        return (
            <div
                className={`h-[calc(100vh-5rem)] transition-opacity duration-300 ${
                    pageFadeIn ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {content}
            </div>
        );
    }

    return content;
}

function ProjectFallback() {
    return (
        <div className="flex h-[calc(100vh-5rem)] gap-4 p-4">
            <Skeleton className="flex-1 h-full rounded-lg" />
            <Skeleton className="flex-1 h-full rounded-lg" />
        </div>
    );
}

export function ProjectPageContent() {
    return (
        <Suspense fallback={<ProjectFallback />}>
            <ProjectContent />
        </Suspense>
    );
}
