# Competitive Reference — Opine (tryopine.com)

**Sources:** [tryopine.com](https://tryopine.com/) homepage, [pricing](https://tryopine.com/pricing), [app.tryopine.com](https://app.tryopine.com/) (screenshots in repo root)  
**Purpose:** Product + marketing benchmark for our AI-native presales CRM  
**Our build spec:** [`landing-page.md`](landing-page.md) (patterns adapted with purple brand + multi-CRM)  
**Do not** copy Opine trademark, logo, or verbatim copy in our marketing.

---

## 1. Opine product summary (from app + site)

| Area | Opine capability | Our MVP | Our Phase 2+ |
|------|------------------|---------|--------------|
| CRM sync | HubSpot, Salesforce only | HubSpot + Pipedrive | Zoho, Salesforce |
| Call recording | Gong + 5 others | Gong | Expand |
| AI summary | MEDDPICC-style deal context | MEDDPICC + citations (P0) | Same |
| Agents | Multiple autonomous agents | 5 agents MVP → 10 | Full platform |
| Buyer Portal | Yes | No | Evaluate |
| POV planning | Dedicated module | No | Phase 2 |
| Specialist routing | Team requests | Team requests (P2) | Same |
| Kanban + process stepper | Dual-stage model | Dual-stage (PRD §5.5) | Same |
| Pricing | Custom, demo-led wizard | Same pattern | Optional self-serve later |
| Onboarding | CRM OAuth (2 providers) | 5-step wizard, 4 CRMs | Same |

**Our differentiation:** Multi-CRM onboarding (HubSpot, Pipedrive, Zoho, Salesforce), citation-first AI, transparent agent performance, open connector framework.

---

## 2. Opine marketing — global design language

> **Method:** Live page fetch + asset analysis. Exact hex, font-family, and animation timings marked **inferred** unless verified in DevTools.

### 2.1 Color palette (inferred)

| Role | Approx. color | Notes |
|------|---------------|-------|
| Background | White / near-white | Light SaaS canvas |
| Primary text | `#0E0E10`–`#131722` | Headlines |
| Secondary text | `#5A5F6B` | Body |
| Accent / CTA | Green or blue-green (unverified) | Primary buttons |
| Gradient art | `gradient-1.avif`, `gradient-2.avif` | Full-bleed blurred blobs |
| Stat numerals | Bold, accent-colored | Count-up from `0` in SSR markup |

**Our tokens:** Purple `#7C3AED` — see [`branding-guidelines.md`](branding-guidelines.md) §4.

### 2.2 Typography (inferred)

- Modern sans-serif (likely Inter or Geist on Vercel)
- Large bold headlines; italic emphasis on one word per headline
- Testimonial quotes: distinct quote style with avatar
- Oversized stat numerals in stats band

### 2.3 Iconography & assets

| Asset | Use |
|-------|-----|
| `play-button.svg` | Hero demo video trigger |
| `g2-reviews.svg` | G2 badge (hero + pricing) |
| `soc2.svg`, `gdpr.svg`, `g2-users-love-us.svg` | Trust strips (repeated pre-footer + footer) |
| `mark-rida.avif`, `cody-green.avif` | Testimonial avatars + closing CTA cluster |
| Text arrows `→` `↗` | Inline CTAs (not chevron icons) |
| `01`–`04` numerals | Explore-more link list |

### 2.4 Motion & animation (inferred)

| Pattern | Tell | Implementation |
|---------|------|----------------|
| Count-up stats | SSR shows `0%` / `0hr` | Scroll-into-view tween ~1–2s |
| Marquee pills | Capability row duplicated in DOM | Infinite horizontal scroll |
| Gradient backgrounds | 3840px AVIF blobs | Parallax / fade-in on sections |
| Announcement bar | Sticky top case-study strip | Static or dismissible |
| Video modal | Play over thumbnail | Click-to-expand |
| Pricing wizard | Step 1 of 4 card selector | Progressive disclosure |

**Our spec:** Framer Motion, 1.5s easeOut counters — [`landing-page.md`](landing-page.md) §1.4.

---

## 3. Opine global layout

### 3.1 Announcement bar

Case-study teaser + "See how →" — full-width strip above header.

**Our copy:** "Connect HubSpot or Pipedrive in under 10 minutes. See how →"

### 3.2 Header (sticky mega-nav)

| Nav item | Structure |
|----------|-----------|
| Technical Sales Management | 6-item mega-panel + "Explore →" |
| By team | CRO, SE Leaders, RevOps, Sales Managers, Post-Sales, Buyers |
| Resources | Blog, case studies, tools, reports, events, support + **3 latest blog posts** + Gainsight case card |
| Integrations, Pricing | Top-level links |
| Actions | Login + "Book my demo" |

**Our equivalent:** Product · Solutions · Integrations · Pricing · Resources — see [`landing-page.md`](landing-page.md) §2.2.

### 3.3 Footer (5 columns)

Solutions · Product · Learn · Case Studies (named logos: Tailscale, Orca, Socket, Gainsight) · Company

Bottom: © 2026, legal links, **llms.txt**, social (X, LinkedIn, YouTube), "Built with ❤️ in North Carolina"

**Our footer:** 5 columns with **Connectors** column (HubSpot, Pipedrive, Zoho, Salesforce).

---

## 4. Opine homepage — section sequence

| # | Section | Key content |
|---|---------|-------------|
| 1 | Announcement bar | Gainsight case study |
| 2 | Header | Mega-nav |
| 3 | Hero | "Best AI sales tools for technical sales teams" + G2 + dual CTA |
| 4 | Trust + video | Logo strip + play button |
| 5 | Capability marquee | 5 pills, infinite loop |
| 6 | Stats | 23% cycle · 4hr saved · 26% win rate · 95% conversion link |
| 7 | Testimonials | Mark Rida, Cody Green |
| 8 | Deal context | Word-swap headline + 3 features + `gradient-2` |
| 9 | Risks → certainty | 3 features + `gradient-1` |
| 10 | Team alignment | 3 stages: Qualification → Validation → Delivery |
| 11 | Explore more | 01–04 numbered links |
| 12 | Closing CTA | 95% stat + avatars + "Experience Opine" |
| 13–14 | Trust badges + footer | SOC2, GDPR, G2 |

**Our homepage:** Same rhythm + **CRM connector strip** (Section 4) — [`landing-page.md`](landing-page.md) §3.

---

## 5. Opine pricing page

- **No public tiers** — custom pricing, demo-led
- Eyebrow: "Request custom pricing"
- H1: "Pricing, tailored to how your team sells."
- 3 value bullets + G2 / 95% micro-stats
- **4-step wizard:** Team size (4 cards) → (steps 2–4 undisclosed in fetch)
- "Proof over promises" — 8 testimonial quotes (no avatars)
- Security grid: compliance, access controls, data protection
- Trust center link: trust.tryopine.com
- Closing CTA → `#quote`

**Our wizard Step 2 addition:** "Which CRM do you use?" — HubSpot · Pipedrive · Zoho · Salesforce · Other

---

## 6. Recurring Opine patterns (adopt / adapt)

1. Gradient-art backdrops (not flat illustration)
2. Animated count-up statistics
3. Text arrows `→` / `↗` on links
4. Looping capability marquee (duplicated DOM)
5. Real human avatars for social proof
6. Content-rich mega-menus (blog previews)
7. Rule of three in feature copy
8. Trust badges repeated mid-page + footer
9. Multi-step pricing wizard (no tier table)
10. Shared marketing layout shell (Next.js App Router)

**Our additions:** CRM logo strip, before/after deal card (Why page), citation-first AI messaging, `llms.txt`.

---

## 7. Opine claims & proof points (for messaging contrast)

| Claim | Opine | Our approach |
|-------|-------|--------------|
| Sales cycle reduction | 23% average | Use real customer data when available |
| Time saved | 4hr/week per deal | Same metric class |
| Win rate lift | 26% in eval stages | Same |
| Trial conversion | 95% | Only publish when true |
| G2 rating | 4.8/5 | When live |
| Case study | Gainsight 3× SE hours | Build our own case studies |

---

## 8. Confidence key

| Level | Meaning |
|-------|---------|
| **High** | Copy, section order, nav, assets, testimonials observed in fetch |
| **Medium** | Marquee, count-up, wizard interactions inferred from markup |
| **Low** | Exact hex, fonts, spacing, animation timing |

---

## 9. Related docs

| Doc | Purpose |
|-----|---------|
| [`landing-page.md`](landing-page.md) | Our marketing site build spec |
| [`branding-guidelines.md`](branding-guidelines.md) | Purple brand, voice, copy guardrails |
| [`design.md`](design.md) | App UI + marketing design tokens |
| [`prd.md`](prd.md) | Product requirements + FR-008 marketing |
| [`frontend-flow.md`](frontend-flow.md) | Marketing routes |
| [`wbs.md`](wbs.md) | Module 9.0 marketing WBS |
