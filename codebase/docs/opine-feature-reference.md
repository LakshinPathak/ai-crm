# Opine (tryopine.com) — Full Feature List

*Compiled for product-replication reference. Sourced from tryopine.com, docs.tryopine.com (public preview), G2 listing, and press coverage. Features marked (implied) are named/described in marketing copy but not confirmed via product screenshots — validate against a live trial before building.*

**Used by:** [`landing-page.md`](landing-page.md) · `apps/web` marketing site

---

## 1. Core Concept

Opine is an **AI-powered presales/technical-sales operating system**. It sits alongside the CRM (Salesforce/HubSpot) and pulls context from every tool where a technical deal actually happens (Slack, Gong, email, calendar, Jira, docs), structures that context into a per-opportunity record, and runs AI agents on top of it to automate admin work, surface risk, and keep every stakeholder (seller, SE, buyer, leadership) aligned.

Core building blocks (from their own product tour):

- **Workbench** — personal home screen for an SE: their deals, their assigned tasks, and a chat interface to the AI.
- **Deals** — pipeline view of every active deal, auto-synced from CRM.
- **Evaluations** — structured POC/POV workflow (phases: prerequisites → execution → outcomes).

---

## 2. Feature List by Module

### A. Technical Sales Management (core workflow layer)

1. **Dedicated Technical Process / Workflow** — a presales-specific workflow separate from the seller's CRM pipeline stages (doesn't force SE work into AE-shaped CRM fields).
2. **POV / POC Planning** — structured plan for proof-of-value engagements; templates seed standard phases and work items so a new evaluation starts pre-populated with the team's process.
3. **Buyer Portal** — shared external-facing workspace where sellers, technical team, and the buyer collaborate in one thread (replaces email/Slack ping-pong with the customer).
4. **Team Requests & Specialist Routing** — route ad-hoc technical requests (e.g., "need a security architect on this call") to the right internal specialist and track the request to resolution.
5. **Automated Activity Tracking** — passively captures presales activity (calls, docs touched, meetings) without manual logging by the SE.
6. **Technical Fit Assessment / Qualification** — scores technical fit early using parsed requirements docs; auto green-lights or flags qualifying opportunities, assigns a resource, and summarizes red-flag gaps.
7. **Evaluation Phases (Prerequisites → Execution → Outcomes)** — structured lifecycle for every POC, not just a flat task list.
8. **Custom Qualification Framework Support** — auto-fills MEDDPICC / 3 Why's / SPICED / or a custom framework's fields directly from real conversation content.

### B. AI Deal Intelligence

9. **Automatic Deal Summarization** — AI-generated concise deal-health summaries from calls, chats, tickets, and CRM activity.
10. **Deal Health / Risk Scoring** — single glanceable risk score per opportunity so leadership can spot slippage early.
11. **Pre-Call Briefing** — auto-builds a brief for each rep before a call: account history, stakeholder context, open risks, talking points, pulled from every connected channel.
12. **Handoff Context Packages** — SE→AE and Sales→CS handoffs carry full context automatically (no cold handoffs).
13. **Inline Source Citations** — every AI claim/summary links back to its source (a specific Slack message, transcript moment, or CRM field) — hover-to-preview, click-through-to-record. Claims that can't be traced to a source are excluded.
14. **"Whole Record" per Opportunity** — one unified record per deal that merges conversations, fields, and technical-sale-specific state (the thing neither the CRM nor the call-recording tool captures alone).

### C. Agentic Automation

15. **CRM Auto-Enrichment** — agents extract structured fields (competitors, technical requirements, next steps, stakeholder roles, deal risks) from calls/Slack/email/calendar and write them directly into CRM fields.
16. **Configurable Deal/GTM Monitors** — plain-language monitor rules (e.g., "flag if a competitor is mentioned in a late-stage deal," "flag if a champion goes quiet") that trigger automatically.
17. **Deal Risk Monitoring Agent** — dedicated agent sweeping for: stalled deals, competitor mentions, champion job changes, sentiment flips, single-threaded deals — scoped to chosen pipelines, run on a schedule (daily) or event-triggered (on deal change / new context).
18. **Agent Memory** — each automation agent retains a memory that distills prior user feedback and run history into more durable behavior over time (a lightweight per-agent fine-tuning/preference loop).
19. **Dry-Run Mode for Agents** — test/preview an agent's proposed changes before they go live.
20. **Human-in-the-Loop Approval** — agent writes (CRM updates, drafted messages) wait for human approval before committing — visible reasoning + evidence + proposed action shown together.
21. **Delivery Channel for Agent Output** — agent findings/alerts delivered in Slack or directly on the deal record, always with evidence + a drafted next step attached.
22. **Automated Document/Handoff Generation** — customizable document templates (e.g., win/loss reports, sales→services handoff docs) auto-populated from captured deal data.
23. **Ticket/Blocker Tracking Tied to Deals** — feature requests and bugs raised during a deal are tracked in context and linked to the deal's progress (with a Jira push integration).

### D. Leadership Analytics & Reporting

24. **Sales Funnel / Pipeline View** — filterable by person, team, deal value, stage, or date range; built to replace ad hoc CRM report-building.
25. **Bottleneck Diagnosis** — identify where deals stall in the POC/eval cycle at a team or segment level.
26. **Win/Loss Analysis (structured, auto-generated)** — across deals, segments, and time periods, with drill-down.
27. **Custom Deep-Research Reports** — build reusable AI report templates (e.g., win/loss by rep, objection patterns by segment, competitive win/loss) on top of captured deal data.
28. **AI-to-SQL Query Assistant ("Opine SQL AI")** — turns plain-English requests into SQL so non-technical stakeholders can generate/reuse data queries against the warehouse.
29. **Scheduled Data Exports** — scheduled export of queries/reports to a data warehouse or downstream tool (e.g., weekly pipeline snapshot, SE-leader risk feed, blended forecast model combining deal-health signal + CRM + product usage).
30. **Forecast Modeling Beyond Stage/Gut-Feel** — blends Opine's deal-health evidence with CRM stage and product-usage data rather than relying purely on rep-reported confidence.

### E. Product Feedback & Gap Intelligence

31. **Customer Requirement Tracking** — every customer requirement mentioned across calls/tickets/docs is tracked centrally, tied to the deal it came from.
32. **Product-Gap Aggregation for Leadership** — recurring "misses expectations" signals rolled up so Product/Sales leadership can see patterns (e.g., a PM spotting a recurring gap to prioritize for a sprint; a sales leader doubling down on top-rated differentiators in messaging).
33. **Competitive/Objection Pattern Detection** — surfaces which objections or competitor mentions correlate with losses, by segment.

### F. Buyer-Facing Features

34. **Shared Buyer Portal / Thread** — single external collaboration space instead of buyers chasing scattered updates across email/Slack.
35. **Auto-Generated Stakeholder Updates (internal + external)** — pulls latest deal context into a digestible update without manually compiling across tools.

### G. Integrations

Confirmed integration list (from docs + integrations page):

- **CRM:** Salesforce, HubSpot
- **Call intelligence:** Gong, Chorus
- **Forecasting:** Clari
- **Chat:** Slack, Microsoft Teams
- **Calendar/Meetings:** Google Calendar, Google Meet, Zoom, Microsoft Outlook
- **Docs/Storage:** Google Drive, Notion
- **Issue tracking:** Jira, Linear
- **API:** Public REST-style API (Deals, Evaluations, Invitations, Organization, Tickets, Users objects) + docs on GitBook
- **MCP** — Opine's engine is exposed via Model Context Protocol so external AI tools/agents can query it as a data source
- **Partner integration:** Consensus (interactive demo platform)

### H. Security & Compliance

36. SOC 2 Type II certified  
37. GDPR compliant  
38. Annual third-party penetration testing  
39. 24/7 monitoring  
40. SAML / SSO provisioning  
41. Role-based, granular internal & external access permissions  
42. AES-256 encryption at rest  
43. TLS 1.3 encryption in transit  
44. Dedicated public trust center (trust.tryopine.com)

### I. Pricing/Packaging Model

45. **No public self-serve tiers** — custom pricing only, scoped by team-size bracket via a 4-step qualifying quiz (1–10 / 11–50 / 51–200 / 200+ people) rather than a fixed per-seat price list.  
46. Onboarding, data migration, and CRM integration bundled into every deal (not sold separately).

### J. Novel/Unusual Feature

47. **"Opine Bets™"** — pipeline betting mechanic tied to deals; under-documented publicly.

---

## 3. Suggested MVP Scope If Replicating

Highest-leverage subset for **AI CRM** landing page and v1 product:

1. One unified per-deal record pulling from CRM + chat + call-recording + calendar.
2. AI-generated deal summaries **with inline source citations**.
3. A simple risk-monitor agent with plain-language rule configuration + human-approval-before-write.
4. A structured POC/eval workflow template (phases + tasks), separate from the raw sales pipeline.
5. A lightweight external buyer portal/thread.
6. Basic funnel/bottleneck reporting with filters.

Everything else (SQL-to-English, agent memory/dry-run, Opine Bets, product-gap rollups) reads as v2+ differentiation.

---

## 4. Confidence Notes

- Sections A–H are drawn from live marketing copy and public docs pages — high confidence on *what* each feature does at a description level.
- Exact UI/UX could not be verified — in-app docs are gated behind login.
- The integration list (Section G) is the most reliably complete piece.
