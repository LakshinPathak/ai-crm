'use client';

import { useCallback, useEffect, useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
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
        <Skeleton className="mb-4 h-[88px]" />
        <Skeleton className="h-30" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={addNote} className="mb-4 space-y-2">
        <Textarea
          rows={3}
          placeholder="Write a note…"
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
        />
        <Button type="submit">Add note</Button>
      </form>
      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={24} />}
          title="No notes yet"
          description="Add context for your team — meeting takeaways, objections, or next steps."
        />
      ) : (
        notes.map((n) => (
          <Card key={n.id} className="mb-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="mb-1.5 min-w-0 flex-1 leading-relaxed">{n.body}</p>
              <Button variant="ghost" size="icon-sm" onClick={() => deleteNote(n.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
            <small style={{ color: 'var(--muted-light)' }}>{new Date(n.createdAt).toLocaleString()}</small>
          </Card>
        ))
      )}
    </>
  );
}
