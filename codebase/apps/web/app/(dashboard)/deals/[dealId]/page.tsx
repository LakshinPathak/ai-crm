'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { DealTabBar } from '@/components/deals/DealTabBar';
import { DealTabPanels } from '@/components/deals/DealTabPanels';
import { DEFAULT_DEAL_TAB, isDealTabId, type DealTabId } from '@/components/deals/deal-tabs';
import { DealOutcomeBadge, HotBadge } from '@/components/deals/deal-badges';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { formatMoney, initials } from '@/lib/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/Toast';

type DealHeader = {
  title: string;
  companyName: string;
  amount: number;
  stageId?: string;
  status?: 'open' | 'won' | 'lost';
  isHot?: boolean;
  winProbability: number;
  meddpiccCompleteness: number;
  sentiment: string;
  blockerCount?: number;
  closedAt?: string | null;
  lostReason?: string | null;
};
type Stage = { id: string; name: string };

function DealDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function DealDetailPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const tabParam = searchParams.get('tab');
  const tab: DealTabId = isDealTabId(tabParam) ? tabParam : DEFAULT_DEAL_TAB;

  const [header, setHeader] = useState<DealHeader | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [closing, setClosing] = useState(false);

  const reloadHeader = useCallback(() => {
    const token = getToken();
    if (!token || !dealId) return;
    apiGet<{ header: DealHeader }>(`/deals/${dealId}/overview-header`, token).then((r) => {
      setHeader(r.header);
      setEditTitle(r.header.title);
      setEditAmount(String(r.header.amount));
    });
    apiGet<{ stages: Stage[] }>('/pipeline/stages', token).then((r) => setStages(r.stages));
  }, [dealId]);

  useEffect(() => {
    reloadHeader();
  }, [reloadHeader]);

  function setTab(next: DealTabId) {
    router.replace(`/deals/${dealId}?tab=${next}`, { scroll: false });
  }

  async function saveDeal() {
    const token = getToken();
    if (!token || !dealId) return;
    await apiPatch(`/deals/${dealId}`, token, { title: editTitle, amount: Number(editAmount) });
    setEditing(false);
    reloadHeader();
    toast('Deal updated', 'success');
  }

  async function moveStage(stageId: string) {
    const token = getToken();
    if (!token || !dealId) return;
    await apiPatch(`/deals/${dealId}/stage`, token, { stageId, position: 0 });
    reloadHeader();
    toast('Stage updated', 'success');
  }

  async function deleteDeal() {
    if (!confirm('Delete this deal?')) return;
    const token = getToken();
    if (!token || !dealId) return;
    await apiDelete(`/deals/${dealId}`, token);
    toast('Deal deleted', 'success');
    router.push('/deals');
  }

  async function closeDeal(outcome: 'won' | 'lost', reason?: string) {
    const token = getToken();
    if (!token || !dealId) return;
    setClosing(true);
    try {
      await apiPost(`/deals/${dealId}/close`, token, {
        outcome,
        ...(outcome === 'lost' ? { lostReason: reason } : {}),
      });
      setLostModalOpen(false);
      setLostReason('');
      reloadHeader();
      toast(outcome === 'won' ? 'Deal marked as won' : 'Deal marked as lost', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to close deal', 'error');
    } finally {
      setClosing(false);
    }
  }

  async function closeWon() {
    if (!confirm('Mark this deal as won?')) return;
    await closeDeal('won');
  }

  async function submitLost(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = lostReason.trim();
    if (!trimmed) {
      toast('Please enter a reason for losing this deal', 'error');
      return;
    }
    await closeDeal('lost', trimmed);
  }

  const isOpen = (header?.status ?? 'open') === 'open';

  if (!header) return <DealDetailSkeleton />;

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/deals">Deals</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{header.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initials(header.companyName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            {editing ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-52"
                />
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-28"
                />
                <Button size="sm" onClick={saveDeal}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <h1 className="truncate text-xl font-semibold tracking-tight">{header.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {header.companyName} · {formatMoney(header.amount)}
                </p>
              </>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {header.isHot && <HotBadge />}
              {header.status === 'won' && <DealOutcomeBadge status="won" />}
              {header.status === 'lost' && <DealOutcomeBadge status="lost" />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOpen && !editing && (
            <>
              <Button
                size="sm"
                disabled={closing}
                onClick={closeWon}
                className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              >
                Mark Won
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={closing}
                onClick={() => setLostModalOpen(true)}
              >
                Mark Lost
              </Button>
            </>
          )}
          {isOpen && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {isOpen && (
            <Select value={header.stageId ?? ''} onValueChange={moveStage}>
              <SelectTrigger size="sm" className="min-w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="destructive" onClick={deleteDeal}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {header.status === 'lost' && header.lostReason && (
        <p className="text-sm text-muted-foreground">
          Lost reason: {header.lostReason}
        </p>
      )}

      <Dialog
        open={lostModalOpen}
        onOpenChange={(open) => {
          if (!closing) {
            setLostModalOpen(open);
            if (!open) setLostReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close deal as lost</DialogTitle>
            <DialogDescription>Why was this deal lost?</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitLost} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lost-reason">Reason</Label>
              <Textarea
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                required
                maxLength={500}
                rows={4}
                placeholder="e.g. Chose competitor, budget cut, timing…"
              />
            </div>
            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={closing}
                onClick={() => {
                  setLostModalOpen(false);
                  setLostReason('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={closing}>
                {closing ? 'Closing…' : 'Mark as lost'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DealTabId)} className="gap-4">
        <DealTabBar />
        <DealTabPanels dealId={dealId} tab={tab} header={header} stages={stages} />
      </Tabs>
    </div>
  );
}
