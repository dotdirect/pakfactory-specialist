import { tool } from 'ai'
import { z } from 'zod'
import { buildSyncProjectBriefOutput } from './sync-project-brief'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureProfileTool = tool({
  description:
    'Call this once you have collected the user\'s first name, last name, and email. Phone and company are optional.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const result = buildSyncProjectBriefOutput({
      customerFirstName: input.firstName,
      customerLastName: input.lastName,
      customerEmail: input.email,
      customerPhone: input.phone,
      customerCompany: input.company,
    })
    return { ...result }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureProfileGuidance = `
Step: Profile
Goal: Collect the user's first name, last name, and email in a single warm message.
Optional: phone number, company name.
When you have firstName + lastName + email, call capture_profile immediately.
Do not ask for any information beyond this step's scope.
`.trim()
