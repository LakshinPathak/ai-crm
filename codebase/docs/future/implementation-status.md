# Implementation Status — Done vs Remaining

**Version:** 1.1  
**Date:** 2026-09-10  
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

---

## Live today (platform snapshot)

| Layer | Done | Partial | Not started |
|-------|------|---------|-------------|
| **Core CRM** | Kanban, list, 12 deal tabs, accounts, home | — | Mobile native app |
| **Deal AI** | MEDDPICC SSE, sentiment, Gemini on transcripts for post-call / signals / objections | Citation → Gong chunks | Multi-modal (PDF/slides) |
| **Agents** | 14 templates, 10+ executors, wizard, NL builder, cron, event triggers | Teams/GChat delivery | Custom LangGraph, Slack slash commands |
| **Approvals** | Queue UI, email/CRM draft types | HubSpot write-back | Jira, calendar invites |
| **Insights** | Performance, activity, funnel, loss, users | Deal-level insights tab | SQL explorer, forecasting AI |
| **Integrations** | HubSpot OAuth + incremental sync, Gong webhook + transcript, Slack OAuth + post | Teams/GChat OAuth (connect only) | Calendar sync, Salesforce |
| **Chat delivery** | Slack channel post | DM via `dmUserId` (schema gap) | Teams/GChat post, approval buttons in Slack |
| **Marketing** | Landing, pricing, product, why, blog, about | Blog post detail pages | CMS / MDX blog |
| **QA** | typecheck, build, smoke, E2E (8 tests), E2E in CI | Visual regression | Production deploy + DNS |
| **UI** | shadcn migration, responsive layouts 320px+ | — | PWA / offline |

---

## Remaining by priority (R8+)

### P0 — Beta blockers

| Item | Why | WBS / doc |
|------|-----|-----------|
| Teams/GChat message delivery | `deliveryConfig` only posts to Slack today | [`r7-roadmap.md`](../r7-roadmap.md) WS-2 follow-up |
| Wire Teams/GChat tokens in `workspace-tokens.ts` | OAuth connect works; delivery can't resolve tokens | [`integration-ai-patterns.md`](integration-ai-patterns.md) |
| Gong call → deal linking accuracy | Domain/owner fallback can mis-link | Manual `dealId` override UI |
| HubSpot write-back on approval | Approvals don't sync to CRM yet | WBS 5.5 |

### P1 — Depth & parity

| Item | Why | WBS / doc |
|------|-----|-----------|
| Gong RAG (`artifact_chunks`) | Cross-deal search, MEDDPICC citations at scale | WBS 3.3, [`integration-ai-patterns.md`](integration-ai-patterns.md) |
| Slack approval buttons | Approve from chat | [`nl-chat-automation-vision.md`](nl-chat-automation-vision.md) R7c |
| Blog post detail routes | `/blog/[slug]` pages | Marketing Phase 3 |
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
| **R8** | Chat delivery parity + RAG + write-back | 🔲 Next |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-10 | v1.1 — Post R7 + responsive UI status |
| 2026-09-09 | v1.0 — Initial snapshot in future/README |
