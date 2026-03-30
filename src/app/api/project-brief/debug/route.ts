import { getLastRetrievalDebug } from '@/lib/rag/product-retrieval'

export const runtime = 'edge'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not available', { status: 404 })
  }

  return Response.json({ rag: getLastRetrievalDebug() })
}
