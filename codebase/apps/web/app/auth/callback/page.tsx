'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { exchangeAuthCode, getToken, setToken } from '@/lib/auth';
import type { MeResponse, OnboardingStatus } from '@/lib/types';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
    const oauthError = params.get('error');
    const oauthErrorDescription = params.get('error_description');
    if (oauthError) {
      setError(oauthErrorDescription ?? `Sign-in failed (${oauthError})`);
      return;
    }

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
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card text-center">
        <CardHeader className="items-center">
          <BrandLogo href="/" size="lg" showText={false} />
          {busy && !error && (
            <Loader2 className="mt-4 size-8 animate-spin text-muted-foreground" aria-label="Completing sign-in" />
          )}
          <CardTitle className="mt-4 text-card-foreground">{busy ? 'Completing sign-in…' : 'Sign in'}</CardTitle>
          {error && <CardDescription className="text-destructive">{error}</CardDescription>}
        </CardHeader>
        {!busy && !params.get('code') && !params.get('token') && (
          <CardContent className="space-y-3 text-left text-card-foreground">
            <Label htmlFor="dev-token" className="text-foreground">
              Access token
            </Label>
            <p className="text-sm text-muted-foreground">
              Dev fallback — paste access token from POST /api/v1/auth/dev-login
            </p>
            <Textarea
              id="dev-token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              rows={4}
              className="font-mono text-xs text-foreground"
              placeholder="eyJhbG..."
            />
            <Button onClick={saveManualToken} className="w-full text-primary-foreground">
              Save token
            </Button>
            {error && (
              <Button variant="outline" className="w-full text-foreground" asChild>
                <Link href="/sign-in" className="text-foreground">
                  Back to sign in
                </Link>
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </main>
  );
}

function AuthCallbackFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card text-center">
        <CardHeader className="items-center">
          <BrandLogo href="/" size="lg" showText={false} />
          <Loader2 className="mt-4 size-8 animate-spin text-muted-foreground" aria-label="Completing sign-in" />
          <CardTitle className="mt-4 text-card-foreground">Completing sign-in…</CardTitle>
        </CardHeader>
      </Card>
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
