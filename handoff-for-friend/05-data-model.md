# Data model — Mongoose collections

**Repo:** `codebase/packages/db`. **ODM:** Mongoose 8. **Connect:** `packages/db/src/connection.ts` (`MONGODB_URI`, pool 5–50).

This file describes **what is in the model files today**, not every planned collection in `docs/database.md`. Spec collections that are **not** implemented as models are listed at the end.

---

## 1. Conventions

| Rule | In code |
|------|---------|
| Primary key | Mongo `_id` (ObjectId). APIs usually expose string `id`. |
| Timestamps | `{ timestamps: true }` → `createdAt`, `updatedAt` on **all** models below. |
| Tenancy | `workspaceId` ObjectId → `Workspace` on every tenant collection. **Exceptions:** `Workspace` itself, `AuthSession`, `AuthExchangeCode`, `MarketingLead`, `BackgroundJob`. |
| Soft delete | `deletedAt: Date \| null` on **Deal, Company, Note, Task** only. Queries must use `deletedAt: null` (or equivalent) for live rows. |
| Indexes | Listed per model. Mongoose also indexes fields with `index: true`. |
| Collection names | Mongoose **pluralizes + lowercases** the model name unless `collection` is set. Only `MeddpiccCitation` sets `collection: 'meddpicc_citations'`. |

### 1.1 Tenancy exceptions

| Model | Why no `workspaceId` |
|-------|----------------------|
| `Workspace` | Tenant root |
| `AuthSession` | Tied to `userId`; workspace is on `User` |
| `AuthExchangeCode` | Pre-session OAuth exchange |
| `MarketingLead` | Public pricing/wizard; global |
| `BackgroundJob` | Queue document; tenant lives in `payload` |

### 1.2 Soft-delete matrix

| Model | `deletedAt` |
|-------|-------------|
| Deal, Company, Note, Task | Yes (`null` = live) |
| All other models | No — hard delete or status enum |

### 1.3 CRM IDs vs `ExternalRecord`

`docs/database.md` says provider IDs must live **only** on `external_records`. The **code still stores** `crmExternalId` + `crmProvider` on Deal, Company, Note, and Task **and** has `ExternalRecord`. Treat both as live until a cleanup.

---

## 2. Collection catalog (implemented models)

| Mongoose model | Typical collection | Tenant? | Soft delete? |
|----------------|--------------------|---------|--------------|
| Workspace | `workspaces` | n/a | no |
| User | `users` | optional `workspaceId` | no (`isActive`) |
| WorkspaceInvite | `workspaceinvites` | yes | no (`status`) |
| AuthSession | `authsessions` | no | `revokedAt` |
| AuthExchangeCode | `authexchangecodes` | no | `usedAt` |
| PipelineStage | `pipelinestages` | yes | no |
| Company | `companies` | yes | yes |
| Deal | `deals` | yes | yes |
| Note | `notes` | yes | yes |
| Task | `tasks` | yes | yes |
| DealBlocker | `dealblockers` | yes | no (`status`) |
| DealParticipant | `dealparticipants` | yes | no |
| DealProject | `dealprojects` | yes | no |
| DealProductRequest | `dealproductrequests` | yes | no |
| DealTeamRequest | `dealteamrequests` | yes | no |
| DealEvent | `dealevents` | yes | no |
| DealFile | `dealfiles` | yes | no |
| DealStageChange | `dealstagechanges` | yes | no |
| DealMeddpicc | `dealmeddpiccs` | yes | no |
| MeddpiccCitation | `meddpicc_citations` | yes | no |
| Artifact | `artifacts` | yes | no |
| ArtifactChunk | `artifactchunks` | yes | no |
| Agent | `agents` | yes | no (`isActive`) |
| AgentRun | `agentruns` | yes | no |
| Approval | `approvals` | yes | no |
| IntegrationConnection | `integrationconnections` | yes | no (`status`) |
| ExternalRecord | `externalrecords` | yes | no |
| BackgroundJob | `backgroundjobs` | payload | no |
| MarketingLead | `marketingleads` | no | no |

---

## 3. Workspace and identity

### 3.1 Workspace

Tenant root. No `workspaceId` on itself.

| Field | Type | Notes |
|-------|------|--------|
| `name` | string, required | Display name |
| `slug` | string, required, **unique** | URL / join key |
| `timezone` | string | Default `America/New_York` |
| `settings.defaultCurrency` | string | Default `USD` |
| `settings.aiCreditsMonthly` | number | Default `10000` |
| `settings.aiCreditsUsed` | number | Default `0` |
| `settings.mcpServers` | Mixed | Default `[]` |
| `primaryCrmConnectionId` | ObjectId → IntegrationConnection | Optional |
| `onboardingStep` | number | Default `1` |
| `selectedCrmProvider` | string \| null | Onboarding CRM pick |
| `onboardingCompletedAt` | Date \| null | Null until done |
| `createdAt` / `updatedAt` | Date | timestamps |

**Indexes:** unique `slug`.

### 3.2 User

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId → Workspace \| **null** | Null until workspace created/joined; indexed |
| `googleId` | string, required, **unique** | Google subject |
| `email` | string, required | |
| `displayName` | string, required | |
| `avatarUrl` | string | optional |
| `role` | `admin` \| `manager` \| `member` | Default **`admin`** (first user) |
| `timezone` | string | Default `America/New_York` |
| `isActive` | boolean | Default `true`; JWT rejects inactive |

**Indexes:**

| Index | Unique / partial |
|-------|------------------|
| `{ workspaceId: 1 }` | via `index: true` |
| `{ googleId: 1 }` | unique |
| `{ workspaceId: 1, email: 1 }` | unique **only when `workspaceId` is ObjectId** |
| `{ workspaceId: 1, role: 1, isActive: 1 }` | |

A user without a workspace can still hold a JWT (`workspaceId` omitted). Protected CRM routes return `WORKSPACE_REQUIRED`.

### 3.3 WorkspaceInvite

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `email` | string, required | lowercase + trim |
| `role` | `admin` \| `manager` \| `member` | Default `member` |
| `invitedBy` | ObjectId → User, required | |
| `status` | `pending` \| `accepted` \| `revoked` | Default `pending` |
| `expiresAt` | Date, required | |

**Indexes:** unique `{ workspaceId: 1, email: 1 }` **partial** where `status: 'pending'` (one outstanding invite per email per workspace).

On Google exchange, pending invites can auto-attach the user to the workspace.

### 3.4 AuthSession

Refresh-token sessions. **No workspaceId.**

| Field | Type | Notes |
|-------|------|--------|
| `userId` | ObjectId → User, required | indexed |
| `refreshTokenHash` | string, required, **unique** | SHA-256 of cookie token |
| `expiresAt` | Date, required | indexed; ~30 days |
| `revokedAt` | Date \| null | Logout |
| `userAgent` | string | optional |
| `ipAddress` | string | optional |

**Indexes:** `{ userId: 1, revokedAt: 1 }`.

### 3.5 AuthExchangeCode

One-time code after Google callback so the JWT is not put in the redirect URL.

| Field | Type | Notes |
|-------|------|--------|
| `code` | string, required, unique | indexed |
| `userId` | ObjectId → User, required | |
| `needsWorkspace` | boolean | Default `false` |
| `expiresAt` | Date, required | ~2 minutes |
| `usedAt` | Date \| null | Set on exchange |

---

## 4. Pipeline and companies

### 4.1 PipelineStage

Kanban columns. One set **per workspace**.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `name` | string, required | |
| `position` | number, required | Sort order |
| `stageType` | `open` \| `closed_won` \| `closed_lost` | Default `open` |
| `slaDays` | number | optional |
| `color` | string | optional |
| `isDefault` | boolean | Default `false` |

**Indexes:** unique `{ workspaceId: 1, position: 1 }`.

### 4.2 Company

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `name` | string, required | |
| `domain` | string | |
| `industry` | string | |
| `logoUrl` | string | |
| `employeeCount` | number | |
| `crmExternalId` | string | Provider id (also see ExternalRecord) |
| `crmProvider` | string | e.g. hubspot |
| `deletedAt` | Date \| null | Soft delete |

**Indexes:** `{ workspaceId: 1, domain: 1 }`; text `{ workspaceId: 1, name: 'text' }`.

---

## 5. Deal and deal children

### 5.1 Deal

Hot path: board + overview. **Always filter `deletedAt: null` for live deals.**

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `companyId` | ObjectId → Company, required | |
| `title` | string, required | |
| `amount` | number | Default `0` |
| `currency` | string | Default `USD` |
| `stageId` | ObjectId → PipelineStage, required | Kanban column |
| `position` | number | Default `0` (order in column) |
| `ownerId` | ObjectId → User, required | |
| `solutionsEngineerId` | ObjectId → User | optional |
| `status` | `open` \| `won` \| `lost` | Default `open` |
| `sentiment` | `green` \| `yellow` \| `red` | Default `yellow` (denormalized) |
| `technicalFitScore` | 1–5 | optional |
| `winProbability` | number | Default `0` |
| `riskScore` | number | Default `0` |
| `blockerCount` | number | Default `0`; workers should keep in sync with DealBlocker |
| `isHot` | boolean | Default `false` |
| `meddpiccCompleteness` | number | Default `0` |
| `plan.milestones[]` | `{ title, status, dueDate, description }` | status: `pending` \| `in_progress` \| `done` |
| `plan.goals[]` | `{ title, description }` | |
| `expectedCloseDate` | Date | |
| `closedAt` | Date | |
| `lostReason` | string | |
| `lastActivityAt` | Date | |
| `crmExternalId` / `crmProvider` | string | Mirror of CRM |
| `deletedAt` | Date \| null | Soft delete |

**Indexes:**

| Index | Use |
|-------|-----|
| `{ workspaceId: 1, stageId: 1, position: 1 }` | Kanban |
| `{ workspaceId: 1, ownerId: 1 }` | My deals |
| `{ workspaceId: 1, title: 'text' }` | Search |

Spec also describes a **partial** open-deals kanban index; that partial index is **not** declared on the current schema.

### 5.2 Note (`DealNote` in the spec)

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `authorId` | ObjectId → User, required | |
| `body` | string, required | |
| `crmExternalId` / `crmProvider` | string | |
| `deletedAt` | Date \| null | Soft delete |

No extra compound index beyond field indexes.

### 5.3 Task

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `title` | string, required | |
| `assigneeId` | ObjectId → User | optional |
| `dueDate` | Date | Spec called this `dueAt` |
| `completedAt` | Date | |
| `status` | `open` \| `done` | Default `open` (no `cancelled`) |
| `crmExternalId` / `crmProvider` | string | |
| `deletedAt` | Date \| null | Soft delete |

### 5.4 DealBlocker

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `title` | string, required | |
| `description` | string | |
| `severity` | `low` \| `medium` \| `high` \| `critical` | Default `medium` |
| `status` | `open` \| `resolved` | Default `open` |
| `ownerId` | ObjectId → User | |
| `resolvedAt` | Date | Spec also had `resolvedBy` — **not** on this schema |

### 5.5 DealParticipant

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `name` | string, required | |
| `email` | string, required | |
| `role` | string | |
| `company` | string | |

**Index:** `{ workspaceId: 1, dealId: 1 }`.

### 5.6 DealProject

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `title` | string, required | |
| `status` | `planning` \| `active` \| `completed` \| `on_hold` | Default `planning` |

**Index:** `{ workspaceId: 1, dealId: 1 }`.

### 5.7 DealProductRequest

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `title` | string, required | |
| `description` | string | |
| `status` | `open` \| `submitted` \| `in_progress` \| `done` | Default `open` |
| `priority` | `low` \| `medium` \| `high` | Default `medium` |

**Index:** `{ workspaceId: 1, dealId: 1 }`.

### 5.8 DealTeamRequest

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `title` | string, required | |
| `department` | string, required | |
| `status` | `open` \| `in_progress` \| `completed` \| `cancelled` | Default `open` |
| `assigneeName` | string | Name string, not User ref |

**Index:** `{ workspaceId: 1, dealId: 1 }`.

### 5.9 DealEvent (calendar / meetings)

**Not** the spec’s `ActivityEvent` timeline. These are scheduled meetings/calls (often from Google Calendar).

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `title` | string, required | |
| `startAt` / `endAt` | Date, required | |
| `type` | `meeting` \| `call` | required |
| `source` | string, required | e.g. google_calendar |
| `externalId` | string | Provider event id |

**Indexes:** `{ workspaceId: 1, dealId: 1, startAt: -1 }`; unique sparse `{ workspaceId: 1, source: 1, externalId: 1 }`.

### 5.10 DealFile

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `name` | string, required | |
| `url` | string, required | |
| `mimeType` | string | |
| `sizeBytes` | number ≥ 0 | |

**Index:** `{ workspaceId: 1, dealId: 1 }`.

### 5.11 DealStageChange

Audit of kanban moves.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal, required | indexed |
| `fromStageId` | ObjectId → PipelineStage | optional (create) |
| `toStageId` | ObjectId → PipelineStage, required | |
| `changedById` | ObjectId → User | |

**Index:** `{ workspaceId: 1, dealId: 1, createdAt: -1 }`.

---

## 6. MEDDPICC and RAG

### 6.1 DealMeddpicc

One document per deal (`dealId` unique).

| Field | Type | Notes |
|-------|------|--------|
| `dealId` | ObjectId → Deal, required, **unique** | 1:1 |
| `workspaceId` | ObjectId, required | indexed |
| `letters` | Mixed | M / E / D / P / I / C sections |
| `narrative` | Mixed | |
| `lockedFields` | string[] | Human-locked keys |
| `humanEdits` | Mixed | |
| `status` | `idle` \| `regenerating` \| `stale` | Default `idle` |
| `overallConfidence` | number | |
| `inputHash` | string | Skip regen when artifact hash matches (spec) |
| `generatedAt` | Date | |
| `version` | number | Default `1` |

Spec also had `generatedByRunId` — **not** on this schema.

### 6.2 MeddpiccCitation

Collection name **forced:** `meddpicc_citations`.

| Field | Type | Notes |
|-------|------|--------|
| `dealId` | ObjectId, required | indexed |
| `workspaceId` | ObjectId, required | **not** `index: true` alone; compound below |
| `letter` | string, required | e.g. `M`, `E` |
| `claimKey` | string, required | |
| `text` | string | |
| `artifactId` | ObjectId → Artifact | |
| `chunkId` | ObjectId → ArtifactChunk | |
| `excerpt` | string | |
| `speaker` | string | |
| `occurredAt` | Date | |
| `confidence` | number | |

**Index:** `{ workspaceId: 1, dealId: 1, letter: 1 }`.

### 6.3 Artifact

Call transcripts, threads, docs. Idempotent ingest key: `(workspaceId, source, sourceId)`.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `dealId` | ObjectId → Deal | indexed; may be unset until matched |
| `type` | `call` \| `email` \| `slack_thread` \| `teams_thread` \| `google_chat_thread` \| `document` \| `crm_note` | required |
| `source` | string, required | e.g. `gong` |
| `sourceId` | string, required | Provider call/thread id |
| `title` | string | |
| `occurredAt` | Date | indexed |
| `durationSeconds` | number | |
| `participants[]` | `{ name, email, role }` | no sub `_id` |
| `contentHash` | string, required | Dedupe / MEDDPICC hash |
| `storageUrl` | string | Large body in object storage |
| `rawText` | string | Small inline text |
| `chunkCount` | number | Default `0` |
| `embeddedAt` | Date | When chunks/embeddings written |
| `metadata` | Mixed | Default `{}` |

**Indexes:** unique `{ workspaceId: 1, source: 1, sourceId: 1 }`; `{ workspaceId: 1, dealId: 1, occurredAt: -1 }`; `{ workspaceId: 1, type: 1, occurredAt: -1 }`.

### 6.4 ArtifactChunk

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `artifactId` | ObjectId → Artifact, required | indexed |
| `dealId` | ObjectId → Deal | indexed |
| `chunkIndex` | number, required | Order in parent |
| `text` | string, required | Spec named this `content` |
| `embedding` | number[] | Optional; stub dims 384 in embed job; Atlas spec uses 1536 |

**Indexes:** unique `{ workspaceId: 1, artifactId: 1, chunkIndex: 1 }`; `{ workspaceId: 1, dealId: 1 }`.

Vector / Atlas Search indexes are **Atlas-side**, not Mongoose schema indexes.

---

## 7. Agents and approvals

### 7.1 Agent

Workspace-configured instance of a template.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `templateSlug` | string | e.g. `post-call`, `meddpicc-synth` |
| `name` | string, required | |
| `category` | `process` \| `risk` \| `signals` \| `reporting` | Default `process` |
| `ownerId` | ObjectId → User | Run-as / notify |
| `isActive` | boolean | Default `true` |
| `triggerConfig` | Mixed | `{ type: 'event' \| 'cron' \| ..., event?: string }` |
| `toolsConfig` | Mixed | |
| `deliveryConfig` | Mixed \| null | Chat delivery |
| `settings` | Mixed | |

### 7.2 AgentRun

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `agentId` | ObjectId → Agent, required | |
| `dealId` | ObjectId → Deal | indexed |
| `status` | `queued` \| `running` \| `awaiting_approval` \| `completed` \| `failed` \| `skipped` | Default `queued` |
| `triggerType` | `event` \| `cron` \| `manual` \| `stage_change` | Default `manual` |
| `scope` | Mixed | Trigger payload; executor may store `output` here |
| `creditsUsed` | number | Default `0` |
| `error` | string | |
| `startedAt` / `completedAt` | Date | |

Spec indexes (`idempotencyKey`, status compounds) are **not** on this schema; queue idempotency uses `BackgroundJob.jobId` (= `runId`).

### 7.3 Approval

Human-in-the-loop before CRM/chat write-back.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `agentRunId` | ObjectId → AgentRun, required | |
| `dealId` | ObjectId → Deal | indexed |
| `assignedTo` | ObjectId → User, required | Inbox |
| `status` | `pending` \| `approved` \| `rejected` \| `expired` \| `conflict` | Default `pending` |
| `contentType` | `crm_update` \| `email` \| `slack_message` \| `task_batch` \| `jira_issue` \| `post_call_bundle` | required |
| `contentPreview` | Mixed | |
| `contentFull` | Mixed, required | Full payload |
| `proposedChange` | Mixed | Parsed on approve for local + CRM write-back |
| `title` | string, required | |
| `expiresAt` | Date, required | |
| `decidedBy` | ObjectId → User | |
| `decidedAt` | Date | |
| `rejectionNote` | string | |

**Index:** `{ workspaceId: 1, assignedTo: 1, status: 1 }`. Spec’s pending+expires partial index is **not** declared.

---

## 8. Integrations

### 8.1 IntegrationConnection

One connection per `(workspaceId, providerKey)`.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `providerKey` | string, required | `hubspot`, `salesforce`, `gong`, `slack`, `google_calendar`, … |
| `status` | `pending` \| `connected` \| `disconnected` \| `error` | Default `pending` |
| `externalAccountId` | string | Portal / org id |
| `encryptedAccessToken` | string | AES at rest |
| `encryptedRefreshToken` | string | |
| `tokenExpiresAt` | Date | |
| `lastSyncAt` | Date | |
| `settings` | Mixed | Cursors, channel ids, etc. |

**Index:** unique `{ workspaceId: 1, providerKey: 1 }`.

### 8.2 ExternalRecord

Provider-agnostic mapping: CRM (or other) id ↔ internal `_id`.

| Field | Type | Notes |
|-------|------|--------|
| `workspaceId` | ObjectId, required | indexed |
| `providerKey` | string, required | Spec used `provider` + `connectionId` |
| `entityType` | `deal` \| `company` \| `contact` \| `user` | required |
| `externalId` | string, required | Id in the provider |
| `internalId` | ObjectId, required | Deal / Company / User / etc. |
| `externalRevision` | string | ETag / version (spec: `externalEtag`) |
| `lastSyncedAt` | Date | |
| `metadata` | Mixed | Default `{}` |

**Indexes:** unique `{ workspaceId: 1, providerKey: 1, entityType: 1, externalId: 1 }`; `{ workspaceId: 1, entityType: 1, internalId: 1 }`.

---

## 9. Jobs and marketing

### 9.1 BackgroundJob

Global queue table (see `04-architecture.md`).

| Field | Type | Notes |
|-------|------|--------|
| `queue` | string, required | indexed; e.g. `agent-runs` |
| `name` | string, required | `run`, `ingest`, `embed`, … |
| `jobId` | string | Idempotency key; indexed |
| `payload` | Mixed, required | Includes `workspaceId` for tenant work |
| `status` | `pending` \| `processing` \| `completed` \| `failed` | Default `pending`; indexed |
| `attempts` | number | Default `0` |
| `maxAttempts` | number | Default `3` |
| `runAt` | Date | Default now; indexed |
| `lockedAt` / `lockedBy` | Date / string | Claim lock |
| `lastError` | string | |
| `completedAt` | Date | |

**Indexes:** `{ queue: 1, status: 1, runAt: 1, createdAt: 1 }`; unique `{ queue: 1, jobId: 1 }` **partial** when `jobId` is a string and status is `pending` or `processing`.

### 9.2 MarketingLead

**No `workspaceId`.**

| Field | Type | Notes |
|-------|------|--------|
| `email` | string, required | |
| `company` | string | |
| `name` | string | |
| `source` | string | Default `pricing_wizard` |
| `metadata` | Mixed | UTM, etc. |

---

## 10. Relationship sketch (implemented)

```
Workspace
  ├─ User (workspaceId nullable until join)
  ├─ WorkspaceInvite
  ├─ PipelineStage
  ├─ Company ── Deal
  │                ├─ Note, Task, DealBlocker
  │                ├─ DealParticipant, DealProject
  │                ├─ DealProductRequest, DealTeamRequest
  │                ├─ DealEvent, DealFile, DealStageChange
  │                ├─ DealMeddpicc (1:1) ── MeddpiccCitation
  │                ├─ Artifact ── ArtifactChunk
  │                ├─ AgentRun, Approval
  │                └─ ExternalRecord (entityType deal)
  ├─ Agent ── AgentRun ── Approval
  ├─ IntegrationConnection ── ExternalRecord
  └─ (payload only) BackgroundJob

User ── AuthSession, AuthExchangeCode
MarketingLead (global)
```

---

## 11. Query reminders

| Path | Filter |
|------|--------|
| Live deals / companies / notes / tasks | `{ workspaceId, deletedAt: null }` |
| Kanban | `{ workspaceId, status: 'open', deletedAt: null }` sort `stageId`, `position` |
| Artifact ingest | unique on `workspaceId + source + sourceId` |
| CRM mirror | `ExternalRecord` unique on `workspaceId + providerKey + entityType + externalId` |
| Pending approvals | `{ workspaceId, assignedTo, status: 'pending' }` |

Every handler should take `workspaceId` from **`req.tenant`**, never from the client body as the sole tenant key.

---

## 12. Spec-only collections (no Mongoose file yet)

From `docs/database.md` / architecture — **do not assume they exist** in Mongo until you add models:

| Spec collection | Intended purpose |
|-----------------|------------------|
| `process_stages` | Presales stepper (orthogonal to pipeline) |
| `deal_tags` / `tag_definitions` | Tags |
| `activity_events` / `activity_daily_rollups` | Timeline + insights (DealEvent is calendar, not this) |
| `meddpicc_history` | Large MEDDPICC versions |
| `agent_templates` / `agent_credits_ledger` | Catalog + billing (templates may be code constants) |
| `crm_*_mappings`, `crm_sync_jobs` | Stage/user/field mapping |
| `webhook_events` | 7-day idempotency TTL |
| `user_chat_preferences`, `user_chat_identity_links`, `chat_command_audit` | Chat identity |
| `deal_integration_links`, `jira_issue_links` | Slack channel / Jira |
| `insights_snapshots` | Leadership snapshots |

If you need one of these, add a model under `packages/db/src/models/` and export it from `packages/db/src/index.ts`.
