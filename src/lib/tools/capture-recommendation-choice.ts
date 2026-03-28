import { tool } from 'ai'
import { z } from 'zod'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  wantsRecommendations: z.boolean(),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureRecommendationChoiceTool = tool({
  description:
    'Call this after presenting the product recommendation question and the user has clearly answered yes or no. Set wantsRecommendations to true if they want product recommendations, false if they want to submit directly.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const nextStep = input.wantsRecommendations ? 'product-select' : 'submit'

    return {
      title: input.wantsRecommendations
        ? 'Product recommendations requested'
        : 'Proceeding to submission',
      summary: input.wantsRecommendations
        ? 'User wants product recommendations before submitting.'
        : 'User skipped recommendations and is ready to submit.',
      changedFields: [],
      appliedUpdates: [],
      events: [],
      nextStep,
    }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureRecommendationChoiceGuidance = `
Step: Product Recommendation
Goal: Ask the user one clear question: "Would you like product recommendations based on your project details?"
Present it as a simple yes/no choice.
As soon as they answer, call capture_recommendation_choice with wantsRecommendations: true or false.
Do not recommend specific products yourself — the system will retrieve them automatically.
`.trim()
