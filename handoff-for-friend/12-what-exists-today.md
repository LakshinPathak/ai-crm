# What exists today — honest inventory (2026-09-13)

**Audience:** a teammate picking up AI CRM after R11 waves **A–D** plus review fixes.  
**Code pin:** `4ad133f` (Ship deal satellite CRUD, CRM write-back, and team invites) and `e11b0ca` (Fix review bugs in scoring, invites, CRM sync, and e2e).  
**Product code:** `codebase/` (Next.js web `:3000` + Express API `:4000` + MongoDB).  
**Planning sources:** [`codebase/docs/r11-wbs.md`](../codebase/docs/r11-wbs.md), [`codebase/docs/wbs.md`](../codebase/docs/wbs.md), [`codebase/docs/future/implementation-status.md`](../codebase/docs/future/implementation-status.md).

This file is an **inventory of shipped behavior**, not a wish list. Status labels mean:

| Label | Meaning in this repo |
|-------|----------------------|
| **Working** | API + UI exist, the intended path works with real data when credentials/env are set. Gaps are operational (keys, scopes), not missing code. |
| **Partial** | Real code, but a material path is missing, heuristic, demo-fallback, or UI-incomplete. Do not demo as “done.” |
| **Stub / demo** | Route or page exists; it stores config, returns canned metrics, or completes with a no-op message. |
| **Not started** | No product surface a user can complete. Types/logos/docs do not count. |

**Do not trust older status docs blindly.** `implementation-status.md` is still dated **2026-09-11** (v1.3) and still lists Salesforce and calendar as not started. `wbs.md`’s “Implementation status (2026-09-11)” table is similarly stale after R10–R11. Prefer this file + the two commits above.

---

## Snapshot after waves A–D

R11’s rule was: finish **CRUD + CRM truth** before large new AI. Waves A–D did that slice. Waves **E–F** (chat ingest, leadership AI depth, Pipedrive/Zoho live, buyer portal) were explicitly **out of** this cut.

| Wave | WBS IDs | What actually landed |
|------|---------|----------------------|
| **A** | 10.1 | Deal satellite LCUD (notes, participants, projects, product/team requests). Call detail resolves `DealEvent` rows (no more 404). Agent delete in list/detail UI. `/projects` and `/requests` hub pages update status (no “coming soon”). |
| **B** | 10.3 + 10.4.4–5 | Home focus can come from the latest `deal-focus` run. Blocker form can call `POST /ai/suggest-blocker`. Approvals apply `post_call_bundle`, `crm_field_update`, `deal_hot_alert` / `deal_update`. Win-loss approval requires `dealId`. Scoring after note/blocker writes was tightened in `e11b0ca` (no lost-update score clobber). |
| **C** | 10.2.1–10.2.6 | Live HubSpot (and Salesforce-specific sync/write-back) stage/owner mapping when tokens exist; mappings applied on full sync; `ExternalRecord` written; HubSpot + Salesforce opportunity PATCH on approve; Google Calendar REST → `DealEvent`; `Workspace.primaryCrmConnectionId` set on first CRM connect. |
| **D** | 10.7.1–10.7.6 (partial) | Invite **records** + accept via `?invite=` on sign-in/sign-up + OAuth cookie; pending invites UI; change role / remove member; last-admin guard. **Invite email is not sent.** Sales-process settings UI is still **read-only**. |
| Review | `e11b0ca` | Invite links honored through Google OAuth; HubSpot/calendar matching tightened; Playwright `deal-crud.spec.ts` covers notes PATCH, blockers, home, approvals, invite APIs. |

**Still wave E/F (not this cut):** Slack/Teams thread ingest into `Artifact`, deal↔channel delivery, Resend/SES invites, SQL as real views, workspace NL chat, evaluations/POC phases, buyer portal, Jira/Linear, LangGraph, Zoho/Pipedrive live OAuth adapters.

---

## Master table (all named surfaces)

| Area | Working | Partial | Stub / demo | Not started |
|------|---------|---------|-------------|-------------|
| **Deals CRUD** | Core deal create/read/update/delete, board, list, search, stage move, close | Win/loss close fields vs CRM close parity | — | Native mobile |
| **Satellites** | Notes, tasks, blockers (create/resolve), participants, projects, product requests, team requests LCUD; hub `/projects` `/requests` | Files = URL links only (no blob store); blockers have no full PATCH of title/body | — | Evaluations as phased POC (title-only “projects” today) |
| **Calls** | List + detail for `Artifact` (Gong) **and** `DealEvent`; PATCH deal-link | Calendar-backed rows have **no transcript**; list prefers artifacts and only falls back to events if **zero** artifacts | Demo empty list `source: 'demo'` | Zoom/Chorus ingest |
| **CRM** | HubSpot OAuth, live list stages/owners when token, full sync + mappings + ExternalRecord, write-back on approve | Salesforce: live **sync + opportunity write-back**, but generic `CrmConnector` registry still live-HubSpot **or demo** for discovery; one “connected” CRM at a time | Pipedrive, Zoho: catalog + demo import | Pipedrive/Zoho OAuth + live adapters (10.2.8–9) |
| **Calendar** | Google Calendar OAuth, sync job, upsert `DealEvent` type `meeting` | Title-match to **open** deals only (min 8 chars; exact or unique contains); unmatched events dropped; no Outlook | — | Calendar **invite create** / write-back |
| **Agents** | 14 templates, wizard, from-template `triggerConfig`, cron, event triggers, runs, delete UI, NL draft | Custom / unknown slug executor returns a **completed no-op** message; wizard tools not fully honored at runtime | MCP tools unused | LangGraph custom runtime |
| **Approvals** | Queue UI; local apply; HubSpot + Salesforce field write-back; Slack interactive + `/approve` | `post_call_bundle` email saved as **note** (“not sent”); `task_batch` content types exist; Jira enum unused | — | Jira/Linear write on approve |
| **Members** | List, invite record, pending list, role PATCH, remove, last-admin, invite query on auth | Copy-paste invite URL; no email; users cannot join a **second** workspace | — | Billing, seats, SSO; full `manager` vs `member` route matrix |
| **Marketing** | Landing, pricing, product, why, about, blog index + `[slug]`; hero copy admits HubSpot/SF live, Pipedrive/Zoho demo | Some inner `marketing-content.ts` strings still list four-CRM OAuth / buyer portal as if product | — | CMS/MDX authoring |
| **MCP** | Settings CRUD persist on `Workspace.settings.mcpServers` | Status always **disconnected**; UI says handshake not built | Registry only | Connect, tools/list, executor invoke (10.4.3) |
| **SQL explorer** | Page + `POST /insights/sql` with SELECT-only validation | — | Always `stub: true` + workspace metric rows; query text ignored beyond SELECT check | Curated Mongo/SQL views (10.6.4) |
| **Buyer portal** | — | Marketing mentions + About “roadmap, not shipping” | — | External ACL + RAG (10.8.3) |
| **Chat ingest** | Slack/Teams/GChat **OAuth**, **outbound** post, Slack slash `/focus` `/deal` `/approve`, Slack approve buttons | Channel list APIs exist but empty without scopes; `deal_channel` delivery mode in schema | — | Thread → `Artifact`; deal↔channel link (10.5.1–2) |

---

## Deals CRUD

**Working.** This is the oldest mature surface (WBS 2.x, R4–R5, responsive R7.1).

You can create, list, board-filter, search, open detail, PATCH fields, move stage (`PATCH /deals/:id/stage`), close (`POST /deals/:id/close`), and soft-delete. Kanban shows sentiment, hot, blockers, MEDDPICC completeness. Accounts (`/accounts`) have company CRUD and linked deals.

**Partial.** Direct deal PATCH / stage / close does **not** always push HubSpot/Salesforce by itself. Split-brain is reduced **on approval apply** (`crm_field_update` / `deal_update` → HubSpot properties + Salesforce Opportunity fields). A seller who only drags a card in-app may still diverge from CRM until an agent/approval or a later sync. Gong/CRM webhooks can update deals incrementally **if** `ExternalRecord` exists (R11 C wrote those on full sync).

**Not a stub.** Demo seed still populates a workspace so the product is usable without a CRM. That is seed data, not a fake deals API.

Playwright: `apps/web/e2e/deal-crud.spec.ts` (added in `e11b0ca`) hits notes PATCH, blockers, home, approvals, and invite APIs via `dev-login`.

---

## Deal satellites (tabs + hub pages)

Deal detail is a tabbed record. After wave A, the “satellite” collections that used to be create-only are LCUD:

| Satellite | List | Create | Update | Delete | UI |
|-----------|------|--------|--------|--------|-----|
| Notes | yes | yes | `PATCH .../notes/:noteId` body | yes | Notes tab edit |
| Tasks | yes | yes | PATCH | yes | Tasks tab |
| Blockers | yes | yes | **resolve** PATCH only | — | Overview + badges |
| Participants | yes | yes | role/email | yes | Participants tab |
| Projects | yes | yes | status/title | yes | Projects tab + `/projects` |
| Product requests | yes | yes | status/priority/title | yes | Product requests tab + `/requests` |
| Team requests | yes | yes | status/assignee | yes | Team requests tab + `/requests` |
| Files | yes | URL metadata | **no PATCH** | yes | File center — link, not upload |
| Events | GET `/deals/:id/events` | via calendar/Gong jobs | — | — | Events tab read-only |
| Activity | GET activity | implicit | — | — | Activity tab |
| Plan / MEDDPICC | GET + refresh SSE | — | field lock PATCH | — | Overview / plan |
| Insights / Ask | GET summary; `POST /deals/:id/ask` | — | — | — | Insights tab Q&A |

**Working:** notes through team requests, plus hub pages. `/projects` and `/requests` load the first page of deals (`limit=20`) and fan out per-deal GETs — fine for demo workspaces, **not** a workspace-wide index.

**Partial:** files are bookmarks (`name` + `url`). Blockers are “open / resolve,” not full edit. Product-feedback **agent** still scans notes with regex and opens a `task_batch` approval; it does **not** insert `DealProductRequest` rows (WBS 10.4.7 still open).

**Stub:** `StubTab.tsx` remains as a helper; the former “coming soon” hub copy is gone.

**Not started:** Evaluations / POC **phases** (10.8.1). “Projects” are titled status rows, not prerequisite → execution → outcome workflows that marketing still describes in `BUILDING_BLOCKS`.

---

## Calls

**Working (the 10.1.7 bug).** Before R11, `/calls` could list a `DealEvent` id and `/calls/:id` only looked up `Artifact`, hence 404. Today `getCallDetail` / `patchCall` try Artifact first, then `DealEvent` with `type: 'call'`. Relinking to another deal works for both; unlinking is allowed on artifacts but **rejected** on calendar/call events (“must stay linked to a deal”).

**Partial.** `listCalls` returns Artifact rows whenever **any** call artifacts exist and **does not merge** DealEvents in that workspace. Gong-heavy tenants will not see calendar-as-call in the same list. Event-backed details have empty transcript. Linking accuracy is still heuristic (title match) plus a manual picker on the call page.

**Stub / demo.** Empty workspace: `{ source: 'demo', calls: [] }` — not fake transcripts.

**Not started.** Zoom, Chorus (settings still `coming_soon`), voice bots.

Gong ingest (webhook → transcript → chunks → embed worker) remains **working** from R7–R8 when Gong credentials exist. That is the real call corpus for MEDDPICC and Ask.

---

## CRM

Four logos appear everywhere. Two providers are live-shaped; two are demo.

**HubSpot — Working (with env).** OAuth (or private app token), connect sets `primaryCrmConnectionId` if unset, onboarding maps **live** stages/owners when the HubSpot connector has a token (`packages/integrations/crm` HubSpot adapter). Full sync applies `stageMappings` / `userMappings`, upserts companies/deals, writes `ExternalRecord`. Incremental CRM queue/webhooks depend on those records. On approval, `pushCrmFieldUpdateToHubSpot` PATCHes mapped properties (stage skipped if unmapped).

**Salesforce — Partial / working-sync.** Dedicated `lib/salesforce/sync.ts` (SOQL opportunities, mappings, ExternalRecord) and `opportunity-write-back.ts` are real. OAuth + instance URL live in R10. **However** `resolveCrmConnector()` only returns the live HubSpot adapter when `mode === 'live'` and a HubSpot token exists; **everyone else including live Salesforce discovery falls through to `DemoCrmConnector`.** Onboarding stage/owner lists for Salesforce can therefore be **demo lists** unless a Salesforce-specific code path is used. Treat SF as “sync + write-back exist; generic CRM discovery is not fully live-parity.”

**Pipedrive / Zoho — Stub / demo.** Catalog entries, demo records, optional `ZOHO_CLIENT_ID` flipping a connection into a misleading `live` **mode flag** without a live adapter. Connect without OAuth imports sample CRM data. WBS 10.2.8–9 not started.

**Partial globally.** Only one CRM connection stays `connected` (connect disconnects others). Write-back is **approval-gated**, which matches marketing (“nothing writes without approval”) — it is not silent bidirectional sync. Pipedrive types exist in `CrmProvider` only.

---

## Calendar

**Working path:** Settings → Google Calendar connect → OAuth → `POST .../calendar/google_calendar/sync` → job `google-calendar-sync` lists primary calendar (`timeMin` −7d, `timeMax` +60d, max 100 events) and upserts `DealEvent` (`source: google_calendar`, `type: meeting`, `externalId`). Deal Events tab will show matched meetings.

**Partial:** `matchDeal` requires title length ≥ 8, exact title match **or** exactly one open-deal title contained in the summary. Unmatched events are counted and **dropped**. Review fix `e11b0ca` tightened that matching; it is still not attendee- or conference-id linking. No create-event, no Outlook, no `deal_channel` calendar invites.

---

## Agents

**Working.** Templates (deal-focus, post-call / meeting-summary, MEDDPICC synth, CRM hygiene, buying-signals, objection-tracker, product-feedback, weekly-digest, win-loss, POC kickoff, closed-won-handoff, risk-scanner / deal-stalling, etc.), `/agents/new` wizard, `POST /from-template/:slug` seeds `triggerConfig`, cron ticker, `activity.ingested` / `deal.created` / `deal.stage_changed` / `deal.closed`, per-agent webhook, runs timeline, **delete** in UI (API existed earlier). NL `draft-from-nl` maps phrases onto template slugs. Delivery posts to Slack / Teams / Google Chat when connected.

**Partial.** `runByTemplate` default: `{ message: 'No executor registered for template: …' }` with **status completed** — looks successful, does nothing (10.4.9). Wizard `toolsConfig` is stored; the executor does not load MCP or arbitrary tools. `dmUserId` remains a leftover. Home focus: if an active `deal-focus` agent owned by the user has a completed run with `focusDeals`, those ids drive `/home`; else heuristics (hot / risk / owner).

**Stub.** MCP as agent tools: none.

**Not started.** LangGraph tool runtime (10.8.6), custom graph authoring.

---

## Approvals

**Working.** `/approvals` queue; decide approve/reject; Slack buttons + `/approve [id]`. `applyProposedChange` handles `deal_update`, `crm_field_update`, `note_create`, `post_call_bundle` (note + tasks + **email draft note**). `deal_hot_alert` maps to `isHot`. After local apply, HubSpot and Salesforce write-back run for field updates (`e11b0ca` also tightened decide/write-back). Win-loss analysis now carries `dealId` so note apply does not fail.

**Partial.** Post-call email is explicitly `[Email draft — not sent automatically]` (10.4.8 not done). Product-feedback / risk scanner use `task_batch` as **contentType** on the approval document; `parseProposedChange` does not implement a `task_batch` **proposedChange.type** — those payloads must still look like notes/tasks/deal_update to apply. `jira_issue` is an enum value only.

**Not started.** Jira/Linear (10.8.4), sending real mail/Slack as the “send follow-up” action.

---

## Members, auth, tenancy

**Working.** Google OAuth + JWT + refresh cookies; `POST /auth/dev-login` for local/E2E; workspace create + seed; `GET /workspace/members`; admin invite creates `WorkspaceInvite` (7-day TTL) with `inviteUrl` `/sign-in?invite=<id>`; `e11b0ca` stores invite on OAuth cookie and `acceptPendingWorkspaceInvite` on session; pending list; PATCH role; DELETE member (deactivate, clear workspaceId); cannot remove self; cannot demote/remove last admin.

**Partial.** Toast copy is honest: **“email is not sent yet.”** No Resend/SES (10.5.3 / 10.7.1 email). One user email cannot belong to two workspaces (`USER_IN_OTHER_WORKSPACE`). `requireAdmin` protects member mutations; a full `manager` vs `member` matrix on deals/insights is not done (10.7.5). Non-admin “waiting for onboarding” deadlock fix (10.7.4) is only as good as current onboarding gates — do not assume every joiner path is grilled.

**Sales process (10.7.6–7):** `GET /pipeline/sales-processes` **read-only UI**. `PATCH /pipeline/stages/:stageId` exists for admins but settings UI does not edit. Not “per-workspace sales-process CRUD.”

**Not started.** Billing, seats, SSO (10.7.8). Clerk was in the original WBS; the app uses Google + JWT.

---

## Marketing

**Working as a site.** Routes: `/`, `/pricing`, `/product`, `/product/[slug]`, `/why`, `/about`, `/blog`, `/blog/[slug]`. Responsive, shadcn, pastel chrome from a prior commit. R11 10.9.2 **partially** landed: `LandingHero` badge “HubSpot & Salesforce connectors live”; subtitle says Pipedrive/Zoho demo until OAuth; citations “when we have them”; About says buyer portal is roadmap.

**Partial / still overselling.** `apps/web/lib/marketing-content.ts` still includes buyer portal as an MVP feature card, four-CRM OAuth in places, POC phase copy, “auto-synced from HubSpot, Salesforce, Pipedrive, or Zoho.” Pricing page is tighter (“HubSpot and Salesforce live today · Pipedrive and Zoho in demo”). Treat marketing as **mixed honesty** — hero/about/pricing first, inner feature grids second.

**Stub.** Blog is static slugs, not a CMS.

**Not started.** Buyer portal product. Warehouse export (copy already says roadmap).

---

## MCP

**Stub / registry only.** `/settings/mcp` lists, adds (cap 20), deletes. Zod schema in `packages/shared`. New rows always `status: 'disconnected'`. Alert: handshake not added. Executor never calls these URLs. This is WBS 10.4.3 unfinished, despite R10 “MCP settings stub.”

---

## SQL explorer

**Stub / demo.** `/insights/sql` looks like an analyst console. API rejects non-SELECT / multi-statement / DML keywords, then **ignores the SQL** and returns `buildWorkspaceMetricsRows` (members, open pipeline, win_rate_pct, etc.) with `stub: true` and message “SQL explorer is coming soon.” Useful as a metrics peek; **not** a query engine. 10.6.4 not started.

---

## Buyer portal

**Not started.** No external auth, no ACL, no shared thread, no buyer-facing RAG. Largest 10.8 item (~10+ days in WBS). Do not confuse deal File Center links or Ask-on-deal with a portal.

---

## Chat ingest (vs chat **delivery**)

People mix these up.

**Working — delivery and commands.** Slack, Teams, Google Chat OAuth; `deliverAgentOutput` posts; Slack interaction payload approve/reject; slash `/focus`, `/deal`, `/approve`. That is **outbound** and **command** UX.

**Partial — pickers.** Channel list helpers exist; without bot scopes they return empty arrays (R9 leftover). `deliveryConfig.mode` includes `deal_channel` in Zod; ingest linking is not built.

**Not started — ingest.** No Slack thread (or Teams/GChat) → `Artifact` pipeline (10.5.1). Citations beyond Gong/notes/calendar-text are thin. Deal-channel routing (10.5.2) unused.

Gong remains the only serious **inbound** conversation corpus.

---

## Adjacent surfaces (so you do not over-claim)

| Surface | Honest status |
|---------|----------------|
| MEDDPICC SSE + human lock | **Working** (needs Gemini or heuristic). Citation popover / chunk grounding still **partial** (R9 WS-4). |
| `POST /deals/:id/ask` | **Partial**: retrieve chunks + Gemini or fallback string; Insights tab UI exists. Not workspace-wide NL chat (10.6.5). |
| Home forecast KPI | **Partial**: extra cards; can be stub-flagged; must not break `/me`+`/home` (R10 review). |
| Insights performance / funnel / loss / users | **Working** charts on Mongo aggregates. Loss tab is **not** guaranteed to be the win-loss **agent** report (10.6.3). Activity sub-tabs still “coming soon” in places. |
| Forecast ML / coaching cards | **Not started** (rules stub at most). |
| Embed worker / Atlas vectors | **Partial**: worker exists; production Atlas index is ops, not guaranteed on every laptop. |
| CI / E2E | **Working** typecheck + Playwright in CI; `e11b0ca` made CRUD e2e runnable. Visual regression not started. |
| Beta deploy | Checklist in `deploy-beta.md`; live URL/DNS is **ops**, not a feature. |
| HubSpot UI extension `src/` | Separate HubSpot project; not the Next app. |

---

## How this maps to `r11-wbs.md` checkboxes

Wave A acceptance from the WBS, as of these commits:

- [x] Note body can be edited  
- [x] Participant / project / product request / team request update + delete  
- [x] `/projects` and `/requests` without “coming soon”; status can change  
- [x] Opening a call from the list does not 404 when the row is a `DealEvent` (with the list-source caveat above)  
- [ ] Do not assume typecheck was re-run in this handoff note — verify with `pnpm --filter @ai-crm/api typecheck` and `@ai-crm/web typecheck`

Open on purpose: 10.2.8–9, 10.4.3, 10.4.8 send-email, 10.5.*, 10.6.4–6, 10.7.1 **email**, 10.7.5–8, 10.8.*, remaining 10.9 copy in `marketing-content.ts`.

---

## What to demo vs what to apologize for

**Safe demo (keys depending):** Google sign-in or dev-login → seed or HubSpot sync → kanban → deal tabs LCUD → Gong call detail → MEDDPICC refresh → agent from template → approval apply → HubSpot/SF field change → Calendar meeting on Events tab → members invite **link** → SQL page (say “metrics stub”) → MCP page (say “address book only”).

**Do not demo as shipped:** buyer portal, four live CRMs, SQL against arbitrary collections, MCP tools in an agent run, Slack thread citations, invite email arriving in inbox, POC evaluation phases, LangGraph custom agents, automatic follow-up email send.

**Docs debt:** refresh `implementation-status.md` (10.9.1) so the next person does not think Salesforce and calendar are still “not started.”

---

## File cheat sheet

| Concern | Start here |
|---------|------------|
| Deal LCUD | `apps/api/src/modules/deals/index.ts` + `components/deals/tabs/*` |
| Calls 404 fix | `apps/api/src/modules/calls/handlers.ts` |
| CRM sync / maps | `lib/hubspot/sync.ts`, `lib/salesforce/sync.ts`, `integrations-crm/handlers.ts` |
| Write-back | `modules/approvals/write-back.ts`, `lib/hubspot/crm-field-write-back.ts`, `lib/salesforce/opportunity-write-back.ts` |
| Calendar | `lib/queues/google-calendar-sync.ts` |
| Members | `modules/auth/handlers.ts`, `settings/members/page.tsx` |
| MCP stub | `modules/settings/handlers.ts`, `settings/mcp/page.tsx` |
| SQL stub | `modules/insights/sql.ts` |
| Agent no-op | `modules/agents/executor.ts` `default` branch |

That is the product as of **2026-09-13**: a real presales CRM core with live HubSpot (and substantial Salesforce) wiring, honest-enough marketing on the hero, and several **named** stubs (SQL, MCP, Pipedrive/Zoho, buyer portal, chat ingest) that must stay labeled until waves E–F.
