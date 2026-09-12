import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Workspace } from '@ai-crm/db';
import {
  CreateMcpServerSchema,
  MAX_MCP_SERVERS_PER_WORKSPACE,
  McpServerSchema,
  type McpServer,
} from '@ai-crm/shared';
import { log } from '../../lib/logger.js';

function paramId(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

function storedMcpServers(workspace: InstanceType<typeof Workspace>): McpServer[] {
  const raw = workspace.settings?.mcpServers;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const parsed = McpServerSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

async function loadWorkspace(req: AuthedRequest, res: Response) {
  const workspace = await Workspace.findById(req.tenant!.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    return null;
  }
  return workspace;
}

export async function listMcpServers(req: AuthedRequest, res: Response) {
  const workspace = await loadWorkspace(req, res);
  if (!workspace) return;
  res.json(storedMcpServers(workspace));
}

export async function createMcpServer(req: AuthedRequest, res: Response) {
  const parsed = CreateMcpServerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspace = await loadWorkspace(req, res);
  if (!workspace) return;

  const servers = storedMcpServers(workspace);
  if (servers.length >= MAX_MCP_SERVERS_PER_WORKSPACE) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Maximum of ${MAX_MCP_SERVERS_PER_WORKSPACE} MCP servers per workspace`,
      },
    });
    return;
  }

  const server: McpServer = {
    id: randomUUID(),
    name: parsed.data.name,
    url: parsed.data.url,
    status: 'disconnected',
  };

  workspace.set('settings.mcpServers', [...servers, server]);
  await workspace.save();

  log('settings', 'mcp_server_created', {
    workspaceId: String(workspace._id),
    serverId: server.id,
  });

  res.status(201).json(server);
}

export async function deleteMcpServer(req: AuthedRequest, res: Response) {
  const id = paramId(req.params.id);
  if (!id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'MCP server not found' } });
    return;
  }

  const workspace = await loadWorkspace(req, res);
  if (!workspace) return;

  const servers = storedMcpServers(workspace);
  const next = servers.filter((server) => server.id !== id);
  if (next.length === servers.length) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'MCP server not found' } });
    return;
  }

  workspace.set('settings.mcpServers', next);
  await workspace.save();

  log('settings', 'mcp_server_deleted', {
    workspaceId: String(workspace._id),
    serverId: id,
  });

  res.json({ deleted: true });
}
