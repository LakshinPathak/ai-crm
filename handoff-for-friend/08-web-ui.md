# 08 — Web UI (Next.js App Router)

Product UI lives in `apps/web`. It is a Next.js App Router app (default port **3000**) that talks to the Express API at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) via `apps/web/lib/api-client.ts` (`/api/v1/...`, Bearer + cookie refresh).

Root layout: `apps/web/app/layout.tsx` (Geist font, `ThemeProvider`, tooltip). Config: `apps/web/next.config.ts`, shadcn: `apps/web/components.json` (style `radix-nova`, Tailwind CSS variables, Lucide).

---

## Route groups

| Group | Path | Role |
|-------|------|------|
| `(marketing)` | `apps/web/app/(marketing)/` | Public site. Layout `apps/web/app/(marketing)/layout.tsx` is a passthrough; chrome is in `MarketingShell`. |
| `(auth)` | `apps/web/app/(auth)/` | Sign-in / sign-up. |
| `(dashboard)` | `apps/web/app/(dashboard)/` | Authenticated product. Layout wraps every page in `AuthGuard` + `DashboardShell` + Sonner toaster (`apps/web/app/(dashboard)/layout.tsx`). |
| (root) | `apps/web/app/onboarding/page.tsx` | CRM connect + stage/user maps (not inside dashboard layout). |
| (root) | `apps/web/app/auth/callback/page.tsx` | OAuth return into the web app. |

`AuthGuard` (`apps/web/components/AuthGuard.tsx`) requires a session, a workspace, and `onboardingCompletedAt`; otherwise it sends the user to `/sign-in` or `/onboarding`.

Sidebar navigation is defined in `apps/web/components/DashboardShell.tsx` (`MAIN_NAV`, Agents subnav, Insights).

---

## Dashboard routes

### `/home` — `apps/web/app/(dashboard)/home/page.tsx`

SE workbench. Loads `GET /home` plus forecast insights. KPI cards (`KpiCard`), hot/recent deals (`DealKanbanCard`), activity, pending-approval alert. This is the post-login default (`BrandLogo` href `/home`).

### `/deals` — `apps/web/app/(dashboard)/deals/page.tsx`

Pipeline. `GET /deals/board` + metrics + search. Toggle **kanban** vs **table**:

- Kanban: `apps/web/components/deals/DealKanbanBoard.tsx` + `apps/web/components/ui/DealKanbanCard.tsx` (HTML5 drag; `PATCH` stage/position).
- Table: `apps/web/components/DealTable.tsx`.
- Create: `apps/web/components/CreateDealModal.tsx`.

Filters: owner, sentiment, hot, closed-stage visibility. Search combobox jumps to `/deals/[dealId]`.

### `/deals/[dealId]` — `apps/web/app/(dashboard)/deals/[dealId]/page.tsx`

Deal workspace. Header from `GET /deals/:id/overview-header` (title, amount, stage, win %, MEDDPICC completeness, sentiment, hot, blockers). Won / lost / delete dialogs. Active tab is the `?tab=` query (`isDealTabId` / `DEFAULT_DEAL_TAB`).

### `/accounts` — `apps/web/app/(dashboard)/accounts/page.tsx`

Company list (`GET /companies`). Search, `CreateAccountModal`, table → `/accounts/[accountId]`.

### `/accounts/[accountId]` — `apps/web/app/(dashboard)/accounts/[accountId]/page.tsx`

Account detail + linked deals.

### `/projects` — `apps/web/app/(dashboard)/projects/page.tsx`

Workspace-wide deal projects (`DealProject` rows + deal title). Status `PATCH`. Per-deal projects also live on the deal **Projects** tab.

### `/requests` — `apps/web/app/(dashboard)/requests/page.tsx`

Team requests + product requests across deals. Status updates. Deal-scoped copies are deal tabs.

### `/agents` — `apps/web/app/(dashboard)/agents/page.tsx`

Agent dashboard: KPIs, list/table, NL draft, create/delete, run history. New/edit: `apps/web/app/(dashboard)/agents/new/page.tsx`. Detail: `apps/web/app/(dashboard)/agents/[agentId]/page.tsx`.

### `/approvals` — `apps/web/app/(dashboard)/approvals/page.tsx`

HITL queue. Approve/reject + proposed-change preview. Sidebar badge count from `GET /home` (`approvalCount`).

### `/insights` — `apps/web/app/(dashboard)/insights/page.tsx`

Leadership analytics tabs: performance, activity, funnel, loss, users. Data from `/insights/*`. Charts in `apps/web/components/analytics/` (`PerformanceDashboard`, `ActivityDashboard`, `FunnelDashboard`, `LossDashboard`, `UsersInsightsDashboard`, `Sparkline`, `chartAppearance.ts`).

### `/insights/sql` — `apps/web/app/(dashboard)/insights/sql/page.tsx`

Read-only SQL preview (`POST` insights SQL). Sample query against `workspace_overview`.

### `/settings` — `apps/web/app/(dashboard)/settings/page.tsx`

Workspace name (`PATCH /workspace`), profile, links to:

| Route | File |
|-------|------|
| `/settings/members` | `apps/web/app/(dashboard)/settings/members/page.tsx` |
| `/settings/sales-process` | `apps/web/app/(dashboard)/settings/sales-process/page.tsx` |
| `/settings/integrations` | `apps/web/app/(dashboard)/settings/integrations/page.tsx` |
| `/settings/mcp` | `apps/web/app/(dashboard)/settings/mcp/page.tsx` |

Integrations UI: CRM connect/sync, chat, Gong, Google Calendar (connect / sync / disconnect). Demo-mode badges when `status.mode === 'demo'`.

### `/calls` — `apps/web/app/(dashboard)/calls/page.tsx` (+ `[id]`)

Also in `MAIN_NAV`. Gong/call workspace. MEDDPICC citations on Overview link to `/calls/:callId`.

---

## Deal tabs

Tab IDs and labels: `apps/web/components/deals/deal-tabs.ts`.

| `tab` query | Label | Panel |
|-------------|-------|--------|
| `overview` (default) | Overview | `tabs/OverviewTab.tsx` — scores, MEDDPICC stream (`MeddpiccStreamLoader.tsx`), citations |
| `plan` | Plan | `tabs/PlanTab.tsx` |
| `activity` | Activity | `tabs/ActivityTab.tsx` |
| `events` | Events | `tabs/EventsTab.tsx` — `DealEvent` list (Google Calendar `source`) |
| `participants` | Participants | `tabs/ParticipantsTab.tsx` |
| `product-requests` | Product Requests | `tabs/ProductRequestsTab.tsx` |
| `team-requests` | Team Requests | `tabs/TeamRequestsTab.tsx` |
| `insights` | Insights | `tabs/InsightsTab.tsx` |
| `notes` | Notes | `tabs/NotesTab.tsx` |
| `tasks` | Tasks | `tabs/TasksTab.tsx` |
| `projects` | Projects | `tabs/ProjectsTab.tsx` |
| `file-center` | File Center | `tabs/FileCenterTab.tsx` |

Chrome:

- `DealTabBar.tsx` — primary tabs Overview / Plan / Activity / Insights; remaining tabs in a **More** dropdown.
- `DealTabPanels.tsx` — lazy `React.lazy` + `Suspense`; keeps visited tabs mounted (`display: none`) so switching back does not remount.
- `deal-badges.tsx` — outcome / hot / pastel sentiment badges.

`StubTab.tsx` is an empty-state helper, not a live tab.

URL pattern: `/deals/<id>?tab=events`.

---

## shadcn + Tailwind pastel

- Tokens: `apps/web/app/globals.css` — lavender canvas (`--background` oklch ~290), dusty violet primary, mint accent, pastel chart-1…5 (lilac / mint / peach / sky / rose), semantic `--green` / `--yellow` / `--red` washes, sidebar tokens, `--bg-mesh`.
- Light default, dark class variant; theme switcher in `DashboardShell` (`next-themes`, `apps/web/components/theme-provider.tsx`). `enableSystem={false}` in root layout.
- Primitives: `apps/web/components/ui/*` (Button, Card, Dialog, Sidebar, Tabs, Table, Command, Chart, …). Product wrappers: `PageHeader`, `KpiCard`, `EmptyState`, `DealKanbanCard`, `page-skeleton`.
- `apps/web/lib/utils.ts` (`cn`); some deal files still import `cn` from `'cn'` (same helper, different path).
- Brand: `apps/web/components/brand/BrandLogo.tsx`, `LogoMark.tsx`, `IntegrationLogo.tsx`.
- Design notes (not runtime): `codebase/docs/pastel-theme-plan.md`, `docs/shadcn-ui-plan.md`, `docs/design-system.md`.

---

## Marketing pages — connector honesty

**Canonical live vs demo copy** (keep this when editing marketing):

| Surface | File | What it says |
|---------|------|----------------|
| Hero badge + subtitle | `apps/web/components/marketing/LandingHero.tsx` | “HubSpot & Salesforce connectors live”; “Connect live HubSpot or Salesforce (**Pipedrive and Zoho are demo until OAuth ships**).” Rotating sources: Gong, Slack, HubSpot, Salesforce (not Pipedrive/Zoho). |
| Sticky strip | `apps/web/components/marketing/MarketingShell.tsx` | “Connect HubSpot or Salesforce in under 10 minutes.” |
| Why | `apps/web/components/marketing/WhyPage.tsx` | “live HubSpot + Salesforce” |
| Pricing | `apps/web/components/marketing/PricingPage.tsx` | “HubSpot and Salesforce live today · Pipedrive and Zoho in demo” |
| Product / landing supporting copy | `ProductPage.tsx`, `LandingPage.tsx` | “Start with HubSpot or demo data…” |

**Do not treat these as live-capability claims** without the hero caveat:

- `apps/web/lib/marketing-content.ts` still lists all four CRMs in `INTEGRATIONS.crm` and in several module strings (“auto-synced from HubSpot, Salesforce, Pipedrive, or Zoho”, “OAuth onboarding for HubSpot, Pipedrive, Zoho CRM, and Salesforce”). That catalog is logos + roadmap copy. `IntegrationsTabs.tsx` renders those logos without a live/demo badge.
- `apps/web/app/onboarding/page.tsx` offers HubSpot, Pipedrive, Zoho, Salesforce; Pipedrive/Zoho connect as **demo** (sample deals) unless live OAuth exists (it does not for those two — see `09-crm-integrations.md`).

Marketing routes:

| URL | File | Component |
|-----|------|-----------|
| `/` | `(marketing)/page.tsx` | `LandingPage` |
| `/why` | `(marketing)/why/page.tsx` | `WhyPage` |
| `/about` | `(marketing)/about/page.tsx` | `AboutPage` |
| `/pricing` | `(marketing)/pricing/page.tsx` | `PricingPage` |
| `/product` | `(marketing)/product/page.tsx` | `ProductPage` |
| `/product/[slug]` | `(marketing)/product/[slug]/page.tsx` | `ProductSectionPage` + `PRODUCT_SECTIONS` |
| `/blog`, `/blog/[slug]` | `(marketing)/blog/` | `BlogPage` / `BlogPostPage` |

Auth: `(auth)/sign-in/page.tsx`, `(auth)/sign-up/page.tsx` → `AuthCard` + Google (`lib/auth.ts`).

---

## Key components under `apps/web`

### App chrome

- `components/DashboardShell.tsx` — sidebar, breadcrumbs, workspace chip, theme, sign-out.
- `components/AuthGuard.tsx`
- `components/auth/AuthCard.tsx`, `AuthRedirectIfSignedIn.tsx`

### Deals

- `components/deals/deal-tabs.ts`, `DealTabBar.tsx`, `DealTabPanels.tsx`, `deal-badges.tsx`
- `components/deals/DealKanbanBoard.tsx`, `MeddpiccStreamLoader.tsx`
- `components/deals/tabs/*.tsx`
- `components/DealTable.tsx`, `CreateDealModal.tsx`, `CreateAccountModal.tsx`

### Marketing

- `components/marketing/LandingPage.tsx`, `LandingHero.tsx`, `MarketingShell.tsx`, `MarketingFooter.tsx`, `MarketingCta.tsx`
- `IntegrationsTabs.tsx`, `HeroVisual.tsx`, `ModulesTabs.tsx`, `PricingPage.tsx`, `WhyPage.tsx`, `AboutPage.tsx`, `BlogPage.tsx`, `ProductSectionPage.tsx`
- `animations/` — `ScrollReveal`, `RotatingText`, `AnimatedStats`
- `AgentDriftDemo.tsx`, `FeatureMarquee.tsx`, `LogoMarquee.tsx`, `TestimonialCarousel.tsx`

### Analytics / UI / lib

- `components/analytics/*`
- `components/ui/*` (shadcn + product)
- `lib/api-client.ts`, `lib/auth.ts`, `lib/types.ts`, `lib/marketing-content.ts`, `lib/format.ts`, `lib/colors.ts`, `lib/ui-badge.ts`

Playwright: `apps/web/e2e/` (`deals.spec.ts`, `deal-crud.spec.ts`, `deal-ask.spec.ts`, `agents.spec.ts`, `auth.spec.ts`, `blog.spec.ts`, …).

---

## Mental model

```
Browser  →  apps/web (App Router, client pages)
              AuthGuard + DashboardShell
              api-client → Express /api/v1
              Deal tabs via ?tab= + lazy panels
Public   →  (marketing)  — honest live = HubSpot + Salesforce
Onboard  →  /onboarding  — Pipedrive/Zoho demo path
```
