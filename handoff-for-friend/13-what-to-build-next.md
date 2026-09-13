# What to build next — friend-friendly backlog

**Date:** 2026-09-13  
**Source of truth:** [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md)  
**Rule of thumb:** Agents already exist. Most remaining work is **wiring + write-back + honesty**, not inventing a new AI platform.

This note translates the R11 work-breakdown (sections **10.1–10.9**) into a backlog you can pick up without reading every engineering spec. IDs like `10.5.1` match the WBS so you can jump back to estimates (engineer-days) when you need them.

**Team assumption in the WBS:** 1–2 engineers.

---

## The one decision that matters

**Do not start 10.8** (promised product: evaluations UI, buyer portal, LangGraph runtime, Jira/Linear write, workbench home chat) until waves **A–C** are solid.

**As of this handoff, A–C are largely done.** HubSpot/Salesforce maps and write-back, Google Calendar → `DealEvent`, deal satellite LCUD (notes/participants/projects/requests), call 404 fix, and the “AI shows up on home / blockers / approvals” slice are in the tree. Treat 10.8 as **locked** until you personally smoke A–C on a live workspace — then, and only then, open Wave F’s big tickets.

**Still out of the first ~6 weeks (WBS):** buyer portal, LangGraph, voice, forecast ML, Zoho/Pipedrive *live*, warehouse export.

---

## How to read this file

| Badge | Meaning |
|-------|---------|
| **DONE** | Shipped in code. Smoke it; don’t rebuild it. |
| **PARTIAL** | UI or API exists; the last mile is missing. |
| **TODO** | Real remaining work. |

File paths are **hints** (where to start reading), not a complete file list.

App layout reminder:

| Path | What it is |
|------|------------|
| `codebase/apps/web` | Next.js UI (`:3000`) |
| `codebase/apps/api/src/modules/` | Express API (`:4000`) |
| `codebase/packages/db` | Mongoose models |
| `codebase/packages/shared` | Zod schemas |
| `codebase/packages/integrations/crm` | CRM provider registry (HubSpot/SF live; PD/Zoho demo) |

```bash
cd codebase && pnpm dev
```

---

## Priority order (do this sequence)

Work **top to bottom**. Skip 10.8 until the A–C smoke checklist at the bottom of this file is green.

| Order | Wave | WBS IDs | Outcome | Status |
|------:|------|---------|---------|--------|
| 0 | **A now** | 10.1 | Every deal satellite is LCUD; calls don’t 404 | **DONE** (smoke) |
| 1 | **B** | 10.3 + 10.4.4–5 | AI on home, blockers, approvals | **DONE** (smoke; leftover polish in 10.3/10.4) |
| 2 | **C** | 10.2.1–10.2.6 | HubSpot / Salesforce / calendar are truthful | **DONE** (smoke) |
| 3 | **D** | 10.7.1–10.7.6 | Real team (invite email is the gap) | **PARTIAL** — next after A–C smoke |
| 4 | **E** | 10.5, 10.6 | Slack ingest + leadership / Insights NL | **TODO** — main remaining product |
| 5 | **F** | 10.2.8–9, 10.8, 10.4.3 | Extra CRMs + portal/POC + MCP handshake + LangGraph | **TODO** — after E; **10.8 last** |
| ∥ | Copy | 10.9 | Docs + marketing match shipped | **TODO** — do in parallel, cheap |

**Suggested next tickets after you smoke A–C:**

1. Invite **email** (Resend/SES) — Wave D leftover (`10.5.3` / `10.7.1`)
2. Slack **thread ingest** → `Artifact` (`10.5.1`) then deal ↔ channel (`10.5.2`)
3. Insights **NL chat** over the workspace (`10.6.5`) + win-rate honesty (`10.6.1–10.6.3`)
4. MCP **handshake + invoke** (`10.4.3`) — registry UI already stores servers as disconnected
5. Pipedrive / Zoho **live** adapters (`10.2.8–10.2.9`) — Wave F
6. Buyer portal / LangGraph / POC evaluations (`10.8`) — **only after A–C stay green**

---

## Wave A — Deal satellite CRUD + call 404 (10.1) — DONE

**Goal:** Notes, participants, product requests, team requests, and deal projects can be updated and deleted. Opening a call from the list never 404s when the row is a `DealEvent`. Hub pages `/projects` and `/requests` are real, not “coming soon.”

### DONE checklist

- [x] **10.1.1** Zod update schemas — `codebase/packages/shared/src/schemas/deal.ts`
- [x] **10.1.2** `PATCH /deals/:id/notes/:noteId` — `codebase/apps/api/src/modules/deals/handlers.ts`, wired in `deals/index.ts`
- [x] **10.1.3** `PATCH` + `DELETE` participants — `deals/handlers-participants.ts`
- [x] **10.1.4** `PATCH` + `DELETE` product requests — `deals/handlers-product-requests.ts`
- [x] **10.1.5** `PATCH` + `DELETE` team requests — `deals/handlers-team-requests.ts`
- [x] **10.1.6** `PATCH` + `DELETE` deal projects — `deals/handlers-projects.ts`
- [x] **10.1.7** `GET`/`PATCH /calls/:id` when row is `DealEvent` — `codebase/apps/api/src/modules/calls/handlers.ts`
- [x] **10.1.8** Deal tab UI (status + delete + note edit) — `codebase/apps/web/components/deals/tabs/` (`ParticipantsTab.tsx`, `ProductRequestsTab.tsx`, `ProjectsTab.tsx`, notes on overview)
- [x] **10.1.9** Workspace `/projects` — `apps/web/app/(dashboard)/projects/page.tsx` (and requests hub; confirm no “coming soon” on those routes)
- [x] **10.1.10** Agent delete in UI (`DELETE /agents/:id` already existed) — agents list/detail in `apps/web/app/(dashboard)/agents/`

**Smoke (WBS acceptance):**

- [ ] Note body can be edited
- [ ] Participant / project / product request / team request can be updated and deleted
- [ ] `/projects` and `/requests` have no “coming soon”; status can change
- [ ] Opening a call from the list never 404s when the row is a `DealEvent`
- [ ] `pnpm --filter @ai-crm/api typecheck` and `@ai-crm/web typecheck` pass

E2E hint: `codebase/apps/web/e2e/deal-crud.spec.ts`

---

## Wave B — AI on existing CRUD + approvals (10.3, 10.4.4–5) — largely DONE

**Goal:** After humans edit CRM truth, AI scoring/approvals actually show up. Don’t build new agents; **wire** the ones we have.

### DONE checklist

- [x] **10.3.2** Blocker form → `POST /ai/suggest-blocker` — `apps/api/src/modules/ai/index.ts`, `apps/web/components/deals/tabs/OverviewTab.tsx`, scoring in `apps/api/src/lib/ai-scoring.ts`
- [x] **10.3.3** Home + `GET /focus` from last `deal-focus` run — `apps/api/src/create-app.ts` (`/focus`), executor `apps/api/src/modules/agents/executors/deal-focus.ts`, home `apps/web/app/(dashboard)/home/page.tsx`
- [x] **10.3.4** Seed `post-call` on `activity.ingested` — `apps/api/src/lib/agent-events.ts`, executor `executors/post-call.ts`
- [x] **10.3.5** Approvals UI for `post_call_bundle`, `crm_field_update`, `task_batch` — `apps/web/app/(dashboard)/approvals/page.tsx`, apply logic `apps/api/src/modules/approvals/write-back.ts`
- [x] **10.3.7** Citation popover (artifact + chunk) — deal Ask on Insights tab `apps/web/components/deals/tabs/InsightsTab.tsx`, API `deals/handlers-ask.ts`, MEDDPICC `apps/api/src/lib/meddpicc-artifact-citations.ts`
- [x] **10.3.8** Atlas `artifact_chunks_vector` search — `apps/api/src/lib/artifact-chunk-search.ts`
- [x] **10.4.4** Win-loss approval `dealId` + apply note — approvals write-back + `executors/win-loss-analysis.ts`
- [x] **10.4.5** `deal_hot_alert` write-back — `executors/buying-signals.ts` + `approvals/write-back.ts`

### TODO / polish (do after D if needed; not blockers for Wave E)

- [ ] **10.3.1** After note/blocker/stage: persist sentiment + fit so the kanban stays current — start in `apps/api/src/lib/ai-scoring.ts` and deal PATCH/note handlers
- [ ] **10.3.6** MEDDPICC `inputHash` skip unchanged refresh (cost control) — `packages/db/src/models/deal-meddpicc.ts`, `executors/meddpicc-synth.ts` (hash exists; skip-if-unchanged may still be weak)

---

## Wave C — CRM truth HubSpot / SF / calendar (10.2.1–10.2.7) — largely DONE

**Goal:** Onboarding maps **real** CRM stages/owners, full sync respects those maps, `ExternalRecord` is written so incremental webhooks stick, deal PATCH/stage/close writes back, Google Calendar creates real `DealEvent`s, `Workspace.primaryCrmConnectionId` is set on connect.

### DONE checklist

- [x] **10.2.1** Live HubSpot/SF stages + owners in mapping APIs — `apps/api/src/modules/integrations-crm/handlers.ts`, onboarding UI `apps/web/app/onboarding/page.tsx`
- [x] **10.2.2** Apply `stageMappings` / `userMappings` on full HubSpot + SF sync — `apps/api/src/lib/hubspot/sync.ts`, `apps/api/src/lib/salesforce/sync.ts`
- [x] **10.2.3** Write `ExternalRecord` on full sync — model `packages/db/src/models/external-record.ts`; upserts in HubSpot/SF sync + `apps/api/src/lib/queues/crm-incremental.ts`
- [x] **10.2.4** Direct deal PATCH/stage/close → HubSpot — `apps/api/src/lib/hubspot/crm-field-write-back.ts`
- [x] **10.2.5** Salesforce Opportunity write-back — `apps/api/src/lib/salesforce/opportunity-write-back.ts`
- [x] **10.2.6** Google Calendar REST → real `DealEvent` — OAuth `apps/api/src/lib/integrations/google-calendar-oauth.ts`, queue `apps/api/src/lib/queues/google-calendar-sync.ts`, UI `apps/web/app/(dashboard)/settings/integrations/page.tsx`
- [x] **10.2.7** Set `Workspace.primaryCrmConnectionId` on connect — `packages/db/src/models/workspace.ts`, `apps/api/src/modules/oauth/handlers.ts`

**Not Wave C (stay in Wave F):**

- **10.2.8** Pipedrive OAuth + live adapter
- **10.2.9** Zoho OAuth + region + live adapter

Those two still show as **demo** in `integrations-crm/handlers.ts` (`mode: 'demo'`). Registry types already include them: `packages/integrations/crm/src/types.ts`, `registry.ts`. Spec: `codebase/docs/crm-connectors.md`.

**Smoke:**

- [ ] Connect HubSpot (or SF), map stages/owners from **live** lists, not demo rows
- [ ] Full sync imports stages/owners matching the wizard
- [ ] Incremental webhook updates an existing deal (needs `ExternalRecord`)
- [ ] PATCH deal / stage / close appears in HubSpot (and SF if that’s primary)
- [ ] Calendar events show on the deal Events tab as `DealEvent`

---

## Wave D — Auth, members, tenancy (10.7) — PARTIAL — build next

**Goal:** A second human can join the workspace without Slack-DMing a magic URL you copied from JSON.

### DONE

- [x] Invite **API** + accept-on-sign-in — `apps/api/src/modules/auth/handlers.ts` (`inviteMember`, `listInvites`, `toInviteDto` with `/sign-in?invite=`), `apps/api/src/lib/auth/invite.ts`
- [x] Change role, remove member, last-admin guard — same handlers (`LAST_ADMIN`); UI `apps/web/app/(dashboard)/settings/members/page.tsx`
- [x] Pending invites **list in UI** — members page loads `GET /workspace/invites` (this is **10.7.3**; still no email)
- [x] Model — `packages/db/src/models/workspace-invite.ts`

### TODO

- [ ] **10.7.1 / 10.5.3** **Invite email (Resend or SES)** + don’t rely on copying `inviteUrl` from the page  
  - After `WorkspaceInvite.create`, send mail with the accept link  
  - Hint: `inviteMember` in `auth/handlers.ts` currently returns 201 with URL only  
  - UI already shows `lastInviteUrl` as a fallback — keep that for local/dev
- [ ] **10.7.4** Non-admin “waiting for onboarding” (no deadlock) — joiner should not sit on the admin-only wizard forever
- [ ] **10.7.5** Enforce `manager` vs `member` on a few routes — roles exist on User; few routes actually distinguish
- [ ] **10.7.6** Per-workspace sales-process **CRUD** (not static defaults) — `apps/api/src/modules/pipeline/handlers.ts` `listSalesProcesses` still returns `DEFAULT_SALES_PROCESSES`; settings UI `apps/web/app/(dashboard)/settings/sales-process/page.tsx`
- [ ] **10.7.7** Pipeline stage PATCH from settings UI — API exists on pipeline handlers; wire remaining UI if not complete
- [ ] **10.7.8** Billing / seats / SSO — **defer** (8+ days, commercial SaaS)

**Wave D done when:**

- [ ] Admin invites `friend@…` and they get an **email**
- [ ] Clicking the link signs them into the right workspace
- [ ] Pending invites visible; role change + remove work; last admin cannot be deleted
- [ ] A member is not stuck behind admin onboarding

---

## Wave E — Chat ingest + calendar leftovers + Insights / leadership AI (10.5, 10.6) — TODO

This is the **main remaining product** after D. Calendar *live sync* is Wave C (done). Wave E is **Slack (and chat) as an *input***, plus leadership numbers that match.

### 10.5 Chat ingest (and leftover delivery)

Outbound Slack/Teams/GChat **posting** and Slack approve buttons already exist (R7/R8). Ingest of **threads as artifacts** does not.

| ID | Status | What | File hints |
|----|--------|------|------------|
| **10.5.1** | **TODO** | Slack thread ingest → `Artifact` so citations go beyond Gong | Spec: `docs/chat-channels.md` §1.5 (`ChatIngestService`). Webhooks today: `apps/api/src/modules/webhooks/slack-commands.ts`, `slack-interactions.ts`, `slack-common.ts`. Artifact model lives under `packages/db`. |
| **10.5.2** | **TODO** | Deal ↔ channel link + `deal_channel` delivery | Agent schema already has `deliveryConfig.mode: 'deal_channel'` in `packages/shared/src/schemas/agent.ts`. Delivery: `apps/api/src/lib/chat-delivery.ts`. Need a deal field / settings UI to bind Slack channel ↔ deal, then ingest + delivery both use it. |
| **10.5.3** | **TODO** | Invite email — **same as 10.7.1**; do in Wave D | `auth/handlers.ts` |
| **10.5.4** | **TODO** | Teams/GChat command + approve buttons (Slack parity) | Slack interactions are the template: `webhooks/slack-interactions.ts`. Teams/GChat APIs: `apps/api/src/lib/integrations/teams-api.ts`, `google-chat-api.ts` |
| **10.5.5** | **DONE** | `dmUserId` in agent wizard | Wizard `apps/web/app/(dashboard)/agents/new/page.tsx`; schema `packages/shared/src/schemas/agent.ts`; delivery `chat-delivery.ts` |
| **10.5.6** | **TODO** | Channel picker scopes (Teams/GChat lists empty) | Settings integrations + chat list APIs under `apps/api/src/modules/integrations-chat/` |

**10.5.1 acceptance (Slack ingest):**

- [ ] A linked Slack thread (or channel history) lands as `Artifact` rows (`slack_thread` or similar)
- [ ] Deal Ask / MEDDPICC can cite those chunks, not only Gong transcripts
- [ ] Failure modes are honest (bot not in channel, missing `channels:history`, etc.)

**10.5.2 acceptance:**

- [ ] From a deal, you can pick/link a Slack channel
- [ ] Agent `deliveryConfig.mode = deal_channel` posts there
- [ ] Ingest for that channel attaches artifacts to **that** deal

### 10.6 Insights / leadership AI

| ID | Status | What | File hints |
|----|--------|------|------------|
| **10.6.1** | **TODO** | Single win-rate definition (home vs summary vs loss) | `apps/api/src/modules/insights/handlers.ts`, `apps/api/src/modules/home/handlers.ts`, Insights UI `apps/web/app/(dashboard)/insights/page.tsx` |
| **10.6.2** | **TODO** | Render `winRateTrend` on **home** | API already returns it from insights handlers; type in `apps/web/lib/types.ts`. Home page does **not** render it yet. |
| **10.6.3** | **TODO** | Insights Loss tab = win-loss **agent** report | Agent: `executors/win-loss-analysis.ts`. Insights page still needs to surface that report, not a disconnected chart. |
| **10.6.4** | **TODO** | SQL explorer: curated views, not stub table | UI: `apps/web/app/(dashboard)/insights/sql/page.tsx`. API: `apps/api/src/modules/insights/sql.ts` still says “coming soon” and returns overview metrics. |
| **10.6.5** | **TODO** | **Workspace NL chat over deals** (not deal-only Ask) | Deal-only Ask: `deals/handlers-ask.ts` + `InsightsTab.tsx`. Need an Insights-level chat that can query **many** deals / pipeline (RAG: `artifact-chunk-search.ts`). Vision doc: `docs/future/nl-chat-automation-vision.md` |
| **10.6.6** | **TODO** | Forecast narrative / coaching cards (rules + LLM, not ML) | Home/insights stubs from R10; don’t promise ML. |
| **10.6.7** | **TODO** | Paginate / aggregate performance users | Insights performance / users tabs — scale when a real team exists (after Wave D). |

**Wave E “Insights NL” done when:**

- [ ] An exec can type a question on **Insights** (not only one deal’s Ask tab) and get an answer grounded in workspace deals + artifacts
- [ ] Home and Insights **win rate** match (one formula)
- [ ] `winRateTrend` is visible on home
- [ ] Loss tab is the win-loss agent output (or clearly “run the agent”)
- [ ] SQL explorer either runs curated views **or** the UI/docs stop pretending it’s a warehouse

---

## Wave F — Extra CRMs, MCP handshake, promised product (10.2.8–9, 10.4.3, 10.8) — TODO — last

**Gate:** A–C smoke green. Prefer finishing Wave E ingest + Insights NL before Pipedrive/Zoho/portal, unless a design partner *is* on Pipedrive/Zoho.

### Pipedrive / Zoho live (10.2.8–10.2.9)

Today they are **logos + demo discovery**, not OAuth adapters.

| ID | What | File hints |
|----|------|------------|
| **10.2.8** | Pipedrive OAuth + live adapter (~4 days) | Types: `packages/integrations/crm/src/types.ts`. Demo lists: `apps/api/src/lib/crm-demo-data.ts`, `crm-discovery-demo.ts`. Provider list: `integrations-crm/handlers.ts`. Copy HubSpot patterns: `apps/api/src/lib/hubspot/sync.ts` + OAuth in `oauth/handlers.ts`. Spec: `docs/crm-connectors.md` |
| **10.2.9** | Zoho OAuth + **region** (`accounts.zoho.com` vs `.eu`) + live adapter (~4 days) | Same as above. Store `api_domain` on the connection (doc callout in `crm-connectors.md`). |

**Done when:**

- [ ] Settings/onboarding Connect for Pipedrive/Zoho is real OAuth, not “coming soon” / demo deals
- [ ] Stage/owner mapping uses **live** CRM metadata (same as HubSpot/SF)
- [ ] Full sync writes deals + `ExternalRecord`; write-back or explicit “read-only v1” is honest in the UI

### MCP handshake (10.4.3) — Wave F / agents completeness

The **registry is a stub**: servers persist as `status: 'disconnected'`.

| Piece | Where |
|-------|--------|
| Zod | `packages/shared/src/schemas/mcp.ts` |
| CRUD API | `apps/api/src/modules/settings/handlers.ts` (`listMcpServers`, `createMcpServer`, `deleteMcpServer`) — **no handshake** |
| UI | `apps/web/app/(dashboard)/settings/mcp/page.tsx` — copy already says handshake is missing |
| Executor | `apps/api/src/modules/agents/executor.ts` — does not invoke MCP tools yet |

**10.4.3 done when:**

- [ ] Add server → handshake (initialize + tools/list) → status `connected` (or a clear error)
- [ ] Agent run can **invoke** an MCP tool (or the wizard hides MCP until that’s true)
- [ ] Disconnect/remove still works; cap 20 servers/workspace stays

Related leftover (can sit with 10.4, not 10.8):

- [ ] **10.4.1** Seed `triggerConfig` on `from-template` — `apps/api/src/modules/agents/handlers.ts` (`createFromTemplate`)
- [ ] **10.4.2** Honor `toolsConfig` **or** hide unused wizard tools — wizard `agents/new/page.tsx`
- [ ] **10.4.6** Persist objection / buying-signal tags on Deal
- [ ] **10.4.7** Product-feedback → `DealProductRequest` — executor `executors/product-feedback.ts` currently scans notes / creates approvals, not product-request rows
- [ ] **10.4.8** Post-call approve → send email (or honest “saved as note”)
- [ ] **10.4.9** Custom-agent executor (or **block** non-template slugs) — `executor.ts` switch

### 10.8 Promised product — DO NOT START until A–C solid

Marketing already talks about some of this (`apps/web/lib/marketing-content.ts`: buyer portal, four CRMs, 95% cites). **Ship honesty first (10.9)** if you cannot ship the feature.

| ID | Days | What | Why wait |
|----|------|------|----------|
| **10.8.1** | ~5 | Evaluations / POC phases UI (not title-only projects) | Needs 10.1.6 LCUD — **done**, but still a large UX product. After A–C smoke only. |
| **10.8.2** | ~2 | Pre-call briefing pack | Wants Slack/Gong ingest (10.5.1) so the pack isn’t empty |
| **10.8.3** | **10+** | **Buyer portal** (external ACL + RAG) | Biggest net-new surface. Needs 10.3.8 RAG quality. Do not start as a weekend spike. |
| **10.8.4** | ~4 | Jira/Linear write on approve | Module C; after approvals write-back is boringly reliable |
| **10.8.5** | ~2 | Workbench AI chat on `/home` | Depends on workspace NL (10.6.5) |
| **10.8.6** | **8+** | **LangGraph tool runtime** | Docs mention LangGraph (`docs/architecture.md`, `docs/agent-platform.md`) but custom graphs / HITL runtime is **not** the current executor switch. **Defer.** Honor `toolsConfig` (10.4.2) first. |

**10.8.3 buyer portal — when you *do* start:**

- [ ] External users (not workspace members) with ACL per deal/eval
- [ ] RAG over artifacts **they are allowed to see**
- [ ] No leakage across workspaces
- [ ] Marketing line “Shared buyer portal” is either shipped or removed (10.9.2)

**10.8.6 LangGraph — when you *do* start:**

- [ ] Don’t run graphs inside webhook handlers (architecture: fast ack → job)
- [ ] Custom slug agents stop being silent stubs (10.4.9)
- [ ] Timeouts: staff review warned serverless + long LangGraph (see `docs/staff-review.md`)

---

## 10.4 leftover map (agents / approvals) — mix of B done vs F polish

Use this if you’re hunting “agent gaps” rather than waves:

| ID | Status | Note |
|----|--------|------|
| 10.4.1 | TODO | `triggerConfig` on from-template |
| 10.4.2 | TODO | Honest tools in wizard |
| **10.4.3** | **TODO** | **MCP handshake + invoke** |
| 10.4.4 | DONE | Win-loss approve |
| 10.4.5 | DONE | Hot alert write-back |
| 10.4.6 | TODO | Tags on Deal |
| 10.4.7 | TODO | Agent → `DealProductRequest` |
| 10.4.8 | TODO | Post-call email vs note honesty |
| 10.4.9 | TODO | Custom executor or block slugs |

---

## 10.9 Docs + marketing honesty — P0 copy, parallel, cheap

Do this **while** D/E run. Stale 🔲 in docs is worse than a missing portal.

| ID | Status | What | File hints |
|----|--------|------|------------|
| **10.9.1** | **TODO** | Refresh `implementation-status.md` + `ai-capabilities-roadmap.md` | `codebase/docs/future/implementation-status.md` is dated **2026-09-11** and still says Salesforce / calendar / MCP as remaining — **wrong** vs this handoff |
| **10.9.2** | **TODO** | Landing: four-CRM / buyer portal / 95% cites — match **shipped** | `apps/web/lib/marketing-content.ts`, `apps/web/components/marketing/LandingPage.tsx` |
| **10.9.3** | **TODO** | Win-loss / MCP / SQL docs vs stubs | `docs/api-routes.md`, MCP settings page, `insights/sql.ts` |

**10.9 done when:**

- [ ] Implementation status says HubSpot+SF+Calendar live; Pipedrive/Zoho demo
- [ ] MCP documented as registry-only until handshake
- [ ] SQL explorer documented as stub until 10.6.4
- [ ] Buyer portal / four live CRMs **not** claimed on the landing page unless true

---

## Master checklists

### A–C smoke (required before 10.8)

- [ ] Wave A: satellite LCUD + call from list
- [ ] Wave B: suggest-blocker, home focus, approvals for post-call / CRM fields / hot alert
- [ ] Wave C: HubSpot or Salesforce map + sync + write-back; Calendar events on a deal
- [ ] Typecheck API + web

**If any of these fail, fix that — do not open 10.8 or LangGraph.**

### Build next (D → E → F)

- [ ] **Invite email** (Resend/SES) + accept link (`10.7.1` / `10.5.3`)
- [ ] Member deadlock / RBAC light (`10.7.4–10.7.5`)
- [ ] Sales-process writable (`10.7.6`)
- [ ] **Slack ingest** → Artifact (`10.5.1`)
- [ ] Deal ↔ channel + `deal_channel` (`10.5.2`)
- [ ] Channel picker scopes (`10.5.6`); Teams/GChat commands later (`10.5.4`)
- [ ] Win-rate one definition + `winRateTrend` on home (`10.6.1–10.6.2`)
- [ ] Loss tab = win-loss agent (`10.6.3`)
- [ ] **Insights NL** over workspace deals (`10.6.5`)
- [ ] SQL explorer honesty or real views (`10.6.4`)
- [ ] **MCP handshake + executor invoke** (`10.4.3`)
- [ ] Pipedrive live (`10.2.8`)
- [ ] Zoho live + region (`10.2.9`)
- [ ] Only then: evaluations UI / pre-call pack / **buyer portal** / Jira / home workbench / **LangGraph** (`10.8.x`)

### Explicitly later (WBS “out of first 6 weeks”)

- [ ] Buyer portal (`10.8.3`)
- [ ] LangGraph custom runtime (`10.8.6`)
- [ ] Voice
- [ ] Forecast **ML** (narratives `10.6.6` are rules+LLM, not this)
- [ ] Zoho/Pipedrive live (if you need a 6-week cut — they’re Wave F, not E)
- [ ] Warehouse export
- [ ] Billing / SSO (`10.7.8`)

---

## Quick “where do I click in the app?”

| You want | Route / surface |
|----------|-----------------|
| Deal satellites | Deal detail tabs |
| Calls | `/calls` → detail (must not 404) |
| Projects hub | `/projects` |
| Focus / home AI | `/home` |
| Approvals | `/approvals` |
| Members / invites | `/settings/members` |
| CRM + Calendar | `/settings/integrations` + `/onboarding` |
| MCP registry | `/settings/mcp` (disconnected until handshake) |
| Insights + SQL stub | `/insights`, `/insights/sql` |
| Deal-only Ask | Deal → Insights tab (not workspace NL yet) |

---

## Pointers

| Doc | Use |
|-----|-----|
| [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md) | Estimates, deps, original IDs |
| [`codebase/docs/wbs.md`](../codebase/docs/wbs.md) | Parent WBS |
| [`codebase/docs/crm-connectors.md`](../codebase/docs/crm-connectors.md) | How a 5th CRM should look |
| [`codebase/docs/chat-channels.md`](../codebase/docs/chat-channels.md) | Ingest + delivery architecture |
| [`codebase/docs/agent-platform.md`](../codebase/docs/agent-platform.md) | Templates vs future LangGraph |
| [`codebase/docs/future/implementation-status.md`](../codebase/docs/future/implementation-status.md) | **Stale** — refresh in 10.9.1 |
