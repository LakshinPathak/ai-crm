# Code Review — Uncommitted Working Tree (R10 batch 1)

**Reviewer:** Senior code review pass (local, no third-party API)
**Scope:** All uncommitted changes on `main` as of 2026-09-11 (Salesforce OAuth scaffold, MCP settings stub, onboarding CRM sync polling, forecast insights stub, CI smoke expansion, deploy docs).
**Method:** `git diff` / `git diff --stat` against `origin/main`, full read of new files, `pnpm typecheck` baseline.

Files reviewed (19 changed + 4 new):
`oauth/handlers.ts`, `salesforce-oauth.ts` (new), `workspace-tokens.ts`, `integrations-crm/{handlers,index}.ts`, `settings/{handlers,index}.ts` (new), `schemas/mcp.ts` (new), `settings/mcp/page.tsx` (new), `settings/integrations/page.tsx`, `settings/page.tsx`, `onboarding/page.tsx`, `home/page.tsx`, `insights/{handlers,index}.ts`, `lib/types.ts`, `create-app.ts`, `routers.ts`, `scripts/smoke-test.ts`, `.github/workflows/ci.yml`, `.env.example`, `docs/deploy-beta.md`.

---

## Findings

### [Critical] `apps/web/app/(dashboard)/home/page.tsx:131-138` — Forecast fetch can break the entire home dashboard

```ts
Promise.all([
  apiGet<MeResponse>('/me', token),
  apiGet<HomeResponse>('/home', token),
  apiGet<ForecastInsightsResponse>('/insights/forecast', token),
]).then(([meData, homeData, forecastData]) => {
  setMe(meData);
  setHome(homeData);
  setForecast(forecastData);
});
```

**Problem:** `Promise.all` rejects as soon as *any* promise rejects. The new `/insights/forecast` call is a brand-new, low-value "demo stub" endpoint, but it now sits in the same failure domain as `/me` and `/home`. If that one call throws (network blip, transient 5xx, auth edge case, or the route being disabled per-workspace later), `me`/`home` are **never set**, and the entire dashboard is stuck on its loading state — for a feature that only adds three extra KPI cards. There's also no `.catch()`, so the rejection is unhandled.

**Fix:** Fetch forecast independently so its failure can't block the core page.

**Status: FIXED** — see diff below.

---

### [Warning] `apps/api/src/lib/integrations/salesforce-oauth.ts:78-115` — Salesforce access tokens are never proactively refreshed

```ts
return {
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
  instanceUrl: data.instance_url,
  externalAccountId: data.id ?? data.instance_url,
}; // exchangeSalesforceCode — no expiresAt
...
return {
  accessToken: data.access_token,
  refreshToken,
  expiresAt: undefined, // refreshSalesforceToken
};
```

**Problem:** Unlike `hubspot-oauth.ts` (which sets `expiresAt` from `expires_in`), Salesforce's OAuth response has no `expires_in` field, so `expiresAt` is always `undefined`/`null` on the stored connection. In `workspace-tokens.ts` → `refreshIfNeeded`:

```ts
const expiresAt = conn.tokenExpiresAt?.getTime();
const needsRefresh = expiresAt != null && expiresAt - bufferMs <= Date.now();
```

When `expiresAt` is `null`, `needsRefresh` is permanently `false`. The stored access token is used forever and is **never refreshed**, even if Salesforce revokes/rotates it — the app has no signal to trigger `refreshSalesforceToken` until a downstream call starts failing with 401, and there's no retry-on-401-then-refresh path anywhere in the CRM sync code.

**Fix:** Assign a conservative synthetic expiry (Salesforce access tokens are commonly session-based but rotate on refresh-token use); store e.g. now + 2h so the existing buffer-based refresh loop actually engages periodically instead of never.

**Status: FIXED** — see diff below.

---

### [Suggestion] `.github/workflows/ci.yml:82-93` — smoke job can leak the background API process on failure

```bash
pnpm --filter @ai-crm/api dev &
API_PID=$!
...
pnpm --filter @ai-crm/api smoke
kill "$API_PID" || true
```

**Problem:** GitHub Actions `run:` blocks default to `bash -eo pipefail`. If `pnpm --filter @ai-crm/api smoke` exits non-zero, the script aborts immediately and `kill "$API_PID"` on the last line never runs. Not deploy-breaking (the runner VM is destroyed after the job), but it means a failed smoke run leaves an orphaned process and no diagnostic step captures API logs for debugging.

**Fix (optional, not applied):** wrap in `trap 'kill "$API_PID" 2>/dev/null || true' EXIT` right after starting the process, and redirect the API's stdout/stderr to a log file that gets uploaded as a CI artifact on failure.

---

### [Suggestion] `apps/web/app/(dashboard)/settings/mcp/page.tsx:27-33` — local `McpServer` type duplicates the new shared schema

```ts
type McpServer = {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected';
};
```

**Problem:** `packages/shared/src/schemas/mcp.ts` was added in this same batch and exports `McpServer`/`McpServerStatus` via `@ai-crm/shared`, but the page redefines an identical shape locally instead of importing it. Harmless today, but the two will silently drift if the schema changes (e.g., adding a `lastConnectedAt` field) and nobody remembers to update the page type.

**Fix (not applied — cosmetic, low risk):** `import type { McpServer } from '@ai-crm/shared';` and drop the local type.

---

### [Suggestion] `apps/api/src/modules/integrations-crm/handlers.ts:69-77` — `crmProviderCatalog()` rebuilds a new array on every call

**Problem:** Converting the module-level `PROVIDERS` constant into a `crmProviderCatalog()` factory function (presumably to avoid shared-mutation risk across requests) means every `listProviders`, `connectProvider`, `listCrmPipelines`, `listCrmStages`, `listCrmOwners` call now allocates a new array + 4 objects. Negligible at current scale (4 static entries, no closure state), but if this pattern is copied elsewhere for larger catalogs it will matter.

**Fix:** Not applied — purely stylistic at this size; revert to a frozen module-level constant (`Object.freeze(PROVIDERS)`) if defensive-copy was the intent, which is cheaper.

---

## CI/CD Build & Deploy Readiness

- `pnpm typecheck` (workspace-wide, all 6 packages) — **PASS**, run at HEAD of the working tree before and after fixes.
- `.github/workflows/ci.yml` new `smoke` job: statically reviewed (see Suggestion above); not executed here (would require a live Mongo instance + full API boot, out of scope for this pass — flagged as `NOT RUN` for local verification, static review only).
- No changes to `Dockerfile` / deploy manifests in this diff.

**CI/CD build check: PASS (`pnpm typecheck`, static review of `ci.yml`)**

## Summary

This batch adds a Salesforce OAuth scaffold, an MCP settings stub, real onboarding sync-progress polling (replacing a fake timer), a forecast KPI stub on the home dashboard, and CI smoke-test/deploy-doc improvements. The change set is well-scoped and typechecks cleanly. One **Critical** issue (new forecast fetch could hang/break the whole home page on failure) and one **Warning** (Salesforce tokens never proactively refresh) were found and fixed in this pass; two **Suggestions** are left as-is (low risk, documented above for later cleanup).

**Findings:** 1 Critical (fixed) · 1 Warning (fixed) · 2 Suggestions (not applied)

**Verdict:** Approve with comments — Critical/Warning fixed inline; Suggestions tracked for later, non-blocking.
