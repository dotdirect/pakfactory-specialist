'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport, isTextUIPart} from 'ai';
import {toast} from 'sonner';
import {ProjectAiChatInput} from '@/components/project/project-ai-chat-input';
import {MessageList} from '@/components/chat/message-list';
import {BriefPanel} from '@/components/project/brief-panel';
import {ProjectMobileBriefBar} from '@/components/project/project-mobile-brief-bar';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    getCurrentPhase,
    getMissingFieldsInPhase,
    isIdentityPhaseComplete,
} from '@/lib/brief-collection';
import {eventHasNetChange} from '@/lib/brief-sync-noop';
import {shouldExpectSyncForMessage} from '@/lib/brief-sync-heuristics';
import {useBriefStore} from '@/stores/brief-store';
import type {BriefEvent} from '@/types/brief-events';
import type {Message} from '@/types/conversation';
import type {ProjectAiChatMessage} from '@/types/project-ai-chat';

const SYNC_BRIEF_TOOL_TYPE = 'tool-sync_project_brief';

/** Recognizes sync_project_brief tool parts: typed part or toolCallId + output.events; requires state === 'output-available' when state is present. */
function partHasBriefEvents(
    part: ProjectAiChatMessage['parts'][number],
): boolean {
    const p = part as Record<string, unknown>;
    if (typeof p.toolCallId !== 'string') return false;
    const state = p.state as string | undefined;
    if (state != null && state !== 'output-available') return false;
    const payload = (p.output ?? p.result) as {events?: unknown[]} | undefined;
    const events = payload?.events;
    return Array.isArray(events) && events.length > 0;
}

/** Prefer typed tool part so we only process sync_project_brief, not other tools. */
function isSyncBriefPart(part: ProjectAiChatMessage['parts'][number]): boolean {
    const p = part as Record<string, unknown>;
    return (
        p.type === SYNC_BRIEF_TOOL_TYPE || (partHasBriefEvents(part) && !p.type)
    );
}

function getBriefOutputFromPart(part: ProjectAiChatMessage['parts'][number]): {
    toolCallId: string;
    output: {
        events: BriefEvent[];
        title?: string;
        summary?: string;
        notes?: string;
    };
} | null {
    if (!isSyncBriefPart(part) || !partHasBriefEvents(part)) return null;
    const p = part as Record<string, unknown>;
    const payload = (p.output ?? p.result) as {
        events: BriefEvent[];
        title?: string;
        summary?: string;
        notes?: string;
    };
    return {
        toolCallId: p.toolCallId as string,
        output: payload,
    };
}

function getMessageText(message: ProjectAiChatMessage) {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('');
}

function lastAssistantMessageHasSync(
    messages: ProjectAiChatMessage[],
): boolean {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== 'assistant') continue;
        for (const part of msg.parts ?? []) {
            if (isSyncBriefPart(part) && partHasBriefEvents(part)) return true;
        }
        return false;
    }
    return false;
}

function toDisplayMessage(message: ProjectAiChatMessage): Message {
    return {
        id: message.id,
        role: message.role,
        content: getMessageText(message),
        createdAt: new Date(),
    };
}

const UPDATE_FOLLOW_UP =
    'Please update the brief with the information I provided.';
const INTERNAL_SUMMARY_LEAK_PATTERN = /i need a value for [`"]summary[`"]/i;
const EMAIL_ASK_PATTERN = /\bemail\b/i;
const NAME_ASK_PATTERN = /\bname\b/i;
const INDUSTRY_ASK_PATTERN = /\bindustry\b/i;
const PRODUCT_ITEM_ASK_PATTERN = /product item|what product|packaging/i;

type UploadSyncOutput = {
    title?: string;
    summary?: string;
    changedFields?: string[];
    events: BriefEvent[];
    notes?: string;
};

type ProjectUploadResponse = {
    fileUrl: string;
    fileName: string;
    sync: UploadSyncOutput;
};

export function shouldHideInternalSyncChatter(
    message: ProjectAiChatMessage,
): boolean {
    const text = getMessageText(message).trim();
    if (!text) return false;
    if (message.role === 'user' && text === UPDATE_FOLLOW_UP) return true;
    if (message.role === 'assistant' && INTERNAL_SUMMARY_LEAK_PATTERN.test(text))
        return true;
    return false;
}

function fieldAskedByAssistant(field: string, assistantText: string): boolean {
    switch (field) {
        case 'customer.email':
            return EMAIL_ASK_PATTERN.test(assistantText);
        case 'customer.firstName':
        case 'customer.lastName':
            return NAME_ASK_PATTERN.test(assistantText);
        case 'customer.industry':
            return INDUSTRY_ASK_PATTERN.test(assistantText);
        case 'project.productItem':
            return PRODUCT_ITEM_ASK_PATTERN.test(assistantText);
        default:
            return false;
    }
}

export function shouldSkipFallbackForRepeatedAsk(
    assistantMessage: ProjectAiChatMessage,
    missingFields: string[],
): boolean {
    if (assistantMessage.role !== 'assistant') return false;
    const text = getMessageText(assistantMessage).toLowerCase();
    if (!text) return false;
    const requiredIdentity = ['customer.firstName', 'customer.lastName', 'customer.email'];
    const relevantFields = missingFields.filter((field) => requiredIdentity.includes(field) || field === 'customer.industry' || field === 'project.productItem');
    if (relevantFields.length === 0) return false;
    return relevantFields.some((field) => fieldAskedByAssistant(field, text));
}

export function isAssistantResponseToHiddenFallback(
    messages: ProjectAiChatMessage[],
    index: number,
): boolean {
    const message = messages[index];
    if (!message || message.role !== 'assistant') return false;
    const previous = messages[index - 1];
    if (!previous || previous.role !== 'user') return false;
    return getMessageText(previous).trim() === UPDATE_FOLLOW_UP;
}

export function ProjectAiChatPanel() {
    const [chatId] = useState(() => crypto.randomUUID());
    const [isBriefSheetOpen, setIsBriefSheetOpen] = useState(false);
    const processedToolCallIdsRef = useRef<Set<string>>(new Set());
    /** Set when user sends a message that should complete the only missing field (e.g. email); cleared when we get a sync in the response or when we send the follow-up. */
    const expectedSyncRef = useRef(false);

    const initializeBrief = useBriefStore((state) => state.initializeBrief);
    const handleBriefEvent = useBriefStore((state) => state.handleBriefEvent);
    const setNotes = useBriefStore((state) => state.setNotes);
    const brief = useBriefStore((state) => state.brief);

    const [showNameQuestion] = useState(() => {
        const existingBrief = useBriefStore.getState().brief;
        return (
            !existingBrief?.customer?.name &&
            !existingBrief?.customer?.firstName
        );
    });
    const preparedFor =
        brief?.customer?.firstName || brief?.customer?.lastName
            ? `${brief?.customer?.firstName ?? ''} ${brief?.customer?.lastName ?? ''}`.trim()
            : brief?.customer?.name?.trim() || 'you';
    const showBriefBar = isIdentityPhaseComplete(brief);

    const greetingMessage = useMemo<ProjectAiChatMessage>(
        () => ({
            id: `${chatId}-greeting`,
            role: 'assistant',
            parts: [
                {
                    type: 'text',
                    text: showNameQuestion
                        ? "Hi there! I'm Anthony, your packaging specialist. Let's build your quote together.\n\nTo get started, what's your name?"
                        : "Hi there! I'm Anthony, your packaging specialist. Let's build your quote together.",
                    state: 'done',
                },
            ],
        }),
        [chatId, showNameQuestion],
    );

    const {messages, sendMessage, status} = useChat<ProjectAiChatMessage>({
        id: chatId,
        messages: [greetingMessage],
        transport: new DefaultChatTransport<ProjectAiChatMessage>({
            api: '/api/project-ai/chat',
        }),
    });

    // Ensure brief exists for this chat, then apply sync_project_brief tool-result parts (state === 'output-available', output.events or result.events).
    const applySyncOutput = useCallback(
        (output: UploadSyncOutput) => {
            const briefBefore = useBriefStore.getState().brief;
            const changedEvents = output.events.filter((event) =>
                eventHasNetChange(event, briefBefore),
            );
            for (const event of changedEvents) {
                handleBriefEvent(event);
            }

            const briefNow = useBriefStore.getState().brief;
            const notesChanged = Boolean(
                output.notes && briefNow?.notes !== output.notes,
            );
            if (output.notes && briefNow?.notes !== output.notes) {
                setNotes(output.notes);
            }

            const hasNetChange = changedEvents.length > 0 || notesChanged;
            if (!hasNetChange) return;

            const description =
                output.changedFields?.length && output.summary
                    ? `${output.summary} (${output.changedFields.length} updates)`
                    : output.summary;
            toast.success(output.title ?? 'Project brief updated', {
                description,
            });
        },
        [handleBriefEvent, setNotes],
    );

    useEffect(() => {
        const state = useBriefStore.getState();
        if (!state.brief || state.brief.conversationId !== chatId) {
            state.initializeBrief(chatId);
        }

        for (const message of messages) {
            if (message.role !== 'assistant') continue;

            for (const part of message.parts ?? []) {
                const parsed = getBriefOutputFromPart(part);
                if (
                    !parsed ||
                    processedToolCallIdsRef.current.has(parsed.toolCallId)
                )
                    continue;

                const {toolCallId, output} = parsed;
                applySyncOutput(output);

                processedToolCallIdsRef.current.add(toolCallId);
            }
        }
    }, [applySyncOutput, chatId, messages]);

    const currentPhase = getCurrentPhase(brief ?? null);
    const missingFields = getMissingFieldsInPhase(brief ?? null, currentPhase);

    // When we expect a sync but the assistant doesn't call the tool, send one forced follow-up so the brief updates.
    useEffect(() => {
        // useChat status: avoid follow-up while a request is in flight
        if (status === 'streaming' || status === 'submitted') return;
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role !== 'assistant') return;
        if (!expectedSyncRef.current) return;
        if (shouldSkipFallbackForRepeatedAsk(lastMsg, missingFields)) {
            expectedSyncRef.current = false;
            return;
        }
        if (lastAssistantMessageHasSync(messages)) {
            console.info('[project-ai-ui] sync_seen_after_expected', {
                phase: currentPhase,
                missingCount: missingFields.length,
            });
            expectedSyncRef.current = false;
            return;
        }
        console.info('[project-ai-ui] fallback_sync_dispatch', {
            phase: currentPhase,
            missingCount: missingFields.length,
        });
        expectedSyncRef.current = false;
        sendMessage(
            {text: UPDATE_FOLLOW_UP},
            {
                body: {
                    currentPhase,
                    missingFields,
                    forceSync: true,
                },
            },
        );
    }, [messages, status, currentPhase, missingFields, sendMessage]);

    const handleSend = useCallback(
        async (content: string) => {
            const trimmed = content.trim();
            if (
                shouldExpectSyncForMessage({
                    currentPhase,
                    missingFields,
                    messageText: trimmed,
                })
            ) {
                expectedSyncRef.current = true;
                console.info('[project-ai-ui] expected_sync_set', {
                    phase: currentPhase,
                    missingCount: missingFields.length,
                });
            }
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

    const handleUpload = useCallback(
        async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chatId', chatId);
            const response = await fetch('/api/project-ai/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(payload?.error ?? 'Failed to upload document');
            }

            const payload = (await response.json()) as ProjectUploadResponse;
            applySyncOutput(payload.sync);
        },
        [applySyncOutput, chatId],
    );

    const displayMessages = useMemo(
        () =>
            messages
                .filter(
                    (message, index, allMessages) =>
                        message.role !== 'system' &&
                        !shouldHideInternalSyncChatter(message) &&
                        !isAssistantResponseToHiddenFallback(allMessages, index),
                )
                .map(toDisplayMessage),
        [messages],
    );

    const isTyping = status === 'submitted' || status === 'streaming';

    return (
        <div className="flex h-full min-h-0 flex-col py-10 ">
            <MessageList messages={displayMessages} isTyping={isTyping} />
            <div className="shrink-0">
                {showBriefBar && (
                    <ProjectMobileBriefBar
                        preparedForLabel={`Brief is being prepared for ${preparedFor} ...`}
                        onOpen={() => setIsBriefSheetOpen(true)}
                    />
                )}
                <ProjectAiChatInput
                    onSend={handleSend}
                    onUpload={handleUpload}
                    disabled={isTyping}
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
        </div>
    );
}
