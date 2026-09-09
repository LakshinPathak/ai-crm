'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { CompaniesListResponse, CompanySummary } from '@/lib/types';
import { CreateAccountModal } from '@/components/CreateAccountModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/ui/user-avatar';
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
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts…"
                className="w-44 pl-8"
              />
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New account
            </Button>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title={search ? 'No matching accounts' : 'No accounts yet'}
          description={search ? 'Try a different search term.' : 'Create an account or sync companies from your CRM.'}
        />
      ) : (
        <Card className="overflow-hidden p-0">
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
                    <Link href={`/accounts/${company.id}`} className="cell-title text-foreground">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={company.name} size="xs" />
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
