'use client';

import {Fragment, useEffect, useRef, type ReactNode} from 'react';
import {MessageBubble} from './message-bubble';
import {TypingIndicator} from './typing-indicator';
import {ChoiceButtons} from './choice-buttons';
import type {Message, Choice} from '@/types/conversation';

interface MessageListProps {
    messages: Message[];
    isTyping?: boolean;
    onChoiceSelect?: (choice: Choice) => void;
    renderAfterMessage?: (message: Message) => ReactNode;
}

export function MessageList({
    messages,
    isTyping,
    onChoiceSelect,
    renderAfterMessage,
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const lastMessage = messages[messages.length - 1];
    const choices = lastMessage?.metadata?.choices;

    return (
        <div className="flex-1 min-h-0 flex flex-col relative px-5 md:px-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-linear-to-b from-background-alt to-transparent" />
            <div
                ref={scrollRef}
                className="no-scrollbar relative flex-1 min-h-0 overflow-y-auto pt-10 pb-4"
            >
                <div className="flex flex-col gap-4">
                    {messages.map((message) => (
                        <Fragment key={message.id}>
                            <MessageBubble message={message} />
                            {renderAfterMessage?.(message)}
                        </Fragment>
                    ))}

                    {isTyping && <TypingIndicator />}

                    {choices && choices.length > 0 && onChoiceSelect && (
                        <ChoiceButtons
                            choices={choices}
                            onSelect={onChoiceSelect}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
