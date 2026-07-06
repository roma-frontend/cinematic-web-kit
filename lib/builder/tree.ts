import type { BuilderNode } from './types';
import { newId } from './types';

// Pure, immutable operations on a BuilderNode[] tree (a page's blocks).

export function cloneWithNewIds(node: BuilderNode): BuilderNode {
  return {
    ...node,
    id: newId(node.type),
    props: { ...node.props },
    children: node.children?.map(cloneWithNewIds),
  };
}

// Inserts a deep copy (fresh ids) right after the node with `id`, wherever it is.
export function duplicateNode(nodes: BuilderNode[], id: string): { nodes: BuilderNode[]; newId: string | null } {
  let created: string | null = null;
  const walk = (list: BuilderNode[]): BuilderNode[] => {
    const out: BuilderNode[] = [];
    for (const n of list) {
      const next = n.children ? { ...n, children: walk(n.children) } : n;
      out.push(next);
      if (n.id === id && created === null) {
        const copy = cloneWithNewIds(n);
        created = copy.id;
        out.push(copy);
      }
    }
    return out;
  };
  return { nodes: walk(nodes), newId: created };
}

export function updateProps(nodes: BuilderNode[], id: string, patch: Record<string, string>): BuilderNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, props: { ...n.props, ...patch } };
    if (n.children) return { ...n, children: updateProps(n.children, id, patch) };
    return n;
  });
}

export function removeNode(nodes: BuilderNode[], id: string): BuilderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

export function insertChild(nodes: BuilderNode[], parentId: string, child: BuilderNode): BuilderNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), child] };
    if (n.children) return { ...n, children: insertChild(n.children, parentId, child) };
    return n;
  });
}

// Moves a node up/down among its siblings, wherever it lives in the tree.
export function moveNode(nodes: BuilderNode[], id: string, dir: -1 | 1): BuilderNode[] {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx !== -1) {
    const j = idx + dir;
    if (j < 0 || j >= nodes.length) return nodes;
    const next = [...nodes];
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  }
  return nodes.map((n) => (n.children ? { ...n, children: moveNode(n.children, id, dir) } : n));
}

// ---- Reusable blocks (symbols) ----
// A "symbol" is a set of linked nodes sharing props.symbolId. Editing any one
// mirrors its subtree onto all the others (edit once → changes everywhere).

/** Nearest self-or-ancestor of `id` that is a symbol (has props.symbolId). */
export function findSymbolOf(nodes: BuilderNode[], id: string): BuilderNode | null {
  let res: BuilderNode | null = null;
  const walk = (list: BuilderNode[], chain: BuilderNode[]): boolean => {
    for (const n of list) {
      const nextChain = [n, ...chain];
      if (n.id === id) { res = nextChain.find((x) => x.props?.symbolId) ?? null; return true; }
      if (n.children && walk(n.children, nextChain)) return true;
    }
    return false;
  };
  walk(nodes, []);
  return res;
}

/** Replace every node with symbolId === sid (except `sourceId`) by a fresh clone
 *  of `master`, preserving each target's own id + symbolId + symbolName. */
export function applySymbol(nodes: BuilderNode[], sid: string, master: BuilderNode, sourceId: string): BuilderNode[] {
  return nodes.map((n) => {
    if (n.props?.symbolId === sid && n.id !== sourceId) {
      const clone = cloneWithNewIds(master);
      return { ...clone, id: n.id, props: { ...clone.props, symbolId: sid, ...(n.props.symbolName ? { symbolName: n.props.symbolName } : {}) } };
    }
    if (n.children) return { ...n, children: applySymbol(n.children, sid, master, sourceId) };
    return n;
  });
}

/** Distinct symbols present in a tree (for the "insert copy" list). */
export function collectSymbols(nodes: BuilderNode[], into: Map<string, string> = new Map()): Map<string, string> {
  for (const n of nodes) {
    const sid = n.props?.symbolId;
    if (sid && !into.has(sid)) into.set(sid, n.props.symbolName || sid);
    if (n.children) collectSymbols(n.children, into);
  }
  return into;
}

/** First node with the given symbolId (a template to clone). */
export function findBySymbol(nodes: BuilderNode[], sid: string): BuilderNode | null {
  for (const n of nodes) {
    if (n.props?.symbolId === sid) return n;
    if (n.children) { const f = findBySymbol(n.children, sid); if (f) return f; }
  }
  return null;
}

export function findNode(nodes: BuilderNode[], id: string): BuilderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Inserts `node` immediately after the node with `targetId`, at that level.
export function insertAfter(nodes: BuilderNode[], targetId: string, node: BuilderNode): BuilderNode[] {
  const out: BuilderNode[] = [];
  for (const n of nodes) {
    const next = n.children ? { ...n, children: insertAfter(n.children, targetId, node) } : n;
    out.push(next);
    if (n.id === targetId) out.push(node);
  }
  return out;
}

// Inserts `node` immediately BEFORE the node with `targetId`, at that level.
export function insertBefore(nodes: BuilderNode[], targetId: string, node: BuilderNode): BuilderNode[] {
  const out: BuilderNode[] = [];
  for (const n of nodes) {
    if (n.id === targetId) out.push(node);
    out.push(n.children ? { ...n, children: insertBefore(n.children, targetId, node) } : n);
  }
  return out;
}

// Returns the types of all ancestors of `id` (nearest first). Empty if at root.
export function ancestorTypes(nodes: BuilderNode[], id: string): string[] {
  let result: string[] = [];
  const walk = (list: BuilderNode[], trail: string[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        result = trail;
        return true;
      }
      if (n.children && walk(n.children, [n.type, ...trail])) return true;
    }
    return false;
  };
  walk(nodes, []);
  return result;
}

// Ancestors of `id` from root down to the direct parent (for breadcrumbs).
export function ancestorPath(nodes: BuilderNode[], id: string): { id: string; type: string }[] {
  let result: { id: string; type: string }[] = [];
  const walk = (list: BuilderNode[], trail: { id: string; type: string }[]): boolean => {
    for (const n of list) {
      if (n.id === id) {
        result = trail;
        return true;
      }
      if (n.children && walk(n.children, [...trail, { id: n.id, type: n.type }])) return true;
    }
    return false;
  };
  walk(nodes, []);
  return result;
}


export function isDescendant(node: BuilderNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((c) => isDescendant(c, id));
}

// Drag-and-drop move: relocate `dragId` to be a sibling right after `targetId`.
export function moveRelative(nodes: BuilderNode[], dragId: string, targetId: string): BuilderNode[] {
  if (dragId === targetId) return nodes;
  const dragged = findNode(nodes, dragId);
  if (!dragged) return nodes;
  if (isDescendant(dragged, targetId)) return nodes; // can't drop into own subtree
  return insertAfter(removeNode(nodes, dragId), targetId, dragged);
}

// Move `dragId` to be a sibling before/after `targetId` (precise ordering).
export function moveTo(nodes: BuilderNode[], dragId: string, targetId: string, pos: 'before' | 'after'): BuilderNode[] {
  if (dragId === targetId) return nodes;
  const dragged = findNode(nodes, dragId);
  if (!dragged) return nodes;
  if (isDescendant(dragged, targetId)) return nodes;
  const without = removeNode(nodes, dragId);
  return pos === 'before' ? insertBefore(without, targetId, dragged) : insertAfter(without, targetId, dragged);
}
