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
        <div className="flex-1 min-h-0 flex flex-col relative">
            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto pt-16 pb-4 relative"
            >
                {/* <div className="absolute w-full z-10 h-16 shrink-0 bg-linear-to-t from-background-alt/50 80 to-background-alt blur-sm "></div> */}
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
