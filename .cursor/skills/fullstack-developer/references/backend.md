# Backend Reference

## File Structure

```
src/
├── app/
│   └── api/               # Route handlers — thin, delegate to lib/
├── lib/
│   ├── supabase/
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client (SSR, Route Handlers)
│   │   └── admin.ts       # Service role — server only, never client-facing
│   ├── validations/       # Zod schemas — single source of truth
│   └── utils/             # Pure helper functions
supabase/
└── migrations/            # SQL migrations — one file per change
```

## Route Handler Pattern

Every route handler must:
- Parse + validate with Zod → return 422 on failure
- Check auth if required → return 401
- Return specific error codes — never catch-all 500 everything

```ts
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { createClient } from "@/lib/supabase/server"

const BodySchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = BodySchema.parse(body)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase.from("items").insert({ ...data, user_id: user.id })
    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 422 })
    }
    console.error("[api/example]", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

## Server Actions vs Route Handlers

| Use Server Action | Use Route Handler |
|---|---|
| Mutation from a form or button | External system calls your endpoint |
| Always the logged-in user | Webhooks (Stripe, Botpress, etc.) |
| Want `revalidatePath` after mutation | Need custom HTTP status codes |

## Supabase Client Rules

```ts
// Browser (Client Components only)
import { createBrowserClient } from "@supabase/ssr"

// Server (Server Components, Route Handlers, Server Actions)
import { createServerClient } from "@supabase/ssr"

// Admin — service role, NEVER import in client-facing files
import { createClient } from "@supabase/supabase-js"
// with SUPABASE_SERVICE_ROLE_KEY
```

## RLS — Required on Every Table

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON your_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON your_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON your_table
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete_own" ON your_table
  FOR DELETE USING (auth.uid() = user_id);
```

## Migration Conventions

```
supabase/migrations/
  YYYYMMDDHHMMSS_description.sql
```

- One logical change per file
- Always include a rollback comment at the top
- After any migration: run `supabase gen types typescript --project-id $ID > src/types/database.types.ts`

## Environment Variables

```ts
// lib/env.ts — validate at startup, fail loud
import { z } from "zod"
const env = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
}).parse(process.env)
export { env }
```

## MCP Before Coding

```
use context7 → resolve-library-id: supabase   # Auth, RLS, client API
use context7 → resolve-library-id: next        # Route handlers, middleware
use context7 → resolve-library-id: zod         # Schema patterns
```
