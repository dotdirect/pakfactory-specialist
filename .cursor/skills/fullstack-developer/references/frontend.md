# Frontend Reference

## Component Library: shadcn/ui

All UI primitives come from [shadcn/ui](https://ui.shadcn.com/). Always add
components via `npx shadcn@latest add <component>`. Never pull directly from
Radix UI or Base UI — shadcn wraps them for you. Components live in
`src/components/ui/` and you own the source code.

```bash
npx shadcn@latest init        # first-time setup
npx shadcn@latest add button  # add individual components
```

- Style: `new-york` (configured in `components.json`)
- Variants use `cva` (class-variance-authority)
- Uses `cn()` utility from `@/lib/utils/cn` for conditional classNames
- Icon library: Lucide React
- Docs: `use context7 → resolve-library-id: shadcn-ui`

---

## File Structure

```
public/
└── assets/                    # Static assets (images, etc.) — reference as /assets/…
src/
├── app/                       # Routing only — no logic
│   └── api/                   # API route handlers
├── components/
│   ├── ui/                    # shadcn primitives (auto-generated)
│   ├── layout/                # Header, panel layouts
│   └── [feature]/             # Feature-specific components
├── lib/
│   ├── supabase/              # Client + server Supabase clients
│   └── utils/                 # cn, helpers
├── stores/                    # Zustand stores
├── providers/                 # React context providers
├── hooks/                     # Custom React hooks
└── types/                     # Shared TypeScript + Zod schemas
```

**Static assets:** Images and other static files live under `public/assets/`. Reference them from the root (e.g. `src="/assets/pakfactory-logo.png"`). Prefer the Next.js `<Image>` component for images.

---

## Server vs Client Components

Default: **Server Component**. Add `"use client"` only when the component needs:

- `useState` / `useEffect` / other hooks
- Browser APIs (window, localStorage)
- Event listeners
- Third-party client-only SDKs

---

## Component Conventions

```tsx
import {cn} from '@/lib/utils/cn';

interface MyComponentProps {
    // explicit typed props — never `any`
}

export function MyComponent({...props}: MyComponentProps) {
    // ...
}
```

---

## Tailwind CSS (v4)

Configuration lives in `globals.css` via `@theme inline` — there is no
`tailwind.config.js`.

- Colors use **oklch** color space as CSS variables — defined in `globals.css`
- No raw hex/hsl values in classNames
- No arbitrary values like `p-[14px]` — use the token scale
- Component variants via `cva` (class-variance-authority)
- Dark mode via `@custom-variant dark (.dark)`
- Imports: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`

---

## State Management

| State type         | Solution                                              |
| ------------------ | ----------------------------------------------------- |
| Local UI state     | `useState`                                            |
| Shared app state   | Zustand store in `src/stores/` (with immer, devtools) |
| Server/async state | Server Components + `revalidatePath`                  |
| Forms              | React Hook Form + Zod                                 |

---

## MCP Before Coding

```
use context7 → resolve-library-id: next       # App Router patterns
use context7 → resolve-library-id: react      # Hooks API
use context7 → resolve-library-id: tailwindcss # Utility classes
use context7 → resolve-library-id: shadcn-ui  # Component library
use context7 → resolve-library-id: zustand    # State management
use context7 → resolve-library-id: ai-sdk     # Vercel AI SDK
```
