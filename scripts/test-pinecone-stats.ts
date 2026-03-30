import { config } from 'dotenv'
config({ path: '.env.local' })
import { parseRetrievalEnv } from '../src/lib/env/server'

async function main() {
  const env = parseRetrievalEnv()
  if (!env) {
    console.log('parseRetrievalEnv() returned null - env vars not valid')
    return
  }

  console.log('Env parsed OK:')
  console.log('  Provider:', env.AI_EMBEDDING_PROVIDER)
  console.log('  Model:', env.AI_EMBEDDING_MODEL)
  console.log('  Host:', env.PINECONE_HOST.slice(0, 40) + '...')

  // Check Pinecone index stats
  const statsRes = await fetch(env.PINECONE_HOST + '/describe_index_stats', {
    method: 'POST',
    headers: { 'Api-Key': env.PINECONE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const stats = await statsRes.json()
  console.log('\nPinecone index stats:', JSON.stringify(stats, null, 2))

  // Check if "products" namespace exists
  const namespaces = (stats as { namespaces?: Record<string, unknown> }).namespaces ?? {}
  if ('products' in namespaces) {
    console.log('\n"products" namespace exists:', namespaces['products'])
  } else {
    console.log('\nWARNING: "products" namespace NOT found!')
    console.log('Available namespaces:', Object.keys(namespaces))
  }
}

main().catch(console.error)
