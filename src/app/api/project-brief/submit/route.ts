import { z } from 'zod'
import { TechnicalBriefSchema } from '@/types/brief'
import { submitLeadToN8n } from '@/lib/services/n8n-webhook'

export const runtime = 'edge'

const SubmitRequestSchema = z.object({
  brief: TechnicalBriefSchema,
})

export async function POST(req: Request) {
  const raw = await req.json()
  const result = SubmitRequestSchema.safeParse(raw)

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid brief format', details: result.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    await submitLeadToN8n(result.data.brief)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[submit-lead] n8n webhook error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to submit lead. Please try again.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
