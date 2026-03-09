---
name: Frontend Component Breakdown
overview: Break down the PakSpecialist design into reusable components, feature components, and route structure based on the dual-panel chat + brief layout.
todos:
    - id: choose-component-lib
      content: Decide on component library (shadcn/ui or HeroUI) before building any components.
      status: pending
    - id: scaffold-routes
      content: 'Create route structure: `(auth)/login`, `(auth)/register`, `(dashboard)/session/[sessionId]`.'
      status: pending
    - id: build-ui-primitives
      content: 'Build reusable UI components: Button, Badge, Avatar, Card, Input, ImageThumbnail, DataRow, DataTable, SectionHeader.'
      status: pending
    - id: build-chat-features
      content: 'Build chat feature components: ChatPanel, ChatMessage, ProductCard, ProductCardList, ChatActionBar, ChatInput, MessageReactions.'
      status: pending
    - id: build-brief-features
      content: 'Build brief feature components: BriefPanel, BriefHeader, ProjectDetailSection, PackagingSolutionSection, CustomizationTable, ProductImageGallery, CompletionProgress.'
      status: pending
    - id: wire-context-hooks
      content: Create BriefContext, SessionContext, and hooks (useBrief, useChatMessages, useWebChatListener).
      status: pending
isProject: false
---

# Frontend Component and Route Breakdown

## Design Analysis

The design shows a **dual-panel layout**:

- **Left panel**: Conversational chat interface (bot "Anthony") with product recommendation cards, action buttons, and a message input
- **Right panel**: Live technical brief / packaging solution document that updates as the conversation progresses

Additionally there is a **top navigation bar** with branding, login, and create account.

---

## Routes and Pages

```
src/app/
├── layout.tsx                    # Root layout (fonts, providers, metadata)
├── page.tsx                      # Landing / marketing page (not shown in design)
├── (auth)/
│   ├── login/page.tsx            # Login page
│   └── register/page.tsx         # Create Account page
└── (dashboard)/
    └── session/
        └── [sessionId]/
            └── page.tsx          # Main dual-panel page (the design)
```

- `/session/[sessionId]` is the core experience -- the dual-panel chat + brief view
- Auth routes for Login and Create Account (visible in the nav bar)
- Root `/` likely a landing page or redirects to a new session

---

## Layout Components

| Component         | Location                              | Type   | Purpose                                                   |
| ----------------- | ------------------------------------- | ------ | --------------------------------------------------------- |
| `Navbar`          | `components/features/Navbar`          | Server | Top bar: logo, Login link, Create Account button          |
| `DualPanelLayout` | `components/features/DualPanelLayout` | Client | Side-by-side responsive container for chat + brief panels |

---

## Reusable UI Components (`components/ui/`)

These are **primitive, stateless** building blocks reused across the app:

| Component        | What it wraps                                                | Reuse                                           |
| ---------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `Button`         | Primary (green filled), secondary (outlined), ghost variants | Everywhere                                      |
| `Badge`          | "Selected" / status indicator pills                          | Product cards, brief                            |
| `Avatar`         | Bot avatar with icon/image                                   | Chat messages                                   |
| `Card`           | Bordered container with optional thumbnail                   | Product cards, brief sections                   |
| `Input`          | Text input with icon slot (send button)                      | Chat input, forms                               |
| `ImageThumbnail` | Consistent image container with aspect ratio                 | Product cards, brief images                     |
| `DataRow`        | Label-value pair display                                     | Brief detail fields (SKU, Quantity, Dimensions) |
| `DataTable`      | Simple key-value grid/table                                  | Customization section in brief                  |
| `SectionHeader`  | Title bar for content sections                               | "Project Detail", "Packaging Solution", etc.    |

---

## Feature Components (`components/features/`)

These are **domain-specific composites** that combine UI primitives:

### Chat Panel

| Component          | Type   | Description                                                                     |
| ------------------ | ------ | ------------------------------------------------------------------------------- |
| `ChatPanel`        | Client | Full left-panel container: message list + input                                 |
| `ChatMessage`      | Client | Single message bubble with avatar, text, optional children (cards, actions)     |
| `ProductCard`      | Client | Thumbnail + name + description + Select/Selected button + Learn More link       |
| `ProductCardList`  | Client | Scrollable list of `ProductCard` items with multi-select                        |
| `ChatActionBar`    | Client | Row of contextual action buttons ("Skip Selection", "Need more recommendation") |
| `ChatInput`        | Client | Message input bar with send button, reaction icons                              |
| `MessageReactions` | Client | Audio/copy/thumbs up/thumbs down icon row below messages                        |

### Brief Panel

| Component                  | Type   | Description                                                        |
| -------------------------- | ------ | ------------------------------------------------------------------ |
| `BriefPanel`               | Client | Full right-panel container, reads from BriefContext                |
| `BriefHeader`              | Server | PakFactory logo + prepared for / email / date header               |
| `ProjectDetailSection`     | Server | "Project Detail" heading + product info + images + remarks         |
| `ProductInfoRow`           | Server | Product type, industry, and remark text                            |
| `PackagingSolutionSection` | Server | "Packaging Solution" heading + product table + customization table |
| `CustomizationTable`       | Server | Grid of customization fields (material, thickness, printed sides)  |
| `ProductImageGallery`      | Client | Image gallery for selected product / reference images              |
| `CompletionProgress`       | Client | "Almost there" progress indicator at top of brief                  |

---

## Shared Context (`context/`)

| Context          | Purpose                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `BriefContext`   | Shared state for the `TechnicalBrief` object -- written by chat events, read by brief panel |
| `SessionContext` | Current session ID, user info, connection state                                             |

---

## Hooks (`hooks/`)

| Hook                 | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `useBrief`           | Access BriefContext (brief data + completion score) |
| `useChatMessages`    | Manage chat message list, send/receive              |
| `useWebChatListener` | Listen for bot events via postMessage or SDK        |

---

## Component Hierarchy (main page)

```
SessionPage
├── Navbar
└── DualPanelLayout
    ├── ChatPanel
    │   ├── ChatMessage
    │   │   ├── Avatar
    │   │   ├── ProductCardList
    │   │   │   └── ProductCard (x N)
    │   │   │       ├── ImageThumbnail
    │   │   │       ├── Badge ("Selected")
    │   │   │       └── Button ("Select" / "Learn More")
    │   │   ├── ChatActionBar
    │   │   │   └── Button (x N)
    │   │   └── MessageReactions
    │   └── ChatInput
    │       └── Input
    └── BriefPanel
        ├── CompletionProgress
        ├── BriefHeader
        ├── ProjectDetailSection
        │   ├── ImageThumbnail (x N)
        │   ├── ProductInfoRow
        │   └── DataRow (remarks)
        └── PackagingSolutionSection
            ├── DataTable (product)
            ├── CustomizationTable
            ├── ProductImageGallery
            └── ImageThumbnail (reference)
```

---

## Notes

- **Component library choice**: Must be decided before implementation (shadcn/ui or HeroUI) per the frontend skill convention
- **All chat-side components are Client Components** (`"use client"`) because they manage state and events
- **Brief panel sub-components can start as Server Components** where they only render props, but `BriefPanel` itself is Client because it reads from `BriefContext`
- The current `src/` only has the default Next.js boilerplate -- everything above is net-new
