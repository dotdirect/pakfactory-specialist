import { stepCountIs } from 'ai'
import { syncProjectBriefTool } from '@/lib/tools/sync-project-brief'

export const specialistAgentTools = {
  sync_project_brief: syncProjectBriefTool,
}

export const specialistAgentConfig = {
  tools: specialistAgentTools,
  activeTools: ['sync_project_brief'] as Array<'sync_project_brief'>,
  toolChoice: 'auto' as const,
  stopWhen: stepCountIs(3),
  maxTokens: 300,
}
