# 00 — Start here

**Who this pack is for:** a friend (or new collaborator) taking over [LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm). You are expected to run the app locally, click through deals/agents/approvals, then change code without treating marketing copy or older architecture docs as current truth.

**Workspace on disk:** `/home/lakshin_pathak/ai-crm`. **All application code lives in `codebase/`.** The git root is the outer folder; `pnpm` workspaces, `.env`, Docker Mongo, and `docs/` all sit under `codebase/`.

```
ai-crm/                          # git root, GitHub remote
├── README.md                    # how to start the app (clone → pnpm dev → sign-in)
├── AGENTS.md                    # “cd codebase && pnpm dev”
├── handoff-for-friend/          # this pack (human-oriented)
└── codebase/                    # the product
```

**Boot the stack:** repo root [`README.md`](../README.md) or this folder’s [`README.md`](./README.md) (same steps). Deep setup: [`02-local-setup.md`](./02-local-setup.md).

Remote: `https://github.com/LakshinPathak/ai-crm`.

---

## How to read this pack (18 files, in order)

Read **one file at a time** in numeric order. Do not skip 00–03 if you have never run the stack. Files 04–11 map the running system. Files 12–17 are honesty, backlog, tests, pitfalls, first week, and glossary.

| # | File | Why it exists | When you can stop |
|---|------|---------------|-------------------|
| **00** | `00-START-HERE.md` | Audience, product one-pager, doc vs pack, run commands, anti-assumptions | After you know what *not* to believe |
| **01** | `01-repo-map.md` | Tree, entry files, where Express mounts, where Next App Router lives | After you can find a route in 30 seconds |
| **02** | `02-local-setup.md` | Clone, Node 20, pnpm, Mongo, `pnpm dev`, seed, smoke | After `:3000` and `:4000` respond |
| **03** | `03-environment-and-secrets.md` | Env groups; what is optional; never commit `.env` | After a local `.env` exists from `.env.example` |
| **04** | `04-architecture.md` | Browser → Next → Express → Mongo; jobs; events | After you can describe one request |
| **05** | `05-data-model.md` | Mongoose models, `workspaceId`, soft deletes | Before you add a collection |
| **06** | `06-api-surface.md` | `/api/v1` groups, live vs stub | Before you add an endpoint |
| **07** | `07-auth-members.md` | Google, **dev-login**, JWT, invites, roles | Before you touch tenancy |
| **08** | `08-web-ui.md` | App Router routes, deal tabs, marketing honesty | Before you restyle or add a page |
| **09** | `09-crm-integrations.md` | HubSpot/Salesforce live vs Pipedrive/Zoho demo | Before you “connect another CRM” |
| **10** | `10-agents-approvals.md` | Templates, executor, HITL queue | Before you add an agent |
| **11** | `11-ai-features.md` | Gemini, MEDDPICC SSE, scoring, Ask/RAG | Before you assume LangGraph |
| **12** | `12-what-exists-today.md` | Inventory as of 2026-09-13 (R11 waves A–D) | Before you plan a sprint |
| **13** | `13-what-to-build-next.md` | Friend-friendly `r11-wbs.md` | Before you pick a first ticket |
| **14** | `14-testing-and-quality.md` | typecheck, smoke, Playwright | Before you open a PR |
| **15** | `15-known-pitfalls.md` | Review leftovers and footguns | Before you debug “why is this weird” |
| **16** | `16-first-week-playbook.md` | Day-by-day click path | After clone, before changing production paths |
| **17** | `17-glossary-and-contacts.md` | Vocabulary + GitHub + existing docs index | Whenever a term is unclear |

Suggested cadence: **00–03 on day 1**, **04–09 on day 2**, **10–15 before you write production code**, **16** as the week plan.

---

## Product in one page

This is an **AI-native presales CRM**: an internal operating system for a sales team, not a consumer CRM clone.

**Job to be done.** Keep deal truth in one workspace: pipeline board, account (company), MEDDPICC completeness, blockers, notes, tasks, participants, product/team requests, files, calendar-ish events, call/activity artifacts. Overlay **agents** that run on schedules or events and often stop at a human **approval** before writing back to HubSpot/Salesforce or creating follow-up work.

**Who uses it.** Workspace members (roles exist: `admin` / `manager` / `member` — enforcement is incomplete; see file 07). There is **no shipped buyer-facing portal**. Marketing pages talk about collaboration with buyers; the app does not.

**Core objects (mental model).**

| Object | Meaning in this repo |
|--------|----------------------|
| **Workspace** | Tenant. Almost every query is scoped by `workspaceId`. |
| **Deal** | Opportunity. Kanban + detail with ~12 tabs. |
| **Company** | Account; deals hang off companies. |
| **PipelineStage** | Board columns; mapped to HubSpot/SF stages when CRM is live. |
| **Agent** | Saved automation (usually from a template slug). |
| **AgentRun** | One execution; statuses include success / failed / awaiting_approval. |
| **Approval** | Human-in-the-loop queue (`/approvals`) before write-back. |
| **Artifact** | Ingested content (e.g. Gong transcript) used for citations/RAG. |
| **DealEvent** | Calendar/activity row; not the same as Artifact. |
| **ExternalRecord** | CRM object id mapping so incremental sync and write-back have a handle. |

**CRM.** Connector registry lists HubSpot, Salesforce, Pipedrive, Zoho. **Live OAuth + full sync + write-back paths that you should treat as real:** HubSpot (adapter in `packages/integrations/crm`) and Salesforce (API-side `apps/api/src/lib/salesforce/`). Pipedrive and Zoho resolve to a **demo connector** unless you later implement 10.2.8 / 10.2.9.

**AI.** Google Gemini (`GEMINI_API_KEY`) for MEDDPICC refresh, deal scoring, agent executors, deal Ask. Without a key, core CRM UI still runs; AI paths use heuristics or empty output. Runtime is **TypeScript functions + Mongo `background_jobs`**, not a graph framework.

**Approvals.** Agents that mutate CRM or send “do this” bundles create `Approval` rows. UI: `apps/web/app/(dashboard)/approvals/page.tsx`. API: `apps/api/src/modules/approvals/`.

**Not a microservices fleet.** One Express process (`apps/api`) on **:4000**, one Next.js app (`apps/web`) on **:3000**, one MongoDB. Jobs poll Mongo in-process by default (`startBackgroundJobProcessors` from `server.ts`). Optional split: `pnpm --filter @ai-crm/api dev:worker`.

---

## This pack vs existing repo docs

Do **not** duplicate or “fix” the in-repo specs inside this pack. Point, then add **delta**: what shipped, what the spec still claims, where the file actually is.

| Canonical repo doc | Use it for | Do not use it as |
|--------------------|------------|------------------|
| [`codebase/GETTING_STARTED.md`](../codebase/GETTING_STARTED.md) | Clone, `pnpm install`, Docker Mongo, `pnpm dev`, `populate-demo`, typecheck/smoke | A feature completeness list |
| [`codebase/ENV.md`](../codebase/ENV.md) | Every env var name and purpose | Copying secrets; pack file 03 only groups + “what is optional” |
| [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md) | Remaining work IDs 10.1–10.9, waves A–F, “do not start 10.8 until CRUD/CRM/AI wiring is solid” | A status dashboard — several 10.1/10.2 items may already be in tree; reconcile with file 12 |
| [`codebase/docs/api-routes.md`](../codebase/docs/api-routes.md) | Intended module map (~108 routes), flows, test catalog | Exact mount list — **source of truth for mounts is `create-app.ts`**; the doc still mentions `packages/agents` and `packages/context` which **do not exist** |
| [`codebase/docs/architecture.md`](../codebase/docs/architecture.md) | Modular-monolith intent, webhook “fast ack”, Mongo jobs | Current tree: it still says **LangGraph**, `packages/agents`, Clerk, Turbo. Those are **wrong today**. Prefer pack 04 + `TECH_STACK.md` |

**Also useful, still secondary to this pack:**

- [`codebase/docs/README.md`](../codebase/docs/README.md) — catalog of PRD, frontend-flow, agent-platform, crm-connectors.
- [`codebase/TECH_STACK.md`](../codebase/TECH_STACK.md) — closer to the real stack (Mongo jobs, Gemini, pnpm workspaces) than `architecture.md` §2.
- [`codebase/docs/future/implementation-status.md`](../codebase/docs/future/implementation-status.md) — can lag; prefer pack 12.
- [`codebase/docs/future/`](../codebase/docs/future/) — vibe-coding / long-horizon; treat as **design**, not shipped.

**This pack’s job:** a friend-readable overlay dated **2026-09-13**, with **concrete paths**, and an explicit list of things the product **does not** have.

---

## Commands (first hour)

Prereqs: Node **20+**, pnpm **9.15+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`), Docker for local Mongo **or** Atlas URI.

```bash
git clone https://github.com/LakshinPathak/ai-crm.git
cd ai-crm/codebase
cp .env.example .env          # fill required keys — see ENV.md / pack 03
docker compose up mongo -d    # or: pnpm docker:up
pnpm install
pnpm dev
```

| Process | URL |
|---------|-----|
| Web (Next.js 15, `@ai-crm/web`) | http://localhost:3000 |
| API (Express, `@ai-crm/api`) | http://localhost:4000 |
| Liveness (actual) | http://localhost:4000/health — registered in `create-app.ts`; smoke hits this |
| Docs mismatch | `GETTING_STARTED.md` cites `/api/v1/health`. `modules/health/index.ts` is a leftover `_stub` router and is **not** mounted |

Root script `pnpm dev` is:

```text
pnpm -r --parallel --filter @ai-crm/api --filter @ai-crm/web dev
```

Split:

```bash
pnpm dev:api    # :4000
pnpm dev:web    # :3000
```

Optional seed (demo workspace, deals, stages):

```bash
pnpm populate-demo
```

Sanity:

```bash
pnpm typecheck
cd apps/api && NODE_ENV=development pnpm smoke
```

Details, failures (JWT length, Mongo down, CORS/`WEB_URL`): pack **02**.

---

## Dev login (development only)

You do **not** need Google OAuth to click the product.

- **API:** `POST /api/v1/auth/dev-login` — registered on `authPublicRouter` in `codebase/apps/api/src/modules/auth/index.ts`, implemented in `handlers.ts` as `devLogin`.
- **Guard:** if `NODE_ENV === 'production'`, the handler returns **404**. Smoke tests skip the route outside development.
- **UI:** `codebase/apps/web/components/auth/DevLoginForm.tsx` on the sign-in page. Default email in the form: `dev@example.com`. The form is **not rendered** when Next `NODE_ENV` is production.
- **Behavior:** creates or finds a user with `googleId = "dev-{email}"`, role `admin`, issues JWT + refresh cookie, then the web client routes to `/onboarding` or `/home`.
- **Scripts:** `populate-demo.ts` and HubSpot scripts call the same endpoint.

Google OAuth (`GET /api/v1/auth/google` … callback) is the production path. For local, use the sign-in form’s dev block.

---

## What you should NOT assume

These show up in landing copy, `prd.md`, `architecture.md`, `system-design.md`, onboarding logos, or competitive docs. **They are not the running product.**

| Assumption | Reality |
|------------|---------|
| **Buyer portal** | WBS **10.8.3**. No external ACL, no buyer login, no shared thread product. Marketing mentions it; do not demo it. |
| **Live Pipedrive** | Registry + onboarding card + demo adapter. No live OAuth/adapter. WBS **10.2.8**. |
| **Live Zoho CRM** | Same: demo data, regional OAuth not implemented. WBS **10.2.9**. |
| **LangGraph** | **Zero** `langgraph` / `@langchain` in `codebase/`. Agents are `runByTemplate` in `apps/api/src/modules/agents/executor.ts` plus files under `executors/`. WBS **10.8.6** defers a LangGraph runtime. |
| **`packages/agents` / `packages/context` / `packages/email`** | Listed in `architecture.md`. **Not in `pnpm-workspace.yaml`.** Workspace packages today: `apps/*`, `packages/*`, `packages/integrations/*` — in practice **db, shared, events, integrations/crm**. |
| **Redis** | Removed. Jobs = Mongo `background_jobs` (`packages/db/src/models/background-job.ts`). |
| **Clerk** | `architecture.md` §3.1. Auth is Google + JWT + cookies in `apps/api/src/lib/auth/`. |
| **Turborepo** | Docs mention it. Root is **pnpm workspaces** only (`codebase/package.json`). |
| **Four live CRMs on first sync** | HubSpot + Salesforce are the live pair. Pipedrive/Zoho = demo. |
| **Every Insights / MCP / SQL explorer screen is production-grade** | Partial; pack 12 and WBS 10.4.3 / 10.6.4. |
| **Invite email actually sends** | Invite URL/token path exists; outbound email is a known gap (WBS 10.5.3 / 10.7.1). |
| **HubSpot UI extension is the main app** | `codebase/src/` + `hsproject.json` is a **separate HubSpot project**, not Next.js. |

If a doc and `create-app.ts` disagree, **believe the TypeScript**.

---

## After this file

Open [`01-repo-map.md`](./01-repo-map.md), then run the commands in `GETTING_STARTED.md` / pack 02. Keep GitHub issues and PRs on [LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm).
