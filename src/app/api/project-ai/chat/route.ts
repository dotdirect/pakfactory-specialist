import { convertToModelMessages, safeValidateUIMessages, streamText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/agents/model'
import { specialistAgentConfig, specialistAgentTools } from '@/lib/agents/specialist-agent'
import { buildSpecialistPrompt } from '@/lib/prompts/specialist-agent'
import type { ProjectAiChatMessage } from '@/types/project-ai-chat'

export const runtime = 'edge'

const PROJECT_AI_RATE_LIMIT_WINDOW_MS = 60_000
const PROJECT_AI_RATE_LIMIT_MAX_REQUESTS = 30
const PROJECT_AI_CACHE_TTL_MS = 60_000 // 1 minute

const projectAiStreamCache = new Map<
  string,
  { chunks: Uint8Array[]; expires: number; headers: Headers }
>()

function getLastUserText(messages: ProjectAiChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    const text = m.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ')
    return (text ?? '').trim()
  }
  return ''
}

async function projectAiCacheKey(
  lastUserText: string,
  missingFields: string[] | undefined,
  currentPhase: string | undefined,
): Promise<string> {
  const normalized = JSON.stringify([
    lastUserText.trim().toLowerCase().replace(/\s+/g, ' '),
    [...(missingFields ?? [])].sort(),
    currentPhase ?? '',
  ])
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized),
  )
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type RateLimitEntry = { count: number; windowStart: number }
const projectAiRateLimitMap = new Map<string, RateLimitEntry>()

function getClientId(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function checkProjectAiRateLimit(clientId: string): boolean {
  const now = Date.now()
  const entry = projectAiRateLimitMap.get(clientId)
  if (!entry) {
    projectAiRateLimitMap.set(clientId, { count: 1, windowStart: now })
    return true
  }
  if (now - entry.windowStart >= PROJECT_AI_RATE_LIMIT_WINDOW_MS) {
    entry.count = 1
    entry.windowStart = now
    return true
  }
  if (entry.count >= PROJECT_AI_RATE_LIMIT_MAX_REQUESTS) return false
  entry.count += 1
  return true
}

const ChatRequestSchema = z.object({
  messages: z.unknown(),
  missingFields: z.array(z.string()).optional(),
  currentPhase: z.string().optional(),
})

export async function POST(req: Request) {
  const clientId = getClientId(req)
  if (!checkProjectAiRateLimit(clientId)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const raw = await req.json()
  const result = ChatRequestSchema.safeParse(raw)

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const validatedMessages = await safeValidateUIMessages<ProjectAiChatMessage>({
    messages: result.data.messages,
    tools: specialistAgentTools,
  })

  if (!validatedMessages.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid UI message format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const modelMessages = await convertToModelMessages(validatedMessages.data, {
    tools: specialistAgentTools,
  })

  const lastUserText = getLastUserText(validatedMessages.data)
  const cacheKey = await projectAiCacheKey(
    lastUserText,
    result.data.missingFields,
    result.data.currentPhase,
  )
  const now = Date.now()
  const cached = projectAiStreamCache.get(cacheKey)
  if (cached && cached.expires > now) {
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of cached.chunks) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })
    return new Response(stream, { headers: cached.headers })
  }

  // SCALE: This route receives missingFields and currentPhase from the client. System prompt is built here; scaling = more fields in client payload and prompt template.
  const resultText = streamText({
    model: getModel(),
    system: buildSpecialistPrompt(result.data.missingFields, result.data.currentPhase),
    messages: modelMessages.slice(-6),
    ...specialistAgentConfig,
  })

  const response = resultText.toUIMessageStreamResponse<ProjectAiChatMessage>()
  const [stream1, stream2] = response.body!.tee()
  const headersToStore = new Headers(response.headers)

  const reader = stream2.getReader()
  const chunks: Uint8Array[] = []
  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      projectAiStreamCache.set(cacheKey, {
        chunks,
        expires: now + PROJECT_AI_CACHE_TTL_MS,
        headers: headersToStore,
      })
    } finally {
      reader.releaseLock()
    }
  })()

  return new Response(stream1, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
