export interface AgentRunContext {
  runId: string;
  workspaceId: string;
  agentId: string;
  templateSlug: string;
  dealId?: string;
  userId: string;
}

export interface AgentRunResult {
  status: 'completed' | 'awaiting_approval' | 'failed';
  output: Record<string, unknown>;
  creditsUsed: number;
  error?: string;
}
