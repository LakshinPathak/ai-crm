# Implementation Status — Done vs Remaining

**Version:** 1.3  
**Date:** 2026-09-11  
**Parent:** [`README.md`](README.md) · [`../wbs.md`](../wbs.md) · [`../r8-roadmap.md`](../r8-roadmap.md) · [`../r9-roadmap.md`](../r9-roadmap.md)

---

## Recently shipped (R6 + R7 + Responsive UI + R8)

| Area | Status | Highlights |
|------|--------|------------|
| **R6 agent platform** | ✅ Shipped | 14 templates, Opine grouping, NL `draft-from-nl`, `deliveryConfig`, scheduled agents cron, closed-won-handoff |
| **Gong + Gemini (Phase A)** | ✅ Shipped | Transcript fetch, direct Gemini on signal agents (no RAG), `activity.ingested` dispatch |
| **R7 integrations** | ✅ Shipped | Deal-linked calls + `/calls/[id]`, Slack `chat.postMessage`, CRM incremental sync queue, Teams/GChat OAuth, `deal.stage_changed` triggers |
| **R7 marketing + CI** | ✅ Shipped | `/blog`, `/about`, Playwright E2E in GitHub Actions |
| **Responsive UI** | ✅ Shipped | Mobile-first pass across dashboard, deals, agents, settings, marketing, insights (see [`responsive-ui-plan.md`](../responsive-ui-plan.md)) |
| **R8 batch 1** | ✅ Shipped | Teams/GChat delivery, HubSpot write-back, `deal.closed`, call link UI, `artifact_chunks` embed worker, `/blog/[slug]` |
| **R8 batch 2** | ✅ Shipped | Slack in-chat approve/reject, per-agent webhook, `deal.created` dispatch, deal RAG Q&A stub `POST /deals/:id/ask`, docs + E2E smoke |

---

## Live today (platform snapshot)

| Layer | Done | Partial | Not started |
|-------|------|---------|-------------|
| **Core CRM** | Kanban, list, 12 deal tabs, accounts, home | — | Mobile native app |
| **Deal AI** | MEDDPICC SSE, Gemini on transcripts; `artifact_chunks` + embed worker; deal ask API stub | Vector search (Atlas) in prod; product UI for ask | Multi-modal (PDF/slides) |
| **Agents** | 14 templates, NL builder, cron, activity/stage/closed/created events, per-agent webhook | — | Custom LangGraph, Slack slash |
| **Approvals** | Queue UI; local apply + HubSpot PATCH; Slack interactive buttons | — | Jira, calendar invites |
| **Insights** | Performance, activity, funnel, loss, users | Deal-level insights tab | SQL explorer, forecasting AI |
| **Integrations** | HubSpot sync + write-back, Gong transcript + chunks, Slack/Teams/GChat delivery | Channel list APIs (stubs until scopes) | Calendar sync, Salesforce |
| **Chat delivery** | Slack + Teams + GChat post via `channelId` | DM via `dmUserId` (schema gap — R9 WS-2) | — |
| **Marketing** | Landing, pricing, product, why, blog index + `/blog/[slug]` | — | CMS / MDX blog |
| **QA** | typecheck, build, smoke, E2E in CI | Visual regression | Live beta URL + DNS (see [`deploy-beta.md`](../deploy-beta.md)) |
| **UI** | shadcn migration, responsive layouts 320px+ | — | PWA / offline |

---

## Remaining by priority (R9+)

### P0 — Beta blockers

| Item | Why | WBS / doc |
|------|-----|-----------|
| Gong call → deal linking accuracy | Heuristics can mis-link | Manual link on `/calls/[id]`; tune ingest rules |
| Teams/GChat channel picker | List APIs return `[]` until scopes added | R9 batch 1 |
| Beta deploy executed | Checklist only until someone runs it | [`deploy-beta.md`](../deploy-beta.md) · WBS 8.6 |

### P1 — Depth & parity (R9)

| Item | Why | WBS / doc |
|------|-----|-----------|
| `dmUserId` + Slack DM in wizard | Delivery to users not channels | R9 WS-2 |
| `deal.stage_changed` from CRM sync | Trigger agents on CRM stage moves | R9 WS-3 |
| MEDDPICC cites `artifact_chunks` | Ground summaries in RAG | R9 WS-4 |
| Gong connect in settings UI | OAuth exists; surface in UI | R9 WS-5 |
| Win/loss PDF + charts | Reporting agent polish | [`opine-template-parity.md`](opine-template-parity.md) |

### P2 — Scale & enterprise

| Item | Why |
|------|-----|
| Salesforce adapter | Enterprise CRM |
| SQL explorer `/insights/sql` | Power users (R9 batch 2 WS-8 stub) |
| MCP server registry | Agent tool extensibility |
| Production deploy + custom domain | WBS 8.7 |
| Forecast AI / coaching cards | [`analytics-expansion.md`](analytics-expansion.md) |

---

## Release map

| Release | Theme | Status |
|---------|-------|--------|
| **R4–R5** | Core CRM + agents scaffold | ✅ Done |
| **R6** | Agent platform batch | ✅ Done |
| **R7** | Integrations + delivery + triggers | ✅ Done (`78cac8a`) |
| **R7.1** | Responsive UI | ✅ Done |
| **R8** | Chat delivery parity + RAG + write-back + webhooks | ✅ Done (batch 1 + 2) |
| **R9** | Beta polish + enterprise depth | 🟡 In progress — see [`r9-roadmap.md`](../r9-roadmap.md) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-11 | v1.3 — R8 complete; R9 in progress; [`deploy-beta.md`](../deploy-beta.md) added (WS-10) |
| 2026-09-11 | v1.2 — R8 batch 1 shipped |
| 2026-09-10 | v1.1 — Post R7 + responsive UI status |
| 2026-09-09 | v1.0 — Initial snapshot in future/README |
