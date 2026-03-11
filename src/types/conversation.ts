import { z } from 'zod'
import {
  StartProjectInquiryInputSchema,
  StartProjectInquiryOutputSchema,
} from '@/lib/tools/start-project-inquiry'

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
})
export type Choice = z.infer<typeof ChoiceSchema>

export const TextMessagePartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

export const ChoiceMessagePartSchema = z.object({
  type: z.literal('ui-choice'),
  choices: z.array(ChoiceSchema).min(1),
})

export const StartProjectInquiryToolCallPartSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string().min(1),
  toolName: z.literal('start_project_inquiry'),
  input: StartProjectInquiryInputSchema,
})
export type StartProjectInquiryToolCallPart = z.infer<
  typeof StartProjectInquiryToolCallPartSchema
>

export const StartProjectInquiryToolResultPartSchema = z.object({
  type: z.literal('tool-result'),
  toolCallId: z.string().min(1),
  toolName: z.literal('start_project_inquiry'),
  output: StartProjectInquiryOutputSchema,
})
export type StartProjectInquiryToolResultPart = z.infer<
  typeof StartProjectInquiryToolResultPartSchema
>

export const MessagePartSchema = z.discriminatedUnion('type', [
  TextMessagePartSchema,
  ChoiceMessagePartSchema,
  StartProjectInquiryToolCallPartSchema,
  StartProjectInquiryToolResultPartSchema,
])
export type MessagePart = z.infer<typeof MessagePartSchema>

const MessageMetadataSchema = z.object({
  checkpoint: z.string().optional(),
  choices: z.array(ChoiceSchema).optional(),
})

export const SerializedMessageSchema = z.object({
  id: z.string().min(1),
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime(),
  parts: z.array(MessagePartSchema).optional(),
  metadata: MessageMetadataSchema.optional(),
})
export type SerializedMessage = z.infer<typeof SerializedMessageSchema>

export const HelpChatResponseSchema = z.object({
  message: SerializedMessageSchema.extend({
    role: z.literal('assistant'),
  }),
})
export type HelpChatResponse = z.infer<typeof HelpChatResponseSchema>

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: Date
  parts?: MessagePart[]
  metadata?: {
    checkpoint?: string
    choices?: Choice[]
  }
}

export type ConversationStatus = 'idle' | 'connecting' | 'active' | 'error'

export interface ConversationState {
  conversationId: string | null
  status: ConversationStatus
  messages: Message[]
  isTyping: boolean
}
