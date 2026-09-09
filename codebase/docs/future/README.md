# Future Development — Vibe Coding Reference Library

**Version:** 1.0  
**Date:** 2026-09-09  
**Audience:** Engineers, PMs, and AI agents building the next waves of AI CRM  
**Parent:** [`../README.md`](../README.md) · [`../wbs.md`](../wbs.md) · [`../r6-roadmap.md`](../r6-roadmap.md)

---

## Purpose

This folder is the **long-horizon product + engineering playbook** for AI CRM. Use it when:

- Planning a new feature wave (R6, R7, …)
- Prompting an AI agent to implement automations, analytics, or AI features
- Scoping demos for prospects or internal stakeholders
- Deciding what is **live today** vs **designed but not built**

Each doc is written to be **self-contained** — paste sections into Cursor/Claude with minimal extra context.

---

## Document catalog

| Doc | What it answers | Start here if… |
|-----|-----------------|----------------|
| [`ai-capabilities-roadmap.md`](ai-capabilities-roadmap.md) | What AI can do on deals, calls, CRM, chat | You want the full AI feature matrix |
| [`custom-automations-guide.md`](custom-automations-guide.md) | How users (and devs) set up agents & triggers | You are building or demoing automations |
| [`analytics-expansion.md`](analytics-expansion.md) | Current Insights + 30+ future metrics | You are extending `/insights` or reporting agents |
| [`ai-demo-playbook.md`](ai-demo-playbook.md) | Scripted demos: 5-min, 15-min, 30-min flows | You are preparing a sales or investor demo |
| [`trigger-event-catalog.md`](trigger-event-catalog.md) | Every event, webhook, cron, and queue job | You are wiring triggers or background workers |
| [`nl-agent-builder-spec.md`](nl-agent-builder-spec.md) | Natural-language → agent wizard (R6 WS-3) | You are implementing `draft-from-nl` |
| [`integration-ai-patterns.md`](integration-ai-patterns.md) | Gong, HubSpot, Slack, Teams + AI pipelines | You are building ingest → RAG → agent flows |
| [`vibe-coding-patterns.md`](vibe-coding-patterns.md) | Repo conventions for AI-assisted implementation | You are starting a `/dev-cycle` or subagent fork |

---

## Current platform snapshot (2026-09-09)

| Layer | Live | Partial | Planned |
|-------|------|---------|---------|
| **Deal AI** | MEDDPICC SSE, sentiment, fit score, blocker suggest | RAG over Gong transcripts | Multi-modal (slides, PDFs) |
| **Agents** | 13 templates, 10 executors, wizard, runs log | Scheduled triggers, chat delivery | NL builder, custom LangGraph |
| **Approvals** | Queue UI, email/CRM draft types | Write-back to HubSpot | Jira, calendar invites |
| **Insights** | Performance, activity, funnel, loss, users | Deal-level insights tab | SQL explorer, forecasting |
| **Integrations** | HubSpot OAuth, Gong webhook, CRM webhook path | Gong transcript fetch | Teams, GChat, Calendar |
| **Chat** | Slack scaffold | — | Teams, Google Chat delivery |

**Run locally:** `cd codebase && pnpm dev` → web `:3000`, API `:4000`, MongoDB required.

---

## How to use with vibe coding

### 1. Pick a doc + section

Example prompt for Cursor:

```
Implement WS-3 from docs/future/nl-agent-builder-spec.md §4 API contract.
Follow vibe-coding-patterns.md for file placement. Do not change unrelated routes.
```

### 2. Cross-reference implementation status

Before coding, grep the repo:

```bash
rg "templateSlug|draft-from-nl|artifact_chunks" codebase/
```

Update the doc's **Implementation status** table when you ship.

### 3. Link to WBS

| Future doc section | WBS IDs |
|--------------------|---------|
| Gong RAG | 3.1, 3.3, 5.9 |
| NL agent builder | 4.28 |
| Analytics SQL | 6.16 |
| Chat OAuth | 5.17–5.20 |
| CRM incremental sync | 5.0c |

---

## Reading order by role

### Product / GTM

1. [`ai-demo-playbook.md`](ai-demo-playbook.md)
2. [`ai-capabilities-roadmap.md`](ai-capabilities-roadmap.md) §1–3
3. [`custom-automations-guide.md`](custom-automations-guide.md) §2 (user journeys)

### Backend engineer

1. [`trigger-event-catalog.md`](trigger-event-catalog.md)
2. [`integration-ai-patterns.md`](integration-ai-patterns.md)
3. [`../agent-platform.md`](../agent-platform.md)
4. [`../database.md`](../database.md) §9 (artifacts & RAG)

### Frontend engineer

1. [`custom-automations-guide.md`](custom-automations-guide.md) §4 (wizard UI)
2. [`analytics-expansion.md`](analytics-expansion.md) §2 (current APIs)
3. [`../frontend-flow.md`](../frontend-flow.md)

### AI / ML engineer

1. [`ai-capabilities-roadmap.md`](ai-capabilities-roadmap.md)
2. [`integration-ai-patterns.md`](integration-ai-patterns.md) §3–5
3. [`nl-agent-builder-spec.md`](nl-agent-builder-spec.md)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-09 | v1.0 — Initial future-dev library (8 docs) |
