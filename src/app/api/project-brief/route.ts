import { convertToModelMessages, isTextUIPart, safeValidateUIMessages, streamText, type UIMessage, type ToolSet } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/agents/model'
import { STEP_IDS, FLOW_IDS } from '@/lib/steps/types'
import { getStepConfig } from '@/lib/steps/step-configs'
import { getFlowConfig } from '@/lib/steps/flow-configs'
import { moderateMessage } from '@/lib/moderation/preflight-check'
import { retrieveProductRecommendations } from '@/lib/rag/product-retrieval'
import { setRagProductCache } from '@/lib/tools/product-recommendations'
import type { TechnicalBrief } from '@/types/brief'

export const runtime = 'edge'
export const maxDuration = 30

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30

type RateLimitEntry = { count: number; windowStart: number }
const rateLimitMap = new Map<string, RateLimitEntry>()

function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue
    return messages[i].parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join('')
      .trim()
  }
  return ''
}

function getClientId(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(clientId)
  if (!entry) {
    rateLimitMap.set(clientId, { count: 1, windowStart: now })
    return true
  }
  if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry.count = 1
    entry.windowStart = now
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false
  entry.count += 1
  return true
}

function buildRecommendationQuery(brief: TechnicalBrief | null): { query: string; industry?: string } | null {
  if (!brief) return null
  // Semantic query focuses on what the user is packaging + their project context
  const parts: string[] = []
  if (brief.project?.productItem) parts.push(`packaging for ${brief.project.productItem}`)
  if (brief.customer?.industry) parts.push(`${brief.customer.industry} industry`)
  if (brief.project?.summary) parts.push(brief.project.summary)
  if (!parts.length) return null
  return {
    query: parts.join('. '),
    industry: brief.customer?.industry,
  }
}

const StructuredChatRequestSchema = z.object({
  messages: z.unknown(),
  stepKey: z.enum(STEP_IDS),
  flowId: z.enum(FLOW_IDS),
  briefSnapshot: z.unknown().optional(),
})

export async function POST(req: Request) {
  const clientId = getClientId(req)
  if (!checkRateLimit(clientId)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const raw = await req.json()
  const result = StructuredChatRequestSchema.safeParse(raw)

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request format', details: result.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { stepKey, flowId, briefSnapshot, messages } = result.data

  const stepConfig = getStepConfig(stepKey)
  const flowConfig = getFlowConfig(flowId)

  const tools: ToolSet = { [stepConfig.toolName]: stepConfig.tool as ToolSet[string] }

  // safeValidateUIMessages validates message structure; tool-schema validation is skipped here
  // because step tools are dynamically selected at runtime (not statically typed per route).
  const validatedMessages = await safeValidateUIMessages({ messages })

  if (!validatedMessages.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid UI message format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const lastUserText = getLastUserText(validatedMessages.data)
  if (lastUserText.length > 0) {
    const modResult = await moderateMessage(lastUserText)
    if (modResult.flagged) {
      const stepLabel = stepConfig.label.toLowerCase()
      const message = modResult.redirectMessage.replace('[step]', stepLabel)
      const redirectResult = streamText({
        model: getModel(),
        system: `Respond with exactly this message verbatim, nothing else: "${message}"`,
        messages: [{ role: 'user', content: 'respond' }],
        maxOutputTokens: 120,
      })
      return redirectResult.toUIMessageStreamResponse()
    }
  }

  const modelMessages = await convertToModelMessages(validatedMessages.data)

  let systemPrompt = stepConfig.buildSystemPrompt(
    (briefSnapshot as TechnicalBrief | null) ?? null,
    flowConfig,
  )

  // Retrieve product recommendations via RAG when entering the recommend step
  if (stepKey === 'recommend') {
    const brief = (briefSnapshot as TechnicalBrief | null) ?? null
    const queryOpts = buildRecommendationQuery(brief)
    console.log('[recommend] RAG query:', queryOpts)
    if (queryOpts) {
      const ragResult = await retrieveProductRecommendations({ ...queryOpts, topK: 3 })
      const { products, hitCount, filterTier, aliasesUsed } = ragResult
      console.log(`[recommend] RAG returned ${hitCount} products (filterTier=${filterTier ?? 'none'}):`, products.map(p => p.productName))
      if (products.length > 0) {
        // Cache RAG products so the tool can inject metadata server-side
        // (the AI doesn't need to copy the large metadata object)
        setRagProductCache(products)

        // Strip metadata from the prompt to keep it small — the tool injects it back
        const productsForPrompt = products.map(({ metadata: _meta, ...rest }) => rest)
        const ragDebugBlock = JSON.stringify({ query: queryOpts.query, industry: queryOpts.industry, filterTier: filterTier ?? 'none', aliasesUsed })
        systemPrompt += `\n\n## Retrieved Product Recommendations\n${JSON.stringify(productsForPrompt, null, 2)}\n\n## RAG Debug (pass as ragDebug)\n${ragDebugBlock}\n\nPresent these products to the user by calling product_recommendations. Copy each product's fields and ADD a personalized "recommendationNote" for each based on the user's project details. Also include a brief summary and the ragDebug object above.`
      } else {
        systemPrompt += `\n\n## Retrieved Product Recommendations\nNo matching products were found in the catalog. Let the user know and suggest they describe their needs differently, or offer to skip to manual product selection.`
      }
    }
  }

  // Force tool call for the recommend step when products are available,
  // otherwise the AI sometimes responds with text instead of calling the tool.
  const hasRecommendations = stepKey === 'recommend' && systemPrompt.includes('## Retrieved Product Recommendations\n[')
  const textResult = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    toolChoice: hasRecommendations ? 'required' : 'auto',
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'project-brief',
      metadata: {
        stepKey,
        flowId,
        hasRecommendations: String(hasRecommendations),
      },
    },
  })

  return textResult.toUIMessageStreamResponse()
}
