import { tool } from 'ai'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ShowTimelineGuidanceInputSchema = z.object({
  desiredTimeline: z.string().min(1).optional(),
})
export type ShowTimelineGuidanceInput = z.infer<typeof ShowTimelineGuidanceInputSchema>

export const ShowTimelineGuidanceOutputSchema = z.object({
  title: z.string().min(1),
  guidance: z.array(z.string().min(1)).min(1),
})
export type ShowTimelineGuidanceOutput = z.infer<typeof ShowTimelineGuidanceOutputSchema>

// ─── Tool (display — no server execute) ──────────────────────────────────────

export const showTimelineGuidanceTool = tool({
  description:
    'Provide a concise timeline guidance checklist for production planning questions.',
  inputSchema: ShowTimelineGuidanceInputSchema,
})
