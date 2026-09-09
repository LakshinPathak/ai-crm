# Design System & UI Specification
# AI-Native Presales CRM

> **Superseded by [`design-system.md`](design-system.md)** for tokens, components, and build specs.  
> This file is kept for layout principles and Opine-inspired sketches only.  
> **Doc index:** [`README.md`](README.md)

**Version:** 2.0 · **Status:** superseded  
**Frontend:** Next.js 15 · **shadcn/ui** (all primitives in `apps/web/components/ui/`) · Tailwind CSS 4  
**Backend:** Node.js API — no UI  
**Canonical tokens & components:** [`design-system.md`](design-system.md) — use for implementation  
**Reference:** Opine app screenshots in repo root; marketing patterns in [`landing-page.md`](landing-page.md) and [`competitive-opine.md`](competitive-opine.md)

---

## 1. Design Principles

1. **Data-dense, not cluttered** — show deal health at a glance; progressive disclosure for detail
2. **AI is visible but trustworthy** — loading steps, citations, confidence dots, human override
3. **Sales-native language** — MEDDPICC, POV, SE, blockers — not generic CRM jargon
4. **Keyboard + mouse** — power users drag deals, tab through forms, `/` for search
5. **Consistent status colors** — green/yellow/red sentiment maps everywhere

---

## 2. Layout System

### 2.1 App Shell

```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo]  Search deals...          [CRM|Opine]  [?] [Avatar]       │  h-14
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                         │
│ Side   │  Main content area                                      │
│ bar    │  max-w-full, px-6 py-4                                  │
│ w-56   │                                                         │
│        │                                                         │
│        │                                                         │
└────────┴─────────────────────────────────────────────────────────┘
```

| Region | Width | Behavior |
|--------|-------|----------|
| Sidebar | `224px` (`w-56`) | Fixed; collapsible to icons-only `w-16` on `< lg` |
| Header | `h-14` | Sticky top |
| Main | `flex-1` | Scrollable |
| Right panel (deal detail) | `320px` | Optional; tasks, metadata |

### 2.2 Breakpoints

| Token | Min width | Layout changes |
|-------|-----------|----------------|
| `sm` | 640px | Stack KPI cards 2-col |
| `md` | 768px | Sidebar visible |
| `lg` | 1024px | Kanban horizontal scroll |
| `xl` | 1280px | Deal detail 3-column |
| `2xl` | 1536px | Insights table full columns |

---

## 3. Typography

**Font stack:** `Inter` (UI), `JetBrains Mono` (SQL explorer, code)

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `text-xs` | 12px | 400 | Badges, metadata |
| `text-sm` | 14px | 400 | Table cells, card secondary |
| `text-base` | 16px | 400 | Body |
| `text-lg` | 18px | 600 | Section headers |
| `text-xl` | 20px | 600 | Page titles |
| `text-2xl` | 24px | 700 | KPI values |
| `text-3xl` | 30px | 700 | Hero metrics |

**Deal title:** `text-xl font-semibold tracking-tight`  
**Column header:** `text-sm font-medium text-muted-foreground`

---

## 4. Color System

### 4.1 Semantic Colors (CSS variables)

```css
:root {
  /* Brand — see branding-guidelines.md */
  --primary: 262 83% 58%;           /* Purple #7C3AED */
  --primary-foreground: 0 0% 100%;

  /* Surfaces */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;

  /* Sentiment */
  --sentiment-green: 142 76% 36%;
  --sentiment-yellow: 38 92% 50%;
  --sentiment-red: 0 84% 60%;

  /* Status */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  --info: 217 91% 60%;

  /* Activity types (stacked bars) */
  --activity-external: 217 91% 60%;      /* Blue */
  --activity-internal: 262 83% 58%;      /* Purple */
  --activity-prep: 199 89% 48%;          /* Cyan */
  --activity-other: 215 16% 47%;         /* Gray */
  --activity-logged: 38 92% 50%;         /* Orange */
}
```

### 4.2 Sentiment Badge

| Value | Background | Dot | Label |
|-------|------------|-----|-------|
| `green` | `bg-emerald-50` | `bg-emerald-500` | Green |
| `yellow` | `bg-amber-50` | `bg-amber-500` | Yellow |
| `red` | `bg-red-50` | `bg-red-500` | Red |

### 4.3 Technical Fit Score

5-dot scale; filled dots = score, empty = remainder.

```
● ● ● ● ○  → 4 - Good fit
```

Colors: 1–2 red tint, 3 amber, 4–5 emerald

---

## 5. Spacing & Radius

| Token | Value | Use |
|-------|-------|-----|
| `rounded-sm` | 4px | Badges |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards |
| `rounded-xl` | 12px | Modals, agent template cards |
| `gap-4` | 16px | Card grid |
| `p-4` | 16px | Card padding |
| `p-6` | 24px | Page padding |

---

## 6. Component Library

### 6.1 shadcn/ui components to install

```
button, input, label, select, textarea, checkbox, switch, badge,
card, dialog, sheet, dropdown-menu, tabs, tooltip, popover,
command, avatar, separator, skeleton, progress, scroll-area,
table, toast, alert, form, calendar
```

### 6.2 Custom components

| Component | Path | Description |
|-----------|------|-------------|
| `DealCard` | `components/deals/deal-card.tsx` | Kanban card |
| `KanbanBoard` | `components/deals/kanban-board.tsx` | DnD columns |
| `KanbanColumn` | `components/deals/kanban-column.tsx` | Stage column |
| `DealMetricsBar` | `components/deals/deal-metrics-bar.tsx` | 6 KPI cards |
| `ProcessStepper` | `components/deals/process-stepper.tsx` | Horizontal stages |
| `MeddpiccSummary` | `components/ai/meddpicc-summary.tsx` | AI summary block |
| `LoadingStepsList` | `components/ai/loading-steps-list.tsx` | SSE progress |
| `CitationPopover` | `components/ai/citation-popover.tsx` | Source drill-down |
| `SentimentBadge` | `components/deals/sentiment-badge.tsx` | G/Y/R |
| `FitScore` | `components/deals/fit-score.tsx` | 1–5 dots |
| `BlockerBadge` | `components/deals/blocker-badge.tsx` | Red count chip |
| `AgentTemplateCard` | `components/agents/template-card.tsx` | Template modal item |
| `AgentRunTimeline` | `components/agents/run-timeline.tsx` | Step list |
| `ApprovalPreview` | `components/approvals/approval-preview.tsx` | Rich preview |
| `IntegrationCard` | `components/settings/integration-card.tsx` | Provider card |
| `ActivitySparkline` | `components/charts/activity-sparkline.tsx` | 12pt mini chart |
| `StackedActivityBar` | `components/charts/stacked-activity-bar.tsx` | Horizontal bar |
| `ActivityOverTimeChart` | `components/charts/activity-over-time.tsx` | Composed chart |
| `SidebarNav` | `components/layout/sidebar-nav.tsx` | Left nav |
| `AppHeader` | `components/layout/app-header.tsx` | Top bar |

---

## 7. Page-Specific UI Specs

### 7.1 Deals Pipeline (`/deals`)

**Toolbar:**
- Left: `Deals` title, view toggle (board | list), pipeline dropdown
- Center: `Select view...` filter dropdown
- Right: `+ New deal`, search input

**Kanban column header:**
```
1 - Qualification & Discovery
10 deals · $107.53K / $1.08M
```

**Deal card anatomy (min-height 140px):**
```
┌─────────────────────────────┐
│ [Logo] New Relic      [1⚠] │  ← blocker badge top-right
│ $48,300                     │
│ Owner: [avatar] Charlie     │
│ SE:    [avatar] Austin      │
│ ● Yellow  ●●●○○ 3-OK fit   │  ← sentiment + fit
│ ████████░░░░░░░░░░░░░░░░░░ │  ← purple progress bar (optional)
└─────────────────────────────┘
```

**DnD:** `@dnd-kit/core` + `@dnd-kit/sortable`  
**Drag overlay:** elevated shadow `shadow-lg ring-2 ring-primary`

### 7.2 Deal Detail (`/deals/[id]`)

**Header row:**
- Back link, company logo, `DocuSign (New Logo)`, HubSpot badge
- Tab bar (12 tabs, scrollable on mobile)

**KPI strip (6 cards, horizontal scroll on mobile):**

| Card | Value example | Indicator |
|------|---------------|-----------|
| Deal Value | $2.09M | — |
| Weighted Value | $1.55M | — |
| Win Probability | 74% | orange dot if dropped |
| Plan Confidence | 99% | mini progress bar |
| Blockers | 4 | red text |
| Important | 13 | green text |

**Process stepper:**
- Completed: filled purple circle + checkmark
- Active: purple ring + `(6/12)` label
- Future: gray outline

**3-column body (Overview tab):**
- Left `w-64`: metadata sections
- Center `flex-1`: AI Deal Summary
- Right `w-72`: Recent Tasks (max 5)

### 7.3 AI Deal Summary Card

**States:**
1. `idle` — cached content, "Updated 2d ago" + Refresh button
2. `refreshing` — badge "Refreshing", loading steps list
3. `streaming` — sections appear one by one
4. `error` — banner + Retry

**Loading steps (vertical list):**
```
✓ Retrieving deal insights...
✓ Checking CRM status...
✓ Reading notes...
...
⟳ Thinking...
```

**MEDDPICC section:**
```
Metrics                                    [↻]
• Estimated annual ROI ~$5.0M from POV...  [●]
• Clari remains critical blocker...       [●]
```

Citation dot `[●]` opens side sheet with excerpt + link to call.

### 7.4 Agents Dashboard (`/agents`)

**Stats row (3 cards):**
- Total Agents (61, 46 active) — mini bar chart
- Runs 30d (211) — sparkline
- Credits 30d (111.42) — sparkline

**Table columns:** Name | Owner | Runs (30d) | Cost (30d) | Last run | Status

**Template modal:** 2-column grid, category badge (Process/Risk/Signals/Reporting)

### 7.5 Agent Builder (`/agents/new`)

**Wizard sidebar (left, vertical steps):**
1. Basics ●
2. Trigger ○
3. Prompt ○
4. Tools & Skills ○
5. Review ○

**Right panel:** "Want help getting started?" + NL prompt box

### 7.6 Integrations (`/settings/integrations`)

**Category sections:** CRM | **Chat** (Slack, Teams, Google Chat) | Calendar | Call Recording | Product Management

**Chat settings UI:** See [`chat-channels.md`](chat-channels.md) §7 — provider cards with connect/disconnect, user notification matrix, deal channel linker.

**Integration card:**
```
┌────────────────────────┐
│ [icon] HubSpot  Enabled│  ← green badge
│ Sync evaluation details│
│ with your deals.       │
└────────────────────────┘
```

### 7.7 Insights Users (`/insights/users`)

**Summary cards (6):** Members, Active Deals, Open Pipeline, Closed Won, Win Rate, Total Activity Hours

**Table:** User | Active Deals | Open Pipeline | Closed Won | Win Rate | Total Hours | Activity (sparkline) | Breakdown (stacked bar) | Top Labels

---

## 8. Interaction Patterns

### 8.1 Optimistic updates

| Action | Optimistic | Rollback on error |
|--------|------------|-------------------|
| Drag deal to stage | Move card immediately | Snap back + toast |
| Complete task | Check checkbox | Uncheck + toast |
| Approve email draft | Remove from queue | Re-add + toast |

### 8.2 Loading skeletons

- Kanban: 5 columns × 3 skeleton cards
- Deal detail: KPI skeleton row + 3 text blocks
- Table: 10 skeleton rows

### 8.3 Empty states

| Screen | Message | CTA |
|--------|---------|-----|
| Empty pipeline | "No deals yet" | Create deal |
| No integrations | "Connect HubSpot to sync deals" | Go to Integrations |
| No agents | "Start from a template" | Browse templates |
| No approvals | "All caught up" | — |

### 8.4 Toasts

- Success: green, 3s auto-dismiss
- Error: red, persist until dismissed
- Agent complete: "Post-call draft ready" + link to Approvals

---

## 9. Icons

**Library:** Lucide React

| Concept | Icon |
|---------|------|
| Deals | `LayoutGrid` |
| Agents | `Bot` |
| Insights | `BarChart3` |
| Settings | `Settings` |
| Blocker | `AlertTriangle` |
| Refresh AI | `Sparkles` |
| Citation | `Link2` |
| Approval | `CheckCircle` |

---

## 10. Motion

| Element | Animation |
|---------|-----------|
| Modal open | `fade-in` + `zoom-in-95` 200ms |
| Card drag | `scale-105` on lift |
| MEDDPICC section appear | `fade-in-up` 300ms stagger 100ms |
| Step checkmark | `scale-in` 150ms |
| Sidebar collapse | `width` transition 200ms |

**Reduce motion:** respect `prefers-reduced-motion`

---

## 11. Accessibility

- All sentiment colors have text labels (not color-only)
- Kanban: keyboard alternative via "Move to stage" dropdown on card focus
- SSE updates announced via `aria-live="polite"` region
- Focus trap in modals
- Minimum touch target 44×44px on mobile

---

## 12. Responsive Behavior

| Component | Mobile | Desktop |
|-----------|--------|---------|
| Sidebar | Drawer overlay | Fixed |
| Kanban | Horizontal scroll | Full width |
| Deal tabs | Scrollable chip bar | Full row |
| KPI strip | 2×3 grid scroll | Single row |
| 3-column deal | Stacked: summary → metadata → tasks | Side by side |

---

## 13. Chart Specs (Recharts)

### Activity Over Time

- `ComposedChart`: stacked `Bar` + `Line` overlay
- Bar colors: activity type tokens
- Line: `totalHours`, stroke `hsl(var(--primary))`, `strokeWidth={2}`
- Tooltip: custom 2-column (by type | by label)
- Y-axis: auto-scale, format `{{value}}h`

### Donut charts

- `innerRadius={60}`, `outerRadius={80}`
- Center text: largest segment % + hours

### Sparkline

- No axes, no tooltip
- `width={80}`, `height={24}`
- Stroke purple, `strokeWidth={1.5}`, `fill="none"`

---

## 14. Marketing Site UI

**Full spec:** [`landing-page.md`](landing-page.md)  
**Benchmark:** Opine tryopine.com patterns — [`competitive-opine.md`](competitive-opine.md)

Marketing uses the **same design tokens** as the app (§4) but different layout density: more whitespace, larger type, gradient backdrops.

### 14.1 Marketing layout shell

```
┌─────────────────────────────────────────────────────────────────┐
│ Announcement bar (40px, sticky top-0)                           │
├─────────────────────────────────────────────────────────────────┤
│ [Logo]  Product  Solutions  Integrations  Pricing  Resources    │
│                                         Sign in  [Start free]   │  h-16
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Section content (max-w-7xl mx-auto px-6)                       │
│  + optional gradient-backdrop (absolute, z-0)                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Trust badges (SOC2 · GDPR · G2)                                 │
│ Footer 5-column + bottom bar                                    │
└─────────────────────────────────────────────────────────────────┘
```

| Region | Spec |
|--------|------|
| Announcement | `h-10`, `bg-accent`, dismissible optional |
| Header | `h-16`, `bg-white/80 backdrop-blur-md`, `z-40` |
| Section padding | `py-16`–`py-24` |
| Content max-width | `1280px` (`max-w-7xl`) |

### 14.2 Marketing typography (hero scale)

| Element | Classes |
|---------|---------|
| H1 hero | `text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight` |
| H2 section | `text-3xl md:text-4xl font-semibold` |
| Stat numeral | `text-5xl md:text-6xl font-bold tabular-nums text-primary` |
| Eyebrow | `text-sm font-medium text-muted-foreground uppercase tracking-wide` |
| Italic emphasis | `<em>` one word in H2 — e.g. *faster* |

### 14.3 Gradient backdrops (marketing-only)

```css
.gradient-backdrop-1 {
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(124, 58, 237, 0.12), transparent),
    radial-gradient(ellipse 60% 50% at 80% 60%, rgba(59, 130, 246, 0.08), transparent);
}
.gradient-backdrop-2 {
  background:
    radial-gradient(ellipse 70% 50% at 70% 30%, rgba(124, 58, 237, 0.10), transparent),
    radial-gradient(ellipse 50% 40% at 20% 70%, rgba(236, 72, 153, 0.06), transparent);
}
```

Desktop: optional `background-attachment: fixed`. Mobile: disable fixed attachment.

### 14.4 Marketing components

| Component | File | Notes |
|-----------|------|-------|
| `AnnouncementBar` | `components/marketing/announcement-bar.tsx` | Case-study teaser |
| `MarketingHeader` | `components/marketing/marketing-header.tsx` | Mega-menus |
| `HeroSection` | `components/marketing/hero-section.tsx` | Dual CTA + optional screenshot |
| `ConnectorLogos` | `components/marketing/connector-logos.tsx` | **Our differentiator** — 4 CRM logos |
| `CapabilityMarquee` | `components/marketing/capability-marquee.tsx` | Duplicated DOM loop |
| `StatCounter` | `components/marketing/stat-counter.tsx` | SSR `0`, animate on view |
| `FeatureSection` | `components/marketing/feature-section.tsx` | 3-item stack + gradient |
| `PricingWizard` | `components/marketing/pricing-wizard.tsx` | 4-step radio cards |
| `DealCardBeforeAfter` | `components/marketing/deal-card-before-after.tsx` | Why page |
| `TrustBadges` | `components/marketing/trust-badges.tsx` | Compliance row |

### 14.5 Marketing motion

| Element | Animation | Duration |
|---------|-----------|----------|
| Stat counter | `0 → target` on `useInView` | 1.5s easeOut |
| Marquee | CSS `@keyframes` translateX | ~30s loop |
| Word-swap headline | `AnimatePresence` rotate | 3s interval |
| Section reveal | `opacity` + `y` | 0.5s once |
| Pricing step | Framer `layout` | 300ms |
| Video modal | Radix Dialog fade + zoom | 200ms |

Respect `prefers-reduced-motion`: show final stat values, static pills.

### 14.6 Marketing CTAs

| Variant | Style |
|---------|-------|
| Primary | `bg-primary text-primary-foreground` + text `→` suffix |
| Secondary | `text-primary font-medium` link with `→` |
| Text link | `hover:underline` + `→` or `↗` |

**Do not** use Lucide chevrons on marketing links — text glyphs only (Opine pattern).

### 14.7 Related docs

| Doc | Link |
|-----|------|
| Landing page sections & copy | [`landing-page.md`](landing-page.md) |
| Brand voice & colors | [`branding-guidelines.md`](branding-guidelines.md) |
| Marketing routes | [`frontend-flow.md`](frontend-flow.md) §1.1 |
| Opine benchmark | [`competitive-opine.md`](competitive-opine.md) |
