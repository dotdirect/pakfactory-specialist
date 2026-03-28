import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { parseRetrievalEnv, type RetrievalEnv } from '@/lib/env/server'

/** A single product recommendation returned from the catalog index. */
export type ProductRecommendation = {
  productId: string
  productName: string
  handle: string
  category: string
  description: string
  imageUrl?: string
  score: number
}

export type ProductRetrievalResult = {
  products: ProductRecommendation[]
  hitCount: number
}

type PineconeMatch = { id: string; score?: number; metadata?: Record<string, unknown> }

const PRODUCT_NAMESPACE = 'products'

// ─── Debug data ──────────────────────────────────────────────────────────────

export type RetrievalDebugInfo = {
  query: string
  industry?: string
  filterUsed: boolean
  products: Array<{ name: string; score: number; category: string }>
  timestamp: string
}

// Use globalThis so the debug data is shared across edge route compilations in dev
const _global = globalThis as typeof globalThis & { __ragDebug?: RetrievalDebugInfo }

export function getLastRetrievalDebug(): RetrievalDebugInfo | null {
  return _global.__ragDebug ?? null
}

function saveDebug(query: string, industry: string | undefined, filterUsed: boolean, result: ProductRetrievalResult) {
  _global.__ragDebug = {
    query,
    industry,
    filterUsed,
    products: result.products.map((p) => ({ name: p.productName, score: p.score, category: p.category })),
    timestamp: new Date().toISOString(),
  }
}

function parseMatches(matches: PineconeMatch[]): ProductRetrievalResult {
  const products: ProductRecommendation[] = matches
    .filter((m) => (m.score ?? 0) > 0.3)
    .map((m) => ({
      productId: pickString(m.metadata, ['productId', 'product_id', 'id']) ?? m.id,
      productName: pickString(m.metadata, ['productName', 'product_name', 'name', 'title']) ?? 'Unknown Product',
      handle: pickString(m.metadata, ['handle', 'slug', 'url']) ?? m.id,
      category: pickString(m.metadata, ['category', 'type', 'productType']) ?? 'packaging',
      description: pickString(m.metadata, ['description', 'shortDescription', 'body', 'text', 'chunk_text']) ?? '',
      imageUrl: pickString(m.metadata, ['imageUrl', 'image_url', 'primaryImageUrl', 'image', 'thumbnail']),
      score: m.score ?? 0,
    }))
  return { products, hitCount: products.length }
}

function getEmbeddingModel(provider: 'openai' | 'google', model: string) {
  if (provider === 'google') return google.textEmbeddingModel(model)
  return openai.embedding(model)
}

function pickString(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!metadata) return undefined
  for (const key of keys) {
    const val = metadata[key]
    if (typeof val === 'string' && val.trim().length > 0) return val.trim()
  }
  return undefined
}

export type ProductRetrievalOptions = {
  query: string
  topK?: number
  /** Filter by industry metadata — matches products whose industry field contains this value. */
  industry?: string
}

/**
 * Retrieve product recommendations from the Pinecone `products` namespace.
 * Uses the same Pinecone + embedding config as knowledge retrieval.
 * Returns an empty result if the env is not configured.
 */
export async function retrieveProductRecommendations(
  options: ProductRetrievalOptions,
): Promise<ProductRetrievalResult> {
  const env = parseRetrievalEnv()
  if (!env) return { products: [], hitCount: 0 }

  return retrieveProductRecommendationsWithEnv(options, env)
}

export async function retrieveProductRecommendationsWithEnv(
  options: ProductRetrievalOptions,
  env: RetrievalEnv,
): Promise<ProductRetrievalResult> {
  const { query, topK = 3, industry } = options
  if (!query.trim()) return { products: [], hitCount: 0 }

  try {
    const embeddingModel = getEmbeddingModel(env.AI_EMBEDDING_PROVIDER, env.AI_EMBEDDING_MODEL)
    const { embedding } = await embed({ model: embeddingModel, value: query })

    const queryPinecone = async (filter?: Record<string, unknown>) => {
      return fetch(`${env.PINECONE_HOST}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': env.PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: embedding,
          topK,
          includeMetadata: true,
          namespace: PRODUCT_NAMESPACE,
          ...(filter && { filter }),
        }),
      })
    }

    // Try with industry metadata filter first, fallback to unfiltered if no results.
    // Industry is stored as a JSON array string in Pinecone, so we try $eq first
    // (works if stored as plain string) and fall back to no filter.
    let res: Response
    if (industry) {
      res = await queryPinecone({ industry: { $eq: industry } })
      const data = (await res.json()) as { matches?: PineconeMatch[] }
      if ((data.matches ?? []).length > 0) {
        const result = parseMatches(data.matches ?? [])
        saveDebug(query, industry, true, result)
        return result
      }
      // Fallback: no filter, rely on semantic search (industry is already in the query text)
      console.log(`[product-retrieval] Industry filter "${industry}" returned 0 results, falling back to unfiltered`)
      res = await queryPinecone()
    } else {
      res = await queryPinecone()
    }

    if (!res.ok) {
      console.error(`[product-retrieval] Pinecone returned ${res.status}`)
      return { products: [], hitCount: 0 }
    }

    const data = (await res.json()) as { matches?: PineconeMatch[] }
    const result = parseMatches(data.matches ?? [])
    saveDebug(query, industry, false, result)
    return result
  } catch (err) {
    console.error('[product-retrieval] Error retrieving products:', err)
    return { products: [], hitCount: 0 }
  }
}
