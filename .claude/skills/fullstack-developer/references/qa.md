# QA Reference

## Testing Stack

| Type | Tool | Location |
|---|---|---|
| Unit tests | Vitest | `src/**/*.test.ts` |
| Component tests | Vitest + Testing Library | `src/**/*.test.tsx` |
| E2E tests | Playwright | `e2e/**/*.spec.ts` |
| Type checking | TypeScript (`tsc --noEmit`) | CI only |

## The Rule

**Every feature ships with tests.** No exceptions. A feature is not done until:
- Unit tests cover the core logic
- At least one E2E test covers the happy path
- `tsc --noEmit` passes clean

---

## Unit Test Pattern (Vitest)

```ts
// src/lib/utils/calculateScore.test.ts
import { describe, it, expect } from "vitest"
import { calculateCompletionScore } from "./calculateScore"

describe("calculateCompletionScore", () => {
  it("returns 0 for empty brief", () => {
    expect(calculateCompletionScore({})).toBe(0)
  })

  it("returns 70 when all required fields filled", () => {
    expect(calculateCompletionScore({
      productLine: "Widget A",
      application: "Industrial",
      quantity: 500,
    })).toBe(70)
  })

  it("returns 100 when all fields filled", () => {
    // full brief object
    expect(calculateCompletionScore(fullBrief)).toBe(100)
  })
})
```

## Component Test Pattern (Testing Library)

```tsx
// src/components/ui/Button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { Button } from "./Button"

it("calls onClick when clicked", () => {
  const handler = vi.fn()
  render(<Button onClick={handler}>Submit</Button>)
  fireEvent.click(screen.getByText("Submit"))
  expect(handler).toHaveBeenCalledOnce()
})

it("is disabled when disabled prop passed", () => {
  render(<Button disabled>Submit</Button>)
  expect(screen.getByRole("button")).toBeDisabled()
})
```

## E2E Test Pattern (Playwright)

```ts
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test"

test("user can sign in and reach dashboard", async ({ page }) => {
  await page.goto("/login")
  await page.fill('[name="email"]', "test@example.com")
  await page.fill('[name="password"]', "password123")
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL("/dashboard")
  await expect(page.getByText("Welcome")).toBeVisible()
})
```

---

## Pre-Ship Checklist

Run this before marking any feature complete:

**Code quality**
- [ ] `tsc --noEmit` — zero type errors
- [ ] `eslint src/` — zero lint errors
- [ ] No `any` types introduced
- [ ] No `console.log` left in production code

**Tests**
- [ ] Unit tests written and passing for new logic
- [ ] Component tests for new UI components
- [ ] E2E test covers the user-facing happy path
- [ ] `npm test` passes clean

**Security**
- [ ] No secrets or API keys in source code
- [ ] RLS enabled on any new Supabase table
- [ ] All route handlers validate input with Zod
- [ ] Auth checked before any protected data access

**UI**
- [ ] Renders correctly on mobile (375px) and desktop (1280px)
- [ ] Loading state handled
- [ ] Empty state handled
- [ ] Error state handled
- [ ] Keyboard navigable (tab order correct)

---

## Running Tests

```bash
npm run test          # Vitest unit + component (watch mode)
npm run test:run      # Vitest single run (CI)
npm run test:e2e      # Playwright
npm run typecheck     # tsc --noEmit
```
