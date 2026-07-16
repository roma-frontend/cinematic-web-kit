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
    cancelled: string;
    failed: string;
    continueHint: string;
    badRequest: string;
  };
  // Google login
  google: {
    login: string;
    connecting: string;
    notConfigured: string;
    cancelled: string;
    failed: string;
    noEmail: string;
    unverified: string;
    suspended: string;
  };
  // Apple login
  apple: {
    login: string;
    notConfigured: string;
    cancelled: string;
    failed: string;
    noEmail: string;
    suspended: string;
  };
  // Password strength meter
  pwStrengthPrefix: string; // "Password strength:"
  pwStrength: [string, string, string, string, string]; // '', weak, medium, good, strong
  // Forgot / reset password UI
  reset: {
    metaForgot: string;
    metaReset: string;
    metaLogin: string;
    metaRegister: string;
    metaChange: string;
    forgotTitle: string;
    forgotSubtitle: string;
    sendLink: string;
    checkEmailTitle: string;
    checkEmailSubtitle: string; // {email}
    checkEmailHint: string;
    backToLogin: string;
    rememberPassword: string;
    newTitle: string;
    newSubtitle: string;
    newPassword: string;
    savePassword: string;
    invalidTitle: string;
    invalidSubtitle: string;
    requestNewLink: string;
    doneTitle: string;
    doneSubtitle: string;
    goLogin: string;
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
    cancelled: 'Вход через Telegram отменён.',
    failed: 'Не удалось войти через Telegram.',
    continueHint: 'Продолжите вход на защищённой странице платформы.',
    badRequest: 'Некорректная ссылка входа.',
  },
  google: {
    login: 'Войти через Google',
    connecting: 'Подключение…',
    notConfigured: 'Вход через Google не настроен.',
    cancelled: 'Вход через Google отменён.',
    failed: 'Не удалось войти через Google, попробуйте снова.',
    noEmail: 'Google не предоставил email.',
    unverified: 'Email в Google не подтверждён.',
    suspended: 'Пользователь заблокирован.',
  },
  apple: {
    login: 'Войти через Apple',
    notConfigured: 'Вход через Apple не настроен.',
    cancelled: 'Вход через Apple отменён.',
    failed: 'Не удалось войти через Apple, попробуйте снова.',
    noEmail: 'Apple не предоставил email.',
    suspended: 'Пользователь заблокирован.',
  },
  pwStrengthPrefix: 'Надёжность пароля',
  pwStrength: ['', 'слабый', 'средний', 'хороший', 'надёжный'],
  reset: {
    metaForgot: 'Восстановление пароля — Builder Studio',
    metaReset: 'Новый пароль — Builder Studio',
    metaLogin: 'Вход — Builder Studio',
    metaRegister: 'Регистрация — Builder Studio',
    metaChange: 'Смена пароля — Builder Studio',
    forgotTitle: 'Восстановление пароля',
    forgotSubtitle: 'Укажите email — мы отправим ссылку для сброса',
    sendLink: 'Отправить ссылку',
    checkEmailTitle: 'Проверьте почту',
    checkEmailSubtitle: 'Если аккаунт с адресом {email} существует, мы отправили на него ссылку для сброса пароля.',
    checkEmailHint: 'Ссылка действует 60 минут. Не пришло письмо — проверьте «Спам».',
    backToLogin: 'Вернуться ко входу',
    rememberPassword: 'Вспомнили пароль?',
    newTitle: 'Новый пароль',
    newSubtitle: 'Придумайте новый надёжный пароль для аккаунта',
    newPassword: 'Новый пароль',
    savePassword: 'Сохранить пароль',
    invalidTitle: 'Ссылка недействительна',
    invalidSubtitle: 'В адресе нет токена сброса. Запросите новую ссылку.',
    requestNewLink: 'Запросить новую ссылку',
    doneTitle: 'Пароль обновлён',
    doneSubtitle: 'Теперь войдите с новым паролем. Все старые сессии завершены.',
    goLogin: 'Войти',
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
    cancelled: 'Telegram sign-in was cancelled.',
    failed: 'Telegram sign-in failed.',
    continueHint: 'Continue signing in on the secure platform page.',
    badRequest: 'Invalid sign-in link.',
  },
  google: {
    login: 'Sign in with Google',
    connecting: 'Connecting…',
    notConfigured: 'Google sign-in is not configured.',
    cancelled: 'Google sign-in was cancelled.',
    failed: 'Could not sign in with Google, please try again.',
    noEmail: 'Google did not provide an email.',
    unverified: 'Your Google email is not verified.',
    suspended: 'This user is blocked.',
  },
  apple: {
    login: 'Sign in with Apple',
    notConfigured: 'Apple sign-in is not configured.',
    cancelled: 'Apple sign-in was cancelled.',
    failed: 'Could not sign in with Apple, please try again.',
    noEmail: 'Apple did not provide an email.',
    suspended: 'This user is blocked.',
  },
  pwStrengthPrefix: 'Password strength',
  pwStrength: ['', 'weak', 'medium', 'good', 'strong'],
  reset: {
    metaForgot: 'Password recovery — Builder Studio',
    metaReset: 'New password — Builder Studio',
    metaLogin: 'Sign in — Builder Studio',
    metaRegister: 'Sign up — Builder Studio',
    metaChange: 'Change password — Builder Studio',
    forgotTitle: 'Password recovery',
    forgotSubtitle: 'Enter your email — we will send a reset link',
    sendLink: 'Send link',
    checkEmailTitle: 'Check your email',
    checkEmailSubtitle: 'If an account for {email} exists, we sent a password reset link there.',
    checkEmailHint: 'The link is valid for 60 minutes. No email? Check your spam folder.',
    backToLogin: 'Back to sign in',
    rememberPassword: 'Remembered your password?',
    newTitle: 'New password',
    newSubtitle: 'Choose a strong new password for your account',
    newPassword: 'New password',
    savePassword: 'Save password',
    invalidTitle: 'Invalid link',
    invalidSubtitle: 'The address has no reset token. Request a new link.',
    requestNewLink: 'Request a new link',
    doneTitle: 'Password updated',
    doneSubtitle: 'Sign in with your new password. All old sessions have been ended.',
    goLogin: 'Sign in',
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
    cancelled: 'Telegram-ով մուտքը չեղարկվեց։',
    failed: 'Telegram-ով մուտքը ձախողվեց։',
    continueHint: 'Շարունակեք մուտքը հարթակի ապահով էջում։',
    badRequest: 'Մուտքի սխալ հղում։',
  },
  google: {
    login: 'Մուտք Google-ով',
    connecting: 'Միանում…',
    notConfigured: 'Google-ով մուտքը կարգավորված չէ։',
    cancelled: 'Google-ով մուտքը չեղարկվեց։',
    failed: 'Չհաջողվեց մուտք գործել Google-ով, փորձեք կրկին։',
    noEmail: 'Google-ը չտրամադրեց էլ. փոստ։',
    unverified: 'Ձեր Google էլ. փոստը հաստատված չէ։',
    suspended: 'Օգտատերն արգելափակված է։',
  },
  apple: {
    login: 'Մուտք Apple-ով',
    notConfigured: 'Apple-ով մուտքը կարգավորված չէ։',
    cancelled: 'Apple-ով մուտքը չեղարկվեց։',
    failed: 'Չհաջողվեց մուտք գործել Apple-ով, փորձեք կրկին։',
    noEmail: 'Apple-ը չտրամադրեց էլ. փոստ։',
    suspended: 'Օգտատերն արգելափակված է։',
  },
  pwStrengthPrefix: 'Գաղտնաբառի ամրություն',
  pwStrength: ['', 'թույլ', 'միջին', 'լավ', 'ամուր'],
  reset: {
    metaForgot: 'Գաղտնաբառի վերականգնում — Builder Studio',
    metaReset: 'Նոր գաղտնաբառ — Builder Studio',
    metaLogin: 'Մուտք — Builder Studio',
    metaRegister: 'Գրանցում — Builder Studio',
    metaChange: 'Գաղտնաբառի փոփոխություն — Builder Studio',
    forgotTitle: 'Գաղտնաբառի վերականգնում',
    forgotSubtitle: 'Նշեք էլ. փոստը — մենք կուղարկենք վերակայման հղում',
    sendLink: 'Ուղարկել հղումը',
    checkEmailTitle: 'Ստուգեք փոստը',
    checkEmailSubtitle: 'Եթե {email} հասցեով հաշիվ կա, մենք ուղարկել ենք գաղտնաբառի վերակայման հղում։',
    checkEmailHint: 'Հղումը գործում է 60 րոպե։ Նամակը չի՞ եկել — ստուգեք «Սպամ» պանակը։',
    backToLogin: 'Վերադառնալ մուտքին',
    rememberPassword: 'Հիշե՞լ եք գաղտնաբառը',
    newTitle: 'Նոր գաղտնաբառ',
    newSubtitle: 'Ընտրեք նոր ամուր գաղտնաբառ ձեր հաշվի համար',
    newPassword: 'Նոր գաղտնաբառ',
    savePassword: 'Պահել գաղտնաբառը',
    invalidTitle: 'Հղումն անվավեր է',
    invalidSubtitle: 'Հասցեում վերակայման նշան չկա։ Հայցեք նոր հղում։',
    requestNewLink: 'Հայցել նոր հղում',
    doneTitle: 'Գաղտնաբառը թարմացվեց',
    doneSubtitle: 'Այժմ մուտք գործեք նոր գաղտնաբառով։ Բոլոր հին սեսիաներն ավարտված են։',
    goLogin: 'Մուտք',
  },
};

export const AUTH: Record<Locale, AuthDict> = { ru, en, hy };

export function authDict(locale: Locale): AuthDict {
  return AUTH[locale];
}
