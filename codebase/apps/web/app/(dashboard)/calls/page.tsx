import { Phone } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CallsPage() {
  return (
    <>
      <PageHeader title="Calls" subtitle="Call recordings and transcripts" />
      <EmptyState
        icon={<Phone size={32} strokeWidth={1.5} />}
        title="Calls coming soon"
        description="Call list and transcript viewer will be available here once Gong is connected."
      />
    </>
  );
}
