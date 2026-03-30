import { tool } from 'ai'
import { z } from 'zod'
import { RecommendedProductSchema, type RecommendedProduct, type StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const RagDebugSchema = z.object({
  query: z.string(),
  industry: z.string().optional(),
  filterTier: z.enum(['alias', 'none']),
  aliasesUsed: z.array(z.string()).optional(),
}).optional()

const inputSchema = z.object({
  products: z.array(RecommendedProductSchema).min(1).max(6),
  summary: z.string().min(1),
  ragDebug: RagDebugSchema,
})

export type { RecommendedProduct }

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const productRecommendationsTool = tool({
  description:
    'Call this to present product recommendations to the user. Pass the full products array from the retrieved catalog results and a brief summary of why these match.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput & { recommendations: RecommendedProduct[]; ragDebug?: { query: string; industry?: string; filterTier: 'alias' | 'none'; aliasesUsed?: string[]; products: Array<{ name: string; score: number; category: string }> } }> => {
    return {
      title: 'Product recommendations',
      summary: input.summary,
      changedFields: [],
      appliedUpdates: [],
      events: [],
      recommendations: input.products,
      nextStep: 'product-select',
      ragDebug: input.ragDebug ? {
        ...input.ragDebug,
        products: input.products.map((p) => ({ name: p.productName, score: p.score, category: p.category })),
      } : undefined,
    }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const productRecommendationsGuidance = `
Step: Product Recommendation
Goal: Present product recommendations retrieved from the catalog to the user.
You have been provided with a list of recommended products in the "Retrieved Product Recommendations" section below.
IMMEDIATELY call product_recommendations with:
  - products: the array of products from the "Retrieved Product Recommendations" section, with these modifications per product:
    - Copy all existing fields (productId, productName, handle, category, description, sku, imageUrl, score) as-is.
    - ADD a "recommendationNote" field: write 1-2 sentences explaining why THIS specific product is a great fit for the user's project. Reference their product type, industry, or specific needs mentioned in the brief. Be personal and specific — not generic.
  - summary: a one-sentence summary of why these products match the user's project
Do NOT write any text. Do NOT describe the products. Do NOT ask questions. Just call the tool NOW.
The system will display interactive product cards automatically — your only job is to pass the data through the tool.
If no products section exists below, tell the user no matching products were found and suggest they describe their needs differently.
`.trim()
