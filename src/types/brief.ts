import { z } from 'zod'

// SCALE: Nested customer/project/metadata schema. Add fields here and in brief-events.ts; extend sync-project-brief tool input and brief-collection config as needed.

export const BriefStatusSchema = z.enum([
  'draft',
  'in_progress',
  'complete',
  'submitted',
])
export type BriefStatus = z.infer<typeof BriefStatusSchema>

/** Customer (nested under brief.customer). Optional fields for in-app collection. */
export const CustomerSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(7, 'Phone number required').optional(),
  company: z.string().min(1, 'Company name required').optional(),
  annualBudget: z.coerce.number().optional(),
  industry: z.string().optional(),
})
export type Customer = z.infer<typeof CustomerSchema>

/** @deprecated Use Customer. Kept for event payload compatibility. */
export type CustomerInfo = Customer

/** Phase 2–5 project-level customizations. */
export const ProjectCustomizationsSchema = z.object({
  materials: z.string().optional(),
  customization: z.string().optional(),
  finishes: z.string().optional(),
  addOns: z.string().optional(),
})
export type ProjectCustomizations = z.infer<typeof ProjectCustomizationsSchema>

/** Project context (nested under brief.project). Optional for in-app collection. */
export const ProjectContextSchema = z.object({
  productItem: z.string().optional(),
  productLine: z.string().optional(),
  packagingStyle: z.string().optional(),
  deliveryCountry: z.string().optional(),
  summary: z.string().optional(),
  details: z.string().optional(),
  quantity: z.array(z.coerce.number().int().positive()).optional(),
  dimensions: z
    .string()
    .regex(/^[0-9]+x[0-9]+x[0-9]+$/, 'Format must be LxWxH')
    .optional(),
  customizations: ProjectCustomizationsSchema.optional(),
  projectPDF: z.string().url().optional(),
})
export type ProjectContext = z.infer<typeof ProjectContextSchema>

export const IntentSchema = z.object({
  type: z.enum(['rfq', 'recommend', 'add_to_quote', 'inquiry']),
  entryChannel: z.enum(['webchat', 'phone', 'email']),
})
export type Intent = z.infer<typeof IntentSchema>

export const DimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  unit: z.enum(['mm', 'cm', 'in']),
})
export type Dimensions = z.infer<typeof DimensionsSchema>

export const ProductSpecsSchema = z.object({
  dimensions: DimensionsSchema.optional(),
  materials: z.array(z.string()).optional(),
  printMethod: z.string().optional(),
  finishes: z.array(z.string()).optional(),
  quantity: z.number().int().positive().optional(),
  customNotes: z.string().optional(),
})
export type ProductSpecs = z.infer<typeof ProductSpecsSchema>

export const LineItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string(),
  productName: z.string(),
  category: z.string(),
  quantity: z.number().int().positive(),
  specs: ProductSpecsSchema.optional(),
  imageUrl: z.string().url().optional(),
  addedAt: z.string().datetime(),
})
export type LineItem = z.infer<typeof LineItemSchema>

export const TimelineSchema = z.object({
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  deadline: z.string().datetime().optional(),
})
export type Timeline = z.infer<typeof TimelineSchema>

/** Metadata (source, tokenUsage). Optional for in-app. */
export const MetadataSchema = z.object({
  source: z.literal('PakSpecialist_RFQ').optional(),
  sourceObj: z.record(z.string(), z.unknown()).optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
      total: z.number(),
    })
    .optional(),
})
export type Metadata = z.infer<typeof MetadataSchema>

export const TechnicalBriefSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().optional(),
  status: BriefStatusSchema,
  customer: CustomerSchema.optional(),
  intent: IntentSchema.optional(),
  lineItems: z.array(LineItemSchema).default([]),
  timeline: TimelineSchema.optional(),
  notes: z.string().optional(),
  project: ProjectContextSchema.optional(),
  metadata: MetadataSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  submittedAt: z.string().datetime().optional(),
})
export type TechnicalBrief = z.infer<typeof TechnicalBriefSchema>
