const API_VERSION = 'v59.0';
const REQUEST_TIMEOUT_MS = 20_000;

/** Host must be HTTPS on *.salesforce.com or *.force.com — never a caller-controlled arbitrary origin. */
const ALLOWED_INSTANCE_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(salesforce|force)\.com$/i;

export function parseSalesforceInstanceUrl(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('Salesforce instance URL is missing');
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('Salesforce instance URL is invalid');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Salesforce instance URL must use HTTPS');
  }
  if (url.username || url.password) {
    throw new Error('Salesforce instance URL must not include credentials');
  }
  if (url.port && url.port !== '443') {
    throw new Error('Salesforce instance URL must use port 443');
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_INSTANCE_HOST.test(host)) {
    throw new Error('Salesforce instance URL host is not allowlisted');
  }

  return `https://${host}`;
}

export function salesforceQueryPath(soql: string): string {
  return `/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`;
}

export async function salesforceRequest<T>(params: {
  instanceUrl: string;
  accessToken: string;
  path: string;
}): Promise<T> {
  const origin = parseSalesforceInstanceUrl(params.instanceUrl);
  if (!params.path.startsWith('/services/')) {
    throw new Error('Salesforce request path is not allowed');
  }

  const res = await fetch(`${origin}${params.path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      Accept: 'application/json',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Salesforce GET ${params.path} → ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`Salesforce GET ${params.path} → ${res.status}: ${salesforceErrorMessage(data, text)}`);
  }

  return data as T;
}

function salesforceErrorMessage(data: unknown, fallback: string): string {
  if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    const first = data[0] as { message?: string; errorCode?: string };
    return first.message ?? first.errorCode ?? fallback.slice(0, 300);
  }
  if (data && typeof data === 'object' && 'message' in data) {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return fallback.slice(0, 300);
}
