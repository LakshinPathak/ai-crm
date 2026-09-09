# AI Demo Playbook — Sales, SE & Investor Flows

**Version:** 1.0  
**Date:** 2026-09-09  
**Prereqs:** `pnpm dev`, MongoDB, dev login at `/sign-in`

---

## 1. Demo environment setup

```bash
cd codebase && pnpm dev
# API :4000 · Web :3000
```

| Item | Value |
|------|-------|
| Sign-in | `/sign-in` → **Sign in with email (dev)** |
| Demo workspace | Seeded on first API start (demo data) |
| Gemini (optional) | `GEMINI_API_KEY` in `codebase/.env` for live MEDDPICC |

**Without Gemini:** MEDDPICC and agents return rule-based / stub output — still demoable.

---

## 2. Five-minute demo (“AI on one deal”)

**Audience:** AE or SE skeptical of “another CRM tool”  
**Message:** We don't replace HubSpot — we add cited intelligence on top.

| Min | Screen | Script | Show |
|-----|--------|--------|------|
| 0:00 | `/deals` | “Your pipeline from HubSpot, with AI health on every card.” | Kanban, sentiment badges, hot deals |
| 0:45 | Deal → Overview | “Open any deal — MEDDPICC built from your notes and calls, every letter cited.” | Click **Refresh MEDDPICC**, watch SSE loading steps |
| 2:00 | Overview | “Green/yellow/red isn't a guess — click any letter for the source.” | Citation popover on a letter |
| 2:30 | Agents | “13 agent templates — like having an SE analyst on staff.” | Template grid |
| 3:00 | Post-Call template | “After a call, draft follow-up in one click — you approve before send.” | Run on deal → Approvals |
| 4:00 | `/approvals` | “Nothing writes to CRM or email without your OK.” | Pending approval card |
| 4:30 | `/insights` | “Managers see funnel, loss themes, rep activity — same data.” | Funnel tab |

**Close:** “Connect HubSpot in 10 minutes. Your CRM stays source of record.”

---

## 3. Fifteen-minute demo (“Presales OS”)

**Audience:** VP Presales, RevOps  
**Add:** Accounts, calls, custom automation story

| Min | Screen | Script |
|-----|--------|--------|
| 0–5 | Same as 5-min | Pipeline + MEDDPICC |
| 5 | `/accounts` | “Company context rolls up to every deal.” |
| 7 | Deal → Plan tab | “POC phases and success criteria — not just CRM stages.” |
| 9 | Deal → Participants | “Stakeholder map — champion, economic buyer, technical.” |
| 10 | `/agents/new` | “Build a custom agent: daily focus, risk scan, or post-call.” | Walk wizard steps 1–3 |
| 12 | `/calls` | “Gong calls land here — transcripts feed MEDDPICC citations.” (R6: live transcript) |
| 14 | `/insights` → Users | “Compare rep activity, win rate, agent usage.” |

---

## 4. Thirty-minute demo (“Full platform + automations”)

**Audience:** Enterprise buyer, technical evaluation  
**Add:** Integrations, multiple agents, insights deep-dive

### Act 1 — Context layer (10 min)

1. Marketing site `/` — positioning (no security claims)
2. Onboarding story — CRM OAuth, stage mapping (Settings → Integrations)
3. Deal with 12 tabs tour (Activity, Notes, Tasks, Files)

### Act 2 — Agent platform (10 min)

1. **Deal Focus** — “What should I work on today?”
2. **Risk Scanner** — stalled deal detection
3. **CRM Hygiene** — field gap → approval
4. **Buying Signals** — hot deal flag
5. Runs log — credits, status, output JSON

### Act 3 — Leadership view (10 min)

1. Insights: Performance → Activity → Funnel → Loss
2. Weekly digest agent (conceptual — schedule trigger)
3. Win/loss analysis agent on closed deals
4. Roadmap tease: NL builder, Teams delivery, forecast AI

---

## 5. Demo data talking points

| Demo deal theme | Highlight |
|-----------------|-----------|
| Enterprise POC | Plan tab, technical fit score, product requests |
| Stalled deal | Red sentiment, risk scanner output |
| Hot opportunity | `isHot` badge, buying signals |
| Lost deal | Loss insights, MEDDPICC gaps |

**If demo seed is thin:** Create note on a deal with champion/budget keywords → re-run MEDDPICC.

---

## 6. Objection handling

| Objection | Response | Demo proof |
|-----------|----------|------------|
| “We already have Gong.” | “Gong records calls; we unify into deal context + MEDDPICC + agents.” | Calls page + citations |
| “AI hallucinates.” | “95% citation target — every claim links to source.” | Citation popover |
| “Won't mess up our CRM.” | “Read-first sync; writes need approval.” | Approvals queue |
| “Another tool to learn.” | “Works in Slack/Teams — CRM stays HubSpot.” | Agent delivery (roadmap) |
| “Too expensive.” | “Custom pricing; AI credits capped per workspace.” | Agent stats credits |

---

## 7. Live vs recorded demo

| Mode | Tips |
|------|------|
| **Live** | Pre-run MEDDPICC on 2 deals; keep Approvals queue with 1 pending item |
| **Recorded** | Use Playwright `pnpm test:e2e` clips; 1080p browser zoom 110% |
| **Workshop** | Give attendees dev login; `draft-from-nl` when R6 ships |

---

## 8. Demo checklist (day before)

- [ ] `pnpm dev` starts clean; MongoDB running
- [ ] Dev login works
- [ ] At least 3 open deals with notes
- [ ] 1 approval pending (run post-call agent)
- [ ] GEMINI_API_KEY set OR stub mode tested
- [ ] Insights tabs load (no 500s)
- [ ] Browser: hide bookmarks bar, dark/light per prospect preference

---

## 9. Post-demo follow-up assets

| Asset | Location |
|-------|----------|
| Product PRD | `docs/prd.md` |
| Agent catalog | `docs/agent-platform.md` |
| Automation recipes | `docs/future/custom-automations-guide.md` §9 |
| R6 roadmap | `docs/r6-roadmap.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-09 | v1.0 — Initial playbook |
