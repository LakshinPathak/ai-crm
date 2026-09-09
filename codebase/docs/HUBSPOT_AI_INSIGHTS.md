# HubSpot → AI CRM: data flow & AI insights roadmap

## Setup (Free tier)

1. **Private App token** — HubSpot → Settings → Integrations → Private Apps → create app with scopes:
   - `crm.objects.contacts` (read/write)
   - `crm.objects.companies` (read/write)
   - `crm.objects.deals` (read/write)
   - `crm.objects.tasks` (read/write)
   - `crm.schemas.contacts.read`, `crm.schemas.deals.read`
   - `crm.objects.notes` (read/write) if available

2. Add to `codebase/.env`:
   ```
   HUBSPOT_ACCESS_TOKEN=pat-...
   ```

3. Run scripts:
   ```bash
   cd codebase
   pnpm hubspot:test    # verify API access
   pnpm hubspot:seed    # populate HubSpot with dummy data
   pnpm hubspot:sync    # pull into AI CRM MongoDB
   ```

4. Or use UI: **Settings → Integrations → HubSpot → Sync now** (live mode when token is set).

## What gets synced

| HubSpot object | AI CRM | Use case |
|----------------|--------|----------|
| Companies | `Company` | Account context, industry, domain |
| Deals | `Deal` | Pipeline, amount, stage, close date |
| Notes | `Note` | Call summaries, MEDDPICC context |
| Tasks | `Task` | Follow-ups, activity hours |
| Contacts | (future) | Champion / economic buyer mapping |
| Webhooks | `POST /webhooks/hubspot` | Real-time deal/contact changes |

Records are idempotent via `crmExternalId` + `crmProvider: hubspot`.

## AI use cases (built + planned)

### Already live
- **MEDDPICC generation (Gemini)** — uses deal title, company, notes from HubSpot sync
- **Performance analytics** — per-user pipeline, win rate, activity breakdown from synced deals/tasks/notes
- **Activity charts** — time series + event-type donuts (enriched as more HubSpot engagements sync)

### Next (webhook → AI pipeline)
1. **Deal stage change** → auto-refresh MEDDPICC + suggest next task
2. **New note in HubSpot** → summarize with Gemini, flag risks (missing champion, no economic buyer)
3. **Stale deal** (no activity 14d) → agent run + Slack-style approval to nudge rep
4. **Win/loss signal** — sentiment + stage velocity → win probability adjustment

### Insights to surface
| Insight | Source data | AI action |
|---------|-------------|-----------|
| Pipeline at risk | Deals red/yellow + blockers | Rank deals for manager focus |
| Rep performance vs org | `/insights/performance` | Coaching tips per user |
| Activity gap | Tasks overdue, low logged hours | Suggest tasks from deal stage |
| MEDDPICC gaps | Letter confidence < 0.5 | Prompt for discovery questions |
| Post-call automation | Note webhook + Gong (later) | Extract action items → HubSpot tasks |

### Rate limits (Free)
- ~100 req / 10 sec — batch endpoints (100 records) + client throttle in `hubspot/client.ts`
- Search ~4–5 req/sec — used sparingly in sync
- Webhooks are event-driven — no polling cost

## Zoho / Salesforce
Same pattern later: seed script → sync → `crmExternalId` — deferred per your plan.
