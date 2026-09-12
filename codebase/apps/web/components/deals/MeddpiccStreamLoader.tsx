'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import type { MeddpiccLetter } from '@/lib/types';

export const MEDDPICC_STREAM_STEPS = [
  { letter: 'M', label: 'Metrics', message: 'Gathering quantified outcomes…' },
  { letter: 'E', label: 'Economic Buyer', message: 'Identifying budget owner…' },
  { letter: 'D1', label: 'Decision Criteria', message: 'Mapping evaluation criteria…' },
  { letter: 'D2', label: 'Decision Process', message: 'Tracing approval workflow…' },
  { letter: 'P', label: 'Paper Process', message: 'Reviewing procurement steps…' },
  { letter: 'I', label: 'Identify Pain', message: 'Extracting customer pain points…' },
  { letter: 'C1', label: 'Champion', message: 'Locating internal champion…' },
  { letter: 'C2', label: 'Competition', message: 'Assessing competitive landscape…' },
] as const;

export type MeddpiccStepStatus = 'pending' | 'active' | 'complete';

export type MeddpiccStreamStep = {
  letter: string;
  label: string;
  message: string;
  status: MeddpiccStepStatus;
};

export type { MeddpiccLetter };

export type MeddpiccStreamHandlers = {
  onStepStarted?: (letter: string) => void;
  onStepCompleted?: (letter: string) => void;
  onSectionCompleted?: (letter: string, section: MeddpiccLetter) => void;
  onSummaryCompleted?: (data: { dealId?: string; confidence?: number; completeness?: number }) => void;
  onError?: (message: string) => void;
};

export function createInitialStreamSteps(): MeddpiccStreamStep[] {
  return MEDDPICC_STREAM_STEPS.map((step) => ({
    letter: step.letter,
    label: step.label,
    message: step.message,
    status: 'pending',
  }));
}

function parseSseBuffer(buffer: string): { events: Array<{ event: string; data: string }>; remainder: string } {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = buffer.split('\n\n');
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (data) events.push({ event, data });
  }

  return { events, remainder };
}

export async function consumeMeddpiccStream(
  response: Response,
  handlers: MeddpiccStreamHandlers,
): Promise<void> {
  if (!response.ok) {
    throw new Error(`Stream failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Stream body unavailable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, remainder } = parseSseBuffer(buffer);
    buffer = remainder;

    for (const { event, data } of events) {
      const payload = JSON.parse(data) as Record<string, unknown>;

      switch (event) {
        case 'step.started':
          handlers.onStepStarted?.(String(payload.letter));
          break;
        case 'step.completed':
          handlers.onStepCompleted?.(String(payload.letter));
          break;
        case 'section.completed':
          handlers.onSectionCompleted?.(
            String(payload.letter),
            payload.section as MeddpiccLetter,
          );
          break;
        case 'summary.completed':
          handlers.onSummaryCompleted?.(payload as { dealId?: string; confidence?: number; completeness?: number });
          break;
        case 'summary.error':
          handlers.onError?.(String(payload.message ?? 'Generation failed'));
          break;
        default:
          break;
      }
    }
  }
}

export function MeddpiccStreamLoader({ steps }: { steps: MeddpiccStreamStep[] }) {
  const completed = steps.filter((s) => s.status === 'complete').length;

  return (
    <div className="ui-meddpicc-stream" aria-live="polite" aria-busy="true">
      <div className="ui-meddpicc-stream__header">
        <span className="ui-meddpicc-stream__title">Analyzing deal context</span>
        <span className="ui-meddpicc-stream__count">{completed}/{steps.length}</span>
      </div>
      <ul className="ui-meddpicc-stream__list">
        {steps.map((step) => (
          <li
            key={step.letter}
            className={`ui-meddpicc-stream__item ui-meddpicc-stream__item--${step.status}`}
          >
            <span className="ui-meddpicc-stream__icon" aria-hidden="true">
              {step.status === 'complete' ? (
                <Check size={14} strokeWidth={2.5} />
              ) : step.status === 'active' ? (
                <Loader2 size={14} className="ui-meddpicc-stream__spin" />
              ) : (
                <Circle size={14} />
              )}
            </span>
            <span className="ui-meddpicc-stream__text">
              <strong>{step.letter} — {step.label}</strong>
              <span>{step.status === 'active' ? step.message : step.status === 'complete' ? 'Complete' : 'Pending'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
