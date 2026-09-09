# Vibe Coding Patterns — AI-Assisted Development on AI CRM

**Version:** 1.0  
**Date:** 2026-09-09  
**For:** Cursor, Claude, `/dev-cycle` subagents

---

## 1. Repo map (where to put things)

```
codebase/
├── apps/api/src/
│   ├── modules/<domain>/     # HTTP handlers + routes
│   ├── lib/                  # Shared logic, queues, integrations
│   └── create-app.ts         # Route registration
├── apps/web/
│   ├── app/(dashboard)/      # Authenticated pages
│   ├── app/(marketing)/      # Public marketing
│   └── components/           # React components
├── packages/
│   ├── db/src/models/        # Mongoose schemas
│   ├── shared/src/schemas/   # Zod (API contracts)
│   └── integrations/         # CRM + chat adapters
└── docs/                     # Product + engineering docs
```

**Rule:** Business logic in `lib/` or `packages/`, not in route handlers (thin handlers).

---

## 2. Standard feature slice

When adding a feature (e.g. new insights endpoint):

| Step | Files |
|------|-------|
| 1. Zod schema | `packages/shared/src/schemas/` |
| 2. DB model (if new) | `packages/db/src/models/` + export in `index.ts` |
| 3. Handler | `apps/api/src/modules/<module>/handlers.ts` |
| 4. Route | `apps/api/src/modules/<module>/index.ts` |
| 5. Register | `create-app.ts` if new module |
| 6. Frontend | `apps/web/app/(dashboard)/...` + `components/` |
| 7. Docs | `docs/api-routes.md` + relevant `docs/future/` |

---

## 3. Prompt templates for subagents

### 3.1 New API endpoint

```
Add GET /api/v1/insights/meddpicc-completeness per docs/future/analytics-expansion.md §2.5.

Constraints:
- Thin handler in insights/handlers.ts
- Aggregation logic in lib/analytics.ts
- Zod response type in packages/shared if reused
- JWT auth via existing middleware
- workspaceId scoping on all queries
- pnpm --filter @ai-crm/api typecheck must pass
```

### 3.2 New agent executor

```
Implement champion-tracker executor per docs/future/custom-automations-guide.md §8.

Constraints:
- New file in agents/executors/
- Register in executor.ts switch
- Return AgentRunResult with creditsUsed
- Create Approval if external write needed
- Add template to TEMPLATES array
- Max 2.5 credits per run
```

### 3.3 Frontend page

```
Add Insights MEDDPICC tab per analytics-expansion.md §4 wireframe.

Constraints:
- Use existing Tabs from insights/page.tsx
- shadcn Card, Chart from components/analytics/
- apiGet with getToken()
- PageSkeleton while loading
- Match existing insights page layout
```

---

## 4. Commands (always run before merge)

```bash
cd codebase

# Type safety
pnpm typecheck

# Production build
pnpm build

# API smoke (needs MongoDB)
cd apps/api && NODE_ENV=development pnpm smoke

# E2E (needs pnpm dev + MongoDB)
pnpm test:e2e
```

---

## 5. Conventions cheat sheet

| Topic | Convention |
|-------|------------|
| API prefix | `/api/v1/` |
| IDs in API | String (Mongo ObjectId) |
| Errors | `{ error: { code, message } }` |
| Multi-tenancy | `workspaceId` on every query |
| Soft delete | `deletedAt: null` filter on deals |
| Timestamps | Mongoose `{ timestamps: true }` |
| UI kit | shadcn/ui — no raw HTML forms |
| Auth header | `Authorization: Bearer <accessToken>` |
| Refresh | Cookie `ai_crm_refresh` |

---

## 6. Do NOT

| Avoid | Do instead |
|-------|------------|
| Redis | MongoDB `background_jobs` |
| Microservices | Modules in monolith |
| Direct Slack in agents | `ChatDeliveryService` |
| `any` types | Zod + inferred types |
| New env without `.env.example` | Document in `ENV.md` |
| Commit `.env` | Gitignored |
| Skip workspaceId filter | Security bug |

---

## 7. Parallel subagent forks (R5/R6 pattern)

When user asks for N parallel workstreams:

1. Parent reads `docs/r6-roadmap.md` or `docs/future/README.md`
2. Spawn N `dev-cycle-implementer` or `generalPurpose` subagents
3. Each gets: workstream spec, file list, acceptance criteria
4. Parent integrates, fixes import conflicts, runs typecheck
5. Single commit per batch (unless user wants split PRs)

**Integration order:** queues/backend → API → frontend → E2E last.

---

## 8. Testing strategy

| Layer | Tool | Location |
|-------|------|----------|
| Unit | Vitest (if present) / manual | `lib/*.ts` |
| API | smoke script | `apps/api` |
| E2E | Playwright | `apps/web/e2e/` |
| Type | tsc | `pnpm typecheck` |

**New E2E:** Add to `e2e/` only for critical paths; don't test every edge case.

---

## 9. Documentation duty

When shipping a feature referenced in `docs/future/`:

1. Update **Implementation status** table in the relevant future doc
2. Add route to `docs/api-routes.md` if new endpoint
3. Bump `docs/wbs.md` task to ✅ if WBS-linked
4. Optional: `.agent/progress.md` (gitignored, local only)

---

## 10. Useful grep one-liners

```bash
# Find all agent templates
rg "slug:" apps/api/src/modules/agents/handlers.ts

# Find queue jobs
rg "add.*Job" apps/api/src/lib/queues/

# Find insights endpoints
rg "insights" apps/api/src/create-app.ts

# Find deal tab components
ls apps/web/components/deals/tabs/

# Check shared schemas
ls packages/shared/src/schemas/
```

---

## 11. Dev login (local testing)

1. `pnpm dev`
2. http://localhost:3000/sign-in
3. **Sign in with email (dev)** — only when `NODE_ENV=development`
4. Token in localStorage; refresh via cookie

---

## 12. Common pitfalls

| Symptom | Fix |
|---------|-----|
| 401 on API | Check `getToken()`; try refresh |
| 500 on page after build | `rm -rf apps/web/.next` restart dev |
| Mongo connection fail | `MONGODB_URI` in `codebase/.env` |
| Agent run stuck pending | Check `background_jobs` collection |
| Type error in shared | Build order: shared → db → api → web |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-09 | v1.0 — Initial vibe coding guide |
