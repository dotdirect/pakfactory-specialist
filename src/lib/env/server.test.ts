import { describe, expect, it } from 'vitest'
import { ProjectDocUploadEnvSchema, RetrievalEnvSchema } from '@/lib/env/server'

describe('RetrievalEnvSchema', () => {
  it('fails when required keys are missing', () => {
    expect(RetrievalEnvSchema.safeParse({}).success).toBe(false)
  })

  it('parses minimal valid server env', () => {
    const data = RetrievalEnvSchema.parse({
      PINECONE_API_KEY: 'key',
      PINECONE_HOST: 'https://example.svc.pinecone.io',
      AI_EMBEDDING_MODEL: 'text-embedding-3-small',
    })
    expect(data.PINECONE_TOP_K).toBe(5)
    expect(data.AI_EMBEDDING_PROVIDER).toBe('openai')
  })

  it('fails fast (throws) when strict parse is used on empty object', () => {
    expect(() => RetrievalEnvSchema.parse({})).toThrow()
  })
})

describe('ProjectDocUploadEnvSchema', () => {
  it('parses valid upload env with defaults', () => {
    const data = ProjectDocUploadEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    })
    expect(data.PROJECT_DOC_UPLOAD_BUCKET).toBe('project-documents')
    expect(data.PROJECT_DOC_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it('fails when required supabase env vars are missing', () => {
    expect(ProjectDocUploadEnvSchema.safeParse({}).success).toBe(false)
  })
})
