'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { exchangeAuthCode, getToken, setToken } from '@/lib/auth';
import type { MeResponse, OnboardingStatus } from '@/lib/types';
import { Button } from '@/components/ui/legacy-button';
import { BrandLogo } from '@/components/brand/BrandLogo';

async function routeAfterAuth(router: ReturnType<typeof useRouter>) {
  const token = getToken();
  if (!token) return;
  const me = await apiGet<MeResponse>('/me', token);
  if (!me.workspace) {
    router.replace('/onboarding');
    return;
  }
  const status = await apiGet<OnboardingStatus>('/onboarding/status', token);
  router.replace(status.completed ? '/home' : '/onboarding');
}

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [manualToken, setManualToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    const exchangeCode = params.get('code');
    const legacyToken = params.get('token');

    if (exchangeCode && !exchanging) {
      setExchanging(true);
      exchangeAuthCode(exchangeCode)
        .then(({ needsWorkspace }) => {
          if (needsWorkspace || params.get('needsWorkspace') === '1') {
            router.replace('/onboarding');
          } else {
            routeAfterAuth(router).catch(() => router.replace('/home'));
          }
        })
        .catch(() => setError('Sign-in failed — exchange code expired. Try again.'))
        .finally(() => setExchanging(false));
      return;
    }

    if (legacyToken) {
      setToken(legacyToken);
      const needsWorkspace = params.get('needsWorkspace') === '1';
      if (needsWorkspace) {
        router.replace('/onboarding');
      } else {
        routeAfterAuth(router).catch(() => router.replace('/home'));
      }
    }
  }, [params, router, exchanging]);

  async function saveManualToken() {
    if (!manualToken.trim()) {
      setError('Paste a token from dev-login');
      return;
    }
    setToken(manualToken.trim());
    try {
      await routeAfterAuth(router);
    } catch {
      router.replace('/home');
    }
  }

  const busy = exchanging || Boolean(params.get('code') || params.get('token'));

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <BrandLogo href="/" size="lg" showText={false} />
        </div>
        <h1>{busy ? 'Completing sign-in…' : 'Sign in'}</h1>
        {error && <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>}
        {!busy && !params.get('code') && !params.get('token') && (
          <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Dev fallback — paste access token from POST /api/v1/auth/dev-login
            </p>
            <textarea
              className="ui-input"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              rows={4}
              style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
              placeholder="eyJhbG..."
            />
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <Button onClick={saveManualToken} style={{ marginTop: 12, width: '100%' }}>
              Save token
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function AuthCallbackFallback() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/" size="lg" showText={false} />
        <h1>Completing sign-in…</h1>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
