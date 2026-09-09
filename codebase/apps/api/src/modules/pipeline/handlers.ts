import type { Response } from 'express';
import type { AuthedRequest } from '../../lib/auth/index.js';
import { PipelineStage } from '@ai-crm/db';
import { UpdatePipelineStageSchema } from '@ai-crm/shared';
import { DEFAULT_SALES_PROCESSES } from '../../lib/sales-process-defaults.js';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function stagePayload(stage: InstanceType<typeof PipelineStage>) {
  return {
    id: stage.id,
    name: stage.name,
    position: stage.position,
    stageType: stage.stageType,
    color: stage.color,
    isDefault: stage.isDefault,
  };
}

export async function listStages(req: AuthedRequest, res: Response) {
  const stages = await PipelineStage.find({ workspaceId: req.tenant!.workspaceId }).sort({ position: 1 });
  res.json({
    stages: stages.map(stagePayload),
  });
}

export async function listSalesProcesses(_req: AuthedRequest, res: Response) {
  res.json({ salesProcesses: DEFAULT_SALES_PROCESSES });
}

async function reorderStages(workspaceId: string, stageId: string, newPosition: number) {
  const stages = await PipelineStage.find({ workspaceId }).sort({ position: 1 });
  const currentIndex = stages.findIndex((s) => s.id === stageId);
  if (currentIndex === -1) return null;

  const [moved] = stages.splice(currentIndex, 1);
  const targetIndex = Math.min(Math.max(newPosition, 0), stages.length);
  stages.splice(targetIndex, 0, moved);

  const tempOffset = 10_000;
  await Promise.all(
    stages.map((stage, index) =>
      PipelineStage.updateOne({ _id: stage._id }, { $set: { position: tempOffset + index } }),
    ),
  );
  await Promise.all(
    stages.map((stage, index) => PipelineStage.updateOne({ _id: stage._id }, { $set: { position: index } })),
  );

  return PipelineStage.findOne({ _id: moved._id, workspaceId });
}

export async function updateStage(req: AuthedRequest, res: Response) {
  const parsed = UpdatePipelineStageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const workspaceId = req.tenant!.workspaceId;
  const stageId = paramId(req.params.stageId);
  const stage = await PipelineStage.findOne({ _id: stageId, workspaceId });
  if (!stage) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Stage not found' } });
    return;
  }

  const { name, color, position } = parsed.data;

  if (name !== undefined) stage.name = name;
  if (color !== undefined) stage.color = color;

  if (position !== undefined && position !== stage.position) {
    const reordered = await reorderStages(workspaceId, stageId, position);
    if (!reordered) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Stage not found' } });
      return;
    }
    if (name !== undefined) reordered.name = name;
    if (color !== undefined) reordered.color = color;
    await reordered.save();
    res.json({ stage: stagePayload(reordered) });
    return;
  }

  await stage.save();
  res.json({ stage: stagePayload(stage) });
}
