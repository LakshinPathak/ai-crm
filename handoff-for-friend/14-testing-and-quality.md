# 14 — Testing and quality

All commands below assume you are in **`codebase/`** (the pnpm workspace), not the git root:

```bash
cd /path/to/ai-crm/codebase
```

There is no root-level Jest/Vitest suite. Quality is **TypeScript**, **API smoke**, and **Playwright E2E**. CI is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (runs with `working-directory: codebase`).

---

## 1. Typecheck

Workspace-wide `tsc --noEmit` across every package (`apps/api`, `apps/web`, `packages/db`, `packages/shared`, `packages/events`, `packages/integrations/crm`):

```bash
pnpm typecheck
```

Per package:

```bash
pnpm --filter @ai-crm/api typecheck
pnpm --filter @ai-crm/web typecheck
```

Fix type errors before chasing UI bugs. A green typecheck is the cheap gate before smoke/e2e.

---

## 2. API smoke

Script: [`apps/api/scripts/smoke-test.ts`](../codebase/apps/api/scripts/smoke-test.ts). It hits a **running** API (default `http://localhost:4000`).

**Prereqs:** MongoDB up (`pnpm docker:up` or Atlas), API running (`pnpm dev` or `pnpm dev:api`), `NODE_ENV=development` so `POST /api/v1/auth/dev-login` is enabled.

```bash
# API already running on :4000
cd apps/api && NODE_ENV=development pnpm smoke
# or from codebase/:
NODE_ENV=development pnpm --filter @ai-crm/api smoke
```

What it checks today:

| Check | Notes |
|-------|--------|
| `GET /health` | `{ status: "ok" }` |
| `POST /api/v1/auth/dev-login` | Creates/logs in `DEMO_USER_EMAIL` (default `smoke@ai-crm.test`); may create a workspace |
| `GET /api/v1/deals/board` | Authenticated board shape |
| Unsigned `POST /api/v1/agents/:id/webhook` | Expects **401** |

If `NODE_ENV` is not `development`, smoke skips dev-login (unless you set `SMOKE_TEST_TOKEN`) and skips the authenticated checks.

---

## 3. Playwright E2E

### How to run

From **`codebase/`**:

```bash
pnpm test:e2e
```

That is `pnpm --filter @ai-crm/web test:e2e` → `playwright test` inside `apps/web`.

First time on a machine:

```bash
cd apps/web
pnpm exec playwright install chromium
```

UI mode: `pnpm --filter @ai-crm/web test:e2e:ui`.

### If `pnpm dev` is already running

Playwright’s `webServer` will try to start **another** API (:4000) and web (:3000). Skip that:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 pnpm test:e2e
```

Keep Mongo + `pnpm dev` up (API **4000**, web **3000**). Auth uses `POST /api/v1/auth/dev-login` — no Google OAuth required.

### If nothing is running

Leave `PLAYWRIGHT_SKIP_WEBSERVER` unset. Config will boot API + web itself (see cwd below). Mongo must still be up.

### Known Playwright config cwd

Config file: [`apps/web/playwright.config.ts`](../codebase/apps/web/playwright.config.ts).

| Fact | Value |
|------|--------|
| `testDir` | `./e2e` **relative to `apps/web`** |
| Specs | `apps/web/e2e/*.spec.ts` (+ `helpers/auth.ts`) |
| `baseURL` | `PLAYWRIGHT_BASE_URL` or `http://localhost:3000` |
| Browser | Chromium only |
| `repoRoot` for `webServer` | `path.resolve(process.cwd(), '../..')` |

**`pnpm test:e2e` from `codebase/` is the supported path.** pnpm runs Playwright with cwd = `apps/web`, so `../..` is **`codebase/`** (the workspace root that has `pnpm --filter @ai-crm/api`). That is what `webServer.command` needs.

Do **not** run `playwright test` from `codebase/` itself. Then `process.cwd()` is `codebase/`, `../..` is the **git root** (`ai-crm/`), and `pnpm --filter @ai-crm/api dev` will not find the workspace.

Also do not run it from `apps/web` *and* expect `../..` to be the git root — it is `codebase/`, which is correct.

`PLAYWRIGHT_API_URL` (used in helpers) defaults to `http://localhost:4000`.

---

## 4. What E2E covers

Helpers: [`apps/web/e2e/helpers/auth.ts`](../codebase/apps/web/e2e/helpers/auth.ts) — `devLoginViaApi`, `ensureOnboardedUser` (workspace + `POST /onboarding/complete`), `setAuthToken` (`localStorage` key `ai_crm_token`).

| Spec | File | What it proves |
|------|------|----------------|
| **auth** | `e2e/auth.spec.ts` | Sign-in form → onboarding; API login + completed onboarding → `/home`; API login without workspace → `/deals` redirects to onboarding |
| **deals** | `e2e/deals.spec.ts` | Kanban heading + “Board view” + Qualification column; switch to table view |
| **agents** | `e2e/agents.spec.ts` | Template modal groups + link to wizard (`/agents/new?template=…`); NL “Generate” prefills wizard; `POST /agents/draft-from-nl` schema |
| **deal-crud** | `e2e/deal-crud.spec.ts` | Note PATCH, blocker create, `POST /ai/suggest-blocker`, home, approvals, **invite API** returns `/sign-in?invite=`, invalid deal 404; deal detail UI |
| **blog** | `e2e/blog.spec.ts` | Marketing `/blog` index + slug `/blog/unified-deal-context` (no login) |
| **deal-ask** | `e2e/deal-ask.spec.ts` | Deal Insights tab shows “Ask about this deal” panel |
| **webhook** | `e2e/agent-webhook.spec.ts` | Create agent, HMAC `x-agent-signature`, `POST /agents/:id/webhook` → **202** + run |

These are **smoke-level** flows, not full CRM/OAuth coverage. HubSpot, Salesforce, Slack, Calendar, and Google login are **not** in Playwright.

NL generate / `draft-from-nl` may need `GEMINI_API_KEY` in the API env or they will fail while the rest of the suite passes.

---

## 5. Suggested local loop

```bash
cd codebase
pnpm docker:up          # Mongo
cp .env.example .env    # then fill JWT_SECRET (32+ chars) — see 15-known-pitfalls.md
pnpm install
pnpm typecheck
pnpm dev                # API :4000 + web :3000
# other terminal:
cd apps/api && NODE_ENV=development pnpm smoke
cd ../../
PLAYWRIGHT_SKIP_WEBSERVER=1 pnpm test:e2e
```

Optional: `pnpm populate-demo` if you want a named demo workspace in the UI (E2E creates its own users).

---

## 6. CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. **build** — `pnpm typecheck` + `pnpm build`
2. **smoke** — Mongo 7 service, start API, `pnpm --filter @ai-crm/api smoke`
3. **e2e** — Mongo 7, `playwright install` in `codebase/apps/web`, `pnpm test:e2e` (Playwright starts API+web; no skip flag)

Local defaults in Playwright for missing secrets: `JWT_SECRET=ci-jwt-secret-for-e2e-tests-only` (only when webServer boots the processes). Your already-running `pnpm dev` uses **`codebase/.env`**.
