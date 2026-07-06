// Branded transactional email templates. Email-safe HTML (600px table layout,
// fully inlined styles, no external images — the logo is a CSS badge, so it
// renders in Gmail/Outlook/Apple Mail without loading remote assets) in the
// kit's visual identity: dark cinematic background, indigo #3c68d9 primary
// (= oklch(0.55 0.18 265)), cyan #22b0d0 accent glow, Russian copy.
// Dependency-free (no DB / no server-only) so templates are unit-testable.

import { SITE_NAME, APP_URL } from '@/lib/seo';

// Brand palette (hex twins of the oklch tokens in app/globals.css).
const C = {
  page: '#101117', // page backdrop (dark theme background)
  card: '#181a22', // glass card
  cardTop: '#1d2030', // gradient top of the card header
  border: '#2a2d3c',
  text: '#eceef4',
  muted: '#9aa1b5',
  faint: '#6b7186',
  primary: '#3c68d9',
  primaryDark: '#2f52ac',
  accent: '#22b0d0',
  codeBg: '#12141c',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = "'Inter',-apple-system,'Segoe UI',Roboto,Arial,sans-serif";

/** Contact addresses for the footer, derived from the sending domain. */
function contactEmails(): { info: string; support: string; sales: string } | null {
  const from = process.env.EMAIL_FROM || '';
  const domain = from.split('@')[1];
  if (!domain) return null;
  return { info: `info@${domain}`, support: `support@${domain}`, sales: `sales@${domain}` };
}

interface LayoutOpts {
  /** Hidden inbox-preview line. */
  preheader: string;
  heading: string;
  /** Greeting + explanation paragraphs (already-escaped HTML). */
  introHtml: string;
  /** The centered “hero” block: OTP code box or CTA button. */
  bodyHtml: string;
  /** Small print under the hero block (already-escaped HTML). */
  footnoteHtml: string;
}

/** Shared shell: dark page, glass card, gradient brand badge, contacts footer. */
function layout(o: LayoutOpts): string {
  const contacts = contactEmails();
  const year = new Date().getFullYear();
  const contactRow = contacts
    ? `<a href="mailto:${contacts.info}" style="color:${C.muted};text-decoration:none;">${contacts.info}</a>
       &nbsp;·&nbsp;<a href="mailto:${contacts.support}" style="color:${C.muted};text-decoration:none;">${contacts.support}</a>
       &nbsp;·&nbsp;<a href="mailto:${contacts.sales}" style="color:${C.muted};text-decoration:none;">${contacts.sales}</a>`
    : `<a href="${APP_URL}" style="color:${C.muted};text-decoration:none;">${APP_URL.replace(/^https?:\/\//, '')}</a>`;

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(o.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(o.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};">
<tr><td align="center" style="padding:40px 16px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- brand -->
    <tr><td align="center" style="padding:0 0 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="${C.primary}"
            style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,${C.primary} 0%,${C.accent} 120%);
                   box-shadow:0 6px 24px rgba(60,104,217,.45);font-size:17px;line-height:44px;color:#ffffff;">&#9654;</td>
        <td style="padding-left:12px;font-size:17px;font-weight:700;letter-spacing:.02em;color:${C.text};">${SITE_NAME}</td>
      </tr></table>
    </td></tr>

    <!-- card -->
    <tr><td style="border-radius:20px;border:1px solid ${C.border};background-color:${C.card};
                   background:linear-gradient(180deg,${C.cardTop} 0%,${C.card} 32%);overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td height="4" bgcolor="${C.primary}" style="background:linear-gradient(90deg,${C.primary} 0%,${C.accent} 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:40px 44px 36px;">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:${C.text};">${esc(o.heading)}</h1>
          <div style="font-size:14px;line-height:1.65;color:${C.muted};">${o.introHtml}</div>
          <div style="padding:26px 0 6px;text-align:center;">${o.bodyHtml}</div>
          <div style="margin-top:18px;font-size:12px;line-height:1.6;color:${C.faint};">${o.footnoteHtml}</div>
        </td></tr>
      </table>
    </td></tr>

    <!-- footer -->
    <tr><td align="center" style="padding:26px 20px 0;">
      <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${C.muted};">${contactRow}</p>
      <p style="margin:0;font-size:11px;line-height:1.6;color:${C.faint};">
        &copy; ${year} ${SITE_NAME} — кинематографичный конструктор сайтов.<br>
        Это автоматическое письмо, отправленное с <a href="${APP_URL}" style="color:${C.faint};">${APP_URL.replace(/^https?:\/\//, '')}</a>.
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

const greet = (name: string) => (name.trim() ? `Здравствуйте, <span style="color:${C.text};font-weight:600;">${esc(name.trim())}</span>!` : 'Здравствуйте!');

// ── Login OTP ───────────────────────────────────────────────────────────────

export const OTP_SUBJECT = `Код подтверждения входа — ${SITE_NAME}`;

export function renderLoginOtpEmail(opts: { name: string; code: string; ttlMinutes: number }): {
  subject: string;
  html: string;
  text: string;
} {
  const digits = opts.code
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;width:44px;padding:14px 0;margin:0 4px;border-radius:12px;border:1px solid ${C.border};background-color:${C.codeBg};font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:26px;font-weight:700;color:${C.text};">${d}</span>`,
    )
    .join('');

  const html = layout({
    preheader: `Ваш код входа: ${opts.code} (действует ${opts.ttlMinutes} мин)`,
    heading: 'Подтвердите вход',
    introHtml: `<p style="margin:0 0 8px;">${greet(opts.name)}</p>
<p style="margin:0;">Кто-то (надеемся, что вы) входит в ваш аккаунт <b style="color:${C.text};">${SITE_NAME}</b>.
Введите этот код на странице входа, чтобы продолжить:</p>`,
    bodyHtml: `<div>${digits}</div>
<p style="margin:14px 0 0;font-size:12px;color:${C.faint};">Код действует <b style="color:${C.muted};">${opts.ttlMinutes} минут</b> и сработает только один раз.</p>`,
    footnoteHtml: `Если это были не вы — просто проигнорируйте письмо: без кода войти невозможно. На всякий случай рекомендуем <a href="${APP_URL}/forgot-password" style="color:${C.accent};">сменить пароль</a>.`,
  });

  const text = [
    `Подтвердите вход — ${SITE_NAME}`,
    '',
    `Ваш код: ${opts.code}`,
    `Он действует ${opts.ttlMinutes} минут и сработает только один раз.`,
    '',
    `Если это были не вы, проигнорируйте письмо или смените пароль: ${APP_URL}/forgot-password`,
  ].join('\n');

  return { subject: OTP_SUBJECT, html, text };
}

// ── Password reset ──────────────────────────────────────────────────────────

export const RESET_SUBJECT = `Сброс пароля — ${SITE_NAME}`;

export function renderPasswordResetEmail(opts: { name: string; link: string; ttlMinutes: number }): {
  subject: string;
  html: string;
  text: string;
} {
  const html = layout({
    preheader: `Ссылка для сброса пароля (действует ${opts.ttlMinutes} мин)`,
    heading: 'Сброс пароля',
    introHtml: `<p style="margin:0 0 8px;">${greet(opts.name)}</p>
<p style="margin:0;">Мы получили запрос на сброс пароля вашего аккаунта <b style="color:${C.text};">${SITE_NAME}</b>.
Нажмите кнопку ниже, чтобы задать новый пароль:</p>`,
    bodyHtml: `<a href="${esc(opts.link)}"
      style="display:inline-block;padding:15px 40px;border-radius:14px;background-color:${C.primary};
             background:linear-gradient(135deg,${C.primary} 0%,${C.primaryDark} 100%);
             box-shadow:0 6px 24px rgba(60,104,217,.4);
             font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Задать новый пароль&nbsp;&rarr;</a>
<p style="margin:16px 0 0;font-size:12px;color:${C.faint};">Ссылка действует <b style="color:${C.muted};">${opts.ttlMinutes} минут</b> и сработает только один раз.</p>
<p style="margin:10px 0 0;font-size:11px;word-break:break-all;color:${C.faint};">Если кнопка не работает, откройте ссылку вручную:<br>
<a href="${esc(opts.link)}" style="color:${C.accent};">${esc(opts.link)}</a></p>`,
    footnoteHtml: `Если вы не запрашивали сброс — просто проигнорируйте это письмо, ваш пароль останется прежним.`,
  });

  const text = [
    `Сброс пароля — ${SITE_NAME}`,
    '',
    'Мы получили запрос на сброс пароля вашего аккаунта.',
    `Откройте ссылку, чтобы задать новый пароль (действует ${opts.ttlMinutes} минут, одноразовая):`,
    opts.link,
    '',
    'Если вы не запрашивали сброс, проигнорируйте это письмо.',
  ].join('\n');

  return { subject: RESET_SUBJECT, html, text };
}


// ── New member awaiting approval (to the site owner) ─────────────────────────

export function renderNewMemberEmail(opts: {
  ownerName: string;
  siteName: string;
  memberEmail: string;
  memberName: string;
  reviewUrl: string;
}): { subject: string; html: string; text: string } {
  const who = opts.memberName ? `${opts.memberName} (${opts.memberEmail})` : opts.memberEmail;
  const subject = `Новая заявка на вступление — ${opts.siteName}`;

  const html = layout({
    preheader: `${who} хочет присоединиться к «${opts.siteName}»`,
    heading: 'Новая заявка на вступление',
    introHtml: `<p style="margin:0 0 8px;">${greet(opts.ownerName)}</p>
<p style="margin:0;">Новый пользователь <b style="color:${C.text};">${esc(who)}</b> подал заявку на вступление в вашу организацию <b style="color:${C.text};">${esc(opts.siteName)}</b> и ожидает одобрения.</p>`,
    bodyHtml: `<a href="${esc(opts.reviewUrl)}"
      style="display:inline-block;padding:15px 40px;border-radius:14px;background-color:${C.primary};
             background:linear-gradient(135deg,${C.primary} 0%,${C.primaryDark} 100%);
             box-shadow:0 6px 24px rgba(60,104,217,.4);
             font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Рассмотреть заявку&nbsp;&rarr;</a>`,
    footnoteHtml: `Одобрить или отклонить заявку можно в настройках сайта → «Заявки на вступление».`,
  });

  const text = [
    `Новая заявка на вступление — ${opts.siteName}`,
    '',
    `${who} подал(а) заявку на вступление в вашу организацию «${opts.siteName}» и ожидает одобрения.`,
    '',
    `Рассмотреть: ${opts.reviewUrl}`,
  ].join('\n');

  return { subject, html, text };
}
