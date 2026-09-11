# Beta deployment checklist — Vercel + Railway + MongoDB Atlas

**Audience:** Engineers standing up a **staging / beta** environment (not full production hardening).  
**Stack:** Next.js (`apps/web`) on **Vercel** · Express API (`apps/api`) on **Railway** · **MongoDB Atlas** · background jobs in MongoDB (no Redis).  
**Related:** [`ENV.md`](../ENV.md) · [`GETTING_STARTED.md`](../GETTING_STARTED.md) · [`architecture.md`](architecture.md) §7 · WBS **8.6–8.7** in [`wbs.md`](wbs.md)

---

## Architecture (beta)

```text
Browser → Vercel (apps/web) → Railway (apps/api :PORT)
                                    ↓
                            MongoDB Atlas (mongodb+srv)
```

Optional: run `pnpm --filter @ai-crm/api worker` as a **second Railway service** if you want job processing isolated from the HTTP process (same env vars as API).

---

## Pre-flight (repo)

- [ ] Node **20+** and **pnpm 9** match [`package.json`](../package.json) `engines` / `packageManager`
- [ ] `cd codebase && pnpm install && pnpm typecheck && pnpm build` passes locally
- [ ] Secrets live only in platform env UIs — never commit `.env`
- [ ] Decide hostnames: `https://app.example.com` (web), `https://api.example.com` (API)

---

## 1. MongoDB Atlas

### Cluster

- [ ] Create Atlas cluster (M10+ recommended if you use **Atlas Vector Search** on `artifact_chunks`; M0 works for core CRM without vector RAG)
- [ ] Enable **Network Access**: allow Railway egress IPs or `0.0.0.0/0` for beta only (tighten for production)
- [ ] Create DB user with read/write on database `ai-crm` (or your chosen name)
- [ ] Copy connection string → `MONGODB_URI` (`mongodb+srv://...`)

### Indexes (beta minimum)

- [ ] Run app once or use seed — Mongoose creates most indexes on boot
- [ ] If using deal RAG / chunk retrieval: create Atlas **Vector Search** index per [`database.md`](database.md) (`artifact_chunks_vector` on `embedding`, 1536 dims) when embeddings are enabled

### Data (optional)

- [ ] `pnpm populate-demo` against Atlas from a trusted machine (uses `MONGODB_URI` in local `.env`) for demo workspace

---

## 2. Railway — API (`apps/api`)

### Service setup

- [ ] New Railway project; connect GitHub repo
- [ ] **Root directory:** `codebase` (monorepo root)
- [ ] **Build command (example):**  
  `pnpm install --frozen-lockfile && pnpm --filter @ai-crm/api build`  
  (Turbo/pnpm builds workspace packages `@ai-crm/db`, `@ai-crm/shared`, etc. as dependencies of the API build)
- [ ] **Start command:** `pnpm --filter @ai-crm/api start` (runs `node dist/server.js`)
- [ ] Set **PORT** from Railway (`PORT` is injected; app reads `process.env.PORT`)

### API environment variables

Set on Railway (mirror [`codebase/.env.example`](../.env.example) and [`ENV.md`](../ENV.md)):

| Variable | Beta value |
|----------|------------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas `mongodb+srv://...` |
| `JWT_SECRET` | 32+ random chars |
| `TOKEN_ENCRYPTION_KEY` | 32+ random chars (OAuth token encryption) |
| `API_URL` | `https://<your-api-host>` |
| `WEB_URL` | `https://<your-vercel-host>` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Production OAuth client |
| `GOOGLE_CALLBACK_URL` | `https://<your-api-host>/api/v1/auth/google/callback` |
| `GEMINI_API_KEY` | Required for MEDDPICC / agents |
| `INTERNAL_SERVICE_TOKEN` | Rotate from dev default |
| Integration vars | HubSpot, Slack, Gong, etc. as needed |

- [ ] Add Google OAuth **authorized redirect URI** = `GOOGLE_CALLBACK_URL`
- [ ] CORS: `WEB_URL` must match the Vercel origin the browser uses

### Webhooks (integrations)

- [ ] HubSpot / Gong / Slack app URLs point at `https://<api-host>/api/v1/webhooks/...`
- [ ] Set `HUBSPOT_WEBHOOK_PUBLIC_HOST` (and provider secrets) per [`ENV.md`](../ENV.md)

### Health check

- [ ] Railway deploy succeeds; hit a public route (e.g. auth or health if exposed) from curl
- [ ] `pnpm --filter @ai-crm/api smoke` locally against beta API URL (with beta creds in env) optional

### Worker (optional second service)

- [ ] Duplicate service, same env, start: `pnpm --filter @ai-crm/api worker`

---

## 3. Vercel — Web (`apps/web`)

### Project setup

- [ ] Import repo; **Root Directory:** `codebase/apps/web` (or monorepo preset with app path `apps/web`)
- [ ] Framework: **Next.js**
- [ ] **Build command:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @ai-crm/web build` (adjust if Vercel runs from `apps/web` only)
- [ ] **Install command:** `pnpm install` from monorepo root when using root `codebase`

### Web environment variables

| Variable | Beta value |
|----------|------------|
| `NEXT_PUBLIC_API_URL` | `https://<your-api-host>` |
| `NEXT_PUBLIC_SSE_URL` | Same as API URL (MEDDPICC SSE) |

- [ ] Redeploy after changing any `NEXT_PUBLIC_*` variable

### Domain

- [ ] Assign Vercel preview/production domain; set `WEB_URL` on API to match

---

## 4. Cross-service verification

- [ ] Sign in (Google OAuth or dev-login only if enabled in beta)
- [ ] Deals board loads (API + Atlas)
- [ ] MEDDPICC refresh streams (SSE via `NEXT_PUBLIC_SSE_URL`)
- [ ] Agent run enqueues and completes (MongoDB `background_jobs`)
- [ ] Integration OAuth redirect returns to `WEB_URL` without CORS errors

---

## 5. CI alignment

- [ ] GitHub Actions already runs typecheck, build, E2E — keep `main` green before promoting beta
- [ ] E2E locally: `pnpm dev` + `pnpm test:e2e` ([`wbs.md`](wbs.md) Playwright section)

---

## 6. Beta → production gaps (explicitly out of this doc)

Track in [`future/implementation-status.md`](future/implementation-status.md):

- Custom domain + DNS cutover (WBS 8.7)
- Atlas IP allowlist lockdown, secrets rotation schedule, Sentry/alerts
- Salesforce, SQL explorer, MCP — R9+ roadmaps

---

## Quick reference — URL wiring

| Concern | Set on |
|---------|--------|
| Browser → API | Vercel: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SSE_URL` |
| API → browser (CORS, OAuth) | Railway: `WEB_URL` |
| API self-links / webhooks | Railway: `API_URL` |
| Database | Railway (+ worker): `MONGODB_URI` |

---

**Status:** Checklist for beta staging (R9 WS-10). Update when deploy automation (Docker, IaC) lands.
