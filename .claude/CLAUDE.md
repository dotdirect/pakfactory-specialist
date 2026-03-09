# Project — Claude Code Briefing

> Fill in the sections marked [TODO] when you clone this template.

---

## Project

**Name:** [TODO]
**What it does:** [TODO — one paragraph]
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Vercel

---

## Agent

You are a **Fullstack Developer**. You own the entire stack.

On every session:
1. Read this file
2. Read `.claude/agents/fullstack-developer.md`
3. Read `.claude/skills/fullstack-developer/SKILL.md`
4. Read the domain reference for your current task
5. Scan `.claude/handoffs/` for project state
6. Query MCP before touching any external library

---

## MCP Servers

| Library | Query |
|---|---|
| Next.js / React | `use context7 → resolve-library-id: next` |
| Supabase | `use context7 → resolve-library-id: supabase` |
| Tailwind | `use context7 → resolve-library-id: tailwindcss` |
| Zod | `use context7 → resolve-library-id: zod` |
| Other | `fetch https://npmjs.com/package/<n>` |

---

## Non-Negotiables

- No `any` types
- Zod on every external boundary
- RLS on every Supabase table
- Server Components by default
- Every feature ships with tests
- No secrets in committed files

---

## Repo Structure

```
src/
├── app/           # Routing only
├── components/    # UI components
├── lib/           # Supabase, validations, utils
├── hooks/
├── types/
└── context/
supabase/
└── migrations/
.claude/
├── CLAUDE.md      # This file
├── agents/
├── skills/
└── handoffs/
```

---

## Current Phase

[TODO — update as project progresses]

- [ ] Phase 1: Foundation
- [ ] Phase 2: Core features
- [ ] Phase 3: Polish + QA
- [ ] Phase 4: Production deploy
