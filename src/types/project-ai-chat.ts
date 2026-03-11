import type { InferUITools, UIMessage } from 'ai'
import type { specialistAgentTools } from '@/lib/agents/specialist-agent'

export type ProjectAiChatTools = InferUITools<typeof specialistAgentTools>
export type ProjectAiChatMessage = UIMessage<unknown, never, ProjectAiChatTools>
