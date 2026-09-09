'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/Toast';

type Task = { id: string; title: string; status: string };

export function TasksTab({ dealId }: { dealId: string }) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState('');

  const reload = useCallback(() => {
    const token = getToken();
    if (!token) return;
    return apiGet<{ tasks: Task[] }>(`/deals/${dealId}/tasks`, token).then((r) => setTasks(r.tasks));
  }, [dealId]);

  useEffect(() => {
    reload()?.finally(() => setLoading(false));
  }, [reload]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !taskTitle.trim()) return;
    try {
      await apiPost(`/deals/${dealId}/tasks`, token, { title: taskTitle });
      setTaskTitle('');
      await reload();
      toast('Task added', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add task', 'error');
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await apiDelete(`/deals/${dealId}/tasks/${taskId}`, token);
      await reload();
      toast('Task deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete task', 'error');
    }
  }

  async function toggleTask(taskId: string, current: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiPatch(`/deals/${dealId}/tasks/${taskId}`, token, {
        status: current === 'done' ? 'open' : 'done',
      });
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update task', 'error');
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-10" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={addTask} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="ui-input"
          placeholder="New task…"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>
      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={24} />}
          title="No tasks yet"
          description="Track follow-ups and action items for this deal."
        />
      ) : (
        <Card>
          {tasks.map((t) => (
            <div key={t.id} className="ui-task">
              <input
                type="checkbox"
                checked={t.status === 'done'}
                onChange={() => toggleTask(t.id, t.status)}
              />
              <span style={{ flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
              <Badge variant="default">{t.status}</Badge>
              <Button variant="ghost" size="icon-sm" onClick={() => deleteTask(t.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
