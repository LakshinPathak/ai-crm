# UI cool pass — plan (2026-09-13)

Synthesized from five read-only reviews. **No API / route / copy rewrites.** shadcn + Tailwind only.

## Direction

Linear / Attio density: one design token system, restrained purple, clearer hierarchy, fewer competing CTAs, real data on cards (no fake “Deal owner” rows).

## P0 — must ship this pass

| Area | Change |
|------|--------|
| Tokens | Map `--bg` / `--surface` / `--text` to shadcn `--background` / `--card` / `--foreground`; dark `.dark` values for mesh + legacy vars |
| Shell | ThemeProvider + theme toggle in user menu; path breadcrumbs in `DashboardShell`; Help/Settings links |
| Home | Don’t show seven equal KPIs — one primary row + forecast as secondary |
| Marketing | Fix sticky announce+header offset; landing hero max 2 CTAs |
| Onboarding | shadcn Card shell, accessible steps, shadcn Select for mappings |
| Deals | Remove fake kanban people rows; AlertDialog for delete/won |
| Agents | Align Active vs enabled; list skeleton; Edit link to wizard |

## P1 — same pass if time

- `MarketingPageHero` for Why/About/Blog (stop cloning pricing hero)
- Pricing FAQ Accordion; blog prose
- Deal tab overflow in Dropdown/Sheet (keep `?tab=` ids)
- Deals search Command combobox
- Accounts detail breadcrumb like deals
- Approvals Sheet on desktop
- Analytics tables → shadcn Table where cheap
- EmptyState dashed icon well

## Out of scope

Marketing copy (`marketing-content.ts`), PricingWizard API, kanban drag/stage patch, deal tab lazy mount, new MCP protocol.
