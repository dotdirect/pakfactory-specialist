import type { KnowledgeRetrievalResult } from '@/lib/rag/pinecone-retrieval'

export function normalizeQuestionForCache(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function buildRetrievalFingerprint(
  retrieval: KnowledgeRetrievalResult | null,
  hadRetrievalError: boolean,
): string {
  if (hadRetrievalError) return 'rag-failed'
  if (!retrieval) return 'no-rag'
  if (retrieval.chunkIds.length === 0) return 'empty'
  return retrieval.chunkIds.join(',')
}

export async function helpResponseCacheKey(
  question: string,
  retrievalFingerprint: string,
): Promise<string> {
  const normalized = normalizeQuestionForCache(question)
  const payload = `${normalized}|${retrievalFingerprint}`
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
