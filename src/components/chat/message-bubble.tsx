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
                    'max-w-[80%] rounded-3xl p-5',
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
            >
                {!isUser && (
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                        {usePlatformStore.getState().activeAgent}
                    </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    );
}
