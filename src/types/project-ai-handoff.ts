import { z } from 'zod'

export const ProjectAiHelpHandoffSchema = z.object({
  source: z.literal('help'),
  lastUserMessage: z.string().min(1),
  lastAssistantMessage: z.string().min(1).optional(),
  capturedAt: z.string().datetime(),
})

export type ProjectAiHelpHandoff = z.infer<typeof ProjectAiHelpHandoffSchema>
