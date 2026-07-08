# Подключение домена — чек-лист «всё уже готово»

Код полностью подготовлен: и адреса сайта (canonical/SEO/sitemap/OG), и почта
(`info@`, `support@`, `sales@`), и контакты в футере завязаны на **переменные
окружения**. Когда появится домен — просто выполни шаги ниже, редактировать код
не нужно.

Пусть домен = `example.com` (замени на свой).

---

## 1. Домен → приложение Fly

```bash
fly certs add example.com -a builder-studio
fly certs add www.example.com -a builder-studio   # опционально
```

Fly покажет нужные DNS-записи. Пропиши их у регистратора / в Cloudflare:
- `A` / `AAAA` (или `CNAME` на `builder-studio.fly.dev`) на apex/`www`.
- Дождись, пока `fly certs show example.com` покажет валидный TLS-сертификат.

> Если DNS ведёшь через Cloudflare — поставь запись в режим **DNS only (серое
> облако)** на время выпуска сертификата, потом можно включить проксирование.

## 2. Хост приложения

В `fly.toml` замени оба значения:

```toml
NEXT_PUBLIC_APP_HOST = "example.com"   # было builder-studio.fly.dev (2 места: [build.args] и [env])
```

Это автоматически чинит: canonical-ссылки, `sitemap.xml`, `robots.txt`,
OpenGraph/Twitter, ссылки на поддомены арендаторов и redirect-URL биллинга.

## 3. Почта info@ / support@ / sales@

Два независимых механизма — включай оба:

**a) Приём писем (бесплатно, Cloudflare Email Routing)**
Домен в Cloudflare → **Email → Email Routing** → включить → создать адреса
`info@`, `sales@`, `support@` с пересылкой на свой личный ящик. Cloudflare сам
добавит MX/TXT.

**b) Отправка писем из приложения (коды входа, сброс пароля, уведомления)**
Заведи бесплатный провайдер и подтверди домен (DNS: SPF/DKIM):
- Resend — 3 000 писем/мес, или
- Brevo — 300 писem/день.

Затем задай секреты на Fly:

```bash
fly secrets set RESEND_API_KEY=re_xxx -a builder-studio
fly secrets set EMAIL_FROM=info@example.com -a builder-studio
fly secrets set EMAIL_REPLY_TO=support@example.com -a builder-studio
# EMAIL_FROM_NAME по желанию (по умолчанию "Builder Studio")
```

Подробности и альтернативы — в `docs/EMAIL_SETUP.md`.

## 4. Контакты в футере сайта

Ничего делать не нужно: `info@/support@/sales@` в футере генерируются из домена
автоматически (см. `lib/seo.ts → contactEmails`). Источник домена, по приоритету:

1. `NEXT_PUBLIC_CONTACT_DOMAIN` (явно, если нужен домен, отличный от EMAIL_FROM);
2. домен из `EMAIL_FROM` (обычный случай);
3. `NEXT_PUBLIC_APP_HOST`, если это настоящий домен (не `*.fly.dev`).

На `localhost` и `*.fly.dev` блок контактов скрыт, чтобы не показывать нерабочие
ссылки до подключения домена.

## 5. Деплой и проверка

```bash
fly deploy -a builder-studio
```

Проверь после выката:
- `https://example.com` открывается, TLS валиден;
- в футере появилась колонка «Контакты» с `info@/sales@/support@`;
- письмо-код при входе приходит с `info@example.com`;
- `https://example.com/sitemap.xml` и `/robots.txt` содержат новый домен.

---

### Что уже сделано в коде (трогать не надо)
- Обложки пресетов и статичная медиа отдаются из Cloudflare R2
  (`NEXT_PUBLIC_MEDIA_BASE_URL`), в `public/` их больше нет.
- Все URL/SEO — из `NEXT_PUBLIC_APP_HOST`.
- Отправка почты — провайдеро-независимая (`lib/email.ts`, Resend/Brevo,
  failover, консольный fallback без ключей).
- Контакты — единый источник в `lib/seo.ts`, используется и сайтом, и письмами.
