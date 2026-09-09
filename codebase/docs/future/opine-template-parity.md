# Opine Template Parity — Can We Replicate Exactly?

**Version:** 1.0  
**Date:** 2026-09-10  
**Reference:** Opine “Start from template” modal + Agents dashboard (screenshot 2026-09-02)

---

## Short answer

| Layer | Parity | Notes |
|-------|--------|-------|
| **Template names & descriptions** | **~95%** | 13/13 Opine-visible templates exist in AI CRM |
| **“Start from template” UI** | **~85%** | Modal + dashboard KPIs live; grouping polish optional |
| **Agent execution (logic)** | **~65%** | All templates have executors; depth varies (rules vs LLM vs Gong) |
| **Slack / GChat delivery** | **~15%** | Designed, not wired — biggest gap vs Opine |
| **Scheduled / event triggers** | **~30%** | UI collects cron/events; workers not fully wired |
| **Exact end-to-end replication** | **R7–R8** | Achievable after chat delivery + Gong RAG + cron |

**Verdict:** Template **catalog and UI can be replicated now**. **Behavioral parity** (Slack alerts, transcript scan, Monday digest email, polished win/loss doc) needs **R6–R8** work.

---

## 1. Template-by-template matrix

| Opine template (screenshot) | AI CRM slug | In catalog | Executor | Opine-like output today | Gap to exact |
|-----------------------------|-------------|------------|----------|-------------------------|--------------|
| Negotiation & Objection Tracker | `objection-tracker` | ✅ | ✅ | Keyword scan on **notes**; tags + talk tracks | Gong/Slack ingest; auto MEDDPICC patch; Slack alert |
| Buying Signals | `buying-signals` | ✅ | ✅ | Rule + keyword scoring on notes/MEDDPICC | Slack “hot deal” alert; exec detection from calendar |
| Product Feedback Capture | `product-feedback` | ✅ | ✅ | Regex on notes → approval for product gap | Link to **Product Requests** module record |
| Cross-Deal Win/Loss Analysis | `win-loss-analysis` | ✅ | ✅ | 90-day closed deals, themes, recommendations | **Chart + PDF document** delivery |
| Weekly Reporting Digest | `weekly-digest` | ✅ | ✅ | Narrative from deal activity | **Monday email** + Slack; scheduled cron |
| Risk Scanner (partial in modal) | `risk-scanner` | ✅ | ✅ | Stalled deals → approval tasks | Daily Slack to channel |
| Deal Stalling (partial) | `deal-stalling` | ✅ | ✅ (shared) | Same risk scanner path | Badge on kanban + notification |
| Post-call recap (partial) | `post-call` | ✅ | ✅ | Email draft → approvals | Trigger on Gong ingest; Slack to deal channel |
| Meeting Summary | `meeting-summary` | ✅ | ✅ (post-call) | Same executor | Transcript-required quality |
| My Deal Focus | `deal-focus` | ✅ | ✅ | Weighted ranking, top 5 | **Slack DM** delivery |
| POC Kickoff | `poc-kickoff` | ✅ | ✅ | Kickoff plan doc → approval | Stage-change trigger; Slack post |
| CRM Hygiene | `crm-hygiene` | ✅ | ✅ | Field gap suggestions | HubSpot write-back after approve |
| MEDDPICC Synthesizer | `meddpicc-synth` | ✅ | ✅ | **Live SSE** with citations | Opine may not have 8-letter — we exceed |

### Opine custom agents (dashboard table, not in modal)

| Opine agent name | AI CRM equivalent | Status |
|------------------|-------------------|--------|
| **POC Plan Generator** | `poc-kickoff` | ✅ Same intent — rename/marketing optional |
| **Closed Won Handoff Doc** | — | 🔲 **Missing template** — add `closed-won-handoff` (R7) |

**Suggested new template:**

```typescript
{
  slug: 'closed-won-handoff',
  name: 'Closed Won Handoff',
  category: 'process',
  description: 'When a deal closes won, generate SE→CS handoff package: stakeholders, MEDDPICC summary, open items, and implementation notes.',
}
```

---

## 2. Dashboard parity (Agents page)

| Opine dashboard element | AI CRM | Status |
|-------------------------|--------|--------|
| Total Agents (active/inactive) | `/agents` KPI cards | ✅ |
| Runs (30d) chart | `runs30d` stat | ✅ (bar chart optional polish) |
| Credits (30d) | `creditsUsed30d` | ✅ |
| Agents table: Title, Owner, Runs, Cost, Last Run | Table on `/agents` | ✅ |
| “Start from template” modal | `Dialog` with template list | ✅ |
| Category tags (Signals, Reporting, …) | `Badge` via `agentCategoryBadge` | ✅ |
| Knowledge Base nav | — | 🔲 Not built (WBS 4.x) |
| Search / filter agents | Search + mine/all toggle | ✅ |

---

## 3. What “exact replication” requires

### Already done ✅

- 13 templates in `TEMPLATES` array (`handlers.ts`)
- `GET /agents/templates`, `POST /agents/from-template/:slug`
- Template picker modal on `/agents`
- 5-step wizard `/agents/new?template=...`
- 10 dedicated executors + risk scanner shared path
- Approvals queue for write/email drafts
- Runs log + credits tracking
- MEDDPICC (stronger than Opine for qualification)

### R6 — Data depth

| Item | Unblocks |
|------|----------|
| Gong transcript + RAG | Objection tracker, meeting summary, buying signals on **calls** |
| CRM incremental sync | Stage-change triggers for POC kickoff |
| NL `draft-from-nl` | “Ask to build” right panel |

### R7 — Delivery & triggers

| Item | Unblocks |
|------|----------|
| Slack OAuth + `ChatDeliveryService` | “alert via Slack”, deal focus DM |
| Google Chat / Teams | Multi-chat parity |
| Cron scheduler for agents | Weekly digest Monday 9am |
| Event bus (`activity.ingested`, `deal.stage_changed`) | Post-call, POC kickoff auto-run |
| `closed-won-handoff` template | Handoff doc agent |

### R8 — Polish

| Item | Unblocks |
|------|----------|
| Win/loss PDF + chart in Insights | “Polished document with chart” |
| Product request record link | Product feedback → module |
| Knowledge Base | Opine nav item |
| Email send on digest approve | Weekly email delivery |
| Create agent from Slack | Full Opine workflow in chat |

---

## 4. Executor depth today

| Template | Implementation style | Opine likely uses |
|----------|------------------------|-------------------|
| `deal-focus` | Weighted scoring (rules) | Rules + LLM “why now” |
| `objection-tracker` | Keyword taxonomy + confidence | LLM on transcripts |
| `buying-signals` | Keyword + deal fields | LLM + calendar |
| `product-feedback` | Regex patterns | LLM extraction |
| `win-loss-analysis` | Theme keywords + summary text | LLM + charts |
| `weekly-digest` | Aggregation + narrative | LLM + email |
| `post-call` | Note-based draft | Transcript + LLM |
| `meddpicc-synth` | **Gemini SSE** | Comparable |
| `poc-kickoff` | Structured plan generation | LLM template |
| `crm-hygiene` | Gap detection | Rules + LLM |

**Upgrade path:** Swap keyword layers for `search_artifacts` RAG + Gemini structured output per template (incremental, template by template).

---

## 5. UI tweaks for closer Opine match (quick wins)

| Change | Effort | File |
|--------|--------|------|
| Group templates in modal by category (Process / Risk / Signals / Reporting) | 2h | `agents/page.tsx` |
| Show template count in modal subtitle | 30m | Same |
| Rename “POC Kickoff” → “POC Plan Generator” (alias) | 30m | `handlers.ts` |
| Add `closed-won-handoff` to catalog | 1d | New executor |
| Enable NL panel (R6) | 2–3d | `agents/new/page.tsx` |
| “Customize after applying” → redirect to `/agents/new?template=` | 1h | `from-template` flow |

---

## 6. Recommended build order

```
1. Template modal grouping (cosmetic)     ← this week
2. closed-won-handoff template          ← R7
3. Gong RAG (R6 WS-1)                   ← unlocks signal agents
4. Slack delivery (R7)                  ← unlocks “alert via Slack”
5. Cron worker (R7)                     ← weekly digest
6. LLM upgrade per executor (ongoing)   ← depth parity
7. Win/loss PDF + chart (R8)            ← reporting polish
```

---

## 7. Vibe coding prompt

```
Implement Opine template parity per docs/future/opine-template-parity.md §5:
- Group Start from template modal by category
- Add closed-won-handoff template + executor (deal.closed trigger, handoff doc → approval)
- Optional: alias poc-kickoff display name to "POC Plan Generator"
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-10 | v1.0 — Opine screenshot parity analysis |
