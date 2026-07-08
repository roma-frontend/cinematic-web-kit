// Auth UI dictionary (ru/en/hy) for the login + register wizard. Domain-scoped
// dictionary module — keeps the shared ui-dict small and lets each area own its
// strings. Client-safe (no server-only / no DB).

import type { Locale } from '@/lib/seo';

export type AuthDict = {
  // login
  loginTitle: string;
  loginSubtitle: string;
  email: string;
  password: string;
  forgot: string;
  showPassword: string;
  signIn: string;
  noAccount: string;
  register: string;
  // otp
  otpTitle: string;
  otpSentTo: string; // prefix, followed by the masked email
  otpHint: string;
  verify: string;
  back: string;
  resendCode: string;
  resendAgain: string; // used as `${resendAgain} (12 ${sec})`
  sec: string;
  // register wizard
  createAccount: string;
  step: string;
  of: string;
  stepTitles: [string, string, string];
  stepDescs: [string, string, string];
  name: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholderMin: string;
  repeat: string;
  repeatPlaceholder: string;
  pwMatch: string;
  pwNoMatch: string;
  sumNote: string;
  next: string;
  submit: string;
  haveAccount: string;
  // errors / feedback
  genericError: string;
  networkError: string;
  sendCodeError: string;
  errNameRequired: string;
  errBadEmail: string;
  errPwShort: string;
  errPwMismatch: string;
  // Telegram login
  telegram: {
    or: string;
    login: string;
    connecting: string;
    tooMany: string;
    badPayload: string;
    notConfigured: string;
    badSignature: string;
    expired: string;
    suspended: string;
  };
};

const ru: AuthDict = {
  loginTitle: 'Вход в аккаунт',
  loginSubtitle: 'Продолжите работу над своими сайтами',
  email: 'Email',
  password: 'Пароль',
  forgot: 'Забыли пароль?',
  showPassword: 'Показать пароль',
  signIn: 'Войти',
  noAccount: 'Нет аккаунта?',
  register: 'Регистрация',
  otpTitle: 'Подтвердите вход',
  otpSentTo: 'Мы отправили 6-значный код на',
  otpHint: 'Код действует 10 минут. Не пришло письмо — проверьте «Спам».',
  verify: 'Подтвердить',
  back: 'Назад',
  resendCode: 'Отправить код ещё раз',
  resendAgain: 'Отправить ещё раз',
  sec: 'с',
  createAccount: 'Создать аккаунт',
  step: 'Шаг',
  of: 'из',
  stepTitles: ['Ваши данные', 'Пароль', 'Подтверждение'],
  stepDescs: ['Как к вам обращаться и email для входа', 'Придумайте надёжный пароль', 'Проверьте данные и создайте аккаунт'],
  name: 'Имя',
  namePlaceholder: 'Как к вам обращаться',
  emailPlaceholder: 'you@example.com',
  passwordPlaceholderMin: 'Минимум 8 символов',
  repeat: 'Повторите пароль',
  repeatPlaceholder: 'Ещё раз',
  pwMatch: 'Пароли совпадают',
  pwNoMatch: 'Пароли не совпадают',
  sumNote: 'Регистрируясь, вы получаете дашборд, конструктор и публикацию на своём поддомене — бесплатно.',
  next: 'Далее',
  submit: 'Зарегистрироваться',
  haveAccount: 'Уже есть аккаунт?',
  genericError: 'Что-то пошло не так.',
  networkError: 'Сеть недоступна, попробуйте ещё раз.',
  sendCodeError: 'Не удалось отправить код.',
  errNameRequired: 'Укажите имя.',
  errBadEmail: 'Некорректный email.',
  errPwShort: 'Пароль должен быть не короче 8 символов.',
  errPwMismatch: 'Пароли не совпадают.',
  telegram: {
    or: 'или',
    login: 'Войти через Telegram',
    connecting: 'Подключение…',
    tooMany: 'Слишком много попыток, попробуйте позже.',
    badPayload: 'Некорректные данные Telegram.',
    notConfigured: 'Вход через Telegram не настроен.',
    badSignature: 'Проверка Telegram не пройдена.',
    expired: 'Срок авторизации Telegram истёк, попробуйте снова.',
    suspended: 'Пользователь заблокирован.',
  },
};

const en: AuthDict = {
  loginTitle: 'Sign in',
  loginSubtitle: 'Continue working on your sites',
  email: 'Email',
  password: 'Password',
  forgot: 'Forgot password?',
  showPassword: 'Show password',
  signIn: 'Sign in',
  noAccount: 'No account?',
  register: 'Sign up',
  otpTitle: 'Confirm sign-in',
  otpSentTo: 'We sent a 6-digit code to',
  otpHint: 'The code is valid for 10 minutes. No email? Check your spam folder.',
  verify: 'Confirm',
  back: 'Back',
  resendCode: 'Resend the code',
  resendAgain: 'Resend',
  sec: 's',
  createAccount: 'Create account',
  step: 'Step',
  of: 'of',
  stepTitles: ['Your details', 'Password', 'Confirmation'],
  stepDescs: ['Your name and sign-in email', 'Choose a strong password', 'Review and create your account'],
  name: 'Name',
  namePlaceholder: 'What should we call you',
  emailPlaceholder: 'you@example.com',
  passwordPlaceholderMin: 'At least 8 characters',
  repeat: 'Repeat password',
  repeatPlaceholder: 'Again',
  pwMatch: 'Passwords match',
  pwNoMatch: 'Passwords don’t match',
  sumNote: 'By signing up you get the dashboard, the builder and publishing on your subdomain — free.',
  next: 'Next',
  submit: 'Create account',
  haveAccount: 'Already have an account?',
  genericError: 'Something went wrong.',
  networkError: 'Network unavailable, please try again.',
  sendCodeError: 'Could not send the code.',
  errNameRequired: 'Enter your name.',
  errBadEmail: 'Invalid email.',
  errPwShort: 'Password must be at least 8 characters.',
  errPwMismatch: 'Passwords don’t match.',
  telegram: {
    or: 'or',
    login: 'Sign in with Telegram',
    connecting: 'Connecting…',
    tooMany: 'Too many attempts, try again later.',
    badPayload: 'Invalid Telegram data.',
    notConfigured: 'Telegram sign-in is not configured.',
    badSignature: 'Telegram verification failed.',
    expired: 'Telegram authorization expired, please try again.',
    suspended: 'This user is blocked.',
  },
};

const hy: AuthDict = {
  loginTitle: 'Մուտք հաշիվ',
  loginSubtitle: 'Շարունակեք աշխատել ձեր կայքերի վրա',
  email: 'Էլ. փոստ',
  password: 'Գաղտնաբառ',
  forgot: 'Մոռացե՞լ եք գաղտնաբառը',
  showPassword: 'Ցուցադրել գաղտնաբառը',
  signIn: 'Մուտք',
  noAccount: 'Չունե՞ք հաշիվ',
  register: 'Գրանցում',
  otpTitle: 'Հաստատեք մուտքը',
  otpSentTo: 'Մենք ուղարկեցինք 6-նիշ կոդ',
  otpHint: 'Կոդը գործում է 10 րոպե։ Նամակը չի՞ եկել — ստուգեք «Սպամ» պանակը։',
  verify: 'Հաստատել',
  back: 'Հետ',
  resendCode: 'Ուղարկել կոդը կրկին',
  resendAgain: 'Ուղարկել կրկին',
  sec: 'վրկ',
  createAccount: 'Ստեղծել հաշիվ',
  step: 'Քայլ',
  of: '/',
  stepTitles: ['Ձեր տվյալները', 'Գաղտնաբառ', 'Հաստատում'],
  stepDescs: ['Ձեր անունը և մուտքի էլ. փոստը', 'Ընտրեք ամուր գաղտնաբառ', 'Ստուգեք տվյալները և ստեղծեք հաշիվը'],
  name: 'Անուն',
  namePlaceholder: 'Ինչպես դիմել ձեզ',
  emailPlaceholder: 'you@example.com',
  passwordPlaceholderMin: 'Առնվազն 8 նիշ',
  repeat: 'Կրկնեք գաղտնաբառը',
  repeatPlaceholder: 'Կրկին',
  pwMatch: 'Գաղտնաբառերը համընկնում են',
  pwNoMatch: 'Գաղտնաբառերը չեն համընկնում',
  sumNote: 'Գրանցվելով՝ դուք ստանում եք վահանակ, կառուցիչ և հրապարակում ձեր ենթատիրույթում — անվճար։',
  next: 'Հաջորդ',
  submit: 'Գրանցվել',
  haveAccount: 'Արդեն ունե՞ք հաշիվ',
  genericError: 'Ինչ-որ բան սխալ գնաց։',
  networkError: 'Ցանցն անհասանելի է, փորձեք կրկին։',
  sendCodeError: 'Չհաջողվեց ուղարկել կոդը։',
  errNameRequired: 'Նշեք ձեր անունը։',
  errBadEmail: 'Սխալ էլ. փոստ։',
  errPwShort: 'Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։',
  errPwMismatch: 'Գաղտնաբառերը չեն համընկնում։',
  telegram: {
    or: 'կամ',
    login: 'Մուտք Telegram-ով',
    connecting: 'Միանում…',
    tooMany: 'Չափազանց շատ փորձեր, փորձեք ավելի ուշ։',
    badPayload: 'Telegram-ի սխալ տվյալներ։',
    notConfigured: 'Telegram-ով մուտքը կարգավորված չէ։',
    badSignature: 'Telegram-ի ստուգումը ձախողվեց։',
    expired: 'Telegram-ի վավերացման ժամկետը լրացել է, փորձեք կրկին։',
    suspended: 'Օգտատերն արգելափակված է։',
  },
};

export const AUTH: Record<Locale, AuthDict> = { ru, en, hy };

export function authDict(locale: Locale): AuthDict {
  return AUTH[locale];
}
