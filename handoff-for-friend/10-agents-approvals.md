# 10 — Agents and approvals

This note covers the agent template catalog, how agents are created and triggered, the four executors called out in the product loop (deal-focus, post-call, buying-signals, win-loss), and the human-in-the-loop approval path (`parseProposedChange` → `decide` → `/approvals` UI).

All paths are under `codebase/` unless noted. HTTP prefixes are `/api/v1` on the Express API (`apps/api`).

---

## Mental model

An **agent** is a workspace-scoped Mongo document (`packages/db/src/models/agent.ts`) with:

- `templateSlug` — which executor to run
- `category` — `process` | `risk` | `signals` | `reporting`
- `isActive` — enabled flag (list + scheduler only see `true`)
- `triggerConfig` — `{ type, schedule?, event?, webhookSecret? }`
- `toolsConfig` / `deliveryConfig` / `settings`

A **run** (`AgentRun`) is created as `status: 'running'`, then a Mongo background job (`queue: agent-runs`) calls `processAgentRun` → `runByTemplate`. The executor returns `completed`, `awaiting_approval`, or `failed`. If the status is `awaiting_approval`, Slack can be pinged (`notifyPendingApprovalsSlack`). If `deliveryConfig` is set, output is also pushed to Slack / Google Chat / Teams.

**Approvals** are the write-back gate. Executors insert `Approval` rows with a `proposedChange` blob. A human (or Slack button that hits the same decide helpers) must approve before notes/tasks/deal fields change.

---

## Key files

| Area | Path |
|------|------|
| Template catalog + CRUD | `apps/api/src/modules/agents/handlers.ts` |
| Routes | `apps/api/src/modules/agents/index.ts` |
| Zod schemas | `packages/shared/src/schemas/agent.ts` |
| Agent model | `packages/db/src/models/agent.ts` |
| Executor switch | `apps/api/src/modules/agents/executor.ts` |
| Per-template logic | `apps/api/src/modules/agents/executors/*.ts` |
| Event dispatch | `apps/api/src/lib/agent-events.ts` |
| Cron ticker | `apps/api/src/lib/queues/scheduled-agents.ts` |
| Job processor | `apps/api/src/lib/queues/processor.ts`, `agent-runs.ts` |
| HMAC webhook trigger | `apps/api/src/modules/agents/webhook.ts` |
| NL draft | `apps/api/src/modules/agents/draft-from-nl.ts` |
| Seed agents | `apps/api/src/lib/seed.ts` (`AGENT_TEMPLATES`) |
| Approvals parse/apply | `apps/api/src/modules/approvals/write-back.ts` |
| Approve/reject | `apps/api/src/modules/approvals/decide.ts` |
| Approvals HTTP | `apps/api/src/modules/approvals/handlers.ts` |
| Approval model | `packages/db/src/models/approval.ts` |
| UI catalog + run | `apps/web/app/(dashboard)/agents/page.tsx` |
| Wizard | `apps/web/app/(dashboard)/agents/new/page.tsx` |
| Approvals inbox | `apps/web/app/(dashboard)/approvals/page.tsx` |

---

## Template catalog (`TEMPLATES`)

The catalog is an **in-memory constant**, not a DB table. Comment in handlers: “Opine-style template catalog — maps to `docs/AGENT_AUTOMATIONS.md`”.

`GET /api/v1/agents/templates` and `GET /api/v1/agent-templates` both return `{ templates: TEMPLATES }`.

| slug | name | category | Default trigger (`defaultTriggerConfig`) |
|------|------|----------|------------------------------------------|
| `crm-hygiene` | CRM Hygiene | process | **manual** |
| `deal-focus` | My Deal Focus | process | **schedule** `0 7 * * 1-5` (weekdays 07:00) |
| `poc-kickoff` | POC Plan Generator | process | **manual** |
| `closed-won-handoff` | Closed Won Handoff | process | **manual** |
| `post-call` | Post-Call Follow-up Draft | process | **event** `activity.ingested` |
| `meeting-summary` | Meeting Summary & Next Steps | process | **event** `activity.ingested` |
| `risk-scanner` | Risk Scanner | risk | **schedule** `0 7 * * 1-5` |
| `deal-stalling` | Deal Stalling Detection | risk | **schedule** `0 7 * * 1-5` |
| `objection-tracker` | Negotiation & Objection Tracker | signals | **event** `activity.ingested` |
| `buying-signals` | Buying Signals | signals | **event** `activity.ingested` |
| `product-feedback` | Product Feedback Capture | signals | **event** `activity.ingested` |
| `meddpicc-synth` | MEDDPICC Synthesizer | signals | **event** `activity.ingested` |
| `weekly-digest` | Weekly Reporting Digest | reporting | **schedule** `0 8 * * 1` (Monday 08:00) |
| `win-loss-analysis` | Cross-Deal Win/Loss Analysis | reporting | **manual** |

Cron strings are 5-field. The ticker evaluates them in the **workspace timezone** (`Workspace.timezone`, fallback `America/New_York`).

`risk-scanner` and `deal-stalling` share `runRiskScanner`. `post-call` and `meeting-summary` share `runPostCall`. Unknown slugs complete with `{ message: "No executor registered for template: …" }` (no throw).

Workspace seed (`seed.ts`) only instantiates four slugs: `deal-focus`, `risk-scanner`, `post-call`, `meddpicc-synth`.

---

## `createFromTemplate` vs wizard (`POST /agents`)

Two create paths. They are **not** equivalent.

### Instant create — `POST /api/v1/agents/from-template/:slug`

Handler: `createFromTemplate`.

- Looks up `TEMPLATES` by `req.params.slug`. Unknown slug → `404 Template not found`.
- Inserts an agent with template `name`, `category`, `templateSlug`, `ownerId` = current user, `isActive: true`.
- `triggerConfig` is **always** `defaultTriggerConfig(slug)` — no request body.
- `settings` gets a generated webhook secret (`ensureConnectionWebhookSecret({})`).
- Response `201`: `{ agent: { id, name, templateSlug, isActive } }` (narrow DTO).

The web app **does not currently call this endpoint**. Catalog cards on `/agents` call `selectTemplate(slug)` → navigate to `/agents/new?template=${slug}` (wizard). The from-template route is still the API used by smoke tests / scripts (`apps/api/scripts/smoke-test.ts`, e2e `agent-webhook.spec.ts`).

### Wizard — `POST /api/v1/agents`

Handler: `createAgent`. Body: `CreateAgentSchema` (`name`, optional `templateSlug`, `category`, `config`, `settings`).

The UI (`/agents/new`) is a 5-step wizard: Basics → Trigger → Prompt → Tools & Skills → Review.

- Loads templates via `GET /agents/templates`.
- Query `?template=slug` pre-fills name/category/slug.
- Optional NL draft: `POST /agents/draft-from-nl` `{ description }` (rate limit 10/hour/user). Uses Gemini if `GEMINI_API_KEY` is set, else keyword matcher; vague text → `422 NEEDS_CLARIFICATION`.
- Submit payload includes `config.triggerConfig`, `toolsConfig`, optional `deliveryConfig`.

**Trigger merge on create** (easy to miss):

```text
if incoming.type exists AND incoming.type !== 'manual'  → use incoming
else if template default type !== 'manual'              → use template defaults
else                                                    → incoming ?? defaults
```

So if the wizard user picks **manual** but the template’s default is schedule/event, the **default wins**. To force manual on those templates you must `PATCH` after create.

`PATCH /agents/:agentId` with `enabled` maps to `isActive`. Trigger/tools/delivery can be updated independently.

---

## `triggerConfig`: schedule / event / manual (+ webhook)

Schema (`TriggerConfigSchema`): `type` is `schedule` | `event` | `manual` | `webhook`, plus optional `schedule`, `event`, `webhookSecret`.

### Schedule

- Stored as `{ type: 'schedule', schedule: '<cron>' }`.
- `startScheduledAgentTicker()` in `processor.ts` polls **every 60s**.
- Query: `isActive: true`, `triggerConfig.type: 'schedule'`, non-empty `triggerConfig.schedule`.
- Skips agents with no `ownerId` (run needs `userId`).
- Invalid cron is logged and skipped.
- `shouldRunCron` uses `cron-parser` and compares previous fire to **current minute** in workspace TZ.
- In-memory dedup key `schedule:{agentId}:{YYYY-MM-DD HH:mm}` prevents double-fire in the same minute (lost on process restart; 60s tick + minute granularity is usually enough).
- Creates `AgentRun` with `triggerType: 'cron'`, then `enqueueAgentRun`.

### Event

Dispatchers in `apps/api/src/lib/agent-events.ts`. Each finds `isActive` agents in the workspace with matching `triggerConfig.type: 'event'` and `triggerConfig.event`. Requires `ownerId` + `templateSlug`. Creates run with `triggerType: 'event'` and scopes:

| Event | Payload extras | Typical templates |
|-------|----------------|-------------------|
| `activity.ingested` | `scope: { artifactId, source }` — **skips if `dealId` is null** | post-call, meeting-summary, buying-signals, product-feedback, objection-tracker, meddpicc-synth |
| `deal.created` | dealId | (any subscribed agent; wizard UI does **not** list this event) |
| `deal.stage_changed` | `fromStageId`, `toStageId` | e.g. poc-kickoff if configured |
| `deal.closed` | `outcome: won \| lost` | e.g. closed-won-handoff / win-loss if configured |

Gong ingest is the main producer of `activity.ingested` (`processIngestCall` → `dispatchActivityIngested`). Deal create/stage/close dispatch from deals handlers.

Wizard event dropdown: `activity.ingested`, `deal.stage_changed`, `deal.closed` only.

### Manual

- UI “Run” and `POST /agents/:agentId/run` `{ scope: { dealId? } }`.
- Disabled agent → `409 AGENT_DISABLED`.
- Run `triggerType: 'manual'`.
- Deal-scoped executors (post-call) **need** `dealId`; without it they skip/complete rather than fail.

### Webhook

- `type: 'webhook'` is valid in Zod; `defaultTriggerConfig` never sets it.
- HMAC endpoint in `webhook.ts` (`x-agent-signature` over raw body). Secret from `settings` or `triggerConfig`. Auto-creates a secret if missing.

---

## `activity.ingested` (why Gong matters for agents)

After a Gong webhook job upserts an `Artifact` (`source: 'gong'`), it:

1. Resolves a deal (participants → title/company match).
2. Optionally fetches transcript and enqueues embeddings.
3. Calls `dispatchActivityIngested({ workspaceId, artifactId, dealId, source: 'gong' })`.

If the artifact has **no deal**, event agents are **not** enqueued (`if (payload.dealId === null) continue`). Post-call / buying-signals that expect a deal will never fire for unmatched calls.

---

## Delete = soft disable

`DELETE /api/v1/agents/:agentId` does **not** remove the document.

- Sets `isActive = false`, saves, returns `{ agent: toAgentDto(...), deleted: true }`.
- `listAgents` filters `{ isActive: true }`, so the agent disappears from `/agents`.
- Scheduler and event dispatch also require `isActive: true`.
- `getAgent` still finds it by id (no isActive filter) — useful for debugging.
- Manual run on a disabled agent → `409 AGENT_DISABLED`.
- Webhook handler treats inactive as `404`.

Re-enable: `PATCH` `{ enabled: true }`.

`getAgentStats` counts `totalAgents` including disabled, `activeAgents` only `isActive: true`.

---

## Executors (the four the product loop cares about)

Switch: `runByTemplate` in `executor.ts`. All receive `AgentRunContext`: `{ runId, workspaceId, agentId, templateSlug, dealId?, userId }`.

### 1. `deal-focus` — `executors/deal-focus.ts`

- Loads **open** deals owned by `ctx.userId` (`deletedAt: null`).
- Scores each deal (weights aligned with `docs/agent-platform.md` §5):
  - risk 0.25 (`riskScore`)
  - blockers 0.20 (`blockerCount * 25`, clamped)
  - stall 0.20 (days since `lastActivityAt` or `updatedAt` vs 14-day stall)
  - hot 0.15 (`isHot` → 100) plus **+10 hard boost** if hot
  - amount 0.20 (relative to max amount in the set)
- Top **5** by score (tie-break `dealId`).
- Returns `status: 'completed'` with `{ focusDeals: [{ dealId, title, score, reasons }] }` — **no Approval**.
- Credits `0.2`. No Gemini.

Home dashboard (`GET /home`, `GET /home/focus`) prefers this output: latest **completed / awaiting_approval** run of the user’s active `deal-focus` agent. If none, heuristic: hot / high `riskScore` / owned deals. See `11-ai-features.md`.

### 2. `post-call` (also `meeting-summary`) — `executors/post-call.ts`

- Requires `dealId`; otherwise `completed` with `{ skipped: true }`.
- Loads deal, company, last 10 notes, last 10 open tasks, up to 2 transcripts.
- Tries Gemini JSON bundle (summary, action items, email). No key / failure → `buildTemplateBundle` (generic recap + 3 canned tasks).
- Creates **one** `Approval`:
  - `contentType: 'post_call_bundle'`
  - `assignedTo: deal.ownerId`
  - `proposedChange.type: 'post_call_bundle'` (note + tasks + email)
  - expires in 7 days
- Run status `awaiting_approval`. Credits `1.0` if Gemini, else `0`.

Approve applies the bundle (see write-back). Email is **not sent** — stored as a note prefixed `[Email draft — not sent automatically]`.

### 3. `buying-signals` — `executors/buying-signals.ts`

- Open deals (or one `dealId`).
- If transcripts exist **and** Gemini returns signals, use those (`analyzeBuyingSignalsFromTranscripts`).
- Else keyword scan of notes, tasks, and transcript text (`budget`, `urgency`, `champion`, `timeline` + strong phrases).
- Medium vs high confidence: 0.55 vs 0.85 (Gemini uses model scores).
- **Approvals only for high-confidence** (`>= 0.75`):
  - `contentType: 'slack_message'`
  - `proposedChange: { type: 'deal_hot_alert', dealId, isHot: true, tags }`
- Does **not** set `deal.isHot` until approve.
- Scan `isHot` on the result object means “any signal found”, not “already marked hot in CRM”.
- Credits `0.8` with Gemini key else `0.2`.

### 4. `win-loss-analysis` — `executors/win-loss-analysis.ts`

- Closed deals (`won`/`lost`) updated in the last **90 days** (or a single `dealId`).
- Keyword-classifies **lost-deal notes** into themes (Pricing, Competition, Timing, …).
- Builds leadership summary + recommendations (no Gemini).
- If any closed deals exist, finds an active `manager` or `admin` (sort `role: 1`) and creates an Approval:
  - `contentType: 'task_batch'`
  - `contentFull` = full report
  - `proposedChange` **only if** run was deal-scoped: `note_create` with the summary on that deal
  - expires 14 days
- Workspace-wide run with no leader user → `completed` with report in `output` only.
- Credits `0.5`. Default trigger is **manual** (not cron unless wizard/from-template is changed).

---

## Other executors (quick map)

| slug | Approvals? | Notes |
|------|------------|--------|
| `crm-hygiene` | yes (`crm_field_update`) | incomplete CRM fields |
| `meddpicc-synth` | typically writes MEDDPICC | Gemini or defaults |
| `poc-kickoff` | kickoff package | Gemini optional |
| `closed-won-handoff` | CS handoff | MEDDPICC + stakeholders |
| `objection-tracker` | signals | Gemini transcripts or keywords |
| `product-feedback` | product requests | keyword capture |
| `weekly-digest` | digest | Gemini optional |
| `risk-scanner` / `deal-stalling` | yes (`note_create` per stalled deal) | 14-day stall, `task_batch` content type |

---

## Approvals: `parseProposedChange`, `decide`, `deal_hot_alert`, `post_call_bundle`

### Document shape

`packages/db/src/models/approval.ts`:

- `status`: `pending` | `approved` | `rejected` | `expired` | `conflict`
- `contentType`: `crm_update` | `email` | `slack_message` | `task_batch` | `jira_issue` | `post_call_bundle`
- `proposedChange`: Mixed (the write-back payload)
- `assignedTo`, `expiresAt`, `decidedBy` / `decidedAt`, `rejectionNote`

`contentType` and `proposedChange.type` are **not** the same field. Buying signals use content type `slack_message` + proposed type `deal_hot_alert`. Win/loss uses `task_batch` + optional `note_create`.

### `parseProposedChange` (`write-back.ts`)

Returns `null` unless `type` and non-empty `dealId` exist.

| Incoming `type` | Parsed `ProposedChange` |
|-----------------|-------------------------|
| `deal_update` | `{ type: 'deal_update', dealId, patch }` — patch may include title, amount, stageId, isHot, sentiment, expectedCloseDate |
| `crm_field_update` | same patch plus optional `etag` |
| **`deal_hot_alert`** | **normalized to** `{ type: 'deal_update', dealId, patch: { isHot: raw.isHot !== false } }` |
| `note_create` | `{ type: 'note_create', dealId, body }` |
| **`post_call_bundle`** | note (`note_create` body), `tasks[]` `{ title, dueDate? }`, `email` `{ subject, body, to? }` |

Unknown types / missing patch → `null`. Approve then fails with `INVALID_STATE` / “Proposed change payload is invalid”.

### `applyProposedChange`

- `deal_update` / `crm_field_update`: patch deal, bump `lastActivityAt`.
- `post_call_bundle`: create recap **Note**, create each **Task** (assignee = deal owner), create second **Note** with the email draft text, bump activity. Email is never SMTP/Gong-sent.
- `note_create`: one note + activity.

### `decideApproveApproval` / `decideRejectApproval` (`decide.ts`)

Approve:

1. Missing approval → `NOT_FOUND`.
2. Already `approved` → **idempotent success** (no second write-back).
3. Any other non-`pending` → `INVALID_STATE`.
4. If `proposedChange` is present: parse → apply. For `deal_update` / `crm_field_update` also push HubSpot + Salesforce (`pushCrmFieldUpdateToHubSpot`, `pushOpportunityUpdateToSalesforce`).
5. Set `approved`, `decidedBy`, `decidedAt`.
6. Publish in-process event `approval.approved`.

Approve with **no** `proposedChange`: still marks approved (`changeApplied: false`). Win/loss workspace summaries often land here.

Reject: pending only; stores `rejectionNote`; **no** write-back. Missing/non-pending → `NOT_FOUND` (409 is not used).

HTTP:

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/approvals` | `?status=&assignee=me&dealId=`, limit 50 |
| `GET` | `/approvals/count` | pending assigned to current user (nav badge) |
| `GET` | `/approvals/:id` | includes `contentFull`, `proposedChange`, `agentName` |
| `POST` | `/approvals/:id/approve` | `{ changeApplied, writeBack }` unless idempotent |
| `POST` | `/approvals/:id/reject` | `{ note }` |

---

## UI `/approvals`

Page: `apps/web/app/(dashboard)/approvals/page.tsx`.

- Loads `GET /approvals?status=pending&assignee=me` only (you do not see others’ queues).
- Empty state: “All caught up”.
- Cards: title, content-type badge, deal title, preview summary, Approve / Reject.
- Click opens a dialog: agent name, deal link, created time, human description of `proposedChange`, JSON of proposed change or `contentFull`.
- `describeProposedChange` special-cases `deal_hot_alert` (“Mark this deal as hot…”) and `post_call_bundle` (note + N tasks + email draft as note).
- Deep link `?id=` opens the detail dialog.
- Reject asks for an optional reason (`Rejected from UI` if blank).
- After approve, toast distinguishes `changeApplied`.

Agents list, after a run hits `awaiting_approval`, toasts: “Approvals created — review in Approvals”.

---

## Run pipeline (end to end)

```text
Manual POST /agents/:id/run
  or cron ticker
  or dispatchActivityIngested / deal.* 
  or HMAC webhook
    → AgentRun { status: running }
    → enqueueJob queue=agent-runs
    → processAgentRun → runByTemplate
    → save status, creditsUsed, scope.output
    → optional chat delivery
    → if awaiting_approval: Slack notify
```

Disabled/deleted (soft) agents never enter the ticker or event loops.

---

## Gotchas for the next engineer

1. **List hides disabled agents.** Soft-delete is the only delete. Stats `totalAgents` still includes them.
2. **Wizard “manual” can be overwritten** by template schedule/event defaults on `POST /agents`.
3. **UI catalog goes to the wizard**, not `POST /from-template/:slug`. Instant create is API-only.
4. **`activity.ingested` requires a resolved deal.** Unmatched Gong calls never fire post-call / buying-signals.
5. **`deal_hot_alert` is not a persistable ProposedChange type** — parse maps it to `deal_update` + `isHot`.
6. **Post-call email is a note**, not a send.
7. **Home focus list is not live scoring** — it is the last `deal-focus` run output (see next doc).
8. Event `deal.created` exists in the API but is missing from the wizard event dropdown.
