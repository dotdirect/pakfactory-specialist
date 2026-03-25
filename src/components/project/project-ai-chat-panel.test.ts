import { describe, expect, it } from 'vitest'
import { eventHasNetChange } from '@/lib/brief-sync-noop'
import {
  isAssistantResponseToHiddenFallback,
  shouldHideInternalSyncChatter,
  shouldSkipFallbackForRepeatedAsk,
} from '@/components/project/project-ai-chat-panel'
import type { TechnicalBrief } from '@/types/brief'
import type { BriefEvent } from '@/types/brief-events'
import type { ProjectAiChatMessage } from '@/types/project-ai-chat'

function makeBrief(): TechnicalBrief {
  const now = new Date().toISOString()
  return {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'in_progress',
    lineItems: [],
    customer: {
      firstName: 'Richard',
      lastName: 'Chang',
      email: 'richard@gmail.com',
      company: 'PakFactory',
      phone: '5551234567',
      industry: 'beauty',
    },
    project: {
      productItem: 'serum bottle',
      summary: 'Packaging for skincare serum',
      details: 'Need premium look for shelf display.',
    },
    createdAt: now,
    updatedAt: now,
  }
}

describe('eventHasNetChange', () => {
  it('returns false for repeated identity value payloads', () => {
    const brief = makeBrief()
    const event: BriefEvent = {
      action: 'brief.identity.confirmed',
      data: {
        company: 'PakFactory',
        phone: '5551234567',
      },
    }
    expect(eventHasNetChange(event, brief)).toBe(false)
  })

  it('returns true when project context includes new value', () => {
    const brief = makeBrief()
    const event: BriefEvent = {
      action: 'brief.project.context_confirmed',
      data: {
        productItem: 'glass jar',
      },
    }
    expect(eventHasNetChange(event, brief)).toBe(true)
  })
})

describe('shouldHideInternalSyncChatter', () => {
  it('hides synthetic fallback user message', () => {
    const message = {
      id: 'm1',
      role: 'user',
      parts: [{ type: 'text', text: 'Please update the brief with the information I provided.' }],
      createdAt: new Date(),
    } as ProjectAiChatMessage

    expect(shouldHideInternalSyncChatter(message)).toBe(true)
  })

  it('hides assistant summary validation leak copy', () => {
    const message = {
      id: 'm2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'I need a value for `summary` to update the brief.' }],
      createdAt: new Date(),
    } as ProjectAiChatMessage

    expect(shouldHideInternalSyncChatter(message)).toBe(true)
  })
})

describe('repetition guards', () => {
  it('skips fallback when assistant already asked for missing email', () => {
    const assistant = {
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Thanks! Could you also provide your email address?' }],
      createdAt: new Date(),
    } as ProjectAiChatMessage
    expect(shouldSkipFallbackForRepeatedAsk(assistant, ['customer.email'])).toBe(true)
  })

  it('hides assistant response that immediately follows hidden fallback turn', () => {
    const messages = [
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'Please update the brief with the information I provided.' }],
        createdAt: new Date(),
      },
      {
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Great, could you share your email?' }],
        createdAt: new Date(),
      },
    ] as ProjectAiChatMessage[]

    expect(isAssistantResponseToHiddenFallback(messages, 1)).toBe(true)
  })
})

