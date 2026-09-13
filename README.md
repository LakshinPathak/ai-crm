# AI CRM

AI-native **presales CRM**: pipeline, deals, agents, and human approvals in one workspace. Stack is a modular monolith — **Next.js 15** (web), **Express** (API), **MongoDB 7** (data + background jobs).

All application code lives in **`codebase/`**. Commands below are run from that folder unless noted.

**New collaborator?** Also open [`handoff-for-friend/00-START-HERE.md`](handoff-for-friend/00-START-HERE.md) for what exists vs what to build.

---

## How to start the app (local)

### What you get

| Piece | URL | Notes |
|--------|-----|--------|
| Web (Next.js) | http://localhost:3000 | UI. Use **`localhost`**, not `127.0.0.1`, unless you change `WEB_URL`. |
| API (Express) | http://localhost:4000 | REST + SSE. Jobs run **inside this process**. |
| Health | http://localhost:4000/health | `{ "status": "ok", "mongo": "connected" }` |
| MongoDB | `localhost:27017` / db `ai-crm` | Docker or Atlas |

Redis is **not** required.

### Requirements

- **Node.js 20+**
- **pnpm 9.15.0** — `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- **MongoDB 7+** — Docker Compose in this repo, or Atlas
- **Git**
- **Docker** only if you want local Mongo (`docker compose up mongo -d`)

```bash
node -v    # v20.x or newer
pnpm -v    # 9.15.x
```

### 1. Clone and enter the monorepo

```bash
git clone https://github.com/LakshinPathak/ai-crm.git
cd ai-crm/codebase
```

Do **not** run `pnpm` from the git root. There is no workspace there.

### 2. Environment file

```bash
cp .env.example .env
```

Edit `codebase/.env`. **Never commit `.env`.** Do not paste live keys into chat.

**Minimum to boot** (use your own 32+ character secrets — do not leave the example `change-me` values as-is if you care about local token safety):

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

Leave `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GEMINI_API_KEY` empty until you need Google sign-in or AI. Core UI works with **dev-login**.

The API loads `codebase/.env`. Next.js does **not** automatically read that file; default localhost URLs are baked into the web app. If you change API host/port, put `NEXT_PUBLIC_*` in `apps/web/.env.local` as well.

Full variable list: [`codebase/ENV.md`](codebase/ENV.md) and [`handoff-for-friend/03-environment-and-secrets.md`](handoff-for-friend/03-environment-and-secrets.md).

### 3. Start MongoDB

```bash
docker compose up mongo -d
# same as: pnpm docker:up
```

Or set `MONGODB_URI` to an Atlas `mongodb+srv://…` string and skip Docker.

### 4. Install and run

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts **API + web in parallel**.

| Command | What it does |
|---------|----------------|
| `pnpm dev` | API `:4000` + web `:3000` |
| `pnpm dev:api` | API only (`pnpm dev:backend` is an alias) |
| `pnpm dev:web` | Web only (`pnpm dev:frontend` is an alias) |

You should see the API listening on **:4000** and Next ready on **:3000**.

Open **http://localhost:3000**. If the browser origin is not exactly `WEB_URL` (including `localhost` vs `127.0.0.1`), CORS will fail.

### 5. Sign in (first time)

In **development** (`NODE_ENV` is not `production`), `/sign-in` has a **dev email login**. That calls `POST /api/v1/auth/dev-login` — no Google app required.

Typical first user:

1. Open http://localhost:3000/sign-in
2. Use the development email form (any email works; demo seed uses `demo@ai-crm.test`)
3. Complete onboarding if prompted

Google OAuth needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the callback URL above in the Google Cloud console.

### 6. Seed demo data (optional, recommended)

API must already be running.

```bash
pnpm populate-demo
```

Creates **Demo Workspace**, dummy pipeline/deals, and demo CRM connect (no real HubSpot/Salesforce keys). Then sign in as `demo@ai-crm.test` (or the email the script prints).

### 7. Confirm it is healthy

```bash
curl -s http://localhost:4000/health
# expect: "status":"ok" and mongo connected
```

Optional checks from `codebase/`:

```bash
pnpm typecheck
pnpm --filter @ai-crm/api smoke    # API must be up; NODE_ENV=development
```

---

## Optional: AI, CRM, calendar

| Want | Set in `.env` | Notes |
|------|----------------|--------|
| MEDDPICC / scoring / Ask / agents that call Gemini | `GEMINI_API_KEY` | Without it, CRM UI still runs; AI paths are empty or heuristic. |
| Google sign-in | `GOOGLE_CLIENT_*` | Callback: `http://localhost:4000/api/v1/auth/google/callback` |
| Live HubSpot | `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` (OAuth) | Demo connect works without this. |
| Live Salesforce | `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET` | Same — demo without keys. |
| Pipedrive / Zoho | — | **Demo connector only** today. Do not expect live OAuth. |

Jobs (`agent-runs`, ingest, embeddings, calendar sync) run inside the API. Separate worker (same `.env`):

```bash
pnpm --filter @ai-crm/api dev:worker
```

---

## Tests

Mongo must be up. Playwright e2e uses **dev-login**, not Google.

```bash
# first time: Chromium
cd apps/web && pnpm exec playwright install --with-deps chromium && cd ../..

pnpm test:e2e
```

If `pnpm dev` is already running, Playwright reuses those servers. To skip starting servers: `PLAYWRIGHT_SKIP_WEBSERVER=1 pnpm test:e2e`.

---

## Production-style build (local)

```bash
pnpm build
pnpm --filter @ai-crm/api start    # node dist
pnpm --filter @ai-crm/web start    # next start (after build)
```

`dev-login` is **off** when `NODE_ENV=production`. You need real Google OAuth (or another auth path you add).

---

## Repository layout

```
ai-crm/                          # git root
├── README.md                    # this file — how to run
├── AGENTS.md                    # pointer for coding agents
├── handoff-for-friend/          # detailed takeover docs (00–17)
└── codebase/                    # pnpm workspace — run everything here
    ├── apps/web/                # Next.js :3000
    ├── apps/api/                # Express :4000
    ├── packages/                # db, shared, events, integrations
    ├── docker-compose.yml       # mongo:7 only
    ├── .env.example             # copy to .env
    ├── GETTING_STARTED.md       # shorter install notes
    └── docs/                    # product specs (some older than current code)
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
| **[handoff-for-friend/README.md](handoff-for-friend/README.md)** | Friend pack index + same start steps |
| [handoff-for-friend/00-START-HERE.md](handoff-for-friend/00-START-HERE.md) | What the product is; reading order |
| [handoff-for-friend/12-what-exists-today.md](handoff-for-friend/12-what-exists-today.md) | Honest inventory |
| [handoff-for-friend/13-what-to-build-next.md](handoff-for-friend/13-what-to-build-next.md) | Backlog |
| [codebase/GETTING_STARTED.md](codebase/GETTING_STARTED.md) | Install / seed / smoke |
| [codebase/ENV.md](codebase/ENV.md) | Environment variables |
| [codebase/docs/wbs.md](codebase/docs/wbs.md) | Work breakdown (canonical remaining work often in `docs/r11-wbs.md`) |

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `ECONNREFUSED` Mongo / health `mongo` not connected | `docker compose up mongo -d` from `codebase/`; check `MONGODB_URI` |
| Web loads, API calls fail CORS | Open `http://localhost:3000` (same host as `WEB_URL`). Do not mix `127.0.0.1` and `localhost`. |
| `pnpm: command not found` | Enable Corepack and pin pnpm 9.15.0 (see Requirements) |
| Commands fail at git root | `cd codebase` first |
| Google sign-in 400/redirect | Callback URL must match Google Console **and** `GOOGLE_CALLBACK_URL` |
| AI empty / agents weak | Set `GEMINI_API_KEY`; restart `pnpm dev` |
| Port 3000 or 4000 in use | Stop the other process, or change `PORT` / Next port and the matching `NEXT_PUBLIC_*` / `WEB_URL` |
| Next does not pick up API URL | Put `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` and restart web |

---

## License

Private — all rights reserved unless otherwise specified.
