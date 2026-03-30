/**
 * Quick script to test product retrieval from Pinecone.
 * Run: npx tsx scripts/test-rag.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import { retrieveProductRecommendations } from '../src/lib/rag/product-retrieval'

async function main() {
  const query = 'packaging for Coffee Beans. Small-batch artisan coffee roaster looking for premium pouches'
  const industry = 'Coffee'
  console.log('Testing RAG with query:', query)
  console.log('Industry filter:', industry)
  console.log('---')

  const result = await retrieveProductRecommendations({ query, topK: 6, industry })

  if (result.products.length === 0) {
    console.log('No products returned. Check:')
    console.log('  1. PINECONE_API_KEY, PINECONE_HOST, AI_EMBEDDING_PROVIDER, AI_EMBEDDING_MODEL are set in .env.local')
    console.log('  2. The "products" namespace exists in your Pinecone index')
    console.log('  3. The index has vectors with metadata (productName, category, description, etc.)')
  } else {
    console.log(`Found ${result.hitCount} products:\n`)
    for (const p of result.products) {
      console.log(`  [${p.score.toFixed(3)}] ${p.productName} (${p.category})`)
      console.log(`         ${p.description.slice(0, 100)}...`)
      console.log(`         image: ${p.imageUrl ?? 'none'}`)
      console.log()
    }
  }
}

main().catch(console.error)
