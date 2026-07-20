'use client';

// Site owner (admin) management of an organization: approve/reject/suspend
// members and create member-only materials. Talks to /api/site-members
// (platform-authenticated + ownership-checked). Fully siteId-scoped.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Check, X, Ban, Clock, Plus, Trash2, Users, Library, ShieldCheck, GraduationCap, ChevronRight, ChevronLeft, Eye, EyeOff, Upload, FileType, LifeBuoy, Send, ArrowLeft, Megaphone, UserPlus, Pencil, KeyRound, Download, Copy, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { SITE_MEMBERS_SEEN_EVENT } from '@/components/dashboard/site-members-badge';
import { useLocale } from '@/hooks/use-locale';
import { dashDict } from '@/lib/dashboard-dict';
import { copyToClipboard } from '@/lib/clipboard';

type Member = { id: string; email: string; name: string; status: string; rejectionReason: string; createdAt: string | number; approvedAt: string | number | null };
type Material = { id: string; title: string; body: string; url: string; published: boolean; createdAt: string | number };
type Course = { id: string; title: string; description: string; accent: string; published: boolean; lessonCount: number; createdAt: string | number };
type Lesson = { id: string; title: string; body: string; videoUrl: string; attachmentUrl: string; position: number };
type Document = { id: string; title: string; fileName: string; url: string; size: number; createdAt: string | number };
type Ticket = { id: string; subject: string; status: string; lastActor: string; updatedAt: string | number; messageCount: number; memberName: string; memberEmail: string };
type TicketMsg = { id: string; authorType: string; body: string; createdAt: string | number };
type TicketThread = { id: string; subject: string; status: string; messages: TicketMsg[]; memberName: string; memberEmail: string };
type Announcement = { id: string; title: string; body: string; pinned: boolean; createdAt: string | number };

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

type TabId = 'settings' | 'members' | 'materials' | 'courses' | 'documents' | 'tickets' | 'announcements';
const TAB_SETTINGS_LABEL: Record<string, string> = { ru: 'Настройки', en: 'Settings', hy: 'Կարգավորումներ' };

export function SiteMembers({ siteId, memberApproval, settings, initialTab }: { siteId: string; memberApproval: boolean; settings?: React.ReactNode; initialTab?: TabId }) {
  const locale = useLocale().locale;
  const d = dashDict(locale);
  const t = d.members;
  const [members, setMembers] = useState<Member[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [approval, setApproval] = useState(memberApproval);
  const [tab, setTab] = useState<TabId>(initialTab ?? (settings ? 'settings' : 'members'));

  // Horizontal tab carousel: show scroll arrows when the strip overflows so
  // every tool stays reachable on narrow screens (no hidden, unscrollable tabs).
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState({ left: false, right: false });
  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setArrows({ left: scrollLeft > 4, right: scrollLeft + clientWidth < scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect(); };
  }, [updateArrows]);
  const scrollByDir = (dir: -1 | 1) => scrollerRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  // Keep the active tab in view when it changes (e.g. deep-linked / programmatic).
  useEffect(() => {
    scrollerRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [tab]);

  const load = useCallback(() => {
    fetch(`/api/site-members?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setMaterials(d.materials ?? []);
        setCourses(d.courses ?? []);
        setDocuments(d.documents ?? []);
        setTickets(d.tickets ?? []);
        setAnnouncements(d.announcements ?? []);
        // Owner opened the members panel → clear the nav badge blink.
        window.dispatchEvent(new CustomEvent(SITE_MEMBERS_SEEN_EVENT));
      })
      .catch(() => { setMembers([]); setMaterials([]); setCourses([]); setDocuments([]); setTickets([]); setAnnouncements([]); });
  }, [siteId]);
  useEffect(() => { load(); }, [load]);

  const toggleApproval = async (v: boolean) => { setApproval(v); await post({ action: 'set-approval-policy', siteId, memberApproval: v }); };

  const pendingCount = members?.filter((mm) => mm.status === 'pending').length ?? 0;
  const openTickets = tickets?.filter((tk) => tk.status === 'open').length ?? 0;

  type TabDef = { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number };
  const tabs: TabDef[] = [
    ...(settings ? [{ id: 'settings' as TabId, label: TAB_SETTINGS_LABEL[locale] ?? 'Settings', icon: Settings2 }] : []),
    { id: 'members', label: t.membersTitle, icon: Users, count: pendingCount || undefined },
    { id: 'materials', label: t.materialsTitle, icon: Library, count: materials?.length || undefined },
    { id: 'courses', label: d.learning.title, icon: GraduationCap, count: courses?.length || undefined },
    { id: 'documents', label: d.documents.title, icon: FileType, count: documents?.length || undefined },
    { id: 'tickets', label: d.support.title, icon: LifeBuoy, count: openTickets || undefined },
    { id: 'announcements', label: d.announcements.title, icon: Megaphone, count: announcements?.length || undefined },
  ];

  return (
    <div id="members" className="space-y-6 scroll-mt-20">
      {/* Compact tab bar — a horizontal carousel so every organization tool
          stays reachable; arrows appear when the strip overflows. */}
      <div className="relative">
        {arrows.left && (
          <>
            <button type="button" onClick={() => scrollByDir(-1)} aria-label="←"
              className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 rounded-l-2xl bg-gradient-to-r from-background to-transparent" />
          </>
        )}
        <div ref={scrollerRef} role="tablist" aria-label={t.membersTitle} className="flex gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-muted/30 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tb) => {
            const on = tab === tb.id;
            const Icon = tb.icon;
            return (
              <button key={tb.id} id={`org-tab-${tb.id}`} data-tab={tb.id} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => setTab(tb.id)}
                className={`flex flex-none items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />
                <span>{tb.label}</span>
                {tb.count ? <span className={`rounded-full px-1.5 text-[11px] font-bold ${on ? 'bg-primary/15 text-primary' : 'bg-muted-foreground/15 text-muted-foreground'}`}>{tb.count}</span> : null}
              </button>
            );
          })}
        </div>
        {arrows.right && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 rounded-r-2xl bg-gradient-to-l from-background to-transparent" />
            <button type="button" onClick={() => scrollByDir(1)} aria-label="→"
              className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Active tab */}
      {tab === 'settings' && settings}

      {tab === 'members' && (
        <div className="space-y-6">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <span>
              <span className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> {t.approvalTitle}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t.approvalDesc}</span>
            </span>
            <button type="button" role="switch" aria-label={t.approvalTitle} aria-checked={approval} onClick={() => toggleApproval(!approval)}
              className={`relative h-6 w-11 flex-none rounded-full transition-colors ${approval ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${approval ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
            </button>
          </label>
          <MembersManager siteId={siteId} members={members} reload={load} />
        </div>
      )}

      {tab === 'materials' && <MaterialsEditor siteId={siteId} materials={materials} reload={load} />}
      {tab === 'courses' && <CoursesEditor siteId={siteId} courses={courses} reload={load} />}
      {tab === 'documents' && <DocumentsEditor siteId={siteId} documents={documents} reload={load} />}
      {tab === 'tickets' && <TicketsEditor siteId={siteId} tickets={tickets} reload={load} />}
      {tab === 'announcements' && <AnnouncementsEditor siteId={siteId} announcements={announcements} reload={load} />}
    </div>
  );
}

type ApiResp = { ok?: boolean; error?: string; password?: string; member?: Member; result?: { created: number; skipped: number; invalid: number; passwords: { email: string; password: string }[] } };
async function postJson(body: Record<string, unknown>): Promise<ApiResp> {
  const res = await fetch('/api/site-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json().catch(() => ({} as ApiResp));
}

// Inline copy for the member-admin tools (kept local to avoid growing the shared dict).
const MM = {
  ru: { add: 'Добавить участника', import: 'Импорт', export: 'Экспорт CSV', emailPh: 'E-mail', namePh: 'Имя (необязательно)', create: 'Создать', importHint: 'Вставьте по строке на участника: email, имя', importRun: 'Импортировать', done: 'Готово', copy: 'Копировать', copied: 'Скопировано', close: 'Закрыть', save: 'Сохранить', cancel: 'Отмена', edit: 'Изменить', resetPwd: 'Сбросить пароль', del: 'Удалить', delConfirm: 'Удалить участника навсегда?', resetConfirm: 'Сбросить пароль этому участнику?', credAdded: 'Участник создан. Передайте ему данные для входа:', credReset: 'Пароль сброшен. Новые данные для входа:', credImport: 'Импортировано. Данные для входа новых участников:', search: 'Поиск по имени или e-mail', created: 'создано', skipped: 'пропущено (уже есть)', invalid: 'ошибочных' },
  en: { add: 'Add member', import: 'Import', export: 'Export CSV', emailPh: 'E-mail', namePh: 'Name (optional)', create: 'Create', importHint: 'One member per line: email, name', importRun: 'Import', done: 'Done', copy: 'Copy', copied: 'Copied', close: 'Close', save: 'Save', cancel: 'Cancel', edit: 'Edit', resetPwd: 'Reset password', del: 'Delete', delConfirm: 'Delete this member permanently?', resetConfirm: 'Reset this member\u2019s password?', credAdded: 'Member created. Share these sign-in details:', credReset: 'Password reset. New sign-in details:', credImport: 'Imported. Sign-in details for new members:', search: 'Search by name or e-mail', created: 'created', skipped: 'skipped (existing)', invalid: 'invalid' },
  hy: { add: '\u0531\u057E\u0565\u056C\u0561\u0581\u0576\u0565\u056C \u0561\u0576\u0564\u0561\u0574', import: '\u0546\u0565\u0580\u0574\u0578\u0582\u056E\u0578\u0582\u0574', export: 'Արտահանում CSV', emailPh: 'E-mail', namePh: 'Անուն (ոչ պարտադիր)', create: 'Ստեղծել', importHint: 'Մեկ անդամ՝ տողում. email, անուն', importRun: 'Ներմուծել', done: 'Պատրաստ է', copy: 'Պատճենել', copied: 'Պատճենվեց', close: 'Փակել', save: 'Պահպանել', cancel: 'Չեղարկել', edit: 'Խմբագրել', resetPwd: 'Զրոյացնել գաղտնաբառը', del: 'Ջնջել', delConfirm: 'Ջնջե՞լ անդամին ընդմիշտ։', resetConfirm: 'Զրոյացնե՞լ այս անդամի գաղտնաբառը։', credAdded: 'Անդամը ստեղծվեց։ Փոխանցեք մուտքի տվյալները՝', credReset: 'Գաղտնաբառը զրոյացվեց։ Նոր մուտքի տվյալներ՝', credImport: 'Ներմուծվեց։ Նոր անդամների մուտքի տվյալները՝', search: 'Որոնել ըստ անվան կամ e-mail-ի', created: 'ստեղծված', skipped: 'բաց թողնված (առկա)', invalid: 'սխալ' },
} as const;

function Creds({ title, items, onClose, m }: { title: string; items: { email: string; password: string }[]; onClose: () => void; m: (typeof MM)[keyof typeof MM] }) {
  const [copied, setCopied] = useState('');
  const copy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    }
  };
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="mb-2 flex items-start gap-2">
        <KeyRound className="mt-0.5 h-4 w-4 flex-none text-primary" />
        <p className="flex-1 text-sm font-medium">{title}</p>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">{m.close}</button>
      </div>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.email} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate"><span className="font-medium">{c.email}</span> · <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.password}</code></span>
            <button type="button" onClick={() => copy(`${c.email} / ${c.password}`, c.email)} className="flex flex-none items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">
              <Copy className="h-3.5 w-3.5" /> {copied === c.email ? m.copied : m.copy}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MembersManager({ siteId, members, reload }: { siteId: string; members: Member[] | null; reload: () => void }) {
  const locale = useLocale().locale;
  const t = dashDict(locale).members;
  const m = MM[locale] ?? MM.en;
  const { confirm, confirmDialog } = useConfirm();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'add' | 'import' | null>(null);
  const [statusChange, setStatusChange] = useState<{ member: Member; status: 'rejected' | 'suspended'; reason: string } | null>(null);
  const [cred, setCred] = useState<{ title: string; items: { email: string; password: string }[] } | null>(null);
  // add form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  // import
  const [importText, setImportText] = useState('');
  const [importInfo, setImportInfo] = useState<string>('');
  // inline edit
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const act = async (memberId: string, status: string, reason = '') => {
    setError('');
    setBusy(memberId);
    const result = await postJson({ action: 'set-status', siteId, memberId, status, reason });
    setBusy('');
    if (result.error) setError(result.error);
    else reload();
  };

  const requestStatusChange = (member: Member, status: 'rejected' | 'suspended') => {
    setStatusChange({ member, status, reason: '' });
  };

  const submitStatusChange = async () => {
    if (!statusChange) return;
    await act(statusChange.member.id, statusChange.status, statusChange.reason.trim());
    setStatusChange(null);
  };

  const addMember = async () => {
    if (!email.trim()) return;
    setBusy('add');
    const r = await postJson({ action: 'member-create', siteId, email, name });
    setBusy('');
    if (r.ok && r.member && r.password) {
      setCred({ title: m.credAdded, items: [{ email: r.member.email, password: r.password }] });
      setEmail(''); setName(''); setPanel(null); reload();
    } else {
      setError(r.error || 'Error');
    }
  };

  const resetPwd = async (member: Member) => {
    if (!(await confirm({ title: m.resetConfirm, description: member.email, confirmLabel: m.resetPwd, cancelLabel: m.cancel, tone: 'warning' }))) return;
    setError('');
    setBusy(member.id);
    const r = await postJson({ action: 'member-reset-password', siteId, memberId: member.id });
    setBusy('');
    if (r.ok && r.password) setCred({ title: m.credReset, items: [{ email: member.email, password: r.password }] });
  };

  const del = async (member: Member) => {
    if (!(await confirm({ title: m.delConfirm, description: member.email, confirmLabel: m.del, cancelLabel: m.cancel, tone: 'danger' }))) return;
    setError('');
    setBusy(member.id);
    const result = await postJson({ action: 'member-delete', siteId, memberId: member.id });
    setBusy('');
    if (result.error) setError(result.error);
    else reload();
  };

  const startEdit = (member: Member) => { setEditId(member.id); setEditName(member.name); setEditEmail(member.email); };
  const saveEdit = async () => {
    setBusy(editId);
    const r = await postJson({ action: 'member-update', siteId, memberId: editId, name: editName, email: editEmail });
    setBusy('');
    if (r.ok) { setError(''); setEditId(''); reload(); } else { setError(r.error || 'Error'); }
  };

  const runImport = async () => {
    const rows = importText.split(/\r?\n/).map((line) => {
      const parts = line.split(/[,;\t]/);
      return { email: (parts[0] ?? '').trim(), name: parts.slice(1).join(' ').trim() };
    }).filter((r) => r.email);
    if (rows.length === 0) return;
    setBusy('import');
    const r = await postJson({ action: 'member-import', siteId, rows });
    setBusy('');
    if (r.ok && r.result) {
      setImportInfo(`${r.result.created} ${m.created} · ${r.result.skipped} ${m.skipped} · ${r.result.invalid} ${m.invalid}`);
      if (r.result.passwords.length) setCred({ title: m.credImport, items: r.result.passwords });
      setImportText(''); reload();
    }
  };

  const exportCsv = () => {
    const list = members ?? [];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['email,name,status,createdAt', ...list.map((mm) => [mm.email, mm.name, mm.status, new Date(mm.createdAt).toISOString()].map((c) => esc(String(c))).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `members-${siteId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const ql = q.trim().toLowerCase();
  const match = (mm: Member) => !ql || `${mm.name} ${mm.email}`.toLowerCase().includes(ql);
  const pending = (members ?? []).filter((mm) => mm.status === 'pending' && match(mm));
  const others = (members ?? []).filter((mm) => mm.status !== 'pending' && match(mm));

  const rowActions = (member: Member) => (
    <div className="flex flex-none items-center gap-1">
      <button type="button" title={m.edit} onClick={() => startEdit(member)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></button>
      <button type="button" title={m.resetPwd} onClick={() => resetPwd(member)} disabled={busy === member.id} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><KeyRound className="h-4 w-4" /></button>
      <button type="button" title={m.del} onClick={() => del(member)} disabled={busy === member.id} className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">{busy === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
    </div>
  );

  const editRow = (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center">
      <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={m.namePh} className="h-9 sm:flex-1" />
      <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder={m.emailPh} className="h-9 sm:flex-1" />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy === editId} onClick={saveEdit} className="gap-1.5">{busy === editId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {m.save}</Button>
        <Button size="sm" variant="outline" onClick={() => setEditId('')}>{m.cancel}</Button>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      {confirmDialog}
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
      {statusChange && (
        <div role="dialog" aria-modal="true" aria-labelledby="member-status-title" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <h3 id="member-status-title" className="font-semibold">{statusChange.status === 'rejected' ? t.reject : t.suspend}: {statusChange.member.name || statusChange.member.email}</h3>
            <label htmlFor="member-status-reason" className="mt-4 block text-sm font-medium">{t.reasonPrompt}</label>
            <textarea id="member-status-reason" autoFocus value={statusChange.reason} onChange={(e) => setStatusChange({ ...statusChange, reason: e.target.value })} rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary" />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusChange(null)}>{m.cancel}</Button>
              <Button variant="destructive" disabled={busy === statusChange.member.id} onClick={submitStatusChange}>{busy === statusChange.member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : statusChange.status === 'rejected' ? t.reject : t.suspend}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start flex-wrap sm:items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} className="h-10 pl-10" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setPanel(panel === 'add' ? null : 'add')}><UserPlus className="h-4 w-4" /> {m.add}</Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPanel(panel === 'import' ? null : 'import')}><Upload className="h-4 w-4" /> {m.import}</Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv}><Download className="h-4 w-4" /> {m.export}</Button>
      </div>

      {panel === 'add' && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={m.emailPh} className="h-10 sm:flex-1" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={m.namePh} className="h-10 sm:flex-1" />
          <Button className="gap-1.5" disabled={busy === 'add' || !email.trim()} onClick={addMember}>{busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {m.create}</Button>
        </div>
      )}

      {panel === 'import' && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{m.importHint}</p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} placeholder={`ann@mail.com, Ann\nbob@mail.com, Bob`}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
          <div className="flex items-center gap-3">
            <Button size="sm" className="gap-1.5" disabled={busy === 'import' || !importText.trim()} onClick={runImport}>{busy === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {m.importRun}</Button>
            {importInfo && <span className="text-xs text-muted-foreground">{importInfo}</span>}
          </div>
        </div>
      )}

      {cred && <Creds title={cred.title} items={cred.items} onClose={() => setCred(null)} m={m} />}

      {/* Pending requests */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-amber-500" /> {t.requestsTitle} {pending.length > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">{pending.length}</span>}</h3>
        {!members ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noRequests}</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((mm) => editId === mm.id ? <li key={mm.id}>{editRow}</li> : (
              <li key={mm.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{mm.name || t.noName}</p>
                  <p className="truncate text-xs text-muted-foreground">{mm.email}</p>
                </div>
                <Button size="sm" className="gap-1.5 bg-green-600 text-white hover:bg-green-700" disabled={busy === mm.id} onClick={() => act(mm.id, 'approved')}>
                  {busy === mm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.approve}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10" disabled={busy === mm.id} onClick={() => requestStatusChange(mm, 'rejected')}>
                  <X className="h-4 w-4" /> {t.reject}
                </Button>
                {rowActions(mm)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* All members */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> {t.membersTitle}</h3>
        {members && others.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMembers}</p>
        ) : (
          <ul className="space-y-2">
            {others.map((mm) => {
              if (editId === mm.id) return <li key={mm.id}>{editRow}</li>;
              const cls = STATUS_CLS[mm.status] ?? STATUS_CLS.approved;
              return (
                <li key={mm.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{mm.name || t.noName}</p>
                    <p className="truncate text-xs text-muted-foreground">{mm.email}</p>
                  </div>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{t.status[mm.status as keyof typeof t.status] ?? mm.status}</span>
                  {mm.status === 'approved' ? (
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10" disabled={busy === mm.id} onClick={() => requestStatusChange(mm, 'suspended')}>
                      <Ban className="h-4 w-4" /> {t.suspend}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy === mm.id} onClick={() => act(mm.id, 'approved')}>
                      {busy === mm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.restore}
                    </Button>
                  )}
                  {rowActions(mm)}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
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
    <section data-tour="courses">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4" /> {t.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t.desc}</p>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Input data-tour="course-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.courseTitle} className="h-10" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.courseDesc} rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button size="sm" data-tour="course-add" className="gap-1.5" disabled={busy} onClick={add}>
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
    <section data-tour="documents">
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


function AnnouncementsEditor({ siteId, announcements, reload }: { siteId: string; announcements: Announcement[] | null; reload: () => void }) {
  const t = dashDict(useLocale().locale).announcements;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState('');

  const add = async () => {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    await post({ action: 'announcement-create', siteId, title, body, pinned });
    setBusy(false); setTitle(''); setBody(''); setPinned(false); reload();
  };
  const del = async (id: string) => { setDelBusy(id); await post({ action: 'announcement-delete', siteId, announcementId: id }); setDelBusy(''); reload(); };

  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Megaphone className="h-4 w-4" /> {t.title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{t.desc}</p>
      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePh} className="h-10" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.bodyPh} rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-border" /> {t.pinned}
          </label>
          <Button size="sm" className="gap-1.5" disabled={busy} onClick={add}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t.add}
          </Button>
        </div>
      </div>
      {!announcements ? (
        <div className="mt-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : announcements.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              {a.pinned && <Megaphone className="h-4 w-4 flex-none text-primary" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title || '—'}</p>
                {a.body && <p className="truncate text-xs text-muted-foreground">{a.body}</p>}
              </div>
              <button type="button" onClick={() => del(a.id)} disabled={delBusy === a.id} aria-label={t.delete} className="flex-none rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                {delBusy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
