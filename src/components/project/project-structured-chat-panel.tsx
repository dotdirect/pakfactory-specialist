'use client';

import {useCallback, useState} from 'react';
import {CheckCircle2} from 'lucide-react';
import {MessageList} from '@/components/chat/message-list';
import {BriefPanel} from '@/components/project/brief-panel';
import {ProgressBar} from '@/components/project/progress-bar';
import {ProjectAiChatInput} from '@/components/project/project-ai-chat-input';
import {ProjectMobileBriefBar} from '@/components/project/project-mobile-brief-bar';
import {ProductRecommendationCards} from '@/components/project/product-recommendation-cards';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {useStructuredStepChat} from '@/hooks/use-structured-step-chat';
import {STEP_CONFIGS} from '@/lib/steps/step-configs';
import {useBriefStore} from '@/stores/brief-store';
import type {FlowId} from '@/lib/steps/types';
import type {Message} from '@/types/conversation';

interface ProjectStructuredChatPanelProps {
    flowId: FlowId;
}

export function ProjectStructuredChatPanel({
    flowId,
}: ProjectStructuredChatPanelProps) {
    const {
        messages,
        handleSend,
        isTyping,
        currentStep,
        isSubmitted,
        recommendationData,
        handleRecommendationConfirm,
        handleRecommendationSkip,
        handleRequestMoreRecommendations,
    } = useStructuredStepChat(flowId);
    const [isBriefSheetOpen, setIsBriefSheetOpen] = useState(false);
    const brief = useBriefStore((state) => state.brief);
    const completion = useBriefStore((state) =>
        state.getCompletionPercentage(),
    );
    const stepLabel = STEP_CONFIGS[currentStep].label;

    const showBriefBar = currentStep !== 'profile';
    const preparedFor =
        brief?.customer?.firstName || brief?.customer?.lastName
            ? `${brief?.customer?.firstName ?? ''} ${brief?.customer?.lastName ?? ''}`.trim()
            : brief?.customer?.name?.trim() || 'you';

    // Show product cards after the last message when recommendation data is available.
    // The tool response may have no text (filtered from log), so we attach to the last visible message.
    const renderAfterMessage = useCallback(
        (message: Message) => {
            if (!recommendationData) return null;
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || message.id !== lastMessage.id) return null;
            return (
                <ProductRecommendationCards
                    products={recommendationData.products}
                    onConfirm={handleRecommendationConfirm}
                    onSkip={handleRecommendationSkip}
                    onRequestMore={handleRequestMoreRecommendations}
                />
            );
        },
        [
            messages,
            recommendationData,
            handleRecommendationConfirm,
            handleRecommendationSkip,
            handleRequestMoreRecommendations,
        ],
    );

    // messages always contains at least the step opening message (set as initialMessages in useChat)

    if (isSubmitted) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                <CheckCircle2 className="size-12 text-green-500" />
                <h2 className="text-xl font-semibold">Brief submitted!</h2>
                <p className="text-muted-foreground text-sm">
                    Thanks! Your packaging brief has been received. Our team
                    will be in touch shortly.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col py-2">
            <MessageList messages={messages} isTyping={isTyping} renderAfterMessage={renderAfterMessage} />

            <div className="shrink-0">
                {showBriefBar && (
                    <ProjectMobileBriefBar
                        preparedForLabel={`Brief is being prepared for ${preparedFor} ...`}
                        onOpen={() => setIsBriefSheetOpen(true)}
                    />
                )}
                <ProjectAiChatInput onSend={handleSend} disabled={isTyping} />
            </div>
            <Sheet open={isBriefSheetOpen} onOpenChange={setIsBriefSheetOpen}>
                <SheetContent
                    side="bottom"
                    className="h-[85vh] rounded-t-3xl border-x-0 border-b-0 p-0 md:h-auto bg-background-alt"
                >
                    <SheetHeader className="border-b">
                        <SheetTitle>Project Brief</SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-background-alt p-4">
                        <ProgressBar
                            value={completion}
                            label={stepLabel}
                            className="mb-4"
                        />
                        <BriefPanel hideProgressBar />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
