import { z } from 'zod';

export const MAX_MCP_SERVERS_PER_WORKSPACE = 20;

export const McpServerStatusSchema = z.enum(['connected', 'disconnected']);

export const McpServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  status: McpServerStatusSchema,
});

function isAllowedMcpUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('file:')) return false;
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('stdio:');
}

export const CreateMcpServerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(isAllowedMcpUrl, { message: 'URL must be http(s) or stdio:' }),
});

export type McpServer = z.infer<typeof McpServerSchema>;
export type McpServerStatus = z.infer<typeof McpServerStatusSchema>;
export type CreateMcpServer = z.infer<typeof CreateMcpServerSchema>;
