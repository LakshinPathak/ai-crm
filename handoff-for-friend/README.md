# Handoff pack — AI CRM

Give someone this folder **plus the git repo**. Do **not** send `codebase/.env`.

**How to run the app:** follow **How to start the app** below (same steps as the repo root [`README.md`](../README.md)).  
**How to understand the product:** then read [`00-START-HERE.md`](./00-START-HERE.md) and the numbered files.

GitHub: [LakshinPathak/ai-crm](https://github.com/LakshinPathak/ai-crm). All code is in **`codebase/`**.

---

## How to start the app

### What you are running

| Piece | Default |
|--------|---------|
| Next.js web | http://localhost:3000 |
| Express API | http://localhost:4000 |
| Health check | **http://localhost:4000/health** (not `/api/v1/health`) |
| MongoDB | `mongodb://localhost:27017/ai-crm` (Docker) |

Background jobs run **inside the API**. Redis is not used.

Use **`http://localhost:3000`** in the browser. If `WEB_URL` is `http://localhost:3000` and you open `http://127.0.0.1:3000`, CORS will fail.

### Prerequisites

- Node.js **20+**
- pnpm **9.15.0**: `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- Docker (local Mongo) **or** a MongoDB Atlas URI
- Git

### Commands (copy-paste)

From a terminal:

```bash
git clone https://github.com/LakshinPathak/ai-crm.git
cd ai-crm/codebase

cp .env.example .env
# Edit .env: set JWT_SECRET and TOKEN_ENCRYPTION_KEY to 32+ random characters.
# Leave GOOGLE_* and GEMINI_API_KEY empty for first boot.

docker compose up mongo -d
pnpm install
pnpm dev
```

Wait until the API is on **:4000** and Next on **:3000**. Then:

1. Open http://localhost:3000/sign-in
2. Use the **development email login** (no Google required). Example after seed: `demo@ai-crm.test`
3. Optional demo data (API must already be running):

```bash
# new terminal, still in ai-crm/codebase
pnpm populate-demo
```

4. Confirm API:

```bash
curl -s http://localhost:4000/health
```

You want `"status":"ok"` and Mongo connected.

### Minimum `.env`

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

Atlas instead of Docker: set `MONGODB_URI` to `mongodb+srv://…` and skip `docker compose`.

**Optional later**

- `GEMINI_API_KEY` — scoring, MEDDPICC, Ask, many agents
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — real Google sign-in
- HubSpot / Salesforce client ids — live CRM (demo connect works without them)

Pipedrive and Zoho are **demo-only** in this codebase today.

### Useful scripts (from `codebase/`)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Web + API together |
| `pnpm dev:api` / `pnpm dev:web` | Split processes |
| `pnpm populate-demo` | Seed Demo Workspace |
| `pnpm typecheck` | TypeScript all packages |
| `pnpm --filter @ai-crm/api smoke` | API smoke (dev-login) |
| `pnpm test:e2e` | Playwright (install Chromium once under `apps/web`) |
| `pnpm docker:up` | Start Mongo container |
| `pnpm build` | Production build |

More detail, troubleshooting, e2e, and smoke cases: [`02-local-setup.md`](./02-local-setup.md). Env catalog: [`03-environment-and-secrets.md`](./03-environment-and-secrets.md).

### If it does not start

| Symptom | Fix |
|---------|-----|
| Mongo connection errors | From `codebase/`: `docker compose up mongo -d` |
| `pnpm` missing | Corepack + pnpm 9.15.0 |
| `pnpm install` at repo root fails | `cd codebase` |
| UI cannot call API | Same origin as `WEB_URL` (`localhost` vs `127.0.0.1`) |
| No AI answers | Add `GEMINI_API_KEY`, restart `pnpm dev` |

---

## What exists vs what to build

Read these two after the app is running:

- [`12-what-exists-today.md`](./12-what-exists-today.md) — inventory
- [`13-what-to-build-next.md`](./13-what-to-build-next.md) — backlog

---

## All files in this pack (18 + this README)

| File | Topic |
|------|--------|
| [00-START-HERE.md](./00-START-HERE.md) | Product one-pager + reading order |
| [01-repo-map.md](./01-repo-map.md) | Folders, entry files, routers |
| [02-local-setup.md](./02-local-setup.md) | Full local setup (more than this README) |
| [03-environment-and-secrets.md](./03-environment-and-secrets.md) | Env vars (no real secrets) |
| [04-architecture.md](./04-architecture.md) | Request path, jobs, events |
| [05-data-model.md](./05-data-model.md) | Mongoose models |
| [06-api-surface.md](./06-api-surface.md) | `/api/v1` live vs stub |
| [07-auth-members.md](./07-auth-members.md) | Login, invites, roles |
| [08-web-ui.md](./08-web-ui.md) | Next dashboard + marketing honesty |
| [09-crm-integrations.md](./09-crm-integrations.md) | HubSpot, Salesforce, calendar |
| [10-agents-approvals.md](./10-agents-approvals.md) | Templates, runs, HITL |
| [11-ai-features.md](./11-ai-features.md) | Scoring, MEDDPICC, Ask/RAG |
| [12-what-exists-today.md](./12-what-exists-today.md) | Honest inventory |
| [13-what-to-build-next.md](./13-what-to-build-next.md) | Backlog / WBS |
| [14-testing-and-quality.md](./14-testing-and-quality.md) | typecheck, smoke, e2e |
| [15-known-pitfalls.md](./15-known-pitfalls.md) | Footguns from review |
| [16-first-week-playbook.md](./16-first-week-playbook.md) | Day-by-day |
| [17-glossary-and-contacts.md](./17-glossary-and-contacts.md) | Terms + GitHub |

Some files under `codebase/docs/` are older than the current app. **This pack is the friend-facing truth** for what shipped vs what is still demo.

---

## How to send this to a friend

1. Give them the GitHub clone (or a zip of the repo).
2. Point them at **this README**, then `00-START-HERE.md`.
3. Do **not** include `codebase/.env` or any API keys.
