'use client';

import {
    useCallback,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type KeyboardEvent,
} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Separator} from '@/components/ui/separator';
import {useSpeechRecognition} from '@/hooks/use-speech-recognition';
import {AudioWaveform, Mic, Plus, Send} from 'lucide-react';
import {usePlatformStore} from '@/stores/platform-store';
import {toast} from 'sonner';
import {AgentDisclaimer} from '@/components/agent/agent-disclaimer';

export interface ProjectAiChatInputProps {
    onSend: (message: string) => void;
    onUpload?: (file: File) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
}

export function ProjectAiChatInput({
    onSend,
    onUpload,
    placeholder = `Ask ${usePlatformStore.getState().activeAgent} anything`,
    disabled,
}: ProjectAiChatInputProps) {
    const [value, setValue] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const accumulatedTranscriptRef = useRef('');
    const ACCEPTED_UPLOAD_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;
    const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

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
        if (value.trim() && !disabled && !isUploading) {
            onSend(value.trim());
            setValue('');
            accumulatedTranscriptRef.current = '';
        }
    }, [value, disabled, isUploading, onSend]);

    const validateUpload = useCallback((file: File): string | null => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (
            !extension ||
            !ACCEPTED_UPLOAD_EXTENSIONS.includes(
                extension as (typeof ACCEPTED_UPLOAD_EXTENSIONS)[number],
            )
        ) {
            return 'Please upload a PDF, DOC, or DOCX file.';
        }
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            return 'File is too large. Maximum size is 10MB.';
        }
        return null;
    }, []);

    const handleUpload = useCallback(
        async (file: File) => {
            if (!onUpload) return;
            const error = validateUpload(file);
            if (error) {
                toast.error(error);
                return;
            }
            setIsUploading(true);
            try {
                await onUpload(file);
                toast.success('Document uploaded and processed');
            } catch (uploadError) {
                toast.error(
                    uploadError instanceof Error
                        ? uploadError.message
                        : 'Failed to upload and process document',
                );
            } finally {
                setIsUploading(false);
            }
        },
        [onUpload, validateUpload],
    );

    const handleFileInputChange = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const selectedFile = event.target.files?.[0];
            event.currentTarget.value = '';
            if (!selectedFile) return;
            await handleUpload(selectedFile);
        },
        [handleUpload],
    );

    const handleDrop = useCallback(
        async (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            if (!onUpload || disabled || isUploading) return;
            const droppedFile = event.dataTransfer.files?.[0];
            if (!droppedFile) return;
            await handleUpload(droppedFile);
        },
        [disabled, handleUpload, isUploading, onUpload],
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="shrink-0">
            {/* <Separator /> */}
            <div className="flex flex-col gap-3 p-4">
                <div
                    className="flex items-end gap-1 rounded-3xl border border-input px-4 py-2 shadow-md dark:bg-input/20 bg-white/70"
                    onDrop={handleDrop}
                    onDragOver={(event) => event.preventDefault()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileInputChange}
                    />
                    {/* <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-full"
                        aria-label="Add attachment"
                        onClick={() => {
                            if (!onUpload || disabled || isUploading) return;
                            fileInputRef.current?.click();
                        }}
                        disabled={!onUpload || disabled || isUploading}
                    >
                        <Plus className="size-4" />
                    </Button> */}
                    <Textarea
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled || isUploading}
                        rows={1}
                        className="min-h-[32px] max-h-40 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1 text-base md:text-base focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin"
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
                        disabled={!value.trim() || disabled || isUploading}
                    >
                        <Send className="size-4" />
                    </Button>
                </div>
                {isUploading && (
                    <p className="text-xs text-muted-foreground">
                        Uploading and extracting project details...
                    </p>
                )}
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
