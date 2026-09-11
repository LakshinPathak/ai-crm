# Work Breakdown Structure (WBS)
# AI-Native Presales CRM

**Version:** 2.3  
**Stack:** Next.js 15 + shadcn/ui (web) · Express API · MongoDB only (no Redis)  
**Duration:** 16 weeks (revised after staff review — 12 weeks was ~2× optimistic)  
**Team assumption:** 1–2 full-stack engineers + AI-assisted development ("vibe coding")  
**See:** `staff-review.md`, `crm-connectors.md`, `r6-roadmap.md`, `future/README.md`, `../TECH_STACK.md`, `../GETTING_STARTED.md`

---

## Implementation status (2026-09-11)

| Area | Done | Notes |
|------|------|-------|
| **1.0 Foundation** | ~92% | Monorepo, JWT auth, shadcn/ui, MongoDB job queue, demo seed, CI + E2E in CI |
| **2.0 Core CRM** | ~95% | Kanban, list, CRUD, 12 deal tabs, accounts, home; **responsive UI ✅** |
| **3.0 Deal Intelligence** | ~88% | MEDDPICC SSE; Gong transcript + Gemini; **`artifact_chunks` embed worker (R8)** |
| **4.0 Agents** | ~97% | 14 templates, NL builder, cron ticker, activity/stage/**closed** events, multi-channel delivery |
| **5.0 Integrations** | ~90% | HubSpot sync + **write-back on approve**, Gong transcript + chunks, Slack/Teams/GChat |
| **6.0 Insights** | ~78% | Funnel, loss, users tabs; responsive charts |
| **7.0 Settings** | ~90% | Members, integrations connect flows, sales-process |
| **8.0 QA / DevOps** | ~84% | typecheck + smoke + Playwright E2E (10 tests) + E2E in CI |
| **9.0 Marketing** | ~90% | Landing, pricing, product, why, **blog index + `/blog/[slug]`**, about; responsive |
| **UI (shadcn + responsive)** | ~98% | 32 routes; mobile-first pass — see `responsive-ui-plan.md` |

### Release history

| Release | Commit area | Highlights |
|---------|-------------|------------|
| **R4** | Core product | Deal tabs, accounts, insights, marketing pages |
| **R5** | P0 batch | Agent builder, Gong ingest, CRM webhooks, E2E, CI, calls page |
| **R6** | Agent platform | NL builder, deliveryConfig, cron, Opine parity |
| **R7** | Integrations | Gong Gemini, Slack delivery, CRM sync, Teams/GChat OAuth, triggers |
| **R7.1** | Responsive UI | Mobile-first pass all routes — [`responsive-ui-plan.md`](responsive-ui-plan.md) |
| **R8 batch 1** | Beta depth | Teams/GChat delivery, HubSpot write-back, `deal.closed`, call link UI, embed worker, blog slugs — [`r8-roadmap.md`](r8-roadmap.md) |

**Recent completions (R8 batch 1):** HubSpot PATCH on approval · `dispatchDealClosed` · manual call→deal link on `/calls/[id]` · `embed-artifact` queue · `/blog/[slug]` · [`trigger-event-catalog.md`](future/trigger-event-catalog.md) refresh.

**Next batch (R8 batch 2):** Slack approval buttons · per-agent webhooks · `deal.created` · deal RAG Q&A — see [`r8-roadmap.md`](r8-roadmap.md) and [`future/implementation-status.md`](future/implementation-status.md).

**Playwright E2E (local):** With `pnpm dev` running (API :4000 + web :3000) and MongoDB up:

```bash
cd codebase
pnpm install
pnpm exec playwright install chromium   # first time only
pnpm test:e2e                           # from repo root
# or: cd apps/web && pnpm test:e2e
```

Uses `POST /api/v1/auth/dev-login` for auth (no Google OAuth). Tests live in `apps/web/e2e/`.

---

## WBS Hierarchy

```
1.0 AI-Native Presales CRM
├── 1.0 Project Setup & Foundation
├── 2.0 Core CRM Module
├── 3.0 Deal Intelligence (AI)
├── 4.0 Agents Platform
├── 5.0 Integrations
├── 6.0 Insights & Analytics
├── 7.0 Settings & Admin
├── 8.0 QA, DevOps & Launch
├── 9.0 Marketing Site (parallel — see landing-page.md)
```

---

## 1.0 Project Setup & Foundation

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 1.1 | Initialize Turborepo monorepo (pnpm) | 1 | — | `package.json`, workspace config |
| 1.2 | Scaffold `apps/web` (Next.js 15, App Router, TS) | 1 | 1.1 | Running dev server :3000 |
| 1.2b | Scaffold `apps/api` (Node.js Express, TS) | 1 | 1.1 | Running API :4000 |
| 1.3 | Scaffold `packages/db` (Mongoose + MongoDB) | 1 | 1.1 | Models + connect helper |
| 1.4 | Scaffold `packages/shared` (Zod schemas, types) | 0.5 | 1.1 | Shared types web ↔ api |
| 1.5 | Configure Tailwind + **shadcn/ui** in web | 1 | 1.2 | ✅ 43 shadcn primitives installed |
| 1.6 | Clerk auth (web) + JWT middleware (api) | 1 | 1.2, 1.2b | Sign-in + `authMiddleware` |
| 1.7 | API client + TanStack Query in web | 1 | 1.2b, 1.6 | `lib/api-client.ts` |
| 1.8 | App shell (shadcn sidebar, header) | 2 | 1.5, 1.6 | Nav matches Opine structure |
| 1.9 | Configure MongoDB background job workers in api | 1 | 1.2b | ✅ `background_jobs` collection |
| 1.10 | Configure Sentry + env management | 0.5 | 1.2 | `.env.example` for web + api |
| 1.11 | MongoDB seed script (demo data) | 2 | 1.3 | 30 deals, 15 companies, 7 stages |
| 1.12 | CI pipeline (lint, typecheck, test) | 1 | 1.1 | ✅ GitHub Actions (R5); E2E in CI → R6 |
| 1.13 | Atlas Vector Search index on chunks | 0.5 | 1.3 | RAG ready |

**Subtotal: ~12 days**

---

## 2.0 Core CRM Module

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 2.1 | Mongoose models: deals, companies, users, stages | 2 | 1.3 | Core collections |
| 2.2 | `GET /api/deals/board` with column aggregates | 2 | 2.1 | Board API |
| 2.3 | `GET /api/deals` list + search + filters | 1 | 2.1 | List API |
| 2.4 | `POST/PATCH/DELETE /api/deals` CRUD | 1 | 2.1 | Deal CRUD |
| 2.5 | `PATCH /api/deals/:id/stage` (DnD) | 1 | 2.2 | Stage move API |
| 2.6 | KanbanBoard + KanbanColumn components | 3 | 1.8, 2.2 | Board UI with @dnd-kit |
| 2.7 | DealCard component (all fields) | 2 | 2.6 | Card matches design spec |
| 2.8 | DealsToolbar (search, filters, view toggle) | 1 | 2.6 | Toolbar |
| 2.9 | DealsTable list view | 1 | 2.3 | List parity |
| 2.10 | CreateDealModal + form validation | 1 | 2.4 | New deal flow |
| 2.11 | Deal detail route + tab navigation | 1 | 1.8 | `/deals/[id]?tab=` |
| 2.12 | DealMetricsBar (6 KPI cards) | 2 | 2.11 | KPI strip |
| 2.13 | ProcessStepper component | 2 | 2.11 | Horizontal stepper |
| 2.14 | Deal metadata sidebar (left panel) | 1 | 2.11 | Opine Details + Key Deal Details |
| 2.15 | Tasks: schema + API + sidebar UI | 2 | 2.11 | Recent tasks panel |
| 2.16 | Notes: schema + API + tab UI | 1 | 2.11 | Notes tab |
| 2.17 | Blockers: schema + API + badges | 2 | 2.1, 2.7 | Blocker CRUD + card badge |
| 2.18 | Sales process + milestones schema | 2 | 2.1 | Process engine tables |
| 2.19 | Plan confidence + win probability calculator | 2 | 2.18 | Scoring service in `packages/context` |
| 2.20 | `GET /api/deals/:id/overview-header` | 1 | 2.12, 2.19 | Aggregated header API |
| 2.21 | Participants tab | 1 | 2.11 | Stakeholder list |
| 2.22 | Activity timeline tab | 2 | 2.11 | Basic activity feed |
| 2.23 | Companies / accounts list page | 1 | 2.1 | `/accounts` |
| 2.24 | Home dashboard (focus feed stub) | 2 | 2.2 | `/home` |

**Subtotal: ~32 days**

---

## 3.0 Deal Intelligence (AI)

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 3.1 | Artifacts + artifact_chunks (MongoDB vector index) | 1 | 1.3, 1.13 | Vector collection |
| 3.2 | Deal context bundle builder | 3 | 3.1 | `packages/context` |
| 3.3 | Chunking + embedding pipeline | 2 | 3.1 | Ingest embed job |
| 3.4 | MEDDPICC Zod schemas (8 letters) | 1 | 3.2 | Structured output types |
| 3.5 | Stage B: per-letter LLM extraction (8 parallel) | 3 | 3.4 | Extraction functions |
| 3.6 | Stage C: narrative synthesis LLM call | 2 | 3.5 | Prose generation |
| 3.7 | `deal_meddpicc` + snapshots schema | 1 | 1.3 | MEDDPICC tables |
| 3.8 | Confidence scoring per field | 2 | 3.5 | Scoring logic |
| 3.9 | `GET /api/deals/:id/meddpicc` | 1 | 3.7 | Cached summary API |
| 3.10 | `POST /api/v1/deals/:id/meddpicc/refresh` + background job | 2 | 3.5, 1.9 | Async refresh |
| 3.11 | SSE stream endpoint + events | 2 | 3.10 | Streaming UX |
| 3.12 | LoadingStepsList component | 1 | 3.11 | 8-step progress UI |
| 3.13 | MeddpiccSummary component (8 sections) | 3 | 3.9 | Overview tab AI block |
| 3.14 | CitationPopover + artifact drill-down | 2 | 3.13 | Citation UX |
| 3.15 | Human edit + field lock (`PATCH meddpicc`) | 2 | 3.13 | HITL edit flow |
| 3.16 | Auto-refresh triggers (debounced events) | 1 | 3.10, 1.9 | Event-driven refresh |
| 3.17 | Sentiment + technical fit scoring | 2 | 3.2 | Kanban badge updates |
| 3.18 | Agent #1 LangGraph: Deal Context Synthesizer | 3 | 3.5 | Production agent graph |

**Subtotal: ~32 days**

---

## 4.0 Agents Platform

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 4.1 | Agents schema (agents, runs, approvals, credits) | 1 | 1.3 | Agent tables |
| 4.2 | Agent templates seed (9 templates) | 1 | 4.1 | Template data |
| 4.3 | `GET /api/agents/stats` + dashboard UI | 2 | 4.1 | Agents dashboard |
| 4.4 | `GET/POST /api/agents` CRUD | 2 | 4.1 | Agent management API |
| 4.5 | Agent list table UI | 1 | 4.3 | Agent table |
| 4.6 | Template modal ("Start from template") | 2 | 4.2 | Template picker |
| 4.7 | Agent wizard Step 1: Basics | 1 | 4.4 | ✅ `/agents/new` |
| 4.8 | Agent wizard Step 2: Trigger (schedule/event/manual/webhook) | 2 | 4.4 | ✅ `/agents/new` |
| 4.9 | Agent wizard Step 3: Prompt | 1 | 4.4 | ✅ `/agents/new` |
| 4.10 | Agent wizard Step 4: Tools & Skills | 2 | 4.4 | ✅ `/agents/new` |
| 4.11 | Agent wizard Step 5: Review + test | 1 | 4.7–4.10 | ✅ `/agents/new` |
| 4.12 | Scheduler worker (cron → enqueue runs) | 2 | 1.9, 4.1 | Daily schedules |
| 4.13 | Event trigger router (MongoDB queue) | 2 | 1.9 | `activity.ingested` routing |
| 4.14 | Agent execution engine (tool loop) | 3 | 4.1 | Core runtime |
| 4.15 | Runs log page + step timeline UI | 2 | 4.14 | `/agents/runs` |
| 4.16 | Approvals schema + API | 2 | 4.1 | Approval endpoints |
| 4.17 | Approvals queue UI + preview | 3 | 4.16 | `/agents/approvals` |
| 4.18 | Credit ledger + metering | 2 | 4.14 | Credits tracking |
| 4.19 | Agent #3: Deal Focus (daily Slack DM) | 3 | 4.14, 5.4 | Deal Focus agent |
| 4.20 | Agent #4: Risk Scanner (rules + LLM) | 4 | 4.14, 2.19 | Risk Scanner agent |
| 4.21 | Agent #5: Post-Call Follow-up | 4 | 4.14, 5.3 | Post-Call agent |
| 4.22 | Agent #2: CRM Hygiene | 3 | 4.17, 5.1 | CRM Hygiene agent |
| 4.23 | Agent #6: Buying Signals (Phase 2) | 3 | 4.14 | Signal detection |
| 4.24 | Agent #10: Weekly Digest (Phase 2) | 3 | 4.14, 6.1 | Email digest |
| 4.25 | Agent #7: POC Orchestrator (Phase 3) | 4 | 4.14, 5.6 | POC agent |
| 4.26 | Agent #8: Negotiation Tracker (Phase 3) | 3 | 4.14 | Negotiation agent |
| 4.27 | Agent #9: Win/Loss Analyst (Phase 3) | 4 | 4.14, 6.1 | Win/loss reports |
| 4.28 | NL agent builder (`draft-from-nl`) (Phase 3) | 4 | 4.4 | NL wizard |

**Subtotal: ~58 days**

---

## 5.0 Integrations

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| **5.0** | **`CrmConnector` interface + registry + canonical types** | **3** | **1.3** | **`packages/integrations/crm/core`** |
| **5.0b** | **`external_records` + `crm_stage_mappings` + `crm_user_mappings` schema** | **2** | **1.3** | **Migration** |
| **5.0c** | **CRM sync orchestrator (backfill + incremental)** | **4** | **5.0, 5.0b** | **Sync jobs** |
| **5.0d** | **Onboarding wizard UI (5 steps)** | **5** | **1.8, 5.0** | **`/onboarding`** |
| **5.0e** | **Stage mapping UI + auto-suggest** | **2** | **5.0d** | **Step 3** |
| **5.0f** | **Import progress SSE/poll** | **1** | **5.0c** | **Step 5** |
| 5.1 | Non-CRM integration adapter interface | 1 | 1.3 | Gong/Slack base |
| 5.2 | `integration_connections` schema + encryption | 1 | 1.3 | Token storage |
| 5.3 | Integrations settings page UI | 2 | 1.8 | Category grid |
| 5.4 | HubSpot `CrmConnector` adapter | 4 | 5.0 | HubSpot impl |
| 5.5 | HubSpot webhook + contract tests | 2 | 5.4 | VCR fixtures |
| 5.6 | Pipedrive `CrmConnector` adapter | 4 | 5.0 | Pipedrive impl |
| 5.7 | Pipedrive pipeline picker + webhooks | 2 | 5.6 | Multi-pipeline |
| 5.8 | CRM write-back (via approval) | 3 | 5.4, 4.17 | All connectors |
| 5.8 | Gong OAuth + connect flow | 2 | 5.1 | Gong adapter |
| 5.9 | Gong transcript ingest + webhook | 3 | 5.8 | 🟡 Artifact ingest (R5); transcript+RAG → R6 |
| **5.10** | **`ChatConnector` interface + registry + `ChatDeliveryService`** | **3** | **5.1** | **`packages/integrations/chat/core`** |
| 5.11 | Slack adapter (OAuth, post, webhook parse) | 2 | 5.10 | `chat/slack` |
| 5.12 | `user_chat_preferences` + identity links schema | 1 | 5.10 | Migration |
| 5.12b | User chat notification settings UI | 2 | 5.12, 7.1 | `/settings/notifications/chat` |
| 5.12c | Workspace chat connections UI | 1 | 5.11, 7.1 | `/settings/integrations/chat` |
| 5.13 | Deal ↔ chat channel linking | 2 | 5.11 | Any provider |
| 5.14 | `ChatCommandHandler` — /focus, /deal, /approve | 3 | 5.11 | Inbound interaction |
| 5.15 | Approval messages with interactive buttons | 2 | 5.11, 4.17 | Approve from chat |
| 5.16 | Chat thread ingest → artifacts | 2 | 5.13 | Linked channel messages |
| 5.17 | Microsoft Teams adapter (Phase 2) | 4 | 5.10 | `chat/teams` |
| 5.18 | Google Chat adapter (Phase 2) | 3 | 5.10 | `chat/google_chat` |
| 5.19 | Optional onboarding step 6 (chat) | 1 | 5.11 | Non-blocking connect |
| 5.20 | Google Calendar OAuth + sync | 3 | 5.1 | Calendar adapter |
| 5.21 | Activity event classification rules | 2 | 5.20 | Activity pipeline |
| 5.22 | Jira OAuth + issue linking (Phase 2) | 3 | 5.1 | Jira adapter |
| 5.23 | Integration health check cron | 1 | 5.2, 1.9 | Enabled/Warning badges |
| 5.24 | Deal-level integration validation | 1 | 5.13 | Blocker surfacing |
| 5.25 | Webhook ingress router (all providers) | 2 | 1.9 | `/api/webhooks/*` |
| 5.26 | Salesforce adapter (Phase 2) | 5 | 5.0 | SFDC sync |

**Subtotal: ~52 days** (chat framework adds ~14 days vs Slack-only)

---

## 6.0 Insights & Analytics

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 6.1 | `activity_events` + daily rollups schema | 2 | 5.14 | Activity tables |
| 6.2 | Rollup ETL job (hourly) | 2 | 6.1, 1.9 | Aggregation pipeline |
| 6.3 | `GET /api/insights/summary` | 1 | 6.2 | Org summary cards |
| 6.4 | `GET /api/insights/users` | 2 | 6.2 | Users table API |
| 6.5 | Insights Users page UI | 3 | 6.4 | `/insights/users` |
| 6.6 | ActivitySparkline component | 1 | 6.5 | Sparkline column |
| 6.7 | StackedActivityBar component | 1 | 6.5 | Breakdown column |
| 6.8 | Org average comparison toggle | 1 | 6.4 | Comparison logic |
| 6.9 | `GET /api/insights/activity/over-time` | 2 | 6.2 | Chart API |
| 6.10 | ActivityOverTimeChart component | 3 | 6.9 | Stacked bar + line |
| 6.11 | Donut charts (by type, by label) | 2 | 6.9 | Breakdown donuts |
| 6.12 | Event type breakdown table | 1 | 6.9 | Table + sparklines |
| 6.13 | User drill-down panel | 2 | 6.5 | Side panel |
| 6.14 | Deal breakdown tab | 2 | 6.9 | Deal-centric view |
| 6.15 | CSV export | 1 | 6.4 | Export button |
| 6.16 | SQL explorer (Phase 3) | 5 | 6.2 | `/insights/sql` |
| 6.17 | AI coaching insights (Phase 3) | 4 | 6.4, 3.2 | Coaching cards |

**Subtotal: ~32 days**

---

## 7.0 Settings & Admin

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 7.1 | Settings layout + nav | 1 | 1.8 | Settings shell |
| 7.2 | Members management page | 2 | 1.6 | Invite, roles |
| 7.3 | Sales process template editor | 3 | 2.18 | Stage/milestone config |
| 7.4 | Comm channels (chat per deal) | 2 | 5.13 | Channel settings — superseded by 5.12c |
| 7.5 | Tool permissions page | 2 | 4.14 | Agent tool ACL |
| 7.6 | Credits & usage page | 1 | 4.18 | Usage dashboard |
| 7.7 | API keys management | 2 | 1.3 | API keys CRUD |
| 7.8 | Outbound webhooks config | 2 | 1.9 | Webhook settings |
| 7.9 | MCP server registry (Phase 3) | 4 | 4.14 | MCP settings |

**Subtotal: ~19 days**

---

## 8.0 QA, DevOps & Launch

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 8.1 | Unit tests: scoring, classification rules | 3 | 2.19, 5.14 | Test suite |
| 8.2 | Integration tests: API routes | 4 | 2.x, 3.x | API tests |
| 8.3 | E2E tests: pipeline + deal detail (Playwright) | 4 | 2.6, 3.13 | 🟡 5 tests (R5); expand + CI → R6 |
| 8.4 | E2E: agent flow (post-call → approval) | 2 | 4.21, 4.17 | Agent E2E |
| 8.5 | Load test: deals board (50 deals/stage) | 1 | 2.2 | Performance baseline |
| 8.6 | Staging environment setup (MongoDB Atlas + Vercel web + API host) | 1 | 1.2 | Staging deploy |
| 8.7 | Production deployment + DNS | 1 | 8.6 | Production URL |
| 8.8 | Seed demo workspace for sales demos | 1 | 1.11 | Demo data |
| 8.9 | Security review (tokens, RBAC, webhooks) | 2 | 5.x | Security checklist |
| 8.10 | Documentation: README + env setup | 1 | 1.x | Developer onboarding |
| 8.11 | MVP acceptance test (PRD §14) | 2 | All P0 | Sign-off |

**Subtotal: ~22 days**

---

## Phase Schedule (12 Weeks)

### Phase 1 — Foundation + Core CRM + AI Summary (Weeks 1–4)

| Week | Focus | WBS IDs |
|------|-------|---------|
| **W1** | Project setup, auth, app shell, DB schema v1 | 1.1–1.12 |
| **W2** | Deals API + Kanban UI + deal detail shell | 2.1–2.11 |
| **W3** | KPIs, stepper, tasks, blockers, process engine | 2.12–2.20 |
| **W4** | MEDDPICC pipeline + SSE + overview UI | 3.1–3.13 |

**Phase 1 exit:** Kanban works, deal detail shows KPIs + streaming MEDDPICC.

### Phase 2 — Agents + Integrations + Workflow (Weeks 5–8)

| Week | Focus | WBS IDs |
|------|-------|---------|
| **W5** | HubSpot + Gong integration | 5.1–5.9 |
| **W6** | Agent runtime + Post-Call + Approvals | 4.1–4.17, 4.21 |
| **W7** | Deal Focus + Risk Scanner + Chat (Slack) | 4.19–4.20, 5.10–5.15 |
| **W8** | CRM Hygiene + Calendar + Home feed | 4.22, 5.13–5.14, 2.24 |

**Phase 2 exit:** End-to-end call → draft → approve flow works.

### Phase 3 — Analytics + Platform + Launch (Weeks 9–12)

| Week | Focus | WBS IDs |
|------|-------|---------|
| **W9** | Insights users + activity charts | 6.1–6.12 |
| **W10** | Agent builder wizard + remaining agents | 4.6–4.11, 4.23–4.24 |
| **W11** | POC + Negotiation + Win/Loss agents, Jira | 4.25–4.27, 5.15 |
| **W12** | QA, E2E, staging, launch | 8.1–8.11 |

**Phase 3 exit:** Full MVP demo per PRD acceptance criteria.

---

## 9.0 Marketing Site

**Spec:** [`landing-page.md`](landing-page.md) · **Benchmark:** [`competitive-opine.md`](competitive-opine.md)  
**Can run in parallel** with app development (Weeks 1–4 or 13–16 pre-launch).

| WBS ID | Task | Est. (days) | Deps | Deliverable |
|--------|------|-------------|------|-------------|
| 9.1 | `(marketing)/layout.tsx` — header, footer, announcement bar | 1 | 1.5 | Shared marketing shell |
| 9.2 | `MarketingHeader` + mega-menu stubs | 2 | 9.1 | Product, Resources, Integrations nav |
| 9.3 | `HeroSection` + dual CTA + G2 slot | 1 | 9.1 | Homepage hero |
| 9.4 | `ConnectorLogos` strip (4 CRM logos) | 0.5 | 9.1 | Differentiator section |
| 9.5 | `StatsSection` + `StatCounter` (Framer Motion) | 1 | 9.1 | Animated 23% / 4hr / 26% / 95% |
| 9.6 | `CapabilityMarquee` (duplicated DOM loop) | 1 | 9.1 | 5 capability pills |
| 9.7 | `FeatureSection` × 2 + gradient backdrops | 2 | 9.1 | Deal context + risk sections |
| 9.8 | `StageTimeline` + `ClosingCta` + `TrustBadges` | 1.5 | 9.1 | Stages + closing + compliance |
| 9.9 | `TestimonialPair` + `ExploreLinks` | 1 | 9.1 | Social proof + footer links |
| 9.10 | Pricing page + `PricingWizard` (4 steps) | 2 | 9.1 | `/pricing#quote` |
| 9.11 | Why page + `DealCardBeforeAfter` | 1 | 9.7 | `/why` narrative |
| 9.12 | Product subpages (`/product/[slug]`) stubs | 1.5 | 9.2 | 5 product pages |
| 9.13 | `VideoModal` + demo poster asset | 0.5 | 9.3 | Trust video strip |
| 9.14 | SEO metadata + OG image + `llms.txt` | 0.5 | 9.1 | Discoverability |
| 9.15 | `POST /api/v1/leads` + wizard submit | 1 | 9.10 | Lead capture |
| 9.16 | Lighthouse pass + reduced-motion | 0.5 | 9.5–9.6 | Performance ≥ 90 |

**Subtotal: ~17 days** (can compress to ~10 with vibe coding + component reuse)

---

## Milestone Summary

| Milestone | Week | Criteria |
|-----------|------|----------|
| **M1: Shell** | 1 | Auth + nav + empty pages |
| **M2: Pipeline** | 2 | Kanban with seed data |
| **M3: Deal Command Center** | 4 | MEDDPICC streaming works |
| **M4: Connected** | 5 | HubSpot + Gong syncing |
| **M5: Agents Live** | 7 | 4 agents running in production |
| **M6: Insights** | 9 | Team analytics page |
| **M7: MVP Launch** | 12 | All PRD acceptance criteria pass |
| **M8: Marketing** | 13–16 | Homepage + pricing live (FR-008) |

---

## Effort Summary

| Module | Days (est.) | % of total |
|--------|-------------|------------|
| 1.0 Foundation | 12 | 7% |
| 2.0 Core CRM | 32 | 19% |
| 3.0 Deal Intelligence | 32 | 19% |
| 4.0 Agents Platform | 58 | 34% |
| 5.0 Integrations | 52 | 24% |
| 6.0 Insights | 32 | 19% |
| 7.0 Settings | 19 | 11% |
| 8.0 QA & Launch | 22 | 13% |
| 9.0 Marketing Site | 17 | 10% |
| **Total** | **~262 person-days** | |

**Calendar time:** 12 weeks with 2 engineers ≈ 120 person-days productive capacity.  
**Mitigation:** Prioritize P0 WBS items; defer 4.23–4.28, 5.19, 6.16–6.17, 7.9 to post-MVP.

---

## P0 Critical Path (vibe coding order — revised)

**Build CRM framework before any provider-specific code.**

```
1.1 → 1.2 → 1.3 → 1.5 → 1.6 → 1.8
  → 5.0 → 5.0b → 5.0c (CRM connector core + sync)
  → 5.0d → 5.0e → 5.0f (onboarding wizard)
  → 5.4 (HubSpot adapter) → 5.6 (Pipedrive adapter)
  → 2.1 → 2.2 → 2.6 → 2.7 (kanban with LIVE synced deals)
  → 2.11 → 2.12 → 2.20 (deal detail — 4 tabs only)
  → 3.1 → 3.2 → 3.5 → 3.10 → 3.11 → 3.13 (MEDDPICC)
  → 5.8 → 5.9 (Gong)
  → 4.14 → 4.21 (Post-Call — hardcoded agent first)
  → 4.16 → 4.17 (Approvals)
  → 5.10 → 5.11 → 5.14 (ChatConnector + Slack + commands)
  → 4.19 → 4.20 (Deal Focus + Risk → ChatDeliveryService)
  → 8.3 → 8.11 (E2E: onboarding + Pipedrive sandbox)
```

---

## Risk Register (WBS-level)

| Risk | WBS impact | Mitigation |
|------|------------|------------|
| LLM latency on MEDDPICC | 3.10–3.11 | Stream sections; cache aggressively |
| Gong API access delays | 5.8–5.9 | Mock transcript ingest for dev |
| DnD complexity | 2.6 | Use @dnd-kit; limit scope to stage change only |
| Agent cost overrun | 4.18 | Credit caps from day 1 |
| Scope creep | Full product | Release waves R1/R2/R3 in PRD v3 |
| Monolith complexity | — | Keep modules isolated under `apps/api/src/modules/` |
| Distributed tracing | — | OpenTelemetry + correlation IDs from R2 |

---

## 11. Platform hardening WBS (monolith)

| Task | Area | Wave | Depends |
|------|------|------|---------|
| 11.1 | `packages/events` domain event bus | R1 | — |
| 11.2 | MongoDB worker process split | R1 | — |
| 11.3 | OpenTelemetry + correlation IDs | R2 | 11.1 |
| 11.4 | API integration tests (`packages/shared`) | R2 | — |
| 11.5 | E2E tests (Playwright) | R2 | — |

**Timeline:** All product features ship in the modular monolith (`apps/api`).

---

## R6 roadmap (next batch)

See **[`r6-roadmap.md`](r6-roadmap.md)** for full specs, acceptance criteria, and file lists.

| WS | Workstream | WBS IDs | Priority |
|----|------------|---------|----------|
| WS-1 | Gong transcript fetch + RAG pipeline | 3.1, 3.3, 5.9, 1.13 | P0 |
| WS-2 | Teams + Google Chat + Calendar OAuth | 5.17, 5.18, 5.20, 5.12c | P0 |
| WS-3 | NL agent builder (`draft-from-nl`) | 4.28 | P1 |
| WS-4 | CRM incremental sync queue | 5.0c, 5.5, 5.25 | P1 |
| WS-5 | E2E in CI + blog/about + Sentry stub | 8.3, 8.4, 9.x, 1.10 | P1 |

**Execute:** 5 parallel subagent forks → integrate → `pnpm typecheck && pnpm build && pnpm test:e2e`.

---

## Definition of Done (per task)

- [ ] Code merged to `main`
- [ ] Types pass (`pnpm typecheck`)
- [ ] Lint passes
- [ ] Unit tests for business logic
- [ ] Manually verified in local dev
- [ ] API documented in `api-routes.md` if new endpoint
- [ ] No secrets in code
