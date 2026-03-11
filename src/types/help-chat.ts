import type { InferUITools, UIMessage } from 'ai'
import type { csAgentTools } from '@/lib/agents/cs-agent'

export type HelpChatTools = InferUITools<typeof csAgentTools>
export type HelpChatMessage = UIMessage<unknown, never, HelpChatTools>

/** Source URL part from the SDK; used for knowledge-base references. */
export type HelpSourceUrlPart = Extract<
  HelpChatMessage['parts'][number],
  { type: 'source-url' }
>

export function isSourceUrlPart(
  part: HelpChatMessage['parts'][number],
): part is HelpSourceUrlPart {
  return part.type === 'source-url'
}
