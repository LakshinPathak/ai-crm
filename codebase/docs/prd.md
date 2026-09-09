# Product Requirements Document (PRD)
# AI-Native Presales CRM

**Product codename:** `ai-crm` (rename before launch)  
**Version:** 3.0  
**Date:** 2026-09-09  
**Status:** Full product scope — modular monolith  
**Timeline:** 24–32 weeks (see [`wbs.md`](wbs.md))  
**Stack:** Next.js + shadcn/ui · modular monolith (`apps/api`) · MongoDB — see [`stack.md`](stack.md)  
**Architecture:** [`architecture.md`](architecture.md) · [`system-design.md`](system-design.md) · **Index:** [`README.md`](README.md)  
**Reference:** Opine UI screenshots in [`reference-screenshots/`](reference-screenshots/); marketing patterns from [`competitive-opine.md`](competitive-opine.md) + [`landing-page.md`](landing-page.md)

---

## 1. Executive Summary

Build an **AI-native presales and revenue operations CRM** where deals are the unit of truth, **10 specialized AI sub-agents** automate research and follow-through, and humans approve all high-risk writes. The product targets B2B sales teams (AE + Solutions Engineer) managing complex technical deals through multi-stage pipelines.

**North-star outcome:** A rep opens the app Monday morning and knows exactly which deals need attention, why, and what to do next — with every AI claim backed by a citation from a call, email, or CRM field.

---

## 2. Problem Statement

| Pain | Current state | Our solution |
|------|---------------|--------------|
| Context scattered | CRM, Gong, Slack/Teams/Chat, calendar, Jira are silos | Unified deal context graph + MEDDPICC synthesis |
| Tool switching | Reps live in chat; CRM is another tab | **Interact from Slack, Teams, or Google Chat** — focus, approve, query deals |
| Stale CRM data | Reps forget to update fields after calls | CRM Hygiene agent drafts updates with approval |
| Missed risk signals | Deals stall silently | Risk Scanner + sentiment/fit on kanban |
| Manual follow-up | Hours writing recap emails | Post-Call agent drafts in <15 min |
| No presales process visibility | Stage ≠ execution readiness | Dual-stage model + plan confidence % |
| Leadership blind spots | Spreadsheets for pipeline reviews | Weekly digest + team analytics |

---

## 3. Goals & Non-Goals

### Goals — Full product

1. **G1:** Full CRM module — Home, Deals, Accounts, Projects, Calls, Requests, Insights, Settings
2. **G2:** Deal detail with **all 12 tabs** — Overview, Plan, Activity, Events, Participants, Product Requests, Team Requests, Insights, Notes, Tasks, Projects, File Center
3. **G3:** **All 10 AI agents** — Context Synthesizer, CRM Hygiene, Deal Focus, Risk Scanner, Post-Call, Buying Signals, POC Orchestrator, Negotiation Tracker, Win/Loss, Leadership Digest
4. **G4:** **CRM connector framework** — HubSpot, Pipedrive, Zoho, Salesforce (+ Close, Copper, Dynamics roadmap)
5. **G5:** **Multi-chat delivery** — Slack, Microsoft Teams, Google Chat (configurable per user)
6. **G6:** Approval queue + write-back saga for CRM, email, Jira
7. **G7:** **10-minute onboarding** — CRM wizard → live pipeline
8. **G8:** **Agent platform** — dashboard, templates, builder wizard, runs log, credits, knowledge base
9. **G9:** **Insights** — team analytics, funnel, loss themes, SQL explorer, CSV export
10. **G10:** **Modular monolith** — clear module boundaries in `apps/api` (see [`architecture.md`](architecture.md))

### Release waves (engineering order, not scope cuts)

| Wave | Focus | Duration |
|------|-------|----------|
| **R1** | Core CRM + CRM sync + MEDDPICC + 5 agents + Slack | Weeks 1–12 |
| **R2** | Remaining agents + 12 tabs + Teams/GChat + Gong + Insights | Weeks 13–20 |
| **R3** | Service extraction + Zoho/SF + NL builder + scale hardening | Weeks 21–32 |

### Non-Goals

- Mobile native apps
- Multi-currency / multi-region compliance (EU residency = later)
- Billing / subscription management (stub only)
- Micro-frontends

---

## 4. User Personas

### P1 — Account Executive (AE)
- **Needs:** Daily priorities, deal health, follow-up drafts, CRM hygiene
- **Agents used:** Deal Focus, Post-Call, Risk Scanner, CRM Hygiene
- **Key screens:** Pipeline kanban, Deal detail, Focus feed

### P2 — Solutions Engineer (SE)
- **Needs:** Technical validation progress, POC plans, stakeholder map
- **Agents used:** POC Orchestrator (Phase 2), Deal Context Synthesizer
- **Key screens:** Deal detail (Plan tab), Tasks, Participants

### P3 — Sales Manager
- **Needs:** Team pipeline health, coaching signals, forecast trust
- **Agents used:** Weekly Digest, Risk Scanner (team view)
- **Key screens:** Insights → Users, Approvals, Pipeline

### P4 — RevOps / Admin
- **Needs:** Integrations, agent config, tool permissions, stage templates
- **Key screens:** Settings → Integrations, Agents, Sales Process

### P5 — CRO / Leadership
- **Needs:** Weekly digest, win/loss themes, activity vs outcome
- **Agents used:** Weekly Leadership Digest, Win/Loss Analyst (Phase 3)
- **Key screens:** Insights dashboards, digest email

---

## 5. Product Modules

### 5.1 Core CRM

| Module | Description | Wave |
|--------|-------------|-----|
| **Home** | Dashboard: focus feed, pipeline snapshot, recent activity | P1 |
| **Deals** | Kanban + list view, search, filters | P0 |
| **Accounts** | Company records linked to deals | P1 |
| **Projects** | POC / implementation projects per deal | P2 |
| **Calls** | Call list, transcript viewer | P1 |
| **Requests** | Product + team requests | P2 |
| **Insights** | Team analytics, funnel, loss | P2 |
| **Settings** | Org, integrations, sales process | P1 |

### 5.2 Deal Detail (12 tabs)

| Tab | Wave | Description |
|-----|-----|-------------|
| Overview | P0 | KPIs + AI MEDDPICC summary |
| Plan | P1 | Milestones, success criteria |
| Activity | P1 | Timeline of all events |
| Events | P2 | Calendar-linked meetings |
| Participants | P1 | Stakeholders + roles |
| Product Requests | P2 | Feature gaps → Jira |
| Team Requests | P2 | Internal SA/TA asks |
| Insights | P2 | Deal-specific analytics |
| Notes | P1 | Internal + external notes |
| Tasks | P0 | Checklist + recent tasks sidebar |
| Projects | P2 | Linked POC projects |
| File Center | P2 | Attachments |

### 5.3 Agents Platform

| Capability | Wave | Phase |
|------------|-----|-------|
| Agents dashboard (stats, list) | P1 | 1 |
| Template library (9 templates) | P1 | 1–2 |
| Agent wizard (Basics → Review) | P2 | 2 |
| Runs log + credits | P1 | 1 |
| Approvals queue | P0 | 1 |
| Knowledge base | P2 | 2 |
| NL agent builder | P3 | 3 |

### 5.4 Integrations (MVP priority)

**CRM (pick one at onboarding — see `crm-connectors.md`):**

| Phase | Connectors |
|-------|------------|
| P1 | HubSpot, Pipedrive |
| P2 | Zoho CRM, Salesforce |
| P3 | Close, Copper, Dynamics |

**Chat channels (multiple per workspace — see `chat-channels.md`):**

| Phase | Providers |
|-------|-----------|
| P1 | Slack (delivery + slash commands) |
| P2 | Microsoft Teams, Google Chat |
| P3 | Webex, Discord (optional) |

**Other integrations:**

1. Gong (call recording)
2. Google Calendar (activity) — Phase 2
3. Jira (product requests) — Phase 2

### 5.5 Dual-stage model (source of truth)

| Layer | Field | Purpose | Updated by |
|-------|-------|---------|------------|
| **Kanban UI** | `deals.stage_id` → `pipeline_stages` | Internal pipeline columns | User DnD, agents (read-only MVP) |
| **CRM sync** | `external_records` + `crm_stage_mappings` | Mirror to HubSpot/Pipedrive/etc. | Sync jobs + approved write-back |
| **Presales process** | `deals.opine_process_stage_id` + milestones | Plan confidence, stepper | Tasks, Plan tab, POC agent |

**Rules:**
- Kanban DnD updates **internal** `stage_id` first; async push to CRM if mapping exists
- CRM webhook updates internal stage only via `crm_stage_mappings` (never raw external stage as PK)
- Presales process stage is **orthogonal** to CRM stage (do not conflate)

### 5.6 Marketing Site (public)

Public-facing site at `/` (marketing) separate from authenticated app (`/(dashboard)`). Patterns benchmarked against Opine; brand and copy are ours (purple `#7C3AED`, multi-CRM positioning).

| Page / area | MVP | Description |
|-------------|-----|-------------|
| Homepage | P1 | Hero, CRM connector strip, stats, features, testimonials, CTAs |
| Pricing | P1 | Custom pricing + 4-step quote wizard (`#quote`) |
| Why / product | P2 | Before/after deal card, feature deep-dives |
| Integrations | P2 | CRM + Gong + Slack overview |
| Blog / resources | P3 | CMS-driven (mega-menu previews) |
| `llms.txt` | P2 | Machine-readable site summary for AI crawlers |

**Stack:** Next.js `(marketing)` route group, **shadcn/ui**, Framer Motion. Lead form posts to Node API. Full section spec: [`landing-page.md`](landing-page.md).

**Differentiators vs Opine (marketing):**
- CRM connector strip (HubSpot, Pipedrive, Zoho, Salesforce)
- "10-minute onboarding" as hero proof point
- Citation-first AI messaging
- Purple brand (not Opine green/teal)

---

## 6. AI Sub-Agents (roadmap)

**Full product: 10 agents** — see [`agent-platform.md`](agent-platform.md). Release wave column indicates build order.

| # | Agent | Phase | Trigger | Output |
|---|-------|-------|---------|--------|
| 1 | Deal Context Synthesizer | 1 | activity.ingested, manual refresh | MEDDPICC, sentiment, fit score |
| 2 | CRM Hygiene | 1 | post-call, nightly | Field suggestions → approval |
| 3 | Deal Focus | 1 | daily 7am | Prioritized deal list → user's chat channel (DM or configured channel) |
| 4 | Risk Scanner | 1 | every 6h, daily | Risk score, alerts, kanban badges |
| 5 | Post-Call Follow-up | 1 | call.transcript_ready | Summary, tasks, email draft |
| 6 | Buying Signals | 2 | activity.ingested | Hot deal tags, chat alert |
| 7 | POC Orchestrator | 2 | stage → Technical Validation | POC plan, Jira tasks |
| 8 | Negotiation Tracker | 2 | activity.ingested | Objection tags, talk tracks |
| 9 | Win/Loss & Product Feedback | 3 | deal.closed, quarterly | Reports, product requests |
| 10 | Weekly Leadership Digest | 2 | Monday 8am | Email + chat digest |

**Principles:**
- Query structured deal context before LLM inference
- Every claim must cite `artifact_id`
- User-locked MEDDPICC fields survive refresh
- CRM writes require approval unless field is opted-in

---

## 7. Functional Requirements

### FR-001 Pipeline Kanban
- **FR-001.1** Display 7 default stages (Qualification → Closed Won/Lost)
- **FR-001.2** Column header shows deal count + total value (`$107K / $1.08M`)
- **FR-001.3** Deal cards show: logo, company, value, owner, SE, sentiment badge, fit score, blocker count
- **FR-001.4** Drag-and-drop between columns with optimistic UI + API rollback on failure
- **FR-001.5** Toggle board vs list view; persist in URL query params
- **FR-001.6** Search deals by company, title, owner (debounced 300ms)
- **FR-001.7** Filter by sentiment, stage, owner, value range

### FR-002 Deal Detail KPIs
- **FR-002.1** Display: Deal Value, Weighted Value, Win Probability, Plan Confidence, Blockers, Important
- **FR-002.2** Weighted Value = `deal_value × (win_probability / 100)`
- **FR-002.3** Plan Confidence from milestone completion in current + prior stages
- **FR-002.4** Process stepper: On Deck → Success Planning → Technical Validation → Business Outcomes → Tech Win
- **FR-002.5** Show `(completed/total)` per stage (e.g. Technical Validation 6/12)

### FR-003 AI Deal Summary (MEDDPICC)
- **FR-003.1** Stream 8 loading steps via SSE before synthesis
- **FR-003.2** Render 8 sections: Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition
- **FR-003.3** Show "Not reported" when evidence absent — no hallucination
- **FR-003.4** Citation dot per bullet → side panel with transcript excerpt
- **FR-003.5** Manual refresh button; "Refreshing" badge during generation
- **FR-003.6** Per-section lock toggle — locked fields skip AI overwrite
- **FR-003.7** Auto-refresh on: new call, stage change, note added (debounced 2 min)

### FR-004 Agents
- **FR-004.1** Dashboard: Total Agents, Active, Runs (30d), Credits (30d)
- **FR-004.2** Agent list: name, owner, last run, cost (30d)
- **FR-004.3** Start from template modal with 9 pre-built templates
- **FR-004.4** Runs page: status, trigger, scope, credits, step timeline
- **FR-004.5** Approvals: preview, edit, approve/reject, expire after 48h

### FR-005 Integrations
- **FR-005.1** Category grid: CRM, Calendar, Call Recording, Chat, Product Management
- **FR-005.2** OAuth connect flow with popup + polling for status
- **FR-005.3** Health badges: Enabled (green), Warning (orange), Not connected
- **FR-005.4** Deal-level validation (e.g. chat channel linked) surfaces as blocker
- **FR-005.5** All CRM operations through `CrmConnector` interface — no provider-specific code in UI/agents
- **FR-005.6** One primary CRM per workspace; switching CRM requires disconnect warning + re-onboarding
- **FR-005.7** All chat delivery through `ChatConnector` + `ChatDeliveryService` — agents never call Slack/Teams APIs directly

### FR-009 Chat Channels (P1 delivery, P2 multi-provider)
- **FR-009.1** Workspace admin connects one or more chat providers (Slack P1; Teams + Google Chat P2) via OAuth
- **FR-009.2** User configures notification preferences: primary provider, DM vs channel, per event type (Deal Focus, approvals, risk alerts, digest)
- **FR-009.3** User links chat identity (external user ID) to workspace account via email match
- **FR-009.4** Deal-level: link `#deal-*` channel on any connected provider; ingest thread messages as deal artifacts
- **FR-009.5** Outbound: agents deliver via `ChatDeliveryService` respecting user prefs with fallback (prefs → deal channel → in-app)
- **FR-009.6** Inbound commands (Slack MVP): `/focus`, `/deal {name}`, `/approve {id}`, `/reject {id}`, `/help`
- **FR-009.7** Interactive messages: Approve / Reject / View in app buttons on approval notifications (signed payloads, 48h TTL)
- **FR-009.8** Optional onboarding step 6: connect chat tool (non-blocking)
- **FR-009.9** Settings UI: workspace chat connections + per-user notification matrix — see `chat-channels.md` §7
- **FR-009.10** Audit log for inbound chat commands (`chat_command_audit`)

### FR-007 CRM Onboarding Wizard (P0)
- **FR-007.1** Forced `/onboarding` until complete (admin first login)
- **FR-007.2** Step 1: Select CRM provider (HubSpot, Pipedrive, Zoho, Salesforce)
- **FR-007.3** Step 2: OAuth connect with scope validation
- **FR-007.4** Step 3: Map CRM stages → internal pipeline stages (with auto-suggest)
- **FR-007.5** Step 4: Map CRM users → workspace users (email match; skippable)
- **FR-007.6** Step 5: Initial backfill with progress ("Importing 32/47 deals")
- **FR-007.7** Complete within **10 minutes** for ≤500 open deals
- **FR-007.8** Pipedrive: pipeline picker when account has multiple pipelines

### FR-006 Insights (Phase 2)
- **FR-006.1** Users table: deals, pipeline, win rate, hours, sparkline, activity breakdown
- **FR-006.2** Org average comparison toggle
- **FR-006.3** Activity Over Time chart: stacked bars + line overlay
- **FR-006.4** Export CSV

### FR-008 Marketing Site (Phase 1 — launch-ready)
- **FR-008.1** Public routes under `app/(marketing)/` with shared header, footer, announcement bar
- **FR-008.2** Homepage: hero with dual CTA, **CRM connector logo strip** (4 providers), animated stat counters (scroll-triggered), capability marquee, 3 feature sections with gradient backdrops, closing CTA
- **FR-008.3** Pricing: no public tier table; 4-step quote wizard (team size → CRM → needs → email) with progress bar and `#quote` anchor
- **FR-008.4** Mega-menus: Product, By team, Resources (blog preview slots), Integrations
- **FR-008.5** Trust badges (SOC 2, GDPR, G2 when available) in pre-footer and footer
- **FR-008.6** Primary CTA routes to sign-up or demo booking; secondary to `/why` or product pages
- **FR-008.7** SEO metadata + OG image per page; `llms.txt` at site root
- **FR-008.8** `prefers-reduced-motion`: disable count-up and marquee
- **FR-008.9** Lighthouse Performance ≥ 90 on homepage (optimized WebP/AVIF assets)
- **FR-008.10** Copy guardrails: never use Opine trademark; emphasize multi-CRM + citations — see [`competitive-opine.md`](competitive-opine.md) §7

---

## 8. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Deal board load | < 2s P95 (50 deals/stage) |
| NFR-002 | MEDDPICC first section | < 15s after refresh |
| NFR-003 | Post-call processing | < 15 min from Gong webhook |
| NFR-004 | Uptime | 99.5% MVP |
| NFR-005 | Multi-tenancy | `workspace_id` on all rows |
| NFR-006 | Auth | SSO-ready; RBAC: admin, manager, member |
| NFR-007 | Audit | All agent runs + approvals logged 90 days |
| NFR-008 | PII | Encrypt tokens at rest; TLS in transit |
| NFR-009 | Accessibility | WCAG 2.1 AA on core flows |
| NFR-010 | Browser support | Chrome, Firefox, Safari, Edge (last 2 versions) |
| NFR-011 | AI cost cap | ≤ $2/deal/month default; workspace-configurable |
| NFR-012 | CRM sync lag | Webhook < 2 min; poll fallback < 15 min |
| NFR-013 | Onboarding completion | ≥ 80% of new workspaces complete wizard in session 1 |
| NFR-014 | API versioning | `/api/v1/` prefix from launch |

---

## 9. Success Metrics

| Metric | Target (90 days post-launch) |
|--------|------------------------------|
| Weekly active reps | 70% of licensed seats |
| Post-call draft approval rate | > 60% |
| MEDDPICC refresh per active deal | ≥ 2/week |
| Time to first agent value | < 7 days from onboarding |
| CRM field suggestion acceptance | > 40% |
| NPS (rev team) | ≥ 40 |

---

## 10. Release Phases

### Phase 1 — Foundation (Weeks 1–5)
CRM connector framework + onboarding wizard + Pipeline + Deal Detail + MEDDPICC

### Phase 2 — Workflow (Weeks 6–10)
HubSpot + Pipedrive adapters + Agents #1, #3, #4, #5 + Gong + Slack + Approvals

### Phase 3 — Expansion (Weeks 11–14)
Zoho + Salesforce + Agent #2 CRM Hygiene write-back + Insights v1

### Phase 4 — Platform (Weeks 15–16)
Agent Builder + remaining agents + marketing site polish + launch

**Marketing (parallel, Weeks 13–16):** Homepage + pricing per [`landing-page.md`](landing-page.md); can start Week 1 as static shell.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucination on MEDDPICC | High | "Not reported" default; citations required; human lock |
| Gong webhook reliability | Medium | Polling fallback every 30 min |
| CRM OAuth token expiry | Medium | Health checks + admin alerts |
| Agent cost overrun | Medium | Credit caps per org; per-run limits |
| Scope creep vs Opine | High | Strict MVP table; defer Salesforce, NL builder |

---

## 12. Open Questions

| # | Question | Owner | Default if unresolved |
|---|----------|-------|----------------------|
| OQ-1 | Product name / brand | Founder | Use codename `ai-crm` |
| OQ-2 | OAuth: Nango vs in-house? | Eng | Nango for MVP (see `crm-connectors.md`) |
| OQ-3 | Seat-based vs credit-based pricing | Business | Credits internal only MVP |
| OQ-4 | Self-host vs cloud-only | Eng | Cloud SaaS on Vercel |

---

## 13. Document Index

| Doc | Path |
|-----|------|
| Architecture | `docs/architecture.md` |
| Design system | `docs/design-system.md` |
| Tech stack | `docs/stack.md` |
| Database schema | `docs/database.md` (MongoDB / Mongoose) |
| Frontend flows | `docs/frontend-flow.md` |
| API routes | `docs/api-routes.md` |
| Branding | `docs/branding-guidelines.md` |
| Work breakdown | `docs/wbs.md` |
| CRM connectors | `docs/crm-connectors.md` |
| Staff review | `docs/staff-review.md` |
| Landing page | `docs/landing-page.md` |
| Competitive (Opine) | `docs/competitive-opine.md` |
| Chat channels | `docs/chat-channels.md` |
| Agent platform (10 agents) | `docs/agent-platform.md` |
| Design system (canonical) | `docs/design-system.md` |

---

## 14. Acceptance Criteria (MVP Demo)

- [ ] User signs in, sees kanban with ≥10 seed deals
- [ ] Drag deal between stages; persists on refresh
- [ ] Open DocuSign-like deal; KPIs and stepper render
- [ ] Click Refresh on MEDDPICC; SSE steps complete; 8 sections appear with citations
- [ ] Simulate Gong webhook; Post-Call agent creates tasks + email draft in Approvals
- [ ] Deal Focus delivers to user's configured chat channel at scheduled time (or manual trigger)
- [ ] User approves a draft via `/approve` from Slack (or Teams/Chat in P2)
- [ ] Risk Scanner flags stalled deal; red badge on kanban card
- [ ] User completes onboarding wizard (HubSpot **or** Pipedrive); kanban shows live deals within 5 min
- [ ] Stage mapping persists; DnD updates internal stage + async CRM push
- [ ] CRM deal syncs value and stage (read MVP; write via approval in Phase 3)
- [ ] Marketing homepage loads at `/` with hero, CRM strip, stats, and pricing wizard submits lead
