'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport, isTextUIPart} from 'ai';
import {toast} from 'sonner';
import {ProjectAiChatInput} from '@/components/project/project-ai-chat-input';
import {MessageList} from '@/components/chat/message-list';
import {
    getCurrentPhase,
    getMissingFieldsInPhase,
} from '@/lib/brief-collection';
import {useBriefStore} from '@/stores/brief-store';
import type {BriefEvent} from '@/types/brief-events';
import type {Message} from '@/types/conversation';
import type {ProjectAiChatMessage} from '@/types/project-ai-chat';

const SYNC_BRIEF_TOOL_TYPE = 'tool-sync_project_brief'

/** Matches a string that looks like an email (user likely provided email as the only missing field). */
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Recognizes sync_project_brief tool parts: typed part or toolCallId + output.events; requires state === 'output-available' when state is present. */
function partHasBriefEvents(
    part: ProjectAiChatMessage['parts'][number],
): boolean {
    const p = part as Record<string, unknown>
    if (typeof p.toolCallId !== 'string') return false
    const state = p.state as string | undefined
    if (state != null && state !== 'output-available') return false
    const payload = (p.output ?? p.result) as { events?: unknown[] } | undefined
    const events = payload?.events
    return Array.isArray(events) && events.length > 0
}

/** Prefer typed tool part so we only process sync_project_brief, not other tools. */
function isSyncBriefPart(part: ProjectAiChatMessage['parts'][number]): boolean {
    const p = part as Record<string, unknown>
    return p.type === SYNC_BRIEF_TOOL_TYPE || (partHasBriefEvents(part) && !p.type)
}

function getBriefOutputFromPart(
    part: ProjectAiChatMessage['parts'][number],
): { toolCallId: string; output: { events: BriefEvent[]; title?: string; summary?: string; notes?: string } } | null {
    if (!isSyncBriefPart(part) || !partHasBriefEvents(part)) return null
    const p = part as Record<string, unknown>
    const payload = (p.output ?? p.result) as { events: BriefEvent[]; title?: string; summary?: string; notes?: string }
    return {
        toolCallId: p.toolCallId as string,
        output: payload,
    }
}

function getMessageText(message: ProjectAiChatMessage) {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('');
}

function lastAssistantMessageHasSync(messages: ProjectAiChatMessage[]): boolean {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role !== 'assistant') continue
        for (const part of msg.parts ?? []) {
            if (isSyncBriefPart(part) && partHasBriefEvents(part)) return true
        }
        return false
    }
    return false
}

function toDisplayMessage(message: ProjectAiChatMessage): Message {
    return {
        id: message.id,
        role: message.role,
        content: getMessageText(message),
        createdAt: new Date(),
    };
}

const UPDATE_FOLLOW_UP = 'Please update the brief with the information I provided.'

export function ProjectAiChatPanel() {
    const [chatId] = useState(() => crypto.randomUUID());
    const processedToolCallIdsRef = useRef<Set<string>>(new Set());
    /** Set when user sends a message that should complete the only missing field (e.g. email); cleared when we get a sync in the response or when we send the follow-up. */
    const expectedSyncRef = useRef(false);

    const initializeBrief = useBriefStore((state) => state.initializeBrief);
    const handleBriefEvent = useBriefStore((state) => state.handleBriefEvent);
    const setNotes = useBriefStore((state) => state.setNotes);
    const brief = useBriefStore((state) => state.brief);

    const [showNameQuestion] = useState(() => {
        const existingBrief = useBriefStore.getState().brief;
        return !existingBrief?.customer?.name && !existingBrief?.customer?.firstName;
    });

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
    useEffect(() => {
        const state = useBriefStore.getState();
        if (!state.brief || state.brief.conversationId !== chatId) {
            state.initializeBrief(chatId);
        }

        for (const message of messages) {
            if (message.role !== 'assistant') continue;

            for (const part of message.parts ?? []) {
                const parsed = getBriefOutputFromPart(part);
                if (!parsed || processedToolCallIdsRef.current.has(parsed.toolCallId)) continue;

                const { toolCallId, output } = parsed;

                for (const event of output.events) {
                    handleBriefEvent(event);
                }

                const briefNow = useBriefStore.getState().brief;
                if (output.notes && briefNow?.notes !== output.notes) {
                    setNotes(output.notes);
                }

                processedToolCallIdsRef.current.add(toolCallId);
                toast.success(output.title ?? 'Project brief updated', {
                    description: output.summary,
                });
            }
        }
    }, [chatId, handleBriefEvent, messages, setNotes]);

    const currentPhase = getCurrentPhase(brief ?? null);
    const missingFields = getMissingFieldsInPhase(brief ?? null, currentPhase);

    // When we expected a sync (user sent e.g. email as only missing field) but the assistant didn't call the tool, send a follow-up once so the brief updates.
    useEffect(() => {
        if (status !== 'ready' && status !== 'awaiting_message') return
        const lastMsg = messages[messages.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant') return
        if (!expectedSyncRef.current) return
        if (lastAssistantMessageHasSync(messages)) {
            expectedSyncRef.current = false
            return
        }
        expectedSyncRef.current = false
        sendMessage(
            { text: UPDATE_FOLLOW_UP },
            {
                body: {
                    currentPhase,
                    missingFields,
                },
            },
        )
    }, [messages, status, currentPhase, missingFields, sendMessage])

    const handleSend = useCallback(
        async (content: string) => {
            const trimmed = content.trim()
            if (
                missingFields.length === 1 &&
                missingFields[0] === 'customer.email' &&
                EMAIL_LIKE.test(trimmed)
            ) {
                expectedSyncRef.current = true
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

    const displayMessages = useMemo(
        () =>
            messages
                .filter((message) => message.role !== 'system')
                .map(toDisplayMessage),
        [messages],
    );

    const isTyping = status === 'submitted' || status === 'streaming';

    return (
        <div className="flex h-full min-h-0 flex-col">
            <MessageList
                messages={displayMessages}
                isTyping={isTyping}
            />
            <ProjectAiChatInput onSend={handleSend} disabled={isTyping} />
        </div>
    );
}
