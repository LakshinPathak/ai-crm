'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { MeResponse } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { useToast } from '@/components/ui/Toast';

type Member = { id: string; email: string; displayName: string; role: string };
type InviteRole = 'member' | 'manager' | 'admin';

function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong';
  try {
    const parsed = JSON.parse(err.message) as { error?: { message?: string } };
    return parsed.error?.message ?? err.message;
  } catch {
    return err.message;
  }
}

export default function SettingsMembersPage() {
  const { toast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');
  const [inviting, setInviting] = useState(false);

  async function loadMembers(token: string) {
    try {
      const r = await apiGet<{ members: Member[] }>('/workspace/members', token);
      setMembers(r.members);
    } catch {
      // members list is non-critical on load
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGet<MeResponse>('/me', token).then(setMe);
    loadMembers(token);
  }, []);

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setInviting(true);
    try {
      await apiPost('/workspace/members/invite', token, { email: inviteEmail.trim(), role: inviteRole });
      toast('Invite sent', 'success');
      setInviteEmail('');
      setInviteRole('member');
      await loadMembers(token);
    } catch (err) {
      toast(parseApiError(err), 'error');
    } finally {
      setInviting(false);
    }
  }

  if (!me) return null;

  return (
    <div>
      <PageHeader
        title="Team members"
        subtitle="Manage who has access to your workspace"
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/settings">Settings</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      <Card>
        {me.user.role === 'admin' && (
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Invite member</CardTitle>
            <form
              onSubmit={inviteMember}
              className="flex flex-wrap items-end gap-3 pt-2"
            >
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div className="w-[140px] space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as InviteRole)}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            </form>
          </CardHeader>
        )}
        <CardContent className="pt-6">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="rounded-full bg-muted p-3 text-muted-foreground">
                <Users className="size-5" />
              </div>
              <CardDescription>No members listed.</CardDescription>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.displayName}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
