'use client';

import {useState, useCallback} from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {HelpSearchInput} from '@/components/help/help-search-input';
import {TopicBrowser} from '@/components/help/topic-browser';
import {HelpConversation} from '@/components/help/help-conversation';

type Stage = 'landing' | 'conversation';

export function HelpPageContent() {
    const [stage, setStage] = useState<Stage>('landing');
    const [question, setQuestion] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);

    const handleSubmit = useCallback((q: string) => {
        setChatId(crypto.randomUUID());
        setQuestion(q);
        setStage('conversation');
    }, []);

    return (
        <div className="relative h-[calc(100vh-3.5rem)]  bg-background-alt">
            {/* Landing */}
            <div
                className={`absolute inset-0 transition-all duration-300 ${
                    stage === 'landing'
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
            >
                <ScrollArea className="shadow-top h-full rounded-xl  bg-background">
                    <div className="container mx-auto max-w-4xl px-4 py-24">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-bold tracking-tight">
                                How can we help?
                            </h1>
                        </div>

                        <div className=" mx-auto mb-16">
                            <HelpSearchInput onSubmit={handleSubmit} />
                        </div>

                        <TopicBrowser onTopicSelect={handleSubmit} />
                    </div>
                </ScrollArea>
            </div>

            {/* Conversation */}
            <div
                className={`absolute inset-0 mx-auto transition-all duration-300 ${
                    stage === 'conversation'
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                {stage === 'conversation' && (
                    <HelpConversation
                        initialQuestion={question}
                        chatId={chatId ?? crypto.randomUUID()}
                    />
                )}
            </div>
        </div>
    );
}
