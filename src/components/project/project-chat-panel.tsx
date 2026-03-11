'use client';

import {useEffect, useState, useCallback} from 'react';
import {Card} from '@/components/ui/card';
import {MessageList} from '@/components/chat/message-list';
import {ChatInput} from '@/components/chat/chat-input';
import {BotpressEngine} from '@/lib/engines/botpress-engine';
import {useBriefStore} from '@/stores/brief-store';
import type {ConversationState} from '@/types/conversation';

export function ProjectChatPanel() {
    const [engine] = useState(() => new BotpressEngine());
    const [state, setState] = useState<ConversationState>({
        conversationId: null,
        status: 'idle',
        messages: [],
        isTyping: false,
    });

    const initializeBrief = useBriefStore((state) => state.initializeBrief);
    const handleBriefEvent = useBriefStore((state) => state.handleBriefEvent);

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
        <Card className="flex flex-col h-full border-0 rounded-none bg-transparent">
            <MessageList
                messages={state.messages}
                isTyping={state.isTyping}
                onChoiceSelect={handleChoiceSelect}
            />
            <ChatInput
                onSend={handleSend}
                disabled={state.status !== 'active'}
            />
        </Card>
    );
}
