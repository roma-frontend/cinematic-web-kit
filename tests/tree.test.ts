import { describe, it, expect } from 'vitest';
import { makeNode, type BuilderNode } from '@/lib/builder/types';
import {
  duplicateNode,
  updateProps,
  removeNode,
  insertChild,
  moveNode,
  findNode,
  insertAfter,
  insertBefore,
  ancestorTypes,
  ancestorPath,
  isDescendant,
  moveRelative,
  moveTo,
} from '@/lib/builder/tree';

// Build a small deterministic tree we control the ids of.
function tree(): BuilderNode[] {
  const leaf = (id: string): BuilderNode => ({ id, type: 'text', props: { text: id } });
  return [
    { id: 'sec', type: 'section', props: {}, children: [
      { id: 'stack', type: 'stack', props: {}, children: [leaf('a'), leaf('b')] },
      leaf('c'),
    ] },
    leaf('d'),
  ];
}

describe('findNode', () => {
  it('finds nested and top-level nodes; null when missing', () => {
    const t = tree();
    expect(findNode(t, 'a')?.id).toBe('a');
    expect(findNode(t, 'd')?.id).toBe('d');
    expect(findNode(t, 'nope')).toBeNull();
  });
});

describe('updateProps', () => {
  it('patches props of the target node only (nested)', () => {
    const t = updateProps(tree(), 'a', { text: 'X', extra: 'y' });
    expect(findNode(t, 'a')?.props).toEqual({ text: 'X', extra: 'y' });
    expect(findNode(t, 'b')?.props.text).toBe('b');
  });
  it('patches a top-level node', () => {
    const t = updateProps(tree(), 'd', { text: 'Z' });
    expect(findNode(t, 'd')?.props.text).toBe('Z');
  });
});

describe('removeNode', () => {
  it('removes nested and top-level nodes', () => {
    expect(findNode(removeNode(tree(), 'a'), 'a')).toBeNull();
    expect(findNode(removeNode(tree(), 'd'), 'd')).toBeNull();
    // siblings preserved
    expect(findNode(removeNode(tree(), 'a'), 'b')?.id).toBe('b');
  });
});

describe('insertChild', () => {
  it('appends a child to the matching parent (nested)', () => {
    const child = makeNode('text');
    const t = insertChild(tree(), 'stack', child);
    expect(findNode(t, 'stack')?.children?.map((n) => n.id)).toContain(child.id);
  });
  it('appends to a top-level container with no prior children', () => {
    const t0 = tree();
    // 'sec' has children; append there
    const child = makeNode('text');
    const t = insertChild(t0, 'sec', child);
    expect(findNode(t, 'sec')?.children?.some((n) => n.id === child.id)).toBe(true);
  });
});

describe('duplicateNode', () => {
  it('inserts a fresh-id deep copy after the original', () => {
    const { nodes, newId } = duplicateNode(tree(), 'stack');
    expect(newId).not.toBeNull();
    const sec = findNode(nodes, 'sec')!;
    const ids = sec.children!.map((n) => n.id);
    expect(ids[0]).toBe('stack');
    expect(ids[1]).toBe(newId);
    // deep copy has new child ids too
    const copy = findNode(nodes, newId!)!;
    expect(copy.children!.every((c) => c.id !== 'a' && c.id !== 'b')).toBe(true);
  });
  it('returns null newId when target not found', () => {
    const { newId } = duplicateNode(tree(), 'missing');
    expect(newId).toBeNull();
  });
});

describe('moveNode', () => {
  it('moves a top-level node down and up', () => {
    const t = tree();
    const down = moveNode(t, 'sec', 1);
    expect(down.map((n) => n.id)).toEqual(['d', 'sec']);
    const up = moveNode(down, 'sec', -1);
    expect(up.map((n) => n.id)).toEqual(['sec', 'd']);
  });
  it('is a no-op at the boundaries', () => {
    const t = tree();
    expect(moveNode(t, 'sec', -1).map((n) => n.id)).toEqual(['sec', 'd']);
    expect(moveNode(t, 'd', 1).map((n) => n.id)).toEqual(['sec', 'd']);
  });
  it('moves a nested node among its siblings', () => {
    const t = moveNode(tree(), 'a', 1);
    expect(findNode(t, 'stack')?.children?.map((n) => n.id)).toEqual(['b', 'a']);
  });
});

describe('insertAfter / insertBefore', () => {
  it('inserts after a target at its level', () => {
    const node = makeNode('divider');
    const t = insertAfter(tree(), 'a', node);
    expect(findNode(t, 'stack')?.children?.map((n) => n.id)).toEqual(['a', node.id, 'b']);
  });
  it('inserts before a target at its level', () => {
    const node = makeNode('divider');
    const t = insertBefore(tree(), 'b', node);
    expect(findNode(t, 'stack')?.children?.map((n) => n.id)).toEqual(['a', node.id, 'b']);
  });
});

describe('ancestorTypes / ancestorPath', () => {
  it('returns ancestor types nearest-first', () => {
    expect(ancestorTypes(tree(), 'a')).toEqual(['stack', 'section']);
    expect(ancestorTypes(tree(), 'd')).toEqual([]);
    expect(ancestorTypes(tree(), 'missing')).toEqual([]);
  });
  it('returns ancestor path root-first', () => {
    const p = ancestorPath(tree(), 'a');
    expect(p.map((x) => x.id)).toEqual(['sec', 'stack']);
    expect(ancestorPath(tree(), 'missing')).toEqual([]);
  });
});

describe('isDescendant', () => {
  it('detects self and nested descendants', () => {
    const sec = findNode(tree(), 'sec')!;
    expect(isDescendant(sec, 'sec')).toBe(true);
    expect(isDescendant(sec, 'a')).toBe(true);
    expect(isDescendant(sec, 'd')).toBe(false);
  });
});

describe('moveRelative', () => {
  it('relocates a node to be a sibling after target', () => {
    const t = moveRelative(tree(), 'a', 'd');
    expect(t.map((n) => n.id)).toEqual(['sec', 'd', 'a']);
    expect(findNode(t, 'stack')?.children?.map((n) => n.id)).toEqual(['b']);
  });
  it('no-op when drag === target', () => {
    expect(moveRelative(tree(), 'a', 'a').length).toBe(2);
  });
  it('no-op when dragged not found', () => {
    const t = tree();
    expect(moveRelative(t, 'missing', 'd')).toBe(t);
  });
  it('no-op when dropping into own subtree', () => {
    const t = tree();
    expect(moveRelative(t, 'sec', 'a')).toBe(t);
  });
});

describe('moveTo', () => {
  it('inserts before target', () => {
    const t = moveTo(tree(), 'a', 'd', 'before');
    expect(t.map((n) => n.id)).toEqual(['sec', 'a', 'd']);
  });
  it('inserts after target', () => {
    const t = moveTo(tree(), 'a', 'd', 'after');
    expect(t.map((n) => n.id)).toEqual(['sec', 'd', 'a']);
  });
  it('no-ops: same id, missing drag, own-subtree', () => {
    const t = tree();
    expect(moveTo(t, 'a', 'a', 'after')).toBe(t);
    expect(moveTo(t, 'missing', 'd', 'after')).toBe(t);
    expect(moveTo(t, 'sec', 'a', 'before')).toBe(t);
  });
});
