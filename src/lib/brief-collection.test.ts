import { describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  getCompletionPercentage,
  getMissingFieldsInPhase,
  isIdentityPhaseComplete,
} from '@/lib/brief-collection'
import type { TechnicalBrief } from '@/types/brief'

function createBaseBrief(): TechnicalBrief {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    status: 'in_progress',
    lineItems: [],
    projects: [],
    createdAt: now,
    updatedAt: now,
    customer: {
      firstName: 'Taylor',
      lastName: 'Lee',
      email: 'taylor@example.com',
      industry: 'Food',
    },
    project: {
      productItem: 'tea sachets',
      productLine: 'flexible packaging',
      packagingStyle: 'stand-up pouch',
      projectPDF: 'https://cdn.example.com/project.pdf',
      dimensions: '120x80x40',
      quantity: [1000, 2500],
      deliveryCountry: 'Canada',
      customizations: {
        materials: 'Kraft paper',
      },
      details: 'Need resealable pouches with shelf appeal.',
    },
  }
}

describe('brief collection project summary requirement', () => {
  it('marks project.summary as missing in phase 5 when absent', () => {
    const brief = createBaseBrief()
    const missing = getMissingFieldsInPhase(brief, '5. Complete')
    expect(missing).toContain('project.summary')
  })

  it('reaches 100% when project.summary is present with phase 5 data', () => {
    const brief = createBaseBrief()
    brief.project = {
      ...brief.project,
      summary: 'Premium tea sachet pouch line for Canadian retail launch.',
    }

    const completion = getCompletionPercentage(brief)
    expect(completion).toBe(100)
  })
})

describe('brief collection identity phase gate', () => {
  it('returns false when brief is null', () => {
    expect(isIdentityPhaseComplete(null)).toBe(false)
  })

  it('returns false when required email is missing', () => {
    const brief = createBaseBrief()
    brief.customer = {
      ...brief.customer,
      email: undefined,
    }
    expect(isIdentityPhaseComplete(brief)).toBe(false)
  })

  it('returns true when required identity fields are present', () => {
    const brief = createBaseBrief()
    expect(isIdentityPhaseComplete(brief)).toBe(true)
  })
})
