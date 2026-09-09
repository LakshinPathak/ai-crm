import type { Response } from 'express';
import { isValidObjectId } from 'mongoose';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal, DealBlocker, Note } from '@ai-crm/db';
import {
  buildDealScoringContext,
  scoreSentiment,
  scoreTechnicalFit,
  suggestBlockerTitle,
} from '../../lib/ai-scoring.js';

async function loadDealContext(workspaceId: string, dealId: string) {
  if (!isValidObjectId(dealId)) return null;

  const deal = await Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
  if (!deal) return null;

  const [company, notes, blockers] = await Promise.all([
    Company.findById(deal.companyId),
    Note.find({ dealId: deal._id, workspaceId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5),
    DealBlocker.find({ dealId: deal._id, workspaceId, status: 'open' })
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  return { deal, company, notes, blockers };
}

function requireDealId(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const dealId = (body as { dealId?: unknown }).dealId;
  return typeof dealId === 'string' && dealId.trim() ? dealId.trim() : null;
}

export async function postSentiment(req: AuthedRequest, res: Response) {
  const dealId = requireDealId(req.body);
  if (!dealId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'dealId is required' } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const loaded = await loadDealContext(workspaceId, dealId);
  if (!loaded) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const extraText = typeof req.body?.text === 'string' ? req.body.text : undefined;
  const context = buildDealScoringContext(
    loaded.deal,
    loaded.company,
    loaded.notes,
    loaded.blockers,
    extraText,
  );

  const result = await scoreSentiment(context);
  loaded.deal.sentiment = result.sentiment;
  await loaded.deal.save();

  res.json({
    dealId: loaded.deal.id,
    sentiment: result.sentiment,
    confidence: result.confidence,
    source: result.source,
  });
}

export async function postFitScore(req: AuthedRequest, res: Response) {
  const dealId = requireDealId(req.body);
  if (!dealId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'dealId is required' } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const loaded = await loadDealContext(workspaceId, dealId);
  if (!loaded) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const context = buildDealScoringContext(
    loaded.deal,
    loaded.company,
    loaded.notes,
    loaded.blockers,
  );

  const result = await scoreTechnicalFit(context);
  loaded.deal.technicalFitScore = result.technicalFitScore;
  await loaded.deal.save();

  res.json({
    dealId: loaded.deal.id,
    technicalFitScore: result.technicalFitScore,
    source: result.source,
  });
}

export async function postSuggestBlocker(req: AuthedRequest, res: Response) {
  const dealId = requireDealId(req.body);
  if (!dealId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'dealId is required' } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const loaded = await loadDealContext(workspaceId, dealId);
  if (!loaded) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const extraContext = typeof req.body?.context === 'string' ? req.body.context : undefined;
  const context = buildDealScoringContext(
    loaded.deal,
    loaded.company,
    loaded.notes,
    loaded.blockers,
    extraContext,
  );

  const result = await suggestBlockerTitle(context);

  res.json({
    dealId: loaded.deal.id,
    title: result.title,
    reasoning: result.reasoning,
    source: result.source,
  });
}
