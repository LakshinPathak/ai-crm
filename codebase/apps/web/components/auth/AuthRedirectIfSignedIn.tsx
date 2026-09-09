'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { MeResponse } from '@/lib/types';

export function AuthRedirectIfSignedIn() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    apiGet<MeResponse>('/me', token)
      .then((me) => {
        if (!me.workspace) {
          router.replace('/onboarding');
          return;
        }
        router.replace(me.workspace.onboardingCompletedAt ? '/home' : '/onboarding');
      })
      .catch(() => {
        // Token invalid — stay on sign-in
      });
  }, [router]);

  return null;
}
