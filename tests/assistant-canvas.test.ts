import { describe, it, expect } from 'vitest';
import { parseMarkdownTable, sitePreviewUrl, findSiteEntity } from '@/lib/assistant-canvas';
import type { MentionEntity } from '@/lib/assistant-commands';

describe('parseMarkdownTable', () => {
  it('parses a clean markdown table', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Anna | 30 |\n| Bob | 25 |';
    expect(parseMarkdownTable(md)).toEqual({
      headers: ['Name', 'Age'],
      rows: [['Anna', '30'], ['Bob', '25']],
    });
  });

  it('tolerates leading/trailing prose', () => {
    const md = 'Here is your data:\n\n| City |\n| --- |\n| Yerevan |\n\nHope that helps!';
    expect(parseMarkdownTable(md)).toEqual({
      headers: ['City'],
      rows: [['Yerevan']],
    });
  });

  it('returns null when no table is present', () => {
    expect(parseMarkdownTable('no table here')).toBeNull();
  });

  it('returns null for a header without separator', () => {
    expect(parseMarkdownTable('| A | B |\n| x | y |')).toBeNull();
  });

  it('returns null when there are no data rows', () => {
    expect(parseMarkdownTable('| A | B |\n| --- | --- |')).toBeNull();
  });
});

describe('sitePreviewUrl', () => {
  it('builds a draft preview URL without a theme', () => {
    expect(sitePreviewUrl('my-site')).toBe('/s/my-site?draft=1');
  });

  it('includes a theme override when provided', () => {
    expect(sitePreviewUrl('my-site', 'neon-night')).toBe('/s/my-site?draft=1&theme=neon-night');
  });

  it('encodes the slug', () => {
    expect(sitePreviewUrl('my site')).toBe('/s/my%20site?draft=1');
  });
});

describe('findSiteEntity', () => {
  const entities: MentionEntity[] = [
    { id: 's_1', type: 'site', label: 'Coffee', hint: 'coffee' },
    { id: 'u_1', type: 'user', label: 'Anna', hint: 'anna@x.com' },
  ];

  it('finds a site entity by id', () => {
    expect(findSiteEntity(entities, 's_1')).toEqual(entities[0]);
  });

  it('returns undefined for a non-site or missing entity', () => {
    expect(findSiteEntity(entities, 'u_1')).toBeUndefined();
    expect(findSiteEntity(entities, 's_2')).toBeUndefined();
  });
});
