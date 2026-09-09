'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
      <form onSubmit={addTask} className="mb-4 flex gap-2">
        <Input
          placeholder="New task…"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="flex-1"
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
            <div key={t.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
              <Checkbox
                checked={t.status === 'done'}
                onCheckedChange={() => toggleTask(t.id, t.status)}
              />
              <span className={`flex-1 text-sm ${t.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>{t.title}</span>
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
