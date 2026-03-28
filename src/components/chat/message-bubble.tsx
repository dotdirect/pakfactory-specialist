import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {cn} from '@/lib/utils/cn';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import type {Message} from '@/types/conversation';
import {usePlatformStore} from '@/stores/platform-store';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({message}: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const content = message.content.trim();

    if (!content) {
        return null;
    }

    return (
        <div className={cn('flex gap-3', isUser && 'justify-end')}>
            {!isUser && (
                <Avatar className="size-8">
                    <AvatarImage
                        src="/assets/avatar.jpg"
                        alt={usePlatformStore.getState().activeAgent ?? ''}
                    />
                    <AvatarFallback className="bg-muted">A</AvatarFallback>
                </Avatar>
            )}

            <div
                className={cn(
                    'max-w-[80%] rounded-3xl px-5 py-3',
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/9',
                )}
            >
                {!isUser && (
                    <p className="text-xs font-medium text-muted-foreground mb-1 md:text-base">
                        {usePlatformStore.getState().activeAgent}
                    </p>
                )}
                <div className="text-sm leading-snug md:text-base">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({children}) => (
                                <p className="m-0 whitespace-pre-wrap">
                                    {children}
                                </p>
                            ),
                            strong: ({children}) => (
                                <strong className="font-semibold">
                                    {children}
                                </strong>
                            ),
                            em: ({children}) => (
                                <em className="italic">{children}</em>
                            ),
                            ul: ({children}) => (
                                <ul className="mt-1 mb-0 list-disc pl-4 space-y-0.5">
                                    {children}
                                </ul>
                            ),
                            ol: ({children}) => (
                                <ol className="mt-1 mb-0 list-decimal pl-4 space-y-0.5">
                                    {children}
                                </ol>
                            ),
                            li: ({children}) => (
                                <li className="leading-snug">{children}</li>
                            ),
                            code: ({children}) => (
                                <code className="rounded bg-black/10 px-1 font-mono text-xs">
                                    {children}
                                </code>
                            ),
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
