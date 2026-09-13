'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';

type Approval = {
  id: string;
  title: string;
  dealId: string | null;
  dealTitle: string | null;
  status: string;
  contentType?: string;
  contentPreview: { summary?: string };
  createdAt: string;
};

type ApprovalDetail = Approval & {
  contentFull?: unknown;
  proposedChange?: unknown;
  agentName?: string | null;
};

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatJsonPreview(value: unknown) {
  if (value == null) return 'No proposed change payload';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function describeProposedChange(value: unknown): string | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'deal_hot_alert') return 'Mark this deal as hot after buying-signal review.';
  if (value.type === 'crm_field_update') return 'Update CRM fields on the linked deal.';
  if (value.type === 'post_call_bundle') {
    const tasks = Array.isArray(value.tasks) ? value.tasks.length : 0;
    return `Save a post-call note, ${tasks} task${tasks === 1 ? '' : 's'}, and an email draft as a note.`;
  }
  if (value.type === 'task_batch') return 'Create a batch of follow-up tasks.';
  if (value.type === 'note_create') return 'Add a note to the linked deal.';
  if (value.type === 'deal_update') return 'Update local deal fields.';
  return `Proposed change: ${value.type}`;
}

function contentTypeLabel(contentType?: string) {
  if (!contentType) return null;
  return contentType.replace(/_/g, ' ');
}

export default function ApprovalsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    apiGet<{ approvals: Approval[] }>('/approvals?status=pending&assignee=me', token)
      .then((r) => setItems(r.approvals))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setRejectId(null);
    setRejectNote('');
  }

  function openDetail(id: string) {
    const token = getToken();
    if (!token) return;
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    setRejectId(null);
    setRejectNote('');
    apiGet<{ approval: ApprovalDetail }>(`/approvals/${id}`, token)
      .then((r) => setDetail(r.approval))
      .catch((err) => {
        toast(err instanceof Error ? err.message : 'Failed to load approval', 'error');
        closeDetail();
      })
      .finally(() => setDetailLoading(false));
  }

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) openDetail(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once when ?id= changes
  }, [searchParams]);

  async function approve(id: string) {
    const token = getToken();
    if (!token) return;
    setActingId(id);
    try {
      const result = await apiPost<{ changeApplied?: boolean }>(`/approvals/${id}/approve`, token, {});
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) closeDetail();
      toast(result.changeApplied ? 'Approved — changes applied' : 'Approved', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to approve', 'error');
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    const token = getToken();
    if (!token) return;
    setActingId(id);
    try {
      await apiPost(`/approvals/${id}/reject`, token, { note: rejectNote || 'Rejected from UI' });
      setRejectId(null);
      setRejectNote('');
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) closeDetail();
      toast('Rejected', 'info');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reject', 'error');
    } finally {
      setActingId(null);
    }
  }

  function renderActions(id: string, inModal = false) {
    return (
      <div className={`flex flex-wrap gap-2 ${inModal ? 'mt-4 flex-col-reverse sm:flex-row sm:justify-end' : 'w-full sm:w-auto'}`}>
        <Button
          size="sm"
          disabled={actingId === id}
          onClick={(e) => { e.stopPropagation(); approve(id); }}
          className={inModal ? 'w-full text-primary-foreground sm:w-auto' : 'flex-1 text-primary-foreground sm:flex-none'}
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={actingId === id}
          onClick={(e) => { e.stopPropagation(); setRejectId(id); }}
          className={inModal ? 'w-full text-foreground sm:w-auto' : 'flex-1 text-foreground sm:flex-none'}
        >
          Reject
        </Button>
      </div>
    );
  }

  if (loading) return <PageSkeleton />;

  const selectedItem = selectedId ? items.find((a) => a.id === selectedId) : null;
  const modalTitle = detail?.title ?? selectedItem?.title ?? 'Approval details';

  return (
    <div>
      <PageHeader title="Approvals" subtitle={`${items.length} pending for you`} />

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <CheckSquare className="size-6" />
            </div>
            <CardTitle>All caught up</CardTitle>
            <CardDescription>No pending approvals.</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer bg-card transition-colors hover:bg-muted"
              role="button"
              tabIndex={0}
              onClick={() => openDetail(a.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(a.id); } }}
            >
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-[0.9375rem] text-foreground">{a.title}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {a.contentType && (
                      <Badge variant="outline" className="text-foreground">
                        {contentTypeLabel(a.contentType)}
                      </Badge>
                    )}
                    {a.dealTitle && (
                      <CardDescription className="mt-0">{a.dealTitle}</CardDescription>
                    )}
                  </div>
                  {a.contentPreview?.summary && (
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {a.contentPreview.summary}
                    </p>
                  )}
                </div>
                <div className="w-full shrink-0 sm:w-auto" onClick={(e) => e.stopPropagation()}>
                  {renderActions(a.id)}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>
              {detailLoading ? 'Loading approval details…' : 'Review the proposed change before approving.'}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : detail ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.8125rem]">
                <dt className="font-semibold text-muted-foreground">Agent</dt>
                <dd className="text-foreground">{detail.agentName ?? 'Unknown agent'}</dd>

                <dt className="font-semibold text-muted-foreground">Deal</dt>
                <dd>
                  {detail.dealId && detail.dealTitle ? (
                    <Link href={`/deals/${detail.dealId}`} className="font-medium text-foreground hover:underline">
                      {detail.dealTitle}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No linked deal</span>
                  )}
                </dd>

                <dt className="font-semibold text-muted-foreground">Created</dt>
                <dd className="text-foreground">{formatCreatedAt(detail.createdAt)}</dd>

                {detail.contentType && (
                  <>
                    <dt className="font-semibold text-muted-foreground">Type</dt>
                    <dd className="text-foreground">{contentTypeLabel(detail.contentType)}</dd>
                  </>
                )}
              </dl>

              {describeProposedChange(detail.proposedChange) && (
                <p className="text-[0.8125rem] leading-relaxed text-foreground">
                  {describeProposedChange(detail.proposedChange)}
                </p>
              )}

              {detail.contentPreview?.summary && (
                <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {detail.contentPreview.summary}
                </p>
              )}

              <div>
                <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Proposed change
                </div>
                <pre className="max-h-80 overflow-auto rounded-lg border bg-muted p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground">
                  {formatJsonPreview(detail.proposedChange ?? detail.contentFull)}
                </pre>
              </div>

              {renderActions(detail.id, true)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load approval details.</p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectId !== null} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectNote(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject approval?</AlertDialogTitle>
            <AlertDialogDescription>
              Optionally add a reason. The agent output will not be applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Reason</Label>
            <Input
              id="reject-note"
              placeholder="Reason for rejection…"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={actingId === rejectId}
              onClick={() => rejectId && reject(rejectId)}
            >
              Confirm reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
