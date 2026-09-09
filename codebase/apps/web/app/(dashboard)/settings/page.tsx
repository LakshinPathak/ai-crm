'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { MeResponse } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGet<MeResponse>('/me', token).then((m) => {
      setMe(m);
      setWorkspaceName(m.workspace?.name ?? '');
    });
  }, []);

  async function saveWorkspace() {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await apiPatch('/workspace', token, { name: workspaceName });
      toast('Workspace updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!me) return null;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your workspace and preferences" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <Button onClick={saveWorkspace} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm leading-relaxed">
            <div><strong>Name:</strong> {me.user.displayName}</div>
            <div><strong>Email:</strong> {me.user.email}</div>
            <div><strong>Role:</strong> {me.user.role}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
            <CardDescription>Invite colleagues and manage workspace roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" asChild>
              <Link href="/settings/members">Manage members →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales process</CardTitle>
            <CardDescription>View presales stages and milestones for deals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" asChild>
              <Link href="/settings/sales-process">View sales process →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect CRM, chat, and recording tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" asChild>
            <Link href="/settings/integrations">Manage integrations →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
