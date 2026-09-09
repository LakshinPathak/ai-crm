# Analytics Expansion — Current State & Future Metrics

**Version:** 1.0  
**Date:** 2026-09-09  
**Related:** [`../prd.md`](../prd.md) §G9 · WBS 6.x · [`../api-routes.md`](../api-routes.md)

---

## 1. Current Insights module (`/insights`)

### 1.1 Tabs & APIs (live)

| Tab | Endpoint | Data |
|-----|----------|------|
| **Performance** | `GET /api/v1/insights/performance` | Org KPIs, per-user metrics, team rollup |
| **Activity** | `GET /api/v1/insights/activity?granularity=` | Time series, breakdown by type, donuts |
| **Funnel** | `GET /api/v1/insights/funnel` | Stage counts, values, conversion rates |
| **Loss** | `GET /api/v1/insights/loss` | Won/lost, loss reasons, win rate |
| **Users** | `GET /api/v1/insights/users` | Per-rep performance cards |
| **Summary** | `GET /api/v1/insights/summary` | Dashboard widgets (agents, sentiment, hot deals) |

**Frontend:** `apps/web/app/(dashboard)/insights/page.tsx`  
**Backend:** `apps/api/src/modules/insights/handlers.ts`  
**Math:** `apps/api/src/lib/analytics.ts`

### 1.2 Per-user metrics today

From `computeUserPerformance()`:

| Metric | Calculation |
|--------|-------------|
| Active deals | Open deals owned by user |
| Open pipeline | Sum of `deal.amount` |
| Closed won | Won deals value |
| Win rate | won / (won + lost + open) approximation |
| Notes count | Notes authored in period |
| Tasks completed | Tasks done in period |
| Agent runs | Runs on user's deals in period |
| Total hours | Derived from activity types |
| Change % | vs previous 30-day period |

### 1.3 Activity types tracked

```typescript
// apps/api/src/lib/analytics.ts
ACTIVITY_TYPES: customerMeeting, internalMeeting, dealPrep, logged, other
ACTIVITY_LABELS: POC, Customer Demo, Kickoff Call, Workshop, External, Internal
```

Granularity: `daily` | `weekly` | `monthly`

### 1.4 Gaps in current implementation

| Gap | Impact |
|-----|--------|
| No SQL explorer | Power users can't ad-hoc query |
| No export beyond UI button stub | RevOps can't pull CSV to Sheets |
| Single "Sales" team | No real team hierarchy |
| No forecast / pipeline velocity | Leadership can't trust commit |
| Agent output not in Insights | Win/loss agent isolated from UI |
| No MEDDPICC completeness analytics | Can't see qual gaps by rep |
| No integration health metrics | Sync failures invisible |

---

## 2. Future analytics — by category

### 2.1 Pipeline & forecast

| Metric | Definition | Data sources | Priority |
|--------|------------|--------------|----------|
| **Pipeline velocity** | Avg days per stage | `deals.stageHistory` (new field) | P1 |
| **Weighted pipeline** | Σ(amount × winProbability) | deals | P1 |
| **Forecast categories** | Commit / best case / pipeline | deals + manager override | P2 |
| **Slip rate** | % deals with `expectedCloseDate` pushed | deal snapshots | P1 |
| **Stage aging heatmap** | Days in current stage by rep | deals + stages | P1 |
| **Conversion by segment** | Funnel split by industry, size | deals + companies | P2 |
| **Pipeline coverage** | Pipeline / quota ratio | deals + quota table (new) | P2 |

**Implementation sketch:**

```typescript
// New collection: deal_stage_history
{ dealId, fromStageId, toStageId, changedAt, changedBy }

// API: GET /api/v1/insights/velocity?period=90d
// Aggregation: $group by stageId, $avg days between transitions
```

### 2.2 Win / loss intelligence

| Metric | Definition | Priority |
|--------|------------|----------|
| **Loss reason trends** | Top reasons over time (already partial) | P0 ✅ |
| **Competitive loss rate** | Losses where competitor mentioned | P1 |
| **MEDDPICC gap on losses** | Which letters empty on lost deals | P1 |
| **Deal size vs win rate** | Bucket analysis | P2 |
| **Sales cycle length** | createdAt → closedAt by outcome | P1 |
| **Rep win rate vs team** | Normalized comparison | P1 ✅ partial |
| **AI win/loss narrative** | Agent `win-loss-analysis` output in UI | P1 |

**Wire win-loss agent:**

```
POST /api/v1/agents/from-template/win-loss-analysis
POST /api/v1/agents/:id/run
→ Store result in insights_reports collection
→ Render on Insights → Loss tab
```

### 2.3 Activity & engagement

| Metric | Definition | Priority |
|--------|------------|----------|
| **SE hours per deal** | Activity time series per deal | P1 |
| **Meeting density** | Meetings/week per open deal | P2 |
| **Multi-threading score** | # distinct participants engaged | P2 |
| **Champion engagement gap** | Days since champion contact | P1 |
| **Gong talk ratio** | Rep vs prospect (from transcript) | P2 |
| **Email response time** | Future email integration | P3 |
| **Slack activity per deal** | Messages tagged to deal | P2 |

### 2.4 AI & agent analytics

| Metric | Definition | Priority |
|--------|------------|----------|
| **Agent runs by template** | Volume per agent type | P1 |
| **Credits consumed** | Workspace + per agent (partial ✅) | P0 |
| **Approval rate** | Approved / (approved + rejected) | P1 |
| **Time to approve** | Approval latency | P1 |
| **MEDDPICC refresh frequency** | Runs per deal | P1 |
| **Citation coverage %** | Claims with artifact refs | P1 |
| **AI-influenced wins** | Deals with high agent usage that closed won | P2 |
| **Hallucination reports** | User-flagged bad citations | P2 |

**New endpoints:**

```
GET /api/v1/insights/agents?period=30d
GET /api/v1/insights/approvals?period=30d
GET /api/v1/insights/meddpicc-completeness
```

### 2.5 Qualification (MEDDPICC) analytics

| Metric | Definition | Priority |
|--------|------------|----------|
| **Letter completeness** | % deals with each letter filled | P1 |
| **Weakest letter by stage** | Aggregate gaps | P1 |
| **MEDDPICC score trend** | Over deal lifetime | P2 |
| **Correlation: completeness vs win** | Statistical | P2 |
| **Rep MEDDPICC hygiene** | Avg completeness by owner | P1 |

**Query pattern:**

```javascript
DealMeddpicc.aggregate([
  { $match: { workspaceId } },
  { $project: {
      dealId: 1,
      filledCount: { $size: { $filter: { input: '$letters', cond: '$$this.value' } } }
  }},
  { $group: { _id: '$ownerId', avgFilled: { $avg: '$filledCount' } } }
])
```

### 2.6 Integration health

| Metric | Definition | Priority |
|--------|------------|----------|
| **Last sync time** | Per CRM connection | P1 (R6 WS-4) |
| **Sync error count** | Failed incremental jobs | P1 |
| **Webhook delivery rate** | HubSpot/Gong events processed | P1 |
| **Records synced** | external_records count | P2 |
| **Token expiry warnings** | OAuth refresh failures | P1 |

### 2.7 Product & requests analytics

| Metric | Definition | Priority |
|--------|------------|----------|
| **Top feature requests** | Product requests by theme | P2 |
| **Requests per deal stage** | When gaps surface | P2 |
| **Time to resolve team requests** | Internal SLA | P2 |
| **POC success rate** | Projects completed / started | P2 |

---

## 3. SQL explorer (WBS 6.16)

**Goal:** Read-only SQL-ish query UI for RevOps.

### Phase 1 — Curated views

Pre-built queries (no raw SQL):

| View | SQL (internal) |
|------|----------------|
| Open pipeline by rep | `SELECT owner, SUM(amount) FROM deals WHERE status='open' GROUP BY owner` |
| Stalled deals | `WHERE lastActivityAt < NOW() - 14 days` |
| Loss reasons QTD | `GROUP BY lostReason` |

### Phase 2 — Safe SQL subset

- Allow `SELECT` only on whitelisted views
- Row limit 10,000
- Workspace scoping injected automatically
- Export CSV

**Route:** `GET /api/v1/insights/sql?query=...` (admin only)

**UI:** `/insights/sql` tab with Monaco editor

---

## 4. Dashboard wireframes (future tabs)

```
Insights
├── Performance     ✅
├── Activity        ✅
├── Funnel          ✅
├── Loss            ✅ (+ win-loss agent narrative)
├── Users           ✅
├── Forecast        🔲 NEW
├── MEDDPICC        🔲 NEW
├── Agents          🔲 NEW
├── Integrations    🔲 NEW
└── SQL Explorer    🔲 NEW (admin)
```

---

## 5. Data model additions

| Collection / field | Purpose |
|--------------------|---------|
| `deal_stage_history` | Velocity, slip |
| `insights_reports` | Cached agent report output |
| `quotas` | Rep quota for coverage |
| `analytics_snapshots` | Daily rollup for fast dashboards |
| `deals.winProbability` | Already exists — use in weighted pipeline |
| `deals.stageEnteredAt` | Stage aging |

### Daily snapshot worker

```typescript
// Cron: 2am workspace TZ
// For each workspace:
//   - pipeline value, deal count, sentiment breakdown
//   - agent runs, credits used
//   - funnel snapshot
// Insert into analytics_snapshots { date, workspaceId, metrics }
```

Enables trend charts without heavy aggregations on every page load.

---

## 6. Chart components to build

| Component | Library | Used in |
|-----------|---------|---------|
| `VelocityHeatmap` | Recharts / custom | Forecast tab |
| `MeddpiccRadar` | Recharts radar | MEDDPICC tab |
| `AgentRunsChart` | Recharts bar | Agents tab |
| `SlipTimeline` | Recharts line | Forecast tab |
| `CompetitiveDonut` | Existing donut pattern | Loss tab |

Reuse patterns from `apps/web/components/analytics/`.

---

## 7. Export & sharing

| Format | Endpoint | Priority |
|--------|----------|----------|
| CSV | `GET /api/v1/insights/export?tab=funnel` | P1 |
| PDF report | Server-side Puppeteer | P3 |
| Scheduled email | Weekly digest agent | P2 |
| Embed iframe | Leadership portal | P3 |

---

## 8. Implementation priority (R7–R8)

| Wave | Deliverables |
|------|--------------|
| **R7a** | Agents tab, MEDDPICC completeness, CSV export |
| **R7b** | Stage history + velocity, slip rate |
| **R8a** | Forecast tab, weighted pipeline |
| **R8b** | SQL explorer (curated views) |
| **R8c** | Daily snapshot worker |

---

## 9. Vibe coding prompt examples

```
Add GET /api/v1/insights/meddpicc-completeness per analytics-expansion.md §2.5.
Return { byLetter: { M: 85, E: 72, ... }, byRep: [...] }.
Follow handlers pattern in insights/handlers.ts. Add MEDDPICC tab to insights page.
```

```
Implement deal_stage_history writes when deal stage changes in deals/handlers.ts.
Add velocity endpoint per analytics-expansion.md §2.1.
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-09 | v1.0 — Initial analytics expansion spec |
