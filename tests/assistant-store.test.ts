import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from '@/lib/auth';
import {
  deriveTitle, createConversation, listConversations, listMessages, addMessage,
  ownsConversation, renameConversation, deleteConversation,
} from '@/lib/assistant-store';
import { getRawDb } from '@/lib/db';

function freshUser(email = `u${Math.random().toString(36).slice(2)}@ex.com`) {
  return createUser(email, 'password123', 'Owner');
}

beforeEach(() => {
  getRawDb().exec('DELETE FROM assistant_messages; DELETE FROM assistant_conversations;');
});

describe('deriveTitle', () => {
  it('strips emoji/markdown, trims and capitalizes', () => {
    expect(deriveTitle('✨ how do I create a site?')).toBe('How do I create a site?');
    expect(deriveTitle('   ')).toBe('New chat');
  });
  it('clips very long titles with an ellipsis', () => {
    const long = 'a'.repeat(80);
    const title = deriveTitle(long);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('assistant-store CRUD', () => {
  it('creates, lists, appends messages, renames and deletes — scoped to owner', () => {
    const u = freshUser();
    const other = freshUser();

    const conv = createConversation(u.id, deriveTitle('🎨 Pick a theme'));
    expect(conv.title).toBe('Pick a theme');
    expect(listConversations(u.id)).toHaveLength(1);
    // Ownership isolation.
    expect(ownsConversation(u.id, conv.id)).toBe(true);
    expect(ownsConversation(other.id, conv.id)).toBe(false);
    expect(listMessages(other.id, conv.id)).toEqual([]);

    addMessage(conv.id, 'user', 'Hello');
    addMessage(conv.id, 'assistant', 'Hi there');
    const msgs = listMessages(u.id, conv.id);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);

    expect(renameConversation(u.id, conv.id, 'Renamed')).toBe(true);
    expect(renameConversation(other.id, conv.id, 'Nope')).toBe(false);
    expect(listConversations(u.id)[0].title).toBe('Renamed');

    expect(deleteConversation(other.id, conv.id)).toBe(false);
    expect(deleteConversation(u.id, conv.id)).toBe(true);
    expect(listConversations(u.id)).toHaveLength(0);
  });
});
