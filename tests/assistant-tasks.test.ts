import { describe, expect, it } from 'vitest';
import { normalizeTaskSteps } from '@/lib/assistant-tasks';
import { nextTaskSteps, taskProgress } from '@/lib/assistant-task-core';

describe('assistant tasks', () => {
  it('normalizes, deduplicates and bounds task steps', () => {
    const steps = normalizeTaskSteps(['  Create hero  ', { title: 'Create hero' }, { title: 'Add CTA' }, null], 2);
    expect(steps).toEqual([
      { id: 'step-1', title: 'Create hero', status: 'pending' },
      { id: 'step-2', title: 'Add CTA', status: 'pending' },
    ]);
  });

  it('calculates progress from terminal steps', () => {
    const steps = normalizeTaskSteps(['One', 'Two', 'Three']);
    expect(taskProgress(nextTaskSteps(steps, 'step-1', 'done'))).toBe(33);
  });
});
