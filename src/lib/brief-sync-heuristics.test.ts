import { describe, expect, it } from 'vitest'
import { shouldExpectSyncForMessage } from '@/lib/brief-sync-heuristics'

describe('shouldExpectSyncForMessage', () => {
  it('expects sync for identity completion when message contains full name + email', () => {
    const shouldSync = shouldExpectSyncForMessage({
      currentPhase: '1. Identity',
      missingFields: ['customer.firstName', 'customer.lastName', 'customer.email'],
      messageText: 'Richard Chang, richard@pakfactory.com',
    })
    expect(shouldSync).toBe(true)
  })

  it('does not expect sync for partial identity updates (email-only)', () => {
    const shouldSync = shouldExpectSyncForMessage({
      currentPhase: '1. Identity',
      missingFields: ['customer.firstName', 'customer.lastName', 'customer.email'],
      messageText: 'richard@pakfactory.com',
    })
    expect(shouldSync).toBe(false)
  })

  it('expects sync for context completion even when optional annual budget is still missing', () => {
    const shouldSync = shouldExpectSyncForMessage({
      currentPhase: '2. Context',
      missingFields: ['customer.industry', 'project.productItem', 'customer.annualBudget'],
      messageText: 'We are in skincare and need packaging for serum bottles.',
    })
    expect(shouldSync).toBe(true)
  })

  it('expects sync for optional field messages even when no required fields are missing', () => {
    const shouldSync = shouldExpectSyncForMessage({
      currentPhase: '2. Context',
      missingFields: [],
      messageText: 'My company is PakFactory and phone is 5551234567.',
    })
    expect(shouldSync).toBe(true)
  })
})

