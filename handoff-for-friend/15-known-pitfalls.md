# 15 — Known pitfalls

Things that bite when you treat marketing copy, Mongo flags, and HubSpot as “already done.” File paths are under **`codebase/`**. Pair with [14-testing-and-quality.md](./14-testing-and-quality.md).

---

## HubSpot sync is N+1

Full sync lives in [`apps/api/src/lib/hubspot/sync.ts`](../codebase/apps/api/src/lib/hubspot/sync.ts) (`syncHubSpotToWorkspace`).

For **each** HubSpot deal it:

1. `Deal.findOne` by `crmExternalId`
2. **Another HTTP GET** `/crm/v4/objects/deals/{id}/associations/companies`

Same pattern for **notes** and **tasks**: existence check, then a **per-object association GET**.

That is fine for a handful of Free-tier deals. It will rate-limit and crawl on a real portal. Batch associations / search with `associations` in the payload before you scale sync. Incremental HubSpot webhooks assume `ExternalRecord` rows already exist from this full sync.

---

## `isHot` is local-only — not written to HubSpot

`Deal.isHot` is a first-class Mongo field (kanban badge, home “hot”, buying-signals agent, approvals `DealUpdatePatch`).

HubSpot write-back [`apps/api/src/lib/hubspot/crm-field-write-back.ts`](../codebase/apps/api/src/lib/hubspot/crm-field-write-back.ts) `buildHubSpotProperties` only maps:

- `title` → `dealname`
- `amount` → `amount`
- `stageId` → `dealstage` (if mapped)

**`isHot` (and sentiment) are ignored.** Approving a hot-flag change updates Mongo; HubSpot never sees it. There is no standard HubSpot “hot” property in this mapping. Do not demo “we sync hot to CRM” until you add a custom property + mapping.

Inbound HubSpot sync also does **not** set `isHot` from HubSpot.

---

## Invite email is not sent

`POST /api/v1/workspace/members/invite` ([`apps/api/src/modules/auth/handlers.ts`](../codebase/apps/api/src/modules/auth/handlers.ts) `inviteMember`) creates a `WorkspaceInvite` and returns `inviteUrl` like `{WEB_URL}/sign-in?invite={id}`.

There is **no Resend/SES/SMTP send**. The teammate never gets an email unless you paste the URL. E2E (`deal-crud.spec.ts`) only asserts the JSON URL.

Accept path: query `?invite=` + cookie + `acceptPendingWorkspaceInvite` ([`apps/api/src/lib/auth/invite.ts`](../codebase/apps/api/src/lib/auth/invite.ts)). Email on the Google/dev user must **match** the invite email.

Backlog: R11 `10.5.3` / `10.7.1`.

---

## Calendar linking is title matching, not attendees

Google Calendar sync: [`apps/api/src/lib/queues/google-calendar-sync.ts`](../codebase/apps/api/src/lib/queues/google-calendar-sync.ts).

`matchDeal()`:

- Needs summary length ≥ 8
- Exact title match, **or**
- Deal title (length ≥ 8) **contained in** the event summary — only if **exactly one** open deal matches
- Only first **100 open deals** in the workspace are considered
- Unmatched events are **dropped** (counted as `unmatched`, not stored)

No attendee email ↔ contact matching, no HubSpot meeting id. A calendar event titled “Weekly sync” will not attach to “Acme — Platform License”. Name meetings like the deal title (or put the deal title in the summary).

Settings UI may still say “demo” in places even when REST sync is live — check API logs / `DealEvent` `source: google_calendar`.

---

## Agent wizard vs `POST /from-template`

Two different create paths:

| Path | What happens |
|------|----------------|
| UI **Start from template** | [`apps/web/app/(dashboard)/agents/page.tsx`](../codebase/apps/web/app/(dashboard)/agents/page.tsx) only `router.push(/agents/new?template=slug)`. Agent is **not** created until the **wizard** `POST /api/v1/agents`. |
| API `POST /api/v1/agents/from-template/:slug` | [`createFromTemplate`](../codebase/apps/api/src/modules/agents/handlers.ts) creates immediately with `defaultTriggerConfig(slug)`, empty `toolsConfig` / `deliveryConfig`. |

Wizard `createAgent` can merge NL/wizard `triggerConfig`; from-template skips tools/delivery. If you “instantiate from template” in a script, you skip the UI that sets Slack channel / cron. If you only use the UI, you never hit `from-template`. E2E template test follows the **wizard URL**, not the from-template route.

R11 `10.4.1` was about seeding `triggerConfig` on from-template so cron/events work without the wizard — check `defaultTriggerConfig` before assuming a template agent is scheduled.

---

## `listCalls` is artifact-first and can hide `DealEvent`s

[`apps/api/src/modules/calls/handlers.ts`](../codebase/apps/api/src/modules/calls/handlers.ts) `listCalls`:

1. Load `Artifact` with `type: 'call'`
2. **If any artifacts exist**, return **only** those and **never** look at `DealEvent`
3. Only if the artifact list is empty, fall back to `DealEvent` with `type: 'call'`

Gong (and similar) ingest writes **Artifacts**. Calendar sync writes **DealEvents** with `type: 'meeting'` (not `call`). So:

- One Gong artifact in the workspace **hides** all calendar/`DealEvent` call rows from `GET /calls`
- Calendar meetings may not appear on `/calls` at all (`type: 'meeting'`)
- Opening a list row that is a `DealEvent` historically 404’d on `GET /calls/:id` (R11 `10.1.7` — verify both Artifact and DealEvent ids)

Do not assume “Calls page = every Gong + Calendar event.”

---

## Marketing vs product

Public pages (`apps/web/components/marketing/*`, onboarding CRM picker) are **ahead of or beside** the shipped product.

Honest-ish today:

- HubSpot + Salesforce: live OAuth/sync/write-back (with the gaps above)
- Pipedrive + Zoho: **demo connectors**, not live OAuth
- Buyer portal / evaluations-as-POC: **roadmap** (`10.8`) — About page already says portal is not shipping
- Four-CRM “connect any CRM” onboarding: HubSpot/SF live; Pipedrive/Zoho import **sample** data

If you copy landing claims into a customer demo, you will oversell. Prefer Pricing/Hero copy that already says Pipedrive/Zoho are demo. Keep [`docs/r11-wbs.md`](../codebase/docs/r11-wbs.md) §10.9 in mind.

---

## JWT secrets

- **`JWT_SECRET`** signs access tokens ([`apps/api/src/lib/auth/jwt.ts`](../codebase/apps/api/src/lib/auth/jwt.ts)). In development only, a hardcoded fallback exists if unset. Production **throws** without it.
- **Use 32+ random characters.** `jsonwebtoken` HS256 and our own docs ([`GETTING_STARTED.md`](../codebase/GETTING_STARTED.md), [`ENV.md`](../codebase/ENV.md)) expect that. `.env.example` still has short placeholders (`change-me-in-production`) — **do not ship those**.
- **`TOKEN_ENCRYPTION_KEY`** encrypts stored OAuth tokens ([`apps/api/src/lib/crypto.ts`](../codebase/apps/api/src/lib/crypto.ts)). If missing, it falls back to hashing `JWT_SECRET`. Changing either key **invalidates** stored HubSpot/SF/Slack tokens (users must reconnect).
- OAuth state cookies also HMAC with `JWT_SECRET` ([`oauth-context.ts`](../codebase/apps/api/src/lib/integrations/oauth-context.ts)) with a **dev fallback string** if unset — set the env anyway.
- Playwright’s built-in webServer injects its own `JWT_SECRET` only for **processes it starts**. A separately running `pnpm dev` uses `codebase/.env`. Mixing two secrets = e2e 401s.

---

## Do not commit `.env`

[`codebase/.gitignore`](../codebase/.gitignore) ignores `.env`, `.env.local`, `.env.*.local`. Commit **`.env.example` only**.

`codebase/.env` holds Google client secrets, Gemini, HubSpot tokens, JWT keys. Never copy real values into handoff docs, PRs, or chat.

---

## PATs in chat history

If a **GitHub personal access token**, HubSpot private app token, Gemini key, or JWT secret was pasted into Cursor/ChatGPT/Slack:

1. **Revoke/rotate it in the provider UI** (GitHub → Settings → Developer settings → PAT; HubSpot private app; Google AI Studio; etc.)
2. Put the new value **only** in local `codebase/.env` (and the host secret store for beta)
3. Do not put the new token in this repo or in a follow-up chat “so the other person has it”

Chat logs are not a password manager. Assume anything pasted is burned.
