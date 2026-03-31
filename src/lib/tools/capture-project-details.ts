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
  deliveryCountry: z.string().optional(),
  annualBudget: z.coerce.number().optional(),
  notes: z.string().optional(),
  projectSummary: z.string().optional(),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureProjectDetailsTool = tool({
  description:
    'Call this once you have collected the user\'s industry and what product they are packaging. Pass the user\'s free-form project description as projectSummary. Delivery country, annual budget, and additional notes are optional.',
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
Goal: Understand what the user is packaging so we can recommend the right product.
Required fields: industry + productItem. Everything else is optional.
Tone: Professional, polished, concise. Never sound robotic or overly casual.

## Conversation Flow
Ask questions ONE AT A TIME in this order. Never bundle multiple questions together.

1. **Product first**: If the user hasn't said what they're packaging, ask about the product:
   "May I ask what type of product you're looking to package?"
2. **Product form/structure**: Once you know the product category, ask about its physical form to narrow down packaging:
   - Skincare/cosmetics: "Are those in jars, tubes, or bottles? That helps me find the right fit."
   - Coffee/tea: "Is this ground, whole bean, or loose leaf?"
   - Food: "How is the product contained — cans, jars, bags, or trays?"
   - Wine/beer/spirits: "Is this for individual bottles, multi-packs, or gift sets?"
   - Candles: "Are these container candles, pillars, or votives?"
   - General: "Could you tell me a bit more about the form — bottles, jars, tubes, bags?"
   Capture the answer in the \`notes\` field.
3. **Industry**: If you can already infer the industry from the product (e.g. "face creams" → Cosmetic & Skincare), do NOT ask — just map it. Only ask if genuinely ambiguous:
   "Which industry are you selling this product in?"

## Field Rules
- If the user provides enough info to extract both industry and productItem, call capture_project_details immediately — skip remaining questions.
- Always populate projectSummary with the user's own words (verbatim or lightly paraphrased).
- INDUSTRY: Map to the closest match from: ${INDUSTRIES.join(', ')}. Examples: "skincare" → "Cosmetic & Skincare", "coffee beans" → "Coffee", "wine bottles" → "Wine", "clothing" → "Apparel".
- PRODUCT ITEM: Short noun — the physical item INSIDE the packaging. Strip packaging types/materials. Examples: "pouches for coffee beans" → "Coffee Beans". "rigid boxes for serum bottles" → "Serum Bottles". NEVER include packaging descriptions in productItem.
- deliveryCountry: Capture if the user mentions it, but do NOT ask for it.
- Do not ask for any information beyond this step's scope.
`.trim()
