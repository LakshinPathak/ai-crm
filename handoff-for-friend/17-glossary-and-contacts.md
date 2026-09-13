# 17 — Glossary and contacts

**Audience:** a friend taking over **AI CRM**.  
**Repo:** [https://github.com/LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm)  
**Local root:** `/home/lakshin_pathak/ai-crm` — **all application code and specs** are under `codebase/`.

Use this file when a word in chat or in another handoff doc is ambiguous. For the first-week schedule see [`16-first-week-playbook.md`](16-first-week-playbook.md).

---

## How this pack relates to existing docs

There are **two documentation layers**. They are not duplicates of each other.

| Layer | Where | What it is |
|-------|--------|------------|
| **Canonical product + engineering specs** | [`codebase/docs/README.md`](../codebase/docs/README.md) | Architecture, PRD, database, API routes, frontend flows, agent platform, CRM connectors, WBS, future/vibe-coding library. **Start here** when you need the real spec. |
| **Friend handoff pack** (this folder) | `handoff-for-friend/` | Numbered, opinionated onboarding: how to run it, what exists *today*, pitfalls, what to build next, this glossary. Written for a takeover in September 2026 after R11 waves A–D. |

**Rule:** specs and tables of record live in `codebase/docs/`. This pack **points at** those files and at code. If marketing copy, an old `wbs.md` checkbox, and `r11-wbs.md` disagree, prefer **running code** + [`12-what-exists-today.md`](12-what-exists-today.md) + [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md).

Repo-root [`README.md`](../README.md) and [`AGENTS.md`](../AGENTS.md) are thin pointers: `cd codebase && pnpm dev`.

---

## GitHub and where to look

| Resource | URL / path |
|----------|------------|
| GitHub repository | [github.com/LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm) |
| Clone | `git clone https://github.com/LakshinPathak/ai-crm.git` then `cd ai-crm/codebase` |
| App + packages | `codebase/apps/web`, `codebase/apps/api`, `codebase/packages/*` |
| Mongoose models | `codebase/packages/db/src/models/` |
| Shared Zod | `codebase/packages/shared/src/schemas/` |
| Docs index | [`codebase/docs/README.md`](../codebase/docs/README.md) |
| Local run | [`codebase/GETTING_STARTED.md`](../codebase/GETTING_STARTED.md) |
| Env catalog | [`codebase/ENV.md`](../codebase/ENV.md) (never commit secrets) |
| Remaining backlog | [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md) |
| HubSpot UI extensions (separate from main app) | `codebase/src/` + `hsproject.json` |

Issues/PRs: use the GitHub repo above. There is no second “docs repo.”

---

## Handoff pack index (this folder)

| File | Topic |
|------|--------|
| `01-*` | Pack intro / how to use these files (if present) |
| [`02-local-setup.md`](02-local-setup.md) | Clone, pnpm, Mongo, `pnpm dev` |
| [`03-environment-and-secrets.md`](03-environment-and-secrets.md) | Env groups; rotate leaked PATs |
| [`04-architecture.md`](04-architecture.md) | Browser → Next → Express → Mongo |
| [`05-data-model.md`](05-data-model.md) | Collections and tenancy |
| [`06-api-surface.md`](06-api-surface.md) | `/api/v1` map |
| [`07-auth-members.md`](07-auth-members.md) | JWT, Google, invites, roles |
| [`08-web-ui.md`](08-web-ui.md) | App Router pages and deal tabs |
| [`09-crm-integrations.md`](09-crm-integrations.md) | HubSpot / SF / calendar / demos |
| [`10-agents-approvals.md`](10-agents-approvals.md) | Templates, runs, approval types |
| [`11-ai-features.md`](11-ai-features.md) | MEDDPICC, scoring, Ask, Gong |
| [`12-what-exists-today.md`](12-what-exists-today.md) | Honest inventory |
| [`13-what-to-build-next.md`](13-what-to-build-next.md) | Wave E/F backlog |
| [`14-testing-and-quality.md`](14-testing-and-quality.md) | typecheck, smoke, Playwright |
| [`15-known-pitfalls.md`](15-known-pitfalls.md) | Review findings |
| [`16-first-week-playbook.md`](16-first-week-playbook.md) | Days 1–4 |
| **This file** | Glossary + pointers |

---

## Glossary

### Workspace

Tenant. Almost every document has `workspaceId`. The signed-in user belongs to a workspace; APIs must not return another tenant’s deals. Skipping `workspaceId` on a query is a security bug.

### Deal

Canonical opportunity in **our** MongoDB (`Deal` model): title, amount, stage, owner, sentiment, fit, `isHot`, plan milestones, etc. May also have `crmExternalId` / `crmProvider` when mirrored from HubSpot or Salesforce. Soft-deleted via `deletedAt`. Pipeline board is deals grouped by `PipelineStage`.

### Company / Account

Customer account (`Company`). UI route `/accounts`. Deals belong to a company.

### Satellite (deal satellite tabs)

Child records and UI tabs **on a deal** that are not the deal document itself: notes, participants, product requests, team requests, tasks, projects, events, files, activity, plan, insights. Code: `apps/web/components/deals/deal-tabs.ts` and `apps/web/components/deals/tabs/`. Wave A (10.1) was making these full LCUD (list/create/update/delete), including PATCH/DELETE on the API.

“Satellite” is WBS jargon — you will not always see that word in the UI. The UI just says Notes, Projects, and so on.

### MEDDPICC

Enterprise qualification framework (eight letters: Metrics, Economic buyer, Decision criteria, Decision process, Paper process, Identify pain, Champion, Competition). Stored on `DealMeddpicc` (letters, citations, `inputHash`). UI + SSE refresh under the deal insights / MEDDPICC surfaces. Citations point at **Artifacts** (and chunks), not at `DealEvent` rows. Completeness can appear as `Deal.meddpiccCompleteness`.

### Artifact

Ingested **content** used for AI: call transcript, email, Slack/Teams/GChat thread, document, CRM note. Fields include `rawText`, `contentHash`, `source` + `sourceId`, optional `dealId`. Chunks + embeddings live on `ArtifactChunk` for RAG (deal Ask, MEDDPICC citations). Gong ingest creates artifacts; Slack ingest (Wave E) should too.

### DealEvent

A **calendar-shaped** row: title, `startAt` / `endAt`, type `meeting` | `call`, `source`, optional `externalId` (Google Calendar). This is **not** a transcript. Calls list historically mixed artifacts and events; opening a call that is only a `DealEvent` 404’d until the fallback in 10.1.7. If you need text for AI, you want an Artifact.

### DealEvent vs Artifact (short)

| | **DealEvent** | **Artifact** |
|--|----------------|--------------|
| Question it answers | When is the meeting/call? | What was said / written? |
| Typical source | Google Calendar, CRM activity | Gong, email, chat, notes |
| Used for MEDDPICC / RAG | No (not text) | Yes |
| Calls UI | Can appear as a list row | Call-type artifacts too |

### ExternalRecord

Join table between **our** id and **their** CRM id: `providerKey`, `entityType` (`deal` \| `company` \| `contact` \| `user`), `externalId`, `internalId`, `lastSyncedAt`. Full sync must write these or HubSpot incremental webhooks cannot map updates. Unique on workspace + provider + entity + external id.

### IntegrationConnection

OAuth (or private app) credentials for HubSpot, Salesforce, Slack, etc., stored encrypted with `TOKEN_ENCRYPTION_KEY`. Workspace may set `primaryCrmConnectionId` so write-back knows which CRM is source of truth.

### Write-back

Push **our** deal field/stage changes **out** to HubSpot (and Salesforce opportunities) after a local update and/or after an **Approval**. Implementation: `apps/api/src/lib/hubspot/crm-field-write-back.ts`, Salesforce analogue, `approvals/write-back.ts` + `decide.ts`. Opposite direction is **sync** (CRM → us). Split-brain = local deal changed but CRM not updated (or the reverse).

### Agent

Saved automation: template slug or custom wizard, `triggerConfig` (manual / cron / event such as `activity.ingested`). Listed at `/agents`. Delete is often a **soft disable**.

### AgentRun

One execution of an agent (`queued` → `running` → `completed` / `failed` / `awaiting_approval` / `skipped`). Credits, errors, optional `dealId`. Home **focus deals** are typically derived from the latest **deal-focus** run, not from a separate ranking table.

### Approval

Human-in-the-loop ticket created when an agent (or hygiene flow) wants an external side effect: CRM field update, email, Slack, task batch, Jira, `post_call_bundle`. UI `/approvals`. `decide` applies `proposedChange` locally then write-back. Status: pending / approved / rejected / expired / conflict.

### Focus deals

Home-feed ranking of “what to work today.” Product copy and `GET /focus` should reflect the last **deal-focus** agent output (rules + LLM “why now”). Empty home often means the agent has not run, not that the pipeline is empty.

### Pipeline stage

Workspace (or default) stage documents. Kanban columns. CRM stage **mappings** translate HubSpot/SF stages into these ids on sync.

### Note / Task / DealBlocker / Participant / Product request / Team request / Deal project

Satellite collections on a deal. Blockers can be AI-suggested (`POST` suggest-blocker). Product/team requests also have hub pages `/requests` and `/projects`.

### Gong / ingest / `activity.ingested`

Call intelligence ingest produces Artifacts (and chunks). Domain event `activity.ingested` can trigger post-call agents. Chat ingest (Slack) is the Wave E analogue for threads.

### SSE (MEDDPICC)

Server-sent events from the API (`NEXT_PUBLIC_SSE_URL`, usually `:4000`) so the UI can stream a MEDDPICC refresh instead of a single blocking JSON blob.

### MCP

Settings `/settings/mcp` — registry / handshake for tool servers. Completeness is still a Wave E/F-ish gap (10.4.3); do not assume invoke-from-executor is done.

### Buyer portal / LangGraph / Pipedrive / Zoho

**Promised or demo** relative to HubSpot/Salesforce. Marketing may list four CRMs; live adapters are HubSpot + Salesforce. Buyer portal and LangGraph are 10.8 — do not start until A–C are solid.

---

## People and how to reach them

This pack does not invent a paging roster. Use:

1. **GitHub** — [LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm) issues and PRs for durable questions and review.
2. **The person who handed you this folder** — for secrets (HubSpot sandbox, Gemini, Google OAuth) that must never go in git or in this markdown.
3. **Code + docs** — `codebase/docs/README.md` reading paths (product vs backend vs frontend) before a general “how does X work?” ping.

When you ask a question, include route + model name + expected vs actual ([`16-first-week-playbook.md`](16-first-week-playbook.md) § How to ask questions). Do not paste credentials; if a PAT ever landed in chat history, rotate it ([`03-environment-and-secrets.md`](03-environment-and-secrets.md), [`15-known-pitfalls.md`](15-known-pitfalls.md)).

---

## One-page cheat sheet

| You hear | Think |
|----------|--------|
| Deal | Our Mongo opportunity |
| Satellite | Deal tab child CRUD |
| MEDDPICC | 8-letter qualification + citations |
| Artifact | Text for AI |
| DealEvent | Calendar row |
| ExternalRecord | CRM id map |
| Write-back | Us → CRM after approve/PATCH |
| AgentRun | One job execution |
| Approval | Human gate |
| Focus deals | Home ranking from deal-focus agent |
| Wave E | Slack ingest + insights NL (10.5–10.6) |
| Docs index | `codebase/docs/README.md` |
| This pack | `handoff-for-friend/` onboarding overlay |
