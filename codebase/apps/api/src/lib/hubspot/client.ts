import { resolveWorkspaceAccessToken } from '../integrations/workspace-tokens.js';

const BASE = 'https://api.hubapi.com';

let lastRequestAt = 0;
let searchLastAt = 0;

const GENERAL_INTERVAL_MS = 110; // ~9 req/sec (under 100/10sec)
const SEARCH_INTERVAL_MS = 260; // ~4 req/sec for search

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getHubSpotAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN ?? process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    throw new Error(
      'HUBSPOT_ACCESS_TOKEN is required. Create a Private App in HubSpot → Settings → Integrations → Private Apps.',
    );
  }
  return token;
}

export function hasHubSpotAccessToken(): boolean {
  return Boolean(process.env.HUBSPOT_ACCESS_TOKEN ?? process.env.HUBSPOT_PRIVATE_APP_TOKEN);
}

export async function resolveHubSpotAccessToken(workspaceId?: string): Promise<string> {
  if (workspaceId) {
    const workspaceToken = await resolveWorkspaceAccessToken(workspaceId, 'hubspot');
    if (workspaceToken) {
      return workspaceToken;
    }
  }
  return getHubSpotAccessToken();
}

async function throttle(isSearch: boolean) {
  const now = Date.now();
  const interval = isSearch ? SEARCH_INTERVAL_MS : GENERAL_INTERVAL_MS;
  const last = isSearch ? searchLastAt : lastRequestAt;
  const wait = Math.max(0, interval - (now - last));
  if (wait > 0) await sleep(wait);
  if (isSearch) searchLastAt = Date.now();
  else lastRequestAt = Date.now();
}

export type HubSpotResponse<T> = T & { status?: string; message?: string };

export async function hubspotRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { isSearch?: boolean; accessToken?: string; workspaceId?: string },
): Promise<T> {
  await throttle(opts?.isSearch ?? path.includes('/search'));
  const token =
    opts?.accessToken ??
    (opts?.workspaceId ? await resolveHubSpotAccessToken(opts.workspaceId) : getHubSpotAccessToken());
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: HubSpotResponse<T>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? text.slice(0, 300);
    throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${msg}`);
  }
  return data as T;
}

export async function batchCreate<T extends string>(
  objectType: T,
  inputs: Array<{ properties: Record<string, string> }>,
): Promise<{ results: Array<{ id: string }> }> {
  if (inputs.length === 0) return { results: [] };
  const chunks: typeof inputs[] = [];
  for (let i = 0; i < inputs.length; i += 100) {
    chunks.push(inputs.slice(i, i + 100));
  }
  const results: Array<{ id: string }> = [];
  for (const chunk of chunks) {
    const res = await hubspotRequest<{ results: Array<{ id: string }> }>(
      'POST',
      `/crm/v3/objects/${objectType}/batch/create`,
      { inputs: chunk },
    );
    results.push(...res.results);
  }
  return { results };
}

const ASSOCIATION_TYPE_IDS: Record<string, number> = {
  deal_to_company: 5,
  deal_to_contact: 3,
  company_to_contact: 2,
  note_to_deal: 214,
  task_to_deal: 216,
};

export async function batchAssociate(
  fromType: string,
  toType: string,
  pairs: Array<{ from: { id: string }; to: { id: string }; type: string }>,
) {
  if (pairs.length === 0) return;
  const inputs = pairs.map((p) => ({
    from: p.from,
    to: p.to,
    types: [
      {
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: ASSOCIATION_TYPE_IDS[p.type] ?? 1,
      },
    ],
  }));
  const chunks: typeof inputs[] = [];
  for (let i = 0; i < inputs.length; i += 100) {
    chunks.push(inputs.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    await hubspotRequest(
      'POST',
      `/crm/v4/associations/${fromType}/${toType}/batch/create`,
      { inputs: chunk },
    );
  }
}

export async function searchObjects<T>(
  objectType: string,
  body: { filterGroups?: unknown[]; properties?: string[]; limit?: number; after?: string },
  workspaceId?: string,
): Promise<{ results: T[]; paging?: { next?: { after: string } } }> {
  return hubspotRequest('POST', `/crm/v3/objects/${objectType}/search`, body, {
    isSearch: true,
    workspaceId,
  });
}

export async function listAll<T>(
  objectType: string,
  properties: string[],
  limit = 100,
): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  do {
    const page = await hubspotRequest<{ results: T[]; paging?: { next?: { after: string } } }>(
      'GET',
      `/crm/v3/objects/${objectType}?limit=${limit}&properties=${properties.join(',')}${after ? `&after=${after}` : ''}`,
    );
    all.push(...page.results);
    after = page.paging?.next?.after;
  } while (after);
  return all;
}
