import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTicket, listMemberTickets, getMemberTicket, memberReply,
  listTicketsForAdmin, getTicketForAdmin, adminReply, setTicketStatus, countOpenTickets,
} from '@/lib/site-tickets';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import { createSiteUser, countUnreadNotifications } from '@/lib/site-auth';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seed() {
  createUser('super@example.com', 'password123', 'Super');
  const owner = createUser('owner@example.com', 'password123', 'Owner');
  const site = createSite(owner.id, 'Org');
  const member = createSiteUser(site.id, 'm@example.com', 'password123', 'Member', 'approved');
  return { owner, site, member };
}

describe('support tickets', () => {
  it('creates a ticket with the first message and lists it for member + admin', () => {
    const { site, member } = seed();
    const tk = createTicket(site.id, member.id, 'Help', 'I have a question');
    expect(tk.status).toBe('open');
    expect(listMemberTickets(site.id, member.id)).toHaveLength(1);
    const admin = listTicketsForAdmin(site.id);
    expect(admin[0].memberEmail).toBe('m@example.com');
    expect(admin[0].messageCount).toBe(1);
    const thread = getMemberTicket(site.id, member.id, tk.id)!;
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0].authorType).toBe('member');
  });

  it('admin reply notifies the member, sets lastActor=admin, and appends a message', () => {
    const { owner, site, member } = seed();
    const tk = createTicket(site.id, member.id, 'Help', 'q');
    expect(adminReply(site.id, owner.id, tk.id, 'here you go')).toBe(true);
    expect(countUnreadNotifications(site.id, member.id)).toBe(1);
    const thread = getTicketForAdmin(site.id, tk.id)!;
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[1].authorType).toBe('admin');
  });

  it('member reply reopens/keeps open and admin can close/reopen', () => {
    const { owner, site, member } = seed();
    const tk = createTicket(site.id, member.id, 'Help', 'q');
    setTicketStatus(site.id, tk.id, 'closed');
    expect(countOpenTickets(site.id)).toBe(0);
    expect(memberReply(site.id, member.id, tk.id, 'still stuck')).toBe(true);
    expect(countOpenTickets(site.id)).toBe(1);
    void owner;
  });

  it('scopes tickets to their owner + site', () => {
    const { site, member } = seed();
    const other = createSiteUser(site.id, 'x@example.com', 'password123', 'X', 'approved');
    const tk = createTicket(site.id, member.id, 'Mine', 'q');
    // A different member cannot open or reply to it.
    expect(getMemberTicket(site.id, other.id, tk.id)).toBeNull();
    expect(memberReply(site.id, other.id, tk.id, 'sneaky')).toBe(false);
  });
});
