'use client';

import {useState, useRef, type KeyboardEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Textarea} from '@/components/ui/textarea';
import {Send} from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ChatInput({
    onSend,
    placeholder = 'Message Anthony...',
    disabled,
}: ChatInputProps) {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (value.trim() && !disabled) {
            onSend(value.trim());
            setValue('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="shrink-0">
            <Separator />
            <div className="flex gap-2 p-4">
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="min-h-[44px] max-h-32 resize-none"
                    rows={1}
                />
                <Button
                    onClick={handleSubmit}
                    disabled={!value.trim() || disabled}
                    size="icon"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground pb-3 px-4 text-center">
                PakSpecialist can make mistakes. Consider checking important
                information.
            </p>
        </div>
    );
}
