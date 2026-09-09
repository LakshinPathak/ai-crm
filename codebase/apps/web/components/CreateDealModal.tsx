'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Company = { id: string; name: string };
type Stage = { id: string; name: string };

export function CreateDealModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [stageId, setStageId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGet<{ companies: Company[] }>('/companies', token),
      apiGet<{ stages: Stage[] }>('/pipeline/stages', token),
    ]).then(([c, s]) => {
      setCompanies(c.companies);
      setStages(s.stages);
      if (c.companies[0]) setCompanyId(c.companies[0].id);
      if (s.stages[0]) setStageId(s.stages[0].id);
    });
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      await apiPost('/deals', token, {
        title,
        companyId,
        stageId,
        amount: Number(amount) || 0,
      });
      toast('Deal created', 'success');
      setTitle('');
      setAmount('');
      onCreated();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create deal', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>Add a deal to your pipeline</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="deal-title">Deal title</Label>
            <Input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deal-amount">Amount ($)</Label>
            <Input
              id="deal-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deal-company">Company</Label>
            <Select value={companyId} onValueChange={setCompanyId} required>
              <SelectTrigger id="deal-company" className="w-full">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deal-stage">Stage</Label>
            <Select value={stageId} onValueChange={setStageId} required>
              <SelectTrigger id="deal-stage" className="w-full">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
