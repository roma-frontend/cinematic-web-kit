import { describe, it, expect, beforeEach } from 'vitest';
import { listDocumentsForAdmin, listPublishedDocuments, deleteDocument, countDocuments } from '@/lib/site-documents';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import { getDb, newId, siteDocuments } from '@/lib/db';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seed() {
  createUser('super@example.com', 'password123', 'Super');
  const owner = createUser('owner@example.com', 'password123', 'Owner');
  const site = createSite(owner.id, 'Org');
  return { owner, site };
}

function insertDoc(siteId: string, title: string, published: boolean) {
  const id = newId('doc');
  getDb().insert(siteDocuments).values({
    id, siteId, title, fileName: `${title}.pdf`, url: `/uploads/${id}.pdf`, storageKey: `/uploads/${id}.pdf`,
    contentType: 'application/pdf', size: 123, published, uploadedBy: 'u', createdAt: new Date(),
  }).run();
  return id;
}

describe('site documents', () => {
  it('lists all for admin but only published for members', () => {
    const { site } = seed();
    insertDoc(site.id, 'Pub', true);
    insertDoc(site.id, 'Draft', false);
    expect(listDocumentsForAdmin(site.id)).toHaveLength(2);
    expect(listPublishedDocuments(site.id)).toHaveLength(1);
    expect(countDocuments(site.id)).toBe(1);
  });

  it('deletes a document (DB row) scoped to its site', async () => {
    const { site } = seed();
    const id = insertDoc(site.id, 'Pub', true);
    await deleteDocument(site.id, id);
    expect(listDocumentsForAdmin(site.id)).toHaveLength(0);
  });

  it('isolates documents between sites', () => {
    const { owner, site } = seed();
    const other = createSite(owner.id, 'Org2');
    insertDoc(site.id, 'A', true);
    insertDoc(other.id, 'B', true);
    expect(listPublishedDocuments(site.id)).toHaveLength(1);
    expect(listPublishedDocuments(site.id)[0].title).toBe('A');
  });
});
