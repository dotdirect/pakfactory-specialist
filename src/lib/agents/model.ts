import { gateway } from '@ai-sdk/gateway'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

function useGateway(): boolean {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL)
}

export function getModel() {
  if (useGateway()) {
    return gateway(
      process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-20250514',
    )
  }
  const provider = (process.env.AI_PROVIDER || 'openai') as
    | 'openai'
    | 'anthropic'
    | 'google'
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  if (provider === 'anthropic') return anthropic(model)
  if (provider === 'google') return google(model)
  return openai(model)
}

export function getEmbeddingModel() {
  if (useGateway()) {
    const id =
      process.env.AI_EMBEDDING_GATEWAY_MODEL ||
      `${process.env.AI_EMBEDDING_PROVIDER || 'openai'}/${process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-large'}`
    return gateway.embedding(id)
  }
  const provider = (process.env.AI_EMBEDDING_PROVIDER || 'openai') as
    | 'openai'
    | 'google'
  const model = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-large'
  if (provider === 'google') return google.textEmbeddingModel(model)
  return openai.embedding(model)
}

export function getModerationModel() {
  if (useGateway()) {
    return gateway(
      process.env.AI_MODERATION_MODEL || 'anthropic/claude-haiku-4-5-20251001',
    )
  }
  return anthropic(
    process.env.AI_MODERATION_MODEL || 'claude-haiku-4-5-20251001',
  )
}
