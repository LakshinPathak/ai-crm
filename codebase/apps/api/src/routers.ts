/** Central router exports for the modular monolith (`apps/api`). */
import { authPublicRouter, authProtectedRouter } from './modules/auth/index.js';
import { onboardingRouter } from './modules/onboarding/index.js';
import { dealsRouter } from './modules/deals/index.js';
import { meddpiccRouter } from './modules/meddpicc/index.js';
import { aiRouter } from './modules/ai/index.js';
import { focusRouter, homeRouter } from './modules/home/index.js';
import { approvalsRouter } from './modules/approvals/index.js';
import { agentTemplatesRouter, agentsRouter } from './modules/agents/index.js';
import { agentRunsRouter } from './modules/agent-runs/index.js';
import { integrationsCrmRouter } from './modules/integrations-crm/index.js';
import { integrationsChatRouter } from './modules/integrations-chat/index.js';
import { integrationsRouter } from './modules/integrations/index.js';
import { oauthRouter } from './modules/oauth/index.js';
import { webhooksRouter } from './modules/webhooks/index.js';
import { companiesRouter } from './modules/companies/index.js';
import { pipelineRouter } from './modules/pipeline/index.js';
import { insightsRouter } from './modules/insights/index.js';
import { marketingRouter } from './modules/marketing/index.js';
import { internalRouter } from './modules/internal/index.js';

export {
  authPublicRouter,
  authProtectedRouter,
  onboardingRouter,
  dealsRouter,
  meddpiccRouter,
  aiRouter,
  homeRouter,
  focusRouter,
  approvalsRouter,
  agentsRouter,
  agentTemplatesRouter,
  agentRunsRouter,
  integrationsCrmRouter,
  integrationsChatRouter,
  integrationsRouter,
  oauthRouter,
  webhooksRouter,
  companiesRouter,
  pipelineRouter,
  insightsRouter,
  marketingRouter,
  internalRouter,
};
