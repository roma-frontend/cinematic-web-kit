// Localized strings for the billing surfaces: pricing page, checkout, result
// pages, user billing page and the superadmin billing dashboard. Same pattern
// as the rest of the app (ru source, en/hy translations, ru fallback).
import type { Locale } from '@/lib/seo';
import type { PlanId, FeatureKey } from '@/lib/billing/plans';

export interface BillingDict {
  pricing: {
    title: string;
    subtitle: string;
    monthly: string;
    yearly: string;
    save: string; // "save {n}%"
    perMonth: string;
    perYear: string;
    billedYearly: string; // "{price}/yr billed once"
    choose: string;
    current: string;
    popular: string;
    contact: string;
  };
  planName: Record<PlanId, string>;
  planTagline: Record<PlanId, string>;
  feature: Record<FeatureKey, string>;
  limits: { sites: string; sitesUnlimited: string; ai: string; aiNone: string };
  checkout: {
    title: string;
    summary: string;
    plan: string;
    interval: string;
    total: string;
    pay: string;
    securedBy: string;
    manualNote: string;
    confirmManual: string;
    back: string;
  };
  result: {
    successTitle: string;
    successBody: string;
    cancelTitle: string;
    cancelBody: string;
    goDashboard: string;
    goBilling: string;
    retry: string;
  };
  mine: {
    title: string;
    subtitle: string;
    noSub: string;
    seePlans: string;
    status: string;
    plan: string;
    renews: string;
    endsOn: string;
    manage: string;
    cancel: string;
    cancelAtEnd: string;
    resume: string;
    invoices: string;
    invoiceNo: string;
    date: string;
    amount: string;
    download: string;
    empty: string;
  };
  admin: {
    title: string;
    subtitle: string;
    mrr: string;
    arr: string;
    active: string;
    revenue30: string;
    totalRevenue: string;
    canceled: string;
    pastDue: string;
    byPlan: string;
    subscriptions: string;
    payments: string;
    export: string;
    grant: string;
    grantHint: string;
    user: string;
    provider: string;
  };
  status: Record<string, string>;
  interval: { month: string; year: string };
}

const ru: BillingDict = {
  pricing: {
    title: 'Тарифы',
    subtitle: 'Выберите план. Весь конструктор без ограничений — на Studio.',
    monthly: 'Помесячно',
    yearly: 'Ежегодно',
    save: 'экономия {n}%',
    perMonth: '/мес',
    perYear: '/год',
    billedYearly: '{price} — один платёж в год',
    choose: 'Выбрать',
    current: 'Текущий план',
    popular: 'Популярный',
    contact: 'Связаться',
  },
  planName: { starter: 'Starter', pro: 'Pro', studio: 'Studio' },
  planTagline: {
    starter: 'Для первого сайта',
    pro: 'Для растущих проектов',
    studio: 'Максимум для профи',
  },
  feature: {
    'sites.publish': 'Публикация сайта',
    'sites.customDomain': 'Свой домен',
    'sites.members': 'Участники и кабинеты',
    'sites.removeBranding': 'Без брендинга платформы',
    'builder.advancedCss': 'Продвинутые CSS-свойства',
    'builder.animation': 'Движок анимаций',
    'builder.hoverStates': 'Hover-состояния',
    'builder.customCss': 'Произвольный CSS',
    'builder.effects': '19 эффектов в один клик',
    'builder.copyPasteStyle': 'Копирование стилей',
    'ai.generate': 'AI-генерация видео и страниц',
    'support.priority': 'Приоритетная поддержка',
    'export.pdf': 'PDF-инвойсы и экспорт',
  },
  limits: {
    sites: '{n} сайтов',
    sitesUnlimited: 'Неограниченно сайтов',
    ai: '{n} AI-генераций/мес',
    aiNone: 'Без AI-генераций',
  },
  checkout: {
    title: 'Оформление',
    summary: 'Ваш заказ',
    plan: 'План',
    interval: 'Период',
    total: 'Итого',
    pay: 'Перейти к оплате',
    securedBy: 'Оплата защищена Stripe',
    manualNote: 'Платёжный провайдер не настроен — подписка будет оформлена вручную (тестовый режим).',
    confirmManual: 'Подтвердить подписку',
    back: 'Назад к тарифам',
  },
  result: {
    successTitle: 'Оплата прошла успешно',
    successBody: 'Спасибо! Ваша подписка активна. Все возможности уже доступны.',
    cancelTitle: 'Оплата отменена',
    cancelBody: 'Оплата не завершена. Вы можете попробовать снова в любой момент.',
    goDashboard: 'В панель',
    goBilling: 'Моя подписка',
    retry: 'Вернуться к тарифам',
  },
  mine: {
    title: 'Подписка',
    subtitle: 'Ваш текущий план, продление и счета',
    noSub: 'У вас пока нет активной подписки.',
    seePlans: 'Посмотреть тарифы',
    status: 'Статус',
    plan: 'План',
    renews: 'Продлевается',
    endsOn: 'Действует до',
    manage: 'Управлять оплатой',
    cancel: 'Отменить подписку',
    cancelAtEnd: 'Отменится в конце периода',
    resume: 'Возобновить',
    invoices: 'Счета',
    invoiceNo: 'Счёт №',
    date: 'Дата',
    amount: 'Сумма',
    download: 'Скачать PDF',
    empty: 'Счетов пока нет',
  },
  admin: {
    title: 'Платежи',
    subtitle: 'Подписки, выручка и метрики',
    mrr: 'MRR',
    arr: 'ARR',
    active: 'Активных подписок',
    revenue30: 'Выручка за 30 дней',
    totalRevenue: 'Всего выручка',
    canceled: 'Отменённых',
    pastDue: 'Просрочено',
    byPlan: 'По планам',
    subscriptions: 'Подписки',
    payments: 'Платежи',
    export: 'Экспорт',
    grant: 'Выдать план вручную',
    grantHint: 'Активирует подписку без оплаты (тест/промо).',
    user: 'Пользователь',
    provider: 'Провайдер',
  },
  status: {
    active: 'активна',
    trialing: 'пробный период',
    past_due: 'просрочена',
    canceled: 'отменена',
    incomplete: 'не завершена',
    paid: 'оплачен',
    failed: 'ошибка',
    refunded: 'возврат',
    pending: 'ожидание',
  },
  interval: { month: 'Месяц', year: 'Год' },
};

const en: BillingDict = {
  pricing: {
    title: 'Pricing',
    subtitle: 'Pick a plan. The full builder, unlimited, lives on Studio.',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: 'save {n}%',
    perMonth: '/mo',
    perYear: '/yr',
    billedYearly: '{price} billed once a year',
    choose: 'Choose',
    current: 'Current plan',
    popular: 'Popular',
    contact: 'Contact',
  },
  planName: { starter: 'Starter', pro: 'Pro', studio: 'Studio' },
  planTagline: {
    starter: 'For your first site',
    pro: 'For growing projects',
    studio: 'Everything for pros',
  },
  feature: {
    'sites.publish': 'Publish your site',
    'sites.customDomain': 'Custom domain',
    'sites.members': 'Members & cabinets',
    'sites.removeBranding': 'Remove platform branding',
    'builder.advancedCss': 'Advanced CSS properties',
    'builder.animation': 'Animation engine',
    'builder.hoverStates': 'Hover states',
    'builder.customCss': 'Custom CSS',
    'builder.effects': '19 one-click effects',
    'builder.copyPasteStyle': 'Copy/paste styles',
    'ai.generate': 'AI video & page generation',
    'support.priority': 'Priority support',
    'export.pdf': 'PDF invoices & export',
  },
  limits: {
    sites: '{n} sites',
    sitesUnlimited: 'Unlimited sites',
    ai: '{n} AI generations/mo',
    aiNone: 'No AI generations',
  },
  checkout: {
    title: 'Checkout',
    summary: 'Your order',
    plan: 'Plan',
    interval: 'Billing',
    total: 'Total',
    pay: 'Proceed to payment',
    securedBy: 'Payments secured by Stripe',
    manualNote: 'No payment provider configured — the subscription will be set up manually (test mode).',
    confirmManual: 'Confirm subscription',
    back: 'Back to pricing',
  },
  result: {
    successTitle: 'Payment successful',
    successBody: 'Thank you! Your subscription is active. Everything is unlocked.',
    cancelTitle: 'Payment canceled',
    cancelBody: 'The payment was not completed. You can try again anytime.',
    goDashboard: 'To dashboard',
    goBilling: 'My subscription',
    retry: 'Back to pricing',
  },
  mine: {
    title: 'Subscription',
    subtitle: 'Your current plan, renewal and invoices',
    noSub: 'You have no active subscription yet.',
    seePlans: 'See plans',
    status: 'Status',
    plan: 'Plan',
    renews: 'Renews',
    endsOn: 'Active until',
    manage: 'Manage payment',
    cancel: 'Cancel subscription',
    cancelAtEnd: 'Cancels at period end',
    resume: 'Resume',
    invoices: 'Invoices',
    invoiceNo: 'Invoice #',
    date: 'Date',
    amount: 'Amount',
    download: 'Download PDF',
    empty: 'No invoices yet',
  },
  admin: {
    title: 'Billing',
    subtitle: 'Subscriptions, revenue and metrics',
    mrr: 'MRR',
    arr: 'ARR',
    active: 'Active subscriptions',
    revenue30: 'Revenue (30 days)',
    totalRevenue: 'Total revenue',
    canceled: 'Canceled',
    pastDue: 'Past due',
    byPlan: 'By plan',
    subscriptions: 'Subscriptions',
    payments: 'Payments',
    export: 'Export',
    grant: 'Grant plan manually',
    grantHint: 'Activates a subscription without payment (test/promo).',
    user: 'User',
    provider: 'Provider',
  },
  status: {
    active: 'active',
    trialing: 'trial',
    past_due: 'past due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    paid: 'paid',
    failed: 'failed',
    refunded: 'refunded',
    pending: 'pending',
  },
  interval: { month: 'Month', year: 'Year' },
};

const hy: BillingDict = {
  pricing: {
    title: 'Սակագներ',
    subtitle: 'Ընտրեք պլան. Ամբողջ կոնստրուկտորը՝ առանց սահմանափակումների, Studio-ում է։',
    monthly: 'Ամսական',
    yearly: 'Տարեկան',
    save: 'խնայում {n}%',
    perMonth: '/ամիս',
    perYear: '/տարի',
    billedYearly: '{price} — մեկ վճարում տարին',
    choose: 'Ընտրել',
    current: 'Ընթացիկ պլան',
    popular: 'Հանրաճանաչ',
    contact: 'Կապ',
  },
  planName: { starter: 'Starter', pro: 'Pro', studio: 'Studio' },
  planTagline: {
    starter: 'Առաջին կայքի համար',
    pro: 'Աճող նախագծերի համար',
    studio: 'Ամեն ինչ պրոֆեսիոնալների համար',
  },
  feature: {
    'sites.publish': 'Կայքի հրապարակում',
    'sites.customDomain': 'Սեփական դոմեն',
    'sites.members': 'Անդամներ և կաբինետներ',
    'sites.removeBranding': 'Առանց հարթակի բրենդինգի',
    'builder.advancedCss': 'Առաջադեմ CSS հատկություններ',
    'builder.animation': 'Անիմացիայի շարժիչ',
    'builder.hoverStates': 'Hover վիճակներ',
    'builder.customCss': 'Կամայական CSS',
    'builder.effects': '19 էֆեկտ մեկ սեղմումով',
    'builder.copyPasteStyle': 'Ոճերի պատճենում',
    'ai.generate': 'AI վիդեո և էջերի գեներացիա',
    'support.priority': 'Առաջնահերթ աջակցություն',
    'export.pdf': 'PDF հաշիվներ և արտահանում',
  },
  limits: {
    sites: '{n} կայք',
    sitesUnlimited: 'Անսահմանափակ կայքեր',
    ai: '{n} AI գեներացիա/ամիս',
    aiNone: 'Առանց AI գեներացիայի',
  },
  checkout: {
    title: 'Ձևակերպում',
    summary: 'Ձեր պատվերը',
    plan: 'Պլան',
    interval: 'Ժամանակահատված',
    total: 'Ընդամենը',
    pay: 'Անցնել վճարման',
    securedBy: 'Վճարումները պաշտպանված են Stripe-ով',
    manualNote: 'Վճարային պրովայդերը կարգավորված չէ — բաժանորդագրությունը կձևակերպվի ձեռքով (թեստ)։',
    confirmManual: 'Հաստատել բաժանորդագրությունը',
    back: 'Վերադառնալ սակագներ',
  },
  result: {
    successTitle: 'Վճարումը հաջողվեց',
    successBody: 'Շնորհակալություն։ Ձեր բաժանորդագրությունն ակտիվ է։',
    cancelTitle: 'Վճարումը չեղարկվեց',
    cancelBody: 'Վճարումը չավարտվեց։ Կարող եք կրկին փորձել ցանկացած պահի։',
    goDashboard: 'Դեպի վահանակ',
    goBilling: 'Իմ բաժանորդագրությունը',
    retry: 'Վերադառնալ սակագներ',
  },
  mine: {
    title: 'Բաժանորդագրություն',
    subtitle: 'Ձեր ընթացիկ պլանը, երկարաձգումը և հաշիվները',
    noSub: 'Դեռ ակտիվ բաժանորդագրություն չունեք։',
    seePlans: 'Դիտել սակագները',
    status: 'Կարգավիճակ',
    plan: 'Պլան',
    renews: 'Երկարաձգվում է',
    endsOn: 'Գործում է մինչև',
    manage: 'Կառավարել վճարումը',
    cancel: 'Չեղարկել բաժանորդագրությունը',
    cancelAtEnd: 'Կչեղարկվի ժամանակահատվածի վերջում',
    resume: 'Վերսկսել',
    invoices: 'Հաշիվներ',
    invoiceNo: 'Հաշիվ №',
    date: 'Ամսաթիվ',
    amount: 'Գումար',
    download: 'Ներբեռնել PDF',
    empty: 'Հաշիվներ դեռ չկան',
  },
  admin: {
    title: 'Վճարումներ',
    subtitle: 'Բաժանորդագրություններ, եկամուտ և մետրիկա',
    mrr: 'MRR',
    arr: 'ARR',
    active: 'Ակտիվ բաժանորդագրություններ',
    revenue30: 'Եկամուտ (30 օր)',
    totalRevenue: 'Ընդհանուր եկամուտ',
    canceled: 'Չեղարկված',
    pastDue: 'Ժամկետանց',
    byPlan: 'Ըստ պլանների',
    subscriptions: 'Բաժանորդագրություններ',
    payments: 'Վճարումներ',
    export: 'Արտահանում',
    grant: 'Տրամադրել պլան ձեռքով',
    grantHint: 'Ակտիվացնում է բաժանորդագրությունն առանց վճարման (թեստ/պրոմո)։',
    user: 'Օգտատեր',
    provider: 'Պրովայդեր',
  },
  status: {
    active: 'ակտիվ',
    trialing: 'փորձնական',
    past_due: 'ժամկետանց',
    canceled: 'չեղարկված',
    incomplete: 'անավարտ',
    paid: 'վճարված',
    failed: 'սխալ',
    refunded: 'վերադարձ',
    pending: 'սպասում',
  },
  interval: { month: 'Ամիս', year: 'Տարի' },
};

export const BILLING_DICT: Record<Locale, BillingDict> = { ru, en, hy };

export function billingDict(locale: Locale): BillingDict {
  return BILLING_DICT[locale] ?? ru;
}

/** Fill "{n}"/"{price}" placeholders. */
export function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
