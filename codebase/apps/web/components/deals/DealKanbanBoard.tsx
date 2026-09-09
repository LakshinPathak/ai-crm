'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from 'cn';
import { apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { BoardResponse } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { DealKanbanCard } from '@/components/ui/DealKanbanCard';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type BoardStage = BoardResponse['stages'][number];

type DragPayload = {
  dealId: string;
  sourceStageId: string;
};

function moveDealInStages(
  stages: BoardStage[],
  dealId: string,
  sourceStageId: string,
  targetStageId: string,
  targetIndex: number,
): BoardStage[] {
  const next = stages.map((s) => ({ ...s, deals: [...s.deals] }));
  const sourceStage = next.find((s) => s.id === sourceStageId);
  const targetStage = next.find((s) => s.id === targetStageId);
  if (!sourceStage || !targetStage) return stages;

  const fromIndex = sourceStage.deals.findIndex((d) => d.id === dealId);
  if (fromIndex === -1) return stages;

  const [deal] = sourceStage.deals.splice(fromIndex, 1);

  let insertAt = targetIndex;
  if (sourceStageId === targetStageId && fromIndex < targetIndex) {
    insertAt = targetIndex - 1;
  }
  insertAt = Math.max(0, Math.min(insertAt, targetStage.deals.length));
  targetStage.deals.splice(insertAt, 0, deal);

  return next;
}

export function DealKanbanBoard({
  stages,
  showOpine = false,
  dragEnabled = true,
  onStagesChange,
}: {
  stages: BoardStage[];
  showOpine?: boolean;
  dragEnabled?: boolean;
  onStagesChange: (stages: BoardStage[]) => void;
}) {
  const { toast } = useToast();
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const dragPayloadRef = useRef<DragPayload | null>(null);
  const draggedRef = useRef(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dealId: string, sourceStageId: string) => {
      if (!dragEnabled) {
        e.preventDefault();
        return;
      }
      draggedRef.current = true;
      setDraggingDealId(dealId);
      dragPayloadRef.current = { dealId, sourceStageId };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify({ dealId, sourceStageId }));
    },
    [dragEnabled],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingDealId(null);
    setDragOverStageId(null);
    dragPayloadRef.current = null;
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }, []);

  const readDragPayload = (e: React.DragEvent): DragPayload | null => {
    if (dragPayloadRef.current) return dragPayloadRef.current;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return null;
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const commitMove = useCallback(
    async (targetStageId: string, targetIndex: number) => {
      const payload = dragPayloadRef.current;
      if (!payload) return;

      const { dealId, sourceStageId } = payload;
      const sourceStage = stages.find((s) => s.id === sourceStageId);
      const fromIndex = sourceStage?.deals.findIndex((d) => d.id === dealId) ?? -1;
      if (fromIndex === -1) return;

      if (sourceStageId === targetStageId && fromIndex === targetIndex) return;
      if (sourceStageId === targetStageId && fromIndex < targetIndex && fromIndex === targetIndex - 1) {
        return;
      }

      const previousStages = stages;
      const optimisticStages = moveDealInStages(stages, dealId, sourceStageId, targetStageId, targetIndex);
      onStagesChange(optimisticStages);

      const token = getToken();
      if (!token) {
        onStagesChange(previousStages);
        toast('Sign in to move deals', 'error');
        return;
      }

      const targetStage = optimisticStages.find((s) => s.id === targetStageId);
      const position = targetStage?.deals.findIndex((d) => d.id === dealId) ?? targetIndex;

      try {
        await apiPatch(`/deals/${dealId}/stage`, token, { stageId: targetStageId, position });
      } catch (err) {
        onStagesChange(previousStages);
        toast(err instanceof Error ? err.message : 'Failed to move deal', 'error');
      }
    },
    [onStagesChange, stages, toast],
  );

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    if (!dragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };

  const handleColumnDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const payload = readDragPayload(e);
    if (!payload) return;
    const stage = stages.find((s) => s.id === stageId);
    const targetIndex = stage?.deals.length ?? 0;
    void commitMove(stageId, targetIndex);
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    if (!dragEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };

  const handleCardDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStageId(null);
    if (!readDragPayload(e)) return;
    void commitMove(stageId, index);
  };

  return (
    <ScrollArea className="-mx-4 w-[calc(100%+2rem)] px-4 sm:mx-0 sm:w-full sm:px-0">
      <div className="flex gap-3 pb-4 sm:gap-4">
        {stages.map((stage) => {
          const stageTotal = stage.deals.reduce((s, d) => s + d.amount, 0);
          const isDragOver = dragOverStageId === stage.id;

          return (
            <Card
              key={stage.id}
              size="sm"
              className="flex w-[280px] min-w-[280px] shrink-0 flex-col py-0 sm:w-72"
            >
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: stage.color || 'var(--primary)' }}
                  />
                  {stage.name}
                </CardTitle>
                <CardDescription>
                  {stage.deals.length} deal{stage.deals.length !== 1 ? 's' : ''} ·{' '}
                  {formatMoney(stageTotal, true)}
                </CardDescription>
              </CardHeader>
              <ScrollArea className="h-[min(70vh,640px)]">
                <CardContent
                  className={cn(
                    'flex min-h-32 flex-col gap-2 pt-3 transition-colors',
                    isDragOver && 'rounded-lg bg-primary/5 ring-2 ring-primary/30 ring-inset',
                  )}
                  onDragOver={(e) => handleColumnDragOver(e, stage.id)}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOverStageId((id) => (id === stage.id ? null : id));
                  }}
                  onDrop={(e) => handleColumnDrop(e, stage.id)}
                >
                  {stage.deals.map((deal, index) => (
                    <div
                      key={deal.id}
                      draggable={dragEnabled}
                      onDragStart={(e) => handleDragStart(e, deal.id, stage.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleCardDragOver(e, stage.id)}
                      onDrop={(e) => handleCardDrop(e, stage.id, index)}
                      className={cn(
                        'rounded-lg transition-opacity',
                        draggingDealId === deal.id && 'opacity-50',
                      )}
                      onClickCapture={(e) => {
                        if (draggedRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      <DealKanbanCard deal={deal} showOpine={showOpine} />
                    </div>
                  ))}
                </CardContent>
              </ScrollArea>
            </Card>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
