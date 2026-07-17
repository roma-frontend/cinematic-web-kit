'use client';

// Organization invite panel: a shareable QR code + link that lands people on
// this org's registration page. Next to the code, a localized explainer of how
// joining works — always naming the organization so newcomers don't get lost.
// The QR PNG is generated on the server (no runtime third-party calls) and
// passed in as a data URL.

import { useState } from 'react';
import { Copy, Check, Download, ExternalLink, QrCode, UserPlus, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { copyToClipboard } from '@/lib/clipboard';

type Dict = {
  title: string; subtitle: string;
  scanHint: string; linkLabel: string;
  copy: string; copied: string; download: string; open: string;
  how: string;
  s1: string; s2: string; s3Approval: string; s3Instant: string;
};

const DICT: Record<string, (org: string) => Dict> = {
  ru: (org) => ({
    title: 'Пригласить в организацию',
    subtitle: `Поделитесь QR-кодом или ссылкой — по ним присоединяются к «${org}».`,
    scanHint: `Наведите камеру телефона на код, чтобы присоединиться к «${org}»`,
    linkLabel: 'Ссылка-приглашение',
    copy: 'Копировать ссылку', copied: 'Скопировано', download: 'Скачать QR', open: 'Открыть',
    how: 'Как происходит присоединение',
    s1: `Человек сканирует QR (или открывает ссылку) и попадает на страницу регистрации «${org}».`,
    s2: `Регистрируется по email или через Google/Apple/Telegram — создаётся аккаунт участника «${org}».`,
    s3Approval: `Владелец «${org}» подтверждает заявку — после одобрения открывается доступ к материалам организации.`,
    s3Instant: `Доступ к материалам «${org}» открывается сразу после регистрации — подтверждение не требуется.`,
  }),
  en: (org) => ({
    title: 'Invite to the organization',
    subtitle: `Share the QR code or link — people use it to join “${org}”.`,
    scanHint: `Point your phone camera at the code to join “${org}”`,
    linkLabel: 'Invite link',
    copy: 'Copy link', copied: 'Copied', download: 'Download QR', open: 'Open',
    how: 'How joining works',
    s1: `The person scans the QR (or opens the link) and lands on the “${org}” registration page.`,
    s2: `They sign up with email or Google/Apple/Telegram — a member account for “${org}” is created.`,
    s3Approval: `The owner of “${org}” approves the request — once approved, access to the organization's content opens up.`,
    s3Instant: `Access to “${org}” content opens right after sign-up — no approval needed.`,
  }),
  hy: (org) => ({
    title: 'Հրավիրել կազմակերպություն',
    subtitle: `Կիսվեք QR-կոդով կամ հղումով — դրանցով միանում են «${org}»-ին։`,
    scanHint: `Ուղղեք հեռախոսի տեսախցիկը կոդին՝ «${org}»-ին միանալու համար`,
    linkLabel: 'Հրավերի հղում',
    copy: 'Պատճենել հղումը', copied: 'Պատճենված', download: 'Ներբեռնել QR', open: 'Բացել',
    how: 'Ինչպես է տեղի ունենում միանալը',
    s1: `Անձը սկանավորում է QR-ը (կամ բացում հղումը) և հայտնվում «${org}»-ի գրանցման էջում։`,
    s2: `Գրանցվում է email-ով կամ Google/Apple/Telegram-ով — ստեղծվում է «${org}»-ի մասնակցի հաշիվ։`,
    s3Approval: `«${org}»-ի սեփականատերը հաստատում է հայտը — հաստատումից հետո բացվում է հասանելիությունը նյութերին։`,
    s3Instant: `«${org}»-ի նյութերի հասանելիությունը բացվում է գրանցումից անմիջապես հետո՝ առանց հաստատման։`,
  }),
};

export function OrgInviteQr({
  orgName, slug, joinUrl, qrDataUrl, memberApproval,
}: {
  orgName: string; slug: string; joinUrl: string; qrDataUrl: string; memberApproval: boolean;
}) {
  const locale = useLocale().locale as keyof typeof DICT;
  const t = (DICT[locale] ?? DICT.en)(orgName);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const success = await copyToClipboard(joinUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const steps = [
    { icon: ScanLine, text: t.s1 },
    { icon: UserPlus, text: t.s2 },
    { icon: memberApproval ? ShieldCheck : Sparkles, text: memberApproval ? t.s3Approval : t.s3Instant },
  ];

  return (
    <section id="invite" className="rounded-2xl border border-border/60 bg-card/50 p-6 scroll-mt-20">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold tracking-tight">{t.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
        {/* QR + actions */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR — ${orgName}`} width={208} height={208} className="h-52 w-52 rounded-lg" />
          </div>
          <p className="max-w-52 text-center text-xs text-muted-foreground">{t.scanHint}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t.copied : t.copy}
            </Button>
            <a href={qrDataUrl} download={`join-${slug}.png`}>
              <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-3.5 w-3.5" /> {t.download}</Button>
            </a>
            <a href={joinUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> {t.open}</Button>
            </a>
          </div>
        </div>

        {/* How-it-works + link */}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t.how}</p>
          <ol className="mt-3 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                <span className="flex items-start gap-2 text-sm text-muted-foreground">
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  {s.text}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-5">
            <p className="text-xs font-medium text-muted-foreground">{t.linkLabel}</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">{joinUrl}</code>
              <Button size="icon" variant="ghost" onClick={copy} aria-label={t.copy} title={t.copy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
