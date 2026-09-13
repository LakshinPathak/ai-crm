# 07 — Auth, invites, members, RBAC

**Who this is for:** anyone touching login, tenancy, or “who can do what.” **Do not copy Clerk snippets from older architecture docs.** The running system is **Google OAuth (or dev-login) → short-lived app JWT + httpOnly refresh cookie**.

Code:

| Area | Path |
|------|------|
| Public + member HTTP | `apps/api/src/modules/auth/index.ts`, `handlers.ts` |
| JWT / tenant / `requireAdmin` | `apps/api/src/lib/auth/jwt.ts` |
| Google token exchange | `apps/api/src/lib/auth/google.ts` |
| Sessions, exchange codes, refresh rotation | `apps/api/src/lib/auth/session.ts` |
| Cookies | `apps/api/src/lib/auth/cookies.ts` |
| OAuth `state` | `apps/api/src/lib/auth/oauth-state.ts` |
| Invite accept | `apps/api/src/lib/auth/invite.ts` |
| Internal worker token | `apps/api/src/lib/auth/internal-service.ts` |
| User / invite models | `packages/db` `user.ts`, `workspace-invite.ts`, `auth-session.ts` |
| Zod | `packages/shared/src/schemas/auth.ts` |
| Web token + Google URL | `apps/web/lib/auth.ts` |
| Sign-in / sign-up `?invite=` | `apps/web/app/(auth)/sign-in/page.tsx`, `sign-up/page.tsx` |
| Members UI | `apps/web/app/(dashboard)/settings/members/page.tsx` |

HTTP catalog for these routes is in **`06-api-surface.md` §2**. This file is the **behavior**.

---

## 1. Mental model

```
Browser (:3000)
  → GET API /api/v1/auth/google?invite=<optional>
  → Google
  → GET API /api/v1/auth/google/callback
  → redirect WEB /auth/callback?code=...&needsWorkspace=1?
  → POST API /api/v1/auth/exchange  { code }  (credentials: include)
  → access JWT in localStorage (`ai_crm_token`)
  → refresh token in cookie `ai_crm_refresh`
  → all product calls: Authorization: Bearer <access>
```

**Two tokens:**

| Token | Where | Lifetime | Use |
|-------|--------|----------|-----|
| Access JWT | `localStorage` key `ai_crm_token` | `JWT_ACCESS_EXPIRES_IN` default **15m** | `Authorization: Bearer` |
| Refresh | Cookie `ai_crm_refresh` | **30 days**, rotated on every refresh | `POST /api/v1/auth/refresh` |

JWT payload (`JwtPayload`): `{ sub, email, role, workspaceId? }`. On every request, `jwtMiddleware` **reloads the user from Mongo** and overwrites `role` / `workspaceId` from the DB so a demote or kick applies before the access token expires.

`req.tenant` is only set if the user has a `workspaceId`:

```ts
{ userId, workspaceId, role, email }
```

`requireWorkspace` returns **403 `WORKSPACE_REQUIRED`** when that is missing (user finished Google but has not created a workspace and did not accept an invite).

---

## 2. Google OAuth (the real login)

Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (must match the Google Cloud redirect URI, typically `http://localhost:4000/api/v1/auth/google/callback`). Web: `WEB_URL` / `NEXT_PUBLIC_API_URL`.

### 2.1 Start — `GET /api/v1/auth/google`

`startGoogleAuth`:

1. If query **`invite`** is a non-empty string, set httpOnly cookie **`ai_crm_oauth_invite`** (10 minutes, same flags as refresh).
2. Issue CSRF **`state`** (`uuid`) into cookie **`ai_crm_oauth_state`** (10 minutes).
3. Redirect to Google (`openid email profile`, `prompt=select_account`, `access_type=online`).

If Google env is missing, redirect to `{WEB_URL}/auth/callback?error=OAUTH_NOT_CONFIGURED`.

The Next sign-in/up pages pass invite through:

```ts
getGoogleSignInUrl(invite) // → `${API}/api/v1/auth/google?invite=...`
```

### 2.2 Callback — `GET /api/v1/auth/google/callback`

1. Require `code`. Missing → `BAD_REQUEST`.
2. Validate `state` against the cookie (then **clear** the state cookie). Mismatch → `INVALID_STATE`.
3. Exchange code with Google; load `userinfo`.
4. Upsert `User` by `googleId`. **Brand-new users are created with `role: 'admin'`** even if they have no workspace yet. That default is a User-schema default too (`packages/db` User `role` default `'admin'`). Invite accept **overwrites** role (below).
5. Read invite id from **`ai_crm_oauth_invite`**, then **clear** that cookie.
6. `acceptPendingWorkspaceInvite(user, inviteId)`.
7. If `user.isActive` is false **and** invite was not accepted → `FORBIDDEN` (deactivated).
8. Create a one-time **exchange code** (2 minutes, stored hashed in `AuthExchangeCode`).
9. Redirect to `{WEB_URL}/auth/callback?code=...` and `needsWorkspace=1` if still no `workspaceId`.

### 2.3 Exchange — `POST /api/v1/auth/exchange`

Body `{ code }` (`ExchangeCodeSchema`). Marks the code used, loads user, calls **`acceptPendingWorkspaceInvite(user)` again without invite id** (email match), then `createAuthSession` (JWT + refresh cookie). Returns `{ accessToken, needsWorkspace, user, workspace }`.

The double accept is intentional: cookie path covers the Google redirect; email path covers exchange if the cookie was lost.

---

## 3. Refresh cookie and logout

Cookie **`ai_crm_refresh`**: `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` only in production.

`createAuthSession`:

- Random 32-byte hex refresh token.
- Store **SHA-256 hash** on `AuthSession` with `userAgent` / `ipAddress`.
- Set cookie expiry = session expiry (30 days).

`POST /api/v1/auth/refresh`:

- Read cookie; lookup non-revoked, unexpired session.
- Inactive user → revoke session, 401.
- Else **rotate**: revoke old row, new token + cookie, new access JWT.

`POST /api/v1/auth/logout`: revoke matching session if present, `clearRefreshCookie`, `{ ok: true }`. Web also `clearToken()` in localStorage.

Web API client sends `credentials: 'include'` so the cookie is sent cross-origin to `:4000` (CORS `credentials: true` + `WEB_URL` origin).

---

## 4. Dev-login (local only)

`POST /api/v1/auth/dev-login` body `{ email, displayName }`.

- If `NODE_ENV === 'production'` → **404** `NOT_FOUND` (do not leak that the route exists as 403).
- Upsert user with `googleId: 'dev-${email}'`. New users: **`role: 'admin'`**.
- `acceptPendingWorkspaceInvite(user)` by email (no invite cookie).
- Immediate `createAuthSession` (no exchange-code hop). Response includes `accessToken` and duplicate `token` for older clients.

This is how Playwright and local smoke skip Google. **Never enable in production.**

---

## 5. Workspace bootstrap

`POST /api/v1/onboarding/workspace` (JWT, **no** workspace required):

- 409 if user already has `workspaceId`.
- Unique slug from name.
- Create `Workspace`; set `user.workspaceId`; **force `user.role = 'admin'`**.
- `seedWorkspaceData` (stages, sample deals, agents, etc.).
- Return a **fresh access JWT** so `workspaceId` is inside the token immediately.

Until this succeeds (or an invite is accepted), `requireWorkspace` blocks the product API.

---

## 6. Invite URL `?invite=`

### 6.1 Creating an invite (admin)

`POST /api/v1/workspace/members/invite` `{ email, role }` with `role` ∈ `admin` | `manager` | `member` (default **member**).

Guards:

| Code | When |
|------|------|
| `ALREADY_MEMBER` | Same email already in this workspace |
| `USER_IN_OTHER_WORKSPACE` | That email already has a **different** `workspaceId` (one workspace per user) |
| `INVITE_PENDING` | Pending invite for that email already exists |

Invite TTL **7 days**. `inviteUrl` in the JSON:

```
{WEB_URL}/sign-in?invite={invite.id}
```

There is **no email sender** in this path — the admin copies the URL. `GET /api/v1/workspace/invites` lists pending unexpired invites with the same URL shape.

### 6.2 How `?invite=` gets to the API

1. Human opens `/sign-in?invite=<MongoId>` or `/sign-up?invite=<MongoId>`.
2. Google button href includes `?invite=` on **`/api/v1/auth/google`**.
3. API stores id in **`ai_crm_oauth_invite`**.
4. After Google, `acceptPendingWorkspaceInvite(user, inviteId)` uses that id.

If someone signs in **without** the query param, accept still runs by **email** on callback (if cookie empty, inviteId is undefined → email lookup) and again on **exchange**.

### 6.3 `acceptPendingWorkspaceInvite`

`apps/api/src/lib/auth/invite.ts`:

```
if (user.workspaceId) return false;   // already in a tenant — invite ignored
```

Then:

- If `inviteId` is a valid ObjectId → load that **pending**, unexpired invite.
- Else → latest pending invite for `user.email` (lowercased).
- Email on the invite must match the Google/dev user (case-insensitive).
- Workspace document must still exist.
- Then: `user.workspaceId = invite.workspaceId`, **`user.role = invite.role`**, `user.isActive = true`, invite `status: 'accepted'`.

**Implications:**

- Invited **member** does **not** stay the User-schema default `admin`. Role comes from the invite.
- You cannot use an invite to join a second workspace; the user already has `workspaceId`.
- Stale/wrong invite id + matching email still works via the email branch on exchange.
- Invite id for a **different** email is rejected (`email !== user.email`).

---

## 7. Roles: `admin` / `manager` / `member`

Stored on **`User.role`** (enum). Also copied into JWT then **refreshed from DB** each request.

| Role | Intended (docs / UI) | What the API actually gates |
|------|----------------------|-----------------------------|
| **admin** | RevOps: workspace, invites, CRM, pipeline | `requireAdmin` only |
| **manager** | Team insights, team approvals | **Almost nothing.** Same HTTP as member except they fail `requireAdmin`. One agent executor filters `role: { $in: ['manager', 'admin'] }` for *data*, not routes. |
| **member** | AE/SE on assigned deals | Same as manager on HTTP |

`requireAdmin`:

```ts
if (req.tenant?.role !== 'admin') {
  403 FORBIDDEN 'Admin role required'
}
```

There is **no** `requireManager`. There is **no** “own deals only” filter on `GET /deals/board` unless the **client** passes `owner_id`.

### 7.1 Routes that actually require admin

From `auth/index.ts`, `onboarding/index.ts`, `pipeline/index.ts`:

| Method | Path |
|--------|------|
| `PATCH` | `/api/v1/workspace` |
| `PATCH` | `/api/v1/workspace/members/:userId` |
| `DELETE` | `/api/v1/workspace/members/:userId` |
| `GET` | `/api/v1/workspace/invites` |
| `POST` | `/api/v1/workspace/members/invite` |
| `PATCH` | `/api/v1/onboarding/step` |
| `POST` | `/api/v1/onboarding/complete` |
| `PATCH` | `/api/v1/pipeline/stages/:stageId` |

`GET /workspace/members` and `GET /onboarding/status` are **any member**.

Members UI (`settings/members/page.tsx`) hides invite/remove controls unless `me.user.role === 'admin'`. That is **UI only**. A member with a stolen JWT can still call CRM connect, delete agents, approve anything in the workspace, POST insights SQL stub, etc.

### 7.2 Spec RBAC vs reality

`docs/api-routes.md` matrix (deals own/team, approvals own, integrations admin, insights manager, …) is **aspirational**. Do not write tests that expect 403 on `POST /integrations/crm/connect/hubspot` as member — it will **200**.

---

## 8. Last-admin guard

`adminCount` = active users in the workspace with `role: 'admin'`.

**Demote** (`PATCH /workspace/members/:userId` `{ role }`):

- If the target is currently admin and the new role is not admin, and `adminCount <= 1` → **400 `LAST_ADMIN`**.

**Remove** (`DELETE /workspace/members/:userId`):

- Cannot remove **self** → **400 `CANNOT_REMOVE_SELF`**.
- If target is admin and they are the last admin → **400 `LAST_ADMIN`**.
- Else: `isActive = false`, **`workspaceId = null`**. They disappear from `listMembers` (`isActive: true` filter). JWT middleware then sees inactive **or** (if you only null workspace) wait: `isActive` is false → **401** on subsequent API calls (`User inactive or not found`).

Removing a member does **not** currently call `revokeAllUserSessions`; their refresh cookie may still exist until expiry, but access JWT checks `isActive` so they are locked out of the API immediately.

---

## 9. List / update / remove members

| Action | Who | Behavior |
|--------|-----|----------|
| List | Any workspace member | Active users, `toUserDto` (`id, email, displayName, avatarUrl, timezone, role`) |
| Update role | Admin | Zod `UpdateMemberSchema`; last-admin on demote |
| Remove | Admin | Soft disable + detach workspace |

There is no “leave workspace” for yourself (blocked by `CANNOT_REMOVE_SELF`). Last admin cannot leave by demoting/removing themselves through these endpoints.

---

## 10. `GET /me`

Always JWT. Returns `{ user, workspace }` (`workspace` null if none). Used by the web shell for role badges and onboarding gates.

---

## 11. Other auth (not Google user login)

| Mechanism | Use |
|-----------|-----|
| HMAC / Slack / Gong / HubSpot signatures | Inbound webhooks — **no user JWT** |
| Agent webhook HMAC | `POST /api/v1/agents/:agentId/webhook` |
| `INTERNAL_SERVICE_TOKEN` or `x-internal-token` | `POST /api/v1/internal/agent/execute`. Dev default `dev-internal-token-change-in-prod` if unset and `NODE_ENV=development` |
| `JWT_SECRET` | Signs access tokens. Dev fallback `dev-jwt-secret-change-me` if unset |

Do not confuse **Google user OAuth** (`/api/v1/auth/google`) with **Google Calendar / Google Chat OAuth** (`/api/v1/oauth/callback/...`). Those attach **integration connections** to an already-logged-in workspace.

---

## 12. Failure modes you will hit

| Symptom | Likely cause |
|---------|----------------|
| Google redirect `OAUTH_NOT_CONFIGURED` | Missing `GOOGLE_CLIENT_ID` / `GOOGLE_CALLBACK_URL` |
| `INVALID_STATE` | Cookie blocked, mixed localhost vs 127.0.0.1, or callback without the start request |
| Exchange `INVALID_CODE` | Code reused or >2 minutes old |
| 403 `WORKSPACE_REQUIRED` | Signed in, no invite accept, never created workspace |
| Invite does nothing | User already has `workspaceId`; or email mismatch |
| New Google user is admin with no team | Expected until they accept an invite or you change the User create default |
| Member can sync CRM | Expected until you add `requireAdmin` (and probably manager rules) on those routers |
| Playwright works, Google doesn’t | Dev-login vs missing Google env — different paths |

---

## 13. If you tighten RBAC later

Suggested, not implemented:

1. Add `requireRole('admin' | 'manager')` in `jwt.ts`.
2. Gate `integrations-crm` connect/disconnect/sync, `agents` write/run, `insights/sql`, MCP settings.
3. Optionally filter deals by `ownerId` for `member` unless admin/manager.
4. On approve: require `assignedTo === userId` or admin/manager (spec TC-M08-005).
5. Do not trust the members page hiding buttons as security.

Until then: **treat every workspace member as a full operator of that tenant’s data**, except the eight admin-only routes in §7.1 and the last-admin / self-remove guards.
