'use client';

import {useCallback, useRef, useState, type KeyboardEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Separator} from '@/components/ui/separator';
import {useSpeechRecognition} from '@/hooks/use-speech-recognition';
import {AudioWaveform, Mic, Plus, Send} from 'lucide-react';
import {usePlatformStore} from '@/stores/platform-store';
import {toast} from 'sonner';
import {AgentDisclaimer} from '@/components/agent/agent-disclaimer';

export interface ProjectAiChatInputProps {
    onSend: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ProjectAiChatInput({
    onSend,
    placeholder = `Ask ${usePlatformStore.getState().activeAgent} anything`,
    disabled,
}: ProjectAiChatInputProps) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const accumulatedTranscriptRef = useRef('');

    const handleResult = useCallback((transcript: string, isFinal: boolean) => {
        if (isFinal) {
            accumulatedTranscriptRef.current +=
                (accumulatedTranscriptRef.current ? ' ' : '') + transcript;
            setValue((prev) => {
                const base = accumulatedTranscriptRef.current;
                return base;
            });
        } else {
            setValue((prev) => {
                const base = accumulatedTranscriptRef.current;
                return base ? `${base} ${transcript}` : transcript;
            });
        }
    }, []);

    const {isSupported, isListening, startListening, stopListening} =
        useSpeechRecognition({
            onResult: handleResult,
            onError: (message) => toast.error(message),
            continuous: true,
            interimResults: true,
        });

    const handleStartVoice = useCallback(() => {
        accumulatedTranscriptRef.current = value.trim();
        if (!accumulatedTranscriptRef.current) {
            setValue('');
        }
        startListening();
        inputRef.current?.focus();
    }, [value, startListening]);

    const handleStopVoice = useCallback(() => {
        stopListening();
        inputRef.current?.focus();
    }, [stopListening]);

    const handleSubmit = useCallback(() => {
        if (value.trim() && !disabled) {
            onSend(value.trim());
            setValue('');
            accumulatedTranscriptRef.current = '';
        }
    }, [value, disabled, onSend]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="shrink-0">
            <Separator />
            <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-1 rounded-full border border-input bg-muted/30 px-2 py-1.5 shadow-sm dark:bg-input/20">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-full"
                        aria-label="Add attachment"
                        onClick={() => inputRef.current?.focus()}
                        disabled={true}
                    >
                        <Plus className="size-4" />
                    </Button>
                    <Input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="h-8 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label="Message input"
                    />

                    {/* Voice input is disabled for now */}
                    {/* {isSupported ? (
                        isListening ? (
                            <Button
                                type="button"
                                size="icon"
                                className="size-8 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90"
                                aria-label="Stop listening"
                                onClick={handleStopVoice}
                                disabled={disabled}
                            >
                                <AudioWaveform className="size-4" aria-hidden />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 rounded-full"
                                aria-label="Start voice input"
                                onClick={handleStartVoice}
                                disabled={disabled}
                            >
                                <Mic className="size-4" />
                            </Button>
                        )
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 rounded-full opacity-50"
                            aria-label="Voice input not supported"
                            title="Voice input not supported in this browser"
                            disabled
                        >
                            <Mic className="size-4" />
                        </Button>
                    )} */}
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 rounded-full"
                        aria-label="Send message"
                        onClick={handleSubmit}
                        disabled={!value.trim() || disabled}
                    >
                        <Send className="size-4" />
                    </Button>
                </div>
                {isListening && (
                    <p className="sr-only" aria-live="polite">
                        Listening…
                    </p>
                )}
                <AgentDisclaimer />
            </div>
        </div>
    );
}
