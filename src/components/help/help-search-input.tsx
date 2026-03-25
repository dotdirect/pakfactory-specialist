'use client';

import {useState, useRef, useEffect, type KeyboardEvent} from 'react';
import {cn} from '@/lib/utils/cn';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Search, X, ArrowUp} from 'lucide-react';
import {DEFAULT_AGENT_NAME, usePlatformStore} from '@/stores/platform-store';
import {AIGlow} from '@/components/common/ai-glow';

const suggestedQuestions = [
    'How do I get a quote?',
    'What are your minimum order quantities?',
    'What packaging materials do you offer?',
    'How long does production take?',
    'Can you help me design my packaging?',
    'What printing methods are available?',
    'Do you offer eco-friendly packaging?',
    'How does the proofing process work?',
];

interface HelpSearchInputProps {
    onSubmit: (question: string) => void;
    placeholder?: string;
    variant?: 'landing' | 'follow-up';
}

export function HelpSearchInput({
    onSubmit,
    placeholder,
    variant = 'landing',
}: HelpSearchInputProps) {
    const activeAgent = usePlatformStore((state) => state.activeAgent);
    const [value, setValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedPlaceholder =
        placeholder ?? `Ask ${activeAgent ?? DEFAULT_AGENT_NAME} anything`;

    const filtered = value.trim()
        ? suggestedQuestions.filter((q) =>
              q.toLowerCase().includes(value.toLowerCase()),
          )
        : [];

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function submit(question: string) {
        if (!question.trim()) return;
        onSubmit(question.trim());
        setValue('');
        setShowSuggestions(false);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowDown' && showSuggestions) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp' && showSuggestions) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && filtered[selectedIndex]) {
                submit(filtered[selectedIndex]);
            } else {
                submit(value);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex w-full items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <AIGlow
                    trigger="hover"
                    pill={variant === 'landing'}
                    className={cn(
                        variant === 'follow-up' && 'ai-glow--rounded-lg',
                    )}
                >
                    <Input
                        ref={inputRef}
                        value={value}
                        onChange={(e) => {
                            const nextValue = e.target.value;
                            const nextFiltered = nextValue.trim()
                                ? suggestedQuestions.filter((q) =>
                                      q
                                          .toLowerCase()
                                          .includes(nextValue.toLowerCase()),
                                  )
                                : [];

                            setValue(nextValue);
                            setSelectedIndex(-1);
                            setShowSuggestions(nextFiltered.length > 0);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (filtered.length > 0) setShowSuggestions(true);
                        }}
                        placeholder={resolvedPlaceholder}
                        className={cn(
                            'w-full cursor-pointer',
                            variant === 'landing'
                                ? 'h-12 pl-10 pr-20 text-base rounded-full border-border'
                                : 'h-14 rounded-2xl border-border bg-background pl-11 pr-18 text-base shadow-xs',
                        )}
                    />
                </AIGlow>

                <div className="absolute right-2 flex items-center gap-1 ">
                    {value && (
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                                setValue('');
                                setSelectedIndex(-1);
                                setShowSuggestions(false);
                                inputRef.current?.focus();
                            }}
                            className="rounded-full"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        size={variant === 'landing' ? 'icon' : 'icon-sm'}
                        onClick={() => submit(value)}
                        disabled={!value.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {showSuggestions && filtered.length > 0 && (
                <div
                    className={`absolute z-50 w-full rounded-lg border bg-background shadow-lg overflow-hidden ${variant === 'follow-up' ? 'bottom-full mb-1' : 'mt-1'}`}
                >
                    {filtered.map((question, index) => (
                        <Button
                            key={question}
                            variant="ghost"
                            onClick={() => submit(question)}
                            className={`w-full justify-start rounded-none px-4 py-3 h-auto text-sm font-normal ${
                                index === selectedIndex ? 'bg-muted' : ''
                            }`}
                        >
                            {question}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
