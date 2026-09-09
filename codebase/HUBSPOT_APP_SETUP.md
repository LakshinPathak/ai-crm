# HubSpot app setup (AI CRM)

Project root: `codebase/` — `hsproject.json` + components in `src/app/`.

## Current deployment status (2026-09-09)

| Item | Status |
|------|--------|
| Project | **ai-crm** — build #3 deployed |
| HubSpot account | lakshin (247334345) |
| App ID | 52499141 (`ai_crm_app_v1`) |
| Webhooks | **Live** → `https://stupid-rice-feel.loca.lt/api/v1/webhooks/hubspot` |
| Serverless functions | **Removed** — account plan does not include them; webhooks hit backend directly |
| App install | Install manually in [HubSpot project UI](https://app.hubspot.com/developer-projects/247334345/project/ai-crm) |
| `hs secrets add` | Blocked — CLI key needs extra scopes (`hs account auth`) |

**Local tunnel:** `localtunnel` on port 4000 (`npx localtunnel --port 4000`). URL changes each restart — update `webhooks-hsmeta.json` + re-upload if it changes.

Copy **client secret** from HubSpot → Project → AI CRM → Auth → into `HUBSPOT_CLIENT_SECRET` in `.env` for v3 signature verification.

## CLI commands (verified)

```bash
hs project --help          # lists upload, deploy, dev, validate, …
hs project upload          # uploads files + creates build (auto-deploys by default)
hs project deploy          # deploy an existing build (use if you passed --skip-auto-deploy)
hs project dev             # local iteration
hs project validate        # lint before upload
```

Typical flow:

```bash
cd codebase
hs project validate
hs project upload -m "AI CRM webhook + endpoint"
```

Use `hs project upload --skip-auto-deploy` only if you want a manual `hs project deploy` step afterward.

## 1. UIDs (set — do not change after first upload)

| Component | UID |
|-----------|-----|
| App | `ai_crm_app_v1` |
| Webhooks | `ai_crm_webhooks_v1` |
| Endpoint function | `ai_crm_endpoint_v1` |

## 2. Webhook target URL (must be live before events matter)

Edit `src/app/webhooks/webhooks-hsmeta.json` → `config.settings.targetUrl`:

```
https://YOUR_PUBLIC_HOST/api/v1/webhooks/hubspot
```

**Local dev:** start ngrok first, then update the URL, then upload:

```bash
ngrok http 4000
# targetUrl → https://xxxx.ngrok-free.app/api/v1/webhooks/hubspot
```

Optional `.env` for signature URI host (if `Host` header differs from public URL):

```
HUBSPOT_WEBHOOK_PUBLIC_HOST=xxxx.ngrok-free.app
```

HubSpot sends events as soon as subscriptions are active — your backend must return `200`.

## 3. Secrets — two paths, two names

| Purpose | HubSpot (`hs secrets add`) | Backend (`.env`) | Same value? |
|---------|---------------------------|------------------|-------------|
| App function → AI CRM relay | `AI_CRM_WEBHOOK_SECRET` | `HUBSPOT_WEBHOOK_SECRET` | **Yes** |
| App function API base | `AI_CRM_API_URL` | `NEXT_PUBLIC_API_URL` (public HTTPS) | **Yes** |
| HubSpot → backend direct webhook v3 | — | `HUBSPOT_CLIENT_SECRET` | HubSpot app client secret |

```bash
cd codebase
hs secrets add AI_CRM_API_URL
hs secrets add AI_CRM_WEBHOOK_SECRET
```

```env
HUBSPOT_CLIENT_SECRET=...        # from HubSpot app — used for v3 signature
HUBSPOT_WEBHOOK_SECRET=...       # same string as AI_CRM_WEBHOOK_SECRET
```

## 4. Webhook signature verification

`POST /api/v1/webhooks/hubspot` (`backend/src/modules/webhooks/hubspot.ts`):

1. **Direct from HubSpot** — validates `X-HubSpot-Signature-v3` + `X-HubSpot-Request-Timestamp` using `HUBSPOT_CLIENT_SECRET` (HMAC-SHA256, 5‑minute replay window). Implemented in `backend/src/lib/hubspot-signature.ts`.
2. **Relay from HubSpot app function** — validates `X-AI-CRM-Secret` against `HUBSPOT_WEBHOOK_SECRET`.
3. **Dev only** — if no secrets configured and `NODE_ENV !== production`, accepts requests (for local curl tests).

Route uses `express.raw({ type: 'application/json' })` **before** global `express.json()` so the signed body bytes are preserved.

## 5. Endpoint function

- Meta: `src/app/functions/endpoint-function-hsmeta.json`
- Code: `src/app/functions/NewEndpointFunction.js`
- Forwards to `{AI_CRM_API_URL}/api/v1/webhooks/hubspot` with `X-AI-CRM-Secret`

## 6. Test webhook locally

```bash
# With secrets unset in dev, plain POST works:
curl -s -X POST http://localhost:4000/api/v1/webhooks/hubspot \
  -H 'Content-Type: application/json' \
  -H 'X-AI-CRM-Secret: your-shared-secret' \
  -d '{"events":[{"objectType":"deal","objectId":123,"subscriptionType":"object.creation"}]}'
```
