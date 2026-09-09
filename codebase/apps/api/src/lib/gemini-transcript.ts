import { formatTranscriptsForPrompt, type DealTranscript } from './transcript-context.js';
import { generateGeminiJson } from './gemini-json.js';

export interface GeminiBuyingSignal {
  tagSlug: string;
  label: string;
  confidence: number;
  excerpt: string;
  artifactId?: string;
}

export interface GeminiObjection {
  slug: string;
  label: string;
  confidence: number;
  excerpt: string;
  talkTrack: string;
  artifactId?: string;
}

export async function analyzeBuyingSignalsFromTranscripts(input: {
  dealTitle: string;
  transcripts: DealTranscript[];
}): Promise<GeminiBuyingSignal[] | null> {
  if (input.transcripts.length === 0) return null;

  const prompt = `You are a B2B sales analyst. Detect positive buying signals in these Gong call transcripts.

Deal: ${input.dealTitle}

Transcripts:
${formatTranscriptsForPrompt(input.transcripts)}

Return ONLY valid JSON:
{
  "signals": [
    {
      "tagSlug": "budget-confirmed|urgency-timeline|champion-advocacy|executive-involvement",
      "label": "short label",
      "confidence": 0.0-1.0,
      "excerpt": "exact quote from transcript",
      "artifactId": "optional — use transcript index 1-based if unsure"
    }
  ]
}

Only include signals with clear evidence. Return empty signals array if none.`;

  const parsed = await generateGeminiJson<{ signals?: GeminiBuyingSignal[] }>(
    prompt,
    'gemini-buying-signals',
  );
  return parsed?.signals?.length ? parsed.signals : null;
}

export async function analyzeObjectionsFromTranscripts(input: {
  dealTitle: string;
  transcripts: DealTranscript[];
}): Promise<GeminiObjection[] | null> {
  if (input.transcripts.length === 0) return null;

  const prompt = `You are a B2B sales analyst. Detect pricing objections, competitor mentions, and negotiation concerns in these call transcripts.

Deal: ${input.dealTitle}

Transcripts:
${formatTranscriptsForPrompt(input.transcripts)}

Return ONLY valid JSON:
{
  "objections": [
    {
      "slug": "objection-pricing|objection-competition|objection-roi|objection-timing",
      "label": "Pricing|Competition|ROI|Timing",
      "confidence": 0.0-1.0,
      "excerpt": "exact quote",
      "talkTrack": "1-2 sentence recommended response"
    }
  ]
}

Only include objections with clear evidence.`;

  const parsed = await generateGeminiJson<{ objections?: GeminiObjection[] }>(
    prompt,
    'gemini-objections',
  );
  return parsed?.objections?.length ? parsed.objections : null;
}
