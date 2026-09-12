'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiDelete, apiGet, apiPost, ApiError } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type McpServer = {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected';
};

function mcpStatusBadge(status: McpServer['status']) {
  if (status === 'connected') return <Badge>Connected</Badge>;
  return <Badge variant="outline">Disconnected</Badge>;
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    try {
      const body = JSON.parse(err.message) as { error?: { message?: string } };
      if (body.error?.message) return body.error.message;
    } catch {
      /* raw text */
    }
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function SettingsMcpPage() {
  const { toast } = useToast();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const rows = await apiGet<McpServer[]>('/settings/mcp', token);
    setServers(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    load()
      .catch((err) => setError(errorMessage(err, 'Failed to load MCP servers')))
      .finally(() => setLoading(false));
  }, [load]);

  async function addServer(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !name.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost<McpServer>('/settings/mcp', token, {
        name: name.trim(),
        url: url.trim(),
      });
      setServers((prev) => [...prev, created]);
      setName('');
      setUrl('');
      toast('MCP server added', 'success');
    } catch (err) {
      toast(errorMessage(err, 'Failed to add MCP server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteServer(id: string) {
    const token = getToken();
    if (!token) return;
    setDeletingId(id);
    try {
      await apiDelete(`/settings/mcp/${encodeURIComponent(id)}`, token);
      setServers((prev) => prev.filter((server) => server.id !== id));
      toast('MCP server removed', 'success');
    } catch (err) {
      toast(errorMessage(err, 'Failed to remove MCP server'), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="MCP servers"
        subtitle="Connect Model Context Protocol servers so agents can use external tools"
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

      {loading && (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Alert className="mb-4">
            <AlertTitle>Preview</AlertTitle>
            <AlertDescription>
              Servers are stored for this workspace. Status stays disconnected until an MCP handshake
              is added.
            </AlertDescription>
          </Alert>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Add server</CardTitle>
              <CardDescription>HTTP(S) or stdio: URLs only. Maximum 20 per workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addServer} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="mcp-name">Name</Label>
                  <Input
                    id="mcp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Filesystem"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-url">URL</Label>
                  <Input
                    id="mcp-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://mcp.example/tools or stdio://local/filesystem"
                    maxLength={2048}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Adding…' : 'Add'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {servers.length === 0 ? (
            <EmptyState
              title="No MCP servers registered"
              description="Add a server above. Registered servers will appear here for this workspace."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Registered servers</CardTitle>
                <CardDescription>
                  {servers.length} server{servers.length === 1 ? '' : 's'} registered.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id}>
                        <TableCell className="font-medium">{server.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{server.url}</TableCell>
                        <TableCell>{mcpStatusBadge(server.status)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === server.id}
                            onClick={() => deleteServer(server.id)}
                          >
                            {deletingId === server.id ? 'Removing…' : 'Delete'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
