import { describe, expect, it } from 'vitest'
import { mapMatchesToKnowledge, type PineconeMatch } from '@/lib/rag/pinecone-retrieval'

describe('mapMatchesToKnowledge', () => {
  it('returns empty context and no sources for empty matches', () => {
    const result = mapMatchesToKnowledge([])
    expect(result.context).toBe('')
    expect(result.sources).toEqual([])
    expect(result.hitCount).toBe(0)
    expect(result.chunkIds).toEqual([])
  })

  it('builds context and sources from metadata without fabricating urls', () => {
    const matches: PineconeMatch[] = [
      {
        id: 'vec-1',
        score: 0.9,
        metadata: {
          chunk_text: 'Corrugated boxes ship flat.',
          url: 'https://docs.example.com/boxes',
          title: 'Boxes',
        },
      },
    ]
    const result = mapMatchesToKnowledge(matches)
    expect(result.hitCount).toBe(1)
    expect(result.chunkIds).toEqual(['vec-1'])
    expect(result.context).toContain('Corrugated boxes')
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]).toMatchObject({
      id: 'vec-1',
      url: 'https://docs.example.com/boxes',
      title: 'Boxes',
    })
  })

  it('omits source entries when url metadata is missing', () => {
    const matches: PineconeMatch[] = [
      {
        id: 'vec-2',
        metadata: { chunk_text: 'No link here' },
      },
    ]
    const result = mapMatchesToKnowledge(matches)
    expect(result.context).toContain('No link here')
    expect(result.sources).toEqual([])
  })

  it('dedupes chunk ids in stable sorted order', () => {
    const matches: PineconeMatch[] = [
      { id: 'b', metadata: { text: 'two' } },
      { id: 'a', metadata: { text: 'one' } },
    ]
    const result = mapMatchesToKnowledge(matches)
    expect(result.chunkIds).toEqual(['a', 'b'])
  })
})
