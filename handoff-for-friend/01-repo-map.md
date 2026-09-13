# 01 — Repo map

Walk this tree with a text editor open. Paths are from **git root** `/home/lakshin_pathak/ai-crm` unless noted as relative to `codebase/`.

GitHub: [LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm).

---

## Outer repo vs `codebase/`

| Path | What it is |
|------|------------|
| `README.md` | Clone + `cd codebase` + `pnpm dev` |
| `AGENTS.md` | One-screen pointer for coding agents |
| `handoff-for-friend/` | This pack |
| `codebase/` | pnpm monorepo: apps, packages, docs, env, Docker |
| `.gitignore` (root) | Ignores `codebase/repomix-output.xml`, `codebase/graphify-out/` among others |

There is **no** application `package.json` at git root. Always:

```bash
cd codebase
```

---

## `codebase/` top level

```
codebase/
├── package.json              # workspace scripts: dev, typecheck, populate-demo, docker:up
├── pnpm-workspace.yaml       # apps/*, packages/*, packages/integrations/*
├── pnpm-lock.yaml
├── docker-compose.yml        # mongo:7 → host :27017
├── .env.example              # copy to .env (gitignored)
├── ENV.md
├── GETTING_STARTED.md
├── TECH_STACK.md
├── AGENTS.md
├── HUBSPOT_APP_SETUP.md
├── hsproject.json            # HubSpot CLI project; srcDir = "src"
├── src/                      # HubSpot UI extension (NOT Next.js)
├── apps/
│   ├── web/                  # @ai-crm/web  Next :3000
│   └── api/                  # @ai-crm/api  Express :4000
├── packages/
│   ├── db/                   # @ai-crm/db
│   ├── shared/               # @ai-crm/shared
│   ├── events/               # @ai-crm/events
│   └── integrations/crm/     # @ai-crm/integrations-crm
└── docs/                     # Product/eng specs (see 00 for which to trust)
```

**Not present (but docs mention):** `packages/agents`, `packages/context`, `packages/email`, `turbo.json`, Redis compose service.

---

## Package manager graph

| npm name | Disk | Role |
|----------|------|------|
| `ai-crm` (root workspace) | `codebase/package.json` | Orchestrates filters |
| `@ai-crm/web` | `apps/web` | Next.js UI; **no** `@ai-crm/db` dependency |
| `@ai-crm/api` | `apps/api` | Depends on db, shared, events, integrations-crm, Gemini SDK |
| `@ai-crm/db` | `packages/db` | Mongoose `connectDb` + models |
| `@ai-crm/shared` | `packages/shared` | Zod schemas re-exported from `src/index.ts` |
| `@ai-crm/events` | `packages/events` | In-process `publishEvent` / `subscribeEvents` |
| `@ai-crm/integrations-crm` | `packages/integrations/crm` | `CrmConnector` + HubSpot live + demo for other keys |

`pnpm-workspace.yaml` also includes `packages/integrations/*` so a future `packages/integrations/chat` could land there. **Today chat OAuth/API lives in the API app** under `apps/api/src/lib/integrations/` and `modules/integrations-chat/`.

---

## `apps/web` — Next App Router

**Where App Router lives:** `codebase/apps/web/app/`.

This is Next.js **15** (`apps/web/package.json`: `"next": "^15.1.0"`, React 19). Dev command: `next dev -H 0.0.0.0 -p 3000`. Config: `codebase/apps/web/next.config.ts` (`outputFileTracingRoot` set to monorepo root).

There is **no** `middleware.ts` at `apps/web/`. Auth gating is client-side `AuthGuard` inside the dashboard layout.

### Layout tree

| File | Role |
|------|------|
| `apps/web/app/layout.tsx` | Root HTML, Geist font, `ThemeProvider`, `TooltipProvider`, `globals.css` |
| `apps/web/app/(marketing)/layout.tsx` | Public marketing chrome |
| `apps/web/app/(dashboard)/layout.tsx` | `AuthGuard` + `DashboardShell` + Toaster |
| `apps/web/app/onboarding/layout.tsx` | Onboarding wizard shell |
| `apps/web/app/(auth)/` | Sign-in / sign-up pages (no extra layout file required) |

Route groups `(marketing)`, `(auth)`, `(dashboard)` **do not appear in the URL**.

### Pages (URL → file)

**Marketing (`(marketing)`):**

| URL | File |
|-----|------|
| `/` | `app/(marketing)/page.tsx` |
| `/pricing` | `app/(marketing)/pricing/page.tsx` |
| `/product`, `/product/[slug]` | `app/(marketing)/product/...` |
| `/why` | `app/(marketing)/why/page.tsx` |
| `/about` | `app/(marketing)/about/page.tsx` |
| `/blog`, `/blog/[slug]` | `app/(marketing)/blog/...` |

**Auth:**

| URL | File |
|-----|------|
| `/sign-in` | `app/(auth)/sign-in/page.tsx` — includes `DevLoginForm` |
| `/sign-up` | `app/(auth)/sign-up/page.tsx` |
| `/auth/callback` | `app/auth/callback/page.tsx` — OAuth code exchange; paste-token fallback |

**Product UI (`(dashboard)`):**

| URL | File |
|-----|------|
| `/home` | `app/(dashboard)/home/page.tsx` |
| `/deals` | `app/(dashboard)/deals/page.tsx` |
| `/deals/[dealId]` | `app/(dashboard)/deals/[dealId]/page.tsx` |
| `/accounts`, `/accounts/[accountId]` | companies |
| `/agents`, `/agents/new`, `/agents/[agentId]` | agent list/wizard/detail |
| `/approvals` | HITL queue |
| `/projects` | workspace projects hub |
| `/requests` | product/team request hub |
| `/calls`, `/calls/[id]` | call list/detail |
| `/insights`, `/insights/sql` | analytics / SQL explorer |
| `/settings` | workspace settings |
| `/settings/integrations` | CRM/chat/Gong/calendar connections |
| `/settings/members` | members |
| `/settings/sales-process` | stages / process |
| `/settings/mcp` | MCP registry UI |

**Onboarding:** `app/onboarding/page.tsx` (CRM picker includes Pipedrive/Zoho **cards**; live connect is HubSpot/SF — pack 09).

### Web libraries and shells

| Path | Role |
|------|------|
| `apps/web/lib/api-client.ts` | `fetch` to `NEXT_PUBLIC_API_URL` + `/api/v1` + Bearer + cookie refresh |
| `apps/web/lib/auth.ts` | Token in storage; `refreshAccessToken` |
| `apps/web/lib/types.ts` | Front-end DTO types |
| `apps/web/lib/marketing-content.ts` | Landing copy (treat as marketing, not inventory) |
| `apps/web/components/AuthGuard.tsx` | Redirect unsigned users |
| `apps/web/components/DashboardShell.tsx` | Nav / chrome |
| `apps/web/components/deals/DealKanbanBoard.tsx` | Pipeline board |
| `apps/web/components/deals/DealTabBar.tsx` + `DealTabPanels.tsx` | 12 deal tabs |
| `apps/web/components/deals/deal-tabs.ts` | Tab ids: overview, plan, activity, events, participants, product-requests, team-requests, insights, notes, tasks, projects, file-center |
| `apps/web/components/deals/tabs/*.tsx` | One component per tab |
| `apps/web/components/ui/` | shadcn/Radix primitives |
| `apps/web/components/marketing/` | Landing/pricing/blog |
| `apps/web/components/analytics/` | Insights dashboards |
| `apps/web/e2e/` | Playwright specs |
| `apps/web/README.md` | Short web notes |

Deal detail is **not** a nested App Router folder per tab; tabs are query/state inside `[dealId]/page.tsx` + `DealTabPanels`.

---

## `apps/api` — Express modular monolith

### Process entry

| File | Role |
|------|------|
| `apps/api/src/server.ts` | Loads `codebase/.env` via `dotenv` (`resolve(import.meta.dirname, '../../../.env')`), `connectDb()`, **`startBackgroundJobProcessors()`**, `createApp().listen(PORT ?? 4000)` |
| `apps/api/src/create-app.ts` | **All HTTP mounts live here** (plus raw webhook parsers) |
| `apps/api/src/routers.ts` | Re-exports each module’s `Router` — no paths, just names |
| `apps/api/src/workers/index.ts` | Dedicated worker process (`dev:worker`) if you split jobs out of the API |

`createApp` is also exported as package subpath `./create-app` (tests/smoke can import the app without listen).

### Where routes are registered (`create-app.ts`)

Order matters: **raw body webhooks first**, then `express.json()`, then public routes, then JWT+workspace `protectedApi`.

**Raw (signature verification needs unparsed body):**

| Method + path | Handler file |
|---------------|--------------|
| `POST /api/v1/webhooks/hubspot` | `modules/webhooks/hubspot.ts` |
| `POST /api/v1/webhooks/gong/:connectionId` | `modules/webhooks/gong.ts` |
| `POST /api/v1/agents/:agentId/webhook` | `modules/agents/webhook.ts` |
| `POST /api/v1/webhooks/slack/interactions` | `modules/webhooks/slack-interactions.ts` |
| `POST /api/v1/webhooks/slack/commands` | `modules/webhooks/slack-commands.ts` |

Then `app.use('/api/v1/webhooks', webhooksRouter)` (`modules/webhooks/index.ts`) for additional webhook routes that use JSON.

**Public / mixed:**

| Mount | Router source |
|-------|----------------|
| `GET /health` | inline in `create-app.ts` (Mongo ping). **Not** `/api/v1/health`. |
| `/api/v1/auth` | `authPublicRouter` — google, callback, exchange, refresh, logout, **dev-login** |
| `/api/v1` | `authProtectedRouter` — `/me`, workspace CRUD, members, invites (`jwtMiddleware` inside that router) |
| `/api/v1/leads` | `marketingRouter` |
| `/api/v1/oauth` | `oauthRouter` — CRM/chat/Gong/calendar callbacks |
| `/api/v1/internal` | `internalRouter` — `INTERNAL_SERVICE_TOKEN` |

**Protected (`jwtMiddleware` + `requireWorkspace`):**

| Mount prefix | Module folder |
|--------------|----------------|
| `/api/v1/onboarding` | `modules/onboarding/` |
| `/api/v1/deals` | `modules/deals/` (`index.ts` wires handlers-*.ts) |
| `/api/v1/companies` | `modules/companies/` |
| `/api/v1/pipeline` | `modules/pipeline/` |
| (meddpicc paths on `meddpiccRouter`) | `modules/meddpicc/` |
| `/api/v1/ai` | `modules/ai/` |
| `/api/v1/home` | `modules/home/` |
| `/api/v1/focus` | same `home` module (`focusRouter`) |
| `/api/v1/approvals` | `modules/approvals/` |
| `/api/v1/agent-templates` | `modules/agents/` |
| `/api/v1/agents` | `modules/agents/` |
| `/api/v1/agent-runs` | `modules/agent-runs/` |
| `/api/v1/integrations/crm` | `modules/integrations-crm/` |
| `/api/v1/integrations/chat` | `modules/integrations-chat/` |
| `/api/v1/integrations` | `modules/integrations/` (Gong, calendar, etc.) |
| `/api/v1/insights` | `modules/insights/` |
| `/api/v1/calls` | `modules/calls/` |
| `/api/v1/settings` | `modules/settings/` |

**Module convention:** each domain is `apps/api/src/modules/<name>/index.ts` (Router) + `handlers.ts` (and extra handler files for deals). Full path catalog: pack **06** and `docs/api-routes.md` (verify against `index.ts`).

**Orphan:** `modules/health/index.ts` exports `healthRouter` with `GET /_stub` and is **not** imported by `routers.ts` / `create-app.ts`.

### API libraries (not packages)

| Path | Role |
|------|------|
| `apps/api/src/lib/auth/` | JWT, cookies, session, Google start, `invite.ts` |
| `apps/api/src/lib/gemini.ts` (+ `gemini-json`, `gemini-transcript`) | Gemini client |
| `apps/api/src/lib/ai-scoring.ts` | Sentiment/fit refresh |
| `apps/api/src/lib/queues/` | Mongo pollers: `processor.ts`, `mongo-queue.ts`, `agent-runs.ts`, `ingest-call.ts`, `embed-artifact.ts`, `crm-incremental.ts`, `google-calendar-sync.ts`, `scheduled-agents.ts` |
| `apps/api/src/lib/hubspot/` | Client, full sync, field write-back, seed |
| `apps/api/src/lib/salesforce/` | `client.ts`, `sync.ts`, `opportunity-write-back.ts` |
| `apps/api/src/lib/integrations/` | Slack/Teams/GChat/Gong/Calendar OAuth + API helpers |
| `apps/api/src/lib/crm/connector-context.ts` | Builds context for `resolveCrmConnector` |
| `apps/api/src/modules/agents/executor.ts` | `runByTemplate` switch |
| `apps/api/src/modules/agents/executors/` | Per-template runners |
| `apps/api/scripts/` | `populate-demo.ts`, `smoke-test.ts`, HubSpot seed/sync/test |

---

## `packages/db`

| File | Role |
|------|------|
| `packages/db/src/connection.ts` | `mongoose.connect(MONGODB_URI)` |
| `packages/db/src/index.ts` | Re-exports every model |
| `packages/db/src/models/*.ts` | One collection per file |

Models exported today: `User`, `Workspace`, `Company`, `PipelineStage`, `Deal`, `Note`, `Task`, `DealMeddpicc`, `MeddpiccCitation`, `DealBlocker`, `DealParticipant`, `DealProject`, `DealProductRequest`, `DealTeamRequest`, `DealEvent`, `DealFile`, `DealStageChange`, `Agent`, `AgentRun`, `Approval`, `MarketingLead`, `IntegrationConnection`, `AuthSession`, `AuthExchangeCode`, `WorkspaceInvite`, `ExternalRecord`, `Artifact`, `ArtifactChunk`, `BackgroundJob`.

Field-level notes: pack **05**. Tenancy: almost all documents carry `workspaceId`.

---

## `packages/shared`

| File | Role |
|------|------|
| `packages/shared/src/index.ts` | `export *` from schema modules |
| `packages/shared/src/schemas/auth.ts` | Includes `DevLoginSchema` used by `devLogin` |
| `packages/shared/src/schemas/deal.ts` | Deal + satellite Zod |
| `packages/shared/src/schemas/agent.ts` | Agent create/update |
| `packages/shared/src/schemas/company.ts` | Accounts |
| `packages/shared/src/schemas/pipeline.ts` | Stages |
| `packages/shared/src/schemas/call.ts` | Calls |
| `packages/shared/src/schemas/mcp.ts` | MCP settings shapes |

**Rule of thumb:** validate at the API boundary with these schemas; do not invent a second DTO layer in the web app if the shared schema already exists.

---

## `packages/integrations` (CRM only)

```
packages/integrations/crm/src/
├── index.ts              # public exports
├── types.ts              # CrmConnector, CrmProvider, CanonicalCrmDeal, …
├── registry.ts           # resolveCrmConnector
├── demo-data.ts
└── adapters/
    ├── hubspot.ts        # live HubSpot when mode=live + token
    └── demo.ts           # used for pipedrive, zoho, salesforce-without-live-path, and HubSpot without token
```

`registry.ts` display names include `salesforce`, but **Salesforce HTTP lives in the API** (`lib/salesforce/`), not as a second file under `adapters/`. When you add Pipedrive/Zoho live, the intended seam is a new adapter + `resolveCrmConnector` branch (WBS 10.2.8–9).

---

## `packages/events`

Single file: `packages/events/src/index.ts`.

Event union includes `activity.ingested`, `deal.stage_changed`, `deal.upserted`, `approval.approved`, `agent.run.completed`, `crm.sync.completed`, `deal.ai_fields.updated`.

This is **in-process** (`Set` of listeners). It is not Kafka, not Redis pub/sub, not a separate microservice. If you run API and worker as two processes, **do not assume events cross the process boundary** unless you also persist a job.

---

## HubSpot project (`codebase/src/`)

`hsproject.json`: `"srcDir": "src"`. Files like `src/app/functions/*.js`, `src/app/app-hsmeta.json`, webhook meta JSON. This is HubSpot’s project layout for UI extensions / functions. **It does not import `@ai-crm/web`.** Setup notes: `codebase/HUBSPOT_APP_SETUP.md`. Ignore it until you are publishing a HubSpot card.

---

## Jobs vs HTTP

`server.ts` always starts pollers unless you run a separate worker. `processor.ts` registers queues:

- agent runs → `processAgentRun`
- ingest-call (Gong/transcripts)
- embed-artifact (vector chunks)
- CRM incremental
- Google Calendar sync
- scheduled-agent ticker

Collection: `BackgroundJob` model.

---

## Graphify and repomix

| Artifact | Status in this checkout (2026-09-13) |
|----------|--------------------------------------|
| `graphify-out/` | **Not present.** Root `.gitignore` ignores `codebase/graphify-out/`. Team workflow (`dev-cycle`) wants a graph for blast-radius; you may generate it later. Do not wait on it to navigate — use this file. |
| `repomix-output.xml` | **Not present.** Gitignored as `codebase/repomix-output.xml`. Optional LLM pack of the repo; generate with the repomix skill if an agent needs a single XML blob. |

If a teammate already ran those tools, look at gitignored folders locally; they will not be on GitHub.

---

## How to find “the code for X”

| I want… | Start here |
|---------|------------|
| HTTP route | `create-app.ts` → `routers.ts` → `modules/<x>/index.ts` |
| Zod body | `packages/shared/src/schemas/` |
| Mongo fields | `packages/db/src/models/` |
| CRM list/sync abstraction | `packages/integrations/crm/src/registry.ts` |
| Salesforce write-back | `apps/api/src/lib/salesforce/` |
| HubSpot write-back | `apps/api/src/lib/hubspot/` |
| Agent behavior | `modules/agents/executor.ts` + `executors/<slug>.ts` |
| UI page | `apps/web/app/**/page.tsx` |
| Deal tab | `components/deals/tabs/` |
| API from the browser | `apps/web/lib/api-client.ts` |

---

## Stale maps inside the repo

`docs/architecture.md` §2 still draws `packages/agents`, LangGraph, Clerk, Turbo, `apps/api/src/routes/v1/`. The **actual** API has no `src/routes/v1/` folder; modules are `src/modules/` and mounts are `create-app.ts`. Prefer this handoff file + `TECH_STACK.md` + the TypeScript.

Next: [`02-local-setup.md`](./02-local-setup.md) to boot Mongo and both processes.
