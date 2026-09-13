# 09 — CRM integrations (HubSpot, Salesforce, demo CRMs, Calendar)

CRM is a **mirror**, not a replacement. System of record stays in HubSpot / Salesforce. Local `Deal` / `Company` rows plus `ExternalRecord` hold the mapping. Agents never call HubSpot/Salesforce SDKs directly; write-back goes through deal PATCH + approval apply.

Two layers:

1. **Connector package** `packages/integrations/crm/` — discovery (pipelines, stages, owners, paged deals). Live adapter: HubSpot only. Everyone else: `DemoCrmConnector`.
2. **API sync / write-back** `apps/api/src/lib/hubspot/` and `apps/api/src/lib/salesforce/` — actual import and PATCH. Salesforce **does not** go through the connector registry for full sync.

HTTP surface: `apps/api/src/modules/integrations-crm/` mounted at `/api/v1/integrations/crm` (`apps/api/src/create-app.ts`). OAuth callbacks: `apps/api/src/modules/oauth/`.

---

## Capability matrix (as implemented)

| Provider | OAuth | Full sync | Stage maps | User maps | `ExternalRecord` | Write-back PATCH | Incremental webhooks |
|----------|-------|-----------|------------|-----------|------------------|------------------|----------------------|
| **HubSpot** | Yes | Companies, deals, notes, tasks | Yes (saved on connection; used in sync + write-back) | Yes (`hubspot_owner_id` → `Deal.ownerId`) | Deal rows | `PATCH /crm/v3/objects/deals/:id` | **Yes** — HubSpot payload only; processor skips other providers |
| **Salesforce** | Yes | Accounts + Opportunities (SOQL, limit 200) | Yes (StageName ↔ internal stage) | Not applied on SF sync (owner stays syncing user) | Deal rows | `PATCH /sobjects/Opportunity/:id` | Route exists; **processor no-ops** unless `providerKey === 'hubspot'` |
| **Pipedrive** | No | Demo records | Demo discovery | Demo owners | Not from live API | No | No |
| **Zoho CRM** | No (env IDs only flip connect “live” flag; no adapter) | Demo records | Demo discovery | Demo owners | Not from live API | No | No |

`CrmProvider` union: `packages/integrations/crm/src/types.ts` (`hubspot | pipedrive | zoho | salesforce`).

---

## Connection model

`IntegrationConnection` — `packages/db/src/models/integration-connection.ts`

Unique `(workspaceId, providerKey)`. `status`: pending | connected | disconnected | error. `settings` (Mixed) holds:

- `mode`: `'demo' | 'live'`
- `stageMappings[]`: `{ stageExternalId, stageExternalLabel, pipelineExternalId?, internalStageId }`
- `userMappings[]`: `{ externalUserId, externalEmail?, internalUserId }`
- `webhookSecret`, `imported` (demo idempotency), `syncProgress`, `lastHubSpotSync` / `lastSalesforceSync`, `incrementalSyncErrorCount`, `lastWriteBackError`
- Salesforce: `instanceUrl`

Tokens: `apps/api/src/lib/integrations/tokens.ts` + `workspace-tokens.ts` (refresh). Not stored in plaintext on the connection document’s `encrypted*` fields in the happy path — OAuth uses `saveTokens`.

**Primary CRM:** `Workspace.primaryCrmConnectionId` (`packages/db/src/models/workspace.ts`). Set **once** on first successful HubSpot or Salesforce OAuth via `setPrimaryCrmIfUnset` in `apps/api/src/modules/oauth/handlers.ts` (only if the field is missing/null). Connecting a second CRM does not automatically switch primary.

`connectProvider` disconnects other **connected** CRM rows in the workspace before connecting the chosen provider (`updateMany` → `disconnected`) — one “active” CRM connection for `/status` and `/sync`.

---

## HubSpot

### OAuth

- Config: `HUBSPOT_CLIENT_ID` + `HUBSPOT_CLIENT_SECRET` (`hubspotOAuthConfigured` in `apps/api/src/lib/integrations/hubspot-oauth.ts`).
- Scopes default: contacts/companies/deals read, **deals write**, deal schemas, oauth. Override: `HUBSPOT_OAUTH_SCOPES`.
- Authorize: `https://app.hubspot.com/oauth/authorize`
- Redirect: `{API_URL}/api/v1/oauth/callback/crm/hubspot`
- Start: `startCrmOAuth` → `buildHubSpotAuthUrl`; connect endpoint returns `{ mode: 'oauth', authUrl }` when configured.
- Callback: `handleCrmOAuthCallback` exchanges code, upserts connection `mode: 'live'`, `ensureConnectionWebhookSecret`, `saveTokens`, `setPrimaryCrmIfUnset`.
- Fallback live without OAuth app: `HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_PRIVATE_APP_TOKEN` (`hasHubSpotAccessToken`, connector `resolveAccessToken`).

### Full sync

`syncHubSpotToWorkspace` — `apps/api/src/lib/hubspot/sync.ts`, invoked from `syncCrm` when `providerKey === 'hubspot'` and a token exists.

1. `ensurePipelineStages`
2. `GET /crm/v3/pipelines/deals` — first pipeline’s stages; positional fallback if no mapping
3. Search companies (`name`, `domain`, `industry`) — upsert `Company` with `crmProvider: 'hubspot'`
4. Search deals (`dealname`, `amount`, `dealstage`, `closedate`, `hs_lastmodifieddate`, `hubspot_owner_id`) — company via v4 associations
5. Stage: `settings.stageMappings` else index into local open stages
6. Owner: `userMappings` vs `hubspot_owner_id`; else the user who triggered sync
7. Search notes + tasks; associate to deals; skip if already imported (`crmExternalId`)
8. Upsert `ExternalRecord` `{ providerKey: 'hubspot', entityType: 'deal', externalId, internalId }`
9. Heuristic win probability from amount; sentiment from that score

HTTP client: `apps/api/src/lib/hubspot/client.ts`. Connector discovery (list pipelines/stages/owners/deals): `packages/integrations/crm/src/adapters/hubspot.ts`. Registry: `packages/integrations/crm/src/registry.ts` — live HubSpot **only** when `providerKey === 'hubspot' && mode === 'live' && token`.

### Write-back

`pushCrmFieldUpdateToHubSpot` — `apps/api/src/lib/hubspot/crm-field-write-back.ts`

- Resolves HubSpot deal id: `Deal.crmExternalId` if `crmProvider === 'hubspot'`, else `ExternalRecord`.
- Maps patch: `title` → `dealname`, `amount` → `amount`, `stageId` → `dealstage` **only if** a stage mapping exists (otherwise skips stage, logs).
- `PATCH /crm/v3/objects/deals/{externalId}` with `{ properties }`.
- Never throws (local apply already succeeded). Failures stored as `settings.lastWriteBackError`.

Triggered from:

- `apps/api/src/modules/deals/handlers.ts` — `pushLocalDealChangeToCrm` (local deal PATCH / stage move)
- `apps/api/src/modules/approvals/decide.ts` — after applying `crm_field_update`

---

## Salesforce

### OAuth

- `SALESFORCE_CLIENT_ID` + `SALESFORCE_CLIENT_SECRET` (`apps/api/src/lib/integrations/salesforce-oauth.ts`).
- Login host: `SALESFORCE_LOGIN_URL` (default `https://login.salesforce.com`).
- Scopes default: `api refresh_token`.
- Redirect: `{API_URL}/api/v1/oauth/callback/crm/salesforce`
- Token response **stores `instance_url`** on connection settings (required for REST). Synthetic 2h access-token TTL so refresh actually runs (SF tokens omit `expires_in`).
- Extra status: `GET /integrations/crm/salesforce/status`.

### Full sync

`syncSalesforceToWorkspace` — `apps/api/src/lib/salesforce/sync.ts`

SOQL (limit 200):

```text
SELECT Id, Name, Amount, StageName, Probability, CloseDate, IsClosed, IsWon,
       AccountId, Account.Name, LastModifiedDate FROM Opportunity
```

- Upsert `Company` from Account
- Upsert `Deal` (`crmProvider: 'salesforce'`, `crmExternalId: Opportunity.Id`)
- Status from `IsWon` / `IsClosed`
- Stage from `stageMappings` (match `stageExternalId` or `stageExternalLabel` to `StageName`); else closed-won/lost stages; else probability bucket into open stages
- `ExternalRecord` deal mapping + `metadata.stageName`
- **Does not** import notes/tasks (unlike HubSpot)

`syncCrm` takes this path when the connected provider is `salesforce` and `resolveWorkspaceAccessToken(..., 'salesforce')` succeeds.

There is **no** `SalesforceCrmConnector` in `packages/integrations/crm`. Stage/owner **discovery** for Salesforce therefore uses `DemoCrmConnector` unless you already saved mappings. Saved mappings still apply during SOQL sync and write-back.

### Write-back

`pushOpportunityUpdateToSalesforce` — `apps/api/src/lib/salesforce/opportunity-write-back.ts`

- Needs connected SF row + `instanceUrl` + access token
- Resolves Opportunity id via `crmProvider === 'salesforce'` + `crmExternalId` or `ExternalRecord`
- Fields: `Name`, `Amount`, `CloseDate` (from `expectedCloseDate`), `StageName` from mapping
- `PATCH /services/data/v59.0/sobjects/Opportunity/{id}`
- Same fire-and-forget + `lastWriteBackError` pattern as HubSpot
- Same call sites as HubSpot (`pushLocalDealChangeToCrm` always tries **both** functions; each no-ops if that CRM is not connected / not mapped)

Client: `apps/api/src/lib/salesforce/client.ts`.

---

## Pipedrive / Zoho — demo connectors

- Catalog: `crmProviderCatalog()` in `apps/api/src/modules/integrations-crm/handlers.ts` — all four `status: 'available'`, default `mode: 'demo'`.
- `startCrmOAuth` returns a URL **only** for HubSpot and Salesforce. Pipedrive/Zoho never get `authUrl`.
- Connect without HS/SF OAuth: `mode = hasCredentials ? 'live' : 'demo'`. Zoho “credentials” = `ZOHO_CLIENT_ID` && `ZOHO_CLIENT_SECRET` (does **not** implement OAuth exchange). Pipedrive has no live credential branch (`false`).
- Sync fallback: `syncDemoCrmFromProvider` (`apps/api/src/lib/crm-demo-sync.ts`) + `getDemoCrmRecords` (`apps/api/src/lib/crm-demo-data.ts`) — sample companies/deals/notes keyed by provider; idempotent via `settings.imported`.
- Package demo adapter: `packages/integrations/crm/src/adapters/demo.ts` + `demo-data.ts`. Used for `GET .../:provider/pipelines|stages|owners` when not live HubSpot.
- Discovery helpers: `apps/api/src/lib/crm-discovery-demo.ts` (`suggestInternalStageId`).

Onboarding UI (`apps/web/app/onboarding/page.tsx`) and Settings integrations treat demo as a first-class mode (badge + sample import).

---

## Stage maps and user maps

API (`apps/api/src/modules/integrations-crm/index.ts`):

| Method | Path | Handler |
|--------|------|---------|
| GET | `/integrations/crm/mappings/stages` | Merge CRM stages (live HubSpot or demo) with `PipelineStage` + saved `stageMappings`; suggest internals by label |
| PATCH | `/integrations/crm/mappings/stages` | Persist `body.mappings` on the **connected** connection |
| GET | `/integrations/crm/mappings/users` | CRM owners + workspace users + saved `userMappings` |
| PATCH | `/integrations/crm/mappings/users` | Persist user maps |

Onboarding polls `GET /integrations/crm/sync/status` and `GET /integrations/crm/sync-status` (incremental queue stats) after connect (`apps/web/lib/types.ts` — `CrmStageMappingRow`, incremental types).

HubSpot **user maps are used on full sync**. Salesforce sync ignores `userMappings` today.

---

## `ExternalRecord`

Model: `packages/db/src/models/external-record.ts`

- Unique: `(workspaceId, providerKey, entityType, externalId)`
- `entityType`: `deal | company | contact | user` (sync currently writes **deal**)
- `internalId`, optional `externalRevision`, `lastSyncedAt`, `metadata`

Used to:

- Bind HubSpot/Salesforce ids independently of `Deal.crmExternalId`
- Incremental HubSpot patches (`findDealForExternalId` in `apps/api/src/lib/queues/crm-incremental.ts`)
- Write-back id resolution

Local deal also stores `crmExternalId` + `crmProvider` (`packages/db/src/models/deal.ts`).

---

## Google Calendar REST → `DealEvent`

Not a CRM, but the deal **Events** tab depends on it.

- OAuth: `apps/api/src/lib/integrations/google-calendar-oauth.ts` — `calendar.readonly`, redirect `{API_URL}/api/v1/oauth/callback/calendar/google_calendar`. Client id/secret: `GOOGLE_CALENDAR_*` or `GOOGLE_*`.
- Connect / status / disconnect / sync: `apps/api/src/modules/integrations/handlers.ts` (`providerKey: 'google_calendar'`).
- Queue: `apps/api/src/lib/queues/google-calendar-sync.ts` (`GOOGLE_CALENDAR_SYNC_QUEUE`). Enqueued after OAuth and from Settings “sync”.
- Pull: `GET https://www.googleapis.com/calendar/v3/calendars/primary/events` (`timeMin` −7d, `timeMax` +60d, `singleEvents`, max 100).
- Match: `matchDeal` — exact title (case-insensitive) or **exactly one** open deal whose title (≥8 chars) is contained in the event summary. Ambiguous / short titles → `unmatched`.
- Upsert `DealEvent` (`packages/db/src/models/deal-event.ts`): unique sparse `(workspaceId, source, externalId)`, `source: 'google_calendar'`, `type: 'meeting'`.
- UI: `apps/web/components/deals/tabs/EventsTab.tsx`.

---

## Incremental webhooks — HubSpot-only processor

### Ingest

1. **Connection webhook** `POST /api/v1/webhooks/crm/:connectionId` — `apps/api/src/modules/webhooks/crm.ts`  
   - Connection must be a CRM provider (`hubspot | salesforce | zoho | pipedrive`) and not disconnected.  
   - HMAC `X-CRM-Signature` via `apps/api/src/lib/webhook-hmac.ts` (required in production).  
   - Body parsed as **HubSpot webhook JSON** (`parseHubSpotWebhookPayload` / `partitionHubSpotEvents` in `hubspot-events.ts`).  
   - Deal events → `addCrmIncrementalJob`. Contacts counted, not processed.

2. **HubSpot app webhook** `POST /api/v1/webhooks/hubspot` — `apps/api/src/modules/webhooks/hubspot.ts` + `create-app.ts` (`express.raw`)  
   - Verifies v3 / internal secret (`apps/api/src/lib/hubspot-signature.ts`).  
   - **Does not enqueue incremental jobs** — ack + log only. Point HubSpot subscriptions that should mutate deals at `/webhooks/crm/:connectionId`.

### Processor

`processCrmIncremental` — `apps/api/src/lib/queues/crm-incremental.ts`

```ts
if (providerKey !== 'hubspot') {
  // log unsupported provider — skipped
  return;
}
```

HubSpot deal **creation**: require existing local mapping; upsert `ExternalRecord`; `dispatchDealCreated`.  
HubSpot deal **propertyChange**: patch amount / stage (via `stageMappings`) / name; upsert `ExternalRecord`; `dispatchDealStageChanged` when stage changes. Unmapped deals/stages are no-ops.

Queue name: `crm-incremental`. Job id: portal/object/event hash. Stats: `GET /integrations/crm/sync-status`.

Salesforce/Pipedrive/Zoho can hit the same HTTP route, but **nothing is applied**.

---

## REST cheat sheet (`/api/v1/integrations/crm`)

| Method | Path |
|--------|------|
| GET | `/providers` |
| GET | `/status` |
| GET | `/salesforce/status` |
| POST | `/connect/:provider` |
| DELETE | `/connect/:provider` |
| POST | `/sync` |
| GET | `/sync/status` |
| GET | `/sync-status` |
| GET/PATCH | `/mappings/stages` |
| GET/PATCH | `/mappings/users` |
| GET | `/:provider/pipelines` |
| GET | `/:provider/stages` |
| GET | `/:provider/owners` |

OAuth: `GET /api/v1/oauth/callback/crm/:provider` (`apps/api/src/modules/oauth/index.ts`).

Scripts (HubSpot ops, not the product UI): `apps/api/scripts/hubspot-sync.ts`, `hubspot-seed.ts`, `hubspot-test.ts`. Setup docs: `codebase/HUBSPOT_APP_SETUP.md`, `docs/crm-connectors.md` (aspirational; prefer this file for **what ships**).

---

## Data flow

```
Connect CRM
  HubSpot/SF OAuth → IntegrationConnection live + tokens
                   → primaryCrmConnectionId if unset
  Pipedrive/Zoho   → IntegrationConnection demo

POST /sync
  hubspot + token     → syncHubSpotToWorkspace → Deal/Company/Note/Task + ExternalRecord
  salesforce + token  → syncSalesforceToWorkspace → Deal/Company + ExternalRecord
  else                → syncDemoCrmFromProvider

Local deal PATCH / approval crm_field_update
  → HubSpot deals PATCH (if mapped)
  → Salesforce Opportunity PATCH (if mapped)

POST /webhooks/crm/:id  (HubSpot JSON)
  → crm-incremental queue
  → process only if providerKey === hubspot
```
