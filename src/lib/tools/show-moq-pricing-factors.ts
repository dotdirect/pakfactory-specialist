import { tool } from 'ai'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ShowMoqPricingFactorsInputSchema = z.object({
  productType: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
})
export type ShowMoqPricingFactorsInput = z.infer<typeof ShowMoqPricingFactorsInputSchema>

export const ShowMoqPricingFactorsOutputSchema = z.object({
  title: z.string().min(1),
  factors: z.array(z.string().min(1)).min(1),
})
export type ShowMoqPricingFactorsOutput = z.infer<typeof ShowMoqPricingFactorsOutputSchema>

// ─── Tool (display — no server execute) ──────────────────────────────────────

export const showMoqPricingFactorsTool = tool({
  description:
    'Explain the main MOQ and pricing factors relevant to the customer question.',
  inputSchema: ShowMoqPricingFactorsInputSchema,
})
