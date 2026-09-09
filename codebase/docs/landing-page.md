# Landing Page — Design & Content Spec

**Reference audit:** [tryopine.com](https://tryopine.com/) homepage + pricing (design patterns)  
**Feature source:** [`opine-feature-reference.md`](opine-feature-reference.md) — full Opine module list + MVP scope  
**Product:** AI-native presales CRM (`ai-crm` — rename before launch)  
**Implementation:** `apps/web/components/marketing/LandingPage.tsx` + `lib/marketing-content.ts`  
**Stack:** Next.js 15 App Router, **shadcn/ui**, Tailwind, Framer Motion (frontend) · Node.js API (leads, forms)  
**Brand tokens:** [`branding-guidelines.md`](branding-guidelines.md)  
**Differentiator vs Opine:** Multi-CRM onboarding (HubSpot, Pipedrive, Zoho, Salesforce) + citation-first AI

---

## Confidence key

| Level | Meaning |
|-------|---------|
| **Observed** | Directly from tryopine.com fetch (structure, patterns, asset naming) |
| **Inferred** | Standard B2B SaaS / Next.js patterns — verify in DevTools |
| **Specified** | Our product decision — use these values for build |

---

## 1. Global design language

### 1.1 Color palette

**Opine (observed):** Soft ambient gradient art (`gradient-1.avif`, `gradient-2.avif`), light canvas, dark headlines, accent likely green/teal (unverified).

**Our spec (specified)** — do not copy Opine greens; use brand purple:

| Role | Token | Hex | Usage |
|------|-------|-----|--------|
| Background base | `--background` | `#FFFFFF` | Page canvas |
| Background alt | `--muted` | `#F8FAFC` | Alternate sections |
| Primary text | `--foreground` | `#0F172A` | H1–H3, stats |
| Secondary text | `--muted-foreground` | `#64748B` | Body, captions |
| **Accent / CTA** | `--primary` | **`#7C3AED`** | Primary buttons, stat accents, links |
| Primary hover | `--primary-hover` | `#6D28D9` | Button hover |
| Accent tint | `--accent` | `#F5F3FF` | Pill backgrounds, hero glow |
| Gradient blob 1 | `--gradient-1` | `#EDE9FE` → `#DBEAFE` → `#F5F3FF` | Section backdrops (purple→blue soft) |
| Gradient blob 2 | `--gradient-2` | `#F5F3FF` → `#E0E7FF` → `#FDF4FF` | Alternate section |
| Success stat | `--success` | `#16A34A` | Positive deltas |
| Border | `--border` | `#E2E8F0` | Cards, dividers |

**Gradient treatment (inferred from Opine):** Full-bleed blurred blobs behind feature sections — not flat illustrations. Implement as:

```css
.gradient-backdrop {
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(124, 58, 237, 0.12), transparent),
    radial-gradient(ellipse 60% 50% at 80% 60%, rgba(59, 130, 246, 0.08), transparent);
}
```

Place under `position: absolute; inset: 0; pointer-events: none; z-index: 0` with content `relative z-10`.

### 1.2 Typography (specified)

| Element | Font | Size | Weight | Tracking |
|---------|------|------|--------|----------|
| H1 (hero) | Inter | `clamp(2.5rem, 5vw, 3.75rem)` | 700 | `-0.02em` |
| H2 (section) | Inter | `clamp(1.75rem, 3vw, 2.25rem)` | 600 | `-0.01em` |
| H3 (feature) | Inter | `1.125rem` | 600 | normal |
| Body | Inter | `1rem` / `1.125rem` | 400 | normal |
| Body large | Inter | `1.25rem` | 400 | normal |
| Stat numeral | Inter | `3rem`–`4rem` | 700 | `tabular-nums` |
| Eyebrow | Inter | `0.875rem` | 500 | `0.05em` uppercase optional |
| CTA button | Inter | `0.9375rem` | 600 | normal |

**Italic emphasis (observed on Opine):** One word per headline italicized for rhythm — e.g. *"Sell complex deals **faster***" or *"Your CRM, **finally intelligent***".

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 1.3 Iconography

**Opine pattern (observed):** Light custom icons; typography + gradients + photography carry visual weight.

**Our spec:**

| Asset | Source | Use |
|-------|--------|-----|
| Play button | Lucide `Play` in circle or custom SVG | Hero demo video |
| G2 / SOC2 / GDPR | Official badge SVGs (press kits) | Trust strips |
| CRM logos | HubSpot, Pipedrive, Zoho, Salesforce (official) | Connector strip + onboarding |
| Arrows | Text glyphs `→` `↗` in links | CTAs (no chevron icons) |
| AI sparkle | Lucide `Sparkles` | AI feature callouts only |
| Avatars | Real photos or UI Faces / generated | Testimonials |

**Avoid:** Generic feature-grid icon sets (48px outline icons per bullet).

### 1.4 Motion & animation (inferred + specified)

| Pattern | Opine tell | Our implementation |
|---------|------------|---------------------|
| **Count-up stats** | Markup shows `0%` before JS | `framer-motion` + `useInView`; tween 0 → target over **1.5s** `easeOut` |
| **Marquee pills** | Capability row duplicated in DOM | CSS `@keyframes marquee` or `embla-carousel-auto-scroll`; 5 pills, ~30s loop |
| **Word swap headline** | "leadership team" / "presales team" | `AnimatePresence` rotate every 3s: `presales team` → `AE team` → `RevOps` |
| **Gradient parallax** | 3840px wide AVIF backgrounds | CSS `background-attachment: fixed` (desktop only); disable on mobile |
| **Announcement bar** | Sticky top strip | `sticky top-0 z-50`; optional dismiss with `localStorage` |
| **Video modal** | Play button over thumbnail | Click opens Radix Dialog + embedded YouTube/Vimeo |
| **Pricing wizard** | Step 1 of 4 card selector | Framer `layout` transition between steps; progress bar 25% per step |
| **Section fade-in** | Standard scroll reveal | `opacity 0→1`, `y 24→0`, duration 0.5s, once |

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` — show final stat values, disable marquee.

---

## 2. Global layout (header & footer)

### 2.1 Announcement bar

```
┌─────────────────────────────────────────────────────────────────┐
│  Connect HubSpot or Pipedrive in under 10 minutes. See how →   │
└─────────────────────────────────────────────────────────────────┘
```

| Property | Spec |
|----------|------|
| Height | `40px` |
| Background | `primary-50` or subtle purple tint |
| Text | `text-sm text-foreground` |
| Link | `text-primary font-medium` + `→` |
| Dismiss | Optional `×` right |

**Copy (our product):** Rotate case-study teasers — e.g. "Onboard with Pipedrive or HubSpot in 10 minutes. See how →"

### 2.2 Header (sticky)

```
┌──────────┬──────────────────────────────────────┬─────────────┐
│ [Logo]   │  Product  Solutions  Integrations    │ Sign in     │
│          │  Pricing  Resources                  │ Start free →│
└──────────┴──────────────────────────────────────┴─────────────┘
```

**Height:** `64px` (`h-16`)  
**Background:** `bg-white/80 backdrop-blur-md border-b border-border`  
**Z-index:** `z-40`

#### Mega-menu: Product (our structure)

| Item | Description | Link |
|------|-------------|------|
| Deals pipeline | AI kanban with sentiment, fit, blockers | `/product/deals` |
| AI deal intelligence | MEDDPICC summaries with citations | `/product/ai-summary` |
| Revenue agents | 10 sub-agents, templates, approvals | `/product/agents` |
| Insights | Team analytics, activity, funnel | `/product/insights` |
| CRM connectors | HubSpot, Pipedrive, Zoho, Salesforce | `/product/connectors` |
| Footer link | Explore all features → | `/product` |

#### Mega-menu: By team

CRO · SE Leaders · RevOps · Sales Managers · AEs

#### Mega-menu: Resources

Left: Blog · Case studies · Docs · Support  
Right: 3 latest blog posts (dynamic from CMS)  
Pinned: "Why [Brand]?" + featured case study card

#### Mega-menu: Integrations

CRM · Calls (Gong) · **Chat (Slack, Teams, Google Chat)** · Calendar · PM (Jira) — link to `/integrations`

**CTAs:** `Sign in` (ghost) · `Start free` or `Book demo` (primary purple button)

### 2.3 Footer

**Pre-footer trust row (centered):** SOC 2 Type II · GDPR · G2 badge (when available)

**5 columns:**

| Solutions | Product | Learn | Connectors | Company |
|-----------|---------|-------|------------|---------|
| Deals pipeline | Integrations | Blog | HubSpot | Why us? |
| AI intelligence | Pricing | Docs | Pipedrive | Careers |
| Agents | Compare | POV audit | Zoho CRM | Contact |
| Insights | Demo | API | Salesforce | About |
| CRM onboarding | Login | Support | | |

**Bottom bar:**
- © 2026 [Brand]. All rights reserved.
- Privacy · Cookies · Terms · Status · **llms.txt** (forward-looking, copy Opine pattern)
- Social: X, LinkedIn, YouTube
- Tagline: `Built with care for revenue teams.` (no emoji unless brand wants it)

---

## 3. Homepage — section-by-section

Route: `/`  
File: `apps/web/app/(marketing)/page.tsx`

| # | Section | Component | Priority |
|---|---------|-----------|----------|
| 1 | Announcement bar | `AnnouncementBar` | P0 |
| 2 | Header | `MarketingHeader` | P0 |
| 3 | Hero | `HeroSection` | P0 |
| 4 | CRM connector strip | `ConnectorLogos` | P0 — **our differentiator** |
| 5 | Trust + video | `TrustVideoStrip` | P1 |
| 6 | Capability marquee | `CapabilityMarquee` | P1 |
| 7 | Stats band | `StatsSection` | P0 |
| 8 | Testimonials (2) | `TestimonialPair` | P1 |
| 9 | Deal context features | `FeatureSection` + gradient-2 | P0 |
| 10 | Risk → certainty | `FeatureSection` + gradient-1 | P1 |
| 11 | Deal lifecycle stages | `StageTimeline` | P1 |
| 12 | Explore more | `ExploreLinks` | P2 |
| 13 | Closing CTA | `ClosingCta` | P0 |
| 14 | Trust badges | `TrustBadges` | P1 |
| 15 | Footer | `MarketingFooter` | P0 |

---

### Section 3 — Hero

**Layout:** Center-aligned text, max-width `720px`, padding `pt-24 pb-16`

**Copy (specified — adapt name when finalized):**

```
Eyebrow:     Rated 5 stars on G2 (when live) · or "AI-native presales CRM"

H1:          The AI presales CRM that works with
             your CRM — HubSpot, Pipedrive, Zoho, or Salesforce.

Subhead:     Ten revenue agents converge scattered deal context into
             real-time intelligence. Automate follow-ups, flag risks,
             and keep your CRM accurate — with a citation on every claim.

CTA primary: Start free →          (or Book demo →)
CTA secondary: Why [Brand]? →       (text link)
```

**Below hero:** G2 badge linked (when available)

**Visual:** Optional product screenshot mock (kanban from your app) right of text on `lg+` — 2-column split.

---

### Section 4 — CRM connector strip (differentiator)

**Not on Opine homepage — add this.**

```
Works with the CRM you already use

[HubSpot] [Pipedrive] [Zoho CRM] [Salesforce]

Onboard in 10 minutes · OAuth · Stage mapping · Live pipeline
```

Grayscale logos → color on hover. Link to `/product/connectors`.

---

### Section 5 — Trust + video

**Label:** `Trusted by revenue teams who sell complex technical products`

**Element:** Video thumbnail + `play-button` overlay → modal player (product demo or Loom)

**Asset:** `public/marketing/hero-demo-poster.webp`

---

### Section 6 — Capability marquee

**H2:** `Turn scattered deal context into a single system of intelligence`

**Body:** One paragraph on unified layer (calls, CRM, Slack → one record).

**Pills (marquee, duplicate DOM for loop):**

1. Connect any CRM in 10 minutes  
2. MEDDPICC with citations  
3. Deploy revenue agents  
4. Trust every AI response  
5. Retain full context history  

**CTA:** `Explore integrations →`

---

### Section 7 — Stats band

**H2:** `Sell complex deals *faster*` (italic on "faster")

**Body:** One sentence on SE/AE time wasted on context hunting.

| Stat | Target value | Label |
|------|--------------|-------|
| 1 | 23% | Reduce average sales cycle |
| 2 | 4hr | Saved per active deal per week |
| 3 | 26% | Win rate lift in eval stages |
| 4 (link) | 95% ↗ | Trial-to-customer (link to Why page) — use real number when known |

**Implementation:** `StatCounter` component — render `0` SSR, animate on `useInView`.

---

### Section 8 — Testimonials (2)

| Quote source | Name | Title |
|--------------|------|-------|
| Placeholder 1 | TBD | Director of Solutions Engineering |
| Placeholder 2 | TBD | Senior Director, SE |

Layout: 2-column `md:grid-cols-2`, avatar left, quote + attribution right.  
Use real quotes when available; structure matches Opine.

---

### Section 9 — Deal context for your [rotating] team

**H2 with word swap:** `Deal context for your **presales team**`  
Rotate: `presales team` · `AE team` · `RevOps` · `leadership`

**Body:** Integration + semantic search + presales context (not generic CRM).

**3 features (stacked, left-aligned):**

1. **Captures every signal, automatically** — Gong, Slack, CRM, calendar → structured deal record  
2. **Keep every stakeholder in the loop** — Slack digests, focus feed, weekly digest  
3. **Surfaces deal health in one glance** — Sentiment, fit score, blockers, MEDDPICC gaps  

**Background:** `gradient-backdrop-2`

**Optional visual:** Before/after deal card (copy Opine [Why Opine](https://tryopine.com/why-opine) pattern):

| Before | After |
|--------|-------|
| Last updated 6 days ago | Updated 4 min ago |
| Deal health: Unknown | On track, from evidence |
| Champion: Not reported | Champion identified in last call |

---

### Section 10 — From deal risks to deal certainty

**H2:** `From deal risks to deal certainty`

**3 features:**

1. **Auto-generate stakeholder updates** — Post-call drafts, POC kickoff posts  
2. **Track activities, tasks, risks automatically** — Risk Scanner, activity from calendar  
3. **Reduce cognitive load** — Deal Focus daily priority list  

**CTA:** `Experience [Brand] →`  
**Background:** `gradient-backdrop-1`

---

### Section 11 — Where teams align (3 stages)

**H2:** `Where sales, presales, and RevOps actually align`

**3 stage blocks (timeline horizontal on desktop):**

| Stage | Headline | Copy focus |
|-------|----------|------------|
| Qualification | Technical qualification | Fit scoring, discovery, MEDDPICC gaps |
| Validation | Technical validation | POC planning, plan confidence, blockers |
| Close | Delivery & handoff | CRM hygiene, win/loss, post-sales context |

**CTA:** `Book my demo →`

---

### Section 12 — Explore more

Numbered links `01`–`04`:

1. Explore latest insights → `/blog`  
2. Read the founding story → `/about`  
3. Explore careers → `/careers`  
4. Explore events → `/events`  

---

### Section 13 — Closing CTA

**H2:** `Experience the power of [Brand]`

**Sub:** `We believe once you see it, it sells itself.`

**Stat:** Animated `95%` of trials become customers (when true)

**CTA:** `Experience [Brand] →` (primary)

**Avatars:** Overlapping cluster + `Trusted by presales leaders at …`

---

## 4. Pricing page

Route: `/pricing`  
File: `apps/web/app/(marketing)/pricing/page.tsx`

**Model (match Opine):** No public tiers — custom pricing, demo-led.

### Above the fold

```
Eyebrow:     Request custom pricing

H1:          Pricing tailored to how your team sells.

Body:        Your CRM, your team size, your process — pricing should
             reflect that. No rigid per-seat surprises.

Bullets:
  ✓ Custom pricing scaled to your team
  ✓ Onboarding, CRM migration, and connector setup included
  ✓ Enterprise security — SOC 2 & GDPR (roadmap)

Micro-stats: Rated 4.8/5 on G2 · 95% of POCs become customers
```

### Multi-step quote wizard (`#quote`)

| Step | Question | Options |
|------|----------|---------|
| 1 | How big is your revenue team? | 1–10 · 11–50 · 51–200 · 200+ |
| 2 | Which CRM do you use? | HubSpot · Pipedrive · Zoho · Salesforce · Other |
| 3 | What do you need most? | AI summary · Agents · Pipeline · All |
| 4 | Work email + company | Form submit → CRM/email capture |

**UI:** Radio cards with border highlight on select; progress bar `Step N of 4`.

### Proof section

8+ testimonial cards (name + title, no avatar) — grid `md:grid-cols-2`.

### Security grid (3 columns)

- Enterprise-grade compliance  
- Granular access controls (SSO, RBAC)  
- End-to-end encryption (AES-256, TLS 1.3)  

### Closing

`Get your custom pricing now.` → scroll to `#quote`

---

## 5. Recurring patterns (build checklist)

- [ ] Gradient-art section backdrops (not flat illustrations)  
- [ ] Animated count-up statistics on scroll  
- [ ] Text arrows `→` `↗` on links (not icon chevrons)  
- [ ] Looping capability marquee (duplicated DOM)  
- [ ] Real avatars for testimonials  
- [ ] Rich mega-menus with blog previews  
- [ ] Rule of three in feature sections  
- [ ] Trust badges repeated (mid-page + footer)  
- [ ] Multi-step pricing wizard (no static tier table)  
- [ ] Shared marketing layout shell (`(marketing)/layout.tsx`)  
- [ ] **CRM logo strip** (our addition)  
- [ ] Before/after deal card on Why page  
- [ ] `llms.txt` at `/llms.txt`  

---

## 6. Component file map

```
apps/web/
├── app/(marketing)/
│   ├── layout.tsx              # MarketingHeader + Footer wrapper
│   ├── page.tsx                # Homepage
│   ├── pricing/page.tsx
│   ├── why/page.tsx            # Why [Brand] — before/after narrative
│   └── product/[slug]/page.tsx
├── components/marketing/
│   ├── announcement-bar.tsx
│   ├── marketing-header.tsx
│   ├── mega-menu.tsx
│   ├── hero-section.tsx
│   ├── connector-logos.tsx
│   ├── capability-marquee.tsx
│   ├── stat-counter.tsx
│   ├── testimonial-card.tsx
│   ├── feature-section.tsx
│   ├── deal-card-before-after.tsx
│   ├── stage-timeline.tsx
│   ├── closing-cta.tsx
│   ├── trust-badges.tsx
│   ├── marketing-footer.tsx
│   ├── pricing-wizard.tsx
│   └── video-modal.tsx
└── public/marketing/
    ├── gradient-blob-1.webp
    ├── gradient-blob-2.webp
    ├── hero-demo-poster.webp
    └── logos/                  # CRM + compliance badges
```

---

## 7. Responsive breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `< md` | Single column; hamburger nav; stats 1-col; marquee full width |
| `md` | 2-col testimonials; 2-col stats |
| `lg` | Hero 2-col with screenshot; mega-menus; stage timeline horizontal |
| `xl` | Max content width `1280px` centered |

---

## 8. SEO & meta

```tsx
// app/(marketing)/page.tsx
export const metadata = {
  title: '[Brand] — AI presales CRM for HubSpot, Pipedrive, Zoho & Salesforce',
  description: 'Revenue agents, MEDDPICC summaries with citations, and 10-minute CRM onboarding. Built for technical sales teams.',
  openGraph: {
    images: ['/marketing/og-image.png'], // 1200×630
  },
};
```

---

## 9. Content differentiation vs Opine (copy guardrails)

| Opine says | We say |
|------------|--------|
| "Best AI sales tools for technical sales teams" | "AI presales CRM that works **with your CRM**" |
| HubSpot + Salesforce only | HubSpot, **Pipedrive, Zoho**, Salesforce |
| "Context layer" (doesn't replace CRM) | Same + **onboard in 10 minutes** |
| Black-box AI trust | **Citation on every claim** |
| Custom pricing only | Custom pricing + optional self-serve later |

**Do not** use Opine trademark, logo, or verbatim copy. Patterns are fair game; words are not.

---

## 10. Implementation order (landing only)

| Week | Deliverable |
|------|-------------|
| W1 | Marketing layout, header, footer, hero, CTAs |
| W1 | Connector logo strip + primary purple tokens |
| W2 | Stats counters, feature sections, gradients |
| W2 | Pricing page + 4-step wizard |
| W3 | Marquee, video modal, testimonials, animations |
| W3 | Why page with before/after deal card |
| W4 | Mega-menus, blog integration, SEO, llms.txt |

---

## 11. DevTools verification checklist

Before shipping, confirm on staging:

- [ ] Primary button hex = `#7C3AED`  
- [ ] Font family = Inter (or Geist if switched)  
- [ ] Stat animation duration ~1.5s  
- [ ] Marquee seamless loop (no jump)  
- [ ] Lighthouse Performance ≥ 90 (optimize AVIF/WebP gradients)  
- [ ] Mobile: no `background-attachment: fixed` jank  
- [ ] `prefers-reduced-motion` disables counters and marquee  

---

## 12. Related docs

| Doc | Link |
|-----|------|
| Brand colors & voice | [`branding-guidelines.md`](branding-guidelines.md) |
| App UI (product, not marketing) | [`design.md`](design.md) |
| CRM onboarding (product flow) | [`frontend-flow.md`](frontend-flow.md) §4.0 |
| Competitive context | [`competitive-opine.md`](competitive-opine.md) |
| PRD marketing FRs | [`prd.md`](prd.md) §5.6, FR-008 |
| WBS tasks | [`wbs.md`](wbs.md) §9.0 |
