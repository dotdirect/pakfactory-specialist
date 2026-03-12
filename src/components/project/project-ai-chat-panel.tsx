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
import {consumeProjectAiHelpHandoff} from '@/lib/project-ai-help-handoff';
import {useAuthStore} from '@/stores/auth-store';
import {useBriefStore} from '@/stores/brief-store';
import type {BriefEvent} from '@/types/brief-events';
import type {Message} from '@/types/conversation';
import type {ProjectAiChatMessage} from '@/types/project-ai-chat';
import type {ProjectAiHelpHandoff} from '@/types/project-ai-handoff';

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

function hasContactSignal(value: string | undefined) {
    if (!value) return false;
    return (
        /@/.test(value) ||
        /\b(name|email|contact|company|phone)\b/i.test(value)
    );
}

function buildGreetingMessage(
    chatId: string,
    fromHelp: boolean,
    isAuthenticated: boolean,
    userName: string | null,
): ProjectAiChatMessage {
    let text: string;
    if (fromHelp) {
        text =
            "Hi there! I'm Anthony, your packaging specialist. Let's build your quote together.";
    } else if (isAuthenticated && userName?.trim()) {
        text = `Hi ${userName.trim()}! I'm Anthony, your packaging specialist. Let's build your quote together.`;
    } else {
        text =
            "Hi there! I'm Anthony, your packaging specialist. Let's build your quote together. Before we start can I get your name and email.";
    }
    return {
        id: `${chatId}-greeting`,
        role: 'assistant',
        parts: [{ type: 'text', text, state: 'done' }],
    };
}

function buildHelpKickoffMessage(handoff: ProjectAiHelpHandoff) {
    const sharedContactContext =
        hasContactSignal(handoff.lastUserMessage) ||
        hasContactSignal(handoff.lastAssistantMessage);
    return sharedContactContext
        ? "I brought over the context from your help conversation so we can keep moving. It looks like you've already shared some contact details, so what project details should we confirm next for the quote?"
        : "I brought over the context from your help conversation so we can keep building your quote. Before we continue, could you share your name and email?";
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

interface ProjectAiChatPanelProps {
    fromHelp?: boolean;
    /** When true, the transcript grows and the window scrolls; MessageList uses scrollMode="window". */
    useWindowScroll?: boolean;
}

export function ProjectAiChatPanel({
    fromHelp = false,
    useWindowScroll = false,
}: ProjectAiChatPanelProps) {
    const [chatId] = useState(() => crypto.randomUUID());
    const [helpHandoff, setHelpHandoff] = useState<ProjectAiHelpHandoff | null>(
        null,
    );
    const [handoffReady, setHandoffReady] = useState(!fromHelp);
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const hasSentVisibleUserMessageRef = useRef(false);
    const didBootstrapFromHelpRef = useRef(false);
    const processedToolCallIdsRef = useRef<Set<string>>(new Set());

    const authStatus = useAuthStore((state) => state.status);
    const authUser = useAuthStore((state) => state.user);
    const initializeBrief = useBriefStore((state) => state.initializeBrief);
    const handleBriefEvent = useBriefStore((state) => state.handleBriefEvent);
    const setNotes = useBriefStore((state) => state.setNotes);
    const brief = useBriefStore((state) => state.brief);

    const isAuthenticated = authStatus === 'authenticated';
    const userName = authUser?.name ?? null;

    const initialMessagesRef = useRef<ProjectAiChatMessage[] | null>(null);
    if (initialMessagesRef.current === null) {
        initialMessagesRef.current = [
            buildGreetingMessage(chatId, fromHelp, isAuthenticated, userName),
        ];
    }

    const {messages, sendMessage, setMessages, status} =
        useChat<ProjectAiChatMessage>({
        id: chatId,
        messages: initialMessagesRef.current,
        transport: new DefaultChatTransport<ProjectAiChatMessage>({
            api: '/api/project-ai/chat',
        }),
    });

    useEffect(() => {
        if (!fromHelp) {
            setHelpHandoff(null);
            setHandoffReady(true);
            setIsBootstrapping(false);
            return;
        }
        setHelpHandoff(consumeProjectAiHelpHandoff());
        setHandoffReady(true);
    }, [fromHelp]);

    useEffect(() => {
        if (!fromHelp || !handoffReady || !helpHandoff) return;
        if (didBootstrapFromHelpRef.current) return;

        didBootstrapFromHelpRef.current = true;
        setIsBootstrapping(true);

        const kickoffId = `${chatId}-help-kickoff`;
        const kickoffMessage: ProjectAiChatMessage = {
            id: kickoffId,
            role: 'assistant',
            parts: [
                {
                    type: 'text',
                    text: buildHelpKickoffMessage(helpHandoff),
                    state: 'done',
                },
            ],
        };

        const timer = window.setTimeout(() => {
            setMessages((prev) => {
                if (prev.some((m) => m.id === kickoffId)) return prev;
                if (prev.some((m) => m.role === 'user')) return prev;
                return [...prev, kickoffMessage];
            });
            setIsBootstrapping(false);
        }, 500);

        return () => window.clearTimeout(timer);
    }, [chatId, fromHelp, handoffReady, helpHandoff, setMessages]);

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
            const hasSentVisibleUserMessage =
                hasSentVisibleUserMessageRef.current;
            hasSentVisibleUserMessageRef.current = true;
            const shouldIncludeHandoff =
                fromHelp && !hasSentVisibleUserMessage ? helpHandoff : undefined;

            await sendMessage(
                {text: content},
                {
                    body: {
                        currentPhase,
                        handoffContext: shouldIncludeHandoff,
                        missingFields,
                    },
                },
            );
        },
        [sendMessage, currentPhase, fromHelp, helpHandoff, missingFields],
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

    const isTyping =
        status === 'submitted' || status === 'streaming' || isBootstrapping;
    const inputDisabled = isTyping || !handoffReady;

    return (
        <Card
            className={
                useWindowScroll
                    ? 'flex min-h-0 flex-col rounded-none border-0 bg-transparent'
                    : 'flex h-full min-h-0 flex-col rounded-none border-0 bg-transparent'
            }
        >
            <MessageList
                messages={displayMessages}
                isTyping={isTyping}
                renderAfterMessage={renderAfterMessage}
                scrollMode={useWindowScroll ? 'window' : 'panel'}
            />
            <ChatInput onSend={handleSend} disabled={inputDisabled} />
        </Card>
    );
}
