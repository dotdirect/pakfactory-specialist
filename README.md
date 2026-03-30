# PakSpecialist

PakSpecialist is a packaging RFQ (Request for Quote) platform powered by conversational AI. It features two interfaces: a **Help Center** where customers ask packaging questions grounded by a RAG knowledge base, and a **Project Brief Builder** that guides customers through a multi-step conversational wizard to build a detailed packaging quote — complete with AI-driven product recommendations from a Pinecone vector catalog. The app uses an event-driven architecture where AI tools emit structured events that drive a Zustand state store, and supports session recovery, content moderation, and multiple conversation flows.

---

<!-- AUTO:STACK:START -->
## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui (Radix UI) | — |
| Database | Supabase (Postgres + RLS) | 2.99.0 |
| Auth | Supabase Auth (SSR) | 0.9.0 |
| State | Zustand (immer + devtools) | 5.0.11 |
| Validation | Zod | 4.3.6 |
| AI | Vercel AI SDK (OpenAI, Anthropic, Google) | 6.0.116 |
| Vector DB | Pinecone | — |
| Icons | Lucide React | 0.577.0 |
| Deployment | Vercel | — |
<!-- AUTO:STACK:END -->

---

<!-- AUTO:GETTING_STARTED:START -->
## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Setup

```bash
git clone <repo-url>
cd pakfactory-specialist
npm install
cp .env.local.example .env.local   # see Environment Variables below
npm run dev
```

### Available Scripts

| Script | Command |
|---|---|
| `dev` | `npm run dev` — Start development server |
| `build` | `npm run build` — Production build |
| `start` | `npm run start` — Start production server |
| `lint` | `npm run lint` — Run ESLint |
| `test` | `npm run test` — Run Vitest unit tests |
<!-- AUTO:GETTING_STARTED:END -->

---

## How It Works

The app is built around two AI agents, each serving a distinct purpose but sharing the same underlying infrastructure (model factory, Pinecone RAG, tool architecture).

### Help Center (`/help-center`)

A single Q&A chatbot powered by a CS Agent persona named "Anthony". The user asks a packaging question, and the agent responds with a single answer (no multi-turn streaming).

- **API**: `POST /api/chat` using `generateText()` (one question, one answer)
- **RAG**: Embeds the question and queries a Pinecone knowledge base to ground answers in factual packaging information. Results are injected into the system prompt as "Knowledge snippets" with source citations displayed in the UI.
- **Tools**: `start_project_inquiry` (renders a handoff card that routes to `/project-brief`) and `show_pricing_calculator` (renders an interactive pricing UI with quantity slider and shipping options)
- **Keyword detection**: Automatically forces the appropriate tool when the question contains pricing phrases ("how much", "cost of") or project phrases ("quote", "rfq", "start a project")
- **Caching**: Response cache keyed by SHA-256 of (normalized question + sorted Pinecone chunk IDs), 1-minute TTL. The chunk ID fingerprint ensures cache invalidates when the Pinecone index changes.
- **Rate limit**: 30 requests/minute per client IP (in-memory)

### Brief Builder (`/project-brief`)

A multi-turn streaming conversation that guides customers through a step-based flow to build a complete packaging brief. The UI is a dual-panel layout: chat on the left, live brief summary on the right.

- **API**: `POST /api/project-brief` using `useChat` + `streamText()` (streaming, multi-turn)
- **Step-based**: Each step has exactly one bound AI tool. The system prompt forces the AI to call that tool immediately with validated data. When the tool succeeds, the store advances to the next step.
- **State**: Zustand store (`useBriefStore`) holds the `TechnicalBrief` object. All mutations happen through `BriefEvent` objects emitted by tools — the store's `handleBriefEvent()` dispatcher applies each event.
- **Session recovery**: Brief state + conversation log (last 200 messages) persist to `localStorage` on every step completion. On return visits within 7 days, the user is offered "Continue where you left off" or "Start over".
- **Submission**: When all steps complete, the brief is POSTed to an n8n webhook via `POST /api/project-brief/submit`.

### Content Moderation

Every user message in the Brief Builder passes through a preflight check (`src/lib/moderation/preflight-check.ts`) before reaching the AI:

- Uses Claude Haiku for fast classification into: `safe`, `off_topic`, `inappropriate`, `legal_threat`, `manipulation`
- **Fail-open design**: Returns `safe` on timeout (2s), missing API key, or parse error
- Flagged messages receive a canned redirect response; the AI tool is never called

### Model Factory

The AI provider is swappable via a single env var (`AI_PROVIDER`):

| Provider | Default Model |
|----------|---------------|
| `openai` | `gpt-4o-mini` |
| `anthropic` | `claude-sonnet-4-20250514` |
| `google` | `gemini-2.5-flash` |

Override with `AI_MODEL` for any specific model ID. The factory lives in `src/lib/agents/model.ts`.

---

## Conversation Flows & Steps

The Brief Builder uses a composable **flow/step** architecture defined in `src/lib/steps/`. Flows are ordered sequences of steps. Steps are self-contained units that each bind a single AI tool.

### Flows

A flow defines which steps to run and in what order. Adding a new flow means adding a config object — no changes to routing or the API layer.

| Flow | Steps | Use Case |
|------|-------|----------|
| `rfq-full` | profile → project-details → recommend → product-select → billing | Full RFQ with AI-driven product recommendations |
| `quick-inquiry` | profile → project-details | Fast inquiry — just name + project context |
| `direct-order` | profile → product-select → billing | Returning customer who knows what they want |

All flows call `submit-n8n` on completion.

### Steps

Each step defines:
- **Opening message** — displayed immediately when the step activates (no API call)
- **System prompt builder** — dynamically includes already-collected fields, step guidance, and guardrails
- **Bound tool** — the single AI tool available during this step; the system prompt forces the AI to call it
- **Advancement** — linear within the flow, or overridden via `nextStep` in the tool output

| Step | Tool | What It Collects | Events Emitted |
|------|------|------------------|----------------|
| `profile` | `capture_profile` | firstName, lastName, email, phone (opt), company (opt) | `brief.identity.confirmed` |
| `project-details` | `capture_project_details` | industry (17-value enum), productItem, deliveryCountry, budget (opt), notes (opt) | `brief.project.context_confirmed` |
| `recommend` | `product_recommendations` | Auto-triggered — presents RAG product cards | None until user confirms selection |
| `product-select` | `capture_product_selection` | 1–3 products with quantities, dimensions, material, finish, add-ons | `brief.product.added` (per product) |
| `billing` | `capture_billing` | street, city, postalCode, country, phone | `brief.billing.confirmed` + `brief.identity.confirmed` (phone) |

### The Recommend Step (Special Behavior)

The recommend step is unique because it auto-triggers without user input and renders interactive generative UI:

1. When the step activates, the hook automatically sends: *"Find product recommendations for my project"*
2. The API builds a semantic query from the brief snapshot: `productItem + industry + project summary`
3. Pinecone `products` namespace is queried (topK: 6, optional industry filter)
4. Products are injected into the system prompt as JSON; the AI calls `product_recommendations` with the full array
5. **Interactive product cards** render below the AI message (generative UI)
6. User **confirms** → `brief.product.added` events fire for each selected product → advances to `product-select`
7. User **skips** → advances without adding products
8. User **requests more** → re-queries Pinecone with different parameters

### Event-Driven State

All brief mutations flow through a `BriefEvent` discriminated union (`src/types/brief-events.ts`):

```
brief.identity.confirmed    → updates customer info
brief.project.context_confirmed → updates project details
brief.intent.confirmed      → sets RFQ type + channel
brief.product.added         → adds a line item
brief.product.removed       → removes a line item
brief.specs.confirmed       → updates product specs
brief.timeline.confirmed    → sets urgency + deadline
brief.billing.confirmed     → sets shipping address
brief.submitted             → marks brief as submitted
```

Tools emit events → the `handleBriefEvent()` dispatcher in the Zustand store applies them → UI reactively updates. This decouples tool logic from state mutations and makes the system extensible.

---

## RAG Strategy

The app uses two distinct retrieval strategies that share the same embedding pipeline. Both query Pinecone but serve different purposes, use different namespaces, and have different output formats.

### Shared Embedding Pipeline

- **Provider-agnostic**: `AI_EMBEDDING_PROVIDER` selects OpenAI or Google
- **Model**: Configured via `AI_EMBEDDING_MODEL` (must match the vectors stored in the Pinecone index)
- **Implementation**: Uses Vercel AI SDK `embed()` function from `src/lib/rag/pinecone-retrieval.ts`

### Strategy 1: Knowledge Retrieval (Help Center)

**Purpose**: Ground the CS agent's answers in factual packaging knowledge so responses are accurate and citable.

**Flow**:
```
User question
  → embed question using AI_EMBEDDING_MODEL
  → query Pinecone default namespace (topK configurable, default 5)
  → extract chunks (max 6000 chars total)
  → inject as "Knowledge snippets" in system prompt
  → AI generates answer grounded in retrieved context
  → sources displayed as citation links in UI
```

**Metadata contract** — Pinecone chunks must include at least one of these field patterns:

| Field | Purpose |
|-------|---------|
| `chunk_text`, `text`, `content`, or `body` | Passage text injected into the system prompt |
| `url`, `source_url`, `sourceUrl`, or `link` | Displayed as a clickable "Sources" link |
| `title`, `source_title`, `sourceTitle`, or `name` | Optional label for the source link |

**Caching**: SHA-256 hash of `(normalized_question + sorted_chunk_IDs)` → 1-minute TTL. The sorted chunk IDs in the fingerprint ensure the cache invalidates whenever the Pinecone index content changes, even if the question is identical.

**Graceful degradation**: If Pinecone env vars are not configured, `retrieveHelpKnowledge()` returns `null` and the agent operates without RAG context — it still answers from its training data.

### Strategy 2: Product Retrieval (Brief Builder)

**Purpose**: Recommend real products from the packaging catalog during the `recommend` step, using semantic similarity to the customer's project description.

**Flow**:
```
Brief snapshot (productItem + industry + project summary)
  → build semantic query string
  → embed query using AI_EMBEDDING_MODEL
  → query Pinecone "products" namespace (topK: 6)
  → attempt industry metadata filter ($eq) first
  → fall back to pure semantic search if no results
  → filter matches by score >= 0.3
  → return structured ProductRecommendation objects
  → AI presents as interactive product cards (generative UI)
```

**Industry filter strategy**: The system first tries an exact-match metadata filter (`industry: { $eq: "Cosmetic & Skincare" }`). If zero results come back, it automatically falls back to unfiltered semantic search. This balances relevance with recall.

**Output per product**:
```typescript
{
  productId: string
  productName: string
  handle: string        // URL slug
  category: string
  description: string
  imageUrl?: string
  score: number         // Pinecone similarity score
}
```

**Debug endpoint**: `GET /api/project-brief/debug` exposes the last retrieval query, industry filter flag, and matched products (development only).

**Graceful degradation**: Returns an empty array on error or missing config. The recommend step shows a "no products found" message and the user can skip to the next step.

---

## AI Tools

Each tool lives in a single file under `src/lib/tools/` containing: a Zod input schema, the tool definition, and optional system prompt guidance. Tools return a `StepToolOutput` object containing `BriefEvent[]` that the Zustand store applies.

### Brief Builder Tools

| Tool | Step | Input | Output / Events |
|------|------|-------|-----------------|
| `capture_profile` | profile | firstName, lastName, email, phone?, company? | `brief.identity.confirmed` |
| `capture_project_details` | project-details | industry (17-value enum), productItem, deliveryCountry, budget?, notes?, projectSummary? | `brief.project.context_confirmed` |
| `product_recommendations` | recommend | products[] (1–6, from RAG), summary, ragDebug? | Renders product cards; no events until user confirms |
| `capture_product_selection` | product-select | products[] (1–3) with quantities[], dimensions?, customizations? | `brief.product.added` per product |
| `capture_billing` | billing | street, city, stateProvince?, postalCode, country, phone | `brief.billing.confirmed` + `brief.identity.confirmed` (phone); forces `nextStep: 'submit'` |

### Help Center Tools

| Tool | Input | Output |
|------|-------|--------|
| `start_project_inquiry` | reason | Renders a handoff card with "Start Project Brief" button → `/project-brief?from=help-center` |
| `show_pricing_calculator` | productIdOrName | Renders interactive pricing UI: quantity slider, MOQ, shipping options (NA/EU/APAC/Other with multipliers), estimated delivery windows |

### Tool Output Schema

All brief builder tools return `StepToolOutput` which extends:

```typescript
{
  title: string              // Brief card title
  summary: string            // What was captured
  changedFields: string[]    // Modified field paths
  appliedUpdates: string[]   // Human-readable descriptions
  events: BriefEvent[]       // State mutations
  nextStep?: string          // Override next step
  recommendations?: Product[] // Product cards (recommend step only)
}
```

---

<!-- AUTO:STRUCTURE:START -->
## Project Structure

```
src/
├── app/                    # Routing and pages
│   ├── api/                # API route handlers
│   │   ├── briefs/         # CRUD brief endpoints (Supabase stubs)
│   │   ├── chat/           # Help Center Q&A endpoint
│   │   └── project-brief/  # Brief builder chat, submit, debug
│   ├── help-center/        # Help Center page
│   └── project-brief/      # Project Brief Builder page
├── components/             # UI components
│   ├── ui/                 # shadcn primitives
│   ├── chat/               # Shared chat components (bubbles, typing, input)
│   ├── help/               # Help Center components (conversation, search, pricing)
│   ├── project/            # Brief builder components (panel, cards, recommendations)
│   ├── agent/              # AI disclaimers
│   ├── common/             # Shared UI effects (animations)
│   └── layout/             # Header, dual-panel layout
├── lib/                    # Core business logic
│   ├── agents/             # Model factory + per-agent config
│   ├── prompts/            # System prompts per agent
│   ├── steps/              # Step configs, flow configs, types
│   ├── tools/              # One file per AI tool (Zod schema + definition)
│   ├── rag/                # Pinecone retrieval: knowledge + product catalog + cache
│   ├── moderation/         # Preflight content moderation
│   ├── services/           # External integrations (n8n webhook)
│   ├── project-doc/        # PDF/DOCX extraction
│   ├── supabase/           # Client + server Supabase clients
│   ├── env/                # Server env validation (Zod)
│   └── utils/              # cn, helpers
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand state stores
├── providers/              # React context providers
└── types/                  # TypeScript types and Zod schemas
```
<!-- AUTO:STRUCTURE:END -->

---

<!-- AUTO:ENV_VARS:START -->
## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Public application URL |
| `AI_PROVIDER` | AI provider selection (`openai`, `anthropic`, `google`) |
| `AI_MODEL` | AI model identifier override |
| `AI_EMBEDDING_PROVIDER` | Embedding provider for retrieval (`openai`, `google`) |
| `AI_EMBEDDING_MODEL` | Embedding model used for Pinecone query vectors |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Generative AI API key |
| `PINECONE_API_KEY` | Pinecone API key (server-only) |
| `PINECONE_HOST` | Pinecone index host URL |
| `PINECONE_NAMESPACE` | Optional Pinecone namespace for knowledge retrieval |
| `PINECONE_NAMESPACES` | Optional legacy namespace list (first value used) |
| `PINECONE_TOP_K` | Optional retrieval hit count (default: 5) |
| `PINECONE_INDEX_NAME` | Optional index name for ops/docs (queries use `PINECONE_HOST`) |
| `N8N_LEAD_WEBHOOK_URL` | n8n webhook URL for lead submission on brief completion |
| `PROJECT_DOC_UPLOAD_BUCKET` | Supabase storage bucket for project documents |

> Use `.env.local.example` as a template for local setup.
<!-- AUTO:ENV_VARS:END -->

---

<!-- AUTO:ROUTES:START -->
## Routes

### Pages

| Path | Source | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` | Redirects to `/project-brief` |
| `/help-center` | `src/app/help-center/page.tsx` | Help Center Q&A |
| `/project-brief` | `src/app/project-brief/page.tsx` | Project Brief Builder |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` `POST` | `/api/briefs` | List and create briefs |
| `GET` `PATCH` | `/api/briefs/:id` | Get and update a brief |
| `POST` | `/api/briefs/:id/submit` | Submit a brief |
| `POST` | `/api/chat` | Help Center Q&A — `generateText`, one question to one answer |
| `POST` | `/api/project-brief` | Brief builder chat — `streamText`, multi-turn streaming |
| `POST` | `/api/project-brief/submit` | Submit completed brief to n8n webhook |
| `GET` | `/api/project-brief/debug` | RAG debug data (development only) |
<!-- AUTO:ROUTES:END -->

---

## Key Files Reference

| File | What It Does |
|------|--------------|
| `src/app/api/chat/route.ts` | Help Center endpoint: rate limit, RAG, cache, tool forcing |
| `src/app/api/project-brief/route.ts` | Brief Builder endpoint: moderation, step tools, RAG for recommendations |
| `src/hooks/use-brief-chat.ts` | Orchestration hook: useChat, tool output parsing, recovery, step advancement |
| `src/stores/brief-store.ts` | Zustand store: TechnicalBrief state, event dispatcher, localStorage persistence |
| `src/lib/steps/step-configs.ts` | Step definitions: tool binding, system prompt builders, opening messages |
| `src/lib/steps/flow-configs.ts` | Flow definitions: step sequences, onComplete actions |
| `src/lib/rag/pinecone-retrieval.ts` | Knowledge retrieval: embed, query Pinecone, map metadata |
| `src/lib/rag/product-retrieval.ts` | Product retrieval: semantic + industry filter, score threshold |
| `src/lib/rag/help-cache.ts` | Response cache: SHA-256 fingerprinting, 1-min TTL |
| `src/lib/tools/sync-project-brief.ts` | Base tool output schema and event builder |
| `src/lib/moderation/preflight-check.ts` | Content classification: 5 categories, fail-open |
| `src/types/brief.ts` | TechnicalBrief Zod schema and TypeScript types |
| `src/types/brief-events.ts` | BriefEvent discriminated union |

---

<!-- AUTO:DEPLOYMENT:START -->
## Deployment

> No deployment configuration detected. The project uses Next.js — see the [Vercel deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for setup.
<!-- AUTO:DEPLOYMENT:END -->

---

## Remaining Work

### Immediate

| Task | Why |
|------|-----|
| Supabase schema + migrations | No persistence layer — all `/api/briefs` endpoints are stubs |
| Wire `/api/briefs` CRUD | `useAutoSave` calls PATCH but it's a no-op |
| Auth flow (login/signup UI, protected routes) | AuthProvider and store exist but nothing triggers auth |

### Short-Term

| Task | Why |
|------|-----|
| Re-enable BriefPanel sections | LineItemList, IntentCard, TimelineCard, SubmitButton are commented out |
| Re-enable file upload in ChatInputBar | Backend extraction exists, UI button is commented out |
| Re-enable voice input | useSpeechRecognition hook works, mic button commented out |
| Tests for new flows | Old tests deleted; need coverage for project-brief route, step-configs, moderation, product retrieval |

### Production Readiness

| Task | Why |
|------|-----|
| Move rate limiting to Redis/Upstash | In-memory Map resets on cold start |
| Move response cache to Redis | Same issue as rate limiting |
| Error monitoring (Sentry) | Only `console.error` currently |
| CI/CD pipeline (GitHub Actions) | No automated testing or deployment |

---

## Suggested New Flows

| Flow | Steps | Use Case |
|------|-------|----------|
| `reorder` | profile → product-select → billing | Returning customer reorders — pre-populate from previous brief |
| `sample-request` | profile → project-details → recommend → product-select | Request physical samples — no billing, lower quantities |
| `consultation` | profile → project-details → *schedule-call* | Customer wants to talk to a human — new step collects preferred time |
| `bulk-rfq` | profile → *upload-spec* → recommend → product-select → billing | Upload a spec doc (PDF/DOCX) — AI extracts project details automatically |

*Italic steps* are new and need to be built.

---

## Suggested Generative UI Tools

Tools the AI can call that render interactive UI components in the chat:

| Tool | Purpose | UI | Events |
|------|---------|-----|--------|
| `show_order_summary` | Review before submission | Card with all brief sections, edit buttons per section, submit button | `brief.submitted` |
| `show_material_comparison` | Compare packaging materials | Side-by-side cards: durability, eco-rating, cost, printability. Select button. | Updates `customizations.material` |
| `show_dimension_calculator` | Calculate box dimensions from product size | L x W x H inputs + padding, 3D preview, size presets | Updates `dimensions` |
| `show_quantity_tier_pricing` | Show price breaks across quantities | Bar chart / table: tier → unit price → total. MOQ highlighted. | Updates `quantities[]` |
| `show_finish_preview` | Preview finish options | Image grid: matte, gloss, soft-touch, spot UV, foil. Cost impact. | Updates `customizations.finish` |
| `show_timeline_estimator` | Estimate production + shipping timeline | Gantt bar: design → production → QA → shipping. Urgency slider. | `brief.timeline.confirmed` |
| `show_upload_prompt` | Upload design file or spec sheet | Drag-and-drop zone, progress bar, preview thumbnail | `brief.project.context_confirmed` |
| `show_packaging_style_picker` | Browse packaging styles visually | Image grid: mailer box, rigid box, folding carton, sleeve, pouch. Filter by industry. | Updates `project.packagingStyle` |

---

## License

<!-- TODO: Add license information -->
