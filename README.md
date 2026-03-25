# PakSpecialist

Packaging RFQ platform with dual AI chat: help desk and brief builder.

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
| Chat | Botpress WebChat | 4.4.7 |
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

<!-- AUTO:ENV_VARS:START -->
## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Public application URL |
| `NEXT_PUBLIC_BOTPRESS_BOT_ID` | Botpress bot identifier |
| `NEXT_PUBLIC_BOTPRESS_CLIENT_ID` | Botpress client identifier |
| `AI_PROVIDER` | AI provider selection (`openai`, `anthropic`, `google`) |
| `AI_MODEL` | AI model identifier override |
| `AI_EMBEDDING_PROVIDER` | Embedding provider for retrieval (`openai`, `google`) |
| `AI_EMBEDDING_MODEL` | Embedding model used for Pinecone query vectors |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Generative AI API key |
| `PINECONE_API_KEY` | Pinecone API key (server-only) |
| `PINECONE_HOST` | Pinecone index host URL |
| `PINECONE_NAMESPACE` | Optional Pinecone namespace for retrieval |
| `PINECONE_NAMESPACES` | Optional legacy namespace list (first value used) |
| `PINECONE_TOP_K` | Optional retrieval hit count (default: 5) |
| `PINECONE_INDEX_NAME` | Optional index name for ops/docs (queries use `PINECONE_HOST`) |

> Use `.env.local.example` as a template for local setup.
<!-- AUTO:ENV_VARS:END -->

---

<!-- AUTO:STRUCTURE:START -->
## Project Structure

```
src/
├── app/                # Routing and pages
│   ├── api/            # API route handlers
│   ├── help/           # Help desk page
│   ├── project/        # Project builder page
│   └── project-ai/     # Specialist (brief builder) chat page
├── components/         # UI components
│   ├── ui/             # shadcn primitives
│   ├── chat/           # Shared chat components
│   ├── help/           # Help desk components
│   ├── project/        # Project builder components
│   └── layout/         # Header, panel layouts
├── lib/                # Utilities and clients
│   ├── agents/         # Agent config and model factory
│   ├── engines/        # ConversationEngine abstraction
│   ├── prompts/        # System prompts per agent
│   ├── supabase/       # Client + server Supabase clients
│   ├── rag/            # Help chat Pinecone retrieval + cache helpers
│   ├── env/            # Server env validation (Zod)
│   ├── tools/          # One file per AI tool
│   └── utils/          # cn, helpers
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── providers/          # React context providers
└── types/              # TypeScript types and Zod schemas
```
<!-- AUTO:STRUCTURE:END -->

---

<!-- AUTO:ROUTES:START -->
## Routes

### Pages

| Path | Source |
|---|---|
| `/` | `src/app/page.tsx` |
| `/help` | `src/app/help/page.tsx` |
| `/project` | `src/app/project/page.tsx` |
| `/project/:id` | `src/app/project/[id]/page.tsx` |
| `/project-ai` | `src/app/project-ai/page.tsx` |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` `POST` | `/api/briefs` | List and create briefs |
| `GET` `PATCH` | `/api/briefs/:id` | Get and update a brief |
| `POST` | `/api/briefs/:id/submit` | Submit a brief |
| `POST` | `/api/chat` | Help (CS) Q&A — generateText, one question → one answer |
| `POST` | `/api/project-ai/chat` | Specialist (brief builder) chat streaming |
<!-- AUTO:ROUTES:END -->

---

## Architecture

The app uses two AI agents with a clear separation of concerns: system prompts in `lib/prompts/`, tools in `lib/tools/` (one file per tool), and agent config in `lib/agents/`. API routes stay thin and spread config from these modules.

### Overview

- **CS Agent (Customer Service)** — General packaging helper at `/help`; uses `generateText` (one question to one answer) via `POST /api/chat`. Tool: `start_project_inquiry` (handoff to Project AI). Pinecone RAG injects knowledge snippets when configured. Response cache keys include question + retrieval fingerprint (Pinecone chunk ids) so cache stays consistent with index updates; rate limit (30 req/min per client).
- **Specialist Agent** — Brief builder at `/project-ai`; uses `useChat` + `streamText` via `POST /api/project-ai/chat`. Tool: `sync_project_brief`. History trimmed to last 6 messages; rate limit and optional short-TTL stream cache. Handoff from help (“Try Project AI”) navigates to `/project-ai`.

### Folder structure

| Location | Purpose |
|----------|---------|
| `src/lib/agents/` | Model factory (`model.ts`) and per-agent config (tools + `streamText` options) |
| `src/lib/prompts/` | System prompt per agent |
| `src/lib/tools/` | One file per tool: Zod schemas, tool definition, optional guidance |
| `src/lib/engines/` | Conversation engine abstraction (Vercel AI, Botpress) |

### Token and cost

- **Help** — Single Q&A: `generateText` with validated question, `maxTokens: 300`, response cache (question + retrieval fingerprint, 1 min TTL), rate limit (30 req/min per client). Client sends one question and shows full response (no streaming).
- **Brief Builder** — Conversational: `useChat` + `streamText`, last 6 messages only, `maxTokens: 300`, rate limit, optional short-TTL stream cache keyed by last user message + missingFields.
- System prompts are kept lean; default model is gpt-4o-mini.

For detailed design, token guidelines, and verification, see [docs/ai-agents.md](docs/ai-agents.md).

### Pinecone knowledge (Help chat)

Help chat (`POST /api/chat`) queries Pinecone with an embedding of the user question. **Server-only**: never expose `PINECONE_API_KEY` to the client.

**Metadata contract for chunks** (any one text field is used for grounding; URL/title drive citations):

| Field | Purpose |
|-------|---------|
| `chunk_text`, `text`, `content`, or `body` | Passage text injected into the model as “Knowledge snippets” |
| `url`, `source_url`, `sourceUrl`, or `link` | Shown as a “Sources” link in the UI |
| `title`, `source_title`, `sourceTitle`, or `name` | Optional label for the source link |

Use **`AI_EMBEDDING_PROVIDER` + `AI_EMBEDDING_MODEL`** that matches the vectors stored in the index. Tune **`PINECONE_TOP_K`** for latency vs. coverage (default 5).

---

<!-- AUTO:DEPLOYMENT:START -->
## Deployment

> No deployment configuration detected. The project uses Next.js — see the [Vercel deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for setup.
<!-- AUTO:DEPLOYMENT:END -->

---

## License

<!-- TODO: Add license information -->
