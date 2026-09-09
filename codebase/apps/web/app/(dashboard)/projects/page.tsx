import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" subtitle="POC and implementation projects across deals" />
      <EmptyState
        icon={<FolderKanban size={32} strokeWidth={1.5} />}
        title="Projects coming soon"
        description="Workspace-wide project tracking will be available here. For now, manage projects on individual deals."
        action={
          <Link href="/deals">
            <Button size="sm">Go to Deals</Button>
          </Link>
        }
      />
    </>
  );
}
