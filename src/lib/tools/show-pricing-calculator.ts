import { tool } from 'ai'
import { z } from 'zod'
import {
  MOCK_PRODUCT_PRICING_RECORDS,
  type MockProductPricingRecord,
} from '@/testing/moq-pricing-table'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ShippingOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceMultiplier: z.number().min(0),
  estimatedDaysMin: z.number().int().min(0),
  estimatedDaysMax: z.number().int().min(0).optional(),
})

export const ShowPricingCalculatorInputSchema = z.object({
  productIdOrName: z
    .string()
    .min(1)
    .describe('Product id (slug), or product name e.g. "Folding Carton Boxes"'),
})
export type ShowPricingCalculatorInput = z.infer<
  typeof ShowPricingCalculatorInputSchema
>

export const ShowPricingCalculatorOutputSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  unit: z.string(),
  minimumOrderQuantity: z.number(),
  baseUnitPrice: z.number(),
  currency: z.string(),
  shippingOptions: z.array(ShippingOptionSchema),
  defaultQuantity: z.number(),
  quantityStep: z.number(),
  maxQuantity: z.number(),
})
export type ShowPricingCalculatorOutput = z.infer<
  typeof ShowPricingCalculatorOutputSchema
>

// ─── Lookup ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[&]/g, 'and')
}

function findProduct(input: string): MockProductPricingRecord | null {
  const normalized = normalize(input)
  return (
    MOCK_PRODUCT_PRICING_RECORDS.find(
      (r) =>
        r.isActive &&
        (r.id === normalized ||
          r.slug === normalized ||
          normalize(r.productName) === normalized ||
          r.slug.replace(/-/g, ' ') === normalized),
    ) ?? null
  )
}

// ─── Tool ────────────────────────────────────────────────────────────────────

export const showPricingCalculatorTool = tool({
  description:
    'Use this when the customer asks about pricing, cost, or "how much" for a specific packaging product. Call it with the product they mentioned (e.g. folding carton boxes, corrugated boxes, rigid boxes, mailers, pouches) to show the pricing calculator.',
  inputSchema: ShowPricingCalculatorInputSchema,
  execute: async ({ productIdOrName }): Promise<ShowPricingCalculatorOutput> => {
    const product = findProduct(productIdOrName)
    if (!product) {
      const fallback = MOCK_PRODUCT_PRICING_RECORDS.find((r) => r.isActive)
      const p = fallback ?? MOCK_PRODUCT_PRICING_RECORDS[0]
      return buildOutput(p)
    }
    return buildOutput(product)
  },
})

const DEFAULT_SHIPPING_OPTIONS = [
  { id: 'na', label: 'North America', priceMultiplier: 1, estimatedDaysMin: 7, estimatedDaysMax: 12 },
  { id: 'eu', label: 'Europe', priceMultiplier: 1.08, estimatedDaysMin: 14, estimatedDaysMax: 21 },
  { id: 'asia', label: 'Asia Pacific', priceMultiplier: 1.06, estimatedDaysMin: 12, estimatedDaysMax: 18 },
  { id: 'other', label: 'Other regions', priceMultiplier: 1.12, estimatedDaysMin: 18, estimatedDaysMax: 28 },
] as const

function buildOutput(record: MockProductPricingRecord): ShowPricingCalculatorOutput {
  const min = record.minimumOrderQuantity
  const step = min >= 10000 ? 1000 : min >= 1000 ? 100 : 50
  const max = Math.max(min * 5, min + 10000)
  const defaultQty = Math.max(min, Math.min(5000, min * 2))
  return ShowPricingCalculatorOutputSchema.parse({
    productId: record.id,
    productName: record.productName,
    unit: record.unit,
    minimumOrderQuantity: record.minimumOrderQuantity,
    baseUnitPrice: record.baseUnitPrice,
    currency: record.currency,
    shippingOptions: DEFAULT_SHIPPING_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      priceMultiplier: o.priceMultiplier,
      estimatedDaysMin: o.estimatedDaysMin,
      estimatedDaysMax: o.estimatedDaysMax,
    })),
    defaultQuantity: defaultQty,
    quantityStep: step,
    maxQuantity: max,
  })
}

// ─── System guidance ─────────────────────────────────────────────────────────

export const showPricingCalculatorGuidance = `
- Call show_pricing_calculator when the customer asks for pricing, cost, or "how much" for a specific product (e.g. folding cartons, corrugated boxes, rigid boxes, mailers, pouches, inserts, labels).
- Pass productIdOrName as the product they asked about; use slug or product name from our catalog.
- After calling the tool, give a short reply that the calculator is below and they can add multiple quantities and choose shipping to compare.
`.trim()
