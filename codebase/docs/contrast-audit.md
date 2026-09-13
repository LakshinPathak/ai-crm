# Contrast audit (Playwright, 2026-09-13)

**Symptom:** Landing primary CTA is a purple pill with **invisible text** (`Connect your CRM free`, header `Start free`). Computed style: `color` and `background` both `oklch(0.58 0.14 300)` — **ratio 1**.

**Root cause:** Unlayered `a { color: var(--brand-primary) }` in `globals.css` overrides Tailwind `text-primary-foreground` on `<Button asChild><Link>`.

**Parent fix (done):** move `a` rules into `@layer base`; force `a[data-slot=button][data-variant=default]` to `--primary-foreground`; darken `--muted-foreground` to `oklch(0.38 0.04 290)`.

**Also low contrast (audit, transparent-bg ratios are noisy — still fix):**
- muted-foreground too light on lavender canvas
- outline/ghost links inherit primary color OK
- Hero visual labels (`Deal health` mint, `POC phases` peach) on white
- Badge `At risk` red-on-red/10
- Nav `text-muted-foreground`

**WCAG target:** 4.5:1 body, 3:1 large/UI. Primary buttons: near-white on dusty violet.
