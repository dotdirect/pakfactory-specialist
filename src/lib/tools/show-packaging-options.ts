import { tool } from 'ai'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ShowPackagingOptionsInputSchema = z.object({
  productType: z.string().min(1),
  useCase: z.string().min(1),
})
export type ShowPackagingOptionsInput = z.infer<typeof ShowPackagingOptionsInputSchema>

export const ShowPackagingOptionsOutputSchema = z.object({
  title: z.string().min(1),
  options: z.array(z.string().min(1)).min(1),
})
export type ShowPackagingOptionsOutput = z.infer<typeof ShowPackagingOptionsOutputSchema>

// ─── Tool (display — no server execute) ──────────────────────────────────────

export const showPackagingOptionsTool = tool({
  description:
    'Present a short list of packaging options that fit a specific product or use case.',
  inputSchema: ShowPackagingOptionsInputSchema,
})
