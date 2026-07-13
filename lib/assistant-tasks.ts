import 'server-only';
import { getRawDb, newId } from '@/lib/db';
import { nextTaskSteps, type AssistantTask, type AssistantTaskStep, type AssistantTaskStepStatus } from '@/lib/assistant-task-core';

export type { AssistantTask, AssistantTaskStep, AssistantTaskStepStatus };
export { nextTaskSteps } from '@/lib/assistant-task-core';

/** Converts arbitrary model output into a bounded, render-safe task plan. */
export function normalizeTaskSteps(input: unknown, max = 8): AssistantTaskStep[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const steps: AssistantTaskStep[] = [];
  for (const item of input) {
    const title = typeof item === 'string'
      ? item.replace(/\s+/g, ' ').trim()
      : item && typeof item === 'object' && typeof (item as { title?: unknown }).title === 'string'
        ? (item as { title: string }).title.replace(/\s+/g, ' ').trim()
        : '';
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const suppliedStatus = item && typeof item === 'object' ? (item as { status?: unknown }).status : undefined;
    const status: AssistantTaskStepStatus = suppliedStatus === 'running' || suppliedStatus === 'done' || suppliedStatus === 'failed' || suppliedStatus === 'skipped' ? suppliedStatus : 'pending';
    steps.push({ id: `step-${steps.length + 1}`, title: title.slice(0, 160), status });
    if (steps.length >= max) break;
  }
  return steps;
}

export function createTask(userId: string, title: string, rawSteps: unknown): AssistantTask | null {
  const steps = normalizeTaskSteps(rawSteps);
  if (!steps.length) return null;
  const now = Date.now();
  const task: AssistantTask = { id: newId('task'), title: title.trim().slice(0, 160) || 'New task', status: 'planned', steps, createdAt: now, updatedAt: now };
  getRawDb().prepare('INSERT INTO assistant_tasks (id, user_id, title, status, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(task.id, userId, task.title, task.status, JSON.stringify(task.steps), now, now);
  return task;
}

export function listTasks(userId: string, limit = 20): AssistantTask[] {
  const rows = getRawDb().prepare("SELECT id, title, status, steps, created_at as createdAt, updated_at as updatedAt FROM assistant_tasks WHERE user_id = ? AND status != 'cancelled' ORDER BY updated_at DESC LIMIT ?")
    .all(userId, limit) as Array<Omit<AssistantTask, 'steps'> & { steps: string }>;
  return rows.map((row) => ({ ...row, steps: normalizeTaskSteps(JSON.parse(row.steps || '[]')) }));
}

export function cancelTask(userId: string, taskId: string): boolean {
  const result = getRawDb().prepare("UPDATE assistant_tasks SET status = 'cancelled', updated_at = ? WHERE id = ? AND user_id = ?")
    .run(Date.now(), taskId, userId);
  return result.changes > 0;
}

export function updateTaskStep(userId: string, taskId: string, stepId: string, status: AssistantTaskStepStatus): AssistantTask | null {
  const row = getRawDb().prepare('SELECT id, title, status, steps, created_at as createdAt, updated_at as updatedAt FROM assistant_tasks WHERE id = ? AND user_id = ?')
    .get(taskId, userId) as (Omit<AssistantTask, 'steps'> & { steps: string }) | undefined;
  if (!row) return null;
  const steps = nextTaskSteps(normalizeTaskSteps(JSON.parse(row.steps || '[]')), stepId, status);
  const taskStatus: AssistantTask['status'] = steps.every((step) => step.status === 'done' || step.status === 'skipped') ? 'done' : 'running';
  const updatedAt = Date.now();
  getRawDb().prepare('UPDATE assistant_tasks SET status = ?, steps = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(taskStatus, JSON.stringify(steps), updatedAt, taskId, userId);
  return { ...row, status: taskStatus, steps, updatedAt };
}
