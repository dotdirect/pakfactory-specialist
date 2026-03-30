import { tool } from 'ai'
import { z } from 'zod'

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const StartProjectInquiryInputSchema = z.object({
  reason: z.string().min(1),
})
export type StartProjectInquiryInput = z.infer<typeof StartProjectInquiryInputSchema>

export const ProjectInquiryOptionSchema = z.object({
  label: z.string().min(1),
  route: z.string().min(1),
  variant: z.enum(['default', 'outline']).optional(),
})
export type ProjectInquiryOption = z.infer<typeof ProjectInquiryOptionSchema>

export const StartProjectInquiryOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  options: z.array(ProjectInquiryOptionSchema).min(1),
  secondaryActionLabel: z.string().min(1),
})
export type StartProjectInquiryOutput = z.infer<typeof StartProjectInquiryOutputSchema>

// ─── Tool ────────────────────────────────────────────────────────────────────

export const startProjectInquiryTool = tool({
  description:
    'Use this when the customer is ready for a quote, wants product recommendations that should move into the project builder, or asks to start a packaging project.',
  inputSchema: StartProjectInquiryInputSchema,
  execute: async ({ reason }) =>
    StartProjectInquiryOutputSchema.parse({
      title: 'Ready to start a project inquiry?',
      description: reason,
      options: [
        {
          label: 'Start Project Brief',
          route: '/project-brief?from=help-center',
        },
      ],
      secondaryActionLabel: 'Keep chatting',
    }),
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const startProjectInquiryGuidance = `
Tool policy:
- Call start_project_inquiry when the customer is clearly ready to request a quote, start a project, or move from general help into a packaging inquiry.
- When you call start_project_inquiry, provide a short "reason" that can be shown in the UI card.
- After using the tool, continue with a brief natural-language reply that acknowledges the next step without repeating the full card copy.
- Do not call the tool for general educational questions when the customer is still exploring and not ready to move forward.
`.trim()
