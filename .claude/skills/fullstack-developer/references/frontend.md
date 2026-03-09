# Frontend Reference

## File Structure

```
src/
├── app/                   # Routing only — no logic
│   ├── (auth)/
│   ├── (dashboard)/
│   └── layout.tsx
├── components/
│   ├── ui/                # Primitive, stateless (Button, Input, Badge)
│   └── features/          # Domain-specific composites (BriefPanel, UserCard)
├── hooks/                 # Custom React hooks
└── context/               # React context providers
```

## Server vs Client Components

Default: **Server Component**. Add `"use client"` only when the component needs:
- `useState` / `useEffect` / other hooks
- Browser APIs (window, localStorage)
- Event listeners
- Third-party client-only SDKs

```tsx
// ✅ Server component — data fetched directly, no "use client"
export default async function ProductList() {
  const products = await getProducts()
  return <ul>{products.map(p => <ProductCard key={p.id} {...p} />)}</ul>
}

// ✅ Client component — justified because it uses state
"use client"
export function SearchInput() {
  const [query, setQuery] = useState("")
  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

## Component Conventions

```tsx
// Every component file follows this shape
import type { ComponentProps } from "@/types"
import { cn } from "@/lib/utils"

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

```css
/* globals.css */
:root {
  --color-primary: #0F172A;
  --color-accent: #6366F1;
  --color-surface: #F8FAFC;
  --color-border: #E2E8F0;
}
.dark {
  --color-primary: #F8FAFC;
  --color-surface: #0F172A;
  --color-border: #334155;
}
```

## State Management

| State type | Solution |
|---|---|
| Local UI state | `useState` |
| Shared UI state | React Context in `src/context/` |
| Server/async state | Server Components + `revalidatePath` |
| Forms | React Hook Form + Zod |

Never reach for external state libraries (Zustand, Redux) without a clear reason.

## MCP Before Coding

```
use context7 → resolve-library-id: next       # App Router patterns
use context7 → resolve-library-id: react      # Hooks API
use context7 → resolve-library-id: tailwindcss # Utility classes
```
