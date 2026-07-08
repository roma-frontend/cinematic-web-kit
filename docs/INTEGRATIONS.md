# Бесплатные интеграции

Все интеграции **env-gated**: без ключей проект работает как раньше (graceful
fallback), с ключами — включаются. Ничего в коде менять не нужно, только env.

Сводка переменных — в `.env.example`. Ниже — что это даёт и как включить.

---

## 1. LLM для тем и генерации страниц — Groq (бесплатно)

Единый OpenAI-совместимый клиент: `lib/llm.ts` (`chatComplete`, `llmConfigured`).
Используется в `app/api/pick-theme` (подбор темы по брифу) и
`app/api/generate-page` (генерация блоков лендинга). Без ключа — подбор по
ключевым словам и детерминированный шаблон.

Включить (Groq, 30 запросов/мин, без карты):
```
THEME_LLM_URL=https://api.groq.com/openai/v1/chat/completions
THEME_LLM_KEY=gsk_...
THEME_LLM_MODEL=llama-3.3-70b-versatile
```
Подходит любой OpenAI-совместимый эндпоинт (OpenAI, OpenRouter, Together, muapi,
локальный Ollama). Алиасы `LLM_URL/LLM_KEY/LLM_MODEL` тоже читаются.

## 2. PostHog — product-аналитика (free ~1M событий/мес)

Session replay, feature flags, A/B-тесты, autocapture. Грузится через
`components/analytics.tsx` официальным сниппетом (без npm-зависимости).

Включить:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # или eu.i.posthog.com
```
Работает рядом с Cloudflare Web Analytics (`NEXT_PUBLIC_CF_BEACON_TOKEN`) —
можно держать обе.

## 3. Cloudflare Turnstile — защита форм от ботов (бесплатно)

Приватная замена CAPTCHA. Сервер: `lib/turnstile.ts` (`verifyTurnstile`),
клиент: `components/turnstile.tsx` (`<Turnstile />`). Проверка встроена в
`app/api/form`. Без секрета — fail-open (как сейчас, только honeypot).

Включить (нужны ОБА ключа):
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...   # публичный, для виджета
TURNSTILE_SECRET_KEY=0x4AAAAAAA...             # серверный, для проверки
```
Виджет `<Turnstile onVerify={...} />` можно вставить в любую форму; токен
уходит в поле `cf-turnstile-response` и проверяется на сервере.

## 4. Cloudflare Workers AI — embeddings и edge-чат (10k нейронов/день)

`lib/workers-ai.ts`: `embed()` (векторы для семантического поиска),
`cosineSimilarity()`, `edgeChat()`. Готовый строительный блок под умный поиск/
авто-alt/чат-ассистента.

Включить (токен с правом «Workers AI»):
```
CF_ACCOUNT_ID=...        # по умолчанию = R2_ACCOUNT_ID
CF_AI_TOKEN=...
# опционально сменить модели:
# CF_AI_EMBED_MODEL=@cf/baai/bge-base-en-v1.5
# CF_AI_CHAT_MODEL=@cf/meta/llama-3.1-8b-instruct
```

---

## Проверка конфигурации

При старте `lib/env.ts` печатает предупреждения о частично настроенных
интеграциях (например, задан только один из двух ключей Turnstile). Полностью
пустой конфиг — это норма: всё работает в fallback-режиме.

## 5. View Transitions — плавные переходы между страницами (нативно)

Включено по умолчанию, без сервисов и зависимостей. `app/globals.css`
использует нативный `@view-transition { navigation: auto }` + кросс-фейд для
поддерживающих браузеров (Chrome/Edge/Safari). Отключается автоматически при
`prefers-reduced-motion`. Браузеры без поддержки просто переходят как обычно.

## 6. Sentry — мониторинг ошибок (free tier)

Клиент+сервер, gated на DSN. Без `SENTRY_DSN` сборка и рантайм не меняются
(`next.config.mjs` оборачивается через `withSentryConfig` только при наличии
DSN; `instrumentation.ts` / `instrumentation-client.ts` не инициализируют SDK).

Включить:
```
SENTRY_DSN=...                 # серверный
NEXT_PUBLIC_SENTRY_DSN=...      # клиентский
# опц.: SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN — загрузка source maps
# опц.: NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE=1 — запись сессий с ошибкой
```

## 7. Real-time заявки — live-лента (SSE, без сервисов)

`lib/realtime.ts` — in-process pub/sub, `app/api/submissions/stream` — SSE-поток,
`components/dashboard/live-submissions.tsx` — клиент на странице `/dashboard/submissions`.
Новая заявка через `app/api/form` мгновенно всплывает в открытом дашборде
владельца (индикатор «live» + плашка «Новая заявка», без перезагрузки).
Работает из коробки, без ключей. На одной машине Fly вещает во все вкладки; при
масштабировании на несколько инстансов заменить шину на Redis/Ably/Durable Objects
(публичный API `publishSubmission`/`onSubmission` останется тем же).

## Что ещё можно добавить (не подключено)
- **Real-time мультиплеер в билдере** (Liveblocks/Yjs) — совместное редактирование.
