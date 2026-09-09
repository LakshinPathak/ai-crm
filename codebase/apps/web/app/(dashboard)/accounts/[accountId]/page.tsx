'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { CompanyDeal, CompanyDetail, CompanyDetailResponse } from '@/lib/types';
import { formatMoney, sentimentLabel } from '@/lib/format';
import { legacyBadgeVariant } from '@/lib/ui-badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [deals, setDeals] = useState<CompanyDeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editEmployeeCount, setEditEmployeeCount] = useState('');

  const loadAccount = useCallback(() => {
    const token = getToken();
    if (!token || !accountId) return;
    apiGet<CompanyDetailResponse>(`/companies/${accountId}`, token)
      .then((data) => {
        setCompany(data.company);
        setDeals(data.deals);
        setEditName(data.company.name);
        setEditDomain(data.company.domain ?? '');
        setEditIndustry(data.company.industry ?? '');
        setEditEmployeeCount(
          data.company.employeeCount != null ? String(data.company.employeeCount) : '',
        );
      })
      .catch((e) => setError(e.message));
  }, [accountId]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function saveCompany() {
    const token = getToken();
    if (!token || !accountId) return;
    try {
      const body: Record<string, unknown> = {
        name: editName,
        domain: editDomain.trim() || undefined,
        industry: editIndustry.trim() || undefined,
      };
      const count = Number(editEmployeeCount);
      if (editEmployeeCount.trim() && !Number.isNaN(count)) {
        body.employeeCount = count;
      }

      await apiPatch(`/companies/${accountId}`, token, body);
      setEditing(false);
      loadAccount();
      toast('Account updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update account', 'error');
    }
  }

  function cancelEdit() {
    if (!company) return;
    setEditName(company.name);
    setEditDomain(company.domain ?? '');
    setEditIndustry(company.industry ?? '');
    setEditEmployeeCount(company.employeeCount != null ? String(company.employeeCount) : '');
    setEditing(false);
  }

  async function deleteCompany() {
    if (!confirm('Delete this account? Linked deals will remain but lose this association.')) return;
    const token = getToken();
    if (!token || !accountId) return;
    try {
      await apiDelete(`/companies/${accountId}`, token);
      toast('Account deleted', 'success');
      router.push('/accounts');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete account', 'error');
    }
  }

  if (error) {
    return (
      <div>
        <Link href="/accounts">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  if (!company) return <PageSkeleton />;

  const openDeals = deals.filter((d) => d.status === 'open');
  const totalAmount = openDeals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div>
      <div className="ui-page-header mb-6 flex-col gap-4 sm:flex-row">
        <div className="ui-page-header__left min-w-0 flex-1">
          <Link href="/accounts" className="shrink-0">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <UserAvatar name={company.name} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Company name"
                  className="w-full sm:w-[280px]"
                />
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="Domain"
                    className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                  />
                  <Input
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    placeholder="Industry"
                    className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={editEmployeeCount}
                    onChange={(e) => setEditEmployeeCount(e.target.value)}
                    placeholder="Employees"
                    className="w-full sm:w-24"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveCompany}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="ui-page-header__title break-words text-xl">{company.name}</h1>
                <p className="ui-page-header__subtitle">
                  {[company.domain, company.industry].filter(Boolean).join(' · ') || 'Account details'}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          )}
          <Button variant="destructive" size="icon-sm" onClick={deleteCompany}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="mb-1 text-xs text-muted-foreground">Open deals</div>
          <div className="text-2xl font-bold">{openDeals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-1 text-xs text-muted-foreground">Pipeline value</div>
          <div className="text-2xl font-bold">{formatMoney(totalAmount)}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-1 text-xs text-muted-foreground">Employees</div>
          <div className="text-2xl font-bold">{company.employeeCount ?? '—'}</div>
        </Card>
      </div>

      <PageHeader title="Linked deals" subtitle={`${deals.length} deal${deals.length === 1 ? '' : 's'} for this account`} />

      {deals.length === 0 ? (
        <EmptyState title="No deals linked" description="Deals associated with this account will appear here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Win %</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <Link href={`/deals/${deal.id}`} className="font-medium text-foreground hover:underline">
                      {deal.title}
                    </Link>
                  </TableCell>
                  <TableCell>{formatMoney(deal.amount)}</TableCell>
                  <TableCell>{deal.winProbability}%</TableCell>
                  <TableCell>
                    <Badge variant={legacyBadgeVariant(deal.sentiment)}>
                      {sentimentLabel(deal.sentiment)}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Badge variant={legacyBadgeVariant(deal.status === 'open' ? 'enabled' : 'default')}>
                      {deal.status}
                    </Badge>
                    {deal.isHot && <Badge variant="destructive">Hot</Badge>}
                    {deal.blockerCount > 0 && (
                      <Badge variant="destructive">{deal.blockerCount} blockers</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
