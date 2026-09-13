# Light pastel theme — planning plan

**Date:** 2026-09-13  
**Goal:** One **light pastel** look on marketing, auth, onboarding, and every dashboard page. No dark-first chrome, no stark white vs ink black split, no navy marketing footer vs gray app shell.

**Source of truth:** shadcn CSS variables in `apps/web/app/globals.css` `:root`. Every surface uses `bg-background`, `bg-card`, `bg-muted`, `bg-sidebar`, `text-foreground`, `border-border`, or the mapped legacy vars (`--bg`, `--surface`, `--text`).

**Out of scope:** API, routes, copy in `marketing-content.ts`, PricingWizard submit.

---

## Palette (canonical — implementers must copy these)

Soft lilac canvas, milky cards, muted pastel accents (not neon, not slate SaaS).

```css
:root {
  /* canvas — barely-there lavender */
  --background: oklch(0.975 0.018 290);
  --foreground: oklch(0.32 0.04 290); /* ink-lilac, not #0f172a */

  --card: oklch(0.995 0.01 290);
  --card-foreground: oklch(0.32 0.04 290);
  --popover: oklch(0.995 0.01 290);
  --popover-foreground: oklch(0.32 0.04 290);

  /* primary — dusty violet, lower chroma than current 0.281 */
  --primary: oklch(0.58 0.14 300);
  --primary-foreground: oklch(0.99 0.01 290);

  --secondary: oklch(0.94 0.03 290);
  --secondary-foreground: oklch(0.35 0.04 290);
  --muted: oklch(0.945 0.025 285);
  --muted-foreground: oklch(0.48 0.03 290);
  --accent: oklch(0.94 0.04 200); /* mint wash */
  --accent-foreground: oklch(0.32 0.04 290);

  --border: oklch(0.90 0.025 290);
  --input: oklch(0.90 0.025 290);
  --ring: oklch(0.58 0.14 300);

  --sidebar: oklch(0.97 0.022 290);
  --sidebar-foreground: oklch(0.32 0.04 290);
  --sidebar-primary: oklch(0.58 0.14 300);
  --sidebar-primary-foreground: oklch(0.99 0.01 290);
  --sidebar-accent: oklch(0.93 0.04 290);
  --sidebar-accent-foreground: oklch(0.32 0.04 290);
  --sidebar-border: oklch(0.90 0.025 290);
  --sidebar-ring: oklch(0.58 0.14 300);

  /* charts — pastel, not gray ramps */
  --chart-1: oklch(0.72 0.10 300); /* lilac */
  --chart-2: oklch(0.78 0.09 200); /* mint */
  --chart-3: oklch(0.80 0.08 70);  /* peach */
  --chart-4: oklch(0.76 0.08 240); /* sky */
  --chart-5: oklch(0.78 0.08 20);  /* rose */

  --bg: var(--background);
  --surface: var(--card);
  --surface-2: oklch(0.96 0.02 290);
  --surface-hover: oklch(0.94 0.03 290);
  --text: var(--foreground);
  --text-secondary: oklch(0.42 0.035 290);
  --muted-legacy: var(--muted-foreground);
  --border-legacy: var(--border);
  --border-light: oklch(0.93 0.02 290);
  --brand-primary: oklch(0.58 0.14 300);
  --primary-2: oklch(0.62 0.12 280);
  --primary-light: oklch(0.94 0.04 300);
  --primary-hover: oklch(0.50 0.14 300);
  --primary-glow: oklch(0.70 0.12 300 / 0.18);
  --bg-mesh:
    radial-gradient(ellipse 80% 50% at 0% 0%, oklch(0.85 0.08 300 / 0.35), transparent 55%),
    radial-gradient(ellipse 70% 45% at 100% 0%, oklch(0.90 0.07 200 / 0.30), transparent 50%),
    radial-gradient(ellipse 50% 40% at 50% 100%, oklch(0.92 0.06 70 / 0.22), transparent 50%);

  /* semantic pastels */
  --green: oklch(0.68 0.12 160);
  --green-bg: oklch(0.95 0.04 160);
  --green-text: oklch(0.40 0.08 160);
  --yellow: oklch(0.78 0.10 85);
  --yellow-bg: oklch(0.96 0.04 85);
  --yellow-text: oklch(0.45 0.08 70);
  --red: oklch(0.65 0.14 20);
  --red-bg: oklch(0.96 0.03 20);
  --red-text: oklch(0.45 0.10 20);
  --teal: oklch(0.70 0.08 195);
  --teal-bg: oklch(0.95 0.03 195);
  --blue-bg: oklch(0.95 0.03 250);
  --blue-text: oklch(0.42 0.08 250);
}
```

`.dark` may keep a **soft** dusk (still pastel, not OLED black) OR mirror light with slightly lower L. Default theme: **`light`** (not `system`) so first paint is pastel.

ThemeProvider: `defaultTheme="light"` `enableSystem={false}` unless we keep a toggle that still defaults light.

---

## Global CSS file (only one)

| File | Role |
|------|------|
| `apps/web/app/globals.css` | **Only stylesheet.** Tokens, leftover `.sidebar` / `.ui-*` / `.mkt-*` / `.auth-*` / `.analytics-*` / `.onboarding-*` / `.hero-visual-*`. |

There are **no** other `.css` files under `apps/web`.

### Selectors that must use tokens (not `#fff` / `#0f172a`)

- `html, body`, `a`
- `.sidebar`, `.sidebar-footer`, `.workspace-switcher`
- `.ui-*` (header, btn, card, kpi, badge, kanban, empty)
- `.auth-page`, `.auth-card`, `.onboarding-*`
- `.mkt`, `.mkt-header`, `.mkt-footer` (footer must **not** be near-black)
- `.analytics-*` tables/toggles
- `.hero-visual__*`

---

## Local TSX (hardcoded colors → tokens)

### Shell / primitives
- `apps/web/app/layout.tsx` — ThemeProvider default light
- `apps/web/components/theme-provider.tsx`
- `apps/web/components/DashboardShell.tsx`
- `apps/web/components/ui/sidebar.tsx`
- `apps/web/components/ui/KpiCard.tsx`
- `apps/web/components/ui/PageHeader.tsx`
- `apps/web/components/ui/EmptyState.tsx`
- `apps/web/components/ui/chart.tsx`
- `apps/web/components/ui/DealKanbanCard.tsx`

### Marketing
- `MarketingShell.tsx`, `MarketingHeader.tsx`, `MarketingFooter.tsx`, `MobileNav.tsx`
- `LandingPage.tsx`, `LandingHero.tsx`, `HeroVisual.tsx`
- `WhyPage.tsx`, `AboutPage.tsx`, `ProductPage.tsx`, `ProductSectionPage.tsx`
- `PricingPage.tsx`, `BlogPage.tsx`, `BlogPostPage.tsx`
- `AgentDriftDemo.tsx`, marquees, animations as needed

### Auth / onboarding
- `components/auth/AuthCard.tsx`
- `app/(auth)/sign-in/page.tsx`, `sign-up`, `auth/callback`
- `app/onboarding/page.tsx`

### Dashboard pages (Tailwind `bg-muted`, `bg-white` → `bg-background` / `bg-card`)
- `(dashboard)/layout.tsx`, `home/page.tsx`
- deals, deals/[dealId], accounts, calls, agents, approvals, insights, settings, projects, requests

### Analytics (hex in Recharts)
- `PerformanceDashboard.tsx`, `ActivityDashboard.tsx`, `FunnelDashboard.tsx`, `LossDashboard.tsx`
- `ActivityStackedBar.tsx`, `Sparkline.tsx`, `ChangeBadge.tsx`, `UsersInsightsDashboard.tsx`

### Brand
- `LogoMark.tsx`, `IntegrationLogo.tsx` — keep logos; page chrome still pastel

---

## Execution — 7 exclusive workstreams

| WS | Owner files | Job |
|----|-------------|-----|
| 1 | `globals.css` **only** (`:root`, `.dark`, html/body, map leftover classes to vars, pastel `.mkt-footer`) | Token source of truth |
| 2 | `layout.tsx`, `theme-provider.tsx`, `DashboardShell.tsx`, `sidebar.tsx` | Light default, shell uses sidebar/background tokens |
| 3 | All `components/marketing/*` except HeroVisual if WS-7 takes it — **WS-3: Shell/Header/Footer/Landing/Why/About/Product/Blog/Pricing** | No `bg-zinc-950` footers; `bg-background` / `bg-card` |
| 4 | Auth + onboarding pages + AuthCard | Same card as dashboard |
| 5 | `components/analytics/**` | Chart colors = `var(--chart-n)` / pastel hex matching tokens |
| 6 | Home, deals, accounts, calls, agents, insights pages, KpiCard, PageHeader, EmptyState, DealKanbanCard | Replace `bg-white` / `bg-muted/40` with card/muted tokens |
| 7 | `HeroVisual.tsx`, `chart.tsx`, brand marks if they set page bg; deal-badges / leftover inline hex in deal tabs | Hero mock + charts match lilac/mint/peach |

**Do not** edit another WS’s files. Do not introduce a second CSS file.

---

## Inventory confirmed (read-only mappers)

- **One CSS file:** `apps/web/app/globals.css` — `:root` + leftover `.sidebar` (unused by shell, still `#fff` glass), `.ui-*`, `.mkt-*` (footer `oklch(0.18)`), `.analytics-*`, `.auth-card`, `.onboarding-*`, `.hero-visual*`.
- **Auth live path:** `AuthCard` uses Tailwind (`bg-muted/30`); `.auth-page` CSS is mostly unused.
- **Onboarding:** still uses `.onboarding-steps*` / mapping tables + some `var(--muted)` inline.
- **Analytics:** class names on Insights + hex palettes in `ActivityDashboard`, `PerformanceDashboard`, `FunnelDashboard`, `LossDashboard`, `Sparkline`, `ActivityStackedBar`.
- **Deal tabs:** still `ui-metrics` / `ui-table` in Overview and sibling tabs.
- **Kanban:** shadcn cards; `.ui-kanban` in CSS is orphaned. `DealKanbanCard` / `deal-badges.tsx` / `lib/colors.ts` still have Tailwind emerald/amber hex.

## Acceptance

- Marketing, sign-in, onboarding, home, deals, insights all share the same canvas tint.
- Cards look milky, not paper-white on gray.
- Primary buttons dusty violet, not electric purple.
- Footer/header/sidebar same family (no black footer).
- `pnpm --filter @ai-crm/web typecheck` passes.
