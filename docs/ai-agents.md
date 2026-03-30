# AI Agents — Design and Token Guidelines

This document describes the multi-agent architecture, when to use `useChat` vs `generateText`, token optimization, and verification.

---

## useChat vs generateText — When to Use Each

| | useChat | generateText |
|---|---|---|
| **Where** | Client hook (`@ai-sdk/react`) | Server (`ai`) |
| **Streaming** | Yes — tokens stream to UI | No — waits for full response |
| **Multi-turn** | Yes — maintains message history | No — single call |
| **Use for** | Brief Builder (conversational) | Help (Q&A: one question, one answer) |

**Concrete rule for this app:**

- **Help** — Q&A UX: one question → one answer. Uses **`generateText`** on the server; client sends a question and displays the full response (no streaming). Enables strict maxTokens, response cache (question hash, short TTL), and rate limiting.
- **Brief Builder** — Conversational “salesperson” UX. Uses **`useChat`** + **`streamText`** so replies stream; history is trimmed to the last 6 messages; brief state carries context. Rate limit and optional short-TTL stream cache.

---

## Token Optimization (Public App)

1. **Help (generateText)** — Single question validated (Zod); `maxTokens: 300`; response cache keyed by question hash (1 min TTL); rate limit 30 req/min per client (IP).
2. **Brief Builder (streamText)** — Limit history to last 6 messages (`modelMessages.slice(-6)`); `maxTokens: 300`; rate limit; optional short-TTL stream cache keyed by last user message + missingFields.
3. **Keep system prompts lean** — Prompts live in `src/lib/prompts/`; avoid padding, duplication, or verbose examples.
4. **Limit tool output payloads** — e.g. `sync_project_brief` returns `events[]`, `appliedUpdates[]`, `nextQuestion`; keep these small (no full object dumps).
5. **Model choice** — CS and Specialist default to gpt-4o-mini; upgrade to gpt-4o only if brief quality requires it.
6. **`stopWhen: stepCountIs(3)`** (or 2 for CS) — limits multi-step tool chaining per turn.

---

## Two Agents

### CS Agent (Customer Service)

- **Lives at** `/help`, API at `POST /api/chat`.
- **Backend:** `generateText` (one question to one answer). Request body: `{ question: string }`. Response: `{ message: HelpChatMessage }`. Response cache (question hash, 1 min TTL), rate limit (30 req/min per client).
- **Persona:** General packaging helper; answers questions, guides toward a quote.
- **Tools:** `start_project_inquiry` (handoff to `/project-brief`). Display tools (e.g. show_packaging_options, show_moq_pricing_factors) can be added as needed.
- **Handoff:** `start_project_inquiry` navigates the user to `/project-brief` (“Start Project Brief”).

### Brief Builder

- **Lives at** `/project-brief`, API at `POST /api/project-brief`.
- **Backend:** `streamText` with `useChat` on the client. Step-based guided flow with structured data capture.
- **Persona:** Dedicated brief builder; collects structured RFQ data through guided steps.
- **Tools:** Step-specific capture tools (profile, project details, product selection, billing).
- **Context:** Brief store is initialized on page load; step configs drive the conversation flow.

---

## Folder Structure

```
src/lib/
├── agents/           # Agent config — assembles tools + prompt reference
│   ├── model.ts      # Shared getModel() factory
│   ├── cs-agent.ts   # CS tools + config
├── prompts/          # System prompt strings, one per agent
│   └── cs-agent.ts
├── tools/            # One file per tool, reusable across agents
│   ├── sync-project-brief.ts
│   ├── start-project-inquiry.ts
│   ├── show-packaging-options.ts
│   ├── show-quote-readiness.ts
│   ├── show-moq-pricing-factors.ts
│   └── show-timeline-guidance.ts
├── supabase/
└── utils/
```

Each tool file exports: Zod input/output schemas, the `tool()` definition (with `execute` where needed), and optional system guidance. Agents import only the tools they need.

---

## Agent Config Pattern

Each agent is a plain config object that the route spreads into `streamText`. No class or abstraction.

Example:

```ts
// src/lib/agents/specialist-agent.ts
export const specialistAgentConfig = {
  tools: specialistAgentTools,
  activeTools: ['sync_project_brief'] as Array<'sync_project_brief'>,
  toolChoice: 'auto' as const,
  stopWhen: stepCountIs(3),
  maxTokens: 300,
}
```

Route (Specialist):

```ts
const result = streamText({
  model: getModel(),
  ...specialistAgentConfig,
  system: buildSpecialistPrompt(result.data.missingFields),
  messages: modelMessages.slice(-6),
})
```

---

## Handoff (CS → Specialist)

- **Current:** CS agent’s `start_project_inquiry` tool shows options; “Start Project Brief” navigates to `/project-brief`.
- **Optional later:** Pass handoff context (name/company/intent) via URL params or Zustand to pre-populate the brief.

---

## Verification

After changes:

1. `npm run build` — no import or type errors.
2. `/help` chat works (CS agent).
3. `/project-brief` chat works (Brief builder).
4. Handoff: “Start Project Brief” in help chat navigates to `/project-brief` correctly.
