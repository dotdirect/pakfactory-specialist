import { tool } from 'ai'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ShowQuoteReadinessInputSchema = z.object({
  useCase: z.string().min(1),
  quantityKnown: z.boolean().optional(),
  timelineKnown: z.boolean().optional(),
})
export type ShowQuoteReadinessInput = z.infer<typeof ShowQuoteReadinessInputSchema>

export const ShowQuoteReadinessOutputSchema = z.object({
  title: z.string().min(1),
  checklist: z.array(z.string().min(1)).min(1),
})
export type ShowQuoteReadinessOutput = z.infer<typeof ShowQuoteReadinessOutputSchema>

// ─── Tool (display — no server execute) ──────────────────────────────────────

export const showQuoteReadinessTool = tool({
  description:
    'Summarize what information the customer should have ready before starting a quote.',
  inputSchema: ShowQuoteReadinessInputSchema,
})
