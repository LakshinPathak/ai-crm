# R11 WBS — Remaining product (CRUD first, then AI)

**Version:** 1.0  
**Date:** 2026-09-13  
**Parent:** [`wbs.md`](wbs.md) · audit from 10 parallel reviews  
**Rule:** Finish **10.1–10.2** (CRUD + CRM truth) before large new AI. Agents already exist; most gaps are **wiring + write-back**.

**Team assumption:** 1–2 engineers. Estimates in engineer-days.

```
10.0 Remaining product (R11+)
├── 10.1 Deal satellite CRUD + call 404          ← start now
├── 10.2 CRM truth (maps, write-back, calendar)
├── 10.3 AI on existing CRUD
├── 10.4 Agents / approvals completeness
├── 10.5 Chat ingest + calendar live
├── 10.6 Insights / leadership AI
├── 10.7 Auth, members, tenancy
├── 10.8 Promised product (POC / portal)
└── 10.9 Docs + marketing honesty
```

---

## 10.1 Deal satellite CRUD + call 404 (P0)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.1.1 | Zod update schemas: note, participant, project, product/team request | 0.25 | — | `packages/shared/src/schemas/deal.ts` |
| 10.1.2 | `PATCH /deals/:id/notes/:noteId` | 0.25 | 10.1.1 | Body edit |
| 10.1.3 | `PATCH` + `DELETE` participants | 0.5 | 10.1.1 | Role/email edit; remove |
| 10.1.4 | `PATCH` + `DELETE` product requests | 0.5 | 10.1.1 | Status/priority/title |
| 10.1.5 | `PATCH` + `DELETE` team requests | 0.5 | 10.1.1 | Status/assignee |
| 10.1.6 | `PATCH` + `DELETE` deal projects | 0.5 | 10.1.1 | Status/title |
| 10.1.7 | `GET`/`PATCH /calls/:id` when row is `DealEvent` (fix 404) | 0.5 | — | List → detail works |
| 10.1.8 | Deal tab UI: status select + delete on projects/requests/participants; note edit | 1 | 10.1.2–6 | Tabs are full LCUD |
| 10.1.9 | Workspace `/projects` + `/requests`: drop “coming soon”; status update | 0.5 | 10.1.4–6 | Hub pages are real |
| 10.1.10 | Agent delete in UI (`DELETE /agents/:id` already exists) | 0.25 | — | List/detail |

---

## 10.2 CRM truth (P0)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.2.1 | Live HubSpot/SF stages + owners in mapping APIs (stop demo lists) | 1.5 | — | Onboarding maps real CRM |
| 10.2.2 | Apply `stageMappings` / `userMappings` on **full** HubSpot + SF sync | 1.5 | 10.2.1 | Import matches wizard |
| 10.2.3 | Write `ExternalRecord` on full sync (webhook incremental depends on it) | 1 | 10.2.2 | Incremental updates stick |
| 10.2.4 | Direct deal PATCH/stage/close → HubSpot (or always via approval) | 2 | 10.2.2 | No split-brain |
| 10.2.5 | Salesforce Opportunity write-back | 2 | 10.2.4 | SF parity for fields |
| 10.2.6 | Google Calendar REST → real `DealEvent` | 2 | — | Events tab is live |
| 10.2.7 | Set `Workspace.primaryCrmConnectionId` on connect | 0.25 | — | Schema used |
| 10.2.8 | Pipedrive OAuth + live adapter | 4 | 10.2.1 | Third live CRM |
| 10.2.9 | Zoho OAuth + region + live adapter | 4 | 10.2.1 | Fourth live CRM |

---

## 10.3 AI on existing CRUD (P1 — after 10.1)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.3.1 | After note/blocker/stage: persist sentiment + fit (`ai-scoring`) | 1 | 10.1 | Kanban stays current |
| 10.3.2 | Blocker form → `POST /ai/suggest-blocker` | 0.5 | — | API used |
| 10.3.3 | Home + `GET /focus` from last `deal-focus` run | 1 | — | Agent output on home |
| 10.3.4 | Seed `post-call` agent on `activity.ingested` | 0.5 | — | Gong → approval draft |
| 10.3.5 | Approvals UI for `post_call_bundle`, `crm_field_update`, `task_batch` | 1.5 | 10.3.4 | Humans can act |
| 10.3.6 | MEDDPICC `inputHash` skip unchanged refresh | 1 | — | Cost control |
| 10.3.7 | Citation popover (artifact + chunk) | 1.5 | — | Trust UX |
| 10.3.8 | Atlas `artifact_chunks_vector` ops + embed reliability | 1 | — | RAG quality |

---

## 10.4 Agents / approvals completeness (P1)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.4.1 | Seed `triggerConfig` on `from-template` | 0.5 | — | Cron/events without extra wizard |
| 10.4.2 | Honor `toolsConfig` **or** hide unused wizard tools | 1 | — | Honest UI |
| 10.4.3 | MCP: connect/handshake + invoke from executor | 3 | — | Registry is real |
| 10.4.4 | Win-loss approval `dealId` + apply note | 0.25 | — | Approve works |
| 10.4.5 | `deal_hot_alert` write-back | 0.5 | — | Hot flag persists |
| 10.4.6 | Persist objection / buying-signal tags on Deal | 1 | — | Searchable signals |
| 10.4.7 | Product-feedback → `DealProductRequest` | 0.5 | 10.1.4 | Agent → CRUD |
| 10.4.8 | Post-call approve → send email (or honest “saved as note”) | 1.5 | 10.3.5 | Delivery |
| 10.4.9 | Custom-agent executor (or block non-template slugs) | 1 | — | No silent stub |

---

## 10.5 Chat ingest + calendar (P1)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.5.1 | Slack thread ingest → `Artifact` | 3 | — | Citations beyond Gong |
| 10.5.2 | Deal ↔ channel link + `deal_channel` delivery | 2 | 10.5.1 | DeliveryConfig used |
| 10.5.3 | Invite email (Resend/SES) + pending-invites UI | 1.5 | 10.7 | Team join works |
| 10.5.4 | Teams/GChat command + approve buttons | 2 | — | Slack parity |
| 10.5.5 | `dmUserId` in agent wizard | 0.5 | — | R9 leftover |
| 10.5.6 | Channel picker scopes (Teams/GChat lists empty) | 1 | — | Picker usable |

---

## 10.6 Insights / leadership AI (P2)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.6.1 | Single win-rate definition (home vs summary vs loss) | 0.5 | — | Exec numbers match |
| 10.6.2 | Render `winRateTrend` on home | 0.25 | 10.6.1 | Unused field used |
| 10.6.3 | Insights Loss tab = win-loss **agent** report | 1.5 | 10.4.4 | Leadership AI surface |
| 10.6.4 | SQL explorer: curated views, not stub table | 3 | — | Power users |
| 10.6.5 | Workspace NL chat over deals (not deal-only Ask) | 4 | 10.3.8 | Insights Q&A |
| 10.6.6 | Forecast narrative / coaching cards (rules + LLM) | 2 | 10.6.2 | Not ML yet |
| 10.6.7 | Paginate / aggregate performance users | 1 | — | Scale |

---

## 10.7 Auth, members, tenancy (P1 for beta teams)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.7.1 | Invite email + accept link | 1.5 | — | Real invites |
| 10.7.2 | Change role, remove member, last-admin guard | 1 | 10.7.1 | Member CRUD |
| 10.7.3 | Pending invites list UI | 0.5 | 10.7.1 | Admin visibility |
| 10.7.4 | Non-admin “waiting for onboarding” (no deadlock) | 0.5 | — | Joiners unblocked |
| 10.7.5 | Enforce `manager` vs `member` on a few routes | 1.5 | — | RBAC real |
| 10.7.6 | Per-workspace sales-process CRUD (not static defaults) | 2 | — | Settings writable |
| 10.7.7 | Pipeline stage PATCH from settings UI | 0.5 | 10.7.6 | API already exists |
| 10.7.8 | Billing / seats / SSO | 8+ | — | Commercial SaaS (defer) |

---

## 10.8 Promised product (P2 — do not start until 10.1–10.3)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.8.1 | Evaluations / POC phases UI (not title-only projects) | 5 | 10.1.6 | Marketing “Evaluations” |
| 10.8.2 | Pre-call briefing pack | 2 | 10.5.1 | Product copy |
| 10.8.3 | Buyer portal (external ACL + RAG) | 10+ | 10.3.8 | Biggest net-new |
| 10.8.4 | Jira/Linear write on approve | 4 | 10.4 | Module C |
| 10.8.5 | Workbench AI chat on `/home` | 2 | 10.6.5 | Building-block copy |
| 10.8.6 | LangGraph tool runtime | 8+ | 10.4.2 | Defer |

---

## 10.9 Docs + marketing honesty (P0 copy, parallel)

| ID | Task | Days | Deps | Deliverable |
|----|------|------|------|-------------|
| 10.9.1 | Refresh `implementation-status.md` + `ai-capabilities-roadmap.md` | 0.5 | — | Stop stale 🔲 |
| 10.9.2 | Landing: four-CRM / buyer portal / 95% cites — match shipped | 1 | — | Trust |
| 10.9.3 | Fix win-loss / MCP / SQL docs vs stubs | 0.25 | — | |

---

## Sequence (what we build in order)

| Wave | IDs | Outcome |
|------|-----|---------|
| **A now** | 10.1 | Every deal satellite is LCUD; calls don’t 404 |
| **B** | 10.3 + 10.4.4–5 | AI shows up on home, blockers, approvals |
| **C** | 10.2.1–10.2.6 | HubSpot/SF/calendar are truthful |
| **D** | 10.7.1–10.7.6 | Real team |
| **E** | 10.5, 10.6 | Ingest + leadership AI |
| **F** | 10.2.8–9, 10.8 | Extra CRMs + portal/POC |

**Out of first 6 weeks:** buyer portal, LangGraph, voice, forecast ML, Zoho/Pipedrive live, warehouse export.

---

## Acceptance for 10.1 (this slice)

- [ ] Note body can be edited
- [ ] Participant / project / product request / team request can be updated and deleted
- [ ] `/projects` and `/requests` have no “coming soon”; status can change
- [ ] Opening a call from the list never 404s when the row is a `DealEvent`
- [ ] `pnpm --filter @ai-crm/api typecheck` and `@ai-crm/web typecheck` pass
