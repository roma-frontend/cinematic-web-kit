'use client';

// Site owner (admin) management of an organization: approve/reject/suspend
// members and create member-only materials. Talks to /api/site-members
// (platform-authenticated + ownership-checked). Fully siteId-scoped.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Check, X, Ban, Clock, Plus, Trash2, Users, Library, ShieldCheck, GraduationCap, ChevronRight, Eye, EyeOff, Upload, FileType, LifeBuoy, Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SITE_MEMBERS_SEEN_EVENT } from '@/components/dashboard/site-members-badge';
import { useLocale } from '@/hooks/use-locale';
import { dashDict } from '@/lib/dashboard-dict';

type Member = { id: string; email: string; name: string; status: string; rejectionReason: string; createdAt: string | number; approvedAt: string | number | null };
type Material = { id: string; title: string; body: string; url: string; published: boolean; createdAt: string | number };
type Course = { id: string; title: string; description: string; accent: string; published: boolean; lessonCount: number; createdAt: string | number };
type Lesson = { id: string; title: string; body: string; videoUrl: string; attachmentUrl: string; position: number };
type Document = { id: string; title: string; fileName: string; url: string; size: number; createdAt: string | number };
type Ticket = { id: string; subject: string; status: string; lastActor: string; updatedAt: string | number; messageCount: number; memberName: string; memberEmail: string };
type TicketMsg = { id: string; authorType: string; body: string; createdAt: string | number };
type TicketThread = { id: string; subject: string; status: string; messages: TicketMsg[]; memberName: string; memberEmail: string };

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600',
  approved: 'bg-green-500/15 text-green-600',
  rejected: 'bg-red-500/15 text-red-500',
  suspended: 'bg-red-500/15 text-red-500',
};

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/site-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.ok;
}

export function SiteMembers({ siteId, memberApproval }: { siteId: string; memberApproval: boolean }) {
  const t = dashDict(useLocale().locale).members;
  const [members, setMembers] = useState<Member[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [approval, setApproval] = useState(memberApproval);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    fetch(`/api/site-members?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setMaterials(d.materials ?? []);
        setCourses(d.courses ?? []);
        setDocuments(d.documents ?? []);
        setTickets(d.tickets ?? []);
        // Owner opened the members panel → clear the nav badge blink.
        window.dispatchEvent(new CustomEvent(SITE_MEMBERS_SEEN_EVENT));
      })
      .catch(() => { setMembers([]); setMaterials([]); setCourses([]); setDocuments([]); setTickets([]); });
  }, [siteId]);
  useEffect(() => { load(); }, [load]);

  const act = async (memberId: string, status: string) => {
    let reason = '';
    if (status === 'rejected' || status === 'suspended') reason = window.prompt(t.reasonPrompt) ?? '';
    setBusy(memberId);
    await post({ action: 'set-status', siteId, memberId, status, reason });
    setBusy(''); load();
  };

  const toggleApproval = async (v: boolean) => { setApproval(v); await post({ action: 'set-approval-policy', siteId, memberApproval: v }); };

  const pending = members?.filter((m) => m.status === 'pending') ?? [];
  const others = members?.filter((m) => m.status !== 'pending') ?? [];

  return (
    <div className="space-y-8">
      {/* Approval policy */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <span>
          <span className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> {t.approvalTitle}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{t.approvalDesc}</span>
        </span>
        <button type="button" role="switch" aria-checked={approval} onClick={() => toggleApproval(!approval)}
          className={`relative h-6 w-11 flex-none rounded-full transition-colors ${approval ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${approval ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
        </button>
      </label>

      {/* Pending requests */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-amber-500" /> {t.requestsTitle} {pending.length > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">{pending.length}</span>}</h3>
        {!members ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noRequests}</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name || t.noName}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Button size="sm" className="gap-1.5 bg-green-600 text-white hover:bg-green-700" disabled={busy === m.id} onClick={() => act(m.id, 'approved')}>
                  {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.approve}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10" disabled={busy === m.id} onClick={() => act(m.id, 'rejected')}>
                  <X className="h-4 w-4" /> {t.reject}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* All members */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> {t.membersTitle}</h3>
        {members && others.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMembers}</p>
        ) : (
          <ul className="space-y-2">
            {others.map((m) => {
              const cls = STATUS_CLS[m.status] ?? STATUS_CLS.approved;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name || t.noName}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{t.status[m.status as keyof typeof t.status] ?? m.status}</span>
                  {m.status === 'approved' ? (
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10" disabled={busy === m.id} onClick={() => act(m.id, 'suspended')}>
                      <Ban className="h-4 w-4" /> {t.suspend}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy === m.id} onClick={() => act(m.id, 'approved')}>
                      {busy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.restore}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <MaterialsEditor siteId={siteId} materials={materials} reload={load} />
      <CoursesEditor siteId={siteId} courses={courses} reload={load} />
      <DocumentsEditor siteId={siteId} documents={documents} reload={load} />
      <TicketsEditor siteId={siteId} tickets={tickets} reload={load} />
    </div>
  );
}

function MaterialsEditor({ siteId, materials, reload }: { siteId: string; materials: Material[] | null; reload: () => void }) {
  const t = dashDict(useLocale().locale).members;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState('');

  const add = async () => {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    await post({ action: 'material-create', siteId, title, body, url, published: true });
    setBusy(false); setTitle(''); setBody(''); setUrl(''); reload();
  };
  const del = async (id: string) => { setDelBusy(id); await post({ action: 'material-delete', siteId, materialId: id }); setDelBusy(''); reload(); };

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Library className="h-4 w-4" /> {t.materialsTitle}</h3>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.materialTitle} className="h-10" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.materialBody} rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.materialUrl} className="h-10" />
        <Button size="sm" className="gap-1.5" disabled={busy} onClick={add}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t.addMaterial}
        </Button>
      </div>
      {materials && materials.length > 0 && (
        <ul className="mt-3 space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.title || t.untitled}</p>
                {m.body && <p className="truncate text-xs text-muted-foreground">{m.body}</p>}
              </div>
              <button type="button" onClick={() => del(m.id)} disabled={delBusy === m.id} aria-label={t.delete} className="flex-none rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                {delBusy === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}



function CoursesEditor({ siteId, courses, reload }: { siteId: string; courses: Course[] | null; reload: () => void }) {
  const t = dashDict(useLocale().locale).learning;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const add = async () => {
    if (!title.trim()) return;
    setBusy(true);
    await post({ action: 'course-create', siteId, title, description, published: true });
    setBusy(false); setTitle(''); setDescription(''); reload();
  };
  const togglePublish = async (c: Course) => { setRowBusy(c.id); await post({ action: 'course-update', siteId, courseId: c.id, published: !c.published }); setRowBusy(''); reload(); };
  const del = async (id: string) => { setRowBusy(id); await post({ action: 'course-delete', siteId, courseId: id }); setRowBusy(''); if (openId === id) setOpenId(null); reload(); };

  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4" /> {t.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t.desc}</p>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.courseTitle} className="h-10" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.courseDesc} rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button size="sm" className="gap-1.5" disabled={busy} onClick={add}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t.addCourse}
        </Button>
      </div>
      {!courses ? (
        <div className="mt-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : courses.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t.noCourses}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpenId(openId === c.id ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChevronRight className={`h-4 w-4 flex-none text-muted-foreground transition-transform ${openId === c.id ? 'rotate-90' : ''}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{c.title || t.courseTitle}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.lessonCount} {t.lessonsN}</span>
                  </span>
                </button>
                <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.published ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>{c.published ? t.published : t.draft}</span>
                <Button size="sm" variant="outline" className="flex-none gap-1.5" disabled={rowBusy === c.id} onClick={() => togglePublish(c)}>
                  {rowBusy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : c.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="hidden sm:inline">{c.published ? t.unpublish : t.publish}</span>
                </Button>
                <button type="button" onClick={() => del(c.id)} disabled={rowBusy === c.id} aria-label={t.delete} className="flex-none rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {openId === c.id && <LessonsEditor siteId={siteId} courseId={c.id} reload={reload} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LessonsEditor({ siteId, courseId, reload }: { siteId: string; courseId: string; reload: () => void }) {
  const t = dashDict(useLocale().locale).learning;
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState('');

  const load = useCallback(() => {
    fetch(`/api/site-members?site=${encodeURIComponent(siteId)}&course=${encodeURIComponent(courseId)}`)
      .then((r) => r.json()).then((d) => setLessons(d.lessons ?? [])).catch(() => setLessons([]));
  }, [siteId, courseId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    await post({ action: 'lesson-create', siteId, courseId, title, body, videoUrl, attachmentUrl });
    setBusy(false); setTitle(''); setBody(''); setVideoUrl(''); setAttachmentUrl(''); load(); reload();
  };
  const del = async (id: string) => { setDelBusy(id); await post({ action: 'lesson-delete', siteId, lessonId: id }); setDelBusy(''); load(); reload(); };

  return (
    <div className="space-y-3 border-t border-border/60 bg-muted/20 p-4">
      {!lessons ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : lessons.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.noLessons}</p>
      ) : (
        <ol className="space-y-1.5">
          {lessons.map((l, i) => (
            <li key={l.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="flex-none text-[11px] font-bold tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{l.title || '—'}</span>
              <button type="button" onClick={() => del(l.id)} disabled={delBusy === l.id} aria-label={t.delete} className="flex-none rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                {delBusy === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.lessonTitle} className="h-9" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.lessonBody} rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t.lessonVideo} className="h-9" />
        <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder={t.lessonAttach} className="h-9" />
        <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={add}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t.addLesson}
        </Button>
      </div>
    </div>
  );
}


function DocumentsEditor({ siteId, documents, reload }: { siteId: string; documents: Document[] | null; reload: () => void }) {
  const t = dashDict(useLocale().locale).documents;
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [delBusy, setDelBusy] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('siteId', siteId);
      fd.append('title', title);
      fd.append('file', file);
      await fetch('/api/site-documents', { method: 'POST', body: fd });
    } catch { /* surfaced by reload showing no change */ }
    setUploading(false); setTitle('');
    if (inputRef.current) inputRef.current.value = '';
    reload();
  };
  const del = async (id: string) => { setDelBusy(id); await post({ action: 'document-delete', siteId, documentId: id }); setDelBusy(''); reload(); };

  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><FileType className="h-4 w-4" /> {t.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t.desc}</p>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePh} className="h-10" />
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        <Button size="sm" className="gap-1.5" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? t.uploading : t.upload}
        </Button>
      </div>
      {!documents ? (
        <div className="mt-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : documents.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t.noDocuments}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <FileType className="h-4 w-4 flex-none text-muted-foreground" />
              <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{d.title || d.fileName}</a>
              <button type="button" onClick={() => del(d.id)} disabled={delBusy === d.id} aria-label={t.delete} className="flex-none rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                {delBusy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


function TicketsEditor({ siteId, tickets, reload }: { siteId: string; tickets: Ticket[] | null; reload: () => void }) {
  const t = dashDict(useLocale().locale).support;
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const openTicket = (id: string) => {
    setOpenId(id); setThread(null);
    fetch(`/api/site-members?site=${encodeURIComponent(siteId)}&ticket=${encodeURIComponent(id)}`)
      .then((r) => r.json()).then((d) => setThread(d.ticket ?? null)).catch(() => setThread(null));
  };
  const send = async () => {
    if (!reply.trim() || !openId) return;
    setBusy(true);
    await post({ action: 'ticket-reply', siteId, ticketId: openId, body: reply });
    setBusy(false); setReply(''); openTicket(openId); reload();
  };
  const setStatus = async (status: 'open' | 'closed') => {
    if (!openId) return;
    setBusy(true);
    await post({ action: 'ticket-status', siteId, ticketId: openId, status });
    setBusy(false); openTicket(openId); reload();
  };

  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><LifeBuoy className="h-4 w-4" /> {t.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t.desc}</p>
      {openId && thread ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => { setOpenId(null); setThread(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {t.back}</button>
            <span className="ml-auto text-xs text-muted-foreground">{thread.memberName || thread.memberEmail}</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus(thread.status === 'open' ? 'closed' : 'open')}>
              {thread.status === 'open' ? t.close : t.reopen}
            </Button>
          </div>
          <p className="mb-3 font-semibold">{thread.subject}</p>
          <ul className="space-y-2">
            {thread.messages.map((m) => {
              const admin = m.authorType === 'admin';
              return (
                <li key={m.id} className={`flex ${admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${admin ? 'bg-primary text-primary-foreground' : 'border border-border bg-background'}`}>
                    <p className={`mb-0.5 text-[11px] font-semibold ${admin ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{admin ? t.you : t.team}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {thread.status === 'open' && (
            <div className="mt-3 flex items-end gap-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t.replyPh} rows={2}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <Button disabled={busy || !reply.trim()} onClick={send} className="gap-1.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t.send}
              </Button>
            </div>
          )}
        </div>
      ) : !tickets ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noTickets}</p>
      ) : (
        <ul className="space-y-2">
          {tickets.map((tk) => (
            <li key={tk.id}>
              <button onClick={() => openTicket(tk.id)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tk.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{tk.memberName || tk.memberEmail}</p>
                </div>
                {tk.lastActor === 'member' && tk.status === 'open' && <span className="h-2 w-2 flex-none rounded-full bg-amber-500" />}
                <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold ${tk.status === 'open' ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>{tk.status === 'open' ? t.open : t.closed}</span>
                <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
