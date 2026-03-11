import { generateText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/agents/model'
import { csAgentConfig } from '@/lib/agents/cs-agent'
import { csAgentSystemPrompt } from '@/lib/prompts/cs-agent'
import type { StartProjectInquiryOutput } from '@/lib/tools/start-project-inquiry'
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
  'quote', 'pricing', 'rfq', 'request for quote',
  'start a project', 'project inquiry', 'project',
  'recommend', 'recommendation',
]

function shouldForceProjectInquiry(question: string) {
  const lower = question.toLowerCase()
  return PROJECT_INQUIRY_KEYWORDS.some((kw) => lower.includes(kw))
}

function buildAssistantMessage(
  id: string,
  text: string,
  staticToolResults: Array<{
    toolCallId: string
    toolName: string
    input: { reason: string }
    output: StartProjectInquiryOutput
  }>,
): HelpChatMessage {
  const parts: HelpChatMessage['parts'] = [
    {
      type: 'text',
      text: text || 'How can I help you with packaging today?',
      state: 'done',
    },
  ]
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

  const result = await generateText({
    model: getModel(),
    system: csAgentSystemPrompt,
    messages: [{ role: 'user', content: question }],
    ...csAgentConfig,
    toolChoice: shouldForceProjectInquiry(question)
      ? { type: 'tool', toolName: 'start_project_inquiry' }
      : csAgentConfig.toolChoice,
  })

  const message = buildAssistantMessage(
    crypto.randomUUID(),
    result.text,
    result.staticToolResults
      .filter(
        (r): r is typeof r & { toolName: 'start_project_inquiry'; input: { reason: string }; output: StartProjectInquiryOutput } =>
          r.toolName === 'start_project_inquiry',
      )
      .map((r) => ({
        toolCallId: r.toolCallId,
        toolName: r.toolName,
        input: r.input,
        output: r.output,
      })),
  )

  helpResponseCache.set(cacheKey, {
    parts: message.parts,
    expires: now + HELP_CACHE_TTL_MS,
  })

  return Response.json({ message })
}
