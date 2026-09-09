'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { CompaniesListResponse, CompanySummary } from '@/lib/types';
import { CreateAccountModal } from '@/components/CreateAccountModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/name-avatar';
import { PageSkeleton } from '@/components/ui/page-skeleton';

export default function AccountsPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadCompanies = useCallback(() => {
    const token = getToken();
    if (!token) {
      setLoaded(true);
      return;
    }
    apiGet<CompaniesListResponse>('/companies', token)
      .then((r) => setCompanies(r.companies))
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const filtered = useMemo(() => {
    if (!search) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.domain ?? '').toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q),
    );
  }, [companies, search]);

  if (!loaded) return <PageSkeleton />;
  if (error) return <p style={{ color: 'var(--red)' }}>{error}</p>;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search accounts…" />
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
              New account
            </Button>
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title={search ? 'No matching accounts' : 'No accounts yet'}
          description={search ? 'Try a different search term.' : 'Create an account or sync companies from your CRM.'}
        />
      ) : (
        <Card padding={false}>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Domain</th>
                <th>Industry</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link href={`/accounts/${company.id}`} className="cell-title" style={{ color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={company.name} size="xs" />
                        {company.name}
                      </div>
                    </Link>
                  </td>
                  <td>{company.domain ?? '—'}</td>
                  <td>{company.industry ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateAccountModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadCompanies}
      />
    </div>
  );
}
