# AI CRM

AI-native presales CRM — unified deal context from CRM, Gong, and chat. Modular monolith: **Next.js 15 + shadcn/ui** frontend, **Express API**, **MongoDB** (data + background jobs).

## Repository layout

```
ai-crm/
├── README.md                 # This file
├── AGENTS.md                 # Pointer for AI agents
└── codebase/                 # Monorepo (all app code + docs)
    ├── apps/web/             # Next.js frontend :3000
    ├── apps/api/             # Express API :4000
    ├── packages/             # db, shared, events, integrations
    ├── docs/                 # Product & architecture specs
    ├── GETTING_STARTED.md      # Install, build, run
    ├── TECH_STACK.md         # Technology choices
    ├── ENV.md                # Environment variables guide
    └── .env.example          # Copy to .env and fill in
```

## Quick start

```bash
cd codebase
cp .env.example .env          # Edit credentials — see ENV.md
docker compose up mongo -d      # Optional local MongoDB
pnpm install
pnpm dev                        # API :4000 + Web :3000
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Doc | Purpose |
|-----|---------|
| [GETTING_STARTED.md](codebase/GETTING_STARTED.md) | Build, run, seed demo data |
| [TECH_STACK.md](codebase/TECH_STACK.md) | Stack overview (MongoDB-only, shadcn/ui) |
| [ENV.md](codebase/ENV.md) | All environment variables & credentials |
| [docs/README.md](codebase/docs/README.md) | Full spec index |
| [docs/wbs.md](codebase/docs/wbs.md) | Work breakdown + implementation status |
| [docs/stack.md](codebase/docs/stack.md) | Canonical stack reference |

## Requirements

- Node.js **20+**
- pnpm **9+** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- MongoDB 7+ (local Docker or [MongoDB Atlas](https://www.mongodb.com/atlas))

## License

Private — all rights reserved unless otherwise specified.
