import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from '@/lib/auth';
import {
  extractMemoryFacts, stripMemoryTags, addMemory, addMemories, listMemories,
  deleteMemory, clearMemories, memoryCount, MEMORY_CAP,
} from '@/lib/assistant-memory';
import { getRawDb } from '@/lib/db';

function freshUser(email = `u${Math.random().toString(36).slice(2)}@ex.com`) {
  return createUser(email, 'password123', 'Owner');
}

beforeEach(() => {
  getRawDb().exec('DELETE FROM assistant_memory;');
});

describe('extractMemoryFacts', () => {
  it('pulls facts out of REMEMBER tags, trimmed and collapsed', () => {
    const raw = 'Sure!  <REMEMBER>Runs a  coffee shop\ncalled Roast</REMEMBER> Done.';
    expect(extractMemoryFacts(raw)).toEqual(['Runs a coffee shop called Roast']);
  });
  it('dedups case-insensitively and caps at 5', () => {
    const raw = Array.from({ length: 8 }, (_, i) => `<REMEMBER>Fact ${i}</REMEMBER>`).join('') +
      '<REMEMBER>fact 0</REMEMBER>';
    const facts = extractMemoryFacts(raw);
    expect(facts).toHaveLength(5);
    expect(facts[0]).toBe('Fact 0');
  });
  it('ignores empty tags and returns [] when none present', () => {
    expect(extractMemoryFacts('<REMEMBER>   </REMEMBER>')).toEqual([]);
    expect(extractMemoryFacts('no tags here')).toEqual([]);
    expect(extractMemoryFacts('')).toEqual([]);
  });
});

describe('stripMemoryTags', () => {
  it('removes closed and dangling REMEMBER tags', () => {
    expect(stripMemoryTags('Hi <REMEMBER>x</REMEMBER> there')).toBe('Hi  there');
    expect(stripMemoryTags('Hi <REMEMBER>partial stream')).toBe('Hi ');
    expect(stripMemoryTags('Hi <REMEMB')).toBe('Hi ');
  });
});

describe('assistant-memory store', () => {
  it('adds, dedups (case-insensitive) and lists newest-first', () => {
    const u = freshUser();
    addMemory(u.id, 'Runs a coffee shop');
    addMemory(u.id, 'Prefers short answers');
    // Case-insensitive dedup — no new row.
    const dup = addMemory(u.id, 'runs a COFFEE shop');
    expect(dup?.content).toBe('Runs a coffee shop');
    expect(memoryCount(u.id)).toBe(2);
    const list = listMemories(u.id);
    expect(list[0].content).toBe('Prefers short answers');
  });

  it('ignores blank facts', () => {
    const u = freshUser();
    expect(addMemory(u.id, '   ')).toBeNull();
    expect(memoryCount(u.id)).toBe(0);
  });

  it('is scoped per user', () => {
    const u = freshUser();
    const other = freshUser();
    addMemory(u.id, 'Mine only');
    expect(listMemories(other.id)).toEqual([]);
    expect(deleteMemory(other.id, listMemories(u.id)[0].id)).toBe(false);
  });

  it('addMemories returns only newly stored facts', () => {
    const u = freshUser();
    addMemory(u.id, 'Existing');
    const stored = addMemories(u.id, ['Existing', 'Brand new', 'Another new']);
    expect(stored.map((s) => s.content)).toEqual(['Brand new', 'Another new']);
    expect(memoryCount(u.id)).toBe(3);
  });

  it('evicts oldest beyond the cap', () => {
    const u = freshUser();
    for (let i = 0; i < MEMORY_CAP + 5; i++) addMemory(u.id, `Fact number ${i}`);
    expect(memoryCount(u.id)).toBe(MEMORY_CAP);
    // The very first facts should have been pruned.
    const contents = listMemories(u.id).map((m) => m.content);
    expect(contents).toContain(`Fact number ${MEMORY_CAP + 4}`);
    expect(contents).not.toContain('Fact number 0');
  });

  it('deletes one and clears all', () => {
    const u = freshUser();
    addMemory(u.id, 'A');
    addMemory(u.id, 'B');
    const id = listMemories(u.id)[0].id;
    expect(deleteMemory(u.id, id)).toBe(true);
    expect(memoryCount(u.id)).toBe(1);
    expect(clearMemories(u.id)).toBe(1);
    expect(memoryCount(u.id)).toBe(0);
  });
});
