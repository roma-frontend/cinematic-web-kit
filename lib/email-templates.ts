// Branded transactional email templates. Email-safe HTML (600px table layout,
// fully inlined styles, no external images — the logo is a CSS badge, so it
// renders in Gmail/Outlook/Apple Mail without loading remote assets) in the
// kit's visual identity: dark cinematic background, indigo #3c68d9 primary
// (= oklch(0.55 0.18 265)), cyan #22b0d0 accent glow, Russian copy.
// Dependency-free (no DB / no server-only) so templates are unit-testable.

import { SITE_NAME, APP_URL, DEFAULT_LOCALE, contactEmails, type Locale } from '@/lib/seo';

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

// ── i18n ────────────────────────────────────────────────────────────────────
// Every user-facing string for the three transactional emails, per locale.
// RU is the exact original copy; EN is natural English; HY is Armenian script.
// Placeholders: {name} {code} {min} {site} {siteName} {who} {link} — filled via
// fmt() below. `{site}`/`{whoB}`/`{siteB}`/`{minB}` receive already-built HTML.
interface EmailI18n {
  greeting: string;
  greetingNamed: string; // {name}
  minutes: string; // plural word used inside the bolded duration
  footerTagline: string;
  footerAuto: string;
  otp: {
    subject: string; // {siteName}
    preheader: string; // {code} {min}
    heading: string;
    intro: string; // {site}
    note: string; // {minB}
    footnote: string; // {link}
    changePwdLabel: string;
    textTitle: string; // {siteName}
    textCode: string; // {code}
    textNote: string; // {min}
    textFootnote: string; // {link}
  };
  reset: {
    subject: string; // {siteName}
    preheader: string; // {min}
    heading: string;
    intro: string; // {site}
    buttonLabel: string;
    note: string; // {minB}
    fallbackNote: string;
    footnote: string;
    textTitle: string; // {siteName}
    textIntro: string;
    textNote: string; // {min}
    textFootnote: string;
  };
  member: {
    subject: string; // {siteName}
    preheader: string; // {who} {siteName}
    heading: string;
    intro: string; // {whoB} {siteB}
    buttonLabel: string;
    footnote: string;
    textTitle: string; // {siteName}
    textIntro: string; // {who} {siteName}
    textReview: string; // {link}
  };
}

const EMAIL_I18N: Record<Locale, EmailI18n> = {
  ru: {
    greeting: 'Здравствуйте!',
    greetingNamed: 'Здравствуйте, {name}!',
    minutes: 'минут',
    footerTagline: 'кинематографичный конструктор сайтов',
    footerAuto: 'Это автоматическое письмо, отправленное с',
    otp: {
      subject: 'Код подтверждения входа — {siteName}',
      preheader: 'Ваш код входа: {code} (действует {min} мин)',
      heading: 'Подтвердите вход',
      intro: 'Кто-то (надеемся, что вы) входит в ваш аккаунт {site}. Введите этот код на странице входа, чтобы продолжить:',
      note: 'Код действует {minB} и сработает только один раз.',
      footnote: 'Если это были не вы — просто проигнорируйте письмо: без кода войти невозможно. На всякий случай рекомендуем {link}.',
      changePwdLabel: 'сменить пароль',
      textTitle: 'Подтвердите вход — {siteName}',
      textCode: 'Ваш код: {code}',
      textNote: 'Он действует {min} минут и сработает только один раз.',
      textFootnote: 'Если это были не вы, проигнорируйте письмо или смените пароль: {link}',
    },
    reset: {
      subject: 'Сброс пароля — {siteName}',
      preheader: 'Ссылка для сброса пароля (действует {min} мин)',
      heading: 'Сброс пароля',
      intro: 'Мы получили запрос на сброс пароля вашего аккаунта {site}. Нажмите кнопку ниже, чтобы задать новый пароль:',
      buttonLabel: 'Задать новый пароль&nbsp;&rarr;',
      note: 'Ссылка действует {minB} и сработает только один раз.',
      fallbackNote: 'Если кнопка не работает, откройте ссылку вручную:',
      footnote: 'Если вы не запрашивали сброс — просто проигнорируйте это письмо, ваш пароль останется прежним.',
      textTitle: 'Сброс пароля — {siteName}',
      textIntro: 'Мы получили запрос на сброс пароля вашего аккаунта.',
      textNote: 'Откройте ссылку, чтобы задать новый пароль (действует {min} минут, одноразовая):',
      textFootnote: 'Если вы не запрашивали сброс, проигнорируйте это письмо.',
    },
    member: {
      subject: 'Новая заявка на вступление — {siteName}',
      preheader: '{who} хочет присоединиться к «{siteName}»',
      heading: 'Новая заявка на вступление',
      intro: 'Новый пользователь {whoB} подал заявку на вступление в вашу организацию {siteB} и ожидает одобрения.',
      buttonLabel: 'Рассмотреть заявку&nbsp;&rarr;',
      footnote: 'Одобрить или отклонить заявку можно в настройках сайта → «Заявки на вступление».',
      textTitle: 'Новая заявка на вступление — {siteName}',
      textIntro: '{who} подал(а) заявку на вступление в вашу организацию «{siteName}» и ожидает одобрения.',
      textReview: 'Рассмотреть: {link}',
    },
  },
  en: {
    greeting: 'Hello!',
    greetingNamed: 'Hello, {name}!',
    minutes: 'minutes',
    footerTagline: 'the cinematic website builder',
    footerAuto: 'This is an automated message sent from',
    otp: {
      subject: 'Your sign-in verification code — {siteName}',
      preheader: 'Your sign-in code: {code} (valid for {min} min)',
      heading: 'Confirm your sign-in',
      intro: 'Someone (hopefully you) is signing in to your {site} account. Enter this code on the sign-in page to continue:',
      note: 'The code is valid for {minB} and works only once.',
      footnote: "If this wasn't you, simply ignore this email — signing in is impossible without the code. To be safe, we recommend {link}.",
      changePwdLabel: 'changing your password',
      textTitle: 'Confirm your sign-in — {siteName}',
      textCode: 'Your code: {code}',
      textNote: 'It is valid for {min} minutes and works only once.',
      textFootnote: "If this wasn't you, ignore this email or change your password: {link}",
    },
    reset: {
      subject: 'Password reset — {siteName}',
      preheader: 'Password reset link (valid for {min} min)',
      heading: 'Password reset',
      intro: 'We received a request to reset the password for your {site} account. Click the button below to set a new password:',
      buttonLabel: 'Set a new password&nbsp;&rarr;',
      note: 'The link is valid for {minB} and works only once.',
      fallbackNote: "If the button doesn't work, open the link manually:",
      footnote: "If you didn't request a reset, simply ignore this email — your password will stay the same.",
      textTitle: 'Password reset — {siteName}',
      textIntro: 'We received a request to reset your account password.',
      textNote: 'Open the link to set a new password (valid for {min} minutes, single-use):',
      textFootnote: "If you didn't request a reset, ignore this email.",
    },
    member: {
      subject: 'New membership request — {siteName}',
      preheader: '{who} wants to join "{siteName}"',
      heading: 'New membership request',
      intro: 'A new user {whoB} has requested to join your organization {siteB} and is awaiting approval.',
      buttonLabel: 'Review request&nbsp;&rarr;',
      footnote: 'You can approve or reject the request in the site settings → "Membership requests".',
      textTitle: 'New membership request — {siteName}',
      textIntro: '{who} has requested to join your organization "{siteName}" and is awaiting approval.',
      textReview: 'Review: {link}',
    },
  },
  hy: {
    greeting: 'Բարև Ձեզ!',
    greetingNamed: 'Բարև Ձեզ, {name}!',
    minutes: 'րոպե',
    footerTagline: 'կինեմատոգրաֆիկ կայքերի կառուցիչ',
    footerAuto: 'Սա ավտոմատ նամակ է, ուղարկված',
    otp: {
      subject: 'Մուտքի հաստատման կոդ — {siteName}',
      preheader: 'Ձեր մուտքի կոդը՝ {code} (գործում է {min} րոպե)',
      heading: 'Հաստատեք մուտքը',
      intro: 'Ինչ-որ մեկը (հուսով ենք՝ Դուք) մուտք է գործում Ձեր {site} հաշիվ։ Շարունակելու համար մուտքագրեք այս կոդը մուտքի էջում.',
      note: 'Կոդը գործում է {minB} և կաշխատի միայն մեկ անգամ։',
      footnote: 'Եթե դա Դուք չէիք, պարզապես անտեսեք նամակը. առանց կոդի մուտք գործել հնարավոր չէ։ Ամեն դեպքում խորհուրդ ենք տալիս {link}։',
      changePwdLabel: 'փոխել գաղտնաբառը',
      textTitle: 'Հաստատեք մուտքը — {siteName}',
      textCode: 'Ձեր կոդը՝ {code}',
      textNote: 'Այն գործում է {min} րոպե և կաշխատի միայն մեկ անգամ։',
      textFootnote: 'Եթե դա Դուք չէիք, անտեսեք նամակը կամ փոխեք գաղտնաբառը՝ {link}',
    },
    reset: {
      subject: 'Գաղտնաբառի վերականգնում — {siteName}',
      preheader: 'Գաղտնաբառի վերականգնման հղում (գործում է {min} րոպե)',
      heading: 'Գաղտնաբառի վերականգնում',
      intro: 'Մենք ստացել ենք Ձեր {site} հաշվի գաղտնաբառը վերականգնելու հարցում։ Նոր գաղտնաբառ սահմանելու համար սեղմեք ստորև կոճակը.',
      buttonLabel: 'Սահմանել նոր գաղտնաբառ&nbsp;&rarr;',
      note: 'Հղումը գործում է {minB} և կաշխատի միայն մեկ անգամ։',
      fallbackNote: 'Եթե կոճակը չի աշխատում, բացեք հղումը ձեռքով.',
      footnote: 'Եթե Դուք չեք պահանջել վերականգնում, պարզապես անտեսեք այս նամակը. Ձեր գաղտնաբառը կմնա անփոփոխ։',
      textTitle: 'Գաղտնաբառի վերականգնում — {siteName}',
      textIntro: 'Մենք ստացել ենք Ձեր հաշվի գաղտնաբառը վերականգնելու հարցում։',
      textNote: 'Բացեք հղումը նոր գաղտնաբառ սահմանելու համար (գործում է {min} րոպե, մեկանգամյա).',
      textFootnote: 'Եթե Դուք չեք պահանջել վերականգնում, անտեսեք այս նամակը։',
    },
    member: {
      subject: 'Անդամակցության նոր հայտ — {siteName}',
      preheader: '{who}-ը ցանկանում է միանալ «{siteName}»-ին',
      heading: 'Անդամակցության նոր հայտ',
      intro: 'Նոր օգտատեր {whoB}-ը հայտ է ներկայացրել Ձեր {siteB} կազմակերպությանը միանալու համար և սպասում է հաստատման։',
      buttonLabel: 'Դիտարկել հայտը&nbsp;&rarr;',
      footnote: 'Հայտը կարող եք հաստատել կամ մերժել կայքի կարգավորումներում → «Անդամակցության հայտեր»։',
      textTitle: 'Անդամակցության նոր հայտ — {siteName}',
      textIntro: '{who}-ը հայտ է ներկայացրել Ձեր «{siteName}» կազմակերպությանը միանալու համար և սպասում է հաստատման։',
      textReview: 'Դիտարկել՝ {link}',
    },
  },
};

/** Fill {placeholder} tokens. Unknown tokens are left intact. */
function fmt(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Contact addresses for the footer, derived from the connected domain
 *  (see lib/seo.ts → contactEmails). Null until a real domain is configured. */

interface LayoutOpts {
  locale: Locale;
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
  const S = EMAIL_I18N[o.locale];
  const contactRow = contacts
    ? `<a href="mailto:${contacts.info}" style="color:${C.muted};text-decoration:none;">${contacts.info}</a>
       &nbsp;·&nbsp;<a href="mailto:${contacts.support}" style="color:${C.muted};text-decoration:none;">${contacts.support}</a>
       &nbsp;·&nbsp;<a href="mailto:${contacts.sales}" style="color:${C.muted};text-decoration:none;">${contacts.sales}</a>`
    : `<a href="${APP_URL}" style="color:${C.muted};text-decoration:none;">${APP_URL.replace(/^https?:\/\//, '')}</a>`;

  return `<!doctype html>
<html lang="${o.locale}">
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
        &copy; ${year} ${SITE_NAME} — ${esc(S.footerTagline)}.<br>
        ${esc(S.footerAuto)} <a href="${APP_URL}" style="color:${C.faint};">${APP_URL.replace(/^https?:\/\//, '')}</a>.
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

const greet = (name: string, locale: Locale) => {
  const S = EMAIL_I18N[locale];
  const n = name.trim();
  return n
    ? fmt(S.greetingNamed, { name: `<span style="color:${C.text};font-weight:600;">${esc(n)}</span>` })
    : S.greeting;
};

// ── Login OTP ───────────────────────────────────────────────────────────────

export const OTP_SUBJECT = fmt(EMAIL_I18N[DEFAULT_LOCALE].otp.subject, { siteName: SITE_NAME });

export function renderLoginOtpEmail(
  opts: { name: string; code: string; ttlMinutes: number; brand?: string },
  locale: Locale = DEFAULT_LOCALE,
): {
  subject: string;
  html: string;
  text: string;
} {
  const S = EMAIL_I18N[locale].otp;
  // Tenant sites brand the visible message with their own name; the platform
  // (mailer) name stays in the footer/layout. Falls back to SITE_NAME.
  const site = opts.brand?.trim() || SITE_NAME;
  const siteB = `<b style="color:${C.text};">${esc(site)}</b>`;
  const minB = `<b style="color:${C.muted};">${opts.ttlMinutes} ${EMAIL_I18N[locale].minutes}</b>`;
  const changePwd = `<a href="${APP_URL}/forgot-password" style="color:${C.accent};">${esc(S.changePwdLabel)}</a>`;

  const digits = opts.code
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;width:44px;padding:14px 0;margin:0 4px;border-radius:12px;border:1px solid ${C.border};background-color:${C.codeBg};font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:26px;font-weight:700;color:${C.text};">${d}</span>`,
    )
    .join('');

  const html = layout({
    locale,
    preheader: fmt(S.preheader, { code: opts.code, min: opts.ttlMinutes }),
    heading: S.heading,
    introHtml: `<p style="margin:0 0 8px;">${greet(opts.name, locale)}</p>
<p style="margin:0;">${fmt(S.intro, { site: siteB })}</p>`,
    bodyHtml: `<div>${digits}</div>
<p style="margin:14px 0 0;font-size:12px;color:${C.faint};">${fmt(S.note, { minB })}</p>`,
    footnoteHtml: fmt(S.footnote, { link: changePwd }),
  });

  const text = [
    fmt(S.textTitle, { siteName: site }),
    '',
    fmt(S.textCode, { code: opts.code }),
    fmt(S.textNote, { min: opts.ttlMinutes }),
    '',
    fmt(S.textFootnote, { link: `${APP_URL}/forgot-password` }),
  ].join('\n');

  return { subject: fmt(S.subject, { siteName: site }), html, text };
}

// ── Password reset ──────────────────────────────────────────────────────────

export const RESET_SUBJECT = fmt(EMAIL_I18N[DEFAULT_LOCALE].reset.subject, { siteName: SITE_NAME });

export function renderPasswordResetEmail(
  opts: { name: string; link: string; ttlMinutes: number; brand?: string },
  locale: Locale = DEFAULT_LOCALE,
): {
  subject: string;
  html: string;
  text: string;
} {
  const S = EMAIL_I18N[locale].reset;
  const site = opts.brand?.trim() || SITE_NAME;
  const siteB = `<b style="color:${C.text};">${esc(site)}</b>`;
  const minB = `<b style="color:${C.muted};">${opts.ttlMinutes} ${EMAIL_I18N[locale].minutes}</b>`;

  const html = layout({
    locale,
    preheader: fmt(S.preheader, { min: opts.ttlMinutes }),
    heading: S.heading,
    introHtml: `<p style="margin:0 0 8px;">${greet(opts.name, locale)}</p>
<p style="margin:0;">${fmt(S.intro, { site: siteB })}</p>`,
    bodyHtml: `<a href="${esc(opts.link)}"
      style="display:inline-block;padding:15px 40px;border-radius:14px;background-color:${C.primary};
             background:linear-gradient(135deg,${C.primary} 0%,${C.primaryDark} 100%);
             box-shadow:0 6px 24px rgba(60,104,217,.4);
             font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${S.buttonLabel}</a>
<p style="margin:16px 0 0;font-size:12px;color:${C.faint};">${fmt(S.note, { minB })}</p>
<p style="margin:10px 0 0;font-size:11px;word-break:break-all;color:${C.faint};">${esc(S.fallbackNote)}<br>
<a href="${esc(opts.link)}" style="color:${C.accent};">${esc(opts.link)}</a></p>`,
    footnoteHtml: esc(S.footnote),
  });

  const text = [
    fmt(S.textTitle, { siteName: site }),
    '',
    S.textIntro,
    fmt(S.textNote, { min: opts.ttlMinutes }),
    opts.link,
    '',
    S.textFootnote,
  ].join('\n');

  return { subject: fmt(S.subject, { siteName: site }), html, text };
}


// ── New member awaiting approval (to the site owner) ─────────────────────────

export function renderNewMemberEmail(
  opts: {
    ownerName: string;
    siteName: string;
    memberEmail: string;
    memberName: string;
    reviewUrl: string;
  },
  locale: Locale = DEFAULT_LOCALE,
): { subject: string; html: string; text: string } {
  const S = EMAIL_I18N[locale].member;
  const who = opts.memberName ? `${opts.memberName} (${opts.memberEmail})` : opts.memberEmail;
  const whoB = `<b style="color:${C.text};">${esc(who)}</b>`;
  const siteB = `<b style="color:${C.text};">${esc(opts.siteName)}</b>`;

  const html = layout({
    locale,
    preheader: fmt(S.preheader, { who, siteName: opts.siteName }),
    heading: S.heading,
    introHtml: `<p style="margin:0 0 8px;">${greet(opts.ownerName, locale)}</p>
<p style="margin:0;">${fmt(S.intro, { whoB, siteB })}</p>`,
    bodyHtml: `<a href="${esc(opts.reviewUrl)}"
      style="display:inline-block;padding:15px 40px;border-radius:14px;background-color:${C.primary};
             background:linear-gradient(135deg,${C.primary} 0%,${C.primaryDark} 100%);
             box-shadow:0 6px 24px rgba(60,104,217,.4);
             font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${S.buttonLabel}</a>`,
    footnoteHtml: esc(S.footnote),
  });

  const text = [
    fmt(S.textTitle, { siteName: opts.siteName }),
    '',
    fmt(S.textIntro, { who, siteName: opts.siteName }),
    '',
    fmt(S.textReview, { link: opts.reviewUrl }),
  ].join('\n');

  return { subject: fmt(S.subject, { siteName: opts.siteName }), html, text };
}
