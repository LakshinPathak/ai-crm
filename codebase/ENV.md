# Environment Variables

Copy `codebase/.env.example` to `codebase/.env` and fill in values. **Never commit `.env`** — it is gitignored.

## Required (local dev)

| Variable | Example | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/ai-crm` | MongoDB connection. Use Atlas `mongodb+srv://user:pass@cluster.mongodb.net/ai-crm` for cloud |
| `JWT_SECRET` | `dev-secret-change-in-prod-32chars` | Signs session JWTs. Use 32+ random chars in production |
| `TOKEN_ENCRYPTION_KEY` | `32-char-minimum-encryption-key!!` | AES-256-GCM for stored OAuth tokens. Falls back to `JWT_SECRET` if unset |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Web app → API base URL (browser-visible) |
| `NEXT_PUBLIC_SSE_URL` | `http://localhost:4000` | SSE endpoints for MEDDPICC streaming |
| `WEB_URL` | `http://localhost:3000` | Frontend origin (OAuth redirects, CORS) |
| `API_URL` | `http://localhost:4000` | API self-reference |
| `PORT` | `4000` | API listen port |
| `NODE_ENV` | `development` | `development` \| `production` |

## Auth — Google OAuth

| Variable | Where to get it |
|----------|-----------------|
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/v1/auth/google/callback` (add to Google authorized redirect URIs) |
| `JWT_ACCESS_EXPIRES_IN` | Optional, default `15m` |
| `JWT_EXPIRES_IN` | Optional, default `7d` |

## AI — Google Gemini

| Variable | Where to get it |
|----------|-----------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Optional, default `gemini-3.5-flash-lite` |

Required for MEDDPICC refresh, agent runs, and AI scoring. Core CRM UI works without it.

## Integrations (optional)

### HubSpot CRM

| Variable | Purpose |
|----------|---------|
| `HUBSPOT_CLIENT_ID` | OAuth app client ID |
| `HUBSPOT_CLIENT_SECRET` | OAuth app secret |
| `HUBSPOT_ACCESS_TOKEN` | Private app token (dev/scripts) |
| `HUBSPOT_WEBHOOK_SECRET` | Webhook signature verification |
| `HUBSPOT_WEBHOOK_PUBLIC_HOST` | Public URL for webhook registration |

### Slack

| Variable | Purpose |
|----------|---------|
| `SLACK_CLIENT_ID` | Slack app OAuth |
| `SLACK_CLIENT_SECRET` | Slack app secret |

### Gong

| Variable | Purpose |
|----------|---------|
| `GONG_CLIENT_ID` | Gong OAuth |
| `GONG_CLIENT_SECRET` | Gong OAuth |

## Internal / security

| Variable | Purpose |
|----------|---------|
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth for internal agent endpoints. Change in production |

## Minimal `.env` for first run

```env
MONGODB_URI=mongodb://localhost:27017/ai-crm
NODE_ENV=development
JWT_SECRET=change-me-use-random-32-plus-characters
TOKEN_ENCRYPTION_KEY=change-me-use-random-32-plus-characters
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SSE_URL=http://localhost:4000
PORT=4000
API_URL=http://localhost:4000
WEB_URL=http://localhost:3000
INTERNAL_SERVICE_TOKEN=dev-internal-token-change-in-prod
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

## Production checklist

- [ ] Generate strong `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` (32+ chars each)
- [ ] Use MongoDB Atlas with TLS (`mongodb+srv://`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure Google OAuth with production callback URL
- [ ] Set `WEB_URL` and `API_URL` to production domains
- [ ] Rotate `INTERNAL_SERVICE_TOKEN`
- [ ] Never expose `GEMINI_API_KEY` or OAuth secrets to the browser

## Not used (removed)

| Variable | Note |
|----------|------|
| `REDIS_URL` | **Removed** — background jobs use MongoDB `background_jobs` collection |
