# Botpress Reference

## MCP First — Every Time

Botpress SDK changes frequently. Before writing any Botpress code, fetch live docs:

```
fetch https://botpress.com/docs/developers/sdk/introduction
fetch https://botpress.com/docs/developers/webchat/embedding
fetch https://botpress.com/docs/developers/sdk/events
```

Never rely on training data for Botpress API signatures, event shapes, or node APIs.

---

## Two Integration Phases

| Phase | Mechanism | When to use |
|---|---|---|
| Phase 1 | WebChat iframe + `postMessage` listener | Quick setup, no SDK install needed |
| Phase 2 | Botpress JS SDK direct integration | Full control, type-safe, production |

---

## Phase 1 — WebChat Embed + postMessage

### Embedding the WebChat

```tsx
// components/features/BotpressChat.tsx
"use client"
import { useEffect } from "react"
import { useBrief } from "@/context/BriefContext"

export function BotpressChat() {
  const { setBrief } = useBrief()

  useEffect(() => {
    // Listen for messages from the WebChat iframe
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "BRIEF_UPDATE") {
        setBrief(event.data.data)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [setBrief])

  return (
    <div id="botpress-webchat-container">
      <script
        src="https://cdn.botpress.cloud/webchat/v2/inject.js"
        async
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.botpressWebChat.init({
              botId: "${process.env.NEXT_PUBLIC_BOTPRESS_BOT_ID}",
              hostUrl: "https://cdn.botpress.cloud/webchat/v2",
            });
          `,
        }}
      />
    </div>
  )
}
```

### Emitting from Botpress Workflow (Execute Code node)

```javascript
// Inside Botpress Execute Code node
const briefPayload = {
  type: "BRIEF_UPDATE",
  data: {
    productLine: workflow.selectedProduct,
    quantity: workflow.quantity,
    application: workflow.application,
    specifications: workflow.specifications ?? {},
    completionScore: workflow.completionScore ?? 0,
  },
}

// Post message to parent window (Next.js app)
bp.events.sendEvent({
  type: "custom",
  channel: "web",
  target: event.target,
  payload: briefPayload,
})
```

---

## Phase 2 — Botpress JS SDK

### Install

```bash
npm install @botpress/client @botpress/sdk
```

### SDK Client Setup

```ts
// lib/botpress/client.ts
import { Client } from "@botpress/client"

export const botpressClient = new Client({
  token: process.env.BOTPRESS_TOKEN!,
  workspaceId: process.env.BOTPRESS_WORKSPACE_ID!,
  botId: process.env.NEXT_PUBLIC_BOTPRESS_BOT_ID!,
})
```

### Listening for Events (Phase 2)

```tsx
// context/BriefContext.tsx — Phase 2 version
"use client"
import { useEffect, useState } from "react"
import { botpressClient } from "@/lib/botpress/client"
import type { TechnicalBrief } from "@/types/brief"

export function BriefProvider({ children }: { children: React.ReactNode }) {
  const [brief, setBrief] = useState<TechnicalBrief | null>(null)

  useEffect(() => {
    const unsubscribe = botpressClient.events.on("brief:update", (payload) => {
      setBrief(payload.data)
    })
    return () => unsubscribe()
  }, [])

  return (
    <BriefContext.Provider value={{ brief, setBrief }}>
      {children}
    </BriefContext.Provider>
  )
}
```

---

## Workflow Variable Rules

### The `workflow.selectedProduct` Bug Fix

Botpress can lose `workflow.*` values between certain node transitions.
Always use the double-write pattern:

```javascript
// In every Execute Code node that sets selectedProduct
workflow.selectedProduct = productId       // primary
session.lastSelectedProduct = productId    // backup

// In every node that READS selectedProduct
const productId = workflow.selectedProduct ?? session.lastSelectedProduct
workflow.selectedProduct = productId       // re-affirm before using
```

Add a Condition node after any node that sets `workflow.selectedProduct`:
```
Condition: workflow.selectedProduct !== undefined
  → true: continue
  → false: re-run collection node
```

### Variable Scope Reference

| Scope | Persists | Use for |
|---|---|---|
| `workflow.*` | Current flow only | In-progress conversation data |
| `session.*` | Entire session | Backup values, cross-flow data |
| `user.*` | Across sessions | User preferences, history |
| `event.*` | Current event only | Incoming payload (read-only) |

---

## Event Contract — Bot to Frontend

The shape the bot must emit. Validated on the frontend with Zod.

```ts
// lib/validations/botpress-event.ts
import { z } from "zod"

export const BriefUpdateEventSchema = z.object({
  type: z.literal("BRIEF_UPDATE"),
  data: z.object({
    productLine: z.string().nullable(),
    productSku: z.string().nullable().optional(),
    application: z.string().nullable(),
    quantity: z.number().nullable(),
    specifications: z.record(z.union([z.string(), z.number()])).default({}),
    customRequirements: z.string().nullable().optional(),
    completionScore: z.number().min(0).max(100),
    sourceFlow: z.enum([
      "direct_rfq",
      "recommendation",
      "cs_pivot",
      "status_lookup",
    ]),
  }),
})

export type BriefUpdateEvent = z.infer<typeof BriefUpdateEventSchema>
```

Always parse incoming bot events through this schema before passing to `setBrief`.

---

## Webhook Route (Bot → Backend)

```ts
// app/api/botpress/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import { BriefUpdateEventSchema } from "@/lib/validations/botpress-event"
import { ZodError } from "zod"

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = req.headers.get("x-botpress-secret")
  if (secret !== process.env.BOTPRESS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const event = BriefUpdateEventSchema.parse(body)

    // Process validated event
    // e.g. persist to Supabase, trigger revalidation, etc.

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (e) {
    if (e instanceof ZodError) {
      // Reject non-conforming payloads — never silently accept bad data
      return NextResponse.json(
        { error: "Invalid payload", issues: e.issues },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

---

## Node Naming Convention

```
[Phase]_[FlowName]_[NodePurpose]

P1_RFQ_CollectProductType
P1_RFQ_ValidateSpecs
P2_Recommendation_SendBrief
CS_DetectPivot
CS_TransferToSales
```

---

## Agent Transfer Protocol

Before any Botpress agent transfer node, set:

```javascript
workflow.handoff = {
  fromAgent: "cs",                          // current agent
  toAgent: "sales",                         // target agent
  timestamp: new Date().toISOString(),
  userSummary: workflow.conversationSummary,
  productContext: workflow.selectedProduct,
  collectedFields: workflow.briefFields,    // skip re-collecting these
}
```

The receiving agent's entry node must check `workflow.handoff` and skip
already-collected fields.

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_BOTPRESS_BOT_ID=        # safe to expose — used in WebChat embed
BOTPRESS_TOKEN=                     # secret — SDK auth, never NEXT_PUBLIC_
BOTPRESS_WORKSPACE_ID=              # secret
BOTPRESS_WEBHOOK_SECRET=            # secret — webhook verification
```

---

## Botpress Checklist (pre-ship)

- [ ] Fetched live Botpress SDK docs before implementing
- [ ] `workflow.selectedProduct` double-write pattern applied to all relevant nodes
- [ ] Event payload validated against `BriefUpdateEventSchema` before use
- [ ] Webhook verifies `x-botpress-secret` header
- [ ] Webhook returns 422 for non-conforming payloads
- [ ] All 4 entry flows tested end-to-end
- [ ] `workflow.handoff` populated before every agent transfer
- [ ] `BOTPRESS_TOKEN` is not in any `NEXT_PUBLIC_*` variable
