import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

const MODELS = {
  openai: () => openai(process.env.AI_MODEL || 'gpt-4o-mini'),
  anthropic: () => anthropic(process.env.AI_MODEL || 'claude-sonnet-4-20250514'),
  google: () => google(process.env.AI_MODEL || 'gemini-2.5-flash'),
} as const

type Provider = keyof typeof MODELS

export function getModel() {
  const provider = (process.env.AI_PROVIDER || 'openai') as Provider
  const factory = MODELS[provider]
  if (!factory) throw new Error('Unsupported AI provider configuration')
  return factory()
}
