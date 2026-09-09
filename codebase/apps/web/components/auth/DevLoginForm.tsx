'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setToken } from '@/lib/auth';
import { apiGet } from '@/lib/api-client';
import type { MeResponse } from '@/lib/types';

async function routeAfterLogin(router: ReturnType<typeof useRouter>, token: string) {
  setToken(token);
  const me = await apiGet<MeResponse>('/me', token);
  if (!me.workspace) {
    router.replace('/onboarding');
    return;
  }
  router.replace(me.workspace.onboardingCompletedAt ? '/home' : '/onboarding');
}

export function DevLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('dev@example.com');
  const [displayName, setDisplayName] = useState('Dev User');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${api}/api/v1/auth/dev-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = (await res.json()) as { accessToken: string };
      await routeAfterLogin(router, data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dev login (local only)</p>
      <div className="space-y-2">
        <Label htmlFor="dev-email">Email</Label>
        <Input
          id="dev-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dev-name">Display name</Label>
        <Input
          id="dev-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in with email (dev)'}
      </Button>
    </form>
  );
}
