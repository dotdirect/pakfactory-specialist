'use client'

import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './message-bubble'
import { TypingIndicator } from './typing-indicator'
import { ChoiceButtons } from './choice-buttons'
import type { Message, Choice } from '@/types/conversation'

interface MessageListProps {
  messages: Message[]
  isTyping?: boolean
  onChoiceSelect?: (choice: Choice) => void
  renderAfterMessage?: (message: Message) => ReactNode
  /** When 'window', the list grows with content and the browser window scrolls; when 'panel', the list lives in an internal ScrollArea. */
  scrollMode?: 'panel' | 'window'
}

export function MessageList({
  messages,
  isTyping,
  onChoiceSelect,
  renderAfterMessage,
  scrollMode = 'panel',
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, isTyping])

  const lastMessage = messages[messages.length - 1]
  const choices = lastMessage?.metadata?.choices

  const content = (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <Fragment key={message.id}>
          <MessageBubble message={message} />
          {renderAfterMessage?.(message)}
        </Fragment>
      ))}

      {isTyping && <TypingIndicator />}

      {choices && choices.length > 0 && onChoiceSelect && (
        <ChoiceButtons choices={choices} onSelect={onChoiceSelect} />
      )}

      <div ref={endRef} aria-hidden />
    </div>
  )

  if (scrollMode === 'window') {
    return <div className="flex min-h-0 flex-col">{content}</div>
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        {content}
      </ScrollArea>
    </div>
  )
}
