# AI CRM — Agent Guide

**Monolith:** Next.js (`apps/web`) + Express API (`apps/api`) + MongoDB.

```bash
cd codebase && pnpm dev    # API :4000 + web :3000
```

## Layout

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js frontend |
| `apps/api/src/modules/` | All API domains (deals, agents, auth, …) |
| `packages/db` | Mongoose models |
| `packages/shared` | Zod schemas |
| `packages/events` | In-process domain events |
| `docs/` | Product + engineering specs |
| `src/` | HubSpot project (`hsproject.json`) — separate from main app |

## Docs

Start at [`docs/README.md`](docs/README.md).

## HubSpot extension

HubSpot UI extensions live under `src/app/` (see `hsproject.json`). For HubSpot CLI workflows, use the HubSpotDev MCP when available.
