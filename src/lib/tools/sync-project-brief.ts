import { tool } from 'ai'
import { z } from 'zod'
import { BriefEventSchema } from '@/types/brief-events'
import type { BriefEvent } from '@/types/brief-events'

// ─── Schemas ─────────────────────────────────────────────────────────────────
// SCALE: New collectible fields go in input schema; map each to the right event in execute. Update syncProjectBriefGuidance so the AI knows to extract them.

export const SyncProjectBriefInputSchema = z.object({
  summary: z.string().min(1),
  intentType: z.enum(['rfq', 'recommend', 'add_to_quote', 'inquiry']).optional(),
  customerName: z.string().min(1).optional(),
  customerFirstName: z.string().min(1).optional(),
  customerLastName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerCompany: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  customerIndustry: z.string().min(1).optional(),
  customerAnnualBudget: z.coerce.number().optional(),
  productName: z.string().min(1).optional(),
  productCategory: z.string().min(1).optional(),
  productItem: z.string().min(1).optional(),
  productLine: z.string().min(1).optional(),
  packagingStyle: z.string().min(1).optional(),
  dimensions: z.string().min(1).optional(),
  deliveryCountry: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  quantityList: z.array(z.coerce.number().int().positive()).optional(),
  materials: z.string().optional(),
  finishes: z.string().optional(),
  addOns: z.string().optional(),
  details: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().min(1).optional(),
})
export type SyncProjectBriefInput = z.infer<typeof SyncProjectBriefInputSchema>

export const SyncProjectBriefOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  appliedUpdates: z.array(z.string().min(1)),
  events: z.array(BriefEventSchema),
  notes: z.string().min(1).optional(),
  nextQuestion: z.string().min(1).optional(),
})
export type SyncProjectBriefOutput = z.infer<typeof SyncProjectBriefOutputSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toProductId(productName: string) {
  return productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── Tool ────────────────────────────────────────────────────────────────────
// SCALE: execute maps input fields to BriefEvent payloads; add branches for new fields and emit corresponding events.

export const syncProjectBriefTool = tool({
  description:
    'Use this whenever the customer provides project details that should update the quote brief, such as intent, product, quantity, urgency, or contact information.',
  inputSchema: SyncProjectBriefInputSchema,
  execute: async (input) => {
    const events: BriefEvent[] = []
    const appliedUpdates: string[] = []

    const hasIdentity =
      input.customerName ||
      input.customerFirstName ||
      input.customerLastName ||
      input.customerEmail ||
      input.customerCompany ||
      input.customerPhone ||
      input.customerIndustry != null ||
      input.customerAnnualBudget != null
    if (hasIdentity) {
      const name =
        input.customerName ??
        ([input.customerFirstName, input.customerLastName].filter(Boolean).join(' ') || undefined)
      events.push({
        action: 'brief.identity.confirmed',
        data: {
          name,
          firstName: input.customerFirstName,
          lastName: input.customerLastName,
          email: input.customerEmail,
          company: input.customerCompany,
          phone: input.customerPhone,
          industry: input.customerIndustry,
          annualBudget: input.customerAnnualBudget,
        },
      })
      appliedUpdates.push('Captured customer identity')
    }

    const hasProjectContext =
      input.productItem ||
      input.productLine ||
      input.packagingStyle ||
      input.dimensions ||
      input.deliveryCountry ||
      input.quantityList?.length ||
      input.materials ||
      input.finishes ||
      input.addOns ||
      input.details
    if (hasProjectContext) {
      events.push({
        action: 'brief.project.context_confirmed',
        data: {
          productItem: input.productItem,
          productLine: input.productLine,
          packagingStyle: input.packagingStyle,
          dimensions: input.dimensions,
          deliveryCountry: input.deliveryCountry,
          quantity: input.quantityList,
          customizations:
            input.materials || input.finishes || input.addOns
              ? {
                  materials: input.materials,
                  finishes: input.finishes,
                  addOns: input.addOns,
                }
              : undefined,
          details: input.details,
        },
      })
      appliedUpdates.push('Updated project context')
    }

    if (input.intentType) {
      events.push({
        action: 'brief.intent.confirmed',
        data: {
          type: input.intentType,
          entryChannel: 'webchat',
        },
      })
      appliedUpdates.push('Updated project intent')
    }

    if (input.productName) {
      events.push({
        action: 'brief.product.added',
        data: {
          productId: toProductId(input.productName),
          productName: input.productName,
          category: input.productCategory ?? 'custom-packaging',
          quantity: input.quantity ?? 1,
        },
      })
      appliedUpdates.push('Added a project line item')
    }

    if (input.urgency) {
      events.push({
        action: 'brief.timeline.confirmed',
        data: { urgency: input.urgency },
      })
      appliedUpdates.push('Captured timeline urgency')
    }

    return SyncProjectBriefOutputSchema.parse({
      title: 'Project brief updated',
      summary: input.summary,
      appliedUpdates,
      events,
      notes: input.notes,
      nextQuestion:
        input.productName && !input.quantity
          ? 'What quantity range are you targeting for this packaging project?'
          : input.customerEmail
            ? 'What product specifications should we define next?'
            : 'What contact and project details should we capture next for the quote?',
    })
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const syncProjectBriefGuidance = `
Tool policy:
- Call sync_project_brief whenever the customer provides concrete project details that belong in a quote brief.
- Prefer one concise tool call that captures all newly learned details from the latest turn.
- Use intentType when the customer is clearly requesting a quote, recommendations, or general inquiry support.
- Identity (Phase 1): Include customerFirstName, customerLastName, customerName, customerEmail, customerCompany, customerPhone as soon as any are mentioned. Use customerIndustry and customerAnnualBudget when shared.
- Context (Phase 2): Use productItem for "what product are you packaging?" and customerIndustry for industry.
- Project context: Use productLine, packagingStyle, dimensions, deliveryCountry, quantityList, materials, finishes, addOns, details when the customer provides them.
- Include productName, productCategory, quantity for line items (brief.product.added), and urgency for timeline.
- After the tool call, continue with a short conversational reply and ask the single most useful next question.
`.trim()
