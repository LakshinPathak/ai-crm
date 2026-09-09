import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function RequestsPage() {
  return (
    <>
      <PageHeader title="Requests" subtitle="Product and team requests across deals" />
      <EmptyState
        icon={<ClipboardList size={32} strokeWidth={1.5} />}
        title="Requests coming soon"
        description="Workspace-wide product and team requests will be available here. For now, manage requests on individual deals."
      />
    </>
  );
}
