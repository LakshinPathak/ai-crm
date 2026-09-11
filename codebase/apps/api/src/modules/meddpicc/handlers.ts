import type { Response } from 'express';
import { isValidObjectId } from 'mongoose';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { Company, Deal, DealMeddpicc, MeddpiccCitation, Note } from '@ai-crm/db';
import { generateMeddpiccWithGemini } from '../../lib/gemini.js';
import { buildDefaultMeddpicc, MEDDPICC_LETTERS } from '../../lib/meddpicc-defaults.js';
import {
  attachChunkCitationsToLetters,
  fetchMeddpiccArtifactChunksByLetter,
} from '../../lib/meddpicc-artifact-citations.js';
import { upsertMeddpiccCitations } from '../../lib/meddpicc-citations.js';

const MEDDPICC_STEP_META: Record<string, { label: string; loadingMessage: string }> = {
  M: { label: 'Metrics', loadingMessage: 'Gathering quantified outcomes…' },
  E: { label: 'Economic Buyer', loadingMessage: 'Identifying budget owner…' },
  D1: { label: 'Decision Criteria', loadingMessage: 'Mapping evaluation criteria…' },
  D2: { label: 'Decision Process', loadingMessage: 'Tracing approval workflow…' },
  P: { label: 'Paper Process', loadingMessage: 'Reviewing procurement steps…' },
  I: { label: 'Identify Pain', loadingMessage: 'Extracting customer pain points…' },
  C1: { label: 'Champion', loadingMessage: 'Locating internal champion…' },
  C2: { label: 'Competition', loadingMessage: 'Assessing competitive landscape…' },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockStepDelay(index: number): number {
  return 450 + index * 90 + Math.floor(Math.random() * 180);
}

function writeSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function getOrCreateMeddpicc(workspaceId: string, dealId: string) {
  let doc = await DealMeddpicc.findOne({ workspaceId, dealId });
  if (doc) return doc;

  const deal = await Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
  if (!deal) return null;

  doc = await DealMeddpicc.create({
    workspaceId,
    dealId,
    letters: buildDefaultMeddpicc(deal.title),
    status: 'idle',
    overallConfidence: 0.5,
    generatedAt: new Date(),
    inputHash: 'auto-v1',
  });
  return doc;
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export async function getMeddpicc(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const doc = await getOrCreateMeddpicc(req.tenant!.workspaceId, dealId);
  if (!doc) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  res.json({
    dealId: doc.dealId.toString(),
    letters: doc.letters,
    lockedFields: doc.lockedFields,
    status: doc.status,
    overallConfidence: doc.overallConfidence,
    inputHash: doc.inputHash,
    generatedAt: doc.generatedAt,
    version: doc.version,
  });
}

export async function refreshMeddpicc(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const doc = await getOrCreateMeddpicc(req.tenant!.workspaceId, dealId);
  if (!doc) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  doc.status = 'regenerating';
  await doc.save();

  res.json({
    jobId: `meddpicc-${doc.id}`,
    streamUrl: `/api/v1/deals/${dealId}/meddpicc/stream`,
  });
}

export async function streamMeddpicc(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const workspaceId = req.tenant!.workspaceId;
  const useGemini = Boolean(process.env.GEMINI_API_KEY);

  const deal = await Deal.findOne({
    _id: dealId,
    workspaceId,
    deletedAt: null,
  });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  try {
    const [company, notes, artifactChunksByLetter] = await Promise.all([
      Company.findById(deal.companyId),
      Note.find({ dealId: deal._id, workspaceId })
        .sort({ createdAt: -1 })
        .limit(5),
      fetchMeddpiccArtifactChunksByLetter(workspaceId, dealId),
    ]);

    for (let i = 0; i < MEDDPICC_LETTERS.length; i++) {
      if (closed) return;
      const letter = MEDDPICC_LETTERS[i];
      const meta = MEDDPICC_STEP_META[letter];
      writeSse(res, 'step.started', { letter, label: meta.label, message: meta.loadingMessage });
      await delay(useGemini ? 200 : mockStepDelay(i));
      if (closed) return;
      writeSse(res, 'step.completed', { letter, label: meta.label, status: 'done' });
    }

    const context = {
      dealTitle: deal.title,
      companyName: company?.name,
      amount: deal.amount,
      winProbability: deal.winProbability,
      sentiment: deal.sentiment,
      noteSnippets: notes.map((n) => n.body),
      artifactChunksByLetter,
    };

    let letters: ReturnType<typeof buildDefaultMeddpicc>;
    if (useGemini) {
      letters = await generateMeddpiccWithGemini(context);
      letters = attachChunkCitationsToLetters(letters, artifactChunksByLetter);
      if (closed) return;
      for (const letter of MEDDPICC_LETTERS) {
        writeSse(res, 'section.completed', { letter, section: letters[letter] });
      }
    } else {
      letters = attachChunkCitationsToLetters(
        buildDefaultMeddpicc(deal.title),
        artifactChunksByLetter,
      );
      for (let i = 0; i < MEDDPICC_LETTERS.length; i++) {
        if (closed) return;
        const letter = MEDDPICC_LETTERS[i];
        await delay(mockStepDelay(i));
        writeSse(res, 'section.completed', { letter, section: letters[letter] });
      }
    }

    const confidences = MEDDPICC_LETTERS.map((l) => letters[l]?.confidence ?? 0);
    const overallConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const completeness = Math.round(overallConfidence * 100);

    const doc = await DealMeddpicc.findOneAndUpdate(
      { dealId: deal._id, workspaceId },
      {
        letters,
        status: 'idle',
        overallConfidence,
        generatedAt: new Date(),
        inputHash: useGemini ? `gemini-${Date.now()}` : `mock-${Date.now()}`,
        $inc: { version: 1 },
      },
      { upsert: true, new: true },
    );

    await Deal.updateOne({ _id: deal._id }, { meddpiccCompleteness: completeness });

    await upsertMeddpiccCitations({
      workspaceId,
      dealId: deal._id,
      letters,
    });

    writeSse(res, 'summary.completed', {
      dealId: deal.id,
      confidence: doc?.overallConfidence,
      completeness,
    });
    res.end();
  } catch (err) {
    if (!closed) {
      writeSse(res, 'summary.error', { message: err instanceof Error ? err.message : 'Generation failed' });
      res.end();
    }
    await DealMeddpicc.updateOne(
      { dealId: deal._id, workspaceId },
      { status: 'idle' },
    );
  }
}

type MeddpiccLetterSection = { summary?: string };

function resolveCitationText(
  citation: InstanceType<typeof MeddpiccCitation>,
  meddpicc: InstanceType<typeof DealMeddpicc> | null,
): string {
  if (citation.text) return citation.text;

  const letters = (meddpicc?.letters ?? {}) as Record<string, MeddpiccLetterSection>;
  const section = letters[citation.letter];
  if (section?.summary && (citation.claimKey === 'summary' || !citation.excerpt)) {
    return section.summary;
  }

  return citation.excerpt ?? '';
}

export async function getMeddpiccCitation(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const citationId = paramId(req.params.citationId);

  if (!isValidObjectId(citationId)) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Citation not found' } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;

  const deal = await Deal.findOne({ _id: dealId, workspaceId, deletedAt: null });
  if (!deal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    return;
  }

  const citation = await MeddpiccCitation.findOne({
    _id: citationId,
    dealId: deal._id,
    workspaceId,
  });
  if (!citation) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Citation not found' } });
    return;
  }

  const meddpicc = await DealMeddpicc.findOne({ dealId: deal._id, workspaceId });

  res.json({
    id: citation.id,
    text: resolveCitationText(citation, meddpicc),
    artifactId: citation.artifactId?.toString() ?? null,
    snippet: citation.excerpt ?? '',
  });
}

export async function patchMeddpicc(req: AuthedRequest, res: Response) {
  const dealId = paramId(req.params.dealId);
  const doc = await DealMeddpicc.findOne({
    dealId,
    workspaceId: req.tenant!.workspaceId,
  });
  if (!doc) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'MEDDPICC not found' } });
    return;
  }

  const body = req.body as { edits?: Record<string, unknown>; lockedFields?: string[] };
  if (body.edits) {
    doc.humanEdits = { ...doc.humanEdits, ...body.edits };
    doc.letters = { ...doc.letters, ...body.edits };
  }
  if (body.lockedFields) doc.lockedFields = body.lockedFields;
  await doc.save();

  res.json({ letters: doc.letters, lockedFields: doc.lockedFields });
}
