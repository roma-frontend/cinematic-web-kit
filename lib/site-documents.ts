import 'server-only';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, newId, siteDocuments, siteUsers, type SiteDocument } from '@/lib/db';
import { r2Configured, r2Put, r2Delete, R2_PUBLIC_BASE, contentTypeFor } from '@/lib/storage';
import { notifyMember } from '@/lib/site-membership';

// Admin-uploaded member documents (PDF/video/…). Files go to Cloudflare R2 when
// configured, otherwise to public/uploads (dev/self-hosted). All siteId-scoped.

const MAX_BYTES = 64 * 1024 * 1024; // 64 MB cap (matches apiErrors.fileTooLarge)
const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads');

function safeName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80);
  return base || 'file';
}

export interface UploadResult { document?: SiteDocument; error?: 'TOO_LARGE' | 'EMPTY' }

/** Store an uploaded buffer and record the document. Notifies approved members. */
export async function storeDocument(
  siteId: string,
  adminUserId: string,
  file: { fileName: string; buffer: Buffer; contentType?: string; title?: string },
): Promise<UploadResult> {
  if (file.buffer.length === 0) return { error: 'EMPTY' };
  if (file.buffer.length > MAX_BYTES) return { error: 'TOO_LARGE' };
  const id = newId('doc');
  const clean = safeName(file.fileName);
  const key = `sites/${siteId}/documents/${id}-${clean}`;
  const contentType = file.contentType || contentTypeFor(clean);

  let url: string;
  if (r2Configured()) {
    await r2Put(key, file.buffer, contentType);
    url = `${R2_PUBLIC_BASE}/${key}`;
  } else {
    const localName = `${id}-${clean}`;
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, localName), file.buffer);
    url = `/uploads/${localName}`;
  }

  const row: SiteDocument = {
    id,
    siteId,
    title: (file.title ?? '').slice(0, 200) || file.fileName.slice(0, 200),
    fileName: file.fileName.slice(0, 200),
    url,
    storageKey: r2Configured() ? key : `/uploads/${id}-${clean}`,
    contentType,
    size: file.buffer.length,
    published: true,
    uploadedBy: adminUserId,
    createdAt: new Date(),
  };
  getDb().insert(siteDocuments).values(row).run();

  const members = getDb().select({ id: siteUsers.id }).from(siteUsers).where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.status, 'approved'))).all();
  for (const m of members) notifyMember(siteId, m.id, 'document', 'Новый документ', row.title || 'Загружен новый файл.');
  return { document: row };
}

export function listDocumentsForAdmin(siteId: string): SiteDocument[] {
  return getDb().select().from(siteDocuments).where(eq(siteDocuments.siteId, siteId)).orderBy(desc(siteDocuments.createdAt)).all();
}

export interface MemberDocument {
  id: string; title: string; fileName: string; url: string; contentType: string; size: number; createdAt: Date;
}
export function listPublishedDocuments(siteId: string): MemberDocument[] {
  return getDb()
    .select({ id: siteDocuments.id, title: siteDocuments.title, fileName: siteDocuments.fileName, url: siteDocuments.url, contentType: siteDocuments.contentType, size: siteDocuments.size, createdAt: siteDocuments.createdAt })
    .from(siteDocuments)
    .where(and(eq(siteDocuments.siteId, siteId), eq(siteDocuments.published, true)))
    .orderBy(desc(siteDocuments.createdAt))
    .all();
}

export async function deleteDocument(siteId: string, documentId: string): Promise<void> {
  const doc = getDb().select().from(siteDocuments).where(and(eq(siteDocuments.id, documentId), eq(siteDocuments.siteId, siteId))).get();
  if (!doc) return;
  getDb().delete(siteDocuments).where(and(eq(siteDocuments.id, documentId), eq(siteDocuments.siteId, siteId))).run();
  try {
    if (r2Configured() && !doc.storageKey.startsWith('/uploads/')) {
      await r2Delete(doc.storageKey);
    } else {
      const name = doc.storageKey.replace(/^\/uploads\//, '');
      await unlink(path.join(LOCAL_DIR, name)).catch(() => {});
    }
  } catch { /* best-effort file cleanup */ }
}

export function countDocuments(siteId: string): number {
  return getDb().select({ id: siteDocuments.id }).from(siteDocuments).where(and(eq(siteDocuments.siteId, siteId), eq(siteDocuments.published, true))).all().length;
}
