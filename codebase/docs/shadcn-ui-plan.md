# shadcn/ui Migration Plan — `apps/web`

**Audit date:** 2026-09-09  
**Canonical reference:** [`design-system.md`](design-system.md) §2  
**Status:** ✅ Complete — all 29 routes on shadcn/ui (2026-09-09)

## Summary

| Metric | Count |
|--------|------:|
| shadcn primitives installed | **43** |
| App routes migrated | **29/29** |
| Legacy UI components removed | **7** |

### Shared layout components

| Component | Used by |
|-----------|---------|
| `MarketingShell` | `/`, `/pricing`, `/product`, `/product/[slug]`, `/why` |
| `MarketingCta` | All marketing pages (bottom CTA) |
| `TrustSection` | Landing, pricing, why, product sections |
| `AuthCard` | `/sign-in`, `/sign-up` |
| `LinkButton` | shadcn `Button` wrapper (marketing legacy compat) |

### Removed legacy files

- `Modal.tsx`, `SearchInput.tsx`, `ToggleGroup.tsx` (PascalCase)
- `legacy-button.tsx`, `legacy-card.tsx`, `legacy-badge.tsx`, `name-avatar.tsx`

### Domain wrappers kept

`EmptyState`, `PageHeader`, `PageSkeleton`, `Toast`, `KpiCard`, `DealKanbanCard`, `LinkButton`, `user-avatar`, `Sparkline`

## Route coverage

| Area | Routes | shadcn components |
|------|--------|-------------------|
| Marketing | `/`, `/pricing`, `/product`, `/why`, `/product/[slug]` | Shell, Card, Badge, Tabs, Accordion, Carousel, Button |
| Auth | `/sign-in`, `/sign-up`, `/auth/callback` | Card, Button, Textarea |
| Onboarding | `/onboarding` | Input, Select, Progress, Badge, Button |
| Dashboard | `/home`, `/deals`, `/agents`, `/insights`, `/accounts`, `/settings/*`, etc. | Sidebar, Table, Dialog, ToggleGroup, Input, Card |
| Deal detail | `/deals/[dealId]` + 12 tab panels | Tabs, Input, Select, Textarea, Checkbox, Table, Badge |

## Priority tiers (reference)

| Tier | New installs | Cumulative |
|------|-------------:|-----------:|
| P0 Foundation | 10 | 10 |
| P1 Dashboard | 10 | 20 |
| P2 Deals | 16 | 36 |
| P3 Marketing | 6 | 42 |
| Future (MFA) | 2 | **44** |
