'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { MeResponse } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

type InviteRole = 'member' | 'manager' | 'admin';
type Member = { id: string; email: string; displayName: string; role: InviteRole };
type Invite = { id: string; email: string; role: InviteRole; expiresAt: string; inviteUrl: string };

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
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');
  const [inviting, setInviting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  async function loadMembers(token: string) {
    try {
      const r = await apiGet<{ members: Member[] }>('/workspace/members', token);
      setMembers(r.members);
    } catch {
      // members list is non-critical on load
    }
  }

  async function loadInvites(token: string) {
    try {
      const r = await apiGet<{ invites: Invite[] }>('/workspace/invites', token);
      setInvites(r.invites);
    } catch {
      setInvites([]);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGet<MeResponse>('/me', token).then(setMe);
    loadMembers(token);
    loadInvites(token);
  }, []);

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setInviting(true);
    try {
      const result = await apiPost<{ invite: Invite }>('/workspace/members/invite', token, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setLastInviteUrl(result.invite.inviteUrl);
      toast('Invite created — copy the link below (email is not sent yet)', 'success');
      setInviteEmail('');
      setInviteRole('member');
      await loadMembers(token);
      await loadInvites(token);
    } catch (err) {
      toast(parseApiError(err), 'error');
    } finally {
      setInviting(false);
    }
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast('Invite link copied', 'success');
    } catch {
      toast(url, 'info');
    }
  }

  async function changeRole(userId: string, role: InviteRole) {
    const token = getToken();
    if (!token) return;
    try {
      await apiPatch(`/workspace/members/${userId}`, token, { role });
      toast('Role updated', 'success');
      await loadMembers(token);
    } catch (err) {
      toast(parseApiError(err), 'error');
    }
  }

  async function removeWorkspaceMember(userId: string) {
    const token = getToken();
    if (!token) return;
    if (!window.confirm('Remove this member from the workspace?')) return;
    try {
      await apiDelete(`/workspace/members/${userId}`, token);
      toast('Member removed', 'success');
      await loadMembers(token);
    } catch (err) {
      toast(parseApiError(err), 'error');
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
              <div className="w-full space-y-2 sm:w-[140px]">
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
              <Button type="submit" disabled={inviting} className="w-full text-primary-foreground sm:w-auto">
                {inviting ? 'Creating…' : 'Create invite'}
              </Button>
            </form>
            {lastInviteUrl && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={lastInviteUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={() => copyInviteUrl(lastInviteUrl)} className="text-foreground">
                  Copy link
                </Button>
              </div>
            )}
          </CardHeader>
        )}
        <CardContent className="pt-6">
          {members.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title="No members listed"
              description="Invite a colleague to share this workspace."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {me.user.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-foreground">{m.displayName}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {me.user.role === 'admin' && m.id !== me.user.id ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as InviteRole)}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">{m.role}</span>
                      )}
                    </TableCell>
                    {me.user.role === 'admin' && (
                      <TableCell className="text-right">
                        {m.id !== me.user.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeWorkspaceMember(m.id)}
                            className="text-foreground"
                          >
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {me.user.role === 'admin' && invites.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="text-foreground">{invite.email}</TableCell>
                    <TableCell className="text-muted-foreground">{invite.role}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInviteUrl(invite.inviteUrl)}
                        className="text-foreground"
                      >
                        Copy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
