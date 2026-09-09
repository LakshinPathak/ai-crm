/**
 * HubSpot endpoint function — receives CRM events and forwards to AI CRM backend.
 * Secrets (set via `hs secrets add`):
 *   AI_CRM_API_URL          e.g. https://api.yourdomain.com
 *   AI_CRM_WEBHOOK_SECRET   shared secret for backend auth
 */
exports.main = async (context) => {
  const apiUrl = process.env.AI_CRM_API_URL ?? 'https://stupid-rice-feel.loca.lt';
  const secret = process.env.AI_CRM_WEBHOOK_SECRET ?? '';

  const events = Array.isArray(context.body) ? context.body : context.body ? [context.body] : [];

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/webhooks/hubspot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-AI-CRM-Secret': secret } : {}),
        'X-HubSpot-Portal-Id': String(context.accountId ?? ''),
      },
      body: JSON.stringify({
        source: 'hubspot-app-function',
        events,
        receivedAt: new Date().toISOString(),
      }),
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    return {
      statusCode: response.status,
      body: { forwarded: true, processed: events.length, backend: body },
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: { error: 'Failed to forward to AI CRM', message: err instanceof Error ? err.message : String(err) },
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
