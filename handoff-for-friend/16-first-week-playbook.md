# 16 — First-week playbook

**Audience:** a friend taking over **AI CRM** (`/home/lakshin_pathak/ai-crm`).  
**App lives in:** `codebase/` (pnpm monorepo).  
**Goal:** by the end of day 4 you can run the product, read the API + data model, optionally touch HubSpot, and pick a real Wave E task without getting lost.

This is a **calendar**, not a spec. Canonical engineering docs stay in [`codebase/docs/README.md`](../codebase/docs/README.md). Setup detail is in [`02-local-setup.md`](02-local-setup.md) and [`03-environment-and-secrets.md`](03-environment-and-secrets.md). Backlog is in [`13-what-to-build-next.md`](13-what-to-build-next.md).

---

## Before Day 1 (30 minutes)

1. Clone [github.com/LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm) if you do not already have this tree.
2. Node **20+**, pnpm **9.15+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`).
3. Docker (local Mongo) or an Atlas URI.
4. Copy env **without** copying anyone’s production secrets:

```bash
cd codebase
cp .env.example .env
# fill MONGODB_URI, JWT_SECRET, TOKEN_ENCRYPTION_KEY (both secrets ≥ 32 chars)
# WEB_URL=http://localhost:3000  NEXT_PUBLIC_API_URL=http://localhost:4000
```

Never commit `.env`. Never paste JWTs, HubSpot tokens, or PATs into chat. See [`15-known-pitfalls.md`](15-known-pitfalls.md).

---

## Day 1 — Run locally and click the product

**Outcome:** you know what the app *feels* like: deals, agents, approvals, settings.

### Run

```bash
cd codebase
docker compose up mongo -d    # or: pnpm docker:up
pnpm install
pnpm populate-demo            # optional but strongly recommended
pnpm dev                      # web :3000 + API :4000
```

| Check | URL |
|-------|-----|
| Marketing / sign-in | http://localhost:3000 |
| Health | http://localhost:4000/api/v1/health |

Sign in with **email (dev)** on `/sign-in` when `NODE_ENV=development`. Google OAuth is optional on day 1.

If Mongo is down, JWT is too short, or CORS/`WEB_URL` is wrong, use [`02-local-setup.md`](02-local-setup.md).

### Click path (do this in order)

1. **Home** (`/home`) — “focus deals” and any empty-state copy. Note whether a deal-focus agent has ever run; home is often empty until then.
2. **Deals** (`/deals`) — kanban/list, open one deal.
3. **Deal tabs** — Overview, Plan, Activity, Events, Participants, Product Requests, Team Requests, Insights, Notes, Tasks, Projects, File Center. These child collections are **satellites** (see glossary).
4. **Agents** (`/agents`) — list, open one, glance at runs. Try **new** wizard vs “from template” if both exist (they behave differently).
5. **Approvals** (`/approvals`) — human queue before CRM/email writes. Empty is OK on demo data.
6. **Settings** (`/settings`) — general, **integrations**, **members**, sales-process. Do **not** connect HubSpot until Day 3.

Also peek at `/accounts`, `/projects`, `/requests`, `/calls`, `/insights` so you are not surprised later. Marketing pages on `/` can over-claim vs the product; treat the dashboard as truth.

### Day 1 done when

- [ ] `pnpm dev` stays up and `/api/v1/health` is OK.
- [ ] You opened at least one deal and clicked several satellite tabs.
- [ ] You opened Agents, Approvals, and Settings once.
- [ ] You can say in one sentence: “browser → Next :3000 → Express `/api/v1` :4000 → Mongo.”

---

## Day 2 — Read the API and the database

**Outcome:** you can find a route and the collection it hits without grepping blindly.

### Order of reading (stay in these files)

| Order | Doc / code | Why |
|-------|------------|-----|
| 1 | [`04-architecture.md`](04-architecture.md) + [`codebase/docs/architecture.md`](../codebase/docs/architecture.md) | Request flow, JWT, `workspaceId`, jobs |
| 2 | [`05-data-model.md`](05-data-model.md) + [`codebase/docs/database.md`](../codebase/docs/database.md) | Collections, indexes, tenancy |
| 3 | [`06-api-surface.md`](06-api-surface.md) + [`codebase/docs/api-routes.md`](../codebase/docs/api-routes.md) | Route groups |
| 4 | `codebase/apps/api/src/create-app.ts` | How modules mount |
| 5 | `codebase/packages/db/src/models/` | Real Mongoose schemas |
| 6 | `codebase/packages/shared/src/schemas/` | Zod contracts the API and web should share |

Skim [`07-auth-members.md`](07-auth-members.md) so you know JWT + refresh cookie + invite `?invite=` exist.

### Mental model for Day 2

- Every tenant-scoped query **must** include `workspaceId` (from the JWT, not from the client as a free-form override).
- Soft-deleted deals use `deletedAt: null`.
- **DealEvent** = calendar/meeting row. **Artifact** = transcript/email/thread text used for RAG and MEDDPICC. Mixing them is a common 404 on `/calls/:id`.
- Approvals parse a `proposedChange`, then **write-back** to HubSpot/Salesforce after approve.

### Light verification (optional)

```bash
cd codebase
pnpm typecheck
cd apps/api && NODE_ENV=development pnpm smoke
```

E2E is [`14-testing-and-quality.md`](14-testing-and-quality.md). Skip Playwright until the app is boringly stable locally.

### Day 2 done when

- [ ] You can name where a new Zod field would live (`packages/shared`).
- [ ] You can name the Mongoose file for Deal, AgentRun, Approval, ExternalRecord.
- [ ] You know `/api/v1` is Express, not Next Route Handlers.

---

## Day 3 — HubSpot sandbox (only if you have keys)

**Skip this day** if you do not have a HubSpot developer app + sandbox portal. Core CRM UI works without HubSpot. Day 4 does not depend on HubSpot.

If you **do** have keys:

1. Fill HubSpot vars from [`codebase/ENV.md`](../codebase/ENV.md) (`HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, optional webhook host). Do not use production portals.
2. Restart `pnpm dev`.
3. Settings → integrations → connect HubSpot OAuth.
4. Run a **full sync** once. Confirm deals appear and `ExternalRecord` rows exist (Mongo: `externalrecords` / model `ExternalRecord`).
5. Change a deal stage or field in the app and see whether write-back is immediate PATCH vs approval-gated (see [`09-crm-integrations.md`](09-crm-integrations.md) and [`15-known-pitfalls.md`](15-known-pitfalls.md) — e.g. `isHot` may not go to HubSpot).

Salesforce is a second live CRM; Pipedrive/Zoho are **not** live adapters yet (Wave F). Incremental **webhooks** are HubSpot-only.

**Do not** spend Day 3 “fixing” HubSpot N+1 or mapping bugs unless that is explicitly your first ticket. Learn the path: OAuth → `IntegrationConnection` → sync → `ExternalRecord` → write-back.

### Day 3 done when

- [ ] Either: HubSpot sandbox connected and one sync observed, **or** you documented “no keys, skipped.”
- [ ] You know `primaryCrmConnectionId` is a workspace field, not a guess.

---

## Day 4 — Pick a Wave E task

Waves **A–C** (satellite CRUD, AI wiring, HubSpot/SF/calendar truth) are largely done as of 2026-09-13. **Do not start 10.8** (buyer portal, LangGraph, POC evaluations) until you have lived in A–C code. Full backlog: [`13-what-to-build-next.md`](13-what-to-build-next.md) and [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md).

**Wave E** in the WBS is **10.5 + 10.6**: chat ingest + calendar leftovers, and leadership/insights AI.

### Good first Wave E picks (choose one)

| Prefer if you like… | Start here | Why it is sized for week 1 |
|---------------------|------------|----------------------------|
| Chat / ingest | **10.5.1** Slack thread → `Artifact` | Clear model (`Artifact` type `slack_thread`); citations beyond Gong |
| Product glue | **10.5.2** Deal ↔ channel + `deal_channel` delivery | Uses existing delivery config |
| Auth/team | **10.5.3** / **10.7.1** invite email | Known gap: invite URL exists, email often not sent |
| Insights | **10.6.1–10.6.2** single win-rate + render `winRateTrend` | Small, high leverage |
| Insights | **10.6.3** Loss tab = win-loss **agent** report | Needs 10.4.4 understanding |
| Power users | **10.6.4** SQL explorer beyond stub | Larger; only if you like data UI |
| NL | **10.6.5** workspace NL chat | Depends on embeddings quality; not the smallest first PR |

**Avoid as first ticket:** 10.2.8–9 Pipedrive/Zoho live, 10.8.3 buyer portal, 10.8.6 LangGraph, 10.4.3 full MCP handshake (multi-day). Those are Wave F or “promised product.”

### How to start the ticket

1. Write the ID (`10.5.1`) in your notes.
2. Find the module: `apps/api/src/modules/` + `packages/shared/src/schemas/`.
3. Add or extend **Zod first**, then model if needed, then thin handler, then UI.
4. `pnpm typecheck` before you ask for review.

### Days 5–7 (if you have them)

- Finish the Wave E slice + a smoke/e2e path if you touched UI ([`14-testing-and-quality.md`](14-testing-and-quality.md)).
- Skim [`10-agents-approvals.md`](10-agents-approvals.md) and [`11-ai-features.md`](11-ai-features.md) so agent runs vs approvals vs MEDDPICC are distinct.
- Read [`12-what-exists-today.md`](12-what-exists-today.md) so you do not rebuild stubs that already shipped.

---

## How to ask questions

Ask **after** you have a file path and a repro. Good questions look like this:

> On `GET /api/v1/calls/:id` for a row that is a `DealEvent` (not `Artifact`), I still see X. I expected Y from `apps/api/src/modules/…`. Is the fallback supposed to be in handler Z?

Include:

- Route or page URL
- Collection / model name (`Deal` vs `DealEvent` vs `Artifact`)
- What you already read (architecture / api-routes / a handoff file)
- Expected vs actual (one sentence each)

Do **not**:

- Paste `.env` values, HubSpot tokens, or GitHub PATs
- Ask “how does the CRM work?” — point at [`09-crm-integrations.md`](09-crm-integrations.md) and ask about one provider
- Start a new architecture (Redis, extra services) — the product is a modular monolith on Mongo `background_jobs`

If something looks like a known hole, check [`15-known-pitfalls.md`](15-known-pitfalls.md) first (HubSpot N+1, invite email, calendar title match, listCalls artifact-first, JWT length).

---

## Coding conventions (non-negotiable)

| Topic | Rule |
|-------|------|
| Package manager | **pnpm** only. From `codebase/`. Filters like `pnpm --filter @ai-crm/api typecheck`. |
| Contracts | Shared **Zod** in `packages/shared/src/schemas/`. Infer types; do not fork shapes in the web app. |
| Tenancy | **`workspaceId` on every query** (and usually `deletedAt: null` for deals). Skipping this is a security bug. |
| Handlers | Thin. Logic in `apps/api/src/lib/` or packages. |
| API | Prefix `/api/v1/`. Errors `{ error: { code, message } }`. Bearer JWT. |
| IDs | Strings (Mongo ObjectIds) on the wire. |
| UI | shadcn/ui + existing dashboard patterns. `apiGet` / token from the auth helper — no new Next `/api` CRM routes. |
| Jobs | Mongo queues, not Redis. |
| Agents | External CRM/email writes go through **Approval** + write-back, not silent PATCH from the executor. |
| Env | New vars → `.env.example` + `ENV.md`. Never commit `.env`. |
| Docs | New routes → `docs/api-routes.md`. Status tables in `docs/future/` when you ship something those docs mention. |

Feature slice reminder ([`codebase/docs/future/vibe-coding-patterns.md`](../codebase/docs/future/vibe-coding-patterns.md)):

1. Zod → 2. Mongoose (if new) → 3. Handler → 4. Module `index.ts` → 5. `create-app.ts` if new module → 6. Next page/component → 7. docs.

Before you call a change done: `pnpm typecheck`. Smoke/e2e as in [`14-testing-and-quality.md`](14-testing-and-quality.md).

---

## Suggested reading map for the week

```
Day 1  02-local-setup → click UI (08-web-ui)
Day 2  04-architecture + 05-data-model + 06-api-surface
Day 3  09-crm-integrations + ENV.md (HubSpot only)
Day 4  13-what-to-build-next + r11-wbs Wave E
Anytime  17-glossary-and-contacts
```

If a handoff file and `codebase/docs/` disagree, **trust the code**, then the dated WBS (`r11-wbs.md`), then this pack.
