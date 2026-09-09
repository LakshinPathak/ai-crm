'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import type { MeResponse } from '@/lib/types';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/sign-in');
      return;
    }

    apiGet<MeResponse>('/me', token)
      .then((me) => {
        if (!me.workspace) {
          router.replace('/onboarding');
          return;
        }
        if (!me.workspace.onboardingCompletedAt && pathname !== '/onboarding') {
          router.replace('/onboarding');
          return;
        }
        setReady(true);
      })
      .catch(() => {
        clearToken();
        router.replace('/sign-in');
      });
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
