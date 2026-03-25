import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockParseProjectDocUploadEnvStrict,
  mockExtractProjectDocFields,
  mockCreateAdminClient,
} = vi.hoisted(() => ({
  mockParseProjectDocUploadEnvStrict: vi.fn(),
  mockExtractProjectDocFields: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}))

vi.mock('@/lib/env/server', () => ({
  parseProjectDocUploadEnvStrict: mockParseProjectDocUploadEnvStrict,
}))

vi.mock('@/lib/project-doc/extract', () => ({
  extractProjectDocFields: mockExtractProjectDocFields,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

import { POST } from './route'

function makeRequest(formData: FormData) {
  return new Request('http://localhost/api/project-ai/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/project-ai/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseProjectDocUploadEnvStrict.mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      PROJECT_DOC_UPLOAD_BUCKET: 'project-documents',
      PROJECT_DOC_MAX_BYTES: 10 * 1024 * 1024,
    })

    mockExtractProjectDocFields.mockResolvedValue({
      textLength: 320,
      extracted: {
        customerIndustry: 'food and beverage',
        productItem: 'protein bars',
        quantityList: [1000, 5000],
        details: 'Need retail-ready cartons.',
        unknownFields: [],
        confidence: 'high',
      },
    })

    const upload = vi.fn().mockResolvedValue({
      data: { path: 'project-ai/chat/brief.pdf' },
      error: null,
    })
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/project-ai/chat/brief.pdf' },
    })
    mockCreateAdminClient.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload,
          getPublicUrl,
        }),
      },
    })
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    formData.append('chatId', 'chat-1')
    const response = await POST(makeRequest(formData))
    expect(response.status).toBe(400)
  })

  it('returns 415 when extension is unsupported', async () => {
    const formData = new FormData()
    formData.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    const response = await POST(makeRequest(formData))
    expect(response.status).toBe(415)
  })

  it('stores file and returns sync payload on success', async () => {
    const formData = new FormData()
    formData.append('chatId', 'chat-1')
    formData.append(
      'file',
      new File([new Uint8Array([37, 80, 68, 70])], 'brief.pdf', { type: 'application/pdf' }),
    )
    const response = await POST(makeRequest(formData))
    const payload = (await response.json()) as {
      fileUrl: string
      sync: { events: Array<{ action: string; data: Record<string, unknown> }> }
    }

    expect(response.status).toBe(200)
    expect(payload.fileUrl).toBe('https://cdn.example.com/project-ai/chat/brief.pdf')
    expect(payload.sync.events.some((event) => event.action === 'brief.project.context_confirmed')).toBe(true)
    const projectEvent = payload.sync.events.find((event) => event.action === 'brief.project.context_confirmed')
    expect(projectEvent?.data.projectPDF).toBe('https://cdn.example.com/project-ai/chat/brief.pdf')
  })
})
