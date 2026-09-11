import type { Request, Response } from 'express';
import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { Agent, AgentRun } from '@ai-crm/db';
import { getWebhookRawBody } from '../webhooks/hubspot-events.js';
import {
  ensureConnectionWebhookSecret,
  resolveWebhookSecret,
  verifyCrmWebhookSignature,
} from '../../lib/webhook-hmac.js';
import { log } from '../../lib/logger.js';
import { enqueueAgentRun } from './executor.js';

const AgentWebhookBodySchema = z.object({
  scope: z
    .object({
      dealId: z.string().optional(),
    })
    .optional(),
});

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function resolveAgentWebhookSecret(agent: InstanceType<typeof Agent>): string | null {
  const fromSettings = resolveWebhookSecret(agent.settings);
  if (fromSettings) return fromSettings;
  return resolveWebhookSecret(agent.triggerConfig);
}

export async function handleAgentWebhook(req: Request, res: Response) {
  const agentId = paramId(req.params.agentId);

  if (!agentId || !isValidObjectId(agentId)) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  const agent = await Agent.findById(agentId);
  if (!agent || !agent.isActive) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    return;
  }

  let secret = resolveAgentWebhookSecret(agent);
  if (!secret) {
    agent.settings = ensureConnectionWebhookSecret(
      (agent.settings as Record<string, unknown> | undefined) ?? {},
    );
    await agent.save();
    secret = resolveWebhookSecret(agent.settings);
  }

  if (!secret) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Webhook secret not configured' } });
    return;
  }

  const rawBody = getWebhookRawBody(req);
  const signature = req.header('x-agent-signature');
  if (!verifyCrmWebhookSignature(rawBody, signature, secret)) {
    log('agents', 'webhook auth failed', { agentId, reason: 'Invalid HMAC signature' });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
    return;
  }

  let body: z.infer<typeof AgentWebhookBodySchema> = {};
  if (rawBody.trim().length > 0) {
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } });
      return;
    }
    const parsed = AgentWebhookBodySchema.safeParse(json);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    body = parsed.data;
  }

  const scope = body.scope ?? {};
  const run = await AgentRun.create({
    workspaceId: agent.workspaceId,
    agentId: agent._id,
    dealId: scope.dealId,
    status: 'running',
    triggerType: 'manual',
    startedAt: new Date(),
    scope,
  });

  enqueueAgentRun({
    runId: run.id,
    workspaceId: agent.workspaceId.toString(),
    agentId: agent.id,
    templateSlug: agent.templateSlug ?? 'unknown',
    dealId: scope.dealId,
    userId: agent.ownerId?.toString() ?? '',
  });

  log('agents', 'webhook enqueued agent run', { agentId, runId: run.id });

  res.status(202).json({ run: { id: run.id, status: run.status, agentId: agent.id } });
}
