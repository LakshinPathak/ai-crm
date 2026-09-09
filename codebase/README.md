# AI CRM — Modular Monolith

AI-native presales CRM. **Next.js 15 + shadcn/ui** frontend, **Express API**, **MongoDB** (data + background jobs).

## Quick links

| Doc | Purpose |
|-----|---------|
| **[GETTING_STARTED.md](./GETTING_STARTED.md)** | Install, build, run, troubleshoot |
| **[TECH_STACK.md](./TECH_STACK.md)** | Architecture & libraries |
| **[ENV.md](./ENV.md)** | Environment variables & credentials |
| **[docs/wbs.md](./docs/wbs.md)** | Work breakdown + completion status |
| **[docs/README.md](./docs/README.md)** | Full specification index |

## Quick start

```bash
cp .env.example .env    # See ENV.md for credentials
docker compose up mongo -d
pnpm install
pnpm dev                # API :4000 + Web :3000
```

## Structure

| Path | Role | Port |
|------|------|------|
| `apps/web` | Next.js + shadcn/ui | 3000 |
| `apps/api` | Express modular monolith | 4000 |
| `packages/db` | Mongoose models | — |
| `packages/shared` | Zod schemas | — |
| `packages/events` | Domain events (in-process) | — |

## Commands

```bash
pnpm dev              # API + web
pnpm dev:api          # API only
pnpm dev:web          # Web only
pnpm build            # Production build
pnpm typecheck        # TypeScript check all packages
pnpm populate-demo    # Seed demo workspace
pnpm docker:up        # Start local MongoDB
```

## Health check

```bash
curl http://localhost:4000/api/v1/health
cd apps/api && NODE_ENV=development pnpm smoke
```
