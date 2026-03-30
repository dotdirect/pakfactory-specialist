import { z } from 'zod'
import { SyncProjectBriefOutputSchema } from '@/lib/tools/sync-project-brief'

// ─── Step & Flow IDs ─────────────────────────────────────────────────────────
// String keys only — no numbers. Steps can be reordered or composed without renumbering.

export const STEP_IDS = ['profile', 'project-details', 'recommend', 'product-select', 'billing'] as const
export type StepId = (typeof STEP_IDS)[number]

export const FLOW_IDS = ['rfq-full', 'quick-inquiry', 'direct-order'] as const
export type FlowId = (typeof FLOW_IDS)[number]

// ─── Step Tool Output ─────────────────────────────────────────────────────────
// Extends the shared SyncProjectBriefOutputSchema with an optional nextStep
// for branching steps (e.g. 'recommend' can branch to 'product-select' or 'submit').

export const RecommendedProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  handle: z.string().optional(),
  category: z.string(),
  description: z.string(),
  sku: z.string().optional(),
  recommendationNote: z.string().optional(),
  imageUrl: z.string().optional(),
  score: z.number(),
})
export type RecommendedProduct = z.infer<typeof RecommendedProductSchema>

export const StepToolOutputSchema = SyncProjectBriefOutputSchema.extend({
  nextStep: z.string().optional(),
  recommendations: z.array(RecommendedProductSchema).optional(),
})
export type StepToolOutput = z.infer<typeof StepToolOutputSchema>
