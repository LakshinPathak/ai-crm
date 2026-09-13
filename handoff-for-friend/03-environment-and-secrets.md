# Environment variables and secrets — AI CRM

Companion to [02-local-setup.md](./02-local-setup.md). Sources of truth: [`codebase/.env.example`](../codebase/.env.example), [`codebase/ENV.md`](../codebase/ENV.md), plus **every `process.env.*` usage** in `codebase/` at the time this was written.

**Never copy real values from `codebase/.env` into this file, git, tickets, or chat.** Examples below are **placeholders only**. `.env` is gitignored at repo root and under `codebase/`.

---

## How secrets are loaded

| Consumer | File | Mechanism |
|----------|------|-----------|
| Express API | `codebase/.env` | `dotenv` in `apps/api/src/server.ts` (`../../../.env` from `apps/api/src`) |
| API scripts (`smoke`, `populate-demo`, HubSpot CLIs) | `codebase/.env` | `dotenv` from `apps/api/scripts` |
| Next.js | `apps/web/.env*` | Next.js env loading — **does not** auto-read `codebase/.env` |
| Playwright | process env + config defaults | `apps/web/playwright.config.ts` |
| HubSpot serverless function | HubSpot secrets | `AI_CRM_API_URL`, `AI_CRM_WEBHOOK_SECRET` in `src/app/functions/NewEndpointFunction.js` (HubSpot project, not `pnpm dev`) |

Copy:

```bash
cd codebase
cp .env.example .env
```

`NODE_ENV=production` **enables** secure cookies, **disables** `/auth/dev-login`, and **requires** `JWT_SECRET` / `TOKEN_ENCRYPTION_KEY` / `INTERNAL_SERVICE_TOKEN` (no development fallbacks).

---

## Required for local CRM (no OAuth, no Gemini)

These get a working board, onboarding, demo seed, smoke, and e2e (dev-login). Integrations show as unconfigured until you add provider apps.

| Variable | Local example (not a secret to reuse) | Required? | Used for |
|----------|----------------------------------------|-----------|----------|
| `MONGODB_URI` | `mongodb://localhost:27017/ai-crm` | **Yes** — API will not start without it | Mongoose (`packages/db`). Atlas: `mongodb+srv://…/ai-crm` |
| `NODE_ENV` | `development` | **Yes** (set it) | `development` vs `production` (dev-login, cookie `secure`, webhook strictness, JWT/crypto fallbacks) |
| `JWT_SECRET` | **≥32 random chars** — **not** `change-me-in-production` | **Yes in production.** Dev fallback string exists in code but jsonwebtoken v9 still needs **256-bit (32+ byte) HS256 secrets** when you set a short one | Access JWTs (`apps/api/src/lib/auth/jwt.ts`); HMAC for **integration OAuth state cookie** (`oauth-context.ts`) |
| `TOKEN_ENCRYPTION_KEY` | **≥32 random chars**, **different** from JWT if possible | **Strongly required** if you store OAuth tokens. Falls back to `JWT_SECRET`, then a **dev-only** hardcoded hash input | See [Token encryption](#token-encryption-token_encryption_key) |
| `PORT` | `4000` | Optional (default 4000) | API listen port |
| `API_URL` | `http://localhost:4000` | **Yes for OAuth** (redirect URIs). Default `http://localhost:${PORT}` in OAuth helpers | Self-links: HubSpot/Salesforce/Slack/Teams/Gong/GChat/Calendar **callback URLs** |
| `WEB_URL` | `http://localhost:3000` | **Yes for CORS + redirects** | `cors({ origin: WEB_URL, credentials: true })`; post-OAuth frontend; Slack/Teams message links |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | **Yes if not using code default** | Browser → API (inlined at Next build/dev). Scripts use it as smoke/demo base URL |
| `NEXT_PUBLIC_SSE_URL` | `http://localhost:4000` | Same as API URL locally | MEDDPICC (and similar) SSE |
| `INTERNAL_SERVICE_TOKEN` | long random; example name `dev-internal-token-change-in-prod` is **dev-only** | **Yes in production.** Dev fallback matches that example string | `Authorization: Bearer` or `x-internal-token` on `/api/v1/internal/*` |

### JWT expiry knobs

| Variable | Default in example | Actually used? |
|----------|--------------------|----------------|
| `JWT_ACCESS_EXPIRES_IN` | `15m` | **Yes** — `signAccessToken` (`jwt.ts`) |
| `JWT_EXPIRES_IN` | `7d` in `.env.example` / ENV.md | **Not read in code.** Refresh sessions are **30 days** (`session.ts` `REFRESH_TTL_MS`). Safe to omit |

Generate local secrets (print to terminal, paste into `.env`, do not commit):

```bash
openssl rand -base64 32
```

---

## Auth — Google OAuth (login to the product)

Needed only for **“Sign in with Google”**. Local **email dev-login** does not use these.

| Variable | Optional locally? | Where to get it | Notes |
|----------|-------------------|-----------------|--------|
| `GOOGLE_CLIENT_ID` | Yes (empty = Google login broken) | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application) | Used by login **and** as fallback for Google Chat + Google Calendar OAuth if dedicated Chat/Calendar clients are unset |
| `GOOGLE_CLIENT_SECRET` | Yes | Same client | Never expose to the browser |
| `GOOGLE_CALLBACK_URL` | Set when using Google login | Must match Console **Authorized redirect URIs** | Local default: `http://localhost:4000/api/v1/auth/google/callback` |

Also add **Authorized JavaScript origins** for `http://localhost:3000` (or your `WEB_URL`). Production: callback `https://<api-host>/api/v1/auth/google/callback` and matching `WEB_URL` / `API_URL`.

Login scopes in code: `openid email profile` (`apps/api/src/lib/auth/google.ts`).

---

## HubSpot CRM

All **optional** for demo mode (`populate-demo` uses in-app dummy connect). Needed for **real** HubSpot OAuth, private-app scripts, and webhooks.

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `HUBSPOT_CLIENT_ID` | Yes | OAuth app. Pair with secret; `hubspotOAuthConfigured()` |
| `HUBSPOT_CLIENT_SECRET` | Yes | OAuth token exchange; also used when verifying HubSpot webhook signatures (v3 / client-secret style) |
| `HUBSPOT_OAUTH_SCOPES` | Yes | Override default scopes: contacts/companies/deals read, deals write, deal schemas, `oauth` |
| `HUBSPOT_ACCESS_TOKEN` | Yes | **Private app** PAT for scripts / connector fallback (`hubspot:seed`, `hubspot:sync`, `hubspot:test`, CRM adapter, field write-back) |
| `HUBSPOT_PRIVATE_APP_TOKEN` | Yes | **Alias** of `HUBSPOT_ACCESS_TOKEN` (same code paths) |
| `HUBSPOT_WEBHOOK_SECRET` | Yes | Webhook HMAC when not using client-secret verification |
| `AI_CRM_WEBHOOK_SECRET` | Yes | Fallback for HubSpot **and** Gong signature helpers (also HubSpot function) |
| `HUBSPOT_WEBHOOK_PUBLIC_HOST` | Yes | Public host used when registering / verifying webhook URLs (no `http://localhost` for HubSpot cloud) |

OAuth redirect built as: `{API_URL}/api/v1/oauth/callback/crm/hubspot`.

Webhook HTTP: `POST /api/v1/webhooks/hubspot` (raw body). In non-production, missing `HUBSPOT_CLIENT_SECRET` is treated more loosely; **production** is strict.

**Rotate `HUBSPOT_ACCESS_TOKEN` / private app tokens immediately if they were pasted in chat.** Revoke in HubSpot → Private apps → rotate token. Treat like a PAT.

---

## Salesforce CRM

Optional. Demo connect in `populate-demo` does not need a real Connected App.

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `SALESFORCE_CLIENT_ID` | Yes | Connected App consumer key. Both ID + secret required to enable OAuth |
| `SALESFORCE_CLIENT_SECRET` | Yes | Consumer secret |
| `SALESFORCE_LOGIN_URL` | Yes | Default `https://login.salesforce.com`. Sandbox: `https://test.salesforce.com` |
| `SALESFORCE_OAUTH_SCOPES` | Yes | Default `api refresh_token` |

Redirect: `{API_URL}/api/v1/oauth/callback/crm/salesforce`.

Access tokens are stored encrypted; Salesforce responses often omit `expires_in`, so the API uses a **synthetic ~2h TTL** to drive refresh (`salesforce-oauth.ts`).

---

## Zoho CRM

Optional. Not in `.env.example` but **read in code**.

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `ZOHO_CLIENT_ID` | Yes | Together with secret, marks Zoho OAuth as configured (`integrations-crm/handlers.ts`) |
| `ZOHO_CLIENT_SECRET` | Yes | Pair with client ID |

`populate-demo` still demo-connects `zoho` without these.

---

## Slack / Microsoft Teams / Google Chat

Optional. Core CRM works without chat delivery. Slack **slash commands** and **Approve/Reject** buttons need the **signing secret**, not just OAuth.

### Slack

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `SLACK_CLIENT_ID` | Yes | Slack app OAuth. Both ID + secret required |
| `SLACK_CLIENT_SECRET` | Yes | OAuth |
| `SLACK_OAUTH_SCOPES` | Yes | Comma-separated. Default in code: `chat:write,commands,users:read,channels:read`. `.env.example` also mentions `groups:read` |
| `SLACK_SIGNING_SECRET` | Yes for **webhooks** | Slack **Signing Secret** (Basic Information). Verifies `POST /api/v1/webhooks/slack/interactions` and `…/slack/commands`. Empty → **401** on those routes |
| `SLACK_APPROVALS_CHANNEL_ID` | Yes | Default Slack channel ID (e.g. `C0123456789`) for agent approval notifications when the agent has no channel/DM |

Redirect: `{API_URL}/api/v1/oauth/callback/chat/slack`.

Slack app config (when going beyond local): Interactivity URL → `/api/v1/webhooks/slack/interactions`; slash commands → `/api/v1/webhooks/slack/commands`.

### Microsoft Teams

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `TEAMS_CLIENT_ID` | Yes | Azure app registration. Pair with secret |
| `TEAMS_CLIENT_SECRET` | Yes | OAuth |
| `TEAMS_OAUTH_SCOPES` | Yes | Default: `offline_access` + Graph `ChannelMessage.Send`, `Chat.ReadWrite`, `Team.ReadBasic.All` |

Redirect: `{API_URL}/api/v1/oauth/callback/chat/teams`. Authority: `login.microsoftonline.com/common` (multitenant).

### Google Chat

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `GOOGLE_CHAT_CLIENT_ID` | Yes | Dedicated Chat OAuth client; **falls back to `GOOGLE_CLIENT_ID`** |
| `GOOGLE_CHAT_CLIENT_SECRET` | Yes | Falls back to `GOOGLE_CLIENT_SECRET` |
| `GOOGLE_CHAT_OAUTH_SCOPES` | Yes | Default `https://www.googleapis.com/auth/chat.bot` |

Redirect: `{API_URL}/api/v1/oauth/callback/chat/google_chat`. Add this URI on the Google OAuth client.

`WEB_URL` is interpolated into chat deep links (`chat-delivery.ts`).

---

## Gong

Optional. Call ingest / webhooks need a Gong app.

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `GONG_CLIENT_ID` | Yes | OAuth; both ID + secret required |
| `GONG_CLIENT_SECRET` | Yes | OAuth |
| `GONG_WEBHOOK_SECRET` | Yes | Fallback HMAC when the connection has no `settings.webhookSecret` |
| `AI_CRM_WEBHOOK_SECRET` | Yes | Further fallback in `gong-signature.ts` |

Redirect: `{API_URL}/api/v1/oauth/callback/gong`.

Webhook: `POST /api/v1/webhooks/gong/:connectionId` (raw body). Non-production may skip strict verify if no secret; **production should set a secret**.

---

## Google Gemini (AI)

Optional for **core CRM UI**. Required for real MEDDPICC refresh, NL agent draft, scoring, several agent executors, artifact embeddings (otherwise stub vectors).

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `GEMINI_API_KEY` | Yes for UI; **needed for AI** | [Google AI Studio](https://aistudio.google.com/apikey). Server-side only — never `NEXT_PUBLIC_` |
| `GEMINI_MODEL` | Yes | Default `gemini-3.5-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | Yes | Default `text-embedding-004` (`embed-artifact` queue) |

Without a key, many agents still run with **heuristic / stub** paths (lower “creditsUsed” in some executors).

**Rotate the Gemini key if it was pasted in chat** (AI Studio → disable old key, create new, update `.env` / host env).

---

## Google Calendar

Optional. Separate from login OAuth (extra scopes).

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `GOOGLE_CALENDAR_CLIENT_ID` | Yes | Falls back to `GOOGLE_CLIENT_ID` |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Yes | Falls back to `GOOGLE_CLIENT_SECRET` |
| `GOOGLE_CALENDAR_OAUTH_SCOPES` | Yes | Default `https://www.googleapis.com/auth/calendar.readonly` |

Redirect: `{API_URL}/api/v1/oauth/callback/calendar/google_calendar`.

Enable Calendar API on the Google Cloud project. Queue name in API: `google-calendar-sync`.

UI copy if unset: *Set `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` (or `GOOGLE_CLIENT_ID`/`SECRET`)*.

---

## Webhooks (generic CRM HMAC)

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `WEBHOOK_HMAC_SECRET` | Yes | Fallback HMAC for CRM webhooks when `connection.settings.webhookSecret` is unset (`webhook-hmac.ts`) |

Per-connection secrets are generated (32-byte hex) and stored on the connection. Per-agent inbound: `POST /api/v1/agents/:agentId/webhook` with `x-agent-signature` (HMAC); secret lives on the agent after creation — not a global env var.

---

## Scripts, e2e, smoke extras

| Variable | Optional? | Purpose |
|----------|-----------|---------|
| `DEMO_USER_EMAIL` | Yes | `populate-demo` default `demo@ai-crm.test`; smoke default `smoke@ai-crm.test`; HubSpot sync script default `demo@ai-crm.test` |
| `SMOKE_TEST_TOKEN` | Yes | Bearer token when `NODE_ENV !== development` (dev-login skipped) |
| `PLAYWRIGHT_BASE_URL` | Yes | Playwright `baseURL`, default `http://localhost:3000` |
| `PLAYWRIGHT_API_URL` | Yes | E2E helper / some specs, default `NEXT_PUBLIC_API_URL` or `:4000` |
| `PLAYWRIGHT_SKIP_WEBSERVER` | Yes | Do not spawn API/web; reuse already running servers |
| `CI` | Set by GitHub Actions | Playwright: `forbidOnly`, 2 retries, 1 worker, **do not** reuse existing servers |

Playwright config **defaults** (only if unset): JWT/encryption strings long enough for jsonwebtoken, `INTERNAL_SERVICE_TOKEN=dev-internal-token-change-in-prod`. It **forwards** `GEMINI_API_KEY` if present.

---

## HubSpot UI extension (not `pnpm dev`)

`codebase/src/app/functions/NewEndpointFunction.js`:

| Variable | Purpose |
|----------|---------|
| `AI_CRM_API_URL` | Backend the HubSpot function calls (placeholder default in source is a tunnel-style URL — **override** in HubSpot secrets) |
| `AI_CRM_WEBHOOK_SECRET` | Shared secret to the API |

Configure in HubSpot project secrets, not necessarily `codebase/.env`.

---

## Removed / not used

| Variable | Note |
|----------|------|
| `REDIS_URL` | **Removed.** Jobs use MongoDB `background_jobs` |

---

## What is optional vs required (summary)

**Always set locally:** `MONGODB_URI`, `NODE_ENV=development`, **32+ char** `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY`, `WEB_URL`, `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SSE_URL`, `PORT` (or accept 4000).

**Optional for a friend to “click around”:** everything Google OAuth, HubSpot, Salesforce, Zoho, Slack, Teams, Google Chat, Gong, Gemini, Calendar, webhook HMAC, Slack signing secret, HubSpot PAT.

**Optional but needed for that feature:**

| You want | Minimum extra env |
|----------|-------------------|
| Google login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` + Console URIs |
| Real HubSpot sync/OAuth | `HUBSPOT_CLIENT_ID` + `SECRET` (OAuth) and/or `HUBSPOT_ACCESS_TOKEN` (private app) |
| HubSpot/Gong/Slack webhooks from the internet | Public `API_URL` / `HUBSPOT_WEBHOOK_PUBLIC_HOST` + matching secrets |
| Slack interactivity / slash commands | `SLACK_SIGNING_SECRET` (+ OAuth for posting) |
| Teams / GChat delivery | `TEAMS_*` or Chat/Google client pair |
| Gong calls | `GONG_CLIENT_ID` + `SECRET` (+ webhook secret) |
| Calendar sync | Google Calendar client or reuse login Google client + Calendar scope/API |
| MEDDPICC / agents / embeddings | `GEMINI_API_KEY` |
| Production | Strong JWT + encryption keys, `INTERNAL_SERVICE_TOKEN`, `NODE_ENV=production`, TLS Mongo, production OAuth callbacks |

---

## Token encryption (`TOKEN_ENCRYPTION_KEY`)

**Where:** `apps/api/src/lib/crypto.ts`  
**Algorithm:** AES-256-GCM  
**Key derivation:** `SHA-256(TOKEN_ENCRYPTION_KEY ?? JWT_SECRET)` → 32-byte key.  
**If both unset and `NODE_ENV === development`:** hashes a **fixed** development string (insecure; do not use in prod).  
**If both unset in production:** throws `TOKEN_ENCRYPTION_KEY or JWT_SECRET is required`.

**What is encrypted (MongoDB `integration_connections`):**

| Field | Content |
|-------|---------|
| `encryptedAccessToken` | Provider access token (HubSpot, Salesforce, Slack, Teams, Google Chat, Gong, Calendar, …) |
| `encryptedRefreshToken` | Refresh token when the provider issued one |

Format: `base64(iv):base64(authTag):base64(ciphertext)` (12-byte IV).

Write/read path: `apps/api/src/lib/integrations/tokens.ts` (`saveTokens`, `getAccessToken`, `refreshIfNeeded`).

**This key does not encrypt:** session JWTs (those use `JWT_SECRET`), refresh cookies (hashed SHA-256 in `auth_sessions`), Gemini keys (env only), HubSpot PAT in env (used as-is for scripts).

### Rotation of `TOKEN_ENCRYPTION_KEY`

1. Changing the key **invalidates all stored OAuth blobs** (decrypt will throw / fail).
2. Users must **reconnect** each integration (new tokens encrypted with the new key).
3. Old ciphertext cannot be migrated without the old key.
4. Prefer a **stable** encryption key from day one; do not casually copy JWT into it after tokens exist unless they were encrypted with that same JWT fallback.

Keep `TOKEN_ENCRYPTION_KEY` **independent** of `JWT_SECRET` so you can rotate session signing without wiping CRM connections.

---

## What to rotate if PATs / secrets were pasted in chat

Assume **anything pasted is compromised**. Rotate in the **provider console**, then update **local `.env` and any deployed env** (Vercel, Railway, GitHub Actions secrets). Do **not** put the new values in chat.

| If this was exposed | Rotate / revoke here | Then update |
|---------------------|----------------------|-------------|
| **GitHub PAT** / clone token / `gh` token | GitHub → Settings → Developer settings → Personal access tokens → revoke | New clone via SSH or fine-grained PAT stored only in a password manager |
| **Gemini API key** | Google AI Studio → delete/rotate key | `GEMINI_API_KEY` |
| **Google OAuth client secret** | Cloud Console → Credentials → reset secret | `GOOGLE_CLIENT_SECRET` (and Chat/Calendar if they shared the client) |
| **JWT_SECRET** | Generate new 32+ char secret | All API instances; **all users must sign in again** (old JWTs invalid). OAuth **state cookies** also HMAC with this secret |
| **TOKEN_ENCRYPTION_KEY** | New 32+ char key | All API instances; **reconnect every OAuth integration** |
| **INTERNAL_SERVICE_TOKEN** | New random token | All callers of `/api/v1/internal` |
| **HubSpot private app token** (`HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_PRIVATE_APP_TOKEN`) | HubSpot private app → rotate | `.env` / CI |
| **HubSpot OAuth secret** | HubSpot developer app | `HUBSPOT_CLIENT_SECRET`; users re-OAuth |
| **HubSpot / Gong / generic webhook secrets** | Provider + new HMAC | `HUBSPOT_WEBHOOK_SECRET`, `GONG_WEBHOOK_SECRET`, `WEBHOOK_HMAC_SECRET`, `AI_CRM_WEBHOOK_SECRET` |
| **Salesforce** consumer secret | Connected App | `SALESFORCE_CLIENT_SECRET`; reconnect |
| **Slack** client secret + **signing secret** | Slack app | `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`; reconnect workspace |
| **Teams** client secret | Azure app registration | `TEAMS_CLIENT_SECRET`; reconnect |
| **Gong** client secret | Gong app | `GONG_CLIENT_SECRET`; reconnect |
| **Zoho** client secret | Zoho API console | `ZOHO_CLIENT_SECRET` |
| **MongoDB Atlas password** | Atlas user | `MONGODB_URI` (never paste the full URI with password) |
| **Smoke / demo emails** | Not secrets | Fine to leave; they are test identities |

After rotation: restart API (and web if `NEXT_PUBLIC_*` changed). Confirm `GET /health`. Have each workspace **reconnect** CRM/chat/Gong/calendar if encryption key or OAuth client secrets changed.

Also: search chat logs and **delete** messages that contained secrets; check `~/.bash_history` / agent transcripts if a PAT was used in a command.

---

## Production checklist (from ENV.md + deploy-beta)

- [ ] Unique 32+ `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY`
- [ ] Atlas `mongodb+srv` with TLS; tight network access
- [ ] `NODE_ENV=production`
- [ ] Google OAuth production callback = `API_URL` + `/api/v1/auth/google/callback`
- [ ] `WEB_URL` / `API_URL` / `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SSE_URL` all HTTPS and consistent (CORS)
- [ ] Rotate `INTERNAL_SERVICE_TOKEN` away from the example string
- [ ] No API keys in `NEXT_PUBLIC_*` or client bundles
- [ ] Slack signing secret if Slack webhooks are public
- [ ] Never commit `.env`, `client_secret*.json`, or HubSpot private app tokens

---

## Quick map: env → code

| Concern | Primary files |
|---------|----------------|
| JWT | `apps/api/src/lib/auth/jwt.ts`, `session.ts` |
| Token encryption | `apps/api/src/lib/crypto.ts`, `integrations/tokens.ts`, `packages/db/.../integration-connection.ts` |
| CORS / frontend origin | `apps/api/src/create-app.ts`, `oauth-context.ts`, `modules/auth/handlers.ts` |
| Google login | `apps/api/src/lib/auth/google.ts` |
| HubSpot OAuth | `apps/api/src/lib/integrations/hubspot-oauth.ts` |
| Salesforce | `apps/api/src/lib/integrations/salesforce-oauth.ts` |
| Slack / Teams / GChat | `slack-oauth.ts`, `teams-oauth.ts`, `google-chat-oauth.ts` |
| Gong | `gong-oauth.ts`, `gong-signature.ts` |
| Calendar | `google-calendar-oauth.ts` |
| Gemini | `apps/api/src/lib/gemini.ts`, `gemini-json.ts`, `ai-scoring.ts`, agent executors, `queues/embed-artifact.ts` |
| Internal API | `apps/api/src/lib/auth/internal-service.ts` |
