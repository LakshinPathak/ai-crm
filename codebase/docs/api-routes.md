# API Routes & Implementation Guide
# AI-Native Presales CRM

**Version:** 5.0  
**Backend:** `apps/api/` (modular monolith) — `http://localhost:4000`  
**Base URL:** `/api/v1`  
**Architecture:** modular monolith — [`architecture.md`](architecture.md)  
**Frontend:** `NEXT_PUBLIC_API_URL=http://localhost:4000`  
**Auth:** Google OAuth → app JWT (`Authorization: Bearer`)  
**Overview:** [`system-design.md`](system-design.md) · **Index:** [`README.md`](README.md)

> **Vibe-coding rule:** Build in [§2 build order](#2-vibe-coding-build-order). All API code lives in `apps/api/src/modules/`.

---

## Table of contents

1. [Module map (18 modules)](#1-module-map-18-modules)
2. [Vibe-coding build order](#2-vibe-coding-build-order)
3. [User personas & scenarios](#3-user-personas--scenarios)
4. [User flows → API sequences](#4-user-flows--api-sequences)
5. [Test case catalog](#5-test-case-catalog)
6. [Conventions](#6-conventions)
7. [Module specs (all routes)](#7-module-specs-all-routes)
8. [Webhooks](#8-webhooks-inbound)
9. [Rate limits & errors](#9-rate-limits--errors)
10. [Implementation checklists](#10-implementation-checklists)

---

## 1. Module map (20 modules)

Code path: `apps/api/src/modules/<module>/`

| # | Module | Routes | Wave | Auth | Description |
|---|--------|--------|------|------|-------------|
| M01 | **Health** | 1 | R1 | Public | Liveness probe |
| M02 | **Auth & Me** | 5 | R1 | JWT | User session, workspace CRUD |
| M03 | **Onboarding** | 3 | R1 | JWT | Wizard status, complete |
| M04 | **Deals** | 28 | R1–R2 | JWT | Kanban, CRUD, **12 detail tabs** |
| M05 | **MEDDPICC** | 5 | R1 | JWT | AI summary + SSE stream |
| M06 | **AI Scoring** | 4 | R2 | JWT | Sentiment, fit, blocker suggest |
| M07 | **Home & Focus** | 2 | R1 | JWT | Dashboard aggregate BFF |
| M08 | **Approvals** | 5 | R1 | JWT | HITL queue + write-back |
| M09 | **Agents** | 11 | R1–R2 | JWT | Agent CRUD, templates, **10 agents** |
| M10 | **Agent Runs** | 3 | R1 | JWT | Run history, cancel |
| M11 | **CRM Integrations** | 13 | R1 | JWT | OAuth, mappings, sync |
| M12 | **Chat Integrations** | 8 | R1–R2 | JWT | Slack/Teams/GChat |
| M13 | **Other Integrations** | 4 | R2 | JWT | Gong, Jira, Calendar |
| M14 | **OAuth Callbacks** | 6 | R1 | Public | OAuth redirect handlers |
| M15 | **Webhooks** | 5 | R1 | HMAC | CRM, Gong, chat inbound |
| M16 | **Companies** | 3 | R1 | JWT | Accounts module |
| M17 | **Pipeline Config** | 3 | R1 | JWT | Stages, sales process |
| M18 | **Insights** | 8 | R2 | JWT | Full analytics suite |
| M19 | **Marketing** | 1 | R1 | Public | Pricing wizard leads |
| M20 | **Internal** | 1 | R1 | Service token | Worker callbacks |

**Totals:** ~108 HTTP endpoints in **one API** · Full product scope

### Monorepo packages used by API

| Package | Used by modules |
|---------|-----------------|
| `packages/db` | All (Mongoose models) |
| `packages/shared` | All (Zod schemas, types) |
| `packages/integrations/crm` | M11, M15 |
| `packages/integrations/chat` | M12, M15 |
| `packages/agents` | M05, M06, M09, M10 |
| `packages/context` | M05, M06, M07 |

### `server.ts` mount sketch

```typescript
app.get('/health', healthHandler);                                    // M01
app.use('/api/v1/leads', marketingRouter);                            // M19 public
app.use('/api/v1/oauth', oauthRouter);                                // M14 public
app.use('/api/v1/webhooks', webhookRouter);                           // M15 HMAC
app.use('/api/v1', authMiddleware);
app.use('/api/v1', authRouter);                                       // M02
app.use('/api/v1/onboarding', onboardingRouter);                      // M03
app.use('/api/v1/deals', dealsRouter);                                // M04 (+ nested)
app.use('/api/v1', meddpiccRouter);                                   // M05 nested under deals
app.use('/api/v1/ai', aiRouter);                                      // M06
app.use('/api/v1/home', homeRouter);                                  // M07
app.use('/api/v1/focus', homeRouter);                                 // M07
app.use('/api/v1/approvals', approvalsRouter);                        // M08
app.use('/api/v1/agents', agentsRouter);                              // M09
app.use('/api/v1/agent-runs', agentRunsRouter);                       // M10
app.use('/api/v1/integrations/crm', integrationsCrmRouter);           // M11
app.use('/api/v1/integrations/chat', integrationsChatRouter);         // M12
app.use('/api/v1/integrations', integrationsRouter);                  // M13
app.use('/api/v1/companies', companiesRouter);                        // M16
app.use('/api/v1/pipeline', pipelineRouter);                          // M17
app.use('/api/v1/insights', insightsRouter);                          // M18
app.use('/api/v1/internal', internalRouter);                          // M20
```

---

## 2. Vibe-coding build order

Build in this order — each step is independently testable.

| Step | Module | Routes to ship | Test gate |
|------|--------|----------------|-----------|
| **1** | M01 Health | `GET /health` | `curl localhost:4000/health` → 200 |
| **2** | M02 Auth | `GET /me`, `POST /onboarding/workspace` | JWT → user + workspaceId |
| **3** | M03 Onboarding | `GET /onboarding/status`, `POST /onboarding/complete` | Status reflects wizard step |
| **4** | M11 CRM | providers, connect, status, stages, mappings, sync | OAuth mock → stages list |
| **5** | M04 Deals | board, list, CRUD, stage patch | Kanban returns stages + deals |
| **6** | M17 Pipeline | `GET /pipeline/stages` | Stages match seeded data |
| **7** | M04 Deal detail | overview-header, tasks, notes, activity, blockers | Deal tabs load |
| **8** | M05 MEDDPICC | get, refresh, stream SSE | SSE emits step events |
| **9** | M08 Approvals | list, count, approve, reject | Pending → approved flow |
| **10** | M07 Home | `GET /home` | Focus + approval badge |
| **11** | M15 Webhooks | gong, crm, chat | 202 + dedupe on replay |
| **12** | M14 OAuth | CRM callback | Token stored encrypted |
| **13** | M12 Chat | slack connect, prefs | DM delivery config saved |
| **14** | M09 Agents | stats, list, from-template, run | Manual agent run completes |
| **15** | M13 Gong | connect, status | Gong webhook ingests call |
| **16** | M19 Marketing | `POST /leads` | Lead row in MongoDB |
| **17** | M18 Insights | (Phase 2) | — |

---

## 3. User personas & scenarios

### Personas

| ID | Persona | Role | Primary modules |
|----|---------|------|-----------------|
| U1 | **Alex AE** | Account Executive | M04, M05, M07, M08, M12 |
| U2 | **Sam SE** | Solutions Engineer | M04 (tasks, blockers), M05 |
| U3 | **Mia Manager** | Sales Manager | M07, M08, M18 |
| U4 | **Raj RevOps** | Admin | M02, M03, M11, M12, M17 |
| U5 | **Guest** | Marketing visitor | M19 |
| U6 | **System** | Webhooks / workers | M15, M20 |

### Scenario matrix

| ID | Scenario | Actor | Modules | Priority |
|----|----------|-------|---------|----------|
| S01 | First-time signup + workspace creation | Raj | M02, M03 | P0 |
| S02 | CRM onboarding wizard (HubSpot) | Raj | M03, M11, M04 | P0 |
| S03 | View Monday pipeline kanban | Alex | M04, M07 | P0 |
| S04 | Open deal + read MEDDPICC | Alex | M04, M05 | P0 |
| S05 | Refresh MEDDPICC (SSE stream) | Alex | M05 | P0 |
| S06 | Drag deal to new stage | Alex | M04 | P0 |
| S07 | Gong call → post-call approval | Alex | M15, M08, M09 | P0 |
| S08 | Approve CRM write-back | Alex | M08, M11 | P0 |
| S09 | Daily focus feed on home | Alex | M07 | P0 |
| S10 | Add note + task on deal | Sam | M04 | P0 |
| S11 | Resolve blocker | Sam | M04 | P1 |
| S12 | Connect Slack + set DM prefs | Raj | M12, M14 | P1 |
| S13 | `/focus` slash command in Slack | Alex | M15, M12 | P1 |
| S14 | `/approve` from Slack | Alex | M15, M08 | P1 |
| S15 | Manager views pending approvals | Mia | M08 | P0 |
| S16 | Manual agent run | Raj | M09, M10 | P1 |
| S17 | CRM incremental sync (webhook) | System | M15, M11 | P0 |
| S18 | Pricing wizard lead capture | Guest | M19 | P1 |
| S19 | Team insights dashboard | Mia | M18 | P2 |
| S20 | Invite team member | Raj | M02 | P1 |
| S21 | MEDDPICC human edit + lock field | Alex | M05 | P1 |
| S22 | Deal search + filters | Alex | M04 | P1 |
| S23 | Connect Gong | Raj | M13, M14 | P1 |
| S24 | Risk alert → kanban badge update | System | M09, M04 | P1 |
| S25 | OAuth token refresh failure | System | M11 | P1 |

---

## 4. User flows → API sequences

Each flow lists **exact API calls in order**. Use for integration tests and frontend hooks.

### F01 — First login & workspace (S01)

```
1. POST /api/v1/onboarding/workspace     { name, slug? }     → 201 { workspaceId, userId }
2. GET  /api/v1/me                                            → 200 { user, workspace, role: admin }
3. GET  /api/v1/onboarding/status                             → 200 { completed: false, currentStep: 1 }
```

### F02 — CRM onboarding wizard (S02)

```
1. GET  /api/v1/integrations/crm/providers                    → 200 { providers: [hubspot, pipedrive] }
2. POST /api/v1/integrations/crm/hubspot/connect              → 200 { authUrl, connectionId }
   … user completes OAuth in popup …
3. GET  /api/v1/integrations/crm/hubspot/status               → poll until status: connected
4. GET  /api/v1/integrations/crm/hubspot/stages               → 200 { stages: [...] }
5. GET  /api/v1/integrations/crm/mappings/stages              → 200 { mappings: [...] }
6. PUT  /api/v1/integrations/crm/mappings/stages              → 200 { saved: true }
7. GET  /api/v1/integrations/crm/hubspot/owners               → 200 { owners: [...] }
8. PUT  /api/v1/integrations/crm/mappings/users               → 200 (optional)
9. POST /api/v1/integrations/crm/sync                         → 202 { jobId }
10. GET /api/v1/integrations/crm/sync/status                  → poll { progress, dealCount }
11. POST /api/v1/onboarding/complete                          → 200
12. GET /api/v1/deals/board                                   → 200 { stages, deals }
```

### F03 — Monday morning pipeline (S03, S09)

```
1. GET /api/v1/me                                               → workspace context
2. GET /api/v1/home                                             → { focusDeals, pendingApprovals, pipelineSnapshot }
3. GET /api/v1/deals/board?owner_id=self                      → kanban (optional if home sufficient)
4. GET /api/v1/approvals/count                                  → badge number
```

### F04 — Deal review (S04, S10)

```
1. GET /api/v1/deals/:dealId/overview-header                    → KPIs + stepper
2. GET /api/v1/deals/:dealId/meddpicc                           → cached summary
3. GET /api/v1/deals/:dealId/tasks?status=open&limit=5
4. GET /api/v1/deals/:dealId/activity?limit=20
5. GET /api/v1/deals/:dealId/blockers?status=open
6. POST /api/v1/deals/:dealId/notes                           → { body }
7. PATCH /api/v1/tasks/:taskId                                  → mark done (if exposed)
```

### F05 — MEDDPICC refresh with SSE (S05)

```
1. GET  /api/v1/deals/:dealId/meddpicc                          → check status / inputHash
2. POST /api/v1/deals/:dealId/meddpicc/refresh                  → { jobId, streamUrl }
3. GET  /api/v1/deals/:dealId/meddpicc/stream?token=...        → SSE events
   ← event: step.completed
   ← event: section.completed
   ← event: summary.completed
4. GET  /api/v1/deals/:dealId/meddpicc/citations/:citationId    → open citation sheet
```

### F06 — Kanban stage move (S06)

```
1. PATCH /api/v1/deals/:dealId/stage                            → { stageId, position }
   → 200 optimistic response
   → async: write-back queue → CRM (if mapping exists)
2. GET  /api/v1/deals/board                                     → refetch (or optimistic cache update)
```

### F07 — Post-call Gong → approval (S07, S08)

```
[System]
1. POST /api/v1/webhooks/gong/:connectionId                     → 202 (HMAC verified)
   → worker: ingest-call → artifact → agent-run (post_call)

[User]
2. GET  /api/v1/approvals?status=pending                        → list includes new item
3. GET  /api/v1/approvals/:approvalId                           → email draft preview
4. POST /api/v1/approvals/:approvalId/approve                   → { edits? }
   → worker: write-back CRM + send email
5. GET  /api/v1/approvals/count                                 → count decremented
```

### F08 — Slack `/focus` command (S13)

```
[Slack → API]
1. POST /api/v1/webhooks/chat/:connectionId                     → slash command payload
   → ChatCommandHandler → GET focus data (internal)
   → Slack adapter posts ephemeral reply
   → 200 within 3s

[Optional app]
2. GET /api/v1/focus                                            → same data in web UI
```

### F09 — Slack `/approve` (S14)

```
1. POST /api/v1/webhooks/chat/:connectionId                     → { command: approve, args: approvalId }
2. POST /api/v1/approvals/:approvalId/approve                   → (internal from handler)
3. 200 + Slack confirmation message
```

### F10 — Connect Slack (S12)

```
1. GET  /api/v1/integrations/chat/providers                     → slack: disconnected
2. POST /api/v1/integrations/chat/slack/connect                 → { authUrl }
3. GET  /api/v1/oauth/callback/chat/slack?code=...              → redirect (public)
4. GET  /api/v1/integrations/chat/slack/status                  → connected
5. GET  /api/v1/settings/chat/preferences                       → defaults
6. PUT  /api/v1/settings/chat/preferences                       → { deliveryMode: dm, notifyApprovals: true }
7. POST /api/v1/settings/chat/link-identity                     → map slack user
```

### F11 — Manager approval queue (S15)

```
1. GET /api/v1/approvals?status=pending&assignee=team           → manager sees team queue (RBAC)
2. GET /api/v1/approvals/:id
3. POST /api/v1/approvals/:id/reject                            → { note: "Needs legal review" }
```

### F12 — Manual agent run (S16)

```
1. GET  /api/v1/agents                                           → list active agents
2. POST /api/v1/agents/:agentId/run                               → { scope: { dealId } }
3. GET  /api/v1/agent-runs/:runId                               → poll status
4. GET  /api/v1/approvals?agentRunId=...                         → if HITL required
```

### F13 — CRM webhook incremental sync (S17)

```
1. POST /api/v1/webhooks/crm/:connectionId                      → deal.updated event
   → dedupe webhook_events
   → enqueue crm-incremental
   → 202
[Worker upserts deal + external_record]
```

### F14 — Pricing wizard (S18)

```
1. POST /api/v1/leads                                           → no auth, rate limited
   { email, company, teamSize, crm, primaryNeed }
   → 201 { id }
```

### F15 — Invite team member (S20)

```
1. GET  /api/v1/workspace/members
2. POST /api/v1/workspace/members/invite                        → { email, role }
```

### F16 — MEDDPICC edit + lock (S21)

```
1. PATCH /api/v1/deals/:dealId/meddpicc                         → { edits, lockedFields }
2. POST /api/v1/deals/:dealId/meddpicc/refresh                   → should skip locked sections
```

---

## 5. Test case catalog

Format: `TC-<module>-<nnn>` · **Kind:** `unit` | `integration` | `api` | `e2e`

### M02 Auth & Me

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M02-001 | Valid JWT returns user | `GET /me` | 200, `workspaceId` present | api |
| TC-M02-002 | Missing token | `GET /me` | 401 | api |
| TC-M02-003 | Expired JWT | `GET /me` | 401 | api |
| TC-M02-004 | Create workspace on first login | `POST /onboarding/workspace` | 201, unique slug | integration |
| TC-M02-005 | Member cannot invite admin-only | `POST /workspace/members/invite` as member | 403 | api |
| TC-M02-006 | Cross-tenant isolation | `GET /deals/:otherWorkspaceDealId` | 404 | api |

### M03 Onboarding

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M03-001 | Fresh user step 1 | `GET /onboarding/status` | `currentStep: 1` | api |
| TC-M03-002 | Complete without CRM | `POST /onboarding/complete` | 400 `INTEGRATION_NOT_CONNECTED` | api |
| TC-M03-003 | Complete after sync | `POST /onboarding/complete` | 200, `completed: true` | e2e |

### M04 Deals

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M04-001 | Board returns all stages | `GET /deals/board` | stages.length ≥ 1 | api |
| TC-M04-002 | Filter by owner | `GET /deals/board?owner_id=X` | all deals.owner.id = X | api |
| TC-M04-003 | Filter by sentiment | `GET /deals/board?sentiment=red` | all sentiment red | api |
| TC-M04-004 | Stage move updates position | `PATCH /deals/:id/stage` | 200, deal in new column | integration |
| TC-M04-005 | Stage move invalid stage | `PATCH /deals/:id/stage` bad stageId | 400 | api |
| TC-M04-006 | Soft delete hidden from board | `DELETE /deals/:id` then board | deal absent | integration |
| TC-M04-007 | Overview header KPIs | `GET /deals/:id/overview-header` | blockerCount matches DB | api |
| TC-M04-008 | Activity pagination | `GET /deals/:id/activity?cursor=` | max 50, ordered desc | api |
| TC-M04-009 | Create note | `POST /deals/:id/notes` | 201, appears in list | api |
| TC-M04-010 | Add blocker increments count | `POST /deals/:id/blockers` | deal.blockerCount +1 | integration |
| TC-M04-011 | Search by title | `GET /deals/search?q=Acme` | matching deals | api |
| TC-M04-012 | Close won | `POST /deals/:id/close` `{ outcome: won }` | status won | api |

### M05 MEDDPICC

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M05-001 | Cache hit | `GET /deals/:id/meddpicc` | 200, `status: idle` | api |
| TC-M05-002 | Refresh returns stream URL | `POST .../meddpicc/refresh` | 200, streamUrl | api |
| TC-M05-003 | SSE step events | `GET .../stream` | receives `step.completed` | integration |
| TC-M05-004 | Skip regen same inputHash | double refresh | second returns cached, no LLM | integration |
| TC-M05-005 | Citation links artifact | `GET .../citations/:id` | artifactId exists | api |
| TC-M05-006 | Lock field not overwritten | refresh after PATCH lock | locked section unchanged | e2e |
| TC-M05-007 | Rate limit exceeded | 11th refresh/hour | 429 | api |

### M07 Home & Focus

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M07-001 | Home aggregate | `GET /home` | focusDeals ≤ 5 | api |
| TC-M07-002 | Approval count matches | `GET /home` vs `/approvals/count` | same pending count | integration |
| TC-M07-003 | Focus feed per user | `GET /focus` | only user's deals | api |

### M08 Approvals

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M08-001 | List pending | `GET /approvals?status=pending` | all status pending | api |
| TC-M08-002 | Approve triggers write-back | `POST .../approve` | approval approved, job enqueued | integration |
| TC-M08-003 | Reject with note | `POST .../reject` | status rejected | api |
| TC-M08-004 | Expired approval | approve after expiresAt | 409 `APPROVAL_EXPIRED` | api |
| TC-M08-005 | Wrong assignee | approve as different user | 403 | api |
| TC-M08-006 | CRM conflict etag | write-back conflict | approval `conflict` status | integration |

### M11 CRM Integrations

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M11-001 | List providers | `GET .../crm/providers` | hubspot, pipedrive | api |
| TC-M11-002 | OAuth start | `POST .../crm/hubspot/connect` | authUrl + connectionId | api |
| TC-M11-003 | Stage mapping save | `PUT .../mappings/stages` | 200 | integration |
| TC-M11-004 | Backfill progress | `GET .../sync/status` | progress 0→100 | e2e |
| TC-M11-005 | Duplicate connect | second connect same provider | 409 or reconnect flow | api |
| TC-M11-006 | Disconnect warns | `DELETE .../crm/hubspot` | 200, status disconnected | api |

### M12 Chat

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M12-001 | Slack connect | `POST .../chat/slack/connect` | authUrl | api |
| TC-M12-002 | Save DM prefs | `PUT .../settings/chat/preferences` | 200 | api |
| TC-M12-003 | Link identity | `POST .../link-identity` | maps externalUserId | integration |

### M15 Webhooks

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M15-001 | Invalid HMAC | `POST /webhooks/gong/:id` | 401 | api |
| TC-M15-002 | Valid Gong call | `POST /webhooks/gong/:id` | 202 | integration |
| TC-M15-003 | Duplicate event id | same payload twice | 200/202, one job | integration |
| TC-M15-004 | Unknown connectionId | `POST /webhooks/crm/bad` | 404 | api |
| TC-M15-005 | Slack slash /focus | `POST /webhooks/chat/:id` | 200 &lt;3s | e2e |

### M19 Marketing

| ID | Scenario | Method + Path | Expected | Kind |
|----|----------|---------------|----------|------|
| TC-M19-001 | Valid lead | `POST /leads` | 201 | api |
| TC-M19-002 | Missing email | `POST /leads` | 400 | api |
| TC-M19-003 | Rate limit | 6th req/min same IP | 429 | api |

### E2E golden paths (Playwright / manual)

| ID | Flow | Steps |
|----|------|-------|
| E2E-001 | F02 full onboarding | S02 all API calls |
| E2E-002 | F07 post-call approval | Gong webhook → approve → CRM updated |
| E2E-003 | F06 kanban DnD | PATCH stage → board reflects |
| E2E-004 | F05 MEDDPICC SSE | stream completes with citations |
| E2E-005 | F10 Slack connect | OAuth → prefs → test DM |

---

## 6. Conventions

### Path notation

All paths = `{API_HOST}/api/v1/...` except `GET /health`.

### Request / Response

- Content-Type: `application/json`
- Dates: ISO 8601 UTC
- IDs: MongoDB ObjectId as string in JSON
- Pagination: `?page=1&limit=20` → `{ data, meta: { page, limit, total, hasMore } }`
- Cursor pagination: `?cursor=...&limit=50` → `{ data, meta: { nextCursor } }`
- Errors: `{ error: { code, message, details? } }`

### HTTP status codes

| Code | Use |
|------|-----|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async job) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (RBAC) |
| 404 | Not found (includes cross-tenant) |
| 409 | Conflict / idempotency duplicate |
| 429 | Rate limited |
| 500 | Server error |

### Error codes

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INTEGRATION_NOT_CONNECTED'
  | 'INTEGRATION_SYNC_IN_PROGRESS'
  | 'AGENT_RUN_IN_PROGRESS'
  | 'CREDIT_LIMIT_EXCEEDED'
  | 'APPROVAL_EXPIRED'
  | 'APPROVAL_CONFLICT'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'RATE_LIMIT_EXCEEDED';
```

### RBAC matrix

| Route group | admin | manager | member |
|-------------|-------|---------|--------|
| Deals (own) | ✓ | ✓ team | ✓ assigned |
| Approvals | ✓ all | ✓ team | ✓ own |
| Integrations connect | ✓ | ✗ | ✗ |
| Agent config | ✓ | read | read |
| Insights | ✓ | ✓ | ✗ |
| Workspace settings | ✓ | ✗ | ✗ |

---

## 7. Module specs (all routes)

### M01 — Health (1 route)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | Public | `{ status: "ok", version, mongo: "connected" }` |

---

### M02 — Auth & Me (5 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/me` | JWT | Current user + workspace + role |
| `POST` | `/api/v1/onboarding/workspace` | JWT | Create workspace on first login |
| `PATCH` | `/api/v1/workspace` | JWT admin | Update workspace settings |
| `GET` | `/api/v1/workspace/members` | JWT | List members |
| `POST` | `/api/v1/workspace/members/invite` | JWT admin | Invite user `{ email, role }` |

**`GET /api/v1/me` response:**
```json
{
  "user": { "id", "email", "displayName", "avatarUrl", "timezone", "role" },
  "workspace": { "id", "name", "slug", "onboardingCompletedAt" }
}
```

---

### M03 — Onboarding (3 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/onboarding/status` | JWT | `{ completed, currentStep, selectedProvider }` |
| `POST` | `/api/v1/onboarding/complete` | JWT admin | Mark wizard done; requires CRM sync |
| `PATCH` | `/api/v1/onboarding/step` | JWT admin | Advance wizard step `{ step: 2 }` |

---

### M04 — Deals (20 routes)

#### Board & list

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/deals/board` | Kanban: stages + deals + aggregates |
| `GET` | `/api/v1/deals` | Flat list `?page&limit&owner_id&status&stage_id` |
| `GET` | `/api/v1/deals/search` | Full-text `?q=` |
| `GET` | `/api/v1/deals/metrics` | Pipeline summary totals |

**`GET /api/v1/deals/board` query:** `?owner_id=&sentiment=&stage_id=&min_amount=&max_amount=&is_hot=true`

#### CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/deals/:dealId` | Deal by ID |
| `POST` | `/api/v1/deals` | Create `{ title, companyId, amount, stageId, ownerId }` |
| `PATCH` | `/api/v1/deals/:dealId` | Update fields |
| `DELETE` | `/api/v1/deals/:dealId` | Soft delete |
| `PATCH` | `/api/v1/deals/:dealId/stage` | DnD `{ stageId, position }` |
| `POST` | `/api/v1/deals/:dealId/close` | `{ outcome: "won"\|"lost", lostReason? }` |

#### Detail tabs (full product — 12 tabs)

| Method | Path | Tab | Service |
|--------|------|-----|---------|
| `GET` | `/api/v1/deals/:dealId/overview-header` | Overview | modules/deals |
| `GET` | `/api/v1/deals/:dealId/plan` | Plan | modules/deals |
| `GET` | `/api/v1/deals/:dealId/activity` | Activity | modules/deals (activity) |
| `GET` | `/api/v1/deals/:dealId/events` | Events | platform-integration |
| `GET/POST` | `/api/v1/deals/:dealId/participants` | Participants | modules/deals |
| `GET/POST` | `/api/v1/deals/:dealId/product-requests` | Product Requests | modules/deals |
| `GET/POST` | `/api/v1/deals/:dealId/team-requests` | Team Requests | modules/deals |
| `GET` | `/api/v1/deals/:dealId/insights` | Insights | modules/insights |
| `GET/POST` | `/api/v1/deals/:dealId/notes` | Notes | modules/deals |
| `GET/POST` | `/api/v1/deals/:dealId/tasks` | Tasks | modules/deals |
| `PATCH` | `/api/v1/tasks/:taskId` | Tasks | modules/deals |
| `GET/POST` | `/api/v1/deals/:dealId/projects` | Projects | modules/deals |
| `GET/POST/DELETE` | `/api/v1/deals/:dealId/files` | File Center | modules/deals |
| `GET/POST` | `/api/v1/deals/:dealId/blockers` | Overview KPI | modules/deals |
| `PATCH` | `/api/v1/blockers/:blockerId` | Overview KPI | modules/deals |
| `GET/POST` | `/api/v1/deals/:dealId/integrations` | Integrations tab | modules/deals |

---

### M05 — MEDDPICC (5 routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/deals/:dealId/meddpicc` | Cached summary + `inputHash` |
| `POST` | `/api/v1/deals/:dealId/meddpicc/refresh` | Start regen → `{ jobId, streamUrl }` |
| `GET` | `/api/v1/deals/:dealId/meddpicc/stream` | SSE `?token=` |
| `PATCH` | `/api/v1/deals/:dealId/meddpicc` | Human edit `{ edits, lockedFields }` |
| `GET` | `/api/v1/deals/:dealId/meddpicc/citations/:citationId` | Citation detail |

**SSE events:** `step.completed` · `section.completed` · `summary.completed` · `summary.error`

---

### M06 — AI Scoring (4 routes) — P1

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ai/deals/:dealId/sentiment` | Refresh sentiment |
| `POST` | `/api/v1/ai/deals/:dealId/technical-fit` | Refresh fit score |
| `POST` | `/api/v1/ai/deals/:dealId/blockers/suggest` | Suggest blockers |
| `POST` | `/api/v1/ai/pipeline/insights` | Pipeline narrative |

---

### M07 — Home & Focus (2 routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/home` | Dashboard: focus + approvals + snapshot + activity |
| `GET` | `/api/v1/focus` | Deal Focus list (same engine as chat `/focus`) |

---

### M08 — Approvals (5 routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/approvals` | `?status=pending&assignee=&dealId=` |
| `GET` | `/api/v1/approvals/count` | Badge count for current user |
| `GET` | `/api/v1/approvals/:approvalId` | Detail + full content |
| `POST` | `/api/v1/approvals/:approvalId/approve` | `{ edits? }` |
| `POST` | `/api/v1/approvals/:approvalId/reject` | `{ note }` |

---

### M09 — Agents (11 routes) — P1

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/agents/stats` | Dashboard metrics |
| `GET` | `/api/v1/agents` | List agents |
| `GET` | `/api/v1/agents/:agentId` | Detail |
| `POST` | `/api/v1/agents` | Create |
| `PATCH` | `/api/v1/agents/:agentId` | Update |
| `DELETE` | `/api/v1/agents/:agentId` | Archive |
| `POST` | `/api/v1/agents/:agentId/run` | Manual `{ scope: { dealId? } }` |
| `POST` | `/api/v1/agents/from-template/:slug` | Instantiate template |
| `POST` | `/api/v1/agents/draft-from-nl` | NL builder — P2 |
| `GET` | `/api/v1/agent-templates` | Template library |
| `POST` | `/api/v1/agents/:agentId/webhook/:token` | External trigger |

---

### M10 — Agent Runs (3 routes) — P1

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/agent-runs` | `?agentId=&status=&dealId=&limit=` |
| `GET` | `/api/v1/agent-runs/:runId` | Detail + steps |
| `POST` | `/api/v1/agent-runs/:runId/cancel` | Cancel running |

---

### M11 — CRM Integrations (13 routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/integrations/crm/providers` | List CRM providers |
| `POST` | `/api/v1/integrations/crm/:provider/connect` | OAuth → `{ authUrl, connectionId }` |
| `GET` | `/api/v1/integrations/crm/:provider/status` | Poll connection |
| `DELETE` | `/api/v1/integrations/crm/:provider` | Disconnect |
| `GET` | `/api/v1/integrations/crm/:provider/pipelines` | Pipelines (Pipedrive, SF) |
| `GET` | `/api/v1/integrations/crm/:provider/stages` | `?pipelineId=` |
| `GET` | `/api/v1/integrations/crm/:provider/owners` | CRM users |
| `GET` | `/api/v1/integrations/crm/mappings/stages` | Current mappings |
| `PUT` | `/api/v1/integrations/crm/mappings/stages` | Save mappings |
| `PUT` | `/api/v1/integrations/crm/mappings/users` | Save user mappings |
| `POST` | `/api/v1/integrations/crm/sync` | Trigger backfill/incremental |
| `GET` | `/api/v1/integrations/crm/sync/status` | Progress `{ percent, dealCount, status }` |
| `GET` | `/api/v1/integrations/crm/:provider/health` | Health detail |

---

### M12 — Chat Integrations (8 routes) — P1 Slack

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/integrations/chat/providers` | Slack, Teams, GChat status |
| `POST` | `/api/v1/integrations/chat/:provider/connect` | OAuth install |
| `GET` | `/api/v1/integrations/chat/:provider/status` | Poll |
| `DELETE` | `/api/v1/integrations/chat/:provider` | Disconnect |
| `GET` | `/api/v1/integrations/chat/:provider/channels` | Linkable channels |
| `GET` | `/api/v1/settings/chat/preferences` | User prefs |
| `PUT` | `/api/v1/settings/chat/preferences` | Save prefs |
| `POST` | `/api/v1/settings/chat/link-identity` | Map chat user |

---

### M13 — Other Integrations (4 routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/integrations` | All categories + status grid |
| `POST` | `/api/v1/integrations/:provider/connect` | Gong, Jira, Calendar |
| `GET` | `/api/v1/integrations/:provider/status` | Poll |
| `DELETE` | `/api/v1/integrations/:provider` | Disconnect |

---

### M14 — OAuth Callbacks (6 routes) — Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/oauth/callback/crm/:provider` | CRM OAuth |
| `GET` | `/api/v1/oauth/callback/gong` | Gong |
| `GET` | `/api/v1/oauth/callback/chat/slack` | Slack |
| `GET` | `/api/v1/oauth/callback/chat/teams` | Teams — P2 |
| `GET` | `/api/v1/oauth/callback/chat/google_chat` | GChat — P2 |
| `GET` | `/api/v1/oauth/callback/google` | Calendar — P2 |

---

### M16 — Companies (3 routes) — P2

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/companies` | List |
| `GET` | `/api/v1/companies/:companyId` | Detail + deals |
| `POST` | `/api/v1/companies` | Create |

---

### M17 — Pipeline Config (3 routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/pipeline/stages` | Kanban columns |
| `GET` | `/api/v1/sales-processes` | Process + milestones |
| `PATCH` | `/api/v1/deals/:dealId/milestones/:milestoneId` | Update milestone |

---

### M18 — Insights (8 routes) — P2

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/insights/summary` | Org cards |
| `GET` | `/api/v1/insights/users` | Team table |
| `GET` | `/api/v1/insights/users/:userId` | Drill-down |
| `GET` | `/api/v1/insights/activity/over-time` | Chart |
| `GET` | `/api/v1/insights/activity/breakdown` | Donut |
| `GET` | `/api/v1/insights/deal-breakdown` | Deal activity |
| `POST` | `/api/v1/insights/sql` | Admin SQL |
| `GET` | `/api/v1/insights/export` | CSV |

---

### M19 — Marketing (1 route) — Public

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/leads` | Pricing wizard lead capture |

Body: `{ email, company, teamSize, crm, primaryNeed, source? }` → `201 { id, createdAt }`

---

### M20 — Internal (1 route)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/internal/agent/execute` | Service token | Worker callback |

---

## 8. Webhooks (inbound)

| Method | Path | Provider | Worker queue |
|--------|------|----------|--------------|
| `POST` | `/api/v1/webhooks/crm/:connectionId` | HubSpot, Pipedrive | `crm-incremental` |
| `POST` | `/api/v1/webhooks/gong/:connectionId` | Gong | `ingest-call` |
| `POST` | `/api/v1/webhooks/chat/:connectionId` | Slack, Teams, GChat | ingest / command handler |
| `POST` | `/api/v1/webhooks/jira/:connectionId` | Jira | `jira-sync` |

**Rules:** Verify HMAC → upsert `webhook_events` → enqueue → `202` in &lt;3s.

**Slack commands handled on chat webhook:**

| Command | Handler | Response |
|---------|---------|----------|
| `/focus` | `ChatCommandHandler.focus` | Priority deals list |
| `/deal <name>` | `ChatCommandHandler.deal` | Deal summary |
| `/approve <id>` | `ChatCommandHandler.approve` | Approve pending item |

---

## 9. Rate limits & errors

| Group | Limit |
|-------|-------|
| General API | 100 req/min per user |
| AI refresh | 10 req/hour per deal |
| Agent manual run | 20 req/hour per user |
| Webhooks | 1000 req/min per workspace |
| Marketing leads | 5 req/min per IP |
| SQL explorer | 10 req/min per admin |

---

## 10. Implementation checklists

### R1 — Core platform (~52 routes)

- [ ] M01 `GET /health`
- [ ] M02 Auth (5)
- [ ] M03 Onboarding (3)
- [ ] M04 Deals board + CRUD + detail tabs (14)
- [ ] M05 MEDDPICC + SSE (5)
- [ ] M07 Home (2)
- [ ] M08 Approvals (5)
- [ ] M11 CRM connect + sync + mappings (13)
- [ ] M14 OAuth CRM callback (1)
- [ ] M15 Webhooks gong + crm (2)
- [ ] M17 Pipeline stages (1)

### R2 — Full product features (+35 routes)

- [ ] M12 Slack chat (8)
- [ ] M13 Gong connect (4)
- [ ] M09 Agents templates + run (8)
- [ ] M10 Agent runs (3)
- [ ] M06 AI scoring (4)
- [ ] M15 Chat webhook + commands (1)
- [ ] M19 Marketing leads (1)
- [ ] M02 Invite members (1)
- [ ] M04 Search + metrics (2)

### R3 — Scale + service extraction (+21 routes)

- [ ] M16 Companies (3)
- [ ] M18 Insights (8)
- [ ] M09 NL agent builder (1)
- [ ] M12 Teams + GChat (4)
- [ ] Deal participants + integrations tabs (5)

### Zod / types (`packages/shared`)

```
packages/shared/src/schemas/
  auth.ts · deal.ts · meddpicc.ts · approval.ts
  integration-crm.ts · integration-chat.ts · agent.ts
  webhook.ts · marketing.ts
```

### Test runners by kind

| Kind | Runner | Location |
|------|--------|----------|
| `unit` | Vitest | `packages/*/src/**/*.test.ts` |
| `api` | Vitest + supertest | `apps/api/src/routes/**/*.api.test.ts` |
| `integration` | Vitest + Mongo memory server | `apps/api/test/integration/` |
| `e2e` | Playwright MCP | `.agent/qa.md` cases E2E-001–005 |

---

## Related docs

| Doc | Focus |
|-----|-------|
| [`frontend-flow.md`](frontend-flow.md) | Next.js routes per flow |
| [`database.md`](database.md) | Collections per module |
| [`chat-channels.md`](chat-channels.md) | Chat webhook + commands |
| [`crm-connectors.md`](crm-connectors.md) | CRM sync per M11 |
| [`agent-platform.md`](agent-platform.md) | Agent triggers per M09 |
