# DevOps Reference

## Stack

| Concern | Tool |
|---|---|
| Hosting | Vercel |
| Database | Supabase (managed Postgres) |
| CI/CD | GitHub Actions |
| Environment secrets | Vercel dashboard + GitHub Secrets |
| Branch strategy | `main` = production, `develop` = staging |

---

## Environment Strategy

```
main branch      → vercel (production)  → .env.production vars
develop branch   → vercel (preview)     → .env.staging vars
feature branches → vercel (preview URL) → .env.staging vars
```

**Never commit secrets.** All sensitive values live in:
- Vercel dashboard → Environment Variables
- GitHub repository → Settings → Secrets and variables

```bash
# .env.example — committed, no secrets
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BOTPRESS_TOKEN=
```

---

## GitHub Actions — CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run typecheck       # tsc --noEmit
      - run: npm run lint            # eslint
      - run: npm run test:run        # vitest

  e2e:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

---

## Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (first time)
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**`vercel.json` for Next.js (usually not needed — but if custom config required):**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs"
}
```

---

## Supabase Migrations in CI

```bash
# Apply migrations to staging DB
supabase db push --linked

# Apply to production
supabase db push --linked --project-ref $PROD_PROJECT_REF
```

Add to GitHub Actions after tests pass:
```yaml
- name: Apply DB migrations
  run: npx supabase db push --linked
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Pre-Deploy Checklist

- [ ] `npm run build` passes locally with zero errors
- [ ] All environment variables set in Vercel dashboard
- [ ] Database migrations applied to target environment
- [ ] Supabase types regenerated after any schema change
- [ ] E2E tests passing against staging URL before promoting to production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT in `NEXT_PUBLIC_*` variables

---

## Rollback Plan

**Vercel:** Instant rollback via dashboard → Deployments → Redeploy previous

**Database:** Always write reversible migrations:
```sql
-- Migration: add status column
ALTER TABLE briefs ADD COLUMN status TEXT DEFAULT 'draft';

-- Rollback:
-- ALTER TABLE briefs DROP COLUMN status;
```
