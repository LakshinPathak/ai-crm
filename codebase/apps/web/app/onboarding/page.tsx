'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';
import { IntegrationLogo, type IntegrationId } from '@/components/brand/IntegrationLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { legacyBadgeVariant } from '@/lib/ui-badge';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken, setToken } from '@/lib/auth';
import type {
  CrmConnectResult,
  CrmStageMappingRow,
  MeResponse,
  OnboardingStatus,
  StageMappingsResponse,
  CrmIncrementalSyncStatusResponse,
  SyncStatusResponse,
  UserMappingRow,
  UserMappingsResponse,
} from '@/lib/types';

const CRM_SYNC_POLL_MS = 750;

function buildImportProgressText(
  sync: SyncStatusResponse,
  incremental: CrmIncrementalSyncStatusResponse,
  providerLabel: string,
): string {
  if (sync.status === 'failed') return 'Import failed';
  if (!incremental.connected) return 'Waiting for CRM connection…';

  if (sync.status === 'running') {
    if (sync.total > 0) {
      return `Importing ${sync.processed} of ${sync.total} deals from ${providerLabel}…`;
    }
    if (incremental.pendingJobs > 0) {
      const jobs = incremental.pendingJobs === 1 ? 'job' : 'jobs';
      return `Syncing ${providerLabel} (${incremental.pendingJobs} pending ${jobs})…`;
    }
    return `Importing deals from ${providerLabel}…`;
  }

  if (sync.status === 'completed') {
    const count = sync.total > 0 ? sync.total : sync.processed;
    if (incremental.errorCount > 0) {
      const errLabel = incremental.errorCount === 1 ? 'error' : 'errors';
      return `Import complete — ${count} deals (${incremental.errorCount} sync ${errLabel})`;
    }
    return `Import complete — ${sync.processed} of ${sync.total || count} deals`;
  }

  if (incremental.pendingJobs > 0) {
    return `Finishing sync (${incremental.pendingJobs} pending)…`;
  }

  return `Preparing import from ${providerLabel}…`;
}

type CrmProviderOption = {
  id: string;
  name: string;
  logo: IntegrationId | null;
  description: string;
};

const CRM_PROVIDERS: CrmProviderOption[] = [
  { id: 'hubspot', name: 'HubSpot', logo: 'hubspot', description: 'Deals, contacts & webhooks' },
  { id: 'pipedrive', name: 'Pipedrive', logo: 'pipedrive', description: 'Pipeline-first SMB CRM' },
  { id: 'zoho', name: 'Zoho CRM', logo: 'zoho', description: 'EU/US datacenter support' },
  { id: 'salesforce', name: 'Salesforce', logo: 'salesforce', description: 'Enterprise opportunities' },
  { id: 'none', name: 'Skip for now', logo: null, description: 'Explore with sample data' },
];

const STEP_LABELS = ['CRM', 'Connect', 'Stages', 'Team', 'Import'] as const;
const UNASSIGNED_MEMBER = '__unassigned__';

function WizardStepper({ current }: { current: number }) {
  return (
    <nav aria-label="Onboarding steps" className="mb-2">
      <ol className="flex items-start">
        {STEP_LABELS.map((label, idx) => {
          const n = idx + 1;
          const done = n < current;
          const active = n === current;
          const upcoming = n > current;
          return (
            <li key={label} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  aria-hidden={idx === 0}
                  className={cn(
                    'h-0.5 min-w-0 flex-1 rounded-full transition-colors duration-300',
                    idx === 0 ? 'bg-transparent' : done || active ? 'bg-primary' : 'bg-border',
                  )}
                />
                <span
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                    done && 'bg-primary text-primary-foreground shadow-[0_0_0_4px_var(--primary-glow)]',
                    active &&
                      'bg-primary text-primary-foreground shadow-[0_0_0_6px_var(--primary-glow)] ring-2 ring-primary/30',
                    upcoming && 'border border-border bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5 stroke-[2.5]" /> : n}
                </span>
                <span
                  aria-hidden={idx === STEP_LABELS.length - 1}
                  className={cn(
                    'h-0.5 min-w-0 flex-1 rounded-full transition-colors duration-300',
                    idx === STEP_LABELS.length - 1
                      ? 'bg-transparent'
                      : done
                        ? 'bg-primary'
                        : 'bg-border',
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-2 max-w-full truncate px-0.5 text-center text-[11px] font-semibold tracking-wide',
                  active && 'text-primary',
                  done && 'text-foreground',
                  upcoming && 'text-muted-foreground',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function OnboardingShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary-glow),transparent_55%)]"
      />
      <Card className="relative w-full max-w-[640px] border-border/80 bg-card shadow-[0_24px_80px_-24px_oklch(0.45_0.08_290_/_0.35)]">
        <CardHeader className="items-center px-4 text-center sm:px-6">
          <BrandLogo href="/" size="lg" showText={false} />
          <CardTitle className="mt-4 text-xl text-card-foreground sm:text-2xl">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-4 text-card-foreground sm:px-6">{children}</CardContent>
        {footer ? (
          <CardFooter className="flex-wrap justify-end gap-2 border-t border-border/60 bg-muted/40 px-4 sm:px-6">
            {footer}
          </CardFooter>
        ) : null}
      </Card>
    </main>
  );
}

function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong';
  try {
    const parsed = JSON.parse(err.message) as { error?: { message?: string } };
    return parsed.error?.message ?? err.message;
  } catch {
    return err.message;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<'loading' | 'workspace' | 'wizard'>('loading');
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [provider, setProvider] = useState('hubspot');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [connectResult, setConnectResult] = useState<CrmConnectResult | null>(null);
  const [connected, setConnected] = useState(false);

  const [pipelines, setPipelines] = useState<Array<{ externalId: string; name: string }>>([]);
  const [pipelineId, setPipelineId] = useState('default');
  const [stageMappings, setStageMappings] = useState<CrmStageMappingRow[]>([]);
  const [internalStages, setInternalStages] = useState<StageMappingsResponse['internalStages']>([]);

  const [userMappings, setUserMappings] = useState<UserMappingRow[]>([]);
  const [crmOwners, setCrmOwners] = useState<UserMappingsResponse['crmOwners']>([]);
  const [members, setMembers] = useState<UserMappingsResponse['workspaceMembers']>([]);

  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0, status: 'idle' as SyncStatusResponse['status'] });
  const [importProgressText, setImportProgressText] = useState('');
  const [importDone, setImportDone] = useState(false);

  const skippedCrm = provider === 'none';
  const providerMeta = CRM_PROVIDERS.find((p) => p.id === provider);

  const loadStageMappings = useCallback(async (token: string, selectedProvider: string, selectedPipeline: string) => {
    const data = await apiGet<StageMappingsResponse>(
      `/integrations/crm/mappings/stages?pipelineId=${encodeURIComponent(selectedPipeline)}`,
      token,
    );
    setInternalStages(data.internalStages);
    setStageMappings(data.mappings);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/sign-in');
      return;
    }

    apiGet<MeResponse>('/me', token)
      .then(async (me) => {
        if (!me.workspace) {
          setPhase('workspace');
          return;
        }

        setPhase('wizard');
        const status = await apiGet<OnboardingStatus>('/onboarding/status', token);
        if (status.completed) {
          router.replace('/home');
          return;
        }

        const resumeStep = Math.max(1, Math.min(5, status.currentStep));
        if (status.selectedProvider) setProvider(status.selectedProvider);
        setStep(resumeStep);

        if (status.selectedProvider && status.selectedProvider !== 'none') {
          const conn = await apiGet<{ connected: boolean; mode?: string | null }>(
            '/integrations/crm/status',
            token,
          );
          setConnected(conn.connected);
        }
      })
      .catch(() => setPhase('workspace'));
  }, [router]);

  useEffect(() => {
    if (step !== 2 || skippedCrm) return;
    const token = getToken();
    if (!token) return;

    apiGet<{ connected: boolean; provider: string | null; mode?: string | null }>(
      '/integrations/crm/status',
      token,
    ).then((status) => {
      if (!status.connected) return;
      setConnected(true);
      setConnectResult({
        connected: true,
        provider: status.provider ?? provider,
        mode: status.mode === 'live' ? 'live' : 'demo',
        message:
          status.mode === 'live'
            ? 'Live sync enabled for this workspace.'
            : 'Connected in demo mode — sample CRM data will be imported.',
      });
    }).catch(() => undefined);
  }, [step, skippedCrm, provider]);

  useEffect(() => {
    if (step !== 3 || skippedCrm) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    apiGet<{ pipelines: Array<{ externalId: string; name: string }> }>(
      `/integrations/crm/${provider}/pipelines`,
      token,
    )
      .then(async (pipelineRes) => {
        setPipelines(pipelineRes.pipelines);
        const initialPipeline = pipelineRes.pipelines[0]?.externalId ?? 'default';
        setPipelineId(initialPipeline);
        await loadStageMappings(token, provider, initialPipeline);
      })
      .catch((err) => setError(parseApiError(err)))
      .finally(() => setLoading(false));
  }, [step, provider, skippedCrm, loadStageMappings]);

  useEffect(() => {
    if (step !== 4 || skippedCrm) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    apiGet<UserMappingsResponse>('/integrations/crm/mappings/users', token)
      .then((data) => {
        setCrmOwners(data.crmOwners);
        setMembers(data.workspaceMembers);
        setUserMappings(data.mappings);
      })
      .catch((err) => setError(parseApiError(err)))
      .finally(() => setLoading(false));
  }, [step, skippedCrm]);

  useEffect(() => {
    if (step !== 5) return;
    const token = getToken();
    if (!token) return;

    if (skippedCrm) {
      setImportDone(true);
      setImportProgress({ processed: 1, total: 1, status: 'completed' });
      return;
    }

    let cancelled = false;
    setImportDone(false);
    setImportProgress({ processed: 0, total: 0, status: 'running' });
    setImportProgressText(`Importing deals from ${providerMeta?.name ?? provider}…`);

    const providerLabel = providerMeta?.name ?? provider;

    const pollSyncProgress = async () => {
      const [sync, incremental] = await Promise.all([
        apiGet<SyncStatusResponse>('/integrations/crm/sync/status', token),
        apiGet<CrmIncrementalSyncStatusResponse>('/integrations/crm/sync-status', token),
      ]);
      if (cancelled) return;

      setImportProgress({
        processed: sync.processed,
        total: sync.total,
        status: sync.status === 'idle' && sync.processed === 0 ? 'running' : sync.status,
      });
      setImportProgressText(buildImportProgressText(sync, incremental, providerLabel));

      if (sync.status === 'completed') {
        setImportDone(true);
      } else if (sync.status === 'failed') {
        setImportProgress((prev) => ({ ...prev, status: 'failed' }));
      }
    };

    let pollTimer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      try {
        await pollSyncProgress();
        pollTimer = setInterval(() => {
          pollSyncProgress().catch(() => undefined);
        }, CRM_SYNC_POLL_MS);

        await apiPost('/integrations/crm/sync', token, {});
        if (cancelled) return;

        await pollSyncProgress();
      } catch (err) {
        if (!cancelled) {
          setError(parseApiError(err));
          setImportProgress((prev) => ({ ...prev, status: 'failed' }));
          setImportProgressText('Import failed');
        }
      } finally {
        if (pollTimer) clearInterval(pollTimer);
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [step, skippedCrm, provider, providerMeta?.name]);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ token: string; accessToken?: string }>('/onboarding/workspace', token, { name: workspaceName });
      setToken(res.accessToken ?? res.token);
      setPhase('wizard');
      setStep(1);
      toast('Workspace created', 'success');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function persistStep(nextStep: number, selectedProvider?: string) {
    const token = getToken();
    if (!token) return;
    await apiPatch('/onboarding/step', token, {
      step: nextStep,
      ...(selectedProvider ? { selectedProvider } : {}),
    });
    setStep(nextStep);
  }

  async function saveProviderAndContinue() {
    setLoading(true);
    setError(null);
    try {
      if (skippedCrm) {
        await persistStep(5, 'none');
        return;
      }
      await persistStep(2, provider);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function connectCrm(): Promise<boolean> {
    const token = getToken();
    if (!token) return false;
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost<CrmConnectResult>(`/integrations/crm/connect/${provider}`, token, {});
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return false;
      }
      setConnectResult(result);
      setConnected(true);
      toast(result.mode === 'live' ? 'Live CRM connected' : 'Demo mode connected', 'success');
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function continueFromConnect() {
    setLoading(true);
    setError(null);
    try {
      if (!connected) {
        const ok = await connectCrm();
        if (!ok) return;
      }
      await persistStep(3);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveStageMappings() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await apiPatch('/integrations/crm/mappings/stages', token, { mappings: stageMappings });
      await persistStep(4);
      toast('Stage mappings saved', 'success');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveUserMappings(skip = false) {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (!skip) {
        await apiPatch('/integrations/crm/mappings/users', token, { mappings: userMappings });
      }
      await persistStep(5);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost('/onboarding/complete', token, {});
      router.push('/home');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePipelineChange(nextPipelineId: string) {
    setPipelineId(nextPipelineId);
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      await loadStageMappings(token, provider, nextPipelineId);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const progressPct = useMemo(() => {
    if (importProgress.total <= 0) return importDone ? 100 : 8;
    return Math.round((importProgress.processed / importProgress.total) * 100);
  }, [importProgress, importDone]);

  if (phase === 'loading') {
    return (
      <OnboardingShell title="Connect your CRM" description="Loading…">
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </OnboardingShell>
    );
  }

  if (phase === 'workspace') {
    return (
      <OnboardingShell title="Create your workspace" description="Set up your team before connecting a CRM.">
        <form onSubmit={createWorkspace}>
          <Label htmlFor="name" className="text-foreground">
            Workspace name
          </Label>
          <Input
            id="name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            required
            minLength={2}
            className="mt-2 mb-4 w-full text-foreground"
          />
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full text-primary-foreground">
            {loading ? 'Creating…' : 'Continue to CRM setup'}
          </Button>
        </form>
      </OnboardingShell>
    );
  }

  const wizardActions = (
    <>
      {step > 1 && step < 5 && (
        <Button variant="ghost" className="text-foreground" onClick={() => setStep(step - 1)} disabled={loading}>
          Back
        </Button>
      )}

      {step === 1 && (
        <Button onClick={saveProviderAndContinue} disabled={loading} className="text-primary-foreground">
          {loading ? 'Saving…' : skippedCrm ? 'Continue without CRM' : 'Continue'}
        </Button>
      )}

      {step === 2 && !skippedCrm && (
        <Button
          onClick={continueFromConnect}
          disabled={loading || (!connected && loading)}
          className="text-primary-foreground"
        >
          {loading ? 'Working…' : connected ? 'Continue' : 'Connect & continue'}
        </Button>
      )}

      {step === 3 && !skippedCrm && (
        <Button
          onClick={saveStageMappings}
          disabled={loading || stageMappings.length === 0}
          className="text-primary-foreground"
        >
          {loading ? 'Saving…' : 'Save & continue'}
        </Button>
      )}

      {step === 4 && !skippedCrm && (
        <>
          <Button variant="ghost" className="text-foreground" onClick={() => saveUserMappings(true)} disabled={loading}>
            Skip
          </Button>
          <Button onClick={() => saveUserMappings(false)} disabled={loading} className="text-primary-foreground">
            {loading ? 'Saving…' : 'Save & import'}
          </Button>
        </>
      )}

      {step === 5 && (
        <Button
          onClick={finish}
          disabled={loading || (!skippedCrm && !importDone && importProgress.status === 'running')}
          className="text-primary-foreground"
        >
          {loading ? 'Finishing…' : 'Go to dashboard'}
        </Button>
      )}
    </>
  );

  return (
    <OnboardingShell
      title="Connect your CRM"
      description={`Step ${step} of 5 — ${STEP_LABELS[step - 1]}`}
      footer={wizardActions}
    >
        <WizardStepper current={step} />

        {step === 1 && (
          <div>
            <p className="mt-0 text-sm text-muted-foreground">
              Which CRM does your team use? You can change this later in Settings.
            </p>
            <div className="onboarding-provider-grid">
              {CRM_PROVIDERS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    'onboarding-provider-card relative',
                    provider === opt.id && 'onboarding-provider-card--selected',
                  )}
                  onClick={() => setProvider(opt.id)}
                  aria-pressed={provider === opt.id}
                >
                  {opt.logo ? <IntegrationLogo id={opt.logo} size={36} /> : (
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-lg text-muted-foreground">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="onboarding-provider-card__name">{opt.name}</div>
                    <div className="onboarding-provider-card__hint">{opt.description}</div>
                  </div>
                  {provider === opt.id ? (
                    <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3 stroke-[2.5]" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && !skippedCrm && (
          <div>
            <div className="onboarding-connect-panel">
              <div className="onboarding-connect-panel__header">
                {providerMeta?.logo && <IntegrationLogo id={providerMeta.logo} size={40} />}
                <div>
                  <h3>{providerMeta?.name}</h3>
                  <p className="m-0 text-[13px] text-muted-foreground">
                    Authorize read access to deals, stages, and owners.
                  </p>
                </div>
              </div>
              {connected && connectResult ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge variant={legacyBadgeVariant('enabled')}>Connected</Badge>
                  {connectResult.mode === 'live' ? (
                    <Badge variant={legacyBadgeVariant('green')}>Live mode</Badge>
                  ) : (
                    <Badge variant={legacyBadgeVariant('warning')}>Demo mode</Badge>
                  )}
                </div>
              ) : (
                <p className="mb-4 mt-0 text-[13px] text-muted-foreground">
                  Without OAuth credentials, we connect in demo mode and import sample deals instantly.
                </p>
              )}
              {!connected && (
                <Button onClick={connectCrm} disabled={loading} className="text-primary-foreground">
                  {loading ? 'Connecting…' : `Connect ${providerMeta?.name}`}
                </Button>
              )}
              {connectResult?.message && (
                <p className="mb-0 mt-3 text-[13px] text-muted-foreground">
                  {connectResult.message}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && !skippedCrm && (
          <div>
            {pipelines.length > 1 && (
              <div className="mb-4">
                <Label htmlFor="pipeline" className="text-foreground">
                  Pipeline
                </Label>
                <Select value={pipelineId} onValueChange={handlePipelineChange}>
                  <SelectTrigger id="pipeline" className="mt-1.5 w-full">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.externalId} value={p.externalId}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="mt-0 text-sm text-muted-foreground">
              Map each CRM stage to your internal pipeline. We auto-suggest matches by name.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="onboarding-mapping-table">
                <thead>
                  <tr>
                    <th className="text-foreground">CRM stage</th>
                    <th className="text-foreground">Internal stage</th>
                  </tr>
                </thead>
                <tbody>
                  {stageMappings.map((row, idx) => (
                    <tr key={row.stageExternalId}>
                      <td>{row.stageExternalLabel}</td>
                      <td>
                        <Select
                          value={row.internalStageId || undefined}
                          onValueChange={(value) => {
                            const next = [...stageMappings];
                            next[idx] = { ...row, internalStageId: value };
                            setStageMappings(next);
                          }}
                        >
                          <SelectTrigger className="w-full min-w-40" aria-label={`Internal stage for ${row.stageExternalLabel}`}>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {internalStages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 4 && !skippedCrm && (
          <div>
            <p className="mt-0 text-sm text-muted-foreground">
              Match CRM owners to workspace members. Unmapped owners default to you.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="onboarding-mapping-table">
                <thead>
                  <tr>
                    <th className="text-foreground">CRM user</th>
                    <th className="text-foreground">Workspace member</th>
                  </tr>
                </thead>
                <tbody>
                  {userMappings.map((row, idx) => {
                    const owner = crmOwners.find((o) => o.externalId === row.externalUserId);
                    return (
                      <tr key={row.externalUserId}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{owner?.name ?? row.externalUserId}</div>
                          <div className="text-xs text-muted-foreground">{owner?.email ?? row.externalEmail}</div>
                        </td>
                        <td>
                          <Select
                            value={row.internalUserId ?? UNASSIGNED_MEMBER}
                            onValueChange={(value) => {
                              const next = [...userMappings];
                              next[idx] = {
                                ...row,
                                internalUserId: value === UNASSIGNED_MEMBER ? null : value,
                              };
                              setUserMappings(next);
                            }}
                          >
                            <SelectTrigger className="w-full min-w-48" aria-label={`Workspace member for ${owner?.name ?? row.externalUserId}`}>
                              <SelectValue placeholder="Unassigned (defaults to you)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED_MEMBER}>Unassigned (defaults to you)</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.displayName} ({m.email})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            {skippedCrm ? (
              <p className="mt-0 text-sm text-muted-foreground">
                Sample deals and pipeline stages are ready. Connect a CRM anytime from Settings.
              </p>
            ) : (
              <>
                <p className="mt-0 text-sm text-muted-foreground">
                  {importDone
                    ? 'Your pipeline is ready — open the dashboard when you are.'
                    : 'We are pulling deals and matching them to your pipeline stages.'}
                </p>
                <div className="onboarding-progress">
                  <Progress value={progressPct} className="h-2" />
                  <div className="onboarding-progress__label">
                    <span>
                      {importProgressText ||
                        (importProgress.status === 'failed'
                          ? 'Import failed'
                          : importDone
                            ? `Imported ${importProgress.processed} of ${importProgress.total} deals`
                            : `Importing ${importProgress.processed}/${importProgress.total || '…'} deals`)}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </OnboardingShell>
  );
}
