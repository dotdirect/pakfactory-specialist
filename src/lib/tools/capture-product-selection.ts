import { tool } from 'ai'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { BriefEvent } from '@/types/brief-events'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const ProductCustomizationsSchema = z.object({
  material: z.string().optional(),
  finish: z.string().optional(),
  structuralAddOns: z.string().optional(),
  other: z.string().optional(),
})

const SelectedProductSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  handle: z.string().optional(),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
  quantities: z.array(z.number().int().positive()).min(1).max(3),
  dimensions: z.string().optional(),
  customizations: ProductCustomizationsSchema.optional(),
})

const inputSchema = z.object({
  products: z.array(SelectedProductSchema).min(1).max(3),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureProductSelectionTool = tool({
  description:
    'Call this once the user has confirmed their product selection (up to 3 products). Include all quantities, dimensions, and customization choices per product.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const events: BriefEvent[] = []
    const changedFields: string[] = []
    const appliedUpdates: string[] = []

    for (const product of input.products) {
      const primaryQty = product.quantities[0] ?? 1

      const specs =
        product.dimensions ||
        product.customizations?.material ||
        product.customizations?.finish ||
        product.customizations?.structuralAddOns ||
        product.customizations?.other
          ? {
              materials: product.customizations?.material
                ? [product.customizations.material]
                : undefined,
              finishes: product.customizations?.finish
                ? [product.customizations.finish]
                : undefined,
              structuralAddOns: product.customizations?.structuralAddOns,
              customNotes: [
                product.dimensions ? `Dimensions: ${product.dimensions}` : undefined,
                product.customizations?.other,
              ]
                .filter(Boolean)
                .join(' | ') || undefined,
            }
          : undefined

      events.push({
        action: 'brief.product.added',
        data: {
          productId: product.productId || uuidv4(),
          productName: product.productName,
          handle: product.handle,
          category: product.category,
          quantity: primaryQty,
          quantities: product.quantities,
          imageUrl: product.imageUrl,
          specs,
        },
      })

      changedFields.push(`lineItems.${product.productName}`)
      appliedUpdates.push(`Added ${product.productName} (qty: ${product.quantities.join(', ')})`)
    }

    return {
      title: 'Products selected',
      summary: `Selected ${input.products.length} product${input.products.length === 1 ? '' : 's'} for the quote.`,
      changedFields,
      appliedUpdates,
      events,
    }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureProductSelectionGuidance = `
Step: Product Selection
Goal: Help the user pick up to 3 products from the recommendations shown.
For each selected product, collect:
  - Requested quote quantity (up to 3 different quantity tiers, e.g. 500, 1000, 2000)
  - Project item dimensions (LxWxH format, e.g. 10x5x2)
  - Customization preferences: Material, Finish, Structural Add-ons, Other
Ask for all per-product details in one grouped message per product.
Once all selections are confirmed, call capture_product_selection with the full product array.
`.trim()
