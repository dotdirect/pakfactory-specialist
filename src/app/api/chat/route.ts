import { generateText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/agents/model'
import { csAgentConfig } from '@/lib/agents/cs-agent'
import { csAgentSystemPrompt } from '@/lib/prompts/cs-agent'
import type { StartProjectInquiryOutput } from '@/lib/tools/start-project-inquiry'
import type { ShowPricingCalculatorOutput } from '@/lib/tools/show-pricing-calculator'
import type { HelpChatMessage } from '@/types/help-chat'

export const runtime = 'edge'

const HELP_CACHE_TTL_MS = 60_000 // 1 minute
const HELP_RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const HELP_RATE_LIMIT_MAX_REQUESTS = 30

type RateLimitEntry = { count: number; windowStart: number }
const helpRateLimitMap = new Map<string, RateLimitEntry>()

function getClientId(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function checkHelpRateLimit(clientId: string): boolean {
  const now = Date.now()
  const entry = helpRateLimitMap.get(clientId)
  if (!entry) {
    helpRateLimitMap.set(clientId, { count: 1, windowStart: now })
    return true
  }
  if (now - entry.windowStart >= HELP_RATE_LIMIT_WINDOW_MS) {
    entry.count = 1
    entry.windowStart = now
    return true
  }
  if (entry.count >= HELP_RATE_LIMIT_MAX_REQUESTS) return false
  entry.count += 1
  return true
}

/** In-memory cache keyed by normalized question hash. Edge isolate-scoped. */
const helpResponseCache = new Map<
  string,
  { parts: HelpChatMessage['parts']; expires: number }
>()

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function questionCacheKey(question: string): Promise<string> {
  const normalized = normalizeQuestion(question)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const HelpRequestSchema = z.object({
  question: z.string().min(1).max(4000).trim(),
})

const PROJECT_INQUIRY_KEYWORDS = [
  'quote', 'rfq', 'request for quote',
  'start a project', 'project inquiry', 'project',
  'recommend', 'recommendation',
]

/** Questions that ask for price/cost of a specific product should show the pricing calculator. */
const PRICING_CALCULATOR_PHRASES = [
  'how much for',
  'how much do',
  'pricing for',
  'price for',
  'cost for',
  'cost of',
  'price of',
]

function shouldForcePricingCalculator(question: string) {
  const lower = question.toLowerCase().trim()
  return PRICING_CALCULATOR_PHRASES.some((phrase) => lower.includes(phrase))
}

function shouldForceProjectInquiry(question: string) {
  const lower = question.toLowerCase()
  return PROJECT_INQUIRY_KEYWORDS.some((kw) => lower.includes(kw))
}

/** Demo sources shown until real RAG/knowledge-base is wired up. */
const DEMO_SOURCES: Array<{ id: string; url: string; title: string }> = [
  {
    id: 'demo-1',
    url: 'https://feather-canidae-1dc.notion.site/What-printing-methods-are-available-320eb5db19ec806c863cd3a7124a1dea',
    title: 'What printing methods are available? — PakSpecialist',
  },
]

type ProjectInquiryResult = {
  toolCallId: string
  toolName: 'start_project_inquiry'
  input: { reason: string }
  output: StartProjectInquiryOutput
}
type PricingCalculatorResult = {
  toolCallId: string
  toolName: 'show_pricing_calculator'
  input: { productIdOrName: string }
  output: ShowPricingCalculatorOutput
}

function buildAssistantMessage(
  id: string,
  text: string,
  staticToolResults: Array<ProjectInquiryResult | PricingCalculatorResult>,
  sources: Array<{ id: string; url: string; title?: string }> = [],
): HelpChatMessage {
  const parts: HelpChatMessage['parts'] = [
    {
      type: 'text',
      text: text || 'How can I help you with packaging today?',
      state: 'done',
    },
  ]
  for (const source of sources) {
    parts.push({
      type: 'source-url',
      sourceId: source.id,
      url: source.url,
      title: source.title,
    })
  }
  for (const tr of staticToolResults) {
    if (tr.toolName === 'start_project_inquiry') {
      parts.push({
        type: 'tool-start_project_inquiry',
        toolCallId: tr.toolCallId,
        state: 'output-available',
        input: tr.input,
        output: tr.output,
      })
    }
    if (tr.toolName === 'show_pricing_calculator') {
      parts.push({
        type: 'tool-show_pricing_calculator',
        toolCallId: tr.toolCallId,
        state: 'output-available',
        input: tr.input,
        output: tr.output,
      })
    }
  }
  return { id, role: 'assistant', parts }
}

export async function POST(req: Request) {
  const raw = await req.json()
  const parsed = HelpRequestSchema.safeParse(raw)

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request: question must be a non-empty string (max 4000 chars).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { question } = parsed.data
  const now = Date.now()

  const clientId = getClientId(req)
  if (!checkHelpRateLimit(clientId)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const cacheKey = await questionCacheKey(question)
  const cached = helpResponseCache.get(cacheKey)
  if (cached && cached.expires > now) {
    return Response.json({
      message: {
        id: crypto.randomUUID(),
        role: 'assistant',
        parts: cached.parts,
      } satisfies HelpChatMessage,
    })
  }

  const toolChoice =
    shouldForcePricingCalculator(question)
      ? { type: 'tool' as const, toolName: 'show_pricing_calculator' as const }
      : shouldForceProjectInquiry(question)
        ? { type: 'tool' as const, toolName: 'start_project_inquiry' as const }
        : csAgentConfig.toolChoice

  const result = await generateText({
    model: getModel(),
    system: csAgentSystemPrompt,
    messages: [{ role: 'user', content: question }],
    ...csAgentConfig,
    toolChoice,
  })

  const toolResults: Array<ProjectInquiryResult | PricingCalculatorResult> = []
  for (const r of result.staticToolResults) {
    if (r.toolName === 'start_project_inquiry') {
      toolResults.push({
        toolCallId: r.toolCallId,
        toolName: r.toolName,
        input: r.input as { reason: string },
        output: r.output as StartProjectInquiryOutput,
      })
    }
    if (r.toolName === 'show_pricing_calculator') {
      toolResults.push({
        toolCallId: r.toolCallId,
        toolName: r.toolName,
        input: r.input as { productIdOrName: string },
        output: r.output as ShowPricingCalculatorOutput,
      })
    }
  }

  const mappedSources = result.sources
    .filter((s): s is typeof s & { url: string } => 'url' in s && typeof (s as { url?: string }).url === 'string')
    .map((s) => ({ id: s.id, url: (s as { url: string }).url, title: (s as { title?: string }).title ?? undefined }))
  const sources: Array<{ id: string; url: string; title?: string }> =
    mappedSources.length > 0 ? mappedSources : DEMO_SOURCES

  const message = buildAssistantMessage(
    crypto.randomUUID(),
    result.text,
    toolResults,
    sources,
  )

  helpResponseCache.set(cacheKey, {
    parts: message.parts,
    expires: now + HELP_CACHE_TTL_MS,
  })

  return Response.json({ message })
}
