# shadcn/ui Migration Plan — `apps/web`

**Audit date:** 2026-09-09  
**Canonical reference:** [`design-system.md`](design-system.md) §2  
**Status:** ✅ Installed 43 shadcn primitives; major pages migrated (2026-09-09)

## Summary

| Metric | Count |
|--------|------:|
| Current custom `components/ui/` files | **15** |
| shadcn components in design-system §2 | **44** |
| Custom → shadcn replacements | **11** |
| Domain wrappers to keep | **4** |

## Priority tiers

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

See full page mappings and migration notes in the explore agent audit (conversation 2026-09-09).
