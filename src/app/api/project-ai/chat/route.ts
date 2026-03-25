import { convertToModelMessages, safeValidateUIMessages, streamText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/agents/model'
import { specialistAgentConfig, specialistAgentTools } from '@/lib/agents/specialist-agent'
import { buildSpecialistPrompt } from '@/lib/prompts/specialist-agent'
import type { ProjectAiChatMessage } from '@/types/project-ai-chat'

export const runtime = 'edge'
export const maxDuration = 30

const PROJECT_AI_RATE_LIMIT_WINDOW_MS = 60_000
const PROJECT_AI_RATE_LIMIT_MAX_REQUESTS = 30

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

/** Returns true if this message is an assistant turn that contains tool/function calls. Gemini requires such turns to follow a user or function-response turn, so we must not start the window with one. */
function isAssistantWithToolCalls(msg: { role: string; toolCalls?: unknown[]; tool_calls?: unknown[] }): boolean {
  if (msg.role !== 'assistant') return false
  const calls = msg.toolCalls ?? msg.tool_calls
  return Array.isArray(calls) && calls.length > 0
}

/** Take the last maxWindow messages, then trim from the start so we never begin with an assistant message that has tool calls (satisfies Gemini message order). */
function trimToValidMessageWindow<T>(messages: T[], maxWindow: number): T[] {
  const window = messages.slice(-maxWindow)
  let start = 0
  while (start < window.length && isAssistantWithToolCalls(window[start] as { role: string; toolCalls?: unknown[]; tool_calls?: unknown[] })) {
    start += 1
  }
  // If every message was assistant-with-tool-calls, keep the whole window rather than sending empty
  return start < window.length ? window.slice(start) : window
}

const ChatRequestSchema = z.object({
  messages: z.unknown(),
  missingFields: z.array(z.string()).optional(),
  currentPhase: z.string().optional(),
})

/** Simple email pattern: user likely provided email as the last message. */
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getLastUserMessageText(messages: unknown): string {
  if (!Array.isArray(messages) || messages.length === 0) return ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as { role?: string; parts?: Array<{ type?: string; text?: string }> }
    if (msg?.role !== 'user') continue
    const parts = msg.parts ?? []
    const text = parts
      .filter((p): p is { type: string; text: string } => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
      .trim()
    return text
  }
  return ''
}

/** True when the user's last message likely provided the single remaining missing field (e.g. email). */
function shouldRequireSyncThisTurn(
  missingFields: string[] | undefined,
  lastUserText: string,
): boolean {
  if (!missingFields || missingFields.length !== 1) return false
  const only = missingFields[0]
  if (only === 'customer.email') return EMAIL_LIKE.test(lastUserText)
  return false
}

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

  // Gemini (and some providers) require: a function-call turn must come immediately after a user turn or a function-response turn. So we must not start the message window with an assistant message that contains tool calls.
  const messagesToSend = trimToValidMessageWindow(modelMessages, 12)

  const lastUserText = getLastUserMessageText(result.data.messages)
  const mustSyncThisTurn = shouldRequireSyncThisTurn(
    result.data.missingFields,
    lastUserText,
  )

  // SCALE: This route receives missingFields and currentPhase from the client. System prompt is built here; scaling = more fields in client payload and prompt template.
  const resultText = streamText({
    model: getModel(),
    system: buildSpecialistPrompt(
      result.data.missingFields,
      result.data.currentPhase,
      mustSyncThisTurn,
    ),
    messages: messagesToSend,
    ...specialistAgentConfig,
  })

  return resultText.toUIMessageStreamResponse<ProjectAiChatMessage>()
}
