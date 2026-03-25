import { describe, expect, it } from 'vitest'
import { buildSpecialistPrompt } from '@/lib/prompts/specialist-agent'

describe('buildSpecialistPrompt', () => {
  it('includes phase-batched intake and gap-only follow-up instructions', () => {
    const prompt = buildSpecialistPrompt(
      ['customer.firstName', 'customer.lastName', 'customer.email'],
      '1. Identity',
    )

    expect(prompt).toContain('Start each phase with one comprehensive intake question')
    expect(prompt).toContain('Do not split related required fields across separate turns')
    expect(prompt).toContain('Per-phase bundled asks:')
    expect(prompt).toContain('Identity: Ask for first name, last name, and email in one message')
    expect(prompt).toContain('Context: Ask for industry, productItem, and a short project summary')
    expect(prompt).toContain('capture it immediately with sync_project_brief')
    expect(prompt).toContain('ask follow-ups only for required fields that are still missing')
    expect(prompt).not.toContain('one focused follow-up question at a time')
  })

  it('adds completion guidance when no fields are missing', () => {
    const prompt = buildSpecialistPrompt([], '2. Context')

    expect(prompt).toContain('All key fields for the current phase are collected')
    expect(prompt).toContain('one concise transition question')
  })
})
