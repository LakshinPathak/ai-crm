# AI-Native Presales CRM — Documentation

---
doc: README.md
title: Documentation Master Index
version: 3.0
status: approved
taxonomy: Foundation
audience: all
last_reviewed: 2026-09-09
stack: Next.js + shadcn · modular monolith · MongoDB
---

**Single entry point** for all product and engineering documentation.  
Everything lives under `codebase/docs/` — there is no separate `artifacts/planning/` copy.

| Start here | Doc |
|------------|-----|
| **Architecture** | [`architecture.md`](architecture.md) |
| **20-min technical overview** | [`system-design.md`](system-design.md) |
| **Stack truth** | [`stack.md`](stack.md) |
| **Full product PRD** | [`prd.md`](prd.md) |

---

## Reading paths

### Path A — Product (PM, design, GTM)

| Step | Doc | Why |
|------|-----|-----|
| 1 | [`system-design.md`](system-design.md) | How the system works |
| 2 | [`prd.md`](prd.md) | Full product requirements, 10 agents, 12 tabs |
| 3 | [`architecture.md`](architecture.md) | Module boundaries, deployment |
| 4 | [`competitive-opine.md`](competitive-opine.md) | Opine benchmark |
| 5 | [`wbs.md`](wbs.md) | 24–32 week delivery plan |
| 6 | [`r6-roadmap.md`](r6-roadmap.md) | Next batch (R6) — 5 workstreams |

### Path B — Backend (API, data)

| Step | Doc | Why |
|------|-----|-----|
| 1 | [`architecture.md`](architecture.md) | Modular monolith, modules, events |
| 2 | [`stack.md`](stack.md) | Repo layout, env vars |
| 3 | [`database.md`](database.md) | ER diagrams, collections |
| 4 | [`api-routes.md`](api-routes.md) | 108 routes, flows, 80+ test cases |
| 5 | [`crm-connectors.md`](crm-connectors.md) | CRM adapter framework |
| 6 | [`chat-channels.md`](chat-channels.md) | Chat adapter framework |
| 7 | [`agent-platform.md`](agent-platform.md) | 10 agents |

### Path C — Frontend (Next.js, shadcn)

| Step | Doc | Why |
|------|-----|-----|
| 1 | [`stack.md`](stack.md) | API client → `:4000` |
| 2 | [`frontend-flow.md`](frontend-flow.md) | Full nav + 12 deal tabs |
| 3 | [`design-system.md`](design-system.md) | shadcn tokens + components |
| 4 | [`api-routes.md`](api-routes.md) | User flows → API sequences |

---

## Complete catalog

| File | Title | Description |
|------|-------|-------------|
| [`README.md`](README.md) | Master Index | **This file** |
| [`architecture.md`](architecture.md) | System Architecture | ADRs, deployment, modules |
| [`system-design.md`](system-design.md) | System Design | Technical overview |
| [`stack.md`](stack.md) | Technology Stack | Monorepo layout |
| [`database.md`](database.md) | Database & Data Architecture | ER diagrams, collections |
| [`api-routes.md`](api-routes.md) | API Routes Guide | Modules, flows, test cases |
| [`prd.md`](prd.md) | Product Requirements | Full product scope |
| [`frontend-flow.md`](frontend-flow.md) | Frontend Flows | All routes and tabs |
| [`agent-platform.md`](agent-platform.md) | Agent Platform | 10 agents |
| [`crm-connectors.md`](crm-connectors.md) | CRM Connectors | HubSpot adapter |
| [`chat-channels.md`](chat-channels.md) | Chat Channels | Slack/Teams |
| [`design-system.md`](design-system.md) | Design System | shadcn/ui |
| [`wbs.md`](wbs.md) | Work Breakdown | Delivery plan |
| [`r6-roadmap.md`](r6-roadmap.md) | R6 Roadmap | Next 5 workstreams (Gong RAG, chat OAuth, NL builder, CRM sync, QA) |
| [`staff-review.md`](staff-review.md) | Staff Review | Technical audit |
| [`landing-page.md`](landing-page.md) | Landing Page | Marketing |
| [`branding-guidelines.md`](branding-guidelines.md) | Branding | Visual identity |
| [`competitive-opine.md`](competitive-opine.md) | Competitive Intel | Opine benchmark |
| [`design.md`](design.md) | UI Legacy | Superseded |
| [`opine-feature-reference.md`](opine-feature-reference.md) | Opine Feature Reference | Competitor feature map |
| [`AGENT_AUTOMATIONS.md`](AGENT_AUTOMATIONS.md) | Agent Automations | Automation notes |
| [`HUBSPOT_AI_INSIGHTS.md`](HUBSPOT_AI_INSIGHTS.md) | HubSpot AI Insights | HubSpot extension notes |
| [`reference-screenshots/`](reference-screenshots/) | UI Reference PNGs | Opine app screenshots |

---

## Stack alignment checklist

| # | Check | Source |
|---|-------|--------|
| 1 | Frontend = Next.js 15 + shadcn/ui | `stack.md` |
| 2 | Public API = `apps/api` :4000 | `stack.md` |
| 3 | All modules in single Express process | `architecture.md` |
| 4 | MongoDB single database | `database.md` |
| 5 | MongoDB `background_jobs` for async workers | `architecture.md`, `../TECH_STACK.md` |
| 6 | JWT auth on protected routes | `architecture.md` |
| 7 | Full product: 12 deal tabs, 10 agents | `prd.md` |
| 8 | Local dev = `pnpm dev` | `stack.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-09 | v3.2 — added `r6-roadmap.md`; WBS v2.2 after R5 |
| 2026-09-09 | v3.1 — consolidated docs; removed duplicate `artifacts/planning/` |
| 2026-09-09 | v3.0 — monolith-only; removed microservices docs and gateway |
| 2026-09-09 | v2.0 — microservices architecture (superseded) |
| 2026-09-09 | v1.0 — initial master index |
