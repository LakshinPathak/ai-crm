'use client';

import Link from 'next/link';
import { Database } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const SAMPLE_QUERY = `-- Workspace overview (read-only preview)
SELECT metric, value
FROM workspace_overview
LIMIT 100;`;

export default function InsightsSqlPage() {
  return (
    <div className="analytics-page min-w-0">
      <PageHeader
        title="SQL explorer"
        subtitle="Run read-only queries against workspace analytics views"
        actions={
          <Button size="sm" variant="secondary" asChild>
            <Link href="/insights">Back to Insights</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2 text-muted-foreground">
              <Database className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">SQL explorer — coming soon</CardTitle>
              <CardDescription>
                Interactive query execution and exports are not available yet. The editor below is read-only.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Alert className="mb-4">
        <AlertTitle>Preview only</AlertTitle>
        <AlertDescription>
          Full SQL explorer support is coming soon. Only read-only SELECT statements will be allowed when execution
          ships.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Query</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            readOnly
            aria-readonly
            className="min-h-48 font-mono text-sm"
            value={SAMPLE_QUERY}
          />
        </CardContent>
      </Card>
    </div>
  );
}
