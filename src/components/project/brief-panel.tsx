'use client';

import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {ScrollArea} from '@/components/ui/scroll-area';
import {getCompletionPercentage} from '@/lib/brief-collection';
import {useBriefStore} from '@/stores/brief-store';
import {CustomerCard} from './customer-card';
import {IntentCard} from './intent-card';
import {LineItemList} from './line-item-list';
import {TimelineCard} from './timeline-card';
import {ProgressBar} from './progress-bar';
import {SubmitButton} from './submit-button';

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
        <div className="h-full min-h-0 flex flex-col">
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Project Brief</h2>
                    <Badge variant="secondary">{brief.status}</Badge>
                </div>
                {!hideProgressBar && (
                    <ProgressBar value={completion} className="mt-3" />
                )}
            </div>
            <Separator />

            <ScrollArea className="flex-1 min-h-0 p-4">
                <div className="space-y-4">
                    <CustomerCard customerInfo={brief.customerInfo} />
                    <IntentCard intent={brief.intent} />
                    <LineItemList lineItems={brief.lineItems} />
                    <TimelineCard timeline={brief.timeline} />
                </div>
            </ScrollArea>

            {/* <Separator />
      <div className="p-4">
        <SubmitButton disabled={completion < 100} />
      </div> */}
        </div>
    );
}
