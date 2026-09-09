'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { getToken, clearToken, refreshAccessToken } from '@/lib/auth';
import type { MeResponse } from '@/lib/types';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function verifySession() {
      let token = getToken();
      if (!token) {
        token = await refreshAccessToken();
      }
      if (!token) {
        router.replace('/sign-in');
        return;
      }

      try {
        const me = await apiGet<MeResponse>('/me', token);
        if (!me.workspace) {
          router.replace('/onboarding');
          return;
        }
        if (!me.workspace.onboardingCompletedAt && pathname !== '/onboarding') {
          router.replace('/onboarding');
          return;
        }
        setReady(true);
      } catch {
        clearToken();
        router.replace('/sign-in');
      }
    }

    verifySession();
  }, [router, pathname]);

  if (!ready) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
        Loading…
      </main>
    );
  }

  return <>{children}</>;
}
