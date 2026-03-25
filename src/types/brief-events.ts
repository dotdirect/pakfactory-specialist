import { z } from 'zod'
import { CustomerSchema, IntentSchema, ProductSpecsSchema, ProjectContextSchema, TimelineSchema } from './brief'

// SCALE: New fields need matching event payloads. Keep in sync with brief.ts and sync-project-brief tool output.

export const BriefEventSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('brief.identity.confirmed'),
    data: CustomerSchema.partial(),
  }),
  z.object({
    action: z.literal('brief.intent.confirmed'),
    data: IntentSchema,
  }),
  z.object({
    action: z.literal('brief.product.added'),
    data: z.object({
      productId: z.string(),
      productName: z.string(),
      category: z.string(),
      quantity: z.number().int().positive().default(1),
      imageUrl: z.string().url().optional(),
    }),
  }),
  z.object({
    action: z.literal('brief.product.removed'),
    data: z.object({
      lineItemId: z.string().uuid(),
    }),
  }),
  z.object({
    action: z.literal('brief.specs.confirmed'),
    data: z.object({
      lineItemId: z.string().uuid(),
      specs: ProductSpecsSchema,
    }),
  }),
  z.object({
    action: z.literal('brief.timeline.confirmed'),
    data: TimelineSchema,
  }),
  z.object({
    action: z.literal('brief.project.context_confirmed'),
    data: ProjectContextSchema.partial(),
  }),
  z.object({
    action: z.literal('brief.submitted'),
    data: z.object({
      briefId: z.string().uuid(),
      submittedAt: z.string().datetime(),
    }),
  }),
])

export type BriefEvent = z.infer<typeof BriefEventSchema>
