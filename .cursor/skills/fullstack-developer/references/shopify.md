# Shopify Reference

## MCP Workflow — Required

The `shopify-dev-mcp` server is your primary documentation source. Never rely on
training data for Shopify APIs — always query live docs.

### Session Startup

Every Shopify task **must** begin with `learn_shopify_api`:

```
learn_shopify_api(api: "<api-name>")
→ returns conversationId (required for ALL subsequent calls)
```

Pass the same `conversationId` to every tool call in the session. If you need a
different API mid-session, call `learn_shopify_api` again with the existing
`conversationId`.

### Available APIs

| API key | Use when |
|---|---|
| `admin` | Admin GraphQL API — apps, integrations, extending admin |
| `storefront-graphql` | Custom storefronts, cart, direct GraphQL |
| `liquid` | Theme development, Liquid templates, sections, snippets |
| `hydrogen` | Hydrogen storefront framework |
| `polaris-app-home` | App home UI in Shopify admin |
| `polaris-admin-extensions` | Admin UI extensions |
| `polaris-checkout-extensions` | Checkout UI extensions |
| `polaris-customer-account-extensions` | Customer account extensions |
| `pos-ui` | Point-of-sale UI extensions |
| `functions` | Shopify Functions (discounts, validation, delivery, etc.) |
| `custom-data` | Metafields and Metaobjects |
| `partner` | Partner API |
| `customer` | Customer Account API |
| `payments-apps` | Payments Apps API |

### Tool Chain

1. `learn_shopify_api` — always first
2. `search_docs_chunks` — find relevant doc sections
3. `fetch_full_docs` — read full pages from results
4. `introspect_graphql_schema` — explore GraphQL types, queries, mutations
5. `validate_graphql_codeblocks` — validate any generated GraphQL
6. `validate_component_codeblocks` — validate Polaris/extension JSX/TSX
7. `validate_theme` — validate Liquid and theme files
8. `learn_extension_target_types` — get type declarations for extension targets

### Validation Rules

- Always validate GraphQL code blocks after generating them.
- Always validate Polaris component code after generating it.
- Always validate Liquid/theme files after creating or editing them.
- If validation fails, fix and re-validate before moving on.

---

## App Development

### Scaffold

Use Shopify CLI to scaffold new apps:

```bash
shopify app init
```

Standard Remix-based app structure:

```
app/
├── routes/           # Remix routes
├── shopify.server.ts # Shopify API client setup
└── root.tsx
extensions/           # App extensions (checkout, admin, etc.)
shopify.app.toml      # App configuration
```

### Admin API Patterns

- Use the Admin GraphQL API via authenticated `admin` client.
- Always introspect the schema before writing queries — field names change.
- Validate all GraphQL with `validate_graphql_codeblocks` before shipping.

### Polaris UI

- Use Polaris components for all admin-embedded app UI.
- Validate component code with `validate_component_codeblocks`.
- For extension surfaces, call `learn_extension_target_types` to get available
  components and APIs for each target.

---

## Theme Development

### Structure

```
theme/
├── assets/
├── config/
├── layout/
│   └── theme.liquid
├── locales/
├── sections/
├── snippets/
└── templates/
    ├── index.json
    └── ...
```

### Liquid Conventions

- Query MCP with `api: "liquid"` before writing any Liquid code.
- Use `validate_theme` after every file change.
- Section schemas define settings — always validate JSON schema structure.
- Use snippets for reusable partials.

### Theme App Extensions

For apps that inject UI into merchant themes:

- Use theme app extension blocks (not ScriptTags).
- Define blocks in `extensions/<name>/blocks/`.
- Validate with `validate_theme`.

---

## Key Rules

- Never web-search for Shopify docs — use MCP tools exclusively.
- Always call `learn_shopify_api` before any other Shopify tool.
- Always validate generated code (GraphQL, components, Liquid).
- Pass the same `conversationId` across all tool calls in a session.
