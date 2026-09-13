# Local setup — AI CRM

Hand this file to anyone cloning the repo. The runnable app lives in **`codebase/`**, not the workspace root. Canonical sources: [`codebase/GETTING_STARTED.md`](../codebase/GETTING_STARTED.md), [`codebase/ENV.md`](../codebase/ENV.md), [`codebase/.env.example`](../codebase/.env.example), [`codebase/docker-compose.yml`](../codebase/docker-compose.yml), [`codebase/package.json`](../codebase/package.json).

**Never commit `.env`.** Never paste live secrets into chat. Copy **placeholders** from `.env.example` only.

---

## What you are running

Modular monolith:

| Piece | Package | Process | Default |
|--------|---------|---------|---------|
| Next.js web | `@ai-crm/web` | `next dev -H 0.0.0.0 -p 3000` | **http://localhost:3000** |
| Express API | `@ai-crm/api` | `tsx watch src/server.ts` | **http://localhost:4000** |
| MongoDB 7 | Docker service `mongo` | `mongo:7` | **localhost:27017**, database `ai-crm` |

Background jobs (`agent-runs`, `ingest-call`, embeddings, calendar sync, etc.) run **inside the API process** by default (MongoDB collection `background_jobs`). Redis is **not** used.

Workspace packages (built as dependencies): `packages/db`, `packages/shared`, `packages/events`, `packages/integrations/crm`. HubSpot UI extensions under `codebase/src/` are a **separate** HubSpot project (`hsproject.json`) and are not required for `pnpm dev`.

---

## Prerequisites

| Tool | Version | How |
|------|---------|-----|
| **Git** | any | Clone |
| **Node.js** | **20+** (`engines.node` is `>=20`) | [nodejs.org](https://nodejs.org/) or `nvm install 20` |
| **pnpm** | **9.15.0** (`packageManager` field) | `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| **Docker** | with Compose v2 | Local Mongo only (`docker compose up mongo -d`) |
| **MongoDB** | **7+** | Docker below **or** Atlas `mongodb+srv://…` |

Optional later: Google Cloud OAuth client, Gemini API key, HubSpot / Salesforce / Slack / Teams / Gong apps. **Core UI + demo seed work without those** (dev-login, dummy CRM connect).

Confirm versions:

```bash
node -v    # v20.x or newer
pnpm -v    # 9.15.x
docker compose version
```

If `pnpm` is missing: enable Corepack (ships with Node 20), then prepare the exact version the lockfile expects.

---

## 1. Clone

Public GitHub remote used in-repo:

```bash
git clone https://github.com/LakshinPathak/ai-crm.git
cd ai-crm
```

All install/dev/test commands below are from **`ai-crm/codebase`**:

```bash
cd codebase
```

If you were given a private fork or SSH URL, use that instead. Do not put a GitHub PAT in the clone URL and then paste the command into chat.

---

## 2. Environment file

```bash
cp .env.example .env
```

Edit `codebase/.env`. Full variable catalog: **[03-environment-and-secrets.md](./03-environment-and-secrets.md)**.

**Minimum to boot locally** (use **your own** 32+ character random strings — do **not** leave the short example `JWT_SECRET`):

```env
MONGODB_URI=mongodb://localhost:27017/ai-crm
NODE_ENV=development
JWT_SECRET=replace-with-at-least-32-random-chars
TOKEN_ENCRYPTION_KEY=replace-with-at-least-32-random-chars
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SSE_URL=http://localhost:4000
PORT=4000
API_URL=http://localhost:4000
WEB_URL=http://localhost:3000
INTERNAL_SERVICE_TOKEN=dev-internal-token-change-in-prod
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
```

Leave `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GEMINI_API_KEY` empty until you need Google sign-in or AI features. Local **dev-login** (`POST /api/v1/auth/dev-login`) is enabled whenever `NODE_ENV !== production`.

### Who reads `.env`

| Process | How env is loaded |
|---------|-------------------|
| **API** (`apps/api/src/server.ts`) | `dotenv` from **`codebase/.env`** (path `../../../.env` from `apps/api/src`) |
| **Scripts** (`populate-demo`, `smoke`, HubSpot scripts) | Same `codebase/.env` via dotenv |
| **Next.js** (`apps/web`) | Standard Next lookup: `apps/web/.env`, `.env.local`, `.env.development` — **not** automatically `codebase/.env` |

For default localhost URLs this is fine: the web client falls back to `http://localhost:4000` in code. If you change API host/port, either export `NEXT_PUBLIC_*` in the shell, duplicate them into `apps/web/.env.local`, or restart Next after putting those keys where Next can see them. `NEXT_PUBLIC_*` are baked in at **dev/build** time.

---

## 3. MongoDB (Docker)

Compose file: `codebase/docker-compose.yml` — **only** service `mongo`.

```yaml
# image mongo:7, host 27017 → container 27017, volume mongo_data
```

From `codebase/`:

```bash
docker compose up mongo -d
# equivalent:
pnpm docker:up
```

Check:

```bash
docker compose ps
# optional:
mongosh "mongodb://localhost:27017/ai-crm" --eval 'db.runCommand({ ping: 1 })'
```

**Atlas instead:** skip Docker; set `MONGODB_URI` to your `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/ai-crm` string (keep it out of git and chat).

Data persists in the named volume `mongo_data`. To wipe local DB: `docker compose down -v` (destroys that volume).

---

## 4. Install dependencies

Still in `codebase/`:

```bash
pnpm install
```

This uses `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `packages/integrations/*`) and `pnpm-lock.yaml`. Prefer **not** mixing npm/yarn in this tree.

If install fails on Node 18 or 22-with-odd-native-modules, switch to Node 20 LTS and retry.

---

## 5. Start development servers

```bash
pnpm dev
```

This is:

```text
pnpm -r --parallel --filter @ai-crm/api --filter @ai-crm/web dev
```

You should see roughly:

- API: `modular monolith listening on :4000`
- Web: Next.js ready on **3000** (bound to `0.0.0.0`, so LAN IPs also hit the UI)

### Split processes

```bash
pnpm dev:api        # alias: pnpm dev:backend
pnpm dev:web        # alias: pnpm dev:frontend
```

### Optional dedicated worker

Jobs already run in the API. Separate watcher:

```bash
pnpm --filter @ai-crm/api dev:worker
# production-style:
pnpm --filter @ai-crm/api worker
```

Use the **same** `codebase/.env` / `MONGODB_URI`.

---

## Ports and URLs

| Port | Service | Notes |
|------|---------|--------|
| **3000** | Next.js | `WEB_URL` must match the **browser origin** (scheme + host + port). CORS on the API is a **single origin**: `WEB_URL` (default `http://localhost:3000`). |
| **4000** | Express | `PORT`, `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SSE_URL`. |
| **27017** | MongoDB | `MONGODB_URI=mongodb://localhost:27017/ai-crm`. |

| Check | URL |
|--------|-----|
| Web | http://localhost:3000 |
| API health | **http://localhost:4000/health** (not `/api/v1/health`) |
| API prefix | http://localhost:4000/api/v1/… |

Health JSON shape: `{ "status": "ok", "service": "api", "mongo": "connected" | "connecting" | "disconnected" | "error" }`. Smoke and Playwright wait on **`GET /health`**.

If you open the UI as `http://127.0.0.1:3000` while `WEB_URL=http://localhost:3000`, **CORS will fail** (different origins). Pick one hostname and set `WEB_URL` to that exact origin.

---

## 6. Seed demo data (`populate-demo`)

Requires **API already running** (`pnpm dev` or `pnpm dev:api`) and Mongo up.

```bash
# from codebase/
pnpm populate-demo
```

Runs `@ai-crm/api` script `tsx scripts/populate-demo.ts`.

What it does:

1. `POST /api/v1/auth/dev-login` with `DEMO_USER_EMAIL` (default **`demo@ai-crm.test`**, display name Demo User).
2. Creates workspace **Demo Workspace** (timezone `America/New_York`) if needed.
3. Completes onboarding (ignores if already done).
4. Demo-connects CRM providers **hubspot → salesforce → zoho**, syncs dummy data, disconnects each, then **reconnects HubSpot** and syncs again.
5. Prints deal-board metrics.

Uses `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). **Does not need real HubSpot/Salesforce/Zoho credentials** — it uses in-app demo connect.

Sign in in the browser: development email form on `/sign-in`, or paste a token from the script’s hint (`/auth/callback`).

---

## 7. Smoke tests

API must be running; `NODE_ENV=development` (so dev-login exists).

```bash
# from codebase/
pnpm --filter @ai-crm/api smoke
```

(`GETTING_STARTED.md` also shows `cd apps/api && NODE_ENV=development pnpm smoke` — same script.)

The script loads `codebase/.env` and hits `NEXT_PUBLIC_API_URL`.

Cases:

| Step | What |
|------|------|
| `GET /health` | `status === "ok"` |
| `POST /api/v1/auth/dev-login` | Email default **`smoke@ai-crm.test`** (`DEMO_USER_EMAIL`); creates workspace if needed |
| `GET /api/v1/deals/board` | Bearer token; expects `stages[]` + `metrics` |
| Unsigned agent webhook | Create agent, `POST /api/v1/agents/:id/webhook` without signature → **401** |

If `NODE_ENV` is not `development`, it skips dev-login and uses `SMOKE_TEST_TOKEN` instead.

Exit code 1 if any case fails.

---

## 8. Typecheck

From `codebase/`:

```bash
pnpm typecheck
```

Runs `pnpm -r typecheck` (API `tsc --noEmit`, web `tsc --noEmit`, plus workspace packages that define the script).

CI (`/.github/workflows/ci.yml`) also runs `pnpm typecheck` then `pnpm build` on Node 20 + pnpm 9.15.0.

Full production build:

```bash
pnpm build
# then:
pnpm --filter @ai-crm/api start    # node dist/server.js
pnpm --filter @ai-crm/web start    # next start (after next build)
```

---

## 9. End-to-end tests (`test:e2e`)

Playwright, Chromium only. Specs: `codebase/apps/web/e2e/` (auth, deals, deal CRUD, agents, agent webhook, deal-ask, blog). Auth uses **dev-login**, not Google.

**First time on a machine**, install the browser (CI does this with `--with-deps`):

```bash
cd apps/web
pnpm exec playwright install --with-deps chromium
cd ../..
```

Then from `codebase/`:

```bash
pnpm test:e2e
# interactive:
pnpm --filter @ai-crm/web test:e2e:ui
```

`playwright.config.ts`:

- `baseURL` = `PLAYWRIGHT_BASE_URL` or `http://localhost:3000`
- Unless `PLAYWRIGHT_SKIP_WEBSERVER` is set, Playwright **starts API + web itself** and waits for `http://localhost:4000/health` and the web `baseURL`
- `reuseExistingServer: true` when `CI` is unset — so a running `pnpm dev` is reused locally
- Injected e2e env defaults: Mongo `mongodb://localhost:27017/ai-crm`, JWT/encryption placeholders **for CI-length secrets**, `WEB_URL=http://localhost:3000`, etc.
- Timeout 60s per test; traces on first retry

Mongo **must** be up (Docker or Atlas). If ports 3000/4000 are taken by a **broken** process, stop it or set `PLAYWRIGHT_SKIP_WEBSERVER=1` only when healthy servers are already listening.

---

## Root `package.json` scripts (cheat sheet)

| Script | Action |
|--------|--------|
| `pnpm dev` | API + web in parallel |
| `pnpm dev:api` / `dev:web` | One process |
| `pnpm build` | Recursive build |
| `pnpm typecheck` | Recursive typecheck |
| `pnpm test:e2e` | Playwright via `@ai-crm/web` |
| `pnpm populate-demo` | Demo seed via API |
| `pnpm hubspot:seed` / `hubspot:sync` / `hubspot:test` | HubSpot scripts (need token; see env doc) |
| `pnpm hubspot:setup` | `bash scripts/hubspot-setup.sh` |
| `pnpm docker:up` | `docker compose up mongo -d` |

---

## Suggested first-run order

```bash
cd codebase
cp .env.example .env          # then edit JWT_SECRET + TOKEN_ENCRYPTION_KEY to 32+ chars
pnpm docker:up
pnpm install
pnpm dev                      # leave running
# new terminal, still in codebase/:
curl -sf http://localhost:4000/health
pnpm populate-demo
pnpm --filter @ai-crm/api smoke
pnpm typecheck
# browsers once (from codebase/apps/web):
#   pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

Open http://localhost:3000 — sign in with a **dev email** (not Google) unless you configured OAuth.

---

## Common failures

### 1. JWT secret too short (`jsonwebtoken` HS256)

**Symptom:** API throws on login / token sign, e.g. **`secretOrPrivateKey has a minimum key size of 256 bits for HS256`**. Dev-login, smoke, and e2e all fail.

**Cause:** `jsonwebtoken` **v9** (API dependency) requires an HS256 secret of **at least 32 bytes**. `.env.example` ships `JWT_SECRET=change-me-in-production` (**24 characters**) — that is **too short**.

**Fix:** Set `JWT_SECRET` to **≥32 random characters** (CI uses strings like `ci-jwt-secret-for-e2e-tests-only`, which is 32 chars). Same guidance for `TOKEN_ENCRYPTION_KEY` even though crypto SHA-256–hashes the key (docs still require 32+).

Do not copy a secret from chat history; generate a new one:

```bash
openssl rand -base64 32
```

### 2. MongoDB not up / wrong URI

**Symptom:** API process exits on start (`failed to start`); health `mongo` is `error` / `disconnected`; mongoose `ECONNREFUSED 127.0.0.1:27017`; `MONGODB_URI is required`.

**Fix:**

```bash
docker compose up mongo -d
# confirm nothing else bound 27017
ss -ltnp | grep 27017   # or lsof -i :27017
```

`connectDb` uses `serverSelectionTimeoutMS: 5000`. If Docker is healthy but URI points at Atlas, check IP allowlist and credentials (never paste the URI with password into Slack/chat).

### 3. CORS / `WEB_URL` mismatch

**Symptom:** Browser console: blocked by CORS; cookies/credentials fail; OAuth round-trip returns to the wrong host; UI cannot call API though `curl` to `:4000` works.

**Cause:** API CORS is **`origin: process.env.WEB_URL ?? 'http://localhost:3000'`** with **`credentials: true`**. Only that **exact** origin is allowed.

Typical mismatches:

| You opened | `WEB_URL` | Result |
|------------|-----------|--------|
| `http://localhost:3000` | default / same | OK |
| `http://127.0.0.1:3000` | `http://localhost:3000` | Fail |
| `http://192.168.x.x:3000` (phone/LAN; web binds `0.0.0.0`) | still localhost | Fail |
| `https://…` production web | leftover `http://localhost:3000` | Fail |

**Fix:** Set `WEB_URL` to the origin in the address bar (no trailing slash). Restart the **API**. Align `NEXT_PUBLIC_API_URL` with the API the browser should call.

Google/integration OAuth redirects also use `WEB_URL` as the frontend base after callback.

### 4. Web cannot reach API

**Symptom:** Empty boards, network errors to `:4000`, Next rewriting nothing (there is no API proxy by default).

**Fix:** API actually listening; `NEXT_PUBLIC_API_URL=http://localhost:4000`; restart **web** after changing `NEXT_PUBLIC_*`. Confirm with `curl -sf http://localhost:4000/health`.

### 5. Port already in use

**Symptom:** `EADDRINUSE :::4000` or `:3000` or `:27017`.

**Fix:** Stop the other process, or change `PORT` / Next `-p` **and** every URL env (`API_URL`, `NEXT_PUBLIC_*`, Playwright URLs, Google callback).

### 6. `populate-demo` / smoke: connection refused

Scripts talk to the **HTTP API**, not Mongo directly. Start `pnpm dev` first. Confirm `NEXT_PUBLIC_API_URL`.

### 7. `populate-demo` / smoke: `404` on `/auth/dev-login`

`NODE_ENV=production` **disables** dev-login (returns 404). Keep `NODE_ENV=development` locally.

### 8. Google sign-in fails (optional)

Need `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and **Authorized redirect URI** in Google Cloud Console exactly equal to `GOOGLE_CALLBACK_URL` (`http://localhost:4000/api/v1/auth/google/callback`). Also Authorized JavaScript origins for the web origin. Local **email dev-login** does not need this.

### 9. AI / MEDDPICC / agents “empty” or stubby

Add `GEMINI_API_KEY` (see env doc). Core CRM UI works without it.

### 10. Playwright: browser not found / timeout waiting for `/health`

```bash
cd apps/web && pnpm exec playwright install --with-deps chromium
```

Ensure Mongo is up. If API crash-loops (short JWT secret, no `MONGODB_URI`), Playwright’s webServer wait on `/health` times out (120s).

### 11. Wrong working directory

`pnpm install` / `pnpm dev` from **`ai-crm/`** (repo root) will not find the workspace `package.json`. Always `cd codebase`.

### 12. Changing `TOKEN_ENCRYPTION_KEY` after connecting integrations

Existing Mongo documents store **AES-256-GCM** ciphertext derived from that key. A new key → decrypt failures until users **reconnect** OAuth. See [03-environment-and-secrets.md](./03-environment-and-secrets.md).

---

## Next reading

- [03-environment-and-secrets.md](./03-environment-and-secrets.md) — every env var, optional vs required, rotation
- [`codebase/TECH_STACK.md`](../codebase/TECH_STACK.md)
- [`codebase/docs/README.md`](../codebase/docs/README.md)
- [`codebase/docs/api-routes.md`](../codebase/docs/api-routes.md)
- [`codebase/docs/deploy-beta.md`](../codebase/docs/deploy-beta.md) — Vercel + Railway + Atlas
