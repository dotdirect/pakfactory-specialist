import { tool } from 'ai'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { BriefEvent } from '@/types/brief-events'
import type { StepToolOutput } from '@/lib/steps/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  addAnother: z
    .boolean()
    .describe(
      'True if the user wants to add another project, false to proceed to review',
    ),
})

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const captureAddProjectTool = tool({
  description:
    'Call this after the user answers whether they want to add another project to their quote. Set addAnother to true if yes, false if no.',
  inputSchema,
  execute: async (input): Promise<StepToolOutput> => {
    const projectEntryId = uuidv4()
    const events: BriefEvent[] = [
      {
        action: 'brief.project.archived',
        data: { projectEntryId },
      },
    ]

    if (input.addAnother) {
      return {
        title: 'Adding another project',
        summary: 'Current project saved. Starting a new project.',
        changedFields: ['projects'],
        appliedUpdates: ['Archived current project to projects array'],
        events,
        nextStep: 'project-details',
      }
    }

    return {
      title: 'Projects complete',
      summary: 'All projects saved. Ready for review.',
      changedFields: ['projects'],
      appliedUpdates: ['Archived current project to projects array'],
      events,
      nextStep: 'review',
    }
  },
})

// ─── System guidance ─────────────────────────────────────────────────────────

export const captureAddProjectGuidance = `
Step: Add Another Project
Goal: Ask the user one clear question: "Would you like to add another project to this quote?"
Briefly summarize what was just completed (product, quantities) to give context.
As soon as they answer, call capture_add_project with addAnother: true or false.
Do NOT discuss pricing or timelines. Just capture their yes/no decision.
`.trim()
