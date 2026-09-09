'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FolderOpen, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';

type DealFile = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

function formatSize(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileCenterTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<DealFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ files: DealFile[] }>(`/deals/${dealId}/files`, token).then((r) => setFiles(r.files));
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  async function addFile(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !name.trim() || !url.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/files`, token, {
        name: name.trim(),
        url: url.trim(),
      });
      setName('');
      setUrl('');
      await reload();
      toast('File added', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add file', 'error');
    }
  }

  async function deleteFile(fileId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/deals/${dealId}/files/${fileId}`, token);
      await reload();
      toast('File deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete file', 'error');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton style={{ height: 88, marginBottom: 16 }} />
        <Skeleton style={{ height: 160 }} />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={addFile} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input
            className="ui-input"
            placeholder="File name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="ui-input"
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <Button type="submit">Add file</Button>
      </form>
      {files.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={24} />}
          title="No files yet"
          description="Link proposals, contracts, and shared documents by URL."
        />
      ) : (
        <Card>
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td className="cell-title">{f.name}</td>
                  <td>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Open <ExternalLink size={12} />
                    </a>
                    {f.sizeBytes != null && (
                      <small style={{ display: 'block', color: 'var(--muted-light)' }}>{formatSize(f.sizeBytes)}</small>
                    )}
                  </td>
                  <td>{new Date(f.createdAt).toLocaleString()}</td>
                  <td>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteFile(f.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
