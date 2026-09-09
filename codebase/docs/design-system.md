# Design System Specification
# AI-Native Presales CRM

**Version:** 1.0  
**Status:** Implementation-ready — supersedes scattered token/component notes in `design.md`  
**Stack:** Next.js 15 (frontend) · **shadcn/ui** · Tailwind CSS 4 · Node.js API (backend) · MongoDB  
**shadcn path:** `apps/web/components/ui/` — install via `npx shadcn@latest add <component>`  
**Overview:** [`system-design.md`](system-design.md) · **Index:** [`README.md`](README.md)  
**Sources:** [`design.md`](design.md) · [`branding-guidelines.md`](branding-guidelines.md) · [`landing-page.md`](landing-page.md) · [`chat-channels.md`](chat-channels.md) · [`frontend-flow.md`](frontend-flow.md) · [`prd.md`](prd.md)

---

## Table of contents

1. [Token architecture](#1-token-architecture)
2. [Component inventory & shadcn mapping](#2-component-inventory--shadcn-mapping)
3. [Agent-specific UI patterns](#3-agent-specific-ui-patterns)
4. [Chat message design (multi-provider)](#4-chat-message-design-multi-provider)
5. [Domain component specs](#5-domain-component-specs)
6. [Motion tokens](#6-motion-tokens)
7. [Accessibility requirements](#7-accessibility-requirements)
8. [Dark mode token plan](#8-dark-mode-token-plan)
9. [File structure](#9-file-structure)
10. [Gaps in `design.md`](#10-gaps-in-designmd)

---

## 1. Token architecture

Three-tier token model. **Primitives** are raw values; **semantic** tokens map intent to primitives; **component** tokens bind semantics to specific UI parts. App and marketing share semantic tokens; marketing adds layout/density overrides only.

### 1.1 Primitives

#### 1.1.1 Color primitives (HSL channels — Tailwind/shadcn convention)

Store as space-separated HSL without `hsl()` wrapper for `hsl(var(--token))` usage.

| Token | HSL | Hex ref | Role |
|-------|-----|---------|------|
| `purple-50` | `262 100% 97%` | `#F5F3FF` | AI tint backgrounds |
| `purple-100` | `262 100% 94%` | `#EDE9FE` | Hover, accent wash |
| `purple-500` | `262 83% 58%` | `#8B5CF6` | Secondary emphasis |
| `purple-600` | `262 83% 58%` | `#7C3AED` | Brand primary |
| `purple-700` | `262 70% 50%` | `#6D28D9` | Pressed / hover primary |
| `purple-900` | `262 60% 30%` | `#4C1D95` | Dark-mode anchor |
| `slate-50` | `210 40% 98%` | `#F8FAFC` | Alt page bg |
| `slate-100` | `210 40% 96%` | `#F1F5F9` | Muted surface |
| `slate-200` | `214 32% 91%` | `#E2E8F0` | Borders |
| `slate-500` | `215 16% 47%` | `#64748B` | Secondary text |
| `slate-900` | `222 47% 11%` | `#0F172A` | Primary text |
| `emerald-500` | `142 76% 36%` | `#16A34A` | Success / green sentiment |
| `amber-500` | `38 92% 50%` | `#F59E0B` | Warning / yellow sentiment |
| `red-500` | `0 84% 60%` | `#EF4444` | Danger / red sentiment |
| `blue-500` | `217 91% 60%` | `#3B82F6` | Info / external activity |
| `cyan-500` | `199 89% 48%` | `#06B6D4` | Prep activity |
| `orange-500` | `38 92% 50%` | `#F59E0B` | Logged activity |

#### 1.1.2 Typography primitives

| Token | Value | Notes |
|-------|-------|-------|
| `--font-sans` | `'Inter', system-ui, sans-serif` | App + marketing |
| `--font-mono` | `'JetBrains Mono', monospace` | SQL explorer, code, IDs |
| `--text-xs` | `0.75rem` / 12px | |
| `--text-sm` | `0.875rem` / 14px | |
| `--text-base` | `1rem` / 16px | |
| `--text-lg` | `1.125rem` / 18px | |
| `--text-xl` | `1.25rem` / 20px | |
| `--text-2xl` | `1.5rem` / 24px | KPI values |
| `--text-3xl` | `1.875rem` / 30px | Page titles |
| `--text-display-sm` | `clamp(2.5rem, 5vw, 3.75rem)` | Marketing hero |
| `--text-display-md` | `clamp(1.75rem, 3vw, 2.25rem)` | Marketing H2 |
| `--leading-tight` | `1.25` | Headings |
| `--leading-normal` | `1.5` | Body |
| `--tracking-tight` | `-0.02em` | Hero, deal titles |
| `--tracking-wide` | `0.05em` | Eyebrows (optional uppercase) |

#### 1.1.3 Spacing primitives (4px base)

| Token | px | Tailwind |
|-------|-----|----------|
| `--space-0` | 0 | `0` |
| `--space-1` | 4 | `1` |
| `--space-2` | 8 | `2` |
| `--space-3` | 12 | `3` |
| `--space-4` | 16 | `4` |
| `--space-5` | 20 | `5` |
| `--space-6` | 24 | `6` |
| `--space-8` | 32 | `8` |
| `--space-10` | 40 | `10` |
| `--space-12` | 48 | `12` |
| `--space-16` | 64 | `16` |
| `--space-24` | 96 | `24` |

#### 1.1.4 Radius primitives

| Token | px | Use |
|-------|-----|-----|
| `--radius-sm` | 4px | Badges, chips |
| `--radius-md` | 6px | Inputs, buttons |
| `--radius-lg` | 8px | Cards |
| `--radius-xl` | 12px | Modals, agent cards |
| `--radius-2xl` | 16px | Marketing feature cards |
| `--radius-full` | 9999px | Pills, avatars |

#### 1.1.5 Shadow primitives

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-xs` | `0 1px 2px rgb(15 23 42 / 0.05)` | Subtle elevation |
| `--shadow-sm` | `0 1px 3px rgb(15 23 42 / 0.08)` | Cards |
| `--shadow-md` | `0 4px 12px rgb(15 23 42 / 0.10)` | Dropdowns |
| `--shadow-lg` | `0 10px 24px rgb(15 23 42 / 0.12)` | Drag overlay, sheets |
| `--shadow-ring-primary` | `0 0 0 2px hsl(var(--ring))` | Focus / drag active |

#### 1.1.6 Z-index primitives

| Token | Value | Layer |
|-------|-------|-------|
| `--z-base` | 0 | Content |
| `--z-sticky` | 10 | Sticky column headers |
| `--z-dropdown` | 20 | Menus, popovers |
| `--z-header` | 30 | App header |
| `--z-sidebar` | 30 | Sidebar drawer (mobile) |
| `--z-overlay` | 40 | Marketing header, backdrop |
| `--z-modal` | 50 | Dialog, sheet |
| `--z-toast` | 60 | Sonner toasts |
| `--z-announcement` | 50 | Marketing announcement bar |

#### 1.1.7 Layout primitives

| Token | App | Marketing |
|-------|-----|-----------|
| `--shell-header-height` | `3.5rem` (56px → use `h-14`) | `4rem` (`h-16`) |
| `--shell-sidebar-width` | `14rem` (224px) | — |
| `--shell-sidebar-collapsed` | `4rem` (64px) | — |
| `--shell-right-panel` | `20rem` (320px) | — |
| `--content-max-width-app` | `100%` | — |
| `--content-max-width-marketing` | `80rem` (1280px) | `max-w-7xl` |
| `--section-padding-y-marketing` | — | `4rem`–`6rem` |

---

### 1.2 Semantic tokens

Defined in `apps/web/app/globals.css` under `@layer base`. App and marketing share `:root`; marketing may add utility classes that reference the same variables.

```css
@layer base {
  :root {
    /* Surfaces */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Brand & actions */
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    --primary-hover: 262 70% 50%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --accent: 262 100% 97%;
    --accent-foreground: 262 83% 40%;

    /* Feedback */
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 222 47% 11%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;

    /* Structure */
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 262 83% 58%;
    --radius: 0.5rem;

    /* Sentiment (deal health) */
    --sentiment-green: 142 76% 36%;
    --sentiment-yellow: 38 92% 50%;
    --sentiment-red: 0 84% 60%;
    --sentiment-green-bg: 142 76% 95%;
    --sentiment-yellow-bg: 48 96% 89%;
    --sentiment-red-bg: 0 86% 97%;

    /* Activity chart (fixed palette) */
    --activity-external: 217 91% 60%;
    --activity-internal: 262 83% 58%;
    --activity-prep: 199 89% 48%;
    --activity-other: 215 16% 47%;
    --activity-logged: 38 92% 50%;

    /* Agent category badges */
    --agent-process-bg: 142 76% 90%;
    --agent-process-fg: 142 64% 24%;
    --agent-risk-bg: 0 86% 94%;
    --agent-risk-fg: 0 63% 31%;
    --agent-signals-bg: 33 100% 92%;
    --agent-signals-fg: 21 90% 32%;
    --agent-reporting-bg: 214 95% 93%;
    --agent-reporting-fg: 224 76% 33%;

    /* AI surfaces */
    --ai-surface: 262 100% 97%;
    --ai-border: 262 83% 58%;
    --ai-glow: 262 100% 94%;

    /* Marketing gradients (semantic) */
    --gradient-backdrop-1-a: 262 83% 58% / 0.12;
    --gradient-backdrop-1-b: 217 91% 60% / 0.08;
    --gradient-backdrop-2-a: 262 83% 58% / 0.10;
    --gradient-backdrop-2-b: 330 81% 60% / 0.06;
  }
}
```

#### Semantic token usage matrix

| Semantic | App | Marketing |
|----------|-----|-----------|
| `--background` | Page canvas | Page canvas |
| `--foreground` | Body text | Headlines |
| `--muted-foreground` | Table secondary, labels | Body, captions |
| `--primary` | CTAs, active nav, chart line | CTAs, stat numerals |
| `--accent` | AI card wash, announcement bar | Pill backgrounds |
| `--sentiment-*` | Kanban badges, focus feed | Before/after deal card |
| `--activity-*` | Insights charts only | — |
| `--gradient-backdrop-*` | — | Section backgrounds |

---

### 1.3 Component tokens

Component tokens reference semantic tokens. Implement as Tailwind `@theme` extensions or CSS custom properties scoped to data attributes.

#### 1.3.1 Button

| Token | Maps to | Values |
|-------|---------|--------|
| `--btn-height-sm` | — | `2rem` (32px) |
| `--btn-height-default` | — | `2.25rem` (36px) |
| `--btn-height-lg` | — | `2.75rem` (44px) |
| `--btn-radius` | `--radius-md` | 6px |
| `--btn-primary-bg` | `--primary` | |
| `--btn-primary-bg-hover` | `--primary-hover` | |
| `--btn-primary-fg` | `--primary-foreground` | |
| `--btn-secondary-bg` | `--background` | + border |
| `--btn-secondary-border` | `--border` | |
| `--btn-destructive-bg` | `--destructive` | |
| `--btn-ai-icon-gap` | `--space-2` | Sparkles left |

#### 1.3.2 Card

| Token | App default | Marketing override |
|-------|-------------|-------------------|
| `--card-bg` | `--card` | `--card` |
| `--card-border` | `--border` | `--border` |
| `--card-radius` | `--radius-lg` | `--radius-2xl` (feature cards) |
| `--card-padding` | `--space-4` | `--space-6`–`8` |
| `--card-shadow` | `--shadow-sm` | `--shadow-sm` or none on gradient sections |
| `--card-ai-bg` | `--ai-surface` | — |
| `--card-ai-border-left` | `4px solid hsl(var(--ai-border))` | — |

#### 1.3.3 Input / Form

| Token | Value |
|-------|-------|
| `--input-height` | `2.25rem` |
| `--input-radius` | `--radius-md` |
| `--input-border` | `--border` |
| `--input-border-focus` | `--ring` |
| `--input-bg` | `--background` |
| `--input-bg-disabled` | `--muted` |
| `--label-color` | `--foreground` |
| `--hint-color` | `--muted-foreground` |
| `--error-color` | `--destructive` |

#### 1.3.4 Deal card (Kanban)

| Token | Value |
|-------|-------|
| `--deal-card-min-height` | `8.75rem` (140px) |
| `--deal-card-padding` | `--space-3` |
| `--deal-card-radius` | `--radius-lg` |
| `--deal-card-drag-ring` | `--shadow-ring-primary` |
| `--deal-card-drag-shadow` | `--shadow-lg` |
| `--deal-card-blocker-badge-bg` | `--sentiment-red-bg` |
| `--deal-card-blocker-badge-fg` | `--sentiment-red` |

#### 1.3.5 App shell

| Token | Value |
|-------|-------|
| `--sidebar-width` | `--shell-sidebar-width` |
| `--sidebar-collapsed-width` | `--shell-sidebar-collapsed` |
| `--header-height` | `--shell-header-height` |
| `--main-padding-x` | `--space-6` |
| `--main-padding-y` | `--space-4` |
| `--nav-item-active-bg` | `--accent` |
| `--nav-item-active-fg` | `--accent-foreground` |

#### 1.3.6 Marketing section

| Token | Value |
|-------|-------|
| `--marketing-hero-max-width` | `45rem` (720px) |
| `--marketing-stat-size` | `clamp(3rem, 6vw, 4rem)` |
| `--marketing-eyebrow-size` | `--text-sm` |
| `--marketing-cta-arrow` | text glyph `→` (never Lucide chevron) |

#### 1.3.7 Chat message (canonical → rendered)

| Token | Value |
|-------|-------|
| `--chat-header-sentiment-dot` | maps sentiment enum |
| `--chat-action-primary` | Approve → `--success` |
| `--chat-action-destructive` | Reject → `--destructive` |
| `--chat-action-secondary` | View in app → `--primary` |
| `--chat-footer-muted` | `--muted-foreground` |

---

### 1.4 Tailwind / shadcn wiring

```typescript
// tailwind.config.ts (conceptual — Tailwind 4 may use @theme in CSS)
export const theme = {
  extend: {
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      // ... shadcn standard map
      sentiment: {
        green: 'hsl(var(--sentiment-green))',
        yellow: 'hsl(var(--sentiment-yellow))',
        red: 'hsl(var(--sentiment-red))',
      },
    },
    borderRadius: {
      lg: 'var(--radius-lg)',
      md: 'var(--radius-md)',
      sm: 'var(--radius-sm)',
    },
  },
};
```

**Rule:** Components consume **component tokens** or Tailwind utilities mapped to **semantic** tokens. Never hardcode `#7C3AED` in JSX.

---

## 2. Component inventory & shadcn mapping

### 2.1 shadcn/ui base (`components/ui/`)

Install via `npx shadcn@latest add <name>`. All primitives extend Radix; variants via `class-variance-authority`.

| shadcn component | Variants / sizes | App usage | Marketing usage |
|------------------|------------------|-----------|-----------------|
| `button` | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`; `sm`, `default`, `lg`, `icon` | All actions; add `ai` variant (primary + Sparkles) | Primary CTA with `→` suffix in label text |
| `input` | default | Forms, search, filters | Pricing wizard email |
| `textarea` | default | Notes, agent prompts, reject reason | — |
| `label` | — | Forms | Wizard labels |
| `select` | — | Pipeline, owner, CRM provider | CRM picker in pricing |
| `checkbox` | — | Notification toggles, task lists | — |
| `switch` | — | Integration enable, chat interact | — |
| `radio-group` | — | Onboarding options | Pricing wizard steps |
| `badge` | `default`, `secondary`, `destructive`, `outline` | Status, integration enabled | Category pills (capability marquee uses custom) |
| `card` | — | KPI, integration, agent stats | Feature sections, testimonials |
| `dialog` | — | Create deal, template picker | Video modal |
| `sheet` | `side`: left/right | Citation drill-down, approval detail | — |
| `drawer` | — | Mobile sidebar (optional) | Mobile nav |
| `dropdown-menu` | — | Card actions, avatar menu | — |
| `popover` | — | Citation preview (inline) | — |
| `tooltip` | — | Icon-only controls, fit score legend | — |
| `tabs` | — | Deal detail (desktop) | — |
| `accordion` | — | Settings sections, FAQ | — |
| `command` | — | Cmd+K palette | — |
| `avatar` | — | Owner, SE on cards | Testimonials |
| `separator` | — | Section dividers | Footer columns |
| `skeleton` | — | Loading states | Stat placeholder `0` |
| `progress` | — | Plan confidence, import progress | Pricing wizard bar |
| `scroll-area` | — | Kanban columns, tab bar | — |
| `table` | — | Deals list, insights, agents | — |
| `toast` / `sonner` | success, error, info | Optimistic rollback, agent complete | — |
| `alert` | default, destructive | MEDDPICC error, OAuth failure | — |
| `alert-dialog` | — | Disconnect CRM, reject approval | — |
| `form` | — | React Hook Form + Zod wrapper | — |
| `calendar` | — | Agent cron trigger | — |
| `breadcrumb` | — | Deal detail back nav | — |
| `navigation-menu` | — | — | Marketing mega-menus |
| `collapsible` | — | Metadata sections | — |
| `hover-card` | — | User profile preview | — |
| `pagination` | — | Runs log, deals list | — |
| `toggle` / `toggle-group` | — | Board/list view | — |
| `slider` | — | Value range filter (P2) | — |
| `aspect-ratio` | — | Video thumbnail | Hero demo |
| `carousel` | — | — | Testimonials (optional) |

**Additional shadcn (recommended):**

| Component | Purpose |
|-----------|---------|
| `data-table` | Insights users table with sorting |
| `chart` | shadcn chart wrapper over Recharts |
| `sidebar` | App shell (v2 sidebar primitive) |
| `input-otp` | — (future MFA) |

---

### 2.2 App domain components (`components/app/`)

Grouped by feature. Each wraps `components/ui/*` + domain logic.

#### Layout (`components/app/layout/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `AppShell` | — | default |
| `AppHeader` | `input` (search), `button`, `avatar`, `dropdown-menu` | with/without CRM toggle |
| `SidebarNav` | `button`, `separator`, `tooltip` (collapsed) | expanded / collapsed / mobile drawer |
| `PageHeader` | `h1` typography, `button`, breadcrumbs | with actions slot |
| `RightPanel` | `sheet` or fixed column | tasks, metadata |

#### Deals (`components/app/deals/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `KanbanBoard` | `@dnd-kit`, `KanbanColumn` | loading skeleton |
| `KanbanColumn` | `scroll-area`, column header | empty column |
| `DealCard` | `card`, `avatar`, `SentimentBadge`, `FitScore`, `BlockerBadge` | default, dragging, compact (list) |
| `DealCardSkeleton` | `skeleton` | — |
| `DealsToolbar` | `toggle-group`, `select`, `input`, `button` | board / list |
| `DealsTable` | `data-table` | sortable columns |
| `SentimentBadge` | `badge` | green, yellow, red |
| `FitScore` | custom dots | 1–5 |
| `BlockerBadge` | `badge` | count 0 hidden |
| `DealMetricsBar` | 6× `card` | horizontal scroll mobile |
| `ProcessStepper` | custom steps | completed, active, future |
| `DealHeader` | logo, `badge`, tab trigger | — |
| `DealTabBar` | `scroll-area` + chips | 12 tabs, lazy load |
| `DealMetadataPanel` | `collapsible` sections | — |
| `DealTasksSidebar` | `checkbox`, list | max 5 + link |
| `DealChannelLinker` | `select`, `switch`, `button` | per provider |
| `MoveStageMenu` | `dropdown-menu` | keyboard a11y alt to DnD |

#### AI (`components/app/ai/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `MeddpiccSummary` | `card`, sections | idle, refreshing, streaming, error |
| `MeddpiccSection` | heading, bullets, lock toggle | locked / unlocked |
| `LoadingStepsList` | list + icons | pending, active, complete |
| `CitationDot` | `button` | opens sheet |
| `CitationSheet` | `sheet` | excerpt, source link, artifact type |
| `AiRefreshButton` | `button` variant ai | disabled while streaming |
| `ConfidenceIndicator` | dot + label | high, medium, low |
| `StreamingText` | — | token fade-in optional |

#### Agents (`components/app/agents/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `AgentStatsRow` | 3× `card`, mini charts | — |
| `AgentTable` | `data-table` | — |
| `AgentStatusBadge` | `badge` | active, paused, error |
| `AgentCategoryBadge` | `badge` | process, risk, signals, reporting |
| `AgentTemplateCard` | `card` | selectable in modal grid |
| `AgentTemplateModal` | `dialog` | 2-col grid |
| `AgentWizard` | stepped layout | 5 steps |
| `AgentWizardSidebar` | step indicators | — |
| `AgentRunTimeline` | vertical timeline | step: pending, running, success, failed |
| `AgentRunStatusBadge` | `badge` | running, completed, failed |
| `RunCreditsDisplay` | monospace text | — |

#### Approvals (`components/app/approvals/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `ApprovalQueue` | list | empty state |
| `ApprovalListItem` | `card` row | email, slack, crm field |
| `ApprovalPreview` | rendered HTML / blocks preview | — |
| `ApprovalDetailSheet` | `sheet` | view, edit, approve, reject |
| `ApprovalExpiryLabel` | `text-muted` | — |
| `RejectReasonDialog` | `dialog` + `textarea` | — |

#### Settings (`components/app/settings/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `SettingsNav` | vertical tabs / links | — |
| `IntegrationCategoryGrid` | `IntegrationCard` grid | CRM, Chat, Calls, Calendar, PM |
| `IntegrationCard` | `card`, `badge`, `button` | disconnected, pending, enabled, error |
| `OAuthConnectButton` | `button` | opens popup + poll |
| `ChatProviderCard` | `IntegrationCard` | Slack, Teams, Google Chat |
| `ChatNotificationForm` | `form`, `select`, `switch`, `checkbox` | — |
| `WorkspaceChatToggles` | `switch` | commands, require login |
| `MembersTable` | `data-table` | roles |
| `SalesProcessEditor` | `table` (P2) | — |

#### Onboarding (`components/app/onboarding/`)

| Component | Composes | Variants |
|-----------|----------|----------|
| `OnboardingLayout` | progress header, step slot | 5 + optional step 6 |
| `OnboardingProgress` | `progress` | Step N of 5 |
| `CrmProviderPicker` | radio cards | HubSpot, Pipedrive, Zoho, Salesforce |
| `CrmOAuthConnect` | `IntegrationCard`, poll UI | per provider |
| `StageMappingTable` | `table`, `select` | auto-suggest highlight |
| `UserMappingTable` | `table`, `select` | skippable |
| `ImportProgress` | `progress`, live count | SSE/poll |
| `ChatConnectOptional` | 3 provider cards + Skip | step 6 |
| `OnboardingErrorBanner` | `alert` | retry + support link |

#### Charts (`components/app/charts/`)

| Component | Library | Notes |
|-----------|---------|-------|
| `ActivitySparkline` | Recharts | 80×24, no axes |
| `StackedActivityBar` | Recharts | horizontal single bar |
| `ActivityOverTimeChart` | Recharts ComposedChart | tooltip custom |
| `MiniBarChart` | Recharts | agent stats |
| `DonutChart` | Recharts | center label |

#### Home (`components/app/home/`)

| Component | Purpose |
|-----------|---------|
| `FocusFeed` | Deal Focus agent output |
| `FocusFeedItem` | sentiment emoji + deal row |
| `PendingApprovalsCard` | count + link |
| `PipelineSnapshot` | mini stage counts |
| `RecentActivityList` | last 10 events |

---

### 2.3 Marketing components (`components/marketing/`)

| Component | Composes | Notes |
|-----------|----------|-------|
| `AnnouncementBar` | sticky strip | dismiss → localStorage |
| `MarketingHeader` | `navigation-menu`, `button` | mega-menus |
| `MegaMenu` | `navigation-menu` | Product, Solutions, Resources, Integrations |
| `MarketingFooter` | grid links | 5 columns |
| `HeroSection` | typography, dual CTA | optional 2-col screenshot |
| `ConnectorLogos` | img grid | grayscale → color hover |
| `TrustVideoStrip` | `aspect-ratio`, `dialog` | play modal |
| `CapabilityMarquee` | CSS animation | duplicated DOM |
| `StatCounter` | Framer Motion | SSR `0`, animate in view |
| `StatsSection` | 4× `StatCounter` | |
| `TestimonialCard` | `card`, `avatar` | |
| `FeatureSection` | gradient backdrop | 3-item stack |
| `DealCardBeforeAfter` | comparison cards | Why page |
| `StageTimeline` | 3 blocks | horizontal lg+ |
| `ExploreLinks` | numbered links | |
| `ClosingCta` | CTA + avatar cluster | |
| `TrustBadges` | compliance imgs | |
| `PricingWizard` | `radio-group`, `progress`, `form` | 4 steps |
| `VideoModal` | `dialog`, iframe | |
| `GradientBackdrop` | absolute div | variants 1 / 2 |
| `MarketingButton` | extends `button` | appends `→` in children |

---

### 2.4 Agent runtime UI (`components/agents/`)

Thin presentation layer for agent outputs reused in app + chat preview adapters.

| Component | Purpose |
|-----------|---------|
| `AgentOutputBlock` | Normalized section title + bullets |
| `AgentActionBar` | Approve / Reject / View in app |
| `AgentRunStepIcon` | ✓ ⟳ ✗ icons |
| `AgentToolCallChip` | monospace tool name |
| `CanonicalChatPreview` | Web preview of Slack/Teams/GChat message |

**Note:** `components/agents/` holds **portable agent presentation**; `components/app/agents/` holds **dashboard CRUD UI**.

---

## 3. Agent-specific UI patterns

### 3.1 AI loading states

#### 3.1.1 Loading step list (SSE)

Used by: MEDDPICC refresh, agent run detail, long-running synthesis.

| State | Icon | Text style | ARIA |
|-------|------|------------|------|
| `pending` | empty circle | `text-muted-foreground` | — |
| `active` | `Loader2` spin | `text-foreground font-medium` | `aria-current="step"` |
| `complete` | `Check` green | `text-muted-foreground line-through optional` | — |
| `error` | `X` red | `text-destructive` | — |

**Layout:** vertical list, `gap-2`, left icon column `w-5`. Container: `aria-live="polite"` `aria-busy="true"` while streaming.

**Standard MEDDPICC steps (8 + thinking):**

1. Retrieving deal insights…
2. Checking CRM status…
3. Reading notes…
4. Analyzing call transcripts…
5. Scanning chat threads…
6. Evaluating MEDDPICC evidence…
7. Computing sentiment and fit…
8. Synthesizing summary…
9. Thinking… (indefinite spinner until first section)

#### 3.1.2 Skeleton patterns

| Surface | Pattern |
|---------|---------|
| Kanban | 5 columns × 3 `DealCardSkeleton` |
| KPI strip | 6 rectangular skeletons `h-20` |
| MEDDPICC | 8 section blocks, 3 lines each |
| Agent table | 10 rows |
| Approval list | 3 items |

#### 3.1.3 Streaming section reveal

- Sections mount with `fade-in-up` (see §6)
- Stagger `100ms` per section
- Show partial bullets as they arrive; citation dots appear after bullet UUID assigned

---

### 3.2 Citations

#### 3.2.1 Citation dot (inline)

- Render: `[●]` as `button` 16×16 hit area (44×44 touch target via padding)
- Color: `hsl(var(--primary))` default; `muted` when source stale
- Hover: `tooltip` with source type (Call, Note, CRM, Chat)
- Click: open `CitationSheet` (right `sheet`, `w-96`)

#### 3.2.2 Citation sheet content

```
┌─────────────────────────────────────┐
│ Source: Gong call · Mar 4, 2026     │
├─────────────────────────────────────┤
│ "We need Clari out of the stack       │
│  before POC can start..."            │
│                                     │
│ Speaker: Buyer (VP Eng)              │
├─────────────────────────────────────┤
│ [Open transcript ↗]  [Copy excerpt] │
└─────────────────────────────────────┘
```

- Always show artifact type icon + timestamp
- Deep link to Calls tab with timestamp anchor
- `aria-label`: "Citation from {type}, {date}. Press to view source."

#### 3.2.3 Citation count (footer)

Used in chat messages and summary card footer: `{n} sources` link → scroll to citations list or open index popover.

---

### 3.3 Approvals UI

#### 3.3.1 Queue list item

```
Post-Call Follow-up · DocuSign          2h ago
"Follow-up: Technical validation recap..."
Expires in 46h                         [Review]
```

- Content type icon: 📧 email, 💬 chat, 📝 CRM field
- Snippet: max 2 lines `line-clamp-2`
- Badge: `destructive` when <6h to expiry

#### 3.3.2 Detail sheet

| Zone | Content |
|------|---------|
| Header | Agent name, deal link, created at |
| Preview | `ApprovalPreview` — rendered email HTML sandboxed iframe OR chat block preview |
| Edit | Toggle edit mode for email body (`textarea` rich text P2) |
| Metadata | Trigger, run id, citation count |
| Actions | Primary Approve · Outline Edit in app · Destructive Reject |

**Approve:** optimistic remove from queue + toast "Follow-up queued"  
**Reject:** require optional note (`RejectReasonDialog`)  
**Security copy:** "You are sending external communication"

#### 3.3.3 Chat approval parity

Same actions in Slack Block Kit / Teams Adaptive Card / Google Chat buttons (§4). Web sheet is source of truth for edit; chat is read + action only.

---

### 3.4 Agent runs

#### 3.4.1 Run timeline

Vertical timeline per step:

| Step status | Visual |
|-------------|--------|
| `pending` | hollow circle |
| `running` | purple ring + pulse |
| `success` | filled purple + check |
| `failed` | red + X + error message collapsible |

Each step expandable: tool calls (`AgentToolCallChip`), duration, credits.

#### 3.4.2 Runs table columns

Name | Trigger | Scope (deal) | Status | Credits | Started | Duration

Status badges: `running` (info), `completed` (success), `failed` (destructive), `cancelled` (secondary)

#### 3.4.3 Agent dashboard stats

3 cards: Total Agents (with active fraction + mini bar), Runs 30d (sparkline), Credits 30d (sparkline). Use `--primary` for chart stroke.

---

### 3.5 AI visual language (global)

| Pattern | Spec |
|---------|------|
| AI content marker | `Sparkles` icon 16px before headings |
| AI card | `bg-[hsl(var(--ai-surface))]` + `border-l-4 border-primary` |
| Refresh in progress | `badge` "Refreshing" + `LoadingStepsList` |
| Locked field | `Lock` icon on section; excluded from overwrite |
| Confidence | 3-dot scale or High/Medium/Low label — never color-only |

---

## 4. Chat message design (multi-provider)

Canonical message model (`CanonicalChatMessage`) renders to provider-specific payloads. All providers must include **text fallback** for notifications and accessibility.

### 4.1 Canonical structure

```typescript
interface CanonicalAgentMessage {
  header: {
    title: string;           // deal name
    subtitle?: string;       // agent name
    sentiment: 'green' | 'yellow' | 'red';
    url?: string;            // deep link
  };
  sections: Array<{
    title?: string;
    bullets: string[];       // plain text; citations as footnote indices
  }>;
  actions: Array<{
    id: 'approve' | 'reject' | 'view_deal' | 'edit_in_app';
    label: string;
    url?: string;
    style: 'primary' | 'destructive' | 'default';
    signedPayload?: string;
  }>;
  footer?: {
    citationCount: number;
    dealUrl: string;
    expiryLabel?: string;
  };
}
```

### 4.2 Element mapping table

| Canonical element | Slack Block Kit | Microsoft Teams Adaptive Card | Google Chat Cards v2 |
|-------------------|-----------------|--------------------------------|----------------------|
| **Header title** | `header` block plain_text | `TextBlock` `size: Large`, `weight: Bolder` | `decoratedText` top label or `header` widget |
| **Header subtitle** | `context` block | `TextBlock` `isSubtle: true` | `textParagraph` subtle |
| **Sentiment** | `context` with emoji 🟢🟡🔴 + text label | `ColumnSet` dot image + `TextBlock` "On track" | `decoratedText` with `icon` or text label |
| **Section title** | `section` `text` `type: mrkdwn` `*Title*` | `TextBlock` `weight: Bolder` | `textParagraph` `<b>Title</b>` |
| **Bullet item** | `section` `fields` or mrkdwn `• item` | `TextBlock` `wrap: true` with `•` prefix | `textParagraph` |
| **Citation footnote** | mrkdwn `• item [1]` | `TextBlock` `• item <sup>1</sup>` (plain) | footnote in text `[1]` |
| **Divider** | `divider` | `separator` | `divider` widget |
| **Approve button** | `actions` `button` `style: primary` `action_id: approve` | `Action.Submit` `style: positive` | `buttonList` `filled` |
| **Reject button** | `actions` `button` `style: danger` | `Action.Submit` `style: destructive` | `buttonList` `outlined` destructive color |
| **View in app** | `actions` `button` `url` link | `Action.OpenUrl` | `buttonList` `link` |
| **Edit in app** | `actions` `button` `url` | `Action.OpenUrl` | `buttonList` `link` |
| **Footer citations** | `context` `"3 sources · View deal"` | `TextBlock` `size: Small` `isSubtle` | `textParagraph` |
| **Fallback text** | `text` field on message | `summary` + body text | `text` top-level |
| **Thread reply** | `thread_ts` | `replyToId` | `thread` name |
| **Update message** | `chat.update` | `activity.update` | `messages.patch` |

### 4.3 Sentiment accessibility rule

**Never rely on emoji alone.** Always pair:

| Sentiment | Emoji (optional) | Required text label |
|-----------|------------------|---------------------|
| green | 🟢 | On track |
| yellow | 🟡 | At risk |
| red | 🔴 | Needs attention |

### 4.4 Action button labels (consistent)

| Action | Label | Style |
|--------|-------|-------|
| approve | Approve | primary / positive |
| reject | Reject | destructive |
| view_deal | View deal | default link |
| edit_in_app | Edit in app | default link |

### 4.5 Message type templates

#### Deal Focus (daily)

- Header: "Today's focus" (no deal sentiment in header)
- Sections: one per deal — `{name} — {reason}`
- Actions: each deal → `View deal` link button row (max 5 deals)
- Footer: "View all in app"

#### Approval request

- Header: deal name + sentiment
- Sections: agent output preview (max 3 bullets)
- Actions: Approve | Reject | Edit in app
- Footer: citation count + expiry

#### Risk alert

- Header: deal name + red sentiment
- Sections: risk summary bullets
- Actions: View deal | Snooze (P2, app only)

### 4.6 Preview component

`CanonicalChatPreview` in app switches tabs: Slack | Teams | Google Chat — renders facsimile using same CSS tokens (not provider SDK in browser).

---

## 5. Domain component specs

### 5.1 Kanban pipeline

**Route:** `/deals?view=board`

#### Toolbar

| Slot | Component | Behavior |
|------|-----------|----------|
| Left | Title + `toggle-group` | Board \| List |
| Center | `select` saved views | URL sync |
| Right | Search `input` debounce 300ms + `button` New deal |

#### Column header

```
{font-medium text-sm} {stage name}
{text-xs text-muted-foreground} {count} deals · ${formatted total} / ${weighted total}
```

#### Deal card anatomy

| Row | Content | Token |
|-----|---------|-------|
| 1 | Logo 24px + company name + `BlockerBadge` | flex justify-between |
| 2 | Deal value `tabular-nums font-semibold` | |
| 3 | Owner avatar + name | `text-sm` |
| 4 | SE avatar + name | `text-sm text-muted-foreground` |
| 5 | `SentimentBadge` + `FitScore` label | flex gap-2 |
| 6 | Optional progress bar | `bg-primary` height 4px |

**Interaction:**

- DnD: `@dnd-kit/core` + `@dnd-kit/sortable`
- Drag overlay: `scale-105 shadow-lg ring-2 ring-primary`
- Optimistic move → rollback toast on error
- Keyboard: focus card → `MoveStageMenu` or `M` hotkey
- Click → `/deals/{id}`

#### List view

`DealsTable` columns: Company, Value, Stage, Owner, Sentiment, Fit, Blockers, Updated

#### Filters (URL params)

`sentiment`, `owner`, `stage`, `pipeline`, `q`, `valueMin`, `valueMax`

#### Empty state

Illustration + "No deals yet" + `button` Create deal + secondary Connect CRM if onboarding incomplete

---

### 5.2 Deal detail

**Route:** `/deals/[dealId]?tab=overview`

#### Header

- Back → `/deals`
- Logo 32px + title `text-xl font-semibold tracking-tight`
- CRM badge (HubSpot/etc.)
- `DealTabBar` — 12 tabs, scroll on mobile

#### KPI strip (`DealMetricsBar`)

| Card | Typography | Accent |
|------|------------|--------|
| Deal Value | `text-2xl font-bold tabular-nums` | — |
| Weighted Value | same | — |
| Win Probability | same | orange dot if ↓ |
| Plan Confidence | value + thin `progress` | purple |
| Blockers | `text-destructive` | red |
| Important | `text-success` | green |

Mobile: horizontal scroll; Desktop: single row 6 equal columns

#### Process stepper

Stages: On Deck → Success Planning → Technical Validation → Business Outcomes → Tech Win

| State | Visual |
|-------|--------|
| completed | filled purple circle + check |
| active | purple ring + `(6/12)` label |
| future | gray outline circle |

#### Overview tab layout

| Column | Width | Content |
|--------|-------|---------|
| Left | `w-64` | Metadata collapsibles |
| Center | `flex-1` | `MeddpiccSummary` |
| Right | `w-72` | Recent tasks (5) + link |

Mobile stack order: summary → metadata → tasks

#### Integrations panel (overview)

`DealChannelLinker` — provider select, channel combobox, Link/Validate, ingest toggle

---

### 5.3 Settings

#### Information architecture

```
/settings
├── General
├── Members
├── Sales process
├── Integrations/
│   ├── (grid) CRM · Chat · Calls · Calendar · PM
│   └── chat/          → workspace chat connections
├── notifications/
│   └── chat/          → user delivery prefs
└── agents/
    ├── prompts
    ├── skills
    └── credits
```

#### Integration category grid

5 categories × N cards. Each `IntegrationCard`:

```
[provider logo 32px]  HubSpot     [Enabled badge]
Sync evaluation details with your deals.
[Configure] or [Connect]
```

States: `disconnected` | `pending` (spinner) | `enabled` (green badge) | `error` (red + Reconnect)

#### Chat settings (admin) — `/settings/integrations/chat`

- Row of connected providers with checkmarks
- Connect buttons per provider → OAuth popup flow
- Toggles: Allow chat commands · Require app login for approve

#### Chat notifications (user) — `/settings/notifications/chat`

Form spec matches `chat-channels.md` §7.2:

- Primary platform `select`
- Delivery mode radio: DM | Channel | Both
- Channel/user picker (conditional)
- Event checkboxes: Deal Focus, Approvals, Risk, Digest
- Interact from chat `switch` + Verify identity link

#### Members / Sales process

Standard `table` + `dialog` invite; sales process read-only in MVP with stage list

---

### 5.4 Onboarding wizard

**Route:** `/onboarding` — forced until complete

#### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]                              Step 2 of 5              │
│ ████████░░░░░░░░░░░░  Progress                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Step content (max-w-2xl mx-auto)                           │
│                                                              │
│   [← Back]                              [Continue →]          │
└──────────────────────────────────────────────────────────────┘
```

#### Steps

| # | Title | Component | Validation |
|---|-------|-----------|------------|
| 1 | Pick your CRM | `CrmProviderPicker` | provider required |
| 2 | Connect | `CrmOAuthConnect` | connection enabled |
| 3 | Map stages | `StageMappingTable` | all required stages mapped |
| 4 | Map users | `UserMappingTable` | skippable |
| 5 | Import deals | `ImportProgress` | sync complete or partial OK |
| 6 (opt) | Connect chat | `ChatConnectOptional` | skippable |

#### Provider-specific UI

| Provider | Extra UI |
|----------|----------|
| Pipedrive | Pipeline dropdown before stage map |
| Zoho | Region US/EU confirm |
| Salesforce | Sandbox vs production toggle |

#### UX rules

- Back preserves form state (Zustand or URL step param)
- Step 3 fuzzy auto-map with purple highlight on suggestions
- Step 5 live count via poll/SSE; failure → retry + support mailto
- Target completion: <10 min for ≤500 deals
- On complete → redirect `/deals` + confetti optional (subtle)

#### Optional step 6 (post-CRM or inline)

Non-blocking banner on `/deals` if skipped: "Connect Slack for daily deal focus"

---

## 6. Motion tokens

Unified motion system for app + marketing. Respect `prefers-reduced-motion: reduce`.

### 6.1 Duration tokens

| Token | ms | Use |
|-------|-----|-----|
| `--duration-instant` | 0 | Reduced motion fallback |
| `--duration-fast` | 150 | Checkmarks, micro feedback |
| `--duration-normal` | 200 | Modals, dropdowns, sidebar |
| `--duration-moderate` | 300 | Section reveal, DnD settle, wizard step |
| `--duration-slow` | 500 | Marketing section fade-in |
| `--duration-slower` | 1500 | Stat counter tween |
| `--duration-marquee` | 30000 | Capability marquee loop |

### 6.2 Easing tokens

| Token | CSS | Use |
|-------|-----|-----|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General UI |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Sidebar width |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Optional celebratory |
| `--ease-linear` | `linear` | Marquee |

Framer Motion mapping: `easeOut` → `[0, 0, 0.2, 1]`

### 6.3 Animation recipes

| Element | Properties | Duration | Easing | Stagger |
|---------|------------|----------|--------|---------|
| Modal open | opacity 0→1, scale 0.95→1 | `--duration-normal` | `--ease-out` | — |
| Sheet slide | translateX | `--duration-normal` | `--ease-out` | — |
| Toast enter | opacity, y | `--duration-fast` | `--ease-out` | — |
| Card drag lift | scale 1→1.05 | `--duration-fast` | `--ease-out` | — |
| MEDDPICC section | opacity, y 8px | `--duration-moderate` | `--ease-out` | 100ms |
| Step checkmark | scale 0→1 | `--duration-fast` | `--ease-bounce` | — |
| Sidebar collapse | width | `--duration-normal` | `--ease-in-out` | — |
| Stat counter | number tween | `--duration-slower` | `--ease-out` | — |
| Marquee | translateX loop | `--duration-marquee` | `--ease-linear` | — |
| Word swap headline | opacity, y | `--duration-moderate` | `--ease-out` | 3000ms interval |
| Pricing wizard step | layout (Framer) | `--duration-moderate` | `--ease-default` | — |
| Skeleton pulse | opacity | 1500ms | `--ease-in-out` | — |

### 6.4 Reduced motion behavior

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: var(--duration-instant) !important;
    transition-duration: var(--duration-instant) !important;
  }
}
```

| Feature | Reduced behavior |
|---------|------------------|
| Stat counters | Show final value immediately |
| Marquee | Static wrapped pills |
| Word swap | Show first phrase only |
| MEDDPICC stream | Sections appear without stagger |
| Gradient parallax | Disable `background-attachment: fixed` |

### 6.5 Tailwind animate utilities

Map in `@theme`: `animate-fade-in`, `animate-fade-in-up`, `animate-scale-in` — align with shadcn `tailwindcss-animate` plugin.

---

## 7. Accessibility requirements

Global baseline: WCAG 2.1 AA. Target AAA for color contrast on primary text.

### 7.1 Global

| Requirement | Implementation |
|-------------|----------------|
| Focus visible | `ring-2 ring-ring ring-offset-2` on all interactive |
| Skip link | "Skip to main content" first in `(dashboard)` layout |
| Language | `<html lang="en">` |
| Page title | Unique per route |
| Color + text | Sentiment, status, confidence always include text label |
| Touch targets | Minimum 44×44px mobile |
| Motion | `prefers-reduced-motion` (§6.4) |
| Live regions | SSE: `aria-live="polite"` on loading steps and toast alternatives |

### 7.2 Per-component checklist

| Component | Keyboard | Screen reader | Color | Notes |
|-----------|----------|---------------|-------|-------|
| `button` | Enter/Space | name from text or `aria-label` | 4.5:1 | Icon-only requires label |
| `input` / `textarea` | standard | `<label htmlFor>` or `aria-labelledby` | — | Error: `aria-invalid` + `aria-describedby` |
| `select` | arrows, typeahead | label + value | — | |
| `checkbox` / `switch` | Space | role + checked state | don't use color alone | |
| `dialog` / `sheet` | Escape close, focus trap | `aria-modal`, title | — | Return focus on close |
| `dropdown-menu` | arrows, typeahead | menuitem roles | — | |
| `tabs` | arrow keys | `aria-selected` | active tab 3:1 contrast | Deal tab bar scrollable with arrows |
| `tooltip` | not focus-only content | optional `aria-describedby` | — | Never hide critical info in tooltip only |
| `toast` | dismiss button | `role="status"` or `alert` | — | Error toasts persist |
| `table` | — | `<th scope="col">` | — | Sortable: `aria-sort` |
| `KanbanBoard` | tab to card; `MoveStageMenu` | announce stage on move | sentiment text labels | DnD is pointer-enhancement; not sole path |
| `DealCard` | Enter opens deal; Menu key actions | company name as link text | — | |
| `SentimentBadge` | — | "Sentiment: At risk" | dot + text | |
| `FitScore` | — | "Technical fit: 3 of 5, OK" | dots + text label | |
| `MeddpiccSummary` | Refresh button focus | live region during stream | — | Lock toggle: "Lock Metrics section" |
| `CitationDot` | Enter opens sheet | "View citation 1" | — | 44px touch target |
| `LoadingStepsList` | — | `aria-live="polite"` | — | |
| `ApprovalDetailSheet` | trap focus | announce approve result | — | Destructive confirm for reject |
| `AgentRunTimeline` | expand step Enter | status text | failed = icon + text | |
| `IntegrationCard` | Connect button | status in text not badge alone | enabled/disabled text | |
| `OAuthConnectButton` | — | announce polling status | — | |
| `OnboardingProgress` | — | "Step 2 of 5, Connect CRM" | progressbar role | |
| `StageMappingTable` | table nav | map labels read row | suggest highlight not sole indicator | |
| `StatCounter` | — | final value in DOM for SSR | — | Reduced motion: no animation |
| `CapabilityMarquee` | — | `aria-hidden` on decorative loop OR pause button | — | Prefer pause control |
| `MarketingHeader` | Escape closes mega-menu | menubar pattern | — | Mobile drawer focus trap |
| `PricingWizard` | radio arrow keys | step announced on change | selected border + aria-checked | |
| `CanonicalChatPreview` | — | mirrors provider accessible names | — | |
| Charts | — | data table fallback link | patterns distinguishable + legend | Recharts: title element |

### 7.3 Chat-specific a11y

- Plain-text fallback on every outbound message
- Sentiment text label (§4.3)
- Button actions have descriptive labels ("Approve follow-up for DocuSign" not "OK")
- Link buttons include deal name in `aria-label` where truncated

---

## 8. Dark mode token plan

**Phase:** App dark mode in Phase 2 (post-MVP). Marketing site remains **light-only** unless brand requests otherwise.

### 8.1 Strategy

- Class strategy: `class="dark"` on `<html>` (next-themes)
- Sync with system: default `system`; user override in Settings → General
- Charts: use same hue tokens; reduce saturation 10% for bars
- Images/logos: no change; provider logos on `bg-card`
- Elevation: replace shadows with lighter borders (`--border` brighten)

### 8.2 Dark semantic tokens

```css
.dark {
  --background: 222 47% 11%;        /* #0F172A */
  --foreground: 210 40% 98%;
  --card: 217 33% 17%;              /* #1E293B */
  --card-foreground: 210 40% 98%;
  --popover: 217 33% 17%;
  --popover-foreground: 210 40% 98%;

  --primary: 262 83% 70%;           /* #A78BFA — lighter for contrast */
  --primary-foreground: 262 60% 15%;
  --primary-hover: 262 83% 75%;
  --secondary: 217 33% 22%;
  --secondary-foreground: 210 40% 98%;
  --accent: 262 40% 20%;
  --accent-foreground: 262 83% 80%;

  --muted: 217 33% 22%;
  --muted-foreground: 215 20% 65%;
  --destructive: 0 62% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 217 25% 28%;            /* #334155 */
  --input: 217 25% 28%;
  --ring: 262 83% 70%;

  /* Sentiment — slightly desaturated backgrounds */
  --sentiment-green-bg: 142 40% 15%;
  --sentiment-yellow-bg: 38 40% 15%;
  --sentiment-red-bg: 0 40% 15%;

  --ai-surface: 262 30% 18%;
  --ai-border: 262 83% 70%;
  --ai-glow: 262 40% 25%;

  /* Activity colors — unchanged hues, lower opacity fills in charts */
}
```

### 8.3 Component adjustments (dark)

| Component | Light | Dark |
|-----------|-------|------|
| Deal card | white bg | `--card` |
| Kanban column | muted header | `--muted` bg |
| Sentiment badge | pastel bg | deep bg tokens above |
| AI summary card | purple-50 tint | `--ai-surface` |
| Drag overlay | shadow-lg | ring-primary + border |
| Marketing | N/A | force light theme in `(marketing)` layout |

### 8.4 Implementation checklist

- [ ] Add `ThemeProvider` in `(dashboard)` layout only
- [ ] Persist preference `localStorage` + user settings API (P2)
- [ ] Test contrast: primary button, sentiment badges, chart lines
- [ ] Snapshot tests for Kanban + MEDDPICC in dark
- [ ] shadcn components inherit automatically via CSS variables
- [ ] Prevent flash: `suppressHydrationWarning` on html

---

## 9. File structure

### 9.1 Directory layout

```
apps/web/
├── app/
│   ├── globals.css                 # Primitive + semantic tokens
│   ├── (marketing)/                # Light theme enforced
│   ├── (dashboard)/                # App shell + dark mode
│   ├── (auth)/
│   └── onboarding/
├── components/
│   ├── ui/                         # shadcn primitives ONLY — no business logic
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── app/                        # Authenticated product UI
│   │   ├── layout/
│   │   ├── deals/
│   │   ├── ai/
│   │   ├── agents/                 # Dashboard, wizard, runs, approvals pages
│   │   ├── approvals/
│   │   ├── settings/
│   │   ├── onboarding/
│   │   ├── charts/
│   │   └── home/
│   ├── marketing/                  # Public site — no imports from app/
│   │   ├── hero-section.tsx
│   │   ├── pricing-wizard.tsx
│   │   └── ...
│   └── agents/                     # Portable agent output presentation
│       ├── agent-output-block.tsx
│       ├── agent-action-bar.tsx
│       ├── canonical-chat-preview.tsx
│       └── adapters/               # Optional: slack-preview.tsx, etc.
├── hooks/
├── lib/
│   ├── tokens.ts                   # TS exports for charts, non-CSS consumers
│   └── brand.ts
└── stores/
```

### 9.2 Import rules

| From → To | Allowed |
|-----------|---------|
| `app/*` → `ui/*` | ✅ |
| `app/*` → `agents/*` | ✅ |
| `marketing/*` → `ui/*` | ✅ |
| `marketing/*` → `app/*` | ❌ |
| `ui/*` → `app/*` | ❌ |
| `agents/*` → `app/*` | ❌ |
| `packages/integrations` → `agents/*` | ✅ (chat adapters use canonical types) |

### 9.3 Naming conventions

- Files: kebab-case (`deal-card.tsx`)
- Components: PascalCase
- Variants: CVA in same file as component
- Tests: colocate `*.test.tsx` or `__tests__/` adjacent
- Stories (optional): `*.stories.tsx` under same folder

### 9.4 Migration from `design.md` paths

| Old path (`design.md`) | New path |
|------------------------|----------|
| `components/deals/*` | `components/app/deals/*` |
| `components/ai/*` | `components/app/ai/*` |
| `components/agents/template-card.tsx` | `components/app/agents/agent-template-card.tsx` |
| `components/approvals/*` | `components/app/approvals/*` |
| `components/settings/*` | `components/app/settings/*` |
| `components/layout/*` | `components/app/layout/*` |
| `components/charts/*` | `components/app/charts/*` |
| `components/marketing/*` | unchanged |

---

## 10. Gaps in `design.md`

The following must be added to `design.md` or consolidated here (this doc is canonical going forward):

### 10.1 Token & theming gaps

| Gap | Resolution in this doc |
|-----|------------------------|
| No three-tier token model | §1 primitive → semantic → component |
| Colors listed once without `--primary-hover`, sentiment bg tokens | §1.2 full semantic set |
| No z-index scale | §1.1.6 |
| No shadow tokens | §1.1.5 |
| Dark mode "Phase 2" mentioned in branding only | §8 full plan |
| `--accent` usage ambiguous between marketing and app | §1.2 matrix |
| Chart colors not wired as tokens in design.md | §1.2 `--activity-*` |

### 10.2 Component gaps

| Gap | Resolution |
|-----|------------|
| shadcn list incomplete (missing sidebar, data-table, chart, breadcrumb, alert-dialog, navigation-menu) | §2.1 |
| No `components/app` vs `ui` separation | §9 |
| Custom components listed without variants/states | §2.2, §5 |
| No onboarding wizard wireframes in design.md | §5.4 (staff-review flagged) |
| No settings/chat notification form spec | §5.3 |
| No home dashboard components | §2.2 Home |
| No command palette spec beyond mention | §2.1 `command` + frontend-flow §7 |
| Agent portable components mixed with dashboard | §2.4 split |

### 10.3 Agent & AI gaps

| Gap | Resolution |
|-----|------------|
| Loading steps listed without ARIA/live region rules | §3.1, §7 |
| Citation UI minimal | §3.2 full sheet spec |
| Approvals detail sheet not wireframed | §3.3 |
| Agent run timeline step states incomplete | §3.4 |
| No confidence indicator spec | §3.5 |
| Lock toggle for MEDDPICC mentioned in PRD not design.md | §3.5, §5.2 |

### 10.4 Chat & integrations gaps

| Gap | Resolution |
|-----|------------|
| No Block Kit / Adaptive Card / Google Chat mapping | §4 |
| Chat settings UI referenced externally only | §5.3 |
| Deal channel linker not in design.md | §5.2 |
| Canonical message preview component missing | §2.4, §4.6 |

### 10.5 Motion gaps

| Gap | Resolution |
|-----|------------|
| Motion section ad-hoc durations | §6 unified tokens |
| Marketing motion separate from app | §6 single system |
| No reduced-motion table | §6.4 |

### 10.6 Accessibility gaps

| Gap | Resolution |
|-----|------------|
| Only 5 bullet points in design.md | §7 per-component matrix |
| Kanban keyboard mentioned once | §7.2 expanded |
| Chat accessibility not covered | §7.3 |

### 10.7 Layout & responsive gaps

| Gap | Resolution |
|-----|------------|
| Deal detail 12 tabs — no lazy-load UX | §5.2 |
| No list view spec for deals | §5.1 |
| KPI strip responsive detail incomplete | §5.2 |
| Marketing/app header height inconsistency (h-14 vs h-16) | §1.1.7 documented as intentional |

### 10.8 Documentation process

| Action | Owner |
|--------|-------|
| Mark `design-system.md` as canonical for tokens/components | Docs |
| Trim `design.md` to principles + links to this file | Docs |
| Add Figma/token export JSON (optional P2) | Design |
| Storybook with all §2 components (P2) | Eng |

---

## Appendix A — Quick reference CSS (copy-paste)

See §1.2 for full `:root` block. Import in `apps/web/app/globals.css`:

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans antialiased; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}
```

## Appendix B — Icon map (Lucide)

| Concept | Icon | Size context |
|---------|------|--------------|
| Deals | `LayoutGrid` | nav 20px |
| Agents | `Bot` | nav 20px |
| Insights | `BarChart3` | nav 20px |
| Settings | `Settings` | nav 20px |
| Blocker | `AlertTriangle` | badge 16px |
| AI | `Sparkles` | button 16px |
| Citation | `Link2` | dot 12px |
| Approval | `CheckCircle` | list 20px |
| Refresh | `RefreshCw` | animate when loading |
| Lock field | `Lock` | section 16px |

**Marketing:** no Lucide chevrons on CTAs — use text `→` `↗` only.

## Appendix C — Related documents

| Document | Purpose |
|----------|---------|
| [`design.md`](design.md) | Legacy overview — link here for implementation |
| [`branding-guidelines.md`](branding-guidelines.md) | Voice, logo, competitive messaging |
| [`landing-page.md`](landing-page.md) | Marketing section copy & priorities |
| [`chat-channels.md`](chat-channels.md) | ChatConnector architecture & API |
| [`frontend-flow.md`](frontend-flow.md) | Routes, flows, state management |
| [`prd.md`](prd.md) | Functional requirements FR-001–FR-009 |

---

*End of design system specification v1.0*
