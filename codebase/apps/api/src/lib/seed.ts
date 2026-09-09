import { Types } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  Agent,
  AgentRun,
  Approval,
  Artifact,
  Company,
  Deal,
  DealBlocker,
  DealEvent,
  DealMeddpicc,
  DealProject,
  DealTeamRequest,
  Note,
  PipelineStage,
  Task,
} from '@ai-crm/db';
import { buildDefaultMeddpicc } from './meddpicc-defaults.js';
import { DEMO_CALL_TRANSCRIPT } from './integrations/gong-api.js';

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Qualification', position: 0, color: '#6366f1', stageType: 'open' as const },
  { name: 'Discovery', position: 1, color: '#8b5cf6', stageType: 'open' as const },
  { name: 'Proposal', position: 2, color: '#a855f7', stageType: 'open' as const },
  { name: 'Negotiation', position: 3, color: '#d946ef', stageType: 'open' as const },
  { name: 'Closed Won', position: 4, color: '#22c55e', stageType: 'closed_won' as const },
  { name: 'Closed Lost', position: 5, color: '#ef4444', stageType: 'closed_lost' as const },
];

export async function ensurePipelineStages(workspaceId: import('mongoose').Types.ObjectId) {
  const existing = await PipelineStage.countDocuments({ workspaceId });
  if (existing > 0) return;
  await PipelineStage.insertMany(
    DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s, workspaceId, isDefault: true })),
  );
}

const AGENT_TEMPLATES = [
  { templateSlug: 'deal-focus', name: 'Deal Focus', category: 'process' as const },
  { templateSlug: 'risk-scanner', name: 'Risk Scanner', category: 'risk' as const },
  { templateSlug: 'post-call', name: 'Post-Call Processor', category: 'process' as const },
  { templateSlug: 'meddpicc-synth', name: 'MEDDPICC Synthesizer', category: 'signals' as const },
];

export async function seedWorkspaceData(workspaceId: Types.ObjectId, ownerId: Types.ObjectId) {
  const existing = await PipelineStage.countDocuments({ workspaceId });
  if (existing > 0) return;

  await ensurePipelineStages(workspaceId);
  const stages = await PipelineStage.find({ workspaceId }).sort({ position: 1 });

  const companies = await Company.insertMany([
    { workspaceId, name: 'Acme Robotics', domain: 'acmerobotics.com', industry: 'Manufacturing' },
    { workspaceId, name: 'Nova Health', domain: 'novahealth.io', industry: 'Healthcare' },
    { workspaceId, name: 'Bright Finance', domain: 'brightfinance.com', industry: 'Fintech' },
  ]);

  const [qual, discovery, proposal] = stages;
  const now = new Date();

  const deals = await Deal.insertMany([
    {
      workspaceId,
      companyId: companies[0]._id,
      title: 'Acme — Enterprise Platform',
      amount: 120000,
      stageId: proposal._id,
      position: 0,
      ownerId,
      sentiment: 'green',
      isHot: true,
      winProbability: 72,
      meddpiccCompleteness: 65,
      blockerCount: 1,
      lastActivityAt: now,
      expectedCloseDate: new Date(now.getTime() + 14 * 86400000),
    },
    {
      workspaceId,
      companyId: companies[1]._id,
      title: 'Nova — Pilot Expansion',
      amount: 45000,
      stageId: discovery._id,
      position: 0,
      ownerId,
      sentiment: 'yellow',
      winProbability: 48,
      meddpiccCompleteness: 40,
      lastActivityAt: now,
    },
    {
      workspaceId,
      companyId: companies[2]._id,
      title: 'Bright — Security Review',
      amount: 89000,
      stageId: qual._id,
      position: 0,
      ownerId,
      sentiment: 'red',
      winProbability: 22,
      blockerCount: 2,
      lastActivityAt: now,
    },
  ]);

  await Note.insertMany([
    { workspaceId, dealId: deals[0]._id, authorId: ownerId, body: 'Champion confirmed budget for Q3.' },
    { workspaceId, dealId: deals[1]._id, authorId: ownerId, body: 'Waiting on legal review of BAA.' },
  ]);

  await Task.insertMany([
    { workspaceId, dealId: deals[0]._id, title: 'Send revised proposal', assigneeId: ownerId, status: 'open' },
    { workspaceId, dealId: deals[2]._id, title: 'Schedule security questionnaire call', assigneeId: ownerId, status: 'open' },
  ]);

  await DealEvent.insertMany([
    {
      workspaceId,
      dealId: deals[0]._id,
      title: 'Discovery — stakeholder alignment',
      startAt: new Date(now.getTime() - 2 * 86400000),
      endAt: new Date(now.getTime() - 2 * 86400000 + 3600000),
      type: 'call',
      source: 'gong',
    },
    {
      workspaceId,
      dealId: deals[1]._id,
      title: 'Technical deep-dive with IT',
      startAt: new Date(now.getTime() - 5 * 86400000),
      endAt: new Date(now.getTime() - 5 * 86400000 + 2700000),
      type: 'call',
      source: 'gong',
    },
    {
      workspaceId,
      dealId: deals[2]._id,
      title: 'Executive sponsor check-in',
      startAt: new Date(now.getTime() - 8 * 86400000),
      endAt: new Date(now.getTime() - 8 * 86400000 + 1800000),
      type: 'call',
      source: 'gong',
    },
  ]);

  await DealProject.insertMany([
    { workspaceId, dealId: deals[0]._id, title: 'POC — workflow automation', status: 'active' },
    { workspaceId, dealId: deals[1]._id, title: 'Pilot rollout', status: 'planning' },
  ]);

  await DealTeamRequest.insertMany([
    {
      workspaceId,
      dealId: deals[0]._id,
      title: 'Legal review of MSA',
      department: 'Legal',
      status: 'in_progress',
    },
    {
      workspaceId,
      dealId: deals[2]._id,
      title: 'Security questionnaire support',
      department: 'Security',
      status: 'open',
    },
  ]);

  await DealBlocker.insertMany([
    { workspaceId, dealId: deals[0]._id, title: 'Legal review pending', severity: 'medium', ownerId },
    { workspaceId, dealId: deals[2]._id, title: 'Security questionnaire incomplete', severity: 'high', ownerId },
    { workspaceId, dealId: deals[2]._id, title: 'No executive sponsor yet', severity: 'critical', ownerId },
  ]);

  await Artifact.insertMany([
    {
      workspaceId,
      dealId: deals[0]._id,
      type: 'call',
      source: 'gong',
      sourceId: 'seed-call-acme-discovery',
      title: 'Discovery — stakeholder alignment',
      occurredAt: new Date(now.getTime() - 2 * 86400000),
      durationSeconds: 3600,
      contentHash: createHash('sha256').update(DEMO_CALL_TRANSCRIPT).digest('hex'),
      rawText: DEMO_CALL_TRANSCRIPT,
    },
    {
      workspaceId,
      dealId: deals[1]._id,
      type: 'call',
      source: 'gong',
      sourceId: 'seed-call-tech-deep-dive',
      title: 'Technical deep-dive with IT',
      occurredAt: new Date(now.getTime() - 5 * 86400000),
      durationSeconds: 2700,
      contentHash: createHash('sha256').update('tech-deep-dive-seed').digest('hex'),
      rawText:
        'Prospect: CompetitorX is cheaper but lacks Gong integration. Our champion wants budget approved by end of Q3.',
    },
  ]);

  const letters = buildDefaultMeddpicc(deals[0].title);
  await DealMeddpicc.create({
    workspaceId,
    dealId: deals[0]._id,
    letters,
    status: 'idle',
    overallConfidence: 0.68,
    generatedAt: now,
    inputHash: 'seed-v1',
  });

  const agents = await Agent.insertMany(
    AGENT_TEMPLATES.map((t) => ({ ...t, workspaceId, ownerId, isActive: true })),
  );

  const postCallAgent = agents.find((a) => a.templateSlug === 'post-call')!;
  const run = await AgentRun.create({
    workspaceId,
    agentId: postCallAgent._id,
    dealId: deals[0]._id,
    status: 'awaiting_approval',
    triggerType: 'manual',
    startedAt: now,
  });

  await Approval.create({
    workspaceId,
    agentRunId: run._id,
    dealId: deals[0]._id,
    assignedTo: ownerId,
    status: 'pending',
    contentType: 'crm_update',
    title: 'Update deal stage after discovery call',
    contentPreview: { summary: 'Move Acme deal to Negotiation; add call notes.' },
    contentFull: { stageId: stages[3]._id.toString(), note: 'Discovery call completed — strong fit.' },
    proposedChange: {
      type: 'deal_update',
      dealId: deals[0]._id.toString(),
      patch: { stageId: stages[3]._id.toString() },
    },
    expiresAt: new Date(now.getTime() + 7 * 86400000),
  });
}
