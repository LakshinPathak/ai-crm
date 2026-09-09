'use client';

import { Toaster } from '@/components/ui/sonner';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh overflow-x-hidden">
      <Toaster />
      {children}
    </div>
  );
}
