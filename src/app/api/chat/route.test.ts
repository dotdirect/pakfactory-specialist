import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGenerateText,
  mockGetModel,
  mockRetrieveHelpKnowledge,
  mockBuildRetrievalFingerprint,
  mockHelpResponseCacheKey,
} = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockGetModel: vi.fn(),
  mockRetrieveHelpKnowledge: vi.fn(),
  mockBuildRetrievalFingerprint: vi.fn(),
  mockHelpResponseCacheKey: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}))

vi.mock('@/lib/agents/model', () => ({
  getModel: mockGetModel,
}))

vi.mock('@/lib/agents/cs-agent', () => ({
  csAgentConfig: {
    toolChoice: 'auto',
  },
}))

vi.mock('@/lib/prompts/cs-agent', () => ({
  csAgentSystemPrompt: 'CS_PROMPT_FROM_MARKDOWN',
}))

vi.mock('@/lib/rag/pinecone-retrieval', () => ({
  retrieveHelpKnowledge: mockRetrieveHelpKnowledge,
}))

vi.mock('@/lib/rag/help-cache', () => ({
  buildRetrievalFingerprint: mockBuildRetrievalFingerprint,
  helpResponseCacheKey: mockHelpResponseCacheKey,
}))

import { POST } from './route'

function makeRequest(question: string) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify({ question }),
  })
}

describe('POST /api/chat smoke behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetModel.mockReturnValue({ provider: 'test' })
    mockBuildRetrievalFingerprint.mockReturnValue('fp')
    mockHelpResponseCacheKey.mockImplementation(async (question: string) => `cache-${question}`)
    mockGenerateText.mockResolvedValue({
      text: 'Assistant response',
      staticToolResults: [],
      sources: [],
    })
  })

  it('appends retrieval snippets to the system prompt when context exists', async () => {
    mockRetrieveHelpKnowledge.mockResolvedValue({
      context: 'MOQ is usually 500 to 1000 units.',
      sources: [{ id: 's1', url: 'https://docs.example.com/moq', title: 'MOQ docs' }],
      hitCount: 1,
      chunkIds: ['chunk-1'],
    })

    const response = await POST(makeRequest('What is MOQ?'))
    expect(response.status).toBe(200)

    const callArg = mockGenerateText.mock.calls[0][0] as { system: string }
    expect(callArg.system).toContain('CS_PROMPT_FROM_MARKDOWN')
    expect(callArg.system).toContain('Knowledge snippets:')
    expect(callArg.system).toContain('MOQ is usually 500 to 1000 units.')
  })

  it('falls back to the base system prompt when retrieval fails', async () => {
    mockRetrieveHelpKnowledge.mockRejectedValue(new Error('network down'))

    const response = await POST(makeRequest('Tell me about lead times'))
    expect(response.status).toBe(200)

    const callArg = mockGenerateText.mock.calls[0][0] as { system: string }
    expect(callArg.system).toBe('CS_PROMPT_FROM_MARKDOWN')
  })
})
