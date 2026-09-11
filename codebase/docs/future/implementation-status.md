# Implementation Status — Done vs Remaining

**Version:** 1.2  
**Date:** 2026-09-11  
**Parent:** [`README.md`](README.md) · [`../wbs.md`](../wbs.md) · [`../r6-roadmap.md`](../r6-roadmap.md) · [`../r7-roadmap.md`](../r7-roadmap.md)

---

## Recently shipped (R6 + R7 + Responsive UI)

| Area | Status | Highlights |
|------|--------|------------|
| **R6 agent platform** | ✅ Shipped | 14 templates, Opine grouping, NL `draft-from-nl`, `deliveryConfig`, scheduled agents cron, closed-won-handoff |
| **Gong + Gemini (Phase A)** | ✅ Shipped | Transcript fetch, direct Gemini on signal agents (no RAG), `activity.ingested` dispatch |
| **R7 integrations** | ✅ Shipped | Deal-linked calls + `/calls/[id]`, Slack `chat.postMessage`, CRM incremental sync queue, Teams/GChat OAuth, `deal.stage_changed` triggers |
| **R7 marketing + CI** | ✅ Shipped | `/blog`, `/about`, Playwright E2E in GitHub Actions |
| **Responsive UI** | ✅ Shipped | Mobile-first pass across dashboard, deals, agents, settings, marketing, insights (see [`responsive-ui-plan.md`](../responsive-ui-plan.md)) |
| **R8 batch 1** | ✅ Shipped | Teams/GChat delivery, HubSpot write-back, `deal.closed`, call link UI, `artifact_chunks` embed worker, `/blog/[slug]` |

---

## Live today (platform snapshot)

| Layer | Done | Partial | Not started |
|-------|------|---------|-------------|
| **Core CRM** | Kanban, list, 12 deal tabs, accounts, home | — | Mobile native app |
| **Deal AI** | MEDDPICC SSE, Gemini on transcripts; `artifact_chunks` + embed worker | Vector search (Atlas); deal Q&A API | Multi-modal (PDF/slides) |
| **Agents** | 14 templates, NL builder, cron, activity/stage/closed events | Slack approval buttons, per-agent webhooks | Custom LangGraph, Slack slash |
| **Approvals** | Queue UI; local apply + HubSpot PATCH on `crm_field_update` | — | Jira, calendar invites |
| **Insights** | Performance, activity, funnel, loss, users | Deal-level insights tab | SQL explorer, forecasting AI |
| **Integrations** | HubSpot sync + write-back, Gong transcript + chunks, Slack/Teams/GChat delivery | Channel list APIs (stubs) | Calendar sync, Salesforce |
| **Chat delivery** | Slack + Teams + GChat post via `channelId` | DM via `dmUserId` (schema gap) | Approval buttons in Slack |
| **Marketing** | Landing, pricing, product, why, blog index + `/blog/[slug]` | — | CMS / MDX blog |
| **QA** | typecheck, build, smoke, E2E (8 tests), E2E in CI | Visual regression | Production deploy + DNS |
| **UI** | shadcn migration, responsive layouts 320px+ | — | PWA / offline |

---

## Remaining by priority (R8+)

### P0 — Beta blockers

| Item | Why | WBS / doc |
|------|-----|-----------|
| Gong call → deal linking accuracy | Heuristics can mis-link | ✅ Manual link on `/calls/[id]`; tune ingest rules |
| Teams/GChat channel picker | List APIs return `[]` until scopes added | R8 batch 2+ |
| Deal RAG Q&A in product UI | Chunks exist; no user-facing ask yet | R8 WS-9 |

### P1 — Depth & parity

| Item | Why | WBS / doc |
|------|-----|-----------|
| Slack approval buttons | Approve from chat | R8 batch 2 WS-6 |
| Per-agent webhook triggers | External fire agents | R8 batch 2 WS-7 |
| `deal.created` dispatch | CRM sync agents | R8 batch 2 WS-8 |
| Win/loss PDF + charts | Reporting agent polish | [`opine-template-parity.md`](opine-template-parity.md) R8 |
| Per-agent webhook triggers | External systems fire agents | [`trigger-event-catalog.md`](trigger-event-catalog.md) |

### P2 — Scale & enterprise

| Item | Why |
|------|-----|
| Salesforce adapter | Enterprise CRM |
| SQL explorer `/insights/sql` | Power users |
| MCP server registry | Agent tool extensibility |
| Production deploy + custom domain | WBS 8.6–8.7 |
| Forecast AI / coaching cards | [`analytics-expansion.md`](analytics-expansion.md) |

---

## Release map

| Release | Theme | Status |
|---------|-------|--------|
| **R4–R5** | Core CRM + agents scaffold | ✅ Done |
| **R6** | Agent platform batch | ✅ Done |
| **R7** | Integrations + delivery + triggers | ✅ Done (`78cac8a`) |
| **R7.1** | Responsive UI | ✅ Done (this batch) |
| **R8** | Chat delivery parity + RAG + write-back | 🟡 Batch 1 done; batch 2 in progress |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-11 | v1.2 — R8 batch 1 shipped |
| 2026-09-10 | v1.1 — Post R7 + responsive UI status |
| 2026-09-09 | v1.0 — Initial snapshot in future/README |
