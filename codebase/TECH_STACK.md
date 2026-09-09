# Technology Stack

**Architecture:** Modular monolith · **Database:** MongoDB only (no Redis)  
**Updated:** 2026-09-09

## Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 · React 19 · shadcn/ui (Radix) · Tailwind CSS 4 |
| **State / data fetching** | TanStack Query · lucide-react icons |
| **Backend** | Express 4 · TypeScript · Zod validation |
| **Database** | MongoDB Atlas / local Mongo 7 · Mongoose 8 (`@ai-crm/db`) |
| **Background jobs** | MongoDB `background_jobs` collection (in-process or optional worker) |
| **Events** | `@ai-crm/events` in-process pub/sub |
| **AI** | Google Gemini (`@google/generative-ai`) |
| **Charts** | Recharts (via shadcn chart primitives) |
| **Monorepo** | pnpm workspaces · `apps/*` + `packages/*` |

## Repository structure

```
codebase/
├── apps/
│   ├── web/                    # Next.js 15 App Router (:3000)
│   │   ├── app/                # Routes: dashboard, marketing, auth
│   │   ├── components/ui/      # 43+ shadcn/ui primitives
│   │   └── components/         # Domain components
│   └── api/                    # Express modular monolith (:4000)
│       └── src/modules/        # auth, deals, agents, integrations, …
├── packages/
│   ├── db/                     # Mongoose models + connect
│   ├── shared/                 # Zod schemas, shared types
│   ├── events/                 # Domain event bus
│   └── integrations/crm/       # CRM connector interfaces
└── docs/                       # Product specs, WBS, API routes
```

## UI — shadcn/ui

Initialized with **radix-nova** style. Installed primitives include:

`button`, `card`, `badge`, `avatar`, `input`, `dialog`, `sheet`, `sidebar`, `table`, `tabs`, `dropdown-menu`, `command`, `sonner`, `chart`, `carousel`, `drawer`, `navigation-menu`, and 25+ more.

Migration plan: [docs/shadcn-ui-plan.md](./docs/shadcn-ui-plan.md)

## API modules

| Module | Responsibility |
|--------|----------------|
| `auth` | Google OAuth, JWT sessions |
| `deals` | CRUD, kanban, 12 detail tabs |
| `companies` | Accounts |
| `agents` | Agent platform + runs |
| `approvals` | Human-in-the-loop write-back |
| `meddpicc` / `ai` | MEDDPICC scoring, SSE streaming |
| `integrations-*` | HubSpot, Slack, Gong OAuth & webhooks |
| `insights` | Funnel, loss, user analytics |
| `home` | Dashboard BFF |
| `marketing` | Lead capture |

## Data & async

- **Single database:** MongoDB for all persistence and job queues
- **No Redis** — removed; `background_jobs` collection handles async work
- **Workers:** Start with API (`server.ts`) or `pnpm --filter @ai-crm/api dev:worker`

## Auth

- Google OAuth for sign-in
- JWT access tokens + encrypted OAuth tokens (`TOKEN_ENCRYPTION_KEY`)
- Workspace-scoped tenancy on every query

## Integrations (optional)

| Provider | Env vars | Purpose |
|----------|----------|---------|
| Google | `GOOGLE_CLIENT_*` | Sign-in |
| HubSpot | `HUBSPOT_*` | CRM sync |
| Gong | `GONG_*` | Call transcripts |
| Slack | `SLACK_*` | Notifications |
| Gemini | `GEMINI_API_KEY` | AI summaries & agents |

Demo mode works without integration keys.

## Dev commands

```bash
pnpm dev              # API + web
pnpm typecheck        # All packages
pnpm build            # Production build
pnpm docker:up        # Local MongoDB
pnpm populate-demo      # Seed data
```

## Deployment targets

| Component | Suggested platform |
|-----------|-------------------|
| `apps/web` | Vercel |
| `apps/api` | Railway, Render, Fly.io, AWS |
| MongoDB | MongoDB Atlas (M10+ for vector search) |

See [docs/architecture.md](./docs/architecture.md) and [docs/system-design.md](./docs/system-design.md) for full design.
