import { tool } from 'ai'
import { z } from 'zod'
import type { BriefEvent } from '@/types/brief-events'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  stateProvince: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().min(7),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureBillingTool = tool({
  description:
    'Call this once the user has provided their full billing/shipping address and phone number.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const events: BriefEvent[] = [
      {
        action: 'brief.billing.confirmed',
        data: {
          street: input.street,
          city: input.city,
          stateProvince: input.stateProvince,
          postalCode: input.postalCode,
          country: input.country,
        },
      },
      {
        action: 'brief.identity.confirmed',
        data: { phone: input.phone },
      },
    ]

    const changedFields = ['billing.street', 'billing.city', 'billing.postalCode', 'billing.country', 'customer.phone']
    if (input.stateProvince) changedFields.push('billing.stateProvince')

    return {
      title: 'Billing & contact captured',
      summary: 'Captured billing address and phone number.',
      changedFields,
      appliedUpdates: [
        `Billing address: ${input.street}, ${input.city}, ${input.country}`,
        `Phone: ${input.phone}`,
      ],
      events,
      nextStep: 'submit',
    }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureBillingGuidance = `
Step: Billing & Contact
Goal: Collect the user's full shipping/billing address and phone number in one message.
Required: street, city, postal code, country, phone number.
Optional: state or province.
When you have all required fields, call capture_billing immediately.
`.trim()
