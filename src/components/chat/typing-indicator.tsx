import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="size-8">
        <AvatarImage src="/assets/avatar.jpg" alt="Anthony" />
        <AvatarFallback className="text-xs font-medium">A</AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
