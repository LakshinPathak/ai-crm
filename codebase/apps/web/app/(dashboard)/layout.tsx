import { AuthGuard } from '@/components/AuthGuard';
import { DashboardShell } from '@/components/DashboardShell';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </>
  );
}
