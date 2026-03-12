'use client';

import {useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {isTextUIPart} from 'ai';
import {BookOpen} from 'lucide-react';
import {storeProjectAiHelpHandoff} from '@/lib/project-ai-help-handoff';
import type {ProjectAiHelpHandoff} from '@/types/project-ai-handoff';
import type {HelpChatMessage} from '@/types/help-chat';
import {isSourceUrlPart} from '@/types/help-chat';
import {HelpSearchInput} from './help-search-input';

interface HelpConversationProps {
    initialQuestion: string;
    chatId: string;
}

type ProjectInquiryToolPart = Extract<
    HelpChatMessage['parts'][number],
    {type: 'tool-start_project_inquiry'; state: 'output-available'}
>;

function getMessageText(message: HelpChatMessage) {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('');
}

function isProjectInquiryToolPart(
    part: HelpChatMessage['parts'][number],
): part is ProjectInquiryToolPart {
    return (
        part.type === 'tool-start_project_inquiry' &&
        part.state === 'output-available'
    );
}

function renderMessageParagraphs(content: string) {
    return content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => (
            <p key={paragraph} className="text-base leading-7 text-foreground">
                {paragraph}
            </p>
        ));
}

function getSourceParts(message: HelpChatMessage) {
    return message.parts?.filter(isSourceUrlPart) ?? [];
}

function buildProjectAiHelpHandoff(
    messages: HelpChatMessage[],
    assistantMessageId: string,
): ProjectAiHelpHandoff | null {
    const assistantIndex = messages.findIndex(
        (m) => m.id === assistantMessageId,
    );
    if (assistantIndex === -1) return null;

    const assistantMessage = messages[assistantIndex];
    if (assistantMessage?.role !== 'assistant') return null;

    const lastUserMessage = messages
        .slice(0, assistantIndex)
        .reverse()
        .find((m) => m.role === 'user');
    const lastUserText = lastUserMessage
        ? getMessageText(lastUserMessage).trim()
        : '';
    const lastAssistantText = getMessageText(assistantMessage).trim();

    if (!lastUserText) return null;

    return {
        source: 'help',
        lastUserMessage: lastUserText,
        lastAssistantMessage: lastAssistantText || undefined,
        capturedAt: new Date().toISOString(),
    };
}

function renderSourcesBlock(message: HelpChatMessage) {
    const sourceParts = getSourceParts(message);
    if (sourceParts.length === 0) return null;
    return (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <BookOpen
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
                Sources
            </span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {sourceParts.map((part) => (
                    <li key={part.sourceId}>
                        <a
                            href={part.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:no-underline"
                        >
                            {part.title ?? part.url}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

type HelpStatus = 'idle' | 'submitted';

export function HelpConversation({
    initialQuestion,
    chatId,
}: HelpConversationProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<HelpChatMessage[]>([]);
    const [status, setStatus] = useState<HelpStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [dismissedToolCallIds, setDismissedToolCallIds] = useState<string[]>(
        [],
    );
    const initialQuestionSentRef = useRef(false);
    const hasInitialQuestion = initialQuestion.trim().length > 0;

    const greetingMessage = useMemo<HelpChatMessage>(
        () => ({
            id: `${chatId}-greeting`,
            role: 'assistant',
            parts: [
                {
                    type: 'text',
                    text: "Hi there! I'm Anthony, your packaging specialist. How can I help you today?",
                    state: 'done',
                },
            ],
        }),
        [chatId],
    );

    const visibleMessages = useMemo(() => {
        const base = hasInitialQuestion ? messages : [greetingMessage, ...messages];
        return base.filter((m) => m.role !== 'system');
    }, [hasInitialQuestion, greetingMessage, messages]);

    const sendQuestion = useCallback(async (question: string) => {
        const userMessage: HelpChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            parts: [{ type: 'text', text: question, state: 'done' }],
        };
        setMessages((prev) => [...prev, userMessage]);
        setStatus('submitted');
        setError(null);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error ?? 'Something went wrong. Please try again.');
                setStatus('idle');
                return;
            }

            if (data.message) {
                setMessages((prev) => [...prev, data.message as HelpChatMessage]);
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setStatus('idle');
        }
    }, []);

    useEffect(() => {
        if (!hasInitialQuestion || initialQuestionSentRef.current) {
            return;
        }
        initialQuestionSentRef.current = true;
        void sendQuestion(initialQuestion);
    }, [hasInitialQuestion, initialQuestion, sendQuestion]);

    const handleFollowUp = useCallback(
        async (content: string) => {
            await sendQuestion(content);
        },
        [sendQuestion],
    );

    const handleNavigateToRoute = useCallback(
        (route: string, assistantMessageId?: string) => {
            if (route.startsWith('/project-ai') && assistantMessageId) {
                const handoff = buildProjectAiHelpHandoff(
                    visibleMessages,
                    assistantMessageId,
                );
                if (handoff) storeProjectAiHelpHandoff(handoff);
            }
            router.push(route);
        },
        [router, visibleMessages],
    );

    const handleKeepChatting = useCallback((toolCallId: string) => {
        setDismissedToolCallIds((current) =>
            current.includes(toolCallId) ? current : [...current, toolCallId],
        );
    }, []);

    const helpMessagesById = useMemo(
        () => new Map(visibleMessages.map((message) => [message.id, message])),
        [visibleMessages],
    );
    const renderAfterMessage = useCallback(
        (message: HelpChatMessage) => {
            const sourceMessage = helpMessagesById.get(message.id);
            if (!sourceMessage || sourceMessage.role !== 'assistant') {
                return null;
            }

            const projectInquiryParts = sourceMessage.parts
                ?.filter(isProjectInquiryToolPart)
                .filter(
                    (part) => !dismissedToolCallIds.includes(part.toolCallId),
                );

            if (!projectInquiryParts?.length) {
                return null;
            }

            return (
                <div className="mt-6 flex flex-col gap-3">
                    {projectInquiryParts.map((part) => (
                        <Card
                            key={part.toolCallId}
                            className="gap-4 border-border/80 bg-muted/30 py-0 shadow-none"
                        >
                            <CardHeader className="px-4 pt-4">
                                <CardTitle className="text-sm">
                                    {part.output.title}
                                </CardTitle>
                                <CardDescription>
                                    {part.output.description}
                                </CardDescription>
                            </CardHeader>
                                <CardContent className="flex flex-wrap gap-2 px-4 pb-4">
                                {part.output.options.map((option) => (
                                    <Button
                                        key={option.route}
                                        variant={option.variant}
                                        onClick={() =>
                                            handleNavigateToRoute(
                                                option.route,
                                                sourceMessage.id,
                                            )
                                        }
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        handleKeepChatting(part.toolCallId)
                                    }
                                >
                                    {part.output.secondaryActionLabel}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        },
        [
            dismissedToolCallIds,
            handleNavigateToRoute,
            handleKeepChatting,
            helpMessagesById,
        ],
    );
    const isTyping = status === 'submitted';

    return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
            <ScrollArea className="flex-1">
                <div className="mx-auto flex w-full max-w-4xl flex-col px-6 py-10 gap-5">
                    {visibleMessages.map((message, index) => {
                        const messageText = getMessageText(message).trim();
                        const showDivider =
                            index < visibleMessages.length - 1 &&
                            message.role === 'assistant';

                        if (message.role === 'user') {
                            return (
                                <section
                                    key={message.id}
                                    className="flex flex-col gap-6"
                                >
                                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                                        &quot;{messageText}&quot;
                                    </h2>
                                </section>
                            );
                        }

                        return (
                            <section
                                key={message.id}
                                className="flex flex-col gap-6"
                            >
                                <div className="flex max-w-3xl flex-col gap-4">
                                    {renderMessageParagraphs(messageText)}
                                </div>
                                {renderSourcesBlock(message)}
                                {renderAfterMessage(message)}
                                {showDivider ? (
                                    <Separator className="mt-4" />
                                ) : null}
                            </section>
                        );
                    })}

                    {error ? (
                        <p className="mt-8 max-w-3xl text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                    {isTyping ? (
                        <div className="mt-8 max-w-3xl text-sm text-muted-foreground">
                            Anthony is preparing the next answer...
                        </div>
                    ) : null}
                </div>
            </ScrollArea>

            <div className="border-t bg-background/95">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-4">
                    <HelpSearchInput
                        onSubmit={handleFollowUp}
                        placeholder="Ask a follow up"
                        variant="follow-up"
                    />
                    <p className="text-center text-sm text-muted-foreground">
                        PakSpecialist can make mistakes. Consider checking
                        important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
