'use client';

import { useEffect, useState } from 'react';
import { apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/legacy-button';
import { useToast } from '@/components/ui/Toast';

export function CreateAccountModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDomain('');
    setIndustry('');
    setEmployeeCount('');
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name };
      if (domain.trim()) body.domain = domain.trim();
      if (industry.trim()) body.industry = industry.trim();
      const count = Number(employeeCount);
      if (employeeCount.trim() && !Number.isNaN(count)) body.employeeCount = count;

      await apiPost('/companies', token, body);
      toast('Account created', 'success');
      onCreated();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create account', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New account" description="Add a company to your CRM">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Company name</span>
          <input
            className="ui-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Domain</span>
          <input
            className="ui-input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Industry</span>
          <input
            className="ui-input"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </label>
        <label>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Employees</span>
          <input
            className="ui-input"
            type="number"
            min={0}
            value={employeeCount}
            onChange={(e) => setEmployeeCount(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
        </div>
      </form>
    </Modal>
  );
}
