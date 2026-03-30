import type { StepId, FlowId } from './types'

// ─── FlowConfig ───────────────────────────────────────────────────────────────

export type FlowConfig = {
  id: FlowId
  label: string
  /** Ordered list of step keys — the sequence for this flow. */
  steps: StepId[]
  /** What happens when the last step completes (or when a step branches to 'submit'). */
  onComplete: 'submit-n8n'
}

// ─── Flow Registry ────────────────────────────────────────────────────────────
// Add new flows here by composing existing step keys.
// Steps are unaware of which flow they're in — the flow owns the sequence.

export const FLOW_CONFIGS: Record<FlowId, FlowConfig> = {
  'rfq-full': {
    id: 'rfq-full',
    label: 'Full RFQ',
    steps: ['profile', 'project-details', 'recommend', 'product-select', 'billing'],
    onComplete: 'submit-n8n',
  },

  'quick-inquiry': {
    id: 'quick-inquiry',
    label: 'Quick Inquiry',
    steps: ['profile', 'project-details'],
    onComplete: 'submit-n8n',
  },

  'direct-order': {
    id: 'direct-order',
    label: 'Direct Order',
    steps: ['profile', 'product-select', 'billing'],
    onComplete: 'submit-n8n',
  },
}

export function getFlowConfig(flowId: FlowId): FlowConfig {
  return FLOW_CONFIGS[flowId]
}

/** Returns the next step for the given current step within a flow, or 'submit' if it's the last step. */
export function getNextStepInFlow(flowId: FlowId, currentStep: StepId): StepId | 'submit' {
  const flow = FLOW_CONFIGS[flowId]
  const idx = flow.steps.indexOf(currentStep)
  if (idx === -1 || idx >= flow.steps.length - 1) return 'submit'
  return flow.steps[idx + 1]!
}
