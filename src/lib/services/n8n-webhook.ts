import type { TechnicalBrief } from '@/types/brief'
import { parseN8nEnv } from '@/lib/env/server'

/**
 * Submit a completed lead brief to the n8n webhook.
 * Server-only — never import this in client-facing code.
 * Silently no-ops if N8N_LEAD_WEBHOOK_URL is not configured.
 */
export async function submitLeadToN8n(brief: TechnicalBrief): Promise<void> {
  const env = parseN8nEnv()
  if (!env) {
    console.warn('[n8n-webhook] N8N_LEAD_WEBHOOK_URL not configured — skipping lead submission.')
    return
  }

  const res = await fetch(env.N8N_LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      submittedAt: new Date().toISOString(),
      source: 'pakfactory-specialist',
    }),
  })

  if (!res.ok) {
    console.error(`[n8n-webhook] Webhook returned ${res.status}: ${await res.text()}`)
    throw new Error(`n8n webhook returned ${res.status}`)
  }
}
