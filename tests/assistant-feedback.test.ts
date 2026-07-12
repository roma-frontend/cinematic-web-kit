import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from '@/lib/auth';
import { addFeedback, feedbackForMessages } from '@/lib/assistant-feedback';
import { getRawDb } from '@/lib/db';

function freshUser(email = `u${Math.random().toString(36).slice(2)}@ex.com`) {
  return createUser(email, 'password123', 'Owner');
}

beforeEach(() => {
  getRawDb().exec('DELETE FROM assistant_feedback;');
});

describe('assistant-feedback store', () => {
  it('adds up/down feedback per message', () => {
    const u = freshUser();
    const f = addFeedback(u.id, 'msg-1', 'down', 'hallucinated pricing');
    expect(f.rating).toBe('down');
    expect(f.reason).toBe('hallucinated pricing');

    const map = feedbackForMessages(u.id, ['msg-1', 'msg-2']);
    expect(map.get('msg-1')?.rating).toBe('down');
    expect(map.has('msg-2')).toBe(false);
  });

  it('returns the latest feedback when multiple exist', () => {
    const u = freshUser();
    addFeedback(u.id, 'msg-1', 'up');
    addFeedback(u.id, 'msg-1', 'down', 'still wrong');
    const map = feedbackForMessages(u.id, ['msg-1']);
    expect(map.get('msg-1')?.rating).toBe('down');
  });

  it('is scoped per user', () => {
    const u = freshUser();
    const other = freshUser();
    addFeedback(u.id, 'msg-x', 'up');
    expect(feedbackForMessages(other.id, ['msg-x']).has('msg-x')).toBe(false);
  });

  it('caps reason length', () => {
    const u = freshUser();
    const long = 'x'.repeat(600);
    const f = addFeedback(u.id, 'msg-1', 'down', long);
    expect(f.reason.length).toBeLessThanOrEqual(500);
  });
});
