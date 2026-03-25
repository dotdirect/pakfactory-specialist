import { tool } from 'ai'
import { z } from 'zod'
import { BriefEventSchema } from '@/types/brief-events'
import type { BriefEvent } from '@/types/brief-events'

// ─── Schemas ─────────────────────────────────────────────────────────────────
// SCALE: New collectible fields go in input schema; map each to the right event in execute. Update syncProjectBriefGuidance so the AI knows to extract them.

export const SyncProjectBriefInputSchema = z.object({
  summary: z.string().min(1).optional(),
  projectSummary: z.string().min(1).optional(),
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
  projectPDF: z.string().url().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().min(1).optional(),
})
export type SyncProjectBriefInput = z.infer<typeof SyncProjectBriefInputSchema>

export const SyncProjectBriefOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  changedFields: z.array(z.string().min(1)),
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

function deriveProjectSummary(input: SyncProjectBriefInput): string | undefined {
  if (input.projectSummary?.trim()) return input.projectSummary.trim()
  if (input.details?.trim()) return input.details.trim()

  const projectFacts = [
    input.productItem ? `Product: ${input.productItem}` : undefined,
    input.productLine ? `Line: ${input.productLine}` : undefined,
    input.packagingStyle ? `Style: ${input.packagingStyle}` : undefined,
    input.dimensions ? `Dimensions: ${input.dimensions}` : undefined,
    input.quantityList?.length ? `Quantities: ${input.quantityList.join(', ')}` : undefined,
    input.deliveryCountry ? `Delivery: ${input.deliveryCountry}` : undefined,
  ].filter(Boolean)

  if (projectFacts.length > 0) return projectFacts.join(' | ')
  return undefined
}

function deriveOutputSummary(inputSummary: string | undefined, changedFields: string[]): string {
  if (inputSummary?.trim()) return inputSummary.trim()
  if (changedFields.length === 0) return 'No brief changes were detected.'
  return `Captured ${changedFields.length} brief update${changedFields.length === 1 ? '' : 's'}.`
}

/** Reusable mapper for any server flow that needs to translate collected fields into brief events. */
export function buildSyncProjectBriefOutput(input: SyncProjectBriefInput): SyncProjectBriefOutput {
  const events: BriefEvent[] = []
  const changedFields: string[] = []
  const appliedUpdates: string[] = []
  const projectSummary = deriveProjectSummary(input)

  const markChanged = (field: string, description: string) => {
    changedFields.push(field)
    appliedUpdates.push(description)
  }

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
    if (name) markChanged('customer.name', 'Captured customer name')
    if (input.customerFirstName) markChanged('customer.firstName', 'Captured first name')
    if (input.customerLastName) markChanged('customer.lastName', 'Captured last name')
    if (input.customerEmail) markChanged('customer.email', 'Captured email')
    if (input.customerCompany) markChanged('customer.company', 'Captured company')
    if (input.customerPhone) markChanged('customer.phone', 'Captured phone')
    if (input.customerIndustry) markChanged('customer.industry', 'Captured industry')
    if (input.customerAnnualBudget != null) markChanged('customer.annualBudget', 'Captured annual budget')
  }

  const hasProjectContext =
    input.productItem ||
    input.productLine ||
    input.packagingStyle ||
    projectSummary ||
    input.dimensions ||
    input.deliveryCountry ||
    input.quantityList?.length ||
    input.materials ||
    input.finishes ||
    input.addOns ||
    input.details ||
    input.projectPDF
  if (hasProjectContext) {
    events.push({
      action: 'brief.project.context_confirmed',
      data: {
        productItem: input.productItem,
        productLine: input.productLine,
        packagingStyle: input.packagingStyle,
        dimensions: input.dimensions,
        deliveryCountry: input.deliveryCountry,
        summary: projectSummary,
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
        projectPDF: input.projectPDF,
      },
    })
    if (input.productItem) markChanged('project.productItem', 'Captured product item')
    if (input.productLine) markChanged('project.productLine', 'Captured product line')
    if (input.packagingStyle) markChanged('project.packagingStyle', 'Captured packaging style')
    if (input.dimensions) markChanged('project.dimensions', 'Captured dimensions')
    if (input.deliveryCountry) markChanged('project.deliveryCountry', 'Captured delivery country')
    if (projectSummary) markChanged('project.summary', 'Updated project summary')
    if (input.quantityList?.length) markChanged('project.quantity', 'Captured quantity list')
    if (input.materials) markChanged('project.customizations.materials', 'Captured materials')
    if (input.finishes) markChanged('project.customizations.finishes', 'Captured finishes')
    if (input.addOns) markChanged('project.customizations.addOns', 'Captured add-ons')
    if (input.details) markChanged('project.details', 'Captured project details')
    if (input.projectPDF) markChanged('project.projectPDF', 'Linked project document')
  }

  if (input.intentType) {
    events.push({
      action: 'brief.intent.confirmed',
      data: {
        type: input.intentType,
        entryChannel: 'webchat',
      },
    })
    markChanged('intent.type', 'Captured project intent')
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
    markChanged('lineItems', 'Added a project line item')
  }

  if (input.urgency) {
    events.push({
      action: 'brief.timeline.confirmed',
      data: { urgency: input.urgency },
    })
    markChanged('timeline.urgency', 'Captured timeline urgency')
  }

  return SyncProjectBriefOutputSchema.parse({
    title: 'Project brief updated',
    summary: deriveOutputSummary(input.summary, changedFields),
    changedFields,
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
}

// ─── Tool ────────────────────────────────────────────────────────────────────
// SCALE: execute maps input fields to BriefEvent payloads; add branches for new fields and emit corresponding events.

export const syncProjectBriefTool = tool({
  description:
    'Use this whenever the customer provides project details that should update the quote brief, such as intent, product, quantity, urgency, or contact information.',
  inputSchema: SyncProjectBriefInputSchema,
  execute: async (input) => buildSyncProjectBriefOutput(input),
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const syncProjectBriefGuidance = `
Tool policy:
- Call sync_project_brief whenever the user provides any new relevant brief information (required or optional), not only when a phase is complete.
- Make at most one sync_project_brief tool call per assistant turn. Bundle all newly provided fields into that one call.
- If the latest user message contains relevant brief info and you do not call the tool, the brief will not update. Never say "I've updated", "I've saved", or "brief is updated" without calling sync_project_brief in this turn.
- Use intentType when the customer is clearly requesting a quote, recommendations, or general inquiry support.
- Before the tool call, ask one comprehensive intake question for the current phase, then use follow-up questions only for required fields that remain missing.
- Avoid serial micro-questions for related required fields; group them in one ask whenever possible.
- Identity (Phase 1): Include customerFirstName, customerLastName, customerName, customerEmail, customerCompany, customerPhone, customerIndustry, customerAnnualBudget when shared. Required to complete phase: firstName + lastName + email.
- Context (Phase 2): Use productItem for "what product are you packaging?" and customerIndustry for industry.
  In the same grouped ask, request a short descriptive project brief (use case, audience, goals/constraints) and map it to projectSummary.
- Recommend (Phase 3): Gather productLine and packagingStyle together when possible.
- Visual (Phase 4): Gather preview preference in one concise ask (now vs later).
- Completion (Phase 5): Gather dimensions, quantityList, deliveryCountry, and customization/details together when possible.
- Project context: Use projectSummary, productLine, packagingStyle, dimensions, deliveryCountry, quantityList, materials, finishes, addOns, details, and projectPDF when the customer provides them.
- If projectSummary is missing, synthesize a concise one from known project fields in this tool call.
- Keep output summary concise for UI confirmation; use projectSummary for persisted brief.project.summary.
- Include productName, productCategory, quantity for line items (brief.product.added), and urgency for timeline.
- After the tool call, continue with a short confirmation and one concise transition question for the next phase.
`.trim()
