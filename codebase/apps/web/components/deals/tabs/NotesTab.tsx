'use client';

import { useCallback, useEffect, useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/page-skeleton';
import { useToast } from '@/components/ui/Toast';

type Note = { id: string; body: string; createdAt: string };

export function NotesTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState('');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ notes: Note[] }>(`/deals/${dealId}/notes`, token).then((r) => setNotes(r.notes));
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  async function deleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/deals/${dealId}/notes/${noteId}`, token);
      await reload();
      toast('Note deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete note', 'error');
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !noteBody.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/notes`, token, { body: noteBody });
      setNoteBody('');
      await reload();
      toast('Note added', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton style={{ height: 88, marginBottom: 16 }} />
        <Skeleton style={{ height: 120 }} />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={addNote} style={{ marginBottom: 16 }}>
        <textarea
          className="ui-input"
          rows={3}
          placeholder="Write a note…"
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
        />
        <Button type="submit" style={{ marginTop: 8 }}>Add note</Button>
      </form>
      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={24} />}
          title="No notes yet"
          description="Add context for your team — meeting takeaways, objections, or next steps."
        />
      ) : (
        notes.map((n) => (
          <Card key={n.id} style={{ marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ margin: '0 0 0.35rem', lineHeight: 1.6, flex: 1 }}>{n.body}</p>
              <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => deleteNote(n.id)} />
            </div>
            <small style={{ color: 'var(--muted-light)' }}>{new Date(n.createdAt).toLocaleString()}</small>
          </Card>
        ))
      )}
    </>
  );
}
