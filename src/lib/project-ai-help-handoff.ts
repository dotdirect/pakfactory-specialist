import {
  ProjectAiHelpHandoffSchema,
  type ProjectAiHelpHandoff,
} from '@/types/project-ai-handoff'

const PROJECT_AI_HELP_HANDOFF_KEY = 'project-ai-help-handoff'

export function storeProjectAiHelpHandoff(handoff: ProjectAiHelpHandoff) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    PROJECT_AI_HELP_HANDOFF_KEY,
    JSON.stringify(handoff),
  )
}

export function consumeProjectAiHelpHandoff(): ProjectAiHelpHandoff | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.sessionStorage.getItem(PROJECT_AI_HELP_HANDOFF_KEY)
  if (!raw) {
    return null
  }

  window.sessionStorage.removeItem(PROJECT_AI_HELP_HANDOFF_KEY)

  try {
    const parsed = ProjectAiHelpHandoffSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
