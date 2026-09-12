'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Database, Play } from 'lucide-react';
import { apiPost, ApiError } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { InsightsSqlResponse } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SAMPLE_QUERY = `-- Workspace overview (read-only preview)
SELECT metric, value
FROM workspace_overview
LIMIT 100;`;

function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Something went wrong';
  const raw = err instanceof ApiError ? err.message : err.message;
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: string; message?: string } };
    return parsed.error?.message ?? raw;
  } catch {
    return raw;
  }
}

function formatCell(value: string | number | boolean | null): string {
  if (value === null) return '';
  return String(value);
}

export default function InsightsSqlPage() {
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightsSqlResponse | null>(null);

  const queryEmpty = query.trim().length === 0;

  async function runQuery() {
    const token = getToken();
    if (!token || queryEmpty || running) return;
    setRunning(true);
    setError(null);
    try {
      const data = await apiPost<InsightsSqlResponse>('/insights/sql', token, { query });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(parseApiError(err));
    } finally {
      setRunning(false);
    }
  }

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
              <CardTitle className="text-base">Read-only SELECT</CardTitle>
              <CardDescription>
                Only a single SELECT statement is allowed. Writes and multiple statements are rejected.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">Query</CardTitle>
            <Button size="sm" onClick={runQuery} disabled={queryEmpty || running}>
              <Play className="size-3.5" />
              {running ? 'Running…' : 'Run'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            aria-label="SQL query"
            className="min-h-48 font-mono text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Query failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result?.stub ? (
        <Alert className="mb-4">
          <AlertTitle>Demo results</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Results · {result.rowCount} rows</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((col) => (
                    <TableHead key={col} className="font-mono">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(result.columns.length, 1)} className="text-muted-foreground">
                      No rows
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row, i) => (
                    <TableRow key={i}>
                      {result.columns.map((_, j) => (
                        <TableCell key={j} className="font-mono">
                          {formatCell(row[j] ?? null)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
