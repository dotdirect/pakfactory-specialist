import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSafeValidateUIMessages,
  mockConvertToModelMessages,
  mockStreamText,
  mockGetModel,
  mockBuildSpecialistPrompt,
  mockRetrieveHelpKnowledge,
} = vi.hoisted(() => ({
  mockSafeValidateUIMessages: vi.fn(),
  mockConvertToModelMessages: vi.fn(),
  mockStreamText: vi.fn(),
  mockGetModel: vi.fn(),
  mockBuildSpecialistPrompt: vi.fn(),
  mockRetrieveHelpKnowledge: vi.fn(),
}))

vi.mock('ai', () => ({
  safeValidateUIMessages: mockSafeValidateUIMessages,
  convertToModelMessages: mockConvertToModelMessages,
  streamText: mockStreamText,
}))

vi.mock('@/lib/agents/model', () => ({
  getModel: mockGetModel,
}))

vi.mock('@/lib/agents/specialist-agent', () => ({
  specialistAgentConfig: {},
  specialistAgentTools: {},
}))

vi.mock('@/lib/prompts/specialist-agent', () => ({
  buildSpecialistPrompt: mockBuildSpecialistPrompt,
}))

vi.mock('@/lib/rag/pinecone-retrieval', () => ({
  retrieveHelpKnowledge: mockRetrieveHelpKnowledge,
}))

import { POST, trimToValidMessageWindow } from './route'

function makeRequest(
  question: string,
  overrides?: {
    missingFields?: string[]
    currentPhase?: string
    forceSync?: boolean
  },
) {
  return new Request('http://localhost/api/project-ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({
      messages: [
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: question }],
        },
      ],
      missingFields: overrides?.missingFields ?? ['customer.email'],
      currentPhase: overrides?.currentPhase ?? 'contact',
      forceSync: overrides?.forceSync,
    }),
  })
}

describe('trimToValidMessageWindow', () => {
  it('strips an orphaned leading tool message', () => {
    const messages = [
      { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'tc-1' }] },
      { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] },
    ]

    expect(trimToValidMessageWindow(messages, 3)).toEqual(messages.slice(1))
  })

  it('strips leading assistant tool-call and following tool response until stable', () => {
    const messages = [
      {
        role: 'assistant',
        content: [{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'sync_project_brief' }],
      },
      { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'tc-1' }] },
      { role: 'user', content: [{ type: 'text', text: 'next message' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Thanks, noted.' }] },
    ]

    expect(trimToValidMessageWindow(messages, 4)).toEqual(messages.slice(2))
  })

  it('keeps a text-only assistant greeting as a valid starting turn', () => {
    const messages = [
      { role: 'assistant', content: [{ type: 'text', text: "Hi! Let's get started." }] },
      { role: 'user', content: [{ type: 'text', text: 'My name is Alex.' }] },
    ]

    expect(trimToValidMessageWindow(messages, 2)).toEqual(messages)
  })
})

describe('POST /api/project-ai/chat retrieval behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetModel.mockReturnValue({ provider: 'test' })
    mockBuildSpecialistPrompt.mockReturnValue('BASE_PROMPT')
    mockSafeValidateUIMessages.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'What is MOQ?' }],
        },
      ],
    })
    mockConvertToModelMessages.mockResolvedValue([{ role: 'user', content: 'What is MOQ?' }])
    mockStreamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response('ok', { status: 200 }),
    })
  })

  it('injects knowledge snippets and source hints when retrieval has context and sources', async () => {
    mockRetrieveHelpKnowledge.mockResolvedValue({
      context: 'MOQ is usually between 500 and 1000.',
      sources: [{ id: 's1', url: 'https://docs.example.com/moq', title: 'MOQ guide' }],
      hitCount: 1,
      chunkIds: ['vec-1'],
    })

    const response = await POST(makeRequest('What is MOQ?'))
    expect(response.status).toBe(200)
    expect(mockRetrieveHelpKnowledge).toHaveBeenCalledWith('What is MOQ?')

    const streamArgs = mockStreamText.mock.calls[0][0] as { system: string }
    expect(streamArgs.system).toContain('BASE_PROMPT')
    expect(streamArgs.system).toContain('Knowledge snippets:')
    expect(streamArgs.system).toContain('MOQ is usually between 500 and 1000.')
    expect(streamArgs.system).toContain('Relevant source URLs:')
    expect(streamArgs.system).toContain('MOQ guide: https://docs.example.com/moq')
  })

  it('injects knowledge snippets without source hints when retrieval has no sources', async () => {
    mockRetrieveHelpKnowledge.mockResolvedValue({
      context: 'Folding cartons can use SBS board.',
      sources: [],
      hitCount: 1,
      chunkIds: ['vec-2'],
    })

    const response = await POST(makeRequest('What paperboard do you use?'))
    expect(response.status).toBe(200)

    const streamArgs = mockStreamText.mock.calls[0][0] as { system: string }
    expect(streamArgs.system).toContain('Knowledge snippets:')
    expect(streamArgs.system).toContain('Folding cartons can use SBS board.')
    expect(streamArgs.system).not.toContain('Relevant source URLs:')
  })

  it('falls back silently when retrieval throws and still streams response', async () => {
    mockRetrieveHelpKnowledge.mockRejectedValue(new Error('Pinecone unavailable'))

    const response = await POST(makeRequest('Tell me about lead times'))
    expect(response.status).toBe(200)
    expect(mockRetrieveHelpKnowledge).toHaveBeenCalledWith('Tell me about lead times')

    const streamArgs = mockStreamText.mock.calls[0][0] as { system: string }
    expect(streamArgs.system).toBe('BASE_PROMPT')
    expect(streamArgs.system).not.toContain('Knowledge snippets:')
  })

  it('sets mustSyncThisTurn when identity required fields are completed in one user message', async () => {
    mockRetrieveHelpKnowledge.mockResolvedValue(null)

    const response = await POST(makeRequest('Richard Chang, richard@pakfactory.com', {
      currentPhase: '1. Identity',
      missingFields: ['customer.firstName', 'customer.lastName', 'customer.email'],
    }))

    expect(response.status).toBe(200)
    expect(mockBuildSpecialistPrompt).toHaveBeenCalledWith(
      ['customer.firstName', 'customer.lastName', 'customer.email'],
      '1. Identity',
      true,
    )
  })

  it('sets mustSyncThisTurn when request explicitly forces sync', async () => {
    mockRetrieveHelpKnowledge.mockResolvedValue(null)

    const response = await POST(makeRequest('Please update the brief', {
      currentPhase: '2. Context',
      missingFields: ['customer.industry', 'project.productItem'],
      forceSync: true,
    }))

    expect(response.status).toBe(200)
    expect(mockBuildSpecialistPrompt).toHaveBeenCalledWith(
      ['customer.industry', 'project.productItem'],
      '2. Context',
      true,
    )
  })

  it('sets mustSyncThisTurn for optional profile details even with no missing fields', async () => {
    mockRetrieveHelpKnowledge.mockResolvedValue(null)

    const response = await POST(makeRequest('My company is PakFactory and my phone is 5551234567', {
      currentPhase: '2. Context',
      missingFields: [],
    }))

    expect(response.status).toBe(200)
    expect(mockBuildSpecialistPrompt).toHaveBeenCalledWith(
      [],
      '2. Context',
      true,
    )
  })
})
