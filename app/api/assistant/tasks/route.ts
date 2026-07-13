import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { cancelTask, createTask, listTasks, updateTaskStep, type AssistantTaskStepStatus } from '@/lib/assistant-tasks';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return NextResponse.json({ tasks: listTasks(user.id) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const task = createTask(user.id, String(body?.title ?? ''), body?.steps);
    if (!task) return NextResponse.json({ error: 'Invalid task steps' }, { status: 400 });
    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const taskId = new URL(request.url).searchParams.get('id');
  if (!taskId || !cancelTask(user.id, taskId)) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const statuses: AssistantTaskStepStatus[] = ['pending', 'running', 'done', 'failed', 'skipped'];
    if (typeof body?.taskId !== 'string' || typeof body?.stepId !== 'string' || !statuses.includes(body?.status)) {
      return NextResponse.json({ error: 'Invalid task update' }, { status: 400 });
    }
    const task = updateTaskStep(user.id, body.taskId, body.stepId, body.status);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
