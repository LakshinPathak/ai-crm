# Technology Stack

**Version:** 6.0  
**Date:** 2026-09-09  
**Architecture:** **Modular monolith** — see [`architecture.md`](architecture.md)

---

## Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 · React 19 · `apps/web` |
| **Backend** | Express · `apps/api` · `:4000` |
| **Database** | MongoDB Atlas · Mongoose via `@ai-crm/db` |
| **Queue** | MongoDB `background_jobs` collection (agent runs, ingest) |
| **Events** | `@ai-crm/events` · in-process pub/sub |
| **Workspace** | pnpm monorepo · `apps/*` · `packages/*` |

---

## Repository layout

```
codebase/
├── apps/
│   ├── web/                 # Next.js frontend :3000
│   └── api/                 # Modular monolith :4000
│       └── src/modules/     # Domain modules (deals, agents, auth, …)
├── packages/
│   ├── db/                  # Mongoose models
│   ├── shared/              # Zod schemas
│   └── events/              # Domain events
└── docs/                    # All specs + reference-screenshots/
```

---

## Dev commands

| Command | What |
|---------|------|
| `pnpm dev` | API monolith + web (default) |
| `pnpm dev:api` | Express API `:4000` |
| `pnpm dev:web` | Next.js `:3000` |
| `pnpm docker:up` | MongoDB container |

**Required env:** `NEXT_PUBLIC_API_URL=http://localhost:4000`

---

## API modules (`apps/api/src/modules/`)

| Module | Routes | Responsibility |
|--------|--------|----------------|
| `auth` | `/api/v1/auth`, `/me` | Google OAuth, JWT, sessions |
| `onboarding` | `/onboarding` | Workspace setup wizard |
| `deals` | `/deals` | Deal CRUD, kanban |
| `companies` | `/companies` | Account management |
| `pipeline` | `/pipeline` | Stage configuration |
| `meddpicc` | `/deals/:id/meddpicc` | MEDDPICC scoring + SSE |
| `ai` | `/ai` | AI completions |
| `home` | `/home`, `/focus` | Dashboard BFF |
| `approvals` | `/approvals` | Human-in-the-loop write-back |
| `agents` | `/agents`, `/agent-runs` | Agent platform |
| `integrations-*` | `/integrations`, `/oauth`, `/webhooks` | HubSpot, Slack, Gong |
| `insights` | `/insights` | Analytics |
| `marketing` | `/leads` | Lead capture |

See [`api-routes.md`](api-routes.md) for the full route catalog.
