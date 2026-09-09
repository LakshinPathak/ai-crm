'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';

type Milestone = { id: string; title: string; position: number };
type ProcessStage = { id: string; name: string; position: number; milestones: Milestone[] };
type SalesProcess = { id: string; name: string; isDefault: boolean; stages: ProcessStage[] };

export default function SettingsSalesProcessPage() {
  const [processes, setProcesses] = useState<SalesProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGet<{ salesProcesses: SalesProcess[] }>('/pipeline/sales-processes', token)
      .then((r) => setProcesses(r.salesProcesses))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sales processes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Sales process"
        subtitle="Presales milestones tracked on each deal — separate from CRM pipeline stages"
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/settings">Settings</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />

      {loading && (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && processes.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">No sales processes configured.</p>
          </CardContent>
        </Card>
      )}

      {processes.map((process) => (
        <Card key={process.id} className="mb-4">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CardTitle>{process.name}</CardTitle>
            {process.isDefault && <Badge variant="default">Default</Badge>}
          </CardHeader>
          <CardContent className="grid gap-5">
            {[...process.stages]
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <div key={stage.id}>
                  <h4 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    {stage.name}
                  </h4>
                  <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
                    {[...stage.milestones]
                      .sort((a, b) => a.position - b.position)
                      .map((milestone) => (
                        <li key={milestone.id}>{milestone.title}</li>
                      ))}
                  </ol>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
