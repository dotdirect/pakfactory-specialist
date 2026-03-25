import { stepCountIs } from 'ai'
import { startProjectInquiryTool } from '@/lib/tools/start-project-inquiry'
import { showPricingCalculatorTool } from '@/lib/tools/show-pricing-calculator'

export const csAgentTools = {
  start_project_inquiry: startProjectInquiryTool,
  show_pricing_calculator: showPricingCalculatorTool,
}

export const csAgentConfig = {
  tools: csAgentTools,
  activeTools: [
    'start_project_inquiry',
    'show_pricing_calculator',
  ] as Array<'start_project_inquiry' | 'show_pricing_calculator'>,
  toolChoice: 'auto' as const,
  stopWhen: stepCountIs(2),
  maxTokens: 300,
}
