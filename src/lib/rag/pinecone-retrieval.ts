import { embed } from 'ai'
import { getEmbeddingModel } from '@/lib/agents/model'
import {
  getNamespaceFromEnv,
  parseRetrievalEnv,
  type RetrievalEnv,
} from '@/lib/env/server'

export type PineconeMatch = {
  id: string
  score?: number
  metadata?: Record<string, unknown>
}

export type PineconeQueryResponse = {
  matches?: PineconeMatch[]
}

export type KnowledgeSource = {
  id: string
  url: string
  title?: string
  score?: number
}

export type KnowledgeRetrievalResult = {
  context: string
  sources: KnowledgeSource[]
  hitCount: number
  /** Sorted vector IDs from Pinecone — used for cache fingerprinting. */
  chunkIds: string[]
}

function pickString(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!metadata) return undefined
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return undefined
}

function buildContext(chunks: Array<{ id: string; text: string; title?: string }>) {
  const lines = chunks.map((chunk, i) => {
    const header = chunk.title ? `[${i + 1}] ${chunk.title}` : `[${i + 1}] ${chunk.id}`
    return `${header}\n${chunk.text}`
  })
  return lines.join('\n\n').slice(0, 6000)
}

/**
 * Maps Pinecone query matches to grounding context + citation sources.
 * Exported for unit tests (no network).
 */
export function mapMatchesToKnowledge(matches: PineconeMatch[]): KnowledgeRetrievalResult {
  const chunkIds = [...new Set(matches.map((m) => m.id))].sort()
  if (matches.length === 0) {
    return { context: '', sources: [], hitCount: 0, chunkIds: [] }
  }

  const textChunks: Array<{ id: string; text: string; title?: string }> = []
  const sources: KnowledgeSource[] = []

  for (const match of matches) {
    const text = pickString(match.metadata, ['chunk_text', 'text', 'content', 'body'])
    const url = pickString(match.metadata, ['url', 'source_url', 'sourceUrl', 'link'])
    const title = pickString(match.metadata, ['title', 'source_title', 'sourceTitle', 'name'])

    if (text) {
      textChunks.push({
        id: match.id,
        text,
        title,
      })
    }

    if (url) {
      sources.push({
        id: match.id,
        url,
        title,
        score: match.score,
      })
    }
  }

  return {
    context: buildContext(textChunks),
    sources,
    hitCount: matches.length,
    chunkIds,
  }
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
  })
  return embedding
}

export async function retrieveRelevantChunks(
  question: string,
  env: RetrievalEnv,
): Promise<KnowledgeRetrievalResult> {
  const embedding = await embedQuery(question)

  const body: Record<string, unknown> = {
    vector: embedding,
    topK: env.PINECONE_TOP_K,
    includeMetadata: true,
  }

  const namespace = getNamespaceFromEnv(env)
  if (namespace) body.namespace = namespace

  const response = await fetch(`${env.PINECONE_HOST.replace(/\/$/, '')}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.PINECONE_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Pinecone query failed with status ${response.status}`)
  }

  const result = (await response.json()) as PineconeQueryResponse
  const matches = result.matches ?? []
  return mapMatchesToKnowledge(matches)
}

/**
 * End-to-end retrieval when env is valid; returns `null` if Pinecone/embedding env is not configured.
 */
export async function retrieveHelpKnowledge(
  question: string,
): Promise<KnowledgeRetrievalResult | null> {
  const env = parseRetrievalEnv()
  if (!env) return null
  return retrieveRelevantChunks(question, env)
}
