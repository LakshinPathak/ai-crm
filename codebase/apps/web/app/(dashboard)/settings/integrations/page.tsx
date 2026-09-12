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
type ChatStatus = { connected: boolean; provider: string; externalAccountId: string | null; lastSyncAt: string | null };
type GongStatus = {
  connected: boolean;
  provider: string;
  externalAccountId: string | null;
  apiBaseUrl: string | null;
};
type PlatformIntegration = { id: string; name: string; category: string; status: string };
type CalendarStatus = {
  connected: boolean;
  provider: string;
  externalAccountId: string | null;
  lastSyncAt: string | null;
  mode?: string | null;
};
type SyncResult = { imported: { companies: number; deals: number; notes: number; tasks?: number; skipped?: number }; mode?: string };

const CALENDAR_UI_ID = 'google-calendar';
const CALENDAR_API_PROVIDER = 'google_calendar';

const STATIC_RECORDING_PROVIDERS: Provider[] = [
  { id: 'zoom', name: 'Zoom', status: 'warning' },
  { id: 'chorus', name: 'Chorus', status: 'coming_soon' },
];

const CHAT_PROVIDER_IDS = ['slack', 'teams', 'google_chat'] as const;
type ChatProviderId = (typeof CHAT_PROVIDER_IDS)[number];

const CHAT_PROVIDER_LABELS: Record<ChatProviderId, string> = {
  slack: 'Slack',
  teams: 'Microsoft Teams',
  google_chat: 'Google Chat',
};

function isConnectableStatus(status: string): boolean {
  return status === 'available' || status === 'enabled';
}

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
              <CardHeader className="flex flex-col items-start gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <IntegrationLogoOrFallback id={p.id} name={p.name} size={40} />
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                </div>
                {isConnected ? (
                  <Badge variant="default">Connected</Badge>
                ) : badgeVariant ? (
                  <Badge variant={badgeVariant}>
                    {p.status === 'coming_soon'
                      ? 'Coming soon'
                      : p.status === 'needs_config'
                        ? 'Needs config'
                        : p.status === 'warning'
                          ? 'Warning'
                          : 'Enabled'}
                  </Badge>
                ) : null}
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {p.status === 'available' || p.status === 'enabled'
                    ? p.id === CALENDAR_UI_ID
                      ? `Connect ${p.name} to sync meetings onto linked deals.`
                      : `Connect ${p.name} to receive agent notifications and deal updates.`
                    : p.status === 'needs_config'
                      ? `${p.name} OAuth is not configured on the server yet.`
                    : p.status === 'coming_soon'
                      ? `${p.name} integration is coming soon.`
                      : `Manage your ${p.name} connection.`}
                </CardDescription>
              </CardContent>
              <CardFooter className="flex-wrap gap-2">
                {isConnectableStatus(p.status) && !isConnected && (
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
  const [chatProviders, setChatProviders] = useState<Provider[]>([]);
  const [chatStatus, setChatStatus] = useState<Record<string, ChatStatus>>({});
  const [recordingProviders, setRecordingProviders] = useState<Provider[]>([]);
  const [gongStatus, setGongStatus] = useState<GongStatus | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [calendarProviders, setCalendarProviders] = useState<Provider[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [calendarSyncing, setCalendarSyncing] = useState(false);

  function load() {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGet<{ providers: Provider[] }>('/integrations/crm/providers', token),
      apiGet<CrmStatus>('/integrations/crm/status', token),
      apiGet<{ providers: Provider[] }>('/integrations/chat/providers', token),
      ...CHAT_PROVIDER_IDS.map((id) => apiGet<ChatStatus>(`/integrations/chat/${id}/status`, token)),
      apiGet<{ integrations: PlatformIntegration[] }>('/integrations/providers', token),
      apiGet<GongStatus>('/integrations/gong/status', token),
      apiGet<CalendarStatus>(`/integrations/calendar/${CALENDAR_API_PROVIDER}/status`, token),
    ]).then(([p, s, chat, ...rest]) => {
      const chatStatuses = rest.slice(0, CHAT_PROVIDER_IDS.length) as ChatStatus[];
      const platform = rest[CHAT_PROVIDER_IDS.length] as { integrations: PlatformIntegration[] };
      const gong = rest[CHAT_PROVIDER_IDS.length + 1] as GongStatus;
      const calStatus = rest[CHAT_PROVIDER_IDS.length + 2] as CalendarStatus;

      setProviders(
        p.providers.map((provider) => ({
          ...provider,
          status: provider.status === 'available' ? 'enabled' : provider.status,
        })),
      );
      setStatus(s);
      setChatProviders(
        chat.providers.map((provider) => ({
          ...provider,
          status: provider.status === 'available' ? 'enabled' : provider.status,
        })),
      );
      setChatStatus(
        Object.fromEntries(CHAT_PROVIDER_IDS.map((id, index) => [id, chatStatuses[index]])),
      );

      const gongMeta = platform.integrations.find((i) => i.id === 'gong');
      const gongProvider: Provider = {
        id: 'gong',
        name: gongMeta?.name ?? 'Gong',
        status: gongMeta
          ? gongMeta.status === 'available'
            ? 'enabled'
            : gongMeta.status
          : 'enabled',
      };
      setRecordingProviders([gongProvider, ...STATIC_RECORDING_PROVIDERS]);
      setGongStatus(gong);

      const calMeta = platform.integrations.find((i) => i.id === CALENDAR_API_PROVIDER);
      const calCardStatus =
        calMeta?.status === 'available'
          ? 'enabled'
          : calMeta?.status === 'needs_config'
            ? 'needs_config'
            : 'coming_soon';
      setCalendarProviders([{ id: CALENDAR_UI_ID, name: 'Google Calendar', status: calCardStatus }]);
      setCalendarStatus(calStatus);
    });
  }

  useEffect(() => { load(); }, []);

  async function connect(providerId: string) {
    const token = getToken();
    if (!token) return;
    try {
      const result = await apiPost<{ authUrl?: string; connected?: boolean }>(
        `/integrations/crm/connect/${providerId}`,
        token,
        {},
      );
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }
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

  async function connectChat(providerId: string) {
    const token = getToken();
    if (!token) return;
    try {
      const result = await apiPost<{ authUrl?: string }>(`/integrations/chat/${providerId}/connect`, token, {});
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }
      load();
      toast(`${CHAT_PROVIDER_LABELS[providerId as ChatProviderId] ?? providerId} connected`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Connect failed', 'error');
    }
  }

  async function disconnectChat(providerId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/integrations/chat/${providerId}`, token);
      load();
      toast('Disconnected', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Disconnect failed', 'error');
    }
  }

  async function connectRecording(providerId: string) {
    if (providerId !== 'gong') return;
    const token = getToken();
    if (!token) return;
    try {
      const result = await apiPost<{ authUrl?: string }>('/integrations/gong/connect', token, {});
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }
      load();
      toast('Gong connected', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Connect failed', 'error');
    }
  }

  async function disconnectRecording(providerId: string) {
    if (providerId !== 'gong') return;
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete('/integrations/gong', token);
      load();
      toast('Disconnected', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Disconnect failed', 'error');
    }
  }

  async function connectCalendar(providerId: string) {
    if (providerId !== CALENDAR_UI_ID) {
      toast('Coming soon', 'info');
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const result = await apiPost<{ authUrl?: string }>(
        `/integrations/calendar/${CALENDAR_API_PROVIDER}/connect`,
        token,
        {},
      );
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return;
      }
      load();
      toast('Google Calendar connected', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Connect failed', 'error');
    }
  }

  async function disconnectCalendar(providerId: string) {
    if (providerId !== CALENDAR_UI_ID) return;
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/integrations/calendar/${CALENDAR_API_PROVIDER}`, token);
      load();
      toast('Disconnected', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Disconnect failed', 'error');
    }
  }

  async function syncCalendar() {
    const token = getToken();
    if (!token) return;
    setCalendarSyncing(true);
    try {
      await apiPost(`/integrations/calendar/${CALENDAR_API_PROVIDER}/sync`, token, {});
      load();
      toast('Calendar sync queued (demo — check API logs)', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Calendar sync failed', 'error');
    } finally {
      setCalendarSyncing(false);
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

  const chat: Provider[] =
    chatProviders.length > 0
      ? chatProviders
      : CHAT_PROVIDER_IDS.map((id) => ({
          id,
          name: CHAT_PROVIDER_LABELS[id],
          status: 'enabled',
        }));
  const recording: Provider[] =
    recordingProviders.length > 0
      ? recordingProviders
      : [{ id: 'gong', name: 'Gong', status: 'enabled' }, ...STATIC_RECORDING_PROVIDERS];
  const calendar: Provider[] =
    calendarProviders.length > 0
      ? [
          ...calendarProviders,
          { id: 'outlook', name: 'Outlook', status: 'coming_soon' },
        ]
      : [
          { id: CALENDAR_UI_ID, name: 'Google Calendar', status: 'coming_soon' },
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
            <strong className="min-w-0">{status.provider ? providers.find((p) => p.id === status.provider)?.name ?? status.provider : ''}</strong>
            {status.mode === 'demo' && <Badge variant="outline">Demo mode</Badge>}
            {status.lastSyncAt && (
              <span className="text-sm text-muted-foreground">
                Last sync {new Date(status.lastSyncAt).toLocaleString()}
              </span>
            )}
            <Button size="sm" onClick={sync} disabled={syncing} className="w-full sm:ml-auto sm:w-auto">
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
      <IntegrationSection
        title="Chat"
        providers={chat}
        connectedProvider={CHAT_PROVIDER_IDS.find((id) => chatStatus[id]?.connected) ?? null}
        onConnect={connectChat}
        onDisconnect={disconnectChat}
      />
      <IntegrationSection
        title="Call recording"
        providers={recording}
        connectedProvider={gongStatus?.connected ? 'gong' : null}
        onConnect={connectRecording}
        onDisconnect={disconnectRecording}
      />

      {calendarStatus?.connected && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Badge variant="default">Connected</Badge>
            <IntegrationLogo id="google-calendar" size={28} />
            <strong className="min-w-0">Google Calendar</strong>
            {calendarStatus.mode === 'demo' && <Badge variant="outline">Demo ingest</Badge>}
            {calendarStatus.lastSyncAt && (
              <span className="text-sm text-muted-foreground">
                Last sync {new Date(calendarStatus.lastSyncAt).toLocaleString()}
              </span>
            )}
            <Button
              size="sm"
              onClick={syncCalendar}
              disabled={calendarSyncing}
              className="w-full sm:ml-auto sm:w-auto"
            >
              {calendarSyncing ? 'Syncing…' : 'Sync calendar'}
            </Button>
          </CardContent>
        </Card>
      )}

      <IntegrationSection
        title="Calendar"
        providers={calendar}
        connectedProvider={calendarStatus?.connected ? CALENDAR_UI_ID : null}
        onConnect={connectCalendar}
        onDisconnect={disconnectCalendar}
      />
      <IntegrationSection title="Platform" providers={platform} onConnect={() => toast('Coming soon', 'info')} />
    </div>
  );
}
