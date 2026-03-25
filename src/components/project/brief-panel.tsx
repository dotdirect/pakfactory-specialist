'use client';

import {Card, CardContent} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';
import {getCompletionPercentage} from '@/lib/brief-collection';
import {useBriefStore} from '@/stores/brief-store';
import {CustomerCard} from './customer-card';
import {IntentCard} from '@/components/project/intent-card';
import {LineItemList} from '@/components/project/line-item-list';
import {TimelineCard} from '@/components/project/timeline-card';
import {ProgressBar} from '@/components/project/progress-bar';
import {BriefPanelHeader} from '@/components/project/brief-panel-header';
import {BriefPanelSectionWrapper} from '@/components/project/brief-panel-section-wrapper';
import {BriefPanelProjectDetail} from '@/components/project/brief-panel-project-detail';
// import {SubmitButton} from './submit-button';
import Image from 'next/image';

interface BriefPanelProps {
    /** When true, do not render the progress bar (e.g. when it is shown above the panel). */
    hideProgressBar?: boolean;
}

export function BriefPanel({hideProgressBar = false}: BriefPanelProps) {
    const brief = useBriefStore((state) => state.brief);
    const completion = getCompletionPercentage(brief ?? null);

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
        <div className="h-full min-h-0 flex flex-col w-full">
            <div className="px-[clamp(1rem,2vw,2.5rem)] py-[clamp(1rem,2vw,3rem)] lg:px-10 xl:px-20 lg:py-8 xl:py-10">
                <BriefPanelHeader brief={brief} />

                {!hideProgressBar && (
                    <ProgressBar value={completion} className="mt-3 w-full" />
                )}
            </div>
            <Separator />

            <ScrollArea className="flex-1 min-h-0 x-[clamp(1rem,2vw,2.5rem)] py-[clamp(1rem,2vw,3rem)] lg:px-10 xl:px-20 lg:py-8 xl:py-10 ">
                <div className="space-y-4">
                    {/* <BriefPanelSectionWrapper title="Customer">
                        <CustomerCard customer={brief.customer} />
                    </BriefPanelSectionWrapper> */}

                    <BriefPanelSectionWrapper title="Project Detail">
                        <BriefPanelProjectDetail brief={brief} />
                    </BriefPanelSectionWrapper>

                    {/* <IntentCard intent={brief.intent} />
                    <LineItemList lineItems={brief.lineItems} />
                    <TimelineCard timeline={brief.timeline} /> */}
                </div>
            </ScrollArea>

            {/* <Separator />
      <div className="p-4">
        <SubmitButton disabled={completion < 100} />
      </div> */}
        </div>
    );
}
