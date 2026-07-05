import 'server-only';
import { desc } from 'drizzle-orm';
import { getDb, newId, audit } from '@/lib/db';

export interface AuditActor { id: string; email: string }

/** Append an entry to the superadmin audit trail (best-effort, never throws). */
export function recordAudit(actor: AuditActor, action: string, target = '', detail = ''): void {
  try {
    getDb().insert(audit).values({
      id: newId('a'),
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      target,
      detail,
      createdAt: new Date(),
    }).run();
  } catch {
    /* auditing must never break the actual operation */
  }
}

export interface AuditRow {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export function listAudit(limit = 200): AuditRow[] {
  return getDb()
    .select()
    .from(audit)
    .orderBy(desc(audit.createdAt))
    .limit(limit)
    .all()
    .map((a) => ({
      id: a.id,
      actorEmail: a.actorEmail,
      action: a.action,
      target: a.target,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    }));
}
