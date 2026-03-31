import { tool } from 'ai'
import { z } from 'zod'
import type { BriefEvent } from '@/types/brief-events'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  phone: z.string().min(7).optional(),
  confirmed: z.boolean().describe('Whether the user confirmed the brief details are correct'),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureReviewTool = tool({
  description:
    'Call this once the user has confirmed the brief details are correct. Include their phone number if provided.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const events: BriefEvent[] = []

    if (input.phone) {
      events.push({
        action: 'brief.identity.confirmed',
        data: { phone: input.phone },
      })
    }

    return {
      title: 'Review complete',
      summary: 'Brief confirmed. Ready for submission.',
      changedFields: input.phone ? ['customer.phone'] : [],
      appliedUpdates: input.phone ? [`Phone: ${input.phone}`] : [],
      events,
      nextStep: 'submit',
      reviewReady: true,
    }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureReviewGuidance = `
Step: Review & Submit
Goal: Present a formatted summary of the collected project details. The system will show confirmation buttons — do NOT ask the user to confirm.

Format the summary EXACTLY like this, using only the sections that have data:

**User Profile**
- Name: [name]
- Email: [email]
- Company: [company]
- Industry: [industry]

**Project Details**
- Product: [product item]
- Delivery Country: [country]
- Summary: [project summary]

**Selected Products**
- [product name] — [category]

**Billing & Shipping**
- Address: [full address]

Rules:
- Only include sections that have data in the "Already Collected" section above.
- Do NOT include empty sections or fields.
- Do NOT ask "does everything look correct?" or any confirmation question — the system handles that with buttons.
- Do NOT call the tool yet. Wait for the user to confirm via the system buttons first.
- When the user confirms (says "Yes" or similar), call capture_review immediately with confirmed=true.
- If the phone number is NOT already collected, after user confirms ask for it before calling the tool.

Do NOT submit the brief — the system will show a submit button for the user to review and submit manually.
`.trim()
