/** Domain events — in-process pub/sub (monolith). */

import { randomUUID } from 'node:crypto';

export type DomainEvent =
  | { type: 'activity.ingested'; workspaceId: string; dealId?: string; artifactId: string }
  | { type: 'deal.stage_changed'; workspaceId: string; dealId: string; from: string; to: string }
  | { type: 'deal.upserted'; workspaceId: string; dealId: string; source: 'crm' | 'manual' }
  | { type: 'approval.approved'; workspaceId: string; approvalId: string }
  | { type: 'agent.run.completed'; workspaceId: string; agentId: string; dealId?: string }
  | { type: 'crm.sync.completed'; workspaceId: string; connectionId: string }
  | { type: 'deal.ai_fields.updated'; workspaceId: string; dealId: string };

export interface EventEnvelope<T extends DomainEvent = DomainEvent> {
  id: string;
  occurredAt: string;
  workspaceId: string;
  payload: T;
}

export function createEventEnvelope<T extends DomainEvent>(
  payload: T,
  workspaceId: string,
  id = randomUUID(),
): EventEnvelope<T> {
  return {
    id,
    occurredAt: new Date().toISOString(),
    workspaceId,
    payload,
  };
}

const listeners = new Set<(event: EventEnvelope) => void>();

export function publishEvent(event: EventEnvelope): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeEvents(listener: (event: EventEnvelope) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
