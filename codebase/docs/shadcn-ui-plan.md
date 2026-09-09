# shadcn/ui Migration Plan — `apps/web`

**Audit date:** 2026-09-09  
**Canonical reference:** [`design-system.md`](design-system.md) §2  
**Status:** ✅ Complete — all pages migrated; legacy UI components removed (2026-09-09)

## Summary

| Metric | Count |
|--------|------:|
| shadcn primitives installed | **43** |
| Custom `components/ui/` domain wrappers kept | **8** |
| Legacy components removed | **7** |

### Removed legacy files

- `Modal.tsx` → `dialog.tsx`
- `SearchInput.tsx` → `input.tsx` + search icon
- `ToggleGroup.tsx` (PascalCase) → `toggle-group.tsx`
- `legacy-button.tsx` → `button.tsx`
- `legacy-card.tsx` → `card.tsx`
- `legacy-badge.tsx` → `badge.tsx` + `lib/ui-badge.ts`
- `name-avatar.tsx` → `user-avatar.tsx`

### Domain wrappers kept

`EmptyState`, `PageHeader`, `PageSkeleton`, `Toast`, `KpiCard`, `DealKanbanCard`, `LinkButton`, `user-avatar`

## Migrated pages (batch 2)

| Area | Files |
|------|-------|
| Accounts | `accounts/page.tsx`, `accounts/[accountId]/page.tsx` |
| Insights | `insights/page.tsx` (Tabs, ToggleGroup, Checkbox) |
| Onboarding | `onboarding/page.tsx` (Input, Select, Progress, Badge) |
| Deal tabs | All 12 tab panels under `components/deals/tabs/` |
| Misc | `projects/page.tsx`, `auth/callback/page.tsx`, `PerformanceDashboard.tsx` |

## Priority tiers (reference)

| Tier | New installs | Cumulative |
|------|-------------:|-----------:|
| P0 Foundation | 10 | 10 |
| P1 Dashboard | 10 | 20 |
| P2 Deals | 16 | 36 |
| P3 Marketing | 6 | 42 |
| Future (MFA) | 2 | **44** |

### P0 — Foundation
`button`, `card`, `badge`, `avatar`, `input`, `label`, `skeleton`, `sonner`, `separator`, `dialog`

### P1 — Dashboard shell
`sidebar`, `dropdown-menu`, `tooltip`, `command`, `progress`, `alert`, `scroll-area`, `sheet`, `tabs`, `form`

### P2 — Deals & workflows
`toggle-group`, `select`, `checkbox`, `table`, `data-table`, `pagination`, `breadcrumb`, `popover`, `collapsible`, `hover-card`, `textarea`, `switch`, `alert-dialog`, `calendar`, `slider`, `chart`

### P3 — Marketing
`navigation-menu`, `drawer`, `aspect-ratio`, `carousel`, `radio-group`, `accordion`
