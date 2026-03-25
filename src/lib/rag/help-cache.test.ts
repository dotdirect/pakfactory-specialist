import { describe, expect, it } from 'vitest'
import {
  buildRetrievalFingerprint,
  helpResponseCacheKey,
} from '@/lib/rag/help-cache'
import type { KnowledgeRetrievalResult } from '@/lib/rag/pinecone-retrieval'

describe('buildRetrievalFingerprint', () => {
  it('returns no-rag when retrieval is null', () => {
    expect(buildRetrievalFingerprint(null, false)).toBe('no-rag')
  })

  it('returns rag-failed when retrieval errored', () => {
    expect(buildRetrievalFingerprint(null, true)).toBe('rag-failed')
  })

  it('returns empty when there are no chunk ids', () => {
    const r: KnowledgeRetrievalResult = {
      context: '',
      sources: [],
      hitCount: 0,
      chunkIds: [],
    }
    expect(buildRetrievalFingerprint(r, false)).toBe('empty')
  })

  it('joins sorted chunk ids', () => {
    const r: KnowledgeRetrievalResult = {
      context: 'x',
      sources: [],
      hitCount: 2,
      chunkIds: ['a', 'b'],
    }
    expect(buildRetrievalFingerprint(r, false)).toBe('a,b')
  })
})

describe('helpResponseCacheKey', () => {
  it('differs when retrieval fingerprint differs', async () => {
    const q = 'What is MOQ?'
    const k1 = await helpResponseCacheKey(q, 'no-rag')
    const k2 = await helpResponseCacheKey(q, 'a,b')
    expect(k1).not.toBe(k2)
  })

  it('differs when question differs with same fingerprint', async () => {
    const fp = 'empty'
    const k1 = await helpResponseCacheKey('first', fp)
    const k2 = await helpResponseCacheKey('second', fp)
    expect(k1).not.toBe(k2)
  })
})
