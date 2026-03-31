'use client';

import {Card, CardContent} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';
import {getCompletionPercentage} from '@/lib/brief-collection';
import {useBriefStore} from '@/stores/brief-store';
import {ProgressBar} from '@/components/project/progress-bar';
import {SubmitButton} from '@/components/project/submit-button';
import {BriefPanelHeader} from '@/components/project/brief-panel-header';
import {BriefPanelBody} from '@/components/project/brief-panel-body';
import {ProjectThumbnailRail} from '@/components/project/project-thumbnail-rail';

interface BriefPanelProps {
    /** When true, do not render the progress bar (e.g. when it is shown above the panel). */
    hideProgressBar?: boolean;
    selectedProjectIndex: number | null;
    onSelectProject: (index: number | null) => void;
    onEditProject: (index: number) => void;
}

export function BriefPanel({
    hideProgressBar = false,
    selectedProjectIndex,
    onSelectProject,
    onEditProject,
}: BriefPanelProps) {
    const brief = useBriefStore((state) => state.brief);
    const currentStep = useBriefStore((state) => state.currentStep);
    const advanceStep = useBriefStore((state) => state.advanceStep);
    const completion = getCompletionPercentage(brief ?? null);
    const isReviewStep = currentStep === 'review';

    if (!brief) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>
                            Start a conversation to begin building your project
                            brief.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative h-full min-h-0 flex flex-col w-full">
            {/* Mobile rail lives inside the sheet. Desktop rail is rendered outside by RightPanel. */}
            <ProjectThumbnailRail
                selectedProjectIndex={selectedProjectIndex}
                onSelectProject={onSelectProject}
                onEditProject={onEditProject}
                renderDesktop={false}
                renderMobile
            />

            <div className="h-full min-h-0 flex flex-col w-full">
                <div className="@container px-[clamp(1rem,3vw,3.5rem)] py-[clamp(1rem,2vw,2.5rem)]">
                    <BriefPanelHeader brief={brief} />

                    {!hideProgressBar && (
                        <ProgressBar value={completion} className="mt-3 w-full" />
                    )}
                </div>
                <Separator />

                <ScrollArea className="flex-1 min-h-0 px-[clamp(1rem,3vw,3.5rem)] py-[clamp(1rem,2vw,2.5rem)]">
                    <BriefPanelBody selectedProjectIndex={selectedProjectIndex} />
                </ScrollArea>

                {isReviewStep && (
                    <>
                        <Separator />
                        <div className="shrink-0 px-[clamp(1rem,3vw,3.5rem)] py-4">
                            <SubmitButton onClick={() => advanceStep('submit')} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
