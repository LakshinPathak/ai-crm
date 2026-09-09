'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IntegrationLogo, type IntegrationId } from '@/components/brand/IntegrationLogo';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken, setToken } from '@/lib/auth';
import type {
  CrmConnectResult,
  CrmStageMappingRow,
  MeResponse,
  OnboardingStatus,
  StageMappingsResponse,
  SyncStatusResponse,
  UserMappingRow,
  UserMappingsResponse,
} from '@/lib/types';

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

const STEP_LABELS = ['CRM', 'Connect', 'Stages', 'Team', 'Import'];

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

    (async () => {
      try {
        const preview = await apiGet<SyncStatusResponse>('/integrations/crm/sync/status', token);
        const total = preview.total || 4;
        if (cancelled) return;

        setImportProgress({ processed: 0, total, status: 'running' });
        const tick = window.setInterval(() => {
          setImportProgress((prev) => {
            if (prev.status !== 'running') return prev;
            const next = Math.min(prev.total - 1, prev.processed + 1);
            return { ...prev, processed: next };
          });
        }, 350);

        await apiPost('/integrations/crm/sync', token, {});
        window.clearInterval(tick);
        if (cancelled) return;

        const finalStatus = await apiGet<SyncStatusResponse>('/integrations/crm/sync/status', token);
        setImportProgress({
          processed: finalStatus.processed || total,
          total: finalStatus.total || total,
          status: 'completed',
        });
        setImportDone(true);
      } catch (err) {
        if (!cancelled) {
          setError(parseApiError(err));
          setImportProgress((prev) => ({ ...prev, status: 'failed' }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, skippedCrm]);

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
      <main className="auth-page">
        <div className="auth-card onboarding-card">
          <p className="subtitle" style={{ marginBottom: 0 }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (phase === 'workspace') {
    return (
      <main className="auth-page">
        <div className="auth-card onboarding-card">
          <div className="auth-card__logo" style={{ margin: '0 0 1rem' }}>AI</div>
          <h1>Create your workspace</h1>
          <p className="subtitle">Set up your team before connecting a CRM.</p>
          <form onSubmit={createWorkspace}>
            <label htmlFor="name" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
              Workspace name
            </label>
            <input
              id="name"
              className="ui-input"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              minLength={2}
              style={{ marginTop: 8, marginBottom: 16, width: '100%' }}
            />
            {error && <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>}
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creating…' : 'Continue to CRM setup'}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card onboarding-card">
        <div className="auth-card__logo" style={{ margin: '0 0 1rem' }}>AI</div>
        <h1>Connect your CRM</h1>
        <p className="subtitle">Step {step} of 5 — {STEP_LABELS[step - 1]}</p>

        <div className="onboarding-steps" aria-hidden>
          {STEP_LABELS.map((_, idx) => {
            const n = idx + 1;
            const cls = n < step ? 'onboarding-steps__item--done' : n === step ? 'onboarding-steps__item--active' : '';
            return <div key={n} className={`onboarding-steps__item ${cls}`.trim()} />;
          })}
        </div>
        <div className="onboarding-steps__labels" aria-hidden>
          {STEP_LABELS.map((label, idx) => (
            <span key={label} className={idx + 1 === step ? 'onboarding-steps__label--active' : undefined}>
              {label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>
              Which CRM does your team use? You can change this later in Settings.
            </p>
            <div className="onboarding-provider-grid">
              {CRM_PROVIDERS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`onboarding-provider-card${provider === opt.id ? ' onboarding-provider-card--selected' : ''}`}
                  onClick={() => setProvider(opt.id)}
                >
                  {opt.logo ? <IntegrationLogo id={opt.logo} size={36} /> : (
                    <span style={{
                      width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: 'var(--muted)',
                    }}>—</span>
                  )}
                  <div>
                    <div className="onboarding-provider-card__name">{opt.name}</div>
                    <div className="onboarding-provider-card__hint">{opt.description}</div>
                  </div>
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
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    Authorize read access to deals, stages, and owners.
                  </p>
                </div>
              </div>
              {connected && connectResult ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge variant="enabled">Connected</Badge>
                  {connectResult.mode === 'live' ? (
                    <Badge variant="green">Live mode</Badge>
                  ) : (
                    <Badge variant="warning">Demo mode</Badge>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 1rem' }}>
                  Without OAuth credentials, we connect in demo mode and import sample deals instantly.
                </p>
              )}
              {!connected && (
                <Button onClick={connectCrm} disabled={loading}>
                  {loading ? 'Connecting…' : `Connect ${providerMeta?.name}`}
                </Button>
              )}
              {connectResult?.message && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                  {connectResult.message}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && !skippedCrm && (
          <div>
            {pipelines.length > 1 && (
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="pipeline" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                  Pipeline
                </label>
                <select
                  id="pipeline"
                  className="ui-input"
                  value={pipelineId}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  style={{ marginTop: 6, width: '100%' }}
                >
                  {pipelines.map((p) => (
                    <option key={p.externalId} value={p.externalId}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>
              Map each CRM stage to your internal pipeline. We auto-suggest matches by name.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="onboarding-mapping-table">
                <thead>
                  <tr>
                    <th>CRM stage</th>
                    <th>Internal stage</th>
                  </tr>
                </thead>
                <tbody>
                  {stageMappings.map((row, idx) => (
                    <tr key={row.stageExternalId}>
                      <td>{row.stageExternalLabel}</td>
                      <td>
                        <select
                          value={row.internalStageId}
                          onChange={(e) => {
                            const next = [...stageMappings];
                            next[idx] = { ...row, internalStageId: e.target.value };
                            setStageMappings(next);
                          }}
                        >
                          {internalStages.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
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
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>
              Match CRM owners to workspace members. Unmapped owners default to you.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="onboarding-mapping-table">
                <thead>
                  <tr>
                    <th>CRM user</th>
                    <th>Workspace member</th>
                  </tr>
                </thead>
                <tbody>
                  {userMappings.map((row, idx) => {
                    const owner = crmOwners.find((o) => o.externalId === row.externalUserId);
                    return (
                      <tr key={row.externalUserId}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{owner?.name ?? row.externalUserId}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{owner?.email ?? row.externalEmail}</div>
                        </td>
                        <td>
                          <select
                            value={row.internalUserId ?? ''}
                            onChange={(e) => {
                              const next = [...userMappings];
                              next[idx] = {
                                ...row,
                                internalUserId: e.target.value || null,
                              };
                              setUserMappings(next);
                            }}
                          >
                            <option value="">Unassigned (defaults to you)</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>{m.displayName} ({m.email})</option>
                            ))}
                          </select>
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
              <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>
                Sample deals and pipeline stages are ready. Connect a CRM anytime from Settings.
              </p>
            ) : (
              <>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 0 }}>
                  {importDone
                    ? 'Import complete — your pipeline is ready.'
                    : `Importing deals from ${providerMeta?.name ?? provider}…`}
                </p>
                <div className="onboarding-progress">
                  <div className="onboarding-progress__bar">
                    <div className="onboarding-progress__fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="onboarding-progress__label">
                    <span>
                      {importProgress.status === 'failed'
                        ? 'Import failed'
                        : importDone
                          ? `Imported ${importProgress.processed} of ${importProgress.total} deals`
                          : `Importing ${importProgress.processed}/${importProgress.total || '…'} deals`}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: 14, marginTop: '1rem' }}>{error}</p>}

        <div className="onboarding-actions">
          {step > 1 && step < 5 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading}>
              Back
            </Button>
          )}

          {step === 1 && (
            <Button onClick={saveProviderAndContinue} disabled={loading}>
              {loading ? 'Saving…' : skippedCrm ? 'Continue without CRM' : 'Continue'}
            </Button>
          )}

          {step === 2 && !skippedCrm && (
            <Button onClick={continueFromConnect} disabled={loading || (!connected && loading)}>
              {loading ? 'Working…' : connected ? 'Continue' : 'Connect & continue'}
            </Button>
          )}

          {step === 3 && !skippedCrm && (
            <Button onClick={saveStageMappings} disabled={loading || stageMappings.length === 0}>
              {loading ? 'Saving…' : 'Save & continue'}
            </Button>
          )}

          {step === 4 && !skippedCrm && (
            <>
              <Button variant="ghost" onClick={() => saveUserMappings(true)} disabled={loading}>
                Skip
              </Button>
              <Button onClick={() => saveUserMappings(false)} disabled={loading}>
                {loading ? 'Saving…' : 'Save & import'}
              </Button>
            </>
          )}

          {step === 5 && (
            <Button onClick={finish} disabled={loading || (!skippedCrm && !importDone && importProgress.status === 'running')}>
              {loading ? 'Finishing…' : 'Go to dashboard'}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
