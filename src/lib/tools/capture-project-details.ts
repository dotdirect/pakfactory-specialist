import { tool } from 'ai'
import { z } from 'zod'
import { buildSyncProjectBriefOutput } from './sync-project-brief'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

export const INDUSTRIES = [
  'Apparel',
  'Beer',
  'Candle',
  'Chocolate',
  'Coffee',
  'Cosmetic & Skincare',
  'Ecommerce',
  'Electronics',
  'Food & Restaurant',
  'Game',
  'Gift Box',
  'Liquor & Spirits',
  'Luxury',
  'Presentation',
  'Soap',
  'Tea',
  'Wine',
] as const

const inputSchema = z.object({
  industry: z.enum(INDUSTRIES),
  productItem: z.string().min(1),
  deliveryCountry: z.string().min(1),
  annualBudget: z.coerce.number().optional(),
  notes: z.string().optional(),
  projectSummary: z.string().optional(),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureProjectDetailsTool = tool({
  description:
    'Call this once you have collected the user\'s industry, what product they are packaging, and delivery country. Pass the user\'s free-form project description as projectSummary. Annual budget and additional notes are optional.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const result = buildSyncProjectBriefOutput({
      customerIndustry: input.industry,
      productItem: input.productItem,
      deliveryCountry: input.deliveryCountry,
      customerAnnualBudget: input.annualBudget,
      notes: input.notes,
      projectSummary: input.projectSummary,
    })
    return { ...result }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureProjectDetailsGuidance = `
Step: Project Details
Goal: Invite the user to describe their project freely. Extract industry, productItem, and deliveryCountry from their description.
- Read the user's message and extract all three required fields if present.
- Only ask follow-up questions for required fields that are still missing. Ask all missing fields in a single grouped question.
- Always populate projectSummary with the user's own words (verbatim or lightly paraphrased) when calling capture_project_details.
- projectSummary is the user's project description. notes = additional context beyond the description.
- INDUSTRY: You MUST map the user's description to the closest match from this list: ${INDUSTRIES.join(', ')}. For example: "skincare" → "Cosmetic & Skincare", "coffee beans" → "Coffee", "wine bottles" → "Wine", "clothing" → "Apparel", "tech gadgets" → "Electronics". Pick the single best match.
- PRODUCT ITEM: This must be a short noun — the single physical item going INSIDE the packaging. Strip out any packaging types, materials, or preferences. Examples: "I need pouches for my coffee beans" → "Coffee Beans". "luxury rigid boxes for 50ml serum bottles" → "Serum Bottles". "compostable bags for chocolate bars" → "Chocolate Bars". NEVER include packaging descriptions like "in paper pouches" or "with magnetic closure" in productItem.
Optional: annual packaging budget, additional project notes.
When you have industry + productItem + deliveryCountry, call capture_project_details immediately.
Do not ask for any information beyond this step's scope.
`.trim()
