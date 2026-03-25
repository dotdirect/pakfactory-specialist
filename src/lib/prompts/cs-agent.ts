import { startProjectInquiryGuidance } from '@/lib/tools/start-project-inquiry'
import { showPricingCalculatorGuidance } from '@/lib/tools/show-pricing-calculator'
import { CsAgentSkillMarkdown } from '@/lib/prompts/skills/generated'
import {
  buildPromptFromSkillDocument,
  parsePromptSkillMarkdown,
} from '@/lib/prompts/skills/loader'

const parsedCsSkill = parsePromptSkillMarkdown(CsAgentSkillMarkdown)

export const csAgentSystemPrompt = buildPromptFromSkillDocument(parsedCsSkill, {
  requiredSectionTitles: ['Role', 'Mission', 'Conversation Rules', 'Key Information'],
  appendBlocks: [startProjectInquiryGuidance, showPricingCalculatorGuidance],
})
