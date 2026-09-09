# Getting Started — Build & Run

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 9.15+ | `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| MongoDB | 7+ | Docker (below) or Atlas |
| Git | any | For clone |

## 1. Clone & install

```bash
git clone https://github.com/LakshinPathak/ai-crm.git
cd ai-crm/codebase
pnpm install
```

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env` — see **[ENV.md](./ENV.md)** for every variable. Minimum to run locally:

```env
MONGODB_URI=mongodb://localhost:27017/ai-crm
JWT_SECRET=your-dev-secret-min-32-chars
TOKEN_ENCRYPTION_KEY=your-encryption-key-min-32-chars
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SSE_URL=http://localhost:4000
WEB_URL=http://localhost:3000
API_URL=http://localhost:4000
```

## 3. Start MongoDB (local)

```bash
docker compose up mongo -d
# or: pnpm docker:up
```

For Atlas, set `MONGODB_URI` to your `mongodb+srv://...` connection string.

## 4. Run development servers

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3000 |
| API (Express) | http://localhost:4000 |
| Health check | http://localhost:4000/api/v1/health |

### Run separately

```bash
pnpm dev:api    # API only :4000
pnpm dev:web    # Web only :3000
```

## 5. Seed demo data (optional)

```bash
pnpm populate-demo
```

Creates a demo workspace with deals, companies, and pipeline stages.

## 6. Verify

```bash
pnpm typecheck                          # TypeScript all packages
cd apps/api && NODE_ENV=development pnpm smoke   # API smoke tests
```

## 7. Production build

```bash
pnpm build
```

Then:

```bash
cd apps/api && pnpm start     # API
cd apps/web && pnpm start     # Web (after next build)
```

## Optional: dedicated background worker

Background jobs (`agent-runs`, `ingest-call`) run inside the API process by default. For a separate worker:

```bash
pnpm --filter @ai-crm/api dev:worker
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` MongoDB | Start `docker compose up mongo -d` or fix `MONGODB_URI` |
| Web can't reach API | Ensure `NEXT_PUBLIC_API_URL=http://localhost:4000` |
| Google sign-in fails | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, callback URL in Google Console |
| AI features empty | Add `GEMINI_API_KEY` (optional for core CRM UI) |

## Next steps

- [TECH_STACK.md](./TECH_STACK.md) — architecture & libraries
- [docs/wbs.md](./docs/wbs.md) — feature completion status
- [docs/api-routes.md](./docs/api-routes.md) — API reference
