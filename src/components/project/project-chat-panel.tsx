'use client';

import {useEffect, useState, useCallback} from 'react';
import {Card} from '@/components/ui/card';
import {MessageList} from '@/components/chat/message-list';
import {ChatInput} from '@/components/chat/chat-input';
import {BriefPanel} from '@/components/project/brief-panel';
import {ProjectMobileBriefBar} from '@/components/project/project-mobile-brief-bar';
import {Sheet, SheetContent, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {BotpressEngine} from '@/lib/engines/botpress-engine';
import {isIdentityPhaseComplete} from '@/lib/brief-collection';
import {useBriefStore} from '@/stores/brief-store';
import type {ConversationState} from '@/types/conversation';

export function ProjectChatPanel() {
    const [engine] = useState(() => new BotpressEngine());
    const [isBriefSheetOpen, setIsBriefSheetOpen] = useState(false);
    const [state, setState] = useState<ConversationState>({
        conversationId: null,
        status: 'idle',
        messages: [],
        isTyping: false,
    });

    const initializeBrief = useBriefStore((state) => state.initializeBrief);
    const handleBriefEvent = useBriefStore((state) => state.handleBriefEvent);
    const brief = useBriefStore((state) => state.brief);

    const preparedFor =
        brief?.customer?.firstName || brief?.customer?.lastName
            ? `${brief?.customer?.firstName ?? ''} ${brief?.customer?.lastName ?? ''}`.trim()
            : brief?.customer?.name?.trim() || 'you';
    const showBriefBar = isIdentityPhaseComplete(brief);

    useEffect(() => {
        const init = async () => {
            await engine.initialize({
                clientId: process.env.NEXT_PUBLIC_BOTPRESS_CLIENT_ID,
            });

            const conversationId = await engine.connect();
            initializeBrief(conversationId);
        };

        init();

        const unsubscribe = engine.subscribe(setState);
        const unsubscribeBrief = engine.onBriefEvent?.(handleBriefEvent);

        return () => {
            unsubscribe();
            unsubscribeBrief?.();
            engine.disconnect();
        };
    }, [engine, initializeBrief, handleBriefEvent]);

    const handleSend = useCallback(
        async (content: string) => {
            await engine.sendMessage(content);
        },
        [engine],
    );

    const handleChoiceSelect = useCallback(
        async (choice: {id: string; label: string; value: string}) => {
            await engine.sendChoice(choice);
        },
        [engine],
    );

    return (
        <Card className="flex h-full flex-col rounded-none border-0 bg-transparent">
            <MessageList
                messages={state.messages}
                isTyping={state.isTyping}
                onChoiceSelect={handleChoiceSelect}
            />
            <div className="shrink-0">
                {showBriefBar && (
                    <ProjectMobileBriefBar
                        preparedForLabel={`Brief is being prepared for ${preparedFor} ...`}
                        onOpen={() => setIsBriefSheetOpen(true)}
                    />
                )}
                <ChatInput
                    onSend={handleSend}
                    disabled={state.status !== 'active'}
                />
            </div>
            <Sheet open={isBriefSheetOpen} onOpenChange={setIsBriefSheetOpen}>
                <SheetContent
                    side="bottom"
                    className="h-full rounded-t-3xl border-x-0 border-b-0 p-0 md:h-auto"
                >
                    <SheetHeader className="border-b">
                        <SheetTitle>Project Brief</SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-hidden bg-background-alt">
                        <BriefPanel />
                    </div>
                </SheetContent>
            </Sheet>
        </Card>
    );
}
