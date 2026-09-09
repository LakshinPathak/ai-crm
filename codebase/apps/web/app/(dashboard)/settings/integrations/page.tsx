'use client';

import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { integrationStatusBadge } from '@/lib/ui-badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/Toast';
import { IntegrationLogo, IntegrationLogoOrFallback, resolveIntegrationId } from '@/components/brand/IntegrationLogo';

type Provider = { id: string; name: string; status: string; mode?: string };
type CrmStatus = { connected: boolean; provider: string | null; lastSyncAt: string | null; mode?: string | null };
type SyncResult = { imported: { companies: number; deals: number; notes: number; tasks?: number; skipped?: number }; mode?: string };

function IntegrationSection({
  title,
  providers,
  connectedProvider,
  onConnect,
  onDisconnect,
}: {
  title: string;
  providers: Provider[];
  connectedProvider?: string | null;
  onConnect: (id: string) => void;
  onDisconnect?: (id: string) => void;
}) {
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  if (providers.length === 0) return null;
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => {
          const isConnected = connectedProvider === p.id;
          const badgeVariant = integrationStatusBadge(p.status);
          return (
            <Card key={p.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex items-center gap-3">
                  <IntegrationLogoOrFallback id={p.id} name={p.name} size={40} />
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                </div>
                {isConnected ? (
                  <Badge variant="default">Connected</Badge>
                ) : badgeVariant ? (
                  <Badge variant={badgeVariant}>
                    {p.status === 'coming_soon' ? 'Coming soon' : p.status === 'warning' ? 'Warning' : 'Enabled'}
                  </Badge>
                ) : null}
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {p.status === 'available'
                    ? `Connect ${p.name} to sync deals and contacts (demo mode until API keys are added).`
                    : p.status === 'coming_soon'
                      ? `${p.name} integration is coming soon.`
                      : `Manage your ${p.name} connection.`}
                </CardDescription>
              </CardContent>
              <CardFooter className="gap-2">
                {p.status === 'available' && !isConnected && (
                  <Button size="sm" onClick={() => onConnect(p.id)}>Connect</Button>
                )}
                {isConnected && onDisconnect && (
                  <Button variant="ghost" size="sm" onClick={() => setDisconnectId(p.id)}>
                    Disconnect
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {onDisconnect && (
        <AlertDialog open={disconnectId !== null} onOpenChange={(open) => { if (!open) setDisconnectId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect integration?</AlertDialogTitle>
              <AlertDialogDescription>
                Syncing will stop until you reconnect this provider.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  if (disconnectId) onDisconnect(disconnectId);
                  setDisconnectId(null);
                }}
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState<CrmStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  function load() {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGet<{ providers: Provider[] }>('/integrations/crm/providers', token),
      apiGet<CrmStatus>('/integrations/crm/status', token),
    ]).then(([p, s]) => {
      setProviders(p.providers);
      setStatus(s);
    });
  }

  useEffect(() => { load(); }, []);

  async function connect(providerId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiPost(`/integrations/crm/connect/${providerId}`, token, {});
      load();
      toast(`${providerId} connected`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Connect failed', 'error');
    }
  }

  async function disconnect(providerId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/integrations/crm/connect/${providerId}`, token);
      load();
      toast('Disconnected', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Disconnect failed', 'error');
    }
  }

  async function sync() {
    const token = getToken();
    if (!token) return;
    setSyncing(true);
    try {
      const result = await apiPost<SyncResult>('/integrations/crm/sync', token, {});
      load();
      const { companies, deals, notes, tasks, skipped } = result.imported;
      const parts = [`${companies} companies`, `${deals} deals`];
      if (notes) parts.push(`${notes} notes`);
      if (tasks) parts.push(`${tasks} tasks`);
      if (skipped) parts.push(`${skipped} unchanged`);
      toast(parts.length ? `Imported ${parts.join(', ')}` : 'Sync complete — no new records', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  const chat: Provider[] = [
    { id: 'slack', name: 'Slack', status: 'enabled' },
    { id: 'teams', name: 'Microsoft Teams', status: 'coming_soon' },
  ];
  const recording: Provider[] = [
    { id: 'gong', name: 'Gong', status: 'coming_soon' },
    { id: 'zoom', name: 'Zoom', status: 'warning' },
    { id: 'chorus', name: 'Chorus', status: 'coming_soon' },
  ];
  const calendar: Provider[] = [
    { id: 'google-calendar', name: 'Google Calendar', status: 'coming_soon' },
    { id: 'outlook', name: 'Outlook', status: 'coming_soon' },
  ];
  const platform: Provider[] = [
    { id: 'jira', name: 'Jira', status: 'coming_soon' },
    { id: 'linear', name: 'Linear', status: 'coming_soon' },
    { id: 'google-drive', name: 'Google Drive', status: 'coming_soon' },
    { id: 'notion', name: 'Notion', status: 'coming_soon' },
  ];

  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect your tools to sync data automatically" />

      {status?.connected && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Badge variant="default">Connected</Badge>
            {status.provider && resolveIntegrationId(status.provider) && (
              <IntegrationLogo id={resolveIntegrationId(status.provider)!} size={28} />
            )}
            <strong>{status.provider ? providers.find((p) => p.id === status.provider)?.name ?? status.provider : ''}</strong>
            {status.mode === 'demo' && <Badge variant="outline">Demo mode</Badge>}
            {status.lastSyncAt && (
              <span className="text-sm text-muted-foreground">
                Last sync {new Date(status.lastSyncAt).toLocaleString()}
              </span>
            )}
            <Button size="sm" onClick={sync} disabled={syncing} className="ml-auto">
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          </CardContent>
        </Card>
      )}

      <IntegrationSection
        title="CRM"
        providers={providers}
        connectedProvider={status?.provider}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <IntegrationSection title="Chat" providers={chat} onConnect={() => toast('Slack is pre-enabled in demo mode', 'info')} />
      <IntegrationSection title="Call recording" providers={recording} onConnect={() => toast('Coming soon', 'info')} />
      <IntegrationSection title="Calendar" providers={calendar} onConnect={() => toast('Coming soon', 'info')} />
      <IntegrationSection title="Platform" providers={platform} onConnect={() => toast('Coming soon', 'info')} />
    </div>
  );
}
