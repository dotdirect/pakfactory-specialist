# Frontend Reference

## Component Library: shadcn/ui

Copy-paste components built on Radix UI (or Base UI) + Tailwind CSS. You own the
source code — components live in `src/components/ui/`.

```bash
npx shadcn@latest init        # first-time setup
npx shadcn@latest add button  # add individual components
```

- Variants use `cva` (class-variance-authority).
- Uses `cn()` utility from `@/lib/utils/cn` for conditional classNames.
- Docs: `use context7 → resolve-library-id: shadcn-ui`

---

## File Structure

```
src/
├── app/                       # Routing only — no logic
│   ├── help/                  # Single-panel help desk (Vercel AI SDK)
│   ├── project/               # Dual-panel quote builder (Botpress)
│   └── api/
│       ├── chat/              # Vercel AI streaming endpoint
│       └── briefs/            # Brief CRUD endpoints
├── components/
│   ├── ui/                    # shadcn primitives (auto-generated)
│   ├── chat/                  # Shared chat components
│   ├── help/                  # Help desk specific
│   ├── project/               # Project/brief specific
│   └── layout/                # Header, panel layouts
├── lib/
│   ├── engines/               # ConversationEngine abstraction
│   ├── supabase/              # Client + server Supabase clients
│   └── utils/                 # cn, helpers
├── stores/                    # Zustand stores
├── providers/                 # React providers (Supabase, Brief)
├── hooks/                     # Custom React hooks
└── types/                     # Shared TypeScript + Zod schemas
```

## Server vs Client Components

Default: **Server Component**. Add `"use client"` only when the component needs:
- `useState` / `useEffect` / other hooks
- Browser APIs (window, localStorage)
- Event listeners
- Third-party client-only SDKs (Botpress WebChat, Vercel AI hooks)

## Component Conventions

```tsx
import type { ComponentProps } from "@/types"
import { cn } from "@/lib/utils/cn"

interface MyComponentProps {
  // explicit typed props — never `any`
}

export function MyComponent({ ...props }: MyComponentProps) {
  // ...
}
```

## Tailwind Rules

- CSS variables for all brand colors — defined in `globals.css`
- No raw hex values in classNames
- No arbitrary values like `p-[14px]` — use the token scale
- Component variants via `cva` (class-variance-authority)
- Dark mode via `.dark` class strategy

## State Management

| State type | Solution |
|---|---|
| Local UI state | `useState` |
| Brief / shared app state | Zustand store in `src/stores/` (with immer, devtools) |
| Server/async state | Server Components + `revalidatePath` |
| Forms | React Hook Form + Zod |

## MCP Before Coding

```
use context7 → resolve-library-id: next       # App Router patterns
use context7 → resolve-library-id: react      # Hooks API
use context7 → resolve-library-id: tailwindcss # Utility classes
use context7 → resolve-library-id: shadcn-ui  # Component library
use context7 → resolve-library-id: zustand    # State management
```
