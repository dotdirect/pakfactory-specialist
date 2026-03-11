'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport, isTextUIPart} from 'ai';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {ChatInput} from '@/components/chat/chat-input';
import {MessageList} from '@/components/chat/message-list';
import {
    getCurrentPhase,
    getMissingFieldsInPhase,
} from '@/lib/brief-collection';
import {useBriefStore} from '@/stores/brief-store';
import type {BriefEvent} from '@/types/brief-events';
import type {Message} from '@/types/conversation';
import type {ProjectAiChatMessage} from '@/types/project-ai-chat';

type SyncProjectBriefToolPart = Extract<
    ProjectAiChatMessage['parts'][number],
    {type: 'tool-sync_project_brief'; state: 'output-available'}
>;

function getMessageText(message: ProjectAiChatMessage) {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('');
}

function toDisplayMessage(message: ProjectAiChatMessage): Message {
    return {
        id: message.id,
        role: message.role,
        content: getMessageText(message),
        createdAt: new Date(),
    };
}

function isSyncProjectBriefToolPart(
    part: ProjectAiChatMessage['parts'][number],
): part is SyncProjectBriefToolPart {
    return (
        part.type === 'tool-sync_project_brief' &&
        part.state === 'output-available'
    );
}

function shouldApplyEvent(
    event: BriefEvent,
    message: ReturnType<typeof useBriefStore.getState>['brief'],
) {
    switch (event.action) {
        case 'brief.identity.confirmed': {
            const current = message?.customerInfo;
            if (!current) return true;
            const keys: (keyof typeof event.data)[] = [
                'name',
                'email',
                'company',
                'phone',
                'firstName',
                'lastName',
                'industry',
                'annualBudget',
            ];
            return keys.some(
                (key) => event.data[key] != null && current[key] !== event.data[key],
            );
        }
        case 'brief.intent.confirmed':
            return (
                message?.intent?.type !== event.data.type ||
                message?.intent?.entryChannel !== event.data.entryChannel
            );
        case 'brief.product.added':
            return !message?.lineItems.some(
                (item) =>
                    item.productName === event.data.productName &&
                    item.category === event.data.category &&
                    item.quantity === event.data.quantity,
            );
        case 'brief.timeline.confirmed':
            return (
                message?.timeline?.urgency !== event.data.urgency ||
                message?.timeline?.deadline !== event.data.deadline
            );
        case 'brief.project.context_confirmed': {
            const current = message?.project;
            const data = event.data as Record<string, unknown>;
            if (!current) return true;
            return Object.keys(data).some(
                (key) =>
                    data[key] != null &&
                    (current as Record<string, unknown>)[key] !== data[key],
            );
        }
        default:
            return true;
    }
}

export function ProjectAiChatPanel() {
    const [chatId] = useState(() => crypto.randomUUID());
    const processedToolCallIdsRef = useRef<Set<string>>(new Set());

    const initializeBrief = useBriefStore((state) => state.initializeBrief);
    const handleBriefEvent = useBriefStore((state) => state.handleBriefEvent);
    const setNotes = useBriefStore((state) => state.setNotes);
    const brief = useBriefStore((state) => state.brief);

    const greetingMessage = useMemo<ProjectAiChatMessage>(
        () => ({
            id: `${chatId}-greeting`,
            role: 'assistant',
            parts: [
                {
                    type: 'text',
                    text: "Hi there! I'm Anthony, your packaging specialist. Let's build your quote together.",
                    state: 'done',
                },
            ],
        }),
        [chatId],
    );

    const {messages, sendMessage, status} = useChat<ProjectAiChatMessage>({
        id: chatId,
        messages: [greetingMessage],
        transport: new DefaultChatTransport<ProjectAiChatMessage>({
            api: '/api/project-ai/chat',
        }),
    });

    useEffect(() => {
        if (brief?.conversationId !== chatId) {
            initializeBrief(chatId);
        }
    }, [brief?.conversationId, chatId, initializeBrief]);

    // SCALE: shouldApplyEvent must cover any new event type; add cases when new brief events are introduced.
    useEffect(() => {
        for (const message of messages) {
            if (message.role !== 'assistant') {
                continue;
            }

            for (const part of message.parts ?? []) {
                if (!isSyncProjectBriefToolPart(part)) {
                    continue;
                }

                if (processedToolCallIdsRef.current.has(part.toolCallId)) {
                    continue;
                }

                const currentBrief = useBriefStore.getState().brief;
                for (const event of part.output.events) {
                    if (shouldApplyEvent(event, currentBrief)) {
                        handleBriefEvent(event);
                    }
                }

                if (
                    part.output.notes &&
                    currentBrief?.notes !== part.output.notes
                ) {
                    setNotes(part.output.notes);
                }

                processedToolCallIdsRef.current.add(part.toolCallId);
            }
        }
    }, [handleBriefEvent, messages, setNotes]);

    const currentPhase = getCurrentPhase(brief ?? null);
    const missingFields = getMissingFieldsInPhase(brief ?? null, currentPhase);

    const handleSend = useCallback(
        async (content: string) => {
            await sendMessage(
                {text: content},
                {
                    body: {
                        currentPhase,
                        missingFields,
                    },
                },
            );
        },
        [sendMessage, currentPhase, missingFields],
    );

    const helpMessagesById = useMemo(
        () => new Map(messages.map((message) => [message.id, message])),
        [messages],
    );

    const displayMessages = useMemo(
        () =>
            messages
                .filter((message) => message.role !== 'system')
                .map(toDisplayMessage),
        [messages],
    );

    const renderAfterMessage = useCallback(
        (message: Message) => {
            const sourceMessage = helpMessagesById.get(message.id);
            if (!sourceMessage || sourceMessage.role !== 'assistant') {
                return null;
            }

            const syncParts = sourceMessage.parts?.filter(
                isSyncProjectBriefToolPart,
            );

            if (!syncParts?.length) {
                return null;
            }

            return (
                <div className="flex flex-col gap-3 pl-11">
                    {syncParts.map((part) => (
                        <Card
                            key={part.toolCallId}
                            className="gap-4 bg-muted/40 py-0 shadow-none"
                        >
                            <CardHeader className="px-4 pt-4">
                                <CardTitle className="text-sm">
                                    {part.output.title}
                                </CardTitle>
                                <CardDescription>
                                    {part.output.summary}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2 px-4 pb-4">
                                {part.output.appliedUpdates.map((update) => (
                                    <p
                                        key={update}
                                        className="text-sm text-muted-foreground"
                                    >
                                        {update}
                                    </p>
                                ))}
                                {part.output.nextQuestion ? (
                                    <p className="text-sm font-medium">
                                        {part.output.nextQuestion}
                                    </p>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        },
        [helpMessagesById],
    );

    const isTyping = status === 'submitted' || status === 'streaming';

    return (
        <Card className="flex h-full min-h-0 flex-col rounded-none border-0 bg-transparent">
            <MessageList
                messages={displayMessages}
                isTyping={isTyping}
                renderAfterMessage={renderAfterMessage}
            />
            <ChatInput onSend={handleSend} disabled={isTyping} />
        </Card>
    );
}
