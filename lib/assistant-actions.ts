import 'server-only';
import { createSite, publishSite, getManageableSite } from '@/lib/sites';
import { createSiteUser } from '@/lib/site-auth';
import { recordAudit } from '@/lib/audit';
import { type Locale } from '@/lib/seo';
import type { AssistantRole } from '@/lib/assistant-routes';
import {
  type AgentAction,
  type ActionResult,
  canProposeAction,
} from '@/lib/assistant-action-tags';

export {
  type AgentAction,
  type PendingAction,
  type ActionResult,
  actionRoles,
  canProposeAction,
  parseActionTag,
  stripActionTags,
  summarizeAction,
} from '@/lib/assistant-action-tags';

// ── Localised copy for action outcomes ───────────────────────────────────────

function actionStrings(locale: Locale) {
  if (locale === 'ru') {
    return {
      roleDenied: 'Действие недоступно для этой роли.',
      siteNotFound: 'Сайт не найден или недоступен.',
      emailTaken: 'Этот email уже участник сайта.',
      createSuccess: (name: string, slug: string) => `Создан «${name}» по адресу /s/${slug}.`,
      publishSuccess: (name: string) => `Опубликован «${name}».`,
      inviteSuccess: (email: string, name: string) => `${email} приглашён на «${name}».`,
      unknownError: (msg: string) => `Не удалось выполнить действие: ${msg}`,
    };
  }
  if (locale === 'hy') {
    return {
      roleDenied: 'Այս գործողությունը թույլատրված չէ այդ դերին։',
      siteNotFound: 'Կայքը չի գտնվել կամ հասանելի չէ։',
      emailTaken: 'Այս email-ն արդեն կայքի անդամ է։',
      createSuccess: (name: string, slug: string) => `Ստեղծվեց «${name}» /s/${slug} հասցեում։`,
      publishSuccess: (name: string) => `Հրապարակվեց «${name}»։`,
      inviteSuccess: (email: string, name: string) => `${email}-ը հրավիրվեց «${name}»։`,
      unknownError: (msg: string) => `Չհաջողվեց կատարել գործողությունը՝ ${msg}`,
    };
  }
  return {
    roleDenied: 'Action not allowed for this role.',
    siteNotFound: 'Site not found or not manageable.',
    emailTaken: 'This email is already a member of the site.',
    createSuccess: (name: string, slug: string) => `Created “${name}” at /s/${slug}.`,
    publishSuccess: (name: string) => `Published “${name}”.`,
    inviteSuccess: (email: string, name: string) => `Invited ${email} to “${name}”.`,
    unknownError: (msg: string) => `Could not perform action: ${msg}`,
  };
}

// ── Mutation layer (server-only, gated, audited) ─────────────────────────────

export function performAction(
  actor: { id: string; email: string; role: string },
  action: AgentAction,
  locale: Locale = 'en',
): ActionResult {
  const strings = actionStrings(locale);
  const role: AssistantRole = actor.role === 'superadmin' || actor.role === 'admin' ? actor.role : 'customer';
  if (!canProposeAction(role, action.kind)) {
    return { ok: false, message: strings.roleDenied };
  }

  try {
    switch (action.kind) {
      case 'create_site': {
        const site = createSite(actor.id, action.name, action.locale ?? locale);
        recordAudit(actor, 'assistant.create_site', site.id, `name=${site.name}; slug=${site.slug}`);
        return {
          ok: true,
          message: strings.createSuccess(site.name, site.slug),
          redirect: `/dashboard/sites`,
        };
      }
      case 'publish_site': {
        const site = getManageableSite(actor, action.siteId);
        if (!site) return { ok: false, message: strings.siteNotFound };
        publishSite(site);
        recordAudit(actor, 'assistant.publish_site', site.id, `name=${site.name}`);
        return { ok: true, message: strings.publishSuccess(site.name), redirect: `/s/${site.slug}` };
      }
      case 'invite_site_user': {
        const site = getManageableSite(actor, action.siteId);
        if (!site) return { ok: false, message: strings.siteNotFound };
        const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10).toUpperCase();
        const user = createSiteUser(site.id, action.email, tempPassword, action.name || action.email.split('@')[0], 'approved');
        recordAudit(actor, 'assistant.invite_site_user', site.id, `email=${user.email}; siteUserId=${user.id}`);
        return {
          ok: true,
          message: strings.inviteSuccess(user.email, site.name),
          redirect: `/dashboard/sites`,
        };
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'EMAIL_TAKEN') return { ok: false, message: strings.emailTaken };
    return { ok: false, message: strings.unknownError(message) };
  }
}
