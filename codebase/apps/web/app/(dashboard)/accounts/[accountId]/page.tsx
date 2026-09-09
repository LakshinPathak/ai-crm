'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { CompanyDeal, CompanyDetail, CompanyDetailResponse } from '@/lib/types';
import { formatMoney, sentimentLabel } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/legacy-button';
import { Avatar } from '@/components/ui/name-avatar';
import { Badge } from '@/components/ui/legacy-badge';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';

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
        <Link href="/accounts"><Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} /></Link>
        <p style={{ color: 'var(--red)', marginTop: '1rem' }}>{error}</p>
      </div>
    );
  }

  if (!company) return <PageSkeleton />;

  const openDeals = deals.filter((d) => d.status === 'open');
  const totalAmount = openDeals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div>
      <div className="ui-page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="ui-page-header__left">
          <Link href="/accounts"><Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} /></Link>
          <Avatar name={company.name} size="md" />
          <div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="ui-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Company name"
                  style={{ width: 280 }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    className="ui-input"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    placeholder="Domain"
                    style={{ width: 160 }}
                  />
                  <input
                    className="ui-input"
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    placeholder="Industry"
                    style={{ width: 160 }}
                  />
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    value={editEmployeeCount}
                    onChange={(e) => setEditEmployeeCount(e.target.value)}
                    placeholder="Employees"
                    style={{ width: 100 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" onClick={saveCompany}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="ui-page-header__title" style={{ fontSize: '1.25rem' }}>{company.name}</h1>
                <p className="ui-page-header__subtitle">
                  {[company.domain, company.industry].filter(Boolean).join(' · ') || 'Account details'}
                </p>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          )}
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={deleteCompany} />
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Open deals</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{openDeals.length}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Pipeline value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatMoney(totalAmount)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Employees</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{company.employeeCount ?? '—'}</div>
        </Card>
      </div>

      <PageHeader title="Linked deals" subtitle={`${deals.length} deal${deals.length === 1 ? '' : 's'} for this account`} />

      {deals.length === 0 ? (
        <EmptyState title="No deals linked" description="Deals associated with this account will appear here." />
      ) : (
        <Card padding={false}>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Amount</th>
                <th>Win %</th>
                <th>Sentiment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <Link href={`/deals/${deal.id}`} className="cell-title" style={{ color: 'var(--text)' }}>
                      {deal.title}
                    </Link>
                  </td>
                  <td>{formatMoney(deal.amount)}</td>
                  <td>{deal.winProbability}%</td>
                  <td><Badge variant={deal.sentiment}>{sentimentLabel(deal.sentiment)}</Badge></td>
                  <td>
                    <Badge variant={deal.status === 'open' ? 'enabled' : 'default'}>{deal.status}</Badge>
                    {deal.isHot && <Badge variant="hot">Hot</Badge>}
                    {deal.blockerCount > 0 && (
                      <Badge variant="blocker">{deal.blockerCount} blockers</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
