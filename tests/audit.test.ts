import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './helpers';
import { recordAudit, listAudit } from '@/lib/audit';

beforeEach(() => resetDb());

describe('recordAudit / listAudit', () => {
  it('records entries and lists newest first', () => {
    recordAudit({ id: 'u1', email: 'a@x.com' }, 'user.delete', 'tgt', 'detail');
    recordAudit({ id: 'u1', email: 'a@x.com' }, 'role.change');
    const rows = listAudit();
    expect(rows.length).toBe(2);
    expect(rows[0].action).toBe('role.change');
    expect(rows[1].target).toBe('tgt');
    expect(rows[1].detail).toBe('detail');
    expect(typeof rows[0].createdAt).toBe('string');
  });

  it('respects the limit', () => {
    for (let i = 0; i < 5; i++) recordAudit({ id: 'u1', email: 'a@x.com' }, `act.${i}`);
    expect(listAudit(2).length).toBe(2);
  });

  it('never throws even for non-critical actions', () => {
    expect(() => recordAudit({ id: 'u1', email: 'a@x.com' }, 'some.random.action')).not.toThrow();
  });
});
