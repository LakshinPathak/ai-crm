# Branding Guidelines
# AI-Native Presales CRM

**Version:** 1.0  
**Status:** Working draft — finalize product name before launch  
**Codename:** `ai-crm`

---

## 1. Brand Positioning

### 1.1 One-liner
**The AI presales CRM that tells you what to do next — and shows you why.**

### 1.2 Positioning statement
For B2B revenue teams selling complex technical products, **[Product Name]** is an AI-native CRM that unifies deals, calls, and conversations into a single command center — with autonomous agents that draft follow-ups, flag risks, and keep your CRM honest, while humans stay in control of every write.

### 1.3 Brand personality

| Trait | Expression | Avoid |
|-------|------------|-------|
| **Sharp** | Precise metrics, cited insights | Vague "AI magic" |
| **Trustworthy** | Receipts on every claim | Black-box scores |
| **Operator-focused** | Built for AEs and SEs in the field | Generic "productivity" |
| **Confident** | Bold purple, clear hierarchy | Timid pastels, clutter |
| **Human-first** | Approval gates, editable AI | Fully autonomous cringe |

### 1.4 Voice & tone

**Voice (consistent):** Direct, expert, slightly informal — like a great sales manager who's also technical.

**Tone by context:**

| Context | Tone | Example |
|---------|------|---------|
| Deal alerts | Urgent but calm | "DocuSign hasn't had external activity in 14 days. Schedule a check-in." |
| AI summary | Analytical | "Economic buyer not reported. Champion activity detected in last call." |
| Empty states | Encouraging | "Connect HubSpot to pull in your pipeline." |
| Errors | Clear, actionable | "Gong sync failed. Reconnect in Settings → Integrations." |
| Celebrations | Subtle | "Deal moved to Closed Won. Nice work." |

**Writing rules:**
- Use sentence case for UI labels (not Title Case)
- Prefer verbs in CTAs: "Refresh summary", "Approve draft", "Connect HubSpot"
- Never say "leverage" or "synergy" in product copy
- MEDDPICC is always uppercase
- Spell out acronyms on first use in docs

---

## 2. Product Naming

### 2.1 Naming criteria
- Short (1–2 syllables preferred)
- Available `.com` or `.ai` domain
- Not confused with Opine, HubSpot, Gong
- Implies: intelligence, clarity, revenue, or motion

### 2.2 Candidate directions (pick one before public launch)

| Direction | Examples | Vibe |
|-----------|----------|------|
| **Clarity** | Lumen, Clarion, Lucid | Insight, visibility |
| **Motion** | Cadence, Tempo, Relay | Pipeline velocity |
| **Intelligence** | Cortex, Synapse, Signal | AI-native |
| **Presales** | POV, Validate, Proof | Category-specific |

**Placeholder for development:** use `ai-crm` in code; display name `RevenueOS` or `Signal` in UI until finalized.

### 2.3 Sub-brand elements

| Element | Name |
|---------|------|
| AI layer | **[Brand] AI** (e.g. "Signal AI") |
| Agent platform | **Agents** (no separate brand) |
| Analytics | **Insights** |
| Methodology engine | **Playbooks** (internal name for sales process templates) |

---

## 3. Logo

### 3.1 Logo concept (to be designed)

**Direction A — Signal mark:** Abstract waveform or pulse inside a rounded square — represents call intelligence + deal signals.

**Direction B — Pipeline mark:** Three ascending bars forming an upward arrow — pipeline progression.

**Direction C — Lens mark:** Circular aperture — "clarity into the deal."

### 3.2 Logo usage

| Variant | Use |
|---------|-----|
| Full logo (mark + wordmark) | Marketing site, login page |
| Mark only | App sidebar collapsed, favicon |
| Wordmark only | Email headers |

### 3.3 Clear space
Minimum clear space = height of the mark on all sides.

### 3.4 Minimum sizes
- Digital mark: 24×24px
- Full logo: 120px width minimum

### 3.5 Don'ts
- Don't rotate the logo
- Don't change mark colors independently of wordmark
- Don't place on busy photography without scrim
- Don't use gradients on logo (solid colors only)

---

## 4. Color Palette

### 4.1 Primary — Electric Purple

The signature brand color. Used for primary actions, active states, chart accents, and AI-related UI.

| Token | Hex | HSL | Use |
|-------|-----|-----|-----|
| `primary-50` | `#F5F3FF` | 262 100% 97% | AI card backgrounds |
| `primary-100` | `#EDE9FE` | 262 100% 94% | Hover states |
| `primary-500` | `#8B5CF6` | 262 83% 58% | Secondary buttons |
| **`primary-600`** | **`#7C3AED`** | **262 83% 58%** | **Primary buttons, logo, chart line** |
| `primary-700` | `#6D28D9` | 262 70% 50% | Pressed state |
| `primary-900` | `#4C1D95` | 262 60% 30% | Dark mode primary |

### 4.2 Neutrals

| Token | Hex | Use |
|-------|-----|-----|
| `gray-50` | `#F8FAFC` | Page background alt |
| `gray-100` | `#F1F5F9` | Muted backgrounds |
| `gray-200` | `#E2E8F0` | Borders |
| `gray-500` | `#64748B` | Secondary text |
| `gray-900` | `#0F172A` | Primary text |
| `white` | `#FFFFFF` | Cards, sidebar |

### 4.3 Semantic colors

| Meaning | Hex | Use |
|---------|-----|-----|
| Success / Green sentiment | `#16A34A` | Won, positive delta, green badge |
| Warning / Yellow sentiment | `#F59E0B` | At-risk, yellow badge |
| Danger / Red sentiment | `#EF4444` | Blockers, lost, red badge |
| Info | `#3B82F6` | External activity, links |

### 4.4 Activity chart colors (fixed)

| Type | Hex | Label |
|------|-----|-------|
| External / Customer Meeting | `#3B82F6` | Blue |
| Internal | `#7C3AED` | Purple |
| Prep | `#06B6D4` | Cyan |
| Other | `#94A3B8` | Gray |
| Logged | `#F59E0B` | Orange |

### 4.5 Agent category badges

| Category | Background | Text |
|----------|------------|------|
| Process | `#DCFCE7` | `#166534` |
| Risk | `#FEE2E2` | `#991B1B` |
| Signals | `#FFEDD5` | `#9A3412` |
| Reporting | `#DBEAFE` | `#1E40AF` |

### 4.6 Dark mode (Phase 2)

| Token | Hex |
|-------|-----|
| Background | `#0F172A` |
| Card | `#1E293B` |
| Border | `#334155` |
| Primary | `#A78BFA` (lighter purple for contrast) |

---

## 5. Typography

### 5.1 Font families

| Role | Font | Fallback |
|------|------|----------|
| UI / Marketing | **Inter** | system-ui, sans-serif |
| Monospace | **JetBrains Mono** | monospace |

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 5.2 Type scale

| Name | Size | Weight | Line height | Use |
|------|------|--------|-------------|-----|
| Display | 36px | 700 | 1.2 | Marketing hero |
| H1 | 30px | 700 | 1.3 | Page titles |
| H2 | 24px | 600 | 1.35 | Section headers |
| H3 | 18px | 600 | 1.4 | Card titles |
| Body | 16px | 400 | 1.5 | Default text |
| Small | 14px | 400 | 1.5 | Table cells |
| Caption | 12px | 500 | 1.4 | Badges, labels |
| KPI value | 24px | 700 | 1 | Metric numbers |

### 5.3 KPI typography
Deal value and pipeline numbers use `font-variant-numeric: tabular-nums` for aligned columns.

---

## 6. Iconography

**Library:** Lucide Icons (outline, 1.5px stroke)

**Style rules:**
- 16px in buttons and badges
- 20px in navigation
- 24px in empty states
- Stroke color: `currentColor` — inherits text color

**Custom icons needed:**
- MEDDPICC section icons (8)
- Integration provider logos (use official brand assets, not Lucide)
- Agent template category icons

---

## 7. Imagery & Illustration

### 7.1 Photography
- Real diverse teams in modern office / remote settings
- Avoid stock "handshake" clichés
- Apply subtle purple gradient overlay (primary-600 at 10% opacity) for hero images

### 7.2 Illustration style
- Geometric, minimal line art
- Purple + gray only; no rainbow palettes
- Use for empty states and onboarding

### 7.3 AI visual language
- **Sparkles icon** (`Sparkles` from Lucide) marks AI-generated content
- Purple left border on AI summary cards: `border-l-4 border-primary-600`
- Subtle purple glow on active AI refresh: `ring-2 ring-primary-200`

---

## 8. UI Component Branding

### 8.1 Buttons

| Variant | Style |
|---------|-------|
| Primary | `bg-primary-600 text-white hover:bg-primary-700` |
| Secondary | `bg-white border border-gray-200 hover:bg-gray-50` |
| Ghost | `hover:bg-gray-100` |
| Destructive | `bg-red-600 text-white` |
| AI action | Primary + `Sparkles` icon left |

### 8.2 Cards
- White background, `border border-gray-200`, `rounded-lg`, `shadow-sm`
- AI cards: add `bg-primary-50/50` tint

### 8.3 Badges
- Pill shape `rounded-full px-2 py-0.5 text-xs font-medium`
- Sentiment badges always include color dot + text label

### 8.4 Navigation
- Active item: `bg-primary-50 text-primary-700 font-medium`
- Inactive: `text-gray-600 hover:bg-gray-100`

---

## 9. Email & External Communications

### 9.1 Transactional email
- Header: logo mark + product name, left-aligned
- Body: max-width 600px, Inter font
- CTA button: primary purple, centered
- Footer: gray caption, unsubscribe, address

### 9.2 Weekly digest email
- Subject format: `Weekly Pipeline Digest — {{date}} | {{open_pipeline_formatted}}`
- TL;DR in bold at top
- Deal tables: zebra striping `gray-50`
- CTA links: purple, underline on hover

### 9.3 Chat messages (agent delivery)

Deliver via user's configured provider (Slack Block Kit, Teams Adaptive Cards, Google Chat Cards v2). Same content structure across providers:

- Header with deal name + sentiment indicator (🟢🟡🔴 or text label for accessibility)
- Bullet sections for agent output
- Action buttons: **Approve** · **Reject** · **View in app** (deep link)
- Footer with citation count + link back to deal

**Slack:** Block Kit  
**Teams:** Adaptive Card  
**Google Chat:** Cards v2  

See [`chat-channels.md`](chat-channels.md) for delivery routing.

---

## 10. Marketing Site

**Build spec:** [`landing-page.md`](landing-page.md)  
**Competitive benchmark:** [`competitive-opine.md`](competitive-opine.md) (tryopine.com patterns — adapt, do not copy)

### 10.1 Positioning (marketing headline)

```
H1:          The AI presales CRM that works with
             your CRM — HubSpot, Pipedrive, Zoho, or Salesforce.

Subhead:     Ten revenue agents converge scattered deal context into
             real-time intelligence. Automate follow-ups, flag risks,
             and keep your CRM accurate — with a citation on every claim.

CTA primary: Start free →
CTA secondary: Why [Brand]? →
```

**Eyebrow options:** "AI-native presales CRM" · "Rated 4.8/5 on G2" (when live)

### 10.2 Hero & announcement copy

| Element | Copy |
|---------|------|
| Announcement bar | Connect HubSpot or Pipedrive in under 10 minutes. See how → |
| Connector strip | Works with the CRM you already use |
| Trust video label | Trusted by revenue teams who sell complex technical products |
| Closing CTA | Experience the power of [Brand] — We believe once you see it, it sells itself. |

### 10.3 Section headlines (homepage)

| Section | H2 |
|---------|-----|
| Marquee | Turn scattered deal context into a single system of intelligence |
| Stats | Sell complex deals *faster* (italic on "faster") |
| Deal context | Deal context for your [presales team / AE team / RevOps] (rotating) |
| Risk → certainty | From deal risks to deal certainty |
| Alignment | Where sales, presales, and RevOps actually align |
| Explore | Explore more of [Brand] |

### 10.4 Capability marquee pills

1. Connect any CRM in 10 minutes  
2. MEDDPICC with citations  
3. Deploy revenue agents  
4. Trust every AI response  
5. Retain full context history  

### 10.5 Stats band (animate on scroll)

| Value | Label |
|-------|-------|
| 23% | Reduce average sales cycle |
| 4hr | Saved per active deal per week |
| 26% | Win rate lift in eval stages |
| 95% ↗ | Trial-to-customer (link to Why page — use real data when known) |

### 10.6 Pricing page copy

```
Eyebrow:  Request custom pricing
H1:       Pricing tailored to how your team sells.
Bullets:  Custom pricing · Onboarding + CRM migration included · Enterprise security
Wizard:   Step 1 team size → Step 2 CRM → Step 3 needs → Step 4 email
```

### 10.7 Visual patterns (from Opine audit, our execution)

| Pattern | Our execution |
|---------|---------------|
| Gradient blobs | Purple→blue radial gradients (`#7C3AED` tint), not Opine green |
| Count-up stats | Framer Motion, 1.5s, primary purple numerals |
| Marquee | Text pills, no per-pill icons |
| Avatars | Real photos in testimonials + overlapping cluster on closing CTA |
| Arrows | Text `→` `↗` on links — no chevron icons |
| Trust badges | SOC 2, GDPR, G2 — repeated mid-page + footer |
| llms.txt | `/llms.txt` for AI crawlers |

### 10.8 Assets checklist (marketing)

- [ ] `public/marketing/gradient-blob-1.webp`
- [ ] `public/marketing/gradient-blob-2.webp`
- [ ] `public/marketing/hero-demo-poster.webp`
- [ ] `public/marketing/og-image.png` (1200×630)
- [ ] CRM logos (HubSpot, Pipedrive, Zoho, Salesforce — official press kits)
- [ ] Compliance badges (SOC 2, GDPR, G2 when available)

---

## 11. Competitive Differentiation (messaging)

| vs Opine | Our angle |
|----------|-----------|
| HubSpot + Salesforce only | **HubSpot, Pipedrive, Zoho, Salesforce** |
| Closed platform | Open agent runtime, exportable workflows |
| Opaque AI | **Citations + confidence scores** on every field |
| Enterprise-only | **10-minute onboarding** wizard |
| Black-box eval | Transparent agent performance dashboard |
| "Best AI sales tools" | "AI presales CRM that works **with your CRM**" |

**Never mention Opine by name in marketing.** Use "legacy CRM + point tools" framing. Full benchmark: [`competitive-opine.md`](competitive-opine.md).

---

## 12. Brand Assets Checklist

- [ ] Final product name + domain
- [ ] Logo SVG (mark, full, wordmark)
- [ ] Favicon (32×32, 180×180 apple-touch)
- [ ] OG image template (1200×630)
- [ ] Integration provider logos (official press kits)
- [ ] Email HTML template
- [ ] Slack app icon (512×512)
- [ ] Brand guidelines PDF (export from this doc)

---

## 13. CSS Variables (copy-paste for Tailwind)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 262 100% 97%;
    --accent-foreground: 262 83% 40%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 262 83% 58%;
    --radius: 0.5rem;
  }
}
```

---

## 14. Application in Code

```typescript
// lib/brand.ts
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Signal',
  tagline: 'The AI presales CRM that tells you what to do next.',
  primaryColor: '#7C3AED',
  supportEmail: 'support@example.com',
  docsUrl: 'https://docs.example.com',
};
```

Set `NEXT_PUBLIC_BRAND_NAME` per environment until final name is chosen.
