import { stepCountIs } from 'ai'
import { startProjectInquiryTool } from '@/lib/tools/start-project-inquiry'

export const csAgentTools = {
  start_project_inquiry: startProjectInquiryTool,
}

export const csAgentConfig = {
  tools: csAgentTools,
  activeTools: ['start_project_inquiry'] as Array<'start_project_inquiry'>,
  toolChoice: 'auto' as const,
  stopWhen: stepCountIs(2),
  maxTokens: 300,
}
