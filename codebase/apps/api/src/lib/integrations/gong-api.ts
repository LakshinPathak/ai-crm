import { log } from '../logger.js';
import { resolveWorkspaceAccessToken } from './workspace-tokens.js';

const GONG_API_BASE = 'https://api.gong.io';

type GongMonologue = {
  speakerId?: string;
  topic?: string;
  sentences?: Array<{ start?: number; end?: number; text?: string }>;
};

type GongTranscriptResponse = {
  callTranscripts?: Array<{
    callId?: string;
    transcript?: GongMonologue[];
  }>;
};

function formatTranscriptMonologues(monologues: GongMonologue[] | undefined): string {
  if (!monologues?.length) return '';
  const lines: string[] = [];
  for (const mono of monologues) {
    const speaker = mono.speakerId ?? 'Speaker';
    for (const sentence of mono.sentences ?? []) {
      if (sentence.text?.trim()) {
        lines.push(`${speaker}: ${sentence.text.trim()}`);
      }
    }
  }
  return lines.join('\n');
}

/** Demo transcript for local dev when Gong OAuth is not connected. */
export const DEMO_CALL_TRANSCRIPT = `Rep: Thanks for joining today. Can you walk me through your evaluation timeline?
Prospect: We need to finalize budget approval by end of Q3. Our CFO mentioned the price is a concern but we see strong ROI.
Prospect: Our champion on the IT side is fully aligned — she wants to move to a pilot next month.
Rep: Great. I'll send a revised proposal with phased rollout options.
Prospect: Also flagging that CompetitorX quoted lower, but we prefer your integration with HubSpot and Gong.`;

export async function fetchGongCallTranscript(
  workspaceId: string,
  callId: string,
): Promise<string | null> {
  const accessToken = await resolveWorkspaceAccessToken(workspaceId, 'gong');
  if (!accessToken) {
    if (process.env.NODE_ENV === 'development') {
      log('gong-api', 'no OAuth token — using demo transcript', { workspaceId, callId });
      return DEMO_CALL_TRANSCRIPT;
    }
    return null;
  }

  try {
    const res = await fetch(`${GONG_API_BASE}/v2/calls/transcript`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { callIds: [callId] },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      log('gong-api', 'transcript fetch failed', {
        callId,
        status: res.status,
        body: errText.slice(0, 200),
      });
      return null;
    }

    const data = (await res.json()) as GongTranscriptResponse;
    const entry = data.callTranscripts?.find((t) => t.callId === callId) ?? data.callTranscripts?.[0];
    const text = formatTranscriptMonologues(entry?.transcript);
    return text.length > 0 ? text : null;
  } catch (err) {
    log('gong-api', 'transcript fetch error', { callId, error: String(err) });
    return null;
  }
}
