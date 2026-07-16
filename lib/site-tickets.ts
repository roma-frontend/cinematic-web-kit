import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { getDb, newId, siteTickets, siteTicketMessages, siteUsers, type SiteTicket, type SiteTicketMessage } from '@/lib/db';
import { notifyMember } from '@/lib/site-membership';

// Support tickets: a member opens a thread and exchanges messages with the site
// admin. All siteId-scoped; member functions also check ticket ownership.

export interface TicketMessage { id: string; authorType: string; authorId: string; body: string; createdAt: Date }

function messagesOf(ticketId: string): TicketMessage[] {
  return getDb()
    .select({ id: siteTicketMessages.id, authorType: siteTicketMessages.authorType, authorId: siteTicketMessages.authorId, body: siteTicketMessages.body, createdAt: siteTicketMessages.createdAt })
    .from(siteTicketMessages)
    .where(eq(siteTicketMessages.ticketId, ticketId))
    .orderBy(asc(siteTicketMessages.createdAt))
    .all();
}

function messageCounts(siteId: string): Record<string, number> {
  const rows = getDb()
    .select({ ticketId: siteTicketMessages.ticketId, n: sql<number>`count(*)` })
    .from(siteTicketMessages)
    .where(eq(siteTicketMessages.siteId, siteId))
    .groupBy(siteTicketMessages.ticketId)
    .all();
  const out: Record<string, number> = {};
  for (const r of rows) out[r.ticketId] = r.n;
  return out;
}

// ── Member side ───────────────────────────────────────────────────────────────

export interface TicketSummary { id: string; subject: string; status: string; lastActor: string; updatedAt: Date; messageCount: number }

export function createTicket(siteId: string, siteUserId: string, subject: string, body: string): SiteTicket {
  const now = new Date();
  const ticket: SiteTicket = {
    id: newId('tkt'), siteId, siteUserId,
    subject: subject.slice(0, 200) || '—',
    status: 'open', lastActor: 'member', createdAt: now, updatedAt: now,
  };
  getDb().insert(siteTickets).values(ticket).run();
  getDb().insert(siteTicketMessages).values({ id: newId('msg'), ticketId: ticket.id, siteId, authorType: 'member', authorId: siteUserId, body: body.slice(0, 8000), createdAt: now }).run();
  return ticket;
}

export function listMemberTickets(siteId: string, siteUserId: string): TicketSummary[] {
  const counts = messageCounts(siteId);
  return getDb()
    .select()
    .from(siteTickets)
    .where(and(eq(siteTickets.siteId, siteId), eq(siteTickets.siteUserId, siteUserId)))
    .orderBy(desc(siteTickets.updatedAt))
    .all()
    .map((tk) => ({ id: tk.id, subject: tk.subject, status: tk.status, lastActor: tk.lastActor, updatedAt: tk.updatedAt, messageCount: counts[tk.id] ?? 0 }));
}

export interface TicketThread { id: string; subject: string; status: string; messages: TicketMessage[] }

export function getMemberTicket(siteId: string, siteUserId: string, ticketId: string): TicketThread | null {
  const tk = getDb().select().from(siteTickets).where(and(eq(siteTickets.id, ticketId), eq(siteTickets.siteId, siteId), eq(siteTickets.siteUserId, siteUserId))).get();
  if (!tk) return null;
  return { id: tk.id, subject: tk.subject, status: tk.status, messages: messagesOf(tk.id) };
}

export function memberReply(siteId: string, siteUserId: string, ticketId: string, body: string): boolean {
  const tk = getDb().select().from(siteTickets).where(and(eq(siteTickets.id, ticketId), eq(siteTickets.siteId, siteId), eq(siteTickets.siteUserId, siteUserId))).get();
  if (!tk) return false;
  const now = new Date();
  getDb().insert(siteTicketMessages).values({ id: newId('msg'), ticketId, siteId, authorType: 'member', authorId: siteUserId, body: body.slice(0, 8000), createdAt: now }).run();
  getDb().update(siteTickets).set({ status: 'open', lastActor: 'member', updatedAt: now }).where(eq(siteTickets.id, ticketId)).run();
  return true;
}

export function countOpenTickets(siteId: string): number {
  const row = getDb().select({ n: sql<number>`count(*)` }).from(siteTickets).where(and(eq(siteTickets.siteId, siteId), eq(siteTickets.status, 'open'))).get();
  return row?.n ?? 0;
}

// ── Admin side ────────────────────────────────────────────────────────────────

export interface AdminTicket extends TicketSummary { memberName: string; memberEmail: string }

export function listTicketsForAdmin(siteId: string): AdminTicket[] {
  const counts = messageCounts(siteId);
  return getDb()
    .select({ tk: siteTickets, name: siteUsers.name, email: siteUsers.email })
    .from(siteTickets)
    .innerJoin(siteUsers, eq(siteTickets.siteUserId, siteUsers.id))
    .where(eq(siteTickets.siteId, siteId))
    .orderBy(desc(siteTickets.updatedAt))
    .all()
    .map((r) => ({ id: r.tk.id, subject: r.tk.subject, status: r.tk.status, lastActor: r.tk.lastActor, updatedAt: r.tk.updatedAt, messageCount: counts[r.tk.id] ?? 0, memberName: r.name, memberEmail: r.email }));
}

export function getTicketForAdmin(siteId: string, ticketId: string): (TicketThread & { memberName: string; memberEmail: string }) | null {
  const r = getDb()
    .select({ tk: siteTickets, name: siteUsers.name, email: siteUsers.email })
    .from(siteTickets)
    .innerJoin(siteUsers, eq(siteTickets.siteUserId, siteUsers.id))
    .where(and(eq(siteTickets.id, ticketId), eq(siteTickets.siteId, siteId)))
    .get();
  if (!r) return null;
  return { id: r.tk.id, subject: r.tk.subject, status: r.tk.status, messages: messagesOf(r.tk.id), memberName: r.name, memberEmail: r.email };
}

export function adminReply(siteId: string, adminUserId: string, ticketId: string, body: string): boolean {
  const tk = getDb().select().from(siteTickets).where(and(eq(siteTickets.id, ticketId), eq(siteTickets.siteId, siteId))).get();
  if (!tk) return false;
  const now = new Date();
  getDb().insert(siteTicketMessages).values({ id: newId('msg'), ticketId, siteId, authorType: 'admin', authorId: adminUserId, body: body.slice(0, 8000), createdAt: now }).run();
  getDb().update(siteTickets).set({ status: 'open', lastActor: 'admin', updatedAt: now }).where(eq(siteTickets.id, ticketId)).run();
  notifyMember(siteId, tk.siteUserId, 'ticket_reply', 'Ответ поддержки', tk.subject || 'Вам ответили в обращении.');
  return true;
}

export function setTicketStatus(siteId: string, ticketId: string, status: 'open' | 'closed'): void {
  getDb().update(siteTickets).set({ status, updatedAt: new Date() }).where(and(eq(siteTickets.id, ticketId), eq(siteTickets.siteId, siteId))).run();
}
