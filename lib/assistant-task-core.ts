export type AssistantTaskStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface AssistantTaskStep {
  id: string;
  title: string;
  status: AssistantTaskStepStatus;
}

export interface AssistantTask {
  id: string;
  title: string;
  status: 'planned' | 'running' | 'done' | 'failed' | 'cancelled';
  steps: AssistantTaskStep[];
  createdAt?: number;
  updatedAt?: number;
}

export function taskProgress(steps: AssistantTaskStep[]): number {
  if (!steps.length) return 0;
  return Math.round((steps.filter((step) => step.status === 'done' || step.status === 'skipped').length / steps.length) * 100);
}

export function nextTaskSteps(steps: AssistantTaskStep[], id: string, status: AssistantTaskStepStatus): AssistantTaskStep[] {
  return steps.map((step) => step.id === id ? { ...step, status } : step);
}
