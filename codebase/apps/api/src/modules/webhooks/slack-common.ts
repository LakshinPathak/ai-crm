import type { Request, Response } from 'express';
import { IntegrationConnection } from '@ai-crm/db';

export function getRawBody(req: Request): string {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  return '';
}

export function sendEphemeral(res: Response, text: string): void {
  res.status(200).json({
    response_type: 'ephemeral',
    text,
  });
}

export async function workspaceIdForSlackTeam(teamId: string): Promise<string | null> {
  const conn = await IntegrationConnection.findOne({
    providerKey: 'slack',
    externalAccountId: teamId,
    status: 'connected',
  });
  return conn?.workspaceId?.toString() ?? null;
}
