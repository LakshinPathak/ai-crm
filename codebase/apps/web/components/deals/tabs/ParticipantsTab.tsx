'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';

type Participant = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  company: string | null;
  createdAt: string;
};

export function ParticipantsTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ participants: Participant[] }>(`/deals/${dealId}/participants`, token)
      .then((r) => {
        setParticipants(r.participants);
        setUnavailable(false);
      })
      .catch(() => {
        setParticipants([]);
        setUnavailable(true);
      });
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !name.trim() || !email.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/participants`, token, {
        name: name.trim(),
        email: email.trim(),
        role: role.trim() || undefined,
        company: company.trim() || undefined,
      });
      setName('');
      setEmail('');
      setRole('');
      setCompany('');
      await reload();
      toast('Participant added', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add participant', 'error');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-[88px]" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <EmptyState
        icon={<Users size={24} />}
        title="Participants not available yet"
        description="Stakeholders and their roles will be listed here once the participants API is connected."
      />
    );
  }

  return (
    <>
      <form onSubmit={addParticipant} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input
            className="ui-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="ui-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="ui-input"
            placeholder="Role (e.g. Champion)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <input
            className="ui-input"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <Button type="submit">Add participant</Button>
      </form>
      {participants.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No participants yet"
          description="Add stakeholders and their roles for this deal."
        />
      ) : (
        <Card>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className="cell-title">{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.role ?? '—'}</td>
                  <td>{p.company ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
