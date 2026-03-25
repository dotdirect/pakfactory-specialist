import { syncProjectBriefGuidance } from '@/lib/tools/sync-project-brief'
import { SpecialistAgentSkillMarkdown } from '@/lib/prompts/skills/generated'
import {
  buildPromptFromSkillDocument,
  parsePromptSkillMarkdown,
} from '@/lib/prompts/skills/loader'

// SCALE: Prompt receives currentPhase and missingFields from API. To change what the AI focuses on, adjust the phased hint text and/or the brief-collection config that produces missingFields.

const parsedSpecialistSkill = parsePromptSkillMarkdown(SpecialistAgentSkillMarkdown)

const BASE_PROMPT = buildPromptFromSkillDocument(parsedSpecialistSkill, {
  requiredSectionTitles: ['Role', 'Mission', 'Conversation Rules', 'Packaging Context'],
  appendBlocks: [syncProjectBriefGuidance],
})

const PHASED_HINT = `
You are collecting a packaging RFQ brief in phases.

CURRENT PHASE: {currentPhase}
MISSING IN THIS PHASE: {missingFields}

1. Identity → Must complete before anything else (firstName, lastName, email — required; phone and company — optional, accept if offered but do not block on them). When you have all required identity fields, call sync_project_brief once with those fields, then move to the next phase.
2. Context → Collect industry + productItem to enable recommendations.
   Also ask for a short project summary (what the product is, target audience/use case, and any goals or constraints) in the same message, and pass it as projectSummary.
3. Recommend → If no product selected, suggest from our catalog based on context.
4. Visual → Offer to generate a sample preview image (can be deferred).
5. Completion → Collect dimensions, quantity, specs for final quote.

Question strategy:
- Start each phase with one comprehensive intake question that asks for all key fields in that phase at once.
- Do not split related required fields across separate turns when they can be asked together.
- Avoid splitting the first ask into many micro-questions.
- After the intake question, ask follow-ups only for required fields that are still missing in MISSING IN THIS PHASE.
- Per-phase bundled asks:
  - Identity: Ask for first name, last name, and email in one message (optionally phone/company).
  - Context: Ask for industry, productItem, and a short project summary in one message (optionally annual budget).
  - Recommend: Ask for preferred productLine and packagingStyle in one message.
  - Visual: Ask in one message whether they want a sample preview image now or later.
  - Completion: Ask for dimensions, quantity, delivery country, and key specs/details in one message.
- Preferred phrasing style: one short grouped question sentence + optional clause for extras.

Conversation strategy:
- Focus on completing the current phase before moving forward.
- If the user volunteers info from a later phase or optional profile details, capture it immediately with sync_project_brief (one bundled call), then guide back to current phase gaps.
- If MISSING IN THIS PHASE is "none", acknowledge completion and move to the next phase with one concise transition question.
`

const MUST_SYNC_THIS_TURN_HINT = `
CRITICAL: The user's last message contains relevant brief information. You MUST call sync_project_brief in this turn with all newly provided fields before replying. Do not say the brief is updated without calling the tool.
`.trim()

/**
 * Returns the system prompt, optionally extended with phased hint and missing fields.
 * When mustSyncThisTurn is true, appends an explicit instruction to call sync_project_brief this turn.
 */
export function buildSpecialistPrompt(
  missingFields?: string[],
  currentPhase?: string,
  mustSyncThisTurn?: boolean,
): string {
  const phase = currentPhase ?? '1. Identity'
  const missing = missingFields?.length
    ? missingFields.join(', ')
    : 'none'

  const phasedBlock = PHASED_HINT.replace('{currentPhase}', phase).replace(
    '{missingFields}',
    missing,
  )

  let prompt = BASE_PROMPT + phasedBlock

  if (!missingFields?.length) {
    prompt +=
      '\n\nAll key fields for the current phase are collected. Confirm completion briefly, then move to the next phase with one concise transition question.'
  }

  if (mustSyncThisTurn) {
    prompt += '\n\n' + MUST_SYNC_THIS_TURN_HINT
  }

  return prompt
}
