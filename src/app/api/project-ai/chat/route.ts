import { convertToModelMessages, safeValidateUIMessages, streamText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/agents/model'
import { specialistAgentConfig, specialistAgentTools } from '@/lib/agents/specialist-agent'
import { shouldExpectSyncForMessage } from '@/lib/brief-sync-heuristics'
import { buildSpecialistPrompt } from '@/lib/prompts/specialist-agent'
import type { KnowledgeRetrievalResult } from '@/lib/rag/pinecone-retrieval'
import { retrieveHelpKnowledge } from '@/lib/rag/pinecone-retrieval'
import type { ProjectAiChatMessage } from '@/types/project-ai-chat'

export const runtime = 'edge'
export const maxDuration = 30

const PROJECT_AI_RATE_LIMIT_WINDOW_MS = 60_000
const PROJECT_AI_RATE_LIMIT_MAX_REQUESTS = 30
const GEMINI_SAFE_MESSAGE_WINDOW = 24

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

type ModelMessageLike = {
  role: string
  content?: unknown
  toolCalls?: unknown[]
  tool_calls?: unknown[]
}

function hasToolCallContentPart(content: unknown): boolean {
  if (!Array.isArray(content)) return false
  return content.some((part) => {
    if (typeof part !== 'object' || part == null) return false
    return (part as { type?: unknown }).type === 'tool-call'
  })
}

/** Returns true if this assistant message contains tool/function calls. */
function isAssistantWithToolCalls(msg: ModelMessageLike): boolean {
  if (msg.role !== 'assistant') return false
  const calls = msg.toolCalls ?? msg.tool_calls
  if (Array.isArray(calls) && calls.length > 0) return true
  return hasToolCallContentPart(msg.content)
}

function isToolResponseMessage(msg: ModelMessageLike): boolean {
  return msg.role === 'tool'
}

/** Take the last maxWindow messages and trim invalid leading turns for Gemini function-calling order. */
export function trimToValidMessageWindow<T extends ModelMessageLike>(messages: T[], maxWindow: number): T[] {
  const window = messages.slice(-maxWindow)
  let start = 0
  while (start < window.length) {
    const first = window[start]
    if (isToolResponseMessage(first) || isAssistantWithToolCalls(first)) {
      start += 1
      continue
    }
    break
  }
  // If every message in the window is trimmed, keep the original slice to avoid sending empty history.
  return start < window.length ? window.slice(start) : window
}

const ChatRequestSchema = z.object({
  messages: z.unknown(),
  missingFields: z.array(z.string()).optional(),
  currentPhase: z.string().optional(),
  forceSync: z.boolean().optional(),
})

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
  const messagesToSend = trimToValidMessageWindow(modelMessages, GEMINI_SAFE_MESSAGE_WINDOW)

  const lastUserText = getLastUserMessageText(result.data.messages)
  const mustSyncFromHeuristics = shouldExpectSyncForMessage({
    currentPhase: result.data.currentPhase,
    missingFields: result.data.missingFields,
    messageText: lastUserText,
  })
  const mustSyncThisTurn = mustSyncFromHeuristics || Boolean(result.data.forceSync)
  if (mustSyncThisTurn) {
    console.info('[project-ai] must_sync_hint', {
      phase: result.data.currentPhase ?? 'unknown',
      fromHeuristics: mustSyncFromHeuristics,
      forced: Boolean(result.data.forceSync),
    })
  }

  const retrievalStart = Date.now()
  let ragContext = ''
  let ragSources: Array<{ id: string; url: string; title?: string }> = []
  let retrieval: KnowledgeRetrievalResult | null = null
  if (lastUserText.length > 0) {
    try {
      retrieval = await retrieveHelpKnowledge(lastUserText)
      ragContext = retrieval?.context ?? ''
      ragSources = retrieval?.sources ?? []
      const tookMs = Date.now() - retrievalStart
      console.info('[help-rag] retrieval', {
        tookMs,
        contextChars: ragContext.length,
        sourceCount: ragSources.length,
        hitCount: retrieval?.hitCount ?? 0,
      })
    } catch (error) {
      const tookMs = Date.now() - retrievalStart
      console.error('[help-rag] retrieval_failed', {
        tookMs,
        error: error instanceof Error ? error.message : 'unknown error',
      })
    }
  }

  // SCALE: This route receives missingFields and currentPhase from the client. System prompt is built here; scaling = more fields in client payload and prompt template.
  const specialistPrompt = buildSpecialistPrompt(
    result.data.missingFields,
    result.data.currentPhase,
    mustSyncThisTurn,
  )
  const sourceHints = ragSources.length > 0
    ? `\n\nRelevant source URLs:\n${ragSources
      .map((source) => `- ${source.title ? `${source.title}: ` : ''}${source.url}`)
      .join('\n')}`
    : ''
  const systemPrompt = ragContext.length > 0
    ? `${specialistPrompt}

Knowledge snippets:
${ragContext}${sourceHints}

Instruction:
- Prefer the provided knowledge snippets for factual details.
- If a source URL is relevant, include it in your reply.
- If snippets do not answer the question, say that clearly and ask a concise follow-up.`
    : specialistPrompt

  const resultText = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: messagesToSend,
    ...specialistAgentConfig,
  })

  return resultText.toUIMessageStreamResponse<ProjectAiChatMessage>()
}
