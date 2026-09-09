# Staff Engineering Review
# AI-Native Presales CRM — Documentation & Architecture Critique

**Reviewer lens:** Principal / Staff Engineer (large-scale B2B SaaS, integrations-heavy, AI products)  
**Date:** 2026-09-09  
**Scope:** All docs in `docs/` — updated to **v2.0 stack** (Next.js + shadcn, Node.js API, MongoDB)  
**System design:** [`system-design.md`](system-design.md) · **Doc index:** [`README.md`](README.md)  
**Verdict:** **Strong product vision, underspecified systems boundaries — do not start coding until CRM connector framework and scope cut are resolved.**

---

## 1. Executive Verdict

| Dimension | Grade | Summary |
|-----------|-------|---------|
| Product clarity | **A-** | Opine reference is well decomposed; personas and agent map are credible |
| Architecture | **B-** | Sound layering, but HubSpot-shaped holes everywhere; missing sagas, idempotency, failure domains |
| Data model | **B** | Good entity split; weak canonical CRM abstraction; dual-stage model under-specified |
| API design | **B+** | REST contract is implementable; missing versioning, idempotency keys, connector-specific flows |
| Frontend / UX | **B** | Flows documented; onboarding is an afterthought; 12 deal tabs is MVP bloat |
| WBS / delivery | **C+** | ~245 person-days in 12 weeks with 2 engineers is **~2× optimistic**; testing back-loaded |
| Security / compliance | **C** | Basics listed; no threat model, GDPR delete, or webhook auth detail |
| AI / LLM ops | **B-** | Good HITL + citations; no eval harness in P0, cost model thin, no fallback models |
| **Overall readiness** | **B- (planning)** | Proceed after: (1) connector framework, (2) 40% scope cut, (3) revise timeline to 16–20 weeks |

---

## 2. Critical Findings (Must Fix Before Build)

### P0 — Blockers

#### CR-001: HubSpot-centric design will not scale to Pipedrive / Zoho / Salesforce

**Problem:** `deals.hubspot_*`, `external_crm_provider` as string, docs say "HubSpot first" everywhere. Each new CRM becomes a fork, not a plugin.

**Required fix:** Introduce **`CrmConnector` interface + canonical `CrmDeal` model** on day 1. All sync, webhooks, hygiene writes, and stage mapping go through `packages/integrations/crm/`. See `docs/crm-connectors.md`.

**Acceptance:** Adding Pipedrive is a new adapter file + provider seed row, not schema migration.

---

#### CR-002: Timeline is not credible

**Problem:** WBS totals ~245 person-days; 12 weeks × 2 engineers ≈ 120 productive days (0.5 utilization for meetings, review, bugs).

**Math:** You are planning **2× capacity**. Phase 3 (Insights + 7 agents + Agent Builder + Jira + E2E) will slip entirely.

**Required fix:**
- **MVP = 16 weeks** realistic, or
- Cut to **3 agents + 1 CRM connector + kanban + MEDDPICC read-only** in 12 weeks
- Move Insights, Agent Builder NL, Win/Loss, SQL explorer to Phase 4

---

#### CR-003: Dual-stage model (CRM stage vs Presales process) lacks source of truth

**Problem:** Kanban shows CRM stages; deal detail shows Opine process stepper + "Deal Stage: 4 - Proof-of-Value". Docs don't define:
- Who wins on conflict?
- Does DnD update CRM, internal stage, or both?
- How stage mapping works per connector (Pipedrive has multiple pipelines)

**Required fix:** Document in PRD:
- **Internal `pipeline_stage_id`** = UI kanban (your product)
- **`crm_stage_external_id`** = synced read/write to connector
- **`process_stage_id`** = presales methodology (orthogonal)
- DnD updates internal stage → optional async push to CRM via mapping table

---

#### CR-004: No idempotency or exactly-once semantics for integrations

**Problem:** Webhooks, agent CRM writes, and email sends will duplicate on retry. Job retries × Gong replays × user double-clicks = data corruption.

**Required fix:**
- `idempotency_keys` collection or MongoDB TTL dedupe index
- All webhooks: `(workspace_id, provider, external_event_id)` unique
- All agent side effects: `agent_run_id + action_type` dedupe
- CRM writes: optimistic locking with `external_revision` / etag per connector

---

#### CR-005: Onboarding is undefined for "pick your CRM and go"

**Problem:** User goal is simple onboarding across HubSpot, Pipedrive, Zoho. Docs only show "connect HubSpot" as step 2 of onboarding. No stage mapping UI, no field mapping, no "first sync progress", no empty-state when wrong CRM connected.

**Required fix:** Dedicated **5-step onboarding wizard** (see `docs/frontend-flow.md` §4.0). This is **P0 UX**, not settings-page OAuth.

---

### P1 — High severity (fix in first sprint)

#### CR-006: MEDDPICC cost and latency not in NFR budget

8 parallel LLM calls + synthesis per refresh × 30 deals × daily agent scans = **runaway COGS**.

**Fix:** Add NFR-011: max $X/deal/month AI spend; cache `input_hash`; skip regen if no new artifacts; use mini model for letters, one model for synthesis.

---

#### CR-007: Testing back-loaded to week 12

E2E and integration tests in WBS 8.x at end guarantees rework avalanche.

**Fix:** Each WBS module includes "tests in same week". Minimum: contract tests for `CrmConnector` per provider.

---

#### CR-008: `workspace_id` in webhook URL path

`POST /api/webhooks/hubspot/:workspaceId` enables enumeration and wrong-tenant routing if guessable.

**Fix:** Use signed webhook URLs with HMAC secret per connection: `/api/webhooks/crm/:connectionId` + signature header. Map `connectionId` → workspace internally.

---

#### CR-009: MongoDB used for analytics + SQL explorer (deferred — use aggregation pipeline)

Insights rollups and ad-hoc SQL on same DB as agent runtime will contend under load.

**Fix:** MVP OK with rollups + read replica; document Phase 2 split to ClickHouse or dedicated analytics DB. Block SQL explorer until semantic layer + read replica exist.

---

#### CR-010: Agent platform before single agent works end-to-end

Building wizard (5 steps), credits, 9 templates, and NL builder before **one** agent runs reliably is inverted.

**Fix:** Ship **Post-Call agent as hardcoded MongoDB background job** first; generalize to platform after 2nd agent shares code.

---

### P2 — Medium (address in architecture docs)

| ID | Issue | Recommendation |
|----|-------|----------------|
| CR-011 | No feature flags / kill switch for agents | `workspace.settings.agentsEnabled[]` + global kill |
| CR-012 | No GDPR/CCPA data deletion story | `workspace.delete()` cascades + CRM token revoke |
| CR-013 | Service account vs user token for agents underspecified | Document token hierarchy in architecture |
| CR-014 | 12 deal tabs in MVP | Ship Overview + Tasks + Notes + Activity only |
| CR-015 | Win probability formula magic numbers | Externalize as `scoring_config` JSON per workspace |
| CR-016 | No API versioning | Prefix `/api/v1/` from day 1 |
| CR-017 | Missing SLO error budgets | Define SLI for sync lag, agent latency |
| CR-018 | LangGraph on Vercel serverless timeout | Agent workers on Fly/Railway mandatory for long runs |

---

## 3. What Is Done Well (Keep)

1. **Citation-first AI** — MEDDPICC with "Not reported" and locks is the right trust model for enterprise sales.
2. **Approval queue before external writes** — avoids the #1 failure mode of AI CRMs (silent CRM corruption).
3. **Canonical activity model** — external/internal/prep taxonomy scales to Insights.
4. **Event bus shape** — `activity.ingested` debounce pattern is correct.
5. **Documentation depth** — API response shapes and component tree accelerate implementation *once scope is cut*.
6. **Separation packages/agents vs packages/integrations** — correct module boundary.

---

## 4. Multi-CRM Connector Strategy (Required Direction)

### 4.1 Product rule (MVP)

| Rule | Detail |
|------|--------|
| **One primary CRM per workspace** | User picks at onboarding; can disconnect and switch (with warning) |
| **Connector parity** | All CRMs support: deals sync, stage mapping, owner mapping, notes/activities read, field write via approval |
| **Launch connectors** | Phase 1: **HubSpot + Pipedrive**; Phase 2: **Zoho CRM + Salesforce**; Phase 3: Close, Copper, Dynamics |
| **Onboarding < 10 minutes** | Wizard, not settings archaeology |

### 4.2 Technical pattern

```
User picks CRM → OAuth → Fetch pipelines/stages → User maps to internal stages
     → Initial backfill job → Kanban populated → "You're live" screen
```

**Do not** use HubSpot field names in `deals` table. Use:

```typescript
interface CanonicalDeal {
  externalId: string;
  provider: CrmProvider;  // hubspot | pipedrive | zoho | salesforce
  title: string;
  amount: Money;
  stageExternalId: string;
  ownerExternalId: string;
  raw: Record<string, unknown>;  // provider-specific overflow
}
```

### 4.3 Build vs buy for OAuth

| Option | Pros | Cons |
|--------|------|------|
| **Nango / Apideck / Unified.to** | Fast Pipedrive+Zoho+HS | Cost, vendor dependency |
| **In-house adapters** | Control, margin | 3–5 days per CRM minimum |
| **Hybrid (recommended)** | Nango for OAuth token refresh; you own sync logic | Best MVP speed + control |

---

## 5. Revised MVP Scope (Staff Recommendation)

### Ship in 16 weeks (2 engineers)

| In | Out (defer) |
|----|-------------|
| Kanban + deal detail (4 tabs) | 8 other deal tabs |
| MEDDPICC read + manual refresh | Per-section incremental refresh |
| CRM connectors: HubSpot + Pipedrive | Zoho/SF until week 12–16 |
| Onboarding wizard | NL agent builder |
| 3 agents: Post-Call, Deal Focus, Risk Scanner | POC, Negotiation, Win/Loss |
| Context Synthesizer (feeds MEDDPICC) | CRM Hygiene write-back → Phase 2 |
| Gong + Slack chat delivery | Teams + Google Chat, Jira, Calendar |
| Approvals (email draft only) | Approve from chat (Slack `/approve`) |
| Seed Insights summary cards | Full Users table + SQL explorer |

### Success metric change

Replace "HubSpot bidirectional sync" acceptance with:

> **User completes onboarding wizard with Pipedrive OR HubSpot; kanban shows live deals within 5 minutes of OAuth.**

---

## 6. Document-Specific Notes

| Doc | Issue | Action |
|-----|-------|--------|
| `prd.md` | HubSpot-only G4; OQ-2 outdated | Multi-CRM goals + FR-007 onboarding |
| `architecture.md` | External diagram shows only HubSpot | CRM connector layer diagram |
| `database.md` | `hubspot_company_id`, provider string | `crm_*` canonical + `external_records` |
| `api-routes.md` | `/integrations/hubspot/*` only | Generic `/integrations/crm/:provider/*` |
| `frontend-flow.md` | Onboarding §4.1 too thin | Full wizard spec |
| `design.md` | No onboarding screens | Add wizard wireframes |
| `wbs.md` | 5.4–5.7 HubSpot-only | 5.0 CRM framework first |
| `branding-guidelines.md` | Fine | No change |

---

## 7. Risk Register (Updated)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CRM API rate limits (Pipedrive 10k/day) | High | High | Backfill queue + exponential backoff per workspace |
| Stage mapping wrong → angry RevOps | High | High | Mapping preview UI + dry-run first sync |
| LLM COGS exceed revenue | Medium | Critical | Per-workspace budget cap; cache aggressively |
| 12-week deadline slips morale | High | Medium | Re-baseline to 16 weeks publicly |
| Zoho OAuth regional endpoints | Medium | Medium | Store `api_domain` per connection (EU vs US) |

---

## 8. Sign-off Checklist (Gate to Step 6 Implementation)

- [ ] `docs/crm-connectors.md` approved
- [ ] PRD updated with FR-007 onboarding + multi-CRM
- [ ] WBS re-baselined to 16 weeks OR scope cut documented
- [ ] `CrmConnector` interface in `packages/integrations` stubbed
- [ ] Dual-stage source-of-truth paragraph in PRD §5.5
- [ ] Webhook URL design changed (no workspace UUID in path)
- [ ] Agent #1 scope = read-only MEDDPICC (no CRM write in Phase 1)
- [ ] Eval harness task added to WBS week 4
- [ ] Marketing spec reviewed — [`landing-page.md`](landing-page.md), [`competitive-opine.md`](competitive-opine.md)
- [ ] FR-008 marketing acceptance criteria in PRD

---

## 9. Related docs (post-review additions)

| Doc | Purpose |
|-----|---------|
| [`landing-page.md`](landing-page.md) | Marketing site build spec (Opine patterns + our copy) |
| [`competitive-opine.md`](competitive-opine.md) | tryopine.com product + design benchmark |
| [`crm-connectors.md`](crm-connectors.md) | Connector framework + onboarding |

---

## 10. Conclusion

The documentation set is **better than most Series A PRDs** for an AI vertical SaaS — clear agent taxonomy, thoughtful UX references, implementable API shapes. It reads like a **feature-complete Opine clone plan**, not a **survivable MVP**.

**Principal recommendation:** Freeze scope, **build the CRM connector framework first**, ship **onboarding wizard + 2 CRMs + 3 agents**, and move the timeline to **16 weeks**. That is how you win teams on Pipedrive and HubSpot without maintaining four codebases.

Next artifact: `docs/crm-connectors.md` (connector spec + onboarding).
