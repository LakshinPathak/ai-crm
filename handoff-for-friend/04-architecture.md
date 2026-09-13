# Architecture — request flow, auth, jobs, agents, events

**Repo:** `codebase/` (pnpm + Turborepo). **Source of truth:** code under `apps/` and `packages/`, plus `docs/architecture.md` (v4.0). Where the doc still mentions Clerk, the **running app uses Google OAuth + a custom JWT**.

---

## 1. What this system is

A **modular monolith**: Next.js UI (`apps/web`, port **3000**) talks only to an Express API (`apps/api`, port **4000**, prefix `/api/v1`). The API owns MongoDB via Mongoose (`packages/db`). LangGraph-style **agent templates** run **in-process** on a Mongo-backed job queue — not a separate agent cluster.

| Layer | Path | Port / role |
|-------|------|-------------|
| Browser | `apps/web` | `:3000` — App Router, shadcn, TanStack Query |
| API | `apps/api` | `:4000` — Express, all `/api/v1/*` |
| MongoDB | `MONGODB_URI` | Data + `backgroundjobs` queue |
| Packages | `packages/db`, `agents`, `events`, `integrations`, `shared` | Shared libraries |

**Local start:** `cd codebase && pnpm dev` (API + web). Dedicated worker optional: `pnpm --filter @ai-crm/api dev:worker`.

---

## 2. End-to-end request flow

```
Browser (:3000)
  → fetch NEXT_PUBLIC_API_URL (default http://localhost:4000)
  → GET/POST/PATCH/DELETE /api/v1/...
  → Express createApp()
  → jwtMiddleware + requireWorkspace (protected routes)
  → req.tenant.workspaceId / userId / role
  → Mongoose query always scoped by workspaceId
  → MongoDB
```

### 2.1 Frontend

- **No Prisma / Mongoose in the web app.** All persistence goes through the API.
- `apps/web/lib/api-client.ts` prefixes paths with `/api/v1` and sends `Authorization: Bearer <accessToken>` plus `credentials: 'include'` (refresh cookie).
- On **401**, the client calls `POST /api/v1/auth/refresh` once, then retries.

| Env | Meaning |
|-----|---------|
| `NEXT_PUBLIC_API_URL` | API origin (default `http://localhost:4000`) |
| `NEXT_PUBLIC_SSE_URL` | Documented for SSE; MEDDPICC stream currently uses `NEXT_PUBLIC_API_URL` |
| `WEB_URL` | CORS origin on the API (default `http://localhost:3000`) |

### 2.2 API assembly (`apps/api/src/create-app.ts`)

Order matters:

1. `helmet`, CORS (`WEB_URL`, credentials), `cookie-parser`, correlation IDs.
2. **Raw-body webhooks** (signature verification) **before** `express.json()`:
   - `POST /api/v1/webhooks/hubspot`
   - `POST /api/v1/webhooks/gong/:connectionId`
   - `POST /api/v1/agents/:agentId/webhook`
   - `POST /api/v1/webhooks/slack/interactions` and `.../commands`
3. `POST /api/v1/webhooks/crm/:connectionId` (HMAC, raw JSON).
4. `GET /health` — `{ status, service: 'api', mongo }`.
5. **Public / special routers** (no tenant JWT):
   - `/api/v1/auth` — Google login, exchange, refresh, logout, `dev-login`
   - `/api/v1/leads` — marketing
   - `/api/v1/oauth` — integration OAuth **callbacks**
   - `/api/v1/internal` — service token, not user JWT
6. **Protected router:** `jwtMiddleware` → `requireWorkspace` → domain modules (deals, companies, pipeline, MEDDPICC, agents, integrations, …).

`apps/api/src/server.ts` connects Mongo, **starts background job pollers in the same process**, then listens on `PORT` (default **4000**).

### 2.3 Typical authenticated call

Example: load a deal.

1. Browser has access JWT (memory / storage) and httpOnly refresh cookie.
2. `apiGet('/deals/:id')` → `GET http://localhost:4000/api/v1/deals/:id`.
3. `jwtMiddleware` verifies JWT with `JWT_SECRET`, loads `User` by `sub`, rebuilds `req.auth` from **DB** (role / `workspaceId` can change without waiting for token expiry).
4. If `user.workspaceId` is set, `req.tenant = { userId, workspaceId, role, email }`.
5. `requireWorkspace` returns **403 `WORKSPACE_REQUIRED`** if the user has not created/joined a workspace yet.
6. Handler uses `req.tenant.workspaceId` on every query (e.g. `Deal.findOne({ _id, workspaceId, deletedAt: null })`).

---

## 3. Authentication and tenancy

**Not Clerk in this codebase.** Docs/architecture still describe Clerk; implementation is **Google OAuth** + **HS256 JWT** (`apps/api/src/lib/auth/jwt.ts`) + **refresh sessions** in Mongo.

### 3.1 Login sequence (Google)

```
Browser → GET /api/v1/auth/google
  → Google consent
  → GET /api/v1/auth/google/callback
  → AuthExchangeCode (one-time, ~2 min, JWT stays out of the URL)
  → Redirect to web with ?code=
  → POST /api/v1/auth/exchange
  → AuthSession (hashed refresh token) + httpOnly cookie
  → JSON { accessToken }
```

| Piece | Collection / store | Notes |
|-------|-------------------|--------|
| Access JWT | Client | `sub`, `email`, `role`, optional `workspaceId`; TTL `JWT_ACCESS_EXPIRES_IN` (default **15m**) |
| Refresh | `authsessions` + cookie | SHA-256 of token stored; TTL **30 days**; `POST /api/v1/auth/refresh` |
| Exchange | `authexchangecodes` | One-time after OAuth callback |
| User | `users` | `googleId` unique; `workspaceId` **nullable** until onboarding |

Dev shortcut: `POST /api/v1/auth/dev-login` (development).

### 3.2 JWT payload and tenant context

```ts
type JwtPayload = { sub: string; email: string; role: UserRole; workspaceId?: string };
type TenantContext = { userId: string; workspaceId: string; role: UserRole; email: string };
```

| Role | Typical use |
|------|-------------|
| `admin` | Workspace settings, invites, integrations |
| `manager` | Team deals, approvals |
| `member` | Default after invite |

`requireAdmin` is used on workspace patch, member invite/update/remove.

**Isolation rule:** every tenant document is queried with `{ workspaceId }`. Do not trust client-supplied workspace IDs.

### 3.3 Internal service auth

`POST /api/v1/internal/agent/execute` uses `INTERNAL_SERVICE_TOKEN` (`Authorization: Bearer` or `x-internal-token`). This is for worker/service callbacks, **not** the browser.

---

## 4. OAuth callbacks (integrations)

User JWT is **not** required on `/api/v1/oauth/*`. Flow uses a signed **integration OAuth context cookie** (`ai_crm_oauth_ctx`) that binds `workspaceId`, `userId`, `kind`, and CSRF `state` (`apps/api/src/lib/integrations/oauth-context.ts`).

**Start** (authenticated): CRM / Gong / Calendar / chat handlers issue the cookie and redirect to the provider.

**Callback** (`apps/api/src/modules/oauth/index.ts`):

| Route | Purpose |
|-------|---------|
| `GET /api/v1/oauth/callback/crm/:provider` | HubSpot / Salesforce (etc.) |
| `GET /api/v1/oauth/callback/chat/slack` | Slack |
| `GET /api/v1/oauth/callback/chat/teams` | Teams |
| `GET /api/v1/oauth/callback/chat/google_chat` | Google Chat |
| `GET /api/v1/oauth/callback/gong` | Gong |
| `GET /api/v1/oauth/callback/calendar/google_calendar` | Google Calendar |

Tokens are **AES-encrypted** into `IntegrationConnection.encryptedAccessToken` / `encryptedRefreshToken` (`TOKEN_ENCRYPTION_KEY`). After Google Calendar connect, an initial **`google-calendar-sync`** job is enqueued.

On success/failure the API redirects back to the web app (`integrationOAuthRedirectUrl`).

---

## 5. Webhooks (fast ack, work on queues)

Inbound providers hit Express with **raw body** so HMAC / vendor signatures can be verified. Pattern: verify → persist / enqueue → respond quickly. **Do not run LangGraph / Gemini in the webhook handler.**

| Endpoint | Auth | Typical follow-up |
|----------|------|-------------------|
| `POST /api/v1/webhooks/hubspot` | HubSpot v3 signature | CRM incremental job |
| `POST /api/v1/webhooks/crm/:connectionId` | `X-CRM-Signature` HMAC | `crm-incremental` queue |
| `POST /api/v1/webhooks/gong/:connectionId` | Gong signature | `ingest-call` queue |
| Slack interactions / commands | Slack signature | Chat command handling |
| `POST /api/v1/agents/:agentId/webhook` | Agent HMAC | `enqueueAgentRun` |

Gong ingest: transcript → `Artifact` → `dispatchActivityIngested` → `embed-artifact` job.

---

## 6. Background jobs (Mongo queues)

There is **no Redis/Bull**. Jobs are documents on `BackgroundJob` (`packages/db/src/models/background-job.ts`). Poller: `apps/api/src/lib/queues/mongo-queue.ts`.

### 6.1 Claim / retry

| Field | Behavior |
|-------|----------|
| `status` | `pending` → `processing` → `completed` \| `failed` |
| `runAt` | Not claimed until `runAt <= now` |
| `lockedAt` / `lockedBy` | Stale lock after **5 minutes** is reclaimable |
| `attempts` / `maxAttempts` | Default max **3**; exponential backoff (2s … 60s) |
| `jobId` | Optional idempotency; unique while `pending` or `processing` |

Poll interval: **1s**. Concurrency is per-queue (typically 2–3).

### 6.2 Queues started in `startBackgroundJobProcessors`

| Queue name | Trigger | Processor purpose |
|------------|---------|-------------------|
| `agent-runs` | Manual, cron ticker, events, agent webhook, internal execute | `processAgentRun` — template executor |
| `ingest-call` | Gong webhook | Transcript → artifact, participants, activity dispatch, embed enqueue |
| `crm-incremental` | CRM webhooks | Apply inbound CRM changes via `ExternalRecord` |
| `embed-artifact` | After ingest | Chunk `rawText`, stub/real embeddings on `ArtifactChunk` |
| `google-calendar-sync` | OAuth complete / settings | Meetings → `DealEvent` |

Plus **`startScheduledAgentTicker`**: every **60s**, finds agents with schedule triggers and `enqueueAgentRun`.

Processors run **inside the API process by default**. `apps/api/src/workers/index.ts` is the same pollers for a split worker deploy.

**BackgroundJob is global** (no `workspaceId` on the job doc). Tenant is inside `payload` (e.g. `workspaceId` on ingest/agent context). Always re-scope Mongo writes from payload, never skip tenant filters.

---

## 7. Agent executor

Entry: `apps/api/src/modules/agents/executor.ts`.

```
enqueueAgentRun(ctx)
  → addAgentRunJob (queue agent-runs, jobId = runId)
  → poller processAgentRun(ctx)
  → runByTemplate(templateSlug)
  → update AgentRun status / credits / scope.output
  → optional chat delivery (Slack etc.)
  → if awaiting_approval → Slack notify
```

`AgentRunContext`: `{ runId, workspaceId, agentId, templateSlug, dealId?, userId }`.

### 7.1 Template → executor

| `templateSlug` | Executor |
|----------------|----------|
| `meddpicc-synth` | MEDDPICC synthesis |
| `crm-hygiene` | CRM field hygiene |
| `deal-focus` | Focus feed |
| `post-call`, `meeting-summary` | Post-call bundle |
| `buying-signals` | Buying signals |
| `poc-kickoff` | POC kickoff |
| `closed-won-handoff` | Closed-won handoff |
| `objection-tracker` | Objections |
| `product-feedback` | Product feedback |
| `weekly-digest` | Digest |
| `win-loss-analysis` | Win/loss |
| `risk-scanner`, `deal-stalling` | Stall / risk scan (open deals, activity cutoff) |

Unknown slug completes with a no-op message (does not throw).

HITL: executors can set status **`awaiting_approval`** and insert `Approval` rows. CRM write-back happens only after **approve** (`modules/approvals/decide.ts`).

### 7.2 How runs get created

| Source | File / path |
|--------|-------------|
| UI “run agent” | `modules/agents/handlers.ts` |
| Domain dispatch | `lib/agent-events.ts` (see §8) |
| Schedule | `lib/queues/scheduled-agents.ts` |
| Agent inbound webhook | `modules/agents/webhook.ts` |
| Internal | `POST /api/v1/internal/agent/execute` |

---

## 8. Events package (`packages/events`)

**In-process pub/sub** — not Kafka, not Mongo change streams. Same Node process only.

```ts
publishEvent(createEventEnvelope(payload, workspaceId))
subscribeEvents(listener) → unsubscribe
```

Envelope: `{ id, occurredAt, workspaceId, payload }`.

### 8.1 Typed `DomainEvent` union (package)

| `type` | Extra fields |
|--------|----------------|
| `activity.ingested` | `dealId?`, `artifactId` |
| `deal.stage_changed` | `dealId`, `from`, `to` |
| `deal.upserted` | `dealId`, `source: 'crm' \| 'manual'` |
| `approval.approved` | `approvalId` |
| `agent.run.completed` | `agentId`, `dealId?` |
| `crm.sync.completed` | `connectionId` |
| `deal.ai_fields.updated` | `dealId` |

**Current publisher in API:** `publishEvent` on approval approve (`modules/approvals/decide.ts`). There is **no `subscribeEvents` consumer in `apps/api` yet** — the bus is wired for future listeners.

### 8.2 Agent event dispatch (separate from `@ai-crm/events`)

`apps/api/src/lib/agent-events.ts` looks up **active Agents** whose `triggerConfig` is `{ type: 'event', event: '...' }`, creates `AgentRun`, and enqueues.

| Dispatch function | Agent `triggerConfig.event` |
|-------------------|-----------------------------|
| `dispatchActivityIngested` | `activity.ingested` |
| `dispatchDealCreated` | `deal.created` |
| `dispatchDealStageChanged` | `deal.stage_changed` |
| `dispatchDealClosed` | `deal.closed` |

Call ingest and deal handlers invoke these **directly** (function calls), not via `publishEvent`.

---

## 9. SSE — MEDDPICC

Streaming is **HTTP SSE on the API**, authenticated with the same Bearer JWT.

| Step | Endpoint | Behavior |
|------|----------|----------|
| Kick off | `POST /api/v1/deals/:dealId/meddpicc/refresh` | Sets `DealMeddpicc.status` to `regenerating`; returns `{ jobId, streamUrl }` |
| Stream | `GET /api/v1/deals/:dealId/meddpicc/stream` | `Content-Type: text/event-stream` |
| Read | `GET /api/v1/deals/:dealId/meddpicc` | Current letters / status |
| Edit | `PATCH /api/v1/deals/:dealId/meddpicc` | Human edits / locks |
| Citation | `GET /api/v1/deals/:dealId/meddpicc/citations/:citationId` | Citation detail |

UI (`OverviewTab`): POST refresh → `fetch(apiBase + streamUrl)` with `Authorization` → parse SSE events.

### 9.1 Stream events

| SSE `event` | Meaning |
|-------------|---------|
| `step.started` | Letter (M, E, D1, D2, P, I, C1, C2) started |
| `step.completed` | Letter step done |
| (later writes) | Generated sections; persist `DealMeddpicc` + citations |

If `GEMINI_API_KEY` is set, generation uses Gemini; otherwise mock delays + default letters. Chunks from `ArtifactChunk` are attached as citations per letter.

This stream is **request-scoped** (the GET holds the connection). It is **not** a job on `backgroundjobs`.

---

## 10. Security (API)

| Control | Implementation |
|---------|----------------|
| Headers | `helmet` |
| CORS | `WEB_URL` only, credentials true |
| User auth | Bearer JWT + refresh cookie |
| Tenant | `workspaceId` on queries |
| OAuth secrets | Encrypted at rest |
| Webhooks | HMAC / vendor signatures, raw body |
| Internal | Shared service token |

---

## 11. Deployment sketch (`docs/architecture.md`)

| Component | Typical host |
|-----------|----------------|
| Web | Vercel `:3000` in prod CDN |
| API | Railway / Render / Fly / ECS `:4000` |
| Mongo | Atlas (vector search needs M10+) |
| Workers | Same API process or `dev:worker` |

---

## 12. File map (where to read next)

| Concern | Location |
|---------|----------|
| App wiring | `apps/api/src/create-app.ts`, `routers.ts` |
| JWT / tenant | `apps/api/src/lib/auth/jwt.ts`, `session.ts` |
| Web client | `apps/web/lib/api-client.ts` |
| Queues | `apps/api/src/lib/queues/*.ts` |
| Agent run | `apps/api/src/modules/agents/executor.ts` |
| MEDDPICC SSE | `apps/api/src/modules/meddpicc/handlers.ts` |
| OAuth callbacks | `apps/api/src/modules/oauth/` |
| Domain events package | `packages/events/src/index.ts` |
| Agent dispatch | `apps/api/src/lib/agent-events.ts` |
| Models | `packages/db/src/models/` — see `05-data-model.md` |
