import { describe, it, expect } from 'vitest';
import {
  CONTAINER_TYPES,
  isContainer,
  NODE_LABELS,
  newId,
  defaultProps,
  makeNode,
  DEFAULT_DOC,
  type NodeType,
} from '@/lib/builder/types';

const ALL_TYPES: NodeType[] = [
  'section', 'stack', 'row', 'grid', 'card', 'heading', 'text', 'list',
  'counter', 'button', 'image', 'video', 'input', 'textarea', 'form',
  'pricing', 'testimonial', 'socials', 'faq', 'tabs', 'divider', 'spacer',
  'themeGallery', 'videoGrid', 'authLogin', 'authRegister', 'authAccount',
];

describe('isContainer / CONTAINER_TYPES', () => {
  it('recognises container types', () => {
    for (const t of CONTAINER_TYPES) expect(isContainer(t)).toBe(true);
    expect(isContainer('section')).toBe(true);
    expect(isContainer('heading')).toBe(false);
    expect(isContainer('divider')).toBe(false);
  });
});

describe('NODE_LABELS', () => {
  it('has a label for every node type', () => {
    for (const t of ALL_TYPES) {
      expect(typeof NODE_LABELS[t]).toBe('string');
      expect(NODE_LABELS[t].length).toBeGreaterThan(0);
    }
  });
});

describe('newId()', () => {
  it('produces unique, prefixed, monotonically-suffixed ids', () => {
    const a = newId('section');
    const b = newId('section');
    expect(a).not.toBe(b);
    expect(a.startsWith('section-')).toBe(true);
  });
});

describe('defaultProps()', () => {
  it('returns props for every known type', () => {
    for (const t of ALL_TYPES) {
      const p = defaultProps(t);
      expect(p && typeof p).toBe('object');
    }
  });

  it('returns empty object for divider and unknown types', () => {
    expect(defaultProps('divider')).toEqual({});
    // @ts-expect-error hitting the default branch
    expect(defaultProps('mystery')).toEqual({});
  });

  it('spot-checks a few concrete defaults', () => {
    expect(defaultProps('heading').level).toBe('2');
    expect(defaultProps('grid').columns).toBe('3');
    expect(defaultProps('spacer').height).toBe('md');
    expect(defaultProps('authRegister').showName).toBe('true');
  });
});

describe('makeNode()', () => {
  it('creates a leaf node without children', () => {
    const n = makeNode('heading');
    expect(n.type).toBe('heading');
    expect(n.id.startsWith('heading-')).toBe(true);
    expect(n.props.level).toBe('2');
    expect(n.children).toBeUndefined();
  });

  it('creates a container node with an empty children array', () => {
    const n = makeNode('section');
    expect(Array.isArray(n.children)).toBe(true);
    expect(n.children).toEqual([]);
  });
});

describe('DEFAULT_DOC', () => {
  it('is a well-formed empty document', () => {
    expect(DEFAULT_DOC.brand).toBeTruthy();
    expect(DEFAULT_DOC.themeId).toBe('auto');
    expect(Array.isArray(DEFAULT_DOC.pages)).toBe(true);
    expect(DEFAULT_DOC.pages.length).toBe(0);
    expect(DEFAULT_DOC.nav.length).toBeGreaterThan(0);
    expect(DEFAULT_DOC.footer.links.length).toBeGreaterThan(0);
  });
});
