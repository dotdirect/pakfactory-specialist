import { config } from 'dotenv'
config({ path: '.env.local' })

import { embed } from 'ai'
import { google } from '@ai-sdk/google'
import { parseRetrievalEnv } from '../src/lib/env/server'

async function main() {
  const env = parseRetrievalEnv()
  if (!env) { console.log('No env'); return }

  const { embedding } = await embed({
    model: google.textEmbeddingModel(env.AI_EMBEDDING_MODEL),
    value: 'coffee packaging pouches',
  })

  const res = await fetch(`${env.PINECONE_HOST}/query`, {
    method: 'POST',
    headers: { 'Api-Key': env.PINECONE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
      namespace: 'products',
    }),
  })

  const data = await res.json() as { matches?: Array<{ id: string; score?: number; metadata?: Record<string, unknown> }> }

  console.log('Raw Pinecone matches:\n')
  for (const match of data.matches ?? []) {
    console.log(`ID: ${match.id}  Score: ${match.score}`)
    console.log('Metadata keys:', Object.keys(match.metadata ?? {}))
    console.log('Metadata:', JSON.stringify(match.metadata, null, 2))
    console.log('---')
  }
}

main().catch(console.error)
