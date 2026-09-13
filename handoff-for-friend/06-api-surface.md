# 06 — API surface (`/api/v1`)

**Who this is for:** anyone adding or calling HTTP endpoints. **Source of truth is Express**, not `codebase/docs/api-routes.md`. That spec is a useful catalog of intent; several paths, methods, and counts drifted. This file is the **mounted** surface as of 2026-09-13.

| Fact | Value |
|------|--------|
| Process | `apps/api` via `createApp()` in `apps/api/src/create-app.ts` |
| Host | `http://localhost:4000` (`NEXT_PUBLIC_API_URL`) |
| Prefix | `/api/v1` except **`GET /health`** |
| Routers | `apps/api/src/routers.ts` re-exports `modules/*/index.ts` |
| Auth on most product routes | `jwtMiddleware` + `requireWorkspace` |
| CORS | `WEB_URL` (default `http://localhost:3000`), `credentials: true` |

**How to read a route.** Example: `dealsRouter.patch('/:dealId/notes/:noteId', …)` mounted at `/deals` on the protected API → **`PATCH /api/v1/deals/:dealId/notes/:noteId`**.

---

## 0. How the app is wired (order matters)

`createApp()` does **not** match the old `server.ts` sketch in `docs/api-routes.md`. Actual order:

1. Helmet, CORS, cookie-parser, correlation id.
2. **Raw-body webhooks** (must run *before* `express.json()`):
   - `POST /api/v1/webhooks/hubspot`
   - `POST /api/v1/webhooks/gong/:connectionId`
   - `POST /api/v1/agents/:agentId/webhook` (HMAC, **no JWT**)
   - `POST /api/v1/webhooks/slack/interactions`
   - `POST /api/v1/webhooks/slack/commands`
3. `app.use('/api/v1/webhooks', webhooksRouter)` — CRM HMAC + a `_stub` listing.
4. `express.json()`.
5. `GET /health` — **live** liveness (Mongo `readyState`), not the unused `healthRouter` `_stub`.
6. Public auth: `app.use('/api/v1/auth', authPublicRouter)`.
7. JWT (no workspace required): `app.use('/api/v1', authProtectedRouter)` — `/me`, create-workspace, members.
8. Public marketing + OAuth + internal service:
   - `/api/v1/leads`
   - `/api/v1/oauth`
   - `/api/v1/internal` (`INTERNAL_SERVICE_TOKEN` / `x-internal-token`)
9. **Protected product API:** JWT + `requireWorkspace` for everything else under `/api/v1`.

`modules/health/index.ts` still has `GET /_stub` (`status: scaffold`) but **`healthRouter` is never mounted**. Ignore it.

---

## 0.1 Auth classes (this file vs file 07)

| Class | Middleware | Typical routes |
|-------|------------|----------------|
| Public | none | `/health`, `/api/v1/auth/*` (except protected siblings), `/api/v1/leads`, `/api/v1/oauth/callback/*`, inbound webhooks |
| JWT, workspace optional | `jwtMiddleware` | `GET /me`, `POST /onboarding/workspace` |
| JWT + workspace | `jwtMiddleware` + `requireWorkspace` | Almost all product modules |
| JWT + workspace + **admin** | `requireAdmin` | Workspace settings, invites, member PATCH/DELETE, onboarding complete/step, pipeline stage PATCH |
| HMAC / raw body | signature verify | HubSpot, Gong, Slack, CRM connection webhook, agent webhook |
| Service token | `internalServiceMiddleware` | `POST /api/v1/internal/agent/execute` |

**RBAC reality:** `requireAdmin` is rare. **Any workspace member** can hit deals, approvals, agents, CRM connect, AI, home, insights, etc. Roles `admin` / `manager` / `member` exist on the user document; they are **not** a matrix on most routes. Details in `07-auth-members.md`.

---

## 0.2 Stub vs live (how this pack uses the words)

| Label | Meaning in this file |
|-------|----------------------|
| **Live** | Handler talks to Mongo (and often real adapters). Production-shaped. |
| **Live + heuristic / Gemini** | Same HTTP contract; quality depends on `GEMINI_API_KEY`. |
| **Demo mode** | CRM connect without OAuth/token: sample import, `settings.mode: 'demo'`. |
| **Stub** | Explicit placeholder (`stub: true`, unused `_stub` router, or static catalog not persisted). |
| **Doc-only** | Listed in `docs/api-routes.md` but **not mounted**. |

---

## 1. Health (M01)

| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| `GET` | `/health` | Public | `{ status: "ok", service: "api", mongo: "connected"\|"connecting"\|"disconnected"\|"error" }` | **Live** |

---

## 2. Auth & me (M02) — public + JWT

Mounted from `modules/auth/index.ts`. Full flow in `07-auth-members.md`.

### Public (`/api/v1/auth`)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/auth/google` | Redirect to Google; optional `?invite=` → invite cookie | **Live** |
| `GET` | `/api/v1/auth/google/callback` | Google returns here; create/update user; accept invite; redirect to web with exchange `code` | **Live** |
| `POST` | `/api/v1/auth/exchange` | Body `{ code }` → access JWT + set refresh cookie | **Live** |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh cookie → new access JWT | **Live** |
| `POST` | `/api/v1/auth/logout` | Revoke refresh + clear cookie | **Live** |
| `POST` | `/api/v1/auth/dev-login` | Body `{ email, displayName }` — **404 in production** | **Live** (dev only) |

### JWT (`authProtectedRouter` at `/api/v1`)

| Method | Path | Extra | Purpose | Status |
|--------|------|-------|---------|--------|
| `GET` | `/api/v1/me` | — | `{ user, workspace }` | **Live** |
| `POST` | `/api/v1/onboarding/workspace` | no workspace yet | Create tenant, seed data, user becomes admin | **Live** |
| `PATCH` | `/api/v1/workspace` | admin | Name / timezone | **Live** |
| `GET` | `/api/v1/workspace/members` | any member | Active members | **Live** |
| `PATCH` | `/api/v1/workspace/members/:userId` | admin | Change role; last-admin guard | **Live** |
| `DELETE` | `/api/v1/workspace/members/:userId` | admin | Soft-remove; last-admin + no self | **Live** |
| `GET` | `/api/v1/workspace/invites` | admin | Pending invites + `inviteUrl` | **Live** |
| `POST` | `/api/v1/workspace/members/invite` | admin | `{ email, role }` | **Live** |

---

## 3. Onboarding (M03)

`protectedApi.use('/onboarding', onboardingRouter)` — JWT + workspace.

| Method | Path | Extra | Purpose | Status |
|--------|------|-------|---------|--------|
| `GET` | `/api/v1/onboarding/status` | any member | Wizard progress | **Live** |
| `PATCH` | `/api/v1/onboarding/step` | admin | Advance `{ step }` | **Live** |
| `POST` | `/api/v1/onboarding/complete` | admin | Mark wizard done (expects CRM connected/synced per handler rules) | **Live** |

---

## 4. Deals (M04) — board, CRUD, satellites

`protectedApi.use('/deals', dealsRouter)` — `modules/deals/index.ts`. **Any member.** Workspace scoped; missing/cross-tenant deal → 404.

### 4.1 Board and list

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/deals/board` | Kanban: stages + deals. Query: `owner_id`, `stage_id`, `sentiment`, `is_hot=true` | **Live** |
| `GET` | `/api/v1/deals/search` | Full-text / regex fallback `?q=` | **Live** |
| `GET` | `/api/v1/deals/metrics` | Pipeline totals | **Live** |
| `GET` | `/api/v1/deals` | Flat list (pagination/filters in handler) | **Live** |

### 4.2 Deal CRUD

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/deals/:dealId` | Single deal | **Live** |
| `POST` | `/api/v1/deals` | Create | **Live** |
| `PATCH` | `/api/v1/deals/:dealId` | Field update; may enqueue HubSpot/SF write-back | **Live** |
| `DELETE` | `/api/v1/deals/:dealId` | Soft delete (`deletedAt`) | **Live** |
| `PATCH` | `/api/v1/deals/:dealId/stage` | Kanban DnD `{ stageId, position }` | **Live** |
| `POST` | `/api/v1/deals/:dealId/close` | `{ outcome: won\|lost, lostReason? }` | **Live** |
| `POST` | `/api/v1/deals/:dealId/ask` | RAG/Ask over notes; Gemini or heuristic fallback | **Live + heuristic** |

### 4.3 Detail tabs (read)

| Method | Path | Tab / purpose | Status |
|--------|------|---------------|--------|
| `GET` | `/api/v1/deals/:dealId/overview-header` | KPIs for overview | **Live** |
| `GET` | `/api/v1/deals/:dealId/plan` | Plan tab | **Live** |
| `GET` | `/api/v1/deals/:dealId/activity` | Activity feed | **Live** |
| `GET` | `/api/v1/deals/:dealId/events` | Calendar-ish `DealEvent` rows for this deal | **Live** |

Doc also listed `GET /deals/:dealId/insights` and `GET/POST /deals/:dealId/integrations`. **Those nested routes are not on `dealsRouter`.** Insights live under `/api/v1/insights`. There is no deal-scoped integrations tab API.

### 4.4 Deal satellites — PATCH and DELETE (important)

Older docs used **top-level** `PATCH /api/v1/tasks/:taskId` and `PATCH /api/v1/blockers/:blockerId`. **That is wrong.** Nested IDs are under the deal:

| Resource | GET | POST | PATCH | DELETE |
|----------|-----|------|-------|--------|
| **Participants** | `/:dealId/participants` | same | `/:dealId/participants/:participantId` | `/:dealId/participants/:participantId` |
| **Product requests** | `/:dealId/product-requests` | same | `/:dealId/product-requests/:requestId` | `/:dealId/product-requests/:requestId` |
| **Team requests** | `/:dealId/team-requests` | same | `/:dealId/team-requests/:requestId` | `/:dealId/team-requests/:requestId` |
| **Projects** | `/:dealId/projects` | same | `/:dealId/projects/:projectId` | `/:dealId/projects/:projectId` |
| **Files** | `/:dealId/files` | same | — | `/:dealId/files/:fileId` |
| **Notes** | `/:dealId/notes` | same | `/:dealId/notes/:noteId` | `/:dealId/notes/:noteId` |
| **Tasks** | `/:dealId/tasks` | same | `/:dealId/tasks/:taskId` | `/:dealId/tasks/:taskId` |
| **Blockers** | `/:dealId/blockers` | same | `/:dealId/blockers/:blockerId` (resolve, not a free-form edit) | — (no DELETE route) |

All of these are **live** Mongo CRUD (files are metadata, not a blob store). Prefix every path with `/api/v1/deals`.

**Why PATCH/DELETE on satellites matter:** the web deal tabs edit rows in place. If you only implement GET/POST you will break the UI. Blocker PATCH is **resolve** (`ResolveBlockerSchema`), not arbitrary field patch.

---

## 5. MEDDPICC (M05)

`meddpiccRouter` is mounted **on the protected API root** (not under `/deals` in `create-app.ts`, but paths still start with `/deals/...`).

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/deals/:dealId/meddpicc` | Cached summary + input hash | **Live** |
| `POST` | `/api/v1/deals/:dealId/meddpicc/refresh` | Start regen / job + stream URL | **Live + Gemini or heuristic** |
| `GET` | `/api/v1/deals/:dealId/meddpicc/stream` | SSE | **Live** |
| `PATCH` | `/api/v1/deals/:dealId/meddpicc` | Human edits + locked fields | **Live** |
| `GET` | `/api/v1/deals/:dealId/meddpicc/citations/:citationId` | Citation detail | **Live** |

Without `GEMINI_API_KEY`, refresh still runs; synthesis is weaker. See file 11.

---

## 6. AI scoring (M06) — suggest-blocker

`protectedApi.use('/ai', aiRouter)` — **`modules/ai/index.ts`**. Paths do **not** include `/deals/:dealId`. The deal id is **JSON body** `{ dealId }`.

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `POST` | `/api/v1/ai/sentiment` | Score + persist `deal.sentiment` | **Live** (`source`: `gemini` \| `heuristic`) |
| `POST` | `/api/v1/ai/fit-score` | Score + persist `technicalFitScore` | **Live** (same) |
| `POST` | `/api/v1/ai/suggest-blocker` | Suggest a **title** (does **not** insert a `DealBlocker`) | **Live** (same) |

**`POST /api/v1/ai/suggest-blocker` contract** (`postSuggestBlocker`):

- Body: `{ dealId: string, context?: string }` (`context` is extra text for the model).
- Loads deal + company + last notes + open blockers.
- Returns `{ dealId, title, reasoning, source }` where `source` is `gemini` or `heuristic`.
- **Does not write a blocker.** UI must `POST /api/v1/deals/:dealId/blockers` if the user accepts the suggestion.

Doc paths like `POST /api/v1/ai/deals/:dealId/blockers/suggest` and `POST /api/v1/ai/pipeline/insights` are **doc-only**.

---

## 7. Home and focus (M07)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/home` | BFF: `focusDeals`, `atRiskDeals`, `approvalCount`, `pipelineSnapshot`, `recentActivity` | **Live** |
| `GET` | `/api/v1/focus` | Slim deal list for `/focus` and chat parity | **Live** |

**Focus source (not a stub):**

1. Look for an active agent `templateSlug: 'deal-focus'` owned by the current user.
2. Take latest `AgentRun` with `completed` or `awaiting_approval`.
3. If `scope.output.focusDeals[].dealId` is non-empty, return those deals in that order.
4. **Fallback (heuristic):** home uses hot / high `riskScore` / owned-by-me, cap 5. Focus uses `isHot` cap 20.

`approvalCount` is **pending approvals assigned to the current user**, not the whole workspace.

---

## 8. Approvals (M08) — HITL queue

`protectedApi.use('/approvals', approvalsRouter)` — **any member**.

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/approvals` | List (limit 50). Query: `status`, `dealId`, `assignee=me` | **Live** |
| `GET` | `/api/v1/approvals/count` | Pending count for **current user** | **Live** |
| `GET` | `/api/v1/approvals/:approvalId` | Detail + `contentFull` + `proposedChange` + `agentName` | **Live** |
| `POST` | `/api/v1/approvals/:approvalId/approve` | Apply `proposedChange`, optional HubSpot/SF push | **Live** |
| `POST` | `/api/v1/approvals/:approvalId/reject` | `{ note }` → rejected | **Live** |

**What is live vs what the spec promised:**

- Approve/reject go through `modules/approvals/decide.ts` → `parseProposedChange` / `applyProposedChange`. That **does** create notes/tasks and can write CRM fields. **Live.**
- List is **workspace-wide**, not “manager sees team / member sees own” unless the client passes `assignee=me`. There is **no** `assignee=team` filter.
- Approve does **not** check `assignedTo === current user`. Spec TC “wrong assignee → 403” is **not** enforced.
- Expired-approval 409 is not a dedicated code path in `decide.ts` (invalid status → 409 `INVALID_STATE`).

Slack `/approve` and interactive buttons hit the **same decide helpers**, not a second implementation.

---

## 9. Agents (M09) and agent runs (M10)

### 9.1 Agents

`protectedApi.use('/agents', agentsRouter)` plus `GET /api/v1/agent-templates`.

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/agents/stats` | Dashboard counts | **Live** |
| `GET` | `/api/v1/agents` | List workspace agents | **Live** |
| `POST` | `/api/v1/agents` | Create | **Live** |
| `GET` | `/api/v1/agents/:agentId` | Detail | **Live** |
| `PATCH` | `/api/v1/agents/:agentId` | Update | **Live** |
| `DELETE` | `/api/v1/agents/:agentId` | Archive / deactivate | **Live** |
| `POST` | `/api/v1/agents/:agentId/run` | Enqueue `{ scope: { dealId? } }` | **Live** (async job) |
| `POST` | `/api/v1/agents/from-template/:slug` | Instantiate catalog template | **Live** |
| `POST` | `/api/v1/agents/draft-from-nl` | NL builder; Gemini or keyword fallback | **Live + fallback** |
| `GET` | `/api/v1/agents/templates` | Same catalog as below (also on this router) | **Live** (in-memory catalog) |
| `GET` | `/api/v1/agent-templates` | Template library | **Live** (same `TEMPLATES` array) |
| `POST` | `/api/v1/agents/:agentId/webhook` | External trigger, HMAC, **no JWT** | **Live** |

Templates are a **code catalog** in `agents/handlers.ts` (not a Mongo collection). Instantiated agents **are** Mongo documents. Executors run in-process via the job queue — **live**, with Gemini optional per template.

Doc path `POST /api/v1/agents/:agentId/webhook/:token` is close but **wrong**: there is **no `:token` path segment**; the secret is HMAC in headers/body verification.

**Not admin-gated.** Spec said “agent config: admin write / manager read.” Code: any member can create, patch, delete, run.

### 9.2 Agent runs

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/agent-runs` | History; query `agentId`, `status`, `dealId`, `limit` | **Live** |
| `GET` | `/api/v1/agent-runs/:runId` | Detail + steps | **Live** |
| `POST` | `/api/v1/agent-runs/:runId/cancel` | Cancel running | **Live** |

---

## 10. CRM integrations (M11)

`protectedApi.use('/integrations/crm', integrationsCrmRouter)` — **any member** (spec said admin-only connect — **not enforced**).

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/integrations/crm/providers` | Catalog: hubspot, salesforce, zoho, pipedrive | **Live** catalog (all advertised `mode: 'demo'` in JSON; connect may still go live) |
| `GET` | `/api/v1/integrations/crm/status` | Current connected provider + `mode` | **Live** |
| `GET` | `/api/v1/integrations/crm/salesforce/status` | SF-specific + `oauthConfigured` | **Live** |
| `POST` | `/api/v1/integrations/crm/connect/:provider` | Start OAuth **or** demo connect | **Live / demo** |
| `DELETE` | `/api/v1/integrations/crm/connect/:provider` | Disconnect | **Live** |
| `GET` | `/api/v1/integrations/crm/:provider/pipelines` | External pipelines | **Live or demo discovery** |
| `GET` | `/api/v1/integrations/crm/:provider/stages` | External stages | **Live or demo** |
| `GET` | `/api/v1/integrations/crm/:provider/owners` | CRM users | **Live or demo** |
| `GET` | `/api/v1/integrations/crm/mappings/stages` | Saved mappings | **Live** |
| `PATCH` | `/api/v1/integrations/crm/mappings/stages` | Save mappings | **Live** (doc said `PUT`) |
| `GET` | `/api/v1/integrations/crm/mappings/users` | User mappings | **Live** |
| `PATCH` | `/api/v1/integrations/crm/mappings/users` | Save | **Live** (doc said `PUT`) |
| `POST` | `/api/v1/integrations/crm/sync` | Backfill / demo import | **Live / demo** |
| `GET` | `/api/v1/integrations/crm/sync/status` | Backfill progress | **Live** |
| `GET` | `/api/v1/integrations/crm/sync-status` | Incremental queue stats | **Live** |

**Live vs demo on connect:**

- HubSpot with OAuth env → `mode: 'oauth'` + `authUrl`.
- Salesforce with OAuth env → same.
- Else: if HubSpot private token / stored access token / Zoho client env, `mode: 'live'` without popup; **otherwise `mode: 'demo'`** and sync imports sample records.

Treat **HubSpot + Salesforce** as the real write-back pair. Pipedrive/Zoho stay demo unless you implement them (file 09).

Doc paths like `POST /integrations/crm/:provider/connect` (provider in the middle) and `DELETE /integrations/crm/:provider` **do not match**. Use `.../connect/:provider`.

`GET .../:provider/health` from the spec is **doc-only**.

---

## 11. Chat integrations (M12)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/integrations/chat/providers` | Slack / Teams / Google Chat | **Live** (status from connections + OAuth configured flags) |
| `POST` | `/api/v1/integrations/chat/slack/connect` | OAuth start | **Live if Slack env set**, else error message |
| `GET` | `/api/v1/integrations/chat/slack/status` | | **Live** |
| `GET` | `/api/v1/integrations/chat/slack/channels` | | **Live** if connected |
| `DELETE` | `/api/v1/integrations/chat/slack` | Disconnect | **Live** |
| same pattern | `/teams`, `/google_chat` | connect / status / channels / DELETE | **Live if those OAuth envs exist** |

**Doc-only (not mounted):**

- `GET/PUT /api/v1/settings/chat/preferences`
- `POST /api/v1/settings/chat/link-identity`

`/api/v1/settings` today is **MCP servers only** (section 19).

---

## 12. Other platform integrations (M13)

`protectedApi.use('/integrations', integrationsRouter)` — keep this **after** `/integrations/crm` and `/integrations/chat` so those prefixes win.

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/integrations/providers` | Gong + Google Calendar grid | **Live** |
| `POST` | `/api/v1/integrations/gong/connect` | Gong OAuth | **Live if Gong env** |
| `GET` | `/api/v1/integrations/gong/status` | | **Live** |
| `DELETE` | `/api/v1/integrations/gong` | | **Live** |
| `POST` | `/api/v1/integrations/calendar/google_calendar/connect` | Calendar OAuth | **Live if Google calendar env** |
| `GET` | `/api/v1/integrations/calendar/google_calendar/status` | | **Live** |
| `POST` | `/api/v1/integrations/calendar/google_calendar/sync` | Pull events → `DealEvent` | **Live** |
| `DELETE` | `/api/v1/integrations/calendar/google_calendar` | | **Live** |

Generic `POST /api/v1/integrations/:provider/connect` from the spec is **not** the actual path (too easy to collide with `crm` / `chat`).

Jira webhook is in the spec; **no Jira router** is mounted.

---

## 13. OAuth callbacks (M14) — public

`app.use('/api/v1/oauth', oauthRouter)` — **no JWT**. Browser redirect after provider consent.

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/oauth/callback/crm/:provider` | HubSpot / Salesforce (and demo providers if used) | **Live** |
| `GET` | `/api/v1/oauth/callback/chat/slack` | Slack | **Live** |
| `GET` | `/api/v1/oauth/callback/chat/teams` | Teams | **Live** (needs env) |
| `GET` | `/api/v1/oauth/callback/chat/google_chat` | Google Chat | **Live** (needs env) |
| `GET` | `/api/v1/oauth/callback/gong` | Gong | **Live** |
| `GET` | `/api/v1/oauth/callback/calendar/google_calendar` | Calendar | **Live** |

Spec `GET /api/v1/oauth/callback/google` is **doc-only**; calendar uses the path above. **Google login** for *users* is `/api/v1/auth/google`, not this router.

---

## 14. Webhooks (M15)

| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| `POST` | `/api/v1/webhooks/hubspot` | HubSpot v3 signature, raw JSON | Deal/company events → incremental queue | **Live** |
| `POST` | `/api/v1/webhooks/crm/:connectionId` | `X-CRM-Signature` HMAC | Generic CRM | **Live** |
| `POST` | `/api/v1/webhooks/gong/:connectionId` | Gong HMAC | Ingest call | **Live** |
| `POST` | `/api/v1/webhooks/slack/interactions` | Slack signature | Buttons (approve, etc.) | **Live** |
| `POST` | `/api/v1/webhooks/slack/commands` | Slack signature | `/focus`, `/deal`, `/approve` | **Live** |
| `GET` | `/api/v1/webhooks/_stub` | none | JSON listing of the above | **Stub listing only** |

Spec `POST /webhooks/chat/:connectionId` and `POST /webhooks/jira/:connectionId` are **not** the Slack paths (Slack is `/slack/commands` and `/slack/interactions`).

---

## 15. Companies (M16)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/companies` | List | **Live** |
| `GET` | `/api/v1/companies/:companyId` | Detail | **Live** |
| `POST` | `/api/v1/companies` | Create | **Live** |
| `PATCH` | `/api/v1/companies/:companyId` | Update | **Live** (extra vs spec) |
| `DELETE` | `/api/v1/companies/:companyId` | Delete/soft | **Live** (extra vs spec) |

---

## 16. Pipeline (M17)

| Method | Path | Extra | Purpose | Status |
|--------|------|-------|---------|--------|
| `GET` | `/api/v1/pipeline/stages` | any member | Kanban columns | **Live** (Mongo) |
| `PATCH` | `/api/v1/pipeline/stages/:stageId` | admin | Rename / color / reorder | **Live** |
| `GET` | `/api/v1/pipeline/sales-processes` | any member | Process + milestones | **Static catalog** (`DEFAULT_SALES_PROCESSES`) — not per-workspace Mongo |

Spec `PATCH /api/v1/deals/:dealId/milestones/:milestoneId` is **doc-only**. Spec `GET /api/v1/sales-processes` is wrong; it is under `/pipeline`.

---

## 17. Insights (M18)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/insights/summary` | Org cards | **Live** (Mongo aggregates) |
| `GET` | `/api/v1/insights/performance` | Team performance | **Live** |
| `GET` | `/api/v1/insights/activity` | Activity analytics | **Live** |
| `GET` | `/api/v1/insights/users` | Users table | **Live** |
| `GET` | `/api/v1/insights/funnel` | Funnel | **Live** |
| `GET` | `/api/v1/insights/loss` | Loss insights | **Live** (`stub: false` on related payload) |
| `GET` | `/api/v1/insights/loss/export` | Export | **Live** |
| `GET` | `/api/v1/insights/forecast` | Forecast | **Live** (from pipeline) |
| `POST` | `/api/v1/insights/sql` | “SQL explorer” | **Stub** — validates a SELECT then returns canned workspace metrics `{ stub: true, message: "SQL explorer is coming soon…" }` |

Spec routes `activity/over-time`, `activity/breakdown`, `deal-breakdown`, `users/:userId`, `export` CSV do not match these paths. **Insights are not admin-only.**

---

## 18. Calls — Artifact first, **DealEvent fallback**

`protectedApi.use('/calls', callsRouter)` — **not in the old module map**. Used by the calls UI.

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/calls` | Paginated list | **Live** |
| `GET` | `/api/v1/calls/:id` | Detail + transcript excerpt | **Live** |
| `PATCH` | `/api/v1/calls/:id` | Relink `dealId` | **Live** |

**Fallback (read this before you “fix empty calls”):**

1. `GET /calls` queries `Artifact` with `type: 'call'`. If **any** artifacts exist, list those and `source: 'db'`.
2. If **zero** artifacts, it queries `DealEvent` with `type: 'call'` (calendar/Gong-shaped rows). Response `source` is `'db'` if events exist, else `'demo'` with an empty list.
3. `GET /calls/:id` tries Artifact by id, then `DealEvent` with `type: 'call'`. Event detail has **empty transcript**.
4. `PATCH` updates Artifact `dealId` (null allowed = unlink). If the id is a DealEvent, unlink (`dealId: null`) is **400** (“must stay linked to a deal”); you can only retarget another deal.

Do not confuse:

- **`Artifact` type `call`** — ingested transcript (Gong webhook path).
- **`DealEvent` type `call`** — calendar/activity row (`GET /deals/:dealId/events` lists all event types for a deal; calls list only `type: 'call'`).

---

## 19. Settings (MCP)

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| `GET` | `/api/v1/settings/mcp` | List MCP servers on `workspace.settings` | **Live** |
| `POST` | `/api/v1/settings/mcp` | Add (capped) | **Live** |
| `DELETE` | `/api/v1/settings/mcp/:id` | Remove | **Live** |

Not chat preferences (those are missing).

---

## 20. Marketing (M19) and internal (M20)

| Method | Path | Auth | Purpose | Status |
|--------|------|------|---------|--------|
| `POST` | `/api/v1/leads` | Public | Pricing wizard `{ email, company, … }` | **Live** |
| `POST` | `/api/v1/internal/agent/execute` | Service token | Worker callback | **Live** |

---

## 21. Doc vs code cheat sheet

| Docs (`api-routes.md`) | Code |
|------------------------|------|
| `POST /ai/deals/:id/blockers/suggest` | `POST /ai/suggest-blocker` + `{ dealId }` |
| `PUT` CRM mappings | `PATCH` |
| `POST /integrations/crm/:provider/connect` | `POST /integrations/crm/connect/:provider` |
| Top-level `/tasks/:id`, `/blockers/:id` | Nested under `/deals/:dealId/...` |
| Chat preferences under `/settings/chat` | **Missing**; `/settings/mcp` instead |
| `GET /health` via health module stub | Implemented inline in `createApp` |
| ~108 endpoints / 20 modules | Extra: **calls**, **settings/mcp**, extra company verbs, extra CRM status routes; several spec routes never shipped |
| Insights SQL as admin SQL | Stub metrics |
| RBAC matrix | Almost unused except `requireAdmin` on a handful of routes |

---

## 22. Where to look in code

| Concern | File |
|---------|------|
| Mount order | `apps/api/src/create-app.ts` |
| Router barrel | `apps/api/src/routers.ts` |
| Per-module paths | `apps/api/src/modules/<name>/index.ts` |
| JWT / admin | `apps/api/src/lib/auth/jwt.ts` |
| Aspirational catalog | `codebase/docs/api-routes.md` (verify before trusting) |

Next: **`07-auth-members.md`** for Google, cookies, invites, and why a `member` can still connect CRM.
