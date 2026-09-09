# Responsive UI Plan — 5 Parallel Workstreams

**Date:** 2026-09-10  
**Status:** ✅ Shipped (R7.1)  
**Goal:** Make the entire AI CRM web UI responsive from 320px (mobile) through desktop.

## Breakpoints (Tailwind defaults)

| Token | Width |
|-------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

## Patterns to apply everywhere

1. **Page padding:** `px-4 py-4 sm:px-6 lg:px-8` (update `.page-content` in globals.css)
2. **Headers:** stack title/actions on mobile — `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
3. **Grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/4` — never fixed multi-column without breakpoint
4. **Tables:** wrap in `overflow-x-auto` or switch to card list on `<md`
5. **Toolbars:** `flex-wrap gap-2` — no horizontal overflow from fixed widths
6. **Fixed widths:** replace `w-[280px]` etc. with `w-full sm:w-[280px]` or `min-w-0 flex-1`
7. **Kanban:** horizontal scroll on mobile with `min-w-[280px]` columns
8. **Tabs:** `overflow-x-auto` with `flex-nowrap` (already on DealTabBar)
9. **Wizard layouts:** single column on mobile, sidebar steps collapse to horizontal stepper or top nav

## Workstreams

| WS | Scope |
|----|--------|
| WS-1 | App shell, globals.css, PageHeader, onboarding |
| WS-2 | Deals kanban, deal detail, all deal tabs |
| WS-3 | Home, accounts, projects, requests, calls |
| WS-4 | Agents, approvals, settings, integrations |
| WS-5 | Marketing site, auth, insights dashboards |

## Verification

```bash
cd codebase && pnpm typecheck
# Manual: resize browser 375px, 768px, 1280px on each major route
```
