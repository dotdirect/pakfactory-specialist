import { z } from 'zod'

// SCALE: To collect more customer or project fields, add them here and in brief-events.ts; then extend sync-project-brief tool input and brief-collection config. See plan "Brief builder customer info fix" → Phased brief collection strategy.

export const BriefStatusSchema = z.enum([
  'draft',
  'in_progress',
  'complete',
  'submitted',
])
export type BriefStatus = z.infer<typeof BriefStatusSchema>

export const CustomerInfoSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  annualBudget: z.coerce.number().optional(),
  shopifyCustomerId: z.string().optional(),
})
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>

/** Phase 2–5 project-level context (productItem, productLine, specs, etc.). */
export const ProjectCustomizationsSchema = z.object({
  materials: z.string().optional(),
  customization: z.string().optional(),
  finishes: z.string().optional(),
  addOns: z.string().optional(),
})
export type ProjectCustomizations = z.infer<typeof ProjectCustomizationsSchema>

export const ProjectContextSchema = z.object({
  productItem: z.string().optional(),
  productLine: z.string().optional(),
  packagingStyle: z.string().optional(),
  dimensions: z.string().optional(),
  deliveryCountry: z.string().optional(),
  quantity: z.array(z.coerce.number().int().positive()).optional(),
  customizations: ProjectCustomizationsSchema.optional(),
  details: z.string().optional(),
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

export const TechnicalBriefSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().optional(),
  status: BriefStatusSchema,
  customerInfo: CustomerInfoSchema.optional(),
  intent: IntentSchema.optional(),
  lineItems: z.array(LineItemSchema).default([]),
  timeline: TimelineSchema.optional(),
  notes: z.string().optional(),
  /** Phase 2–5: productItem, productLine, dimensions, deliveryCountry, customizations, etc. */
  project: ProjectContextSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  submittedAt: z.string().datetime().optional(),
})
export type TechnicalBrief = z.infer<typeof TechnicalBriefSchema>
