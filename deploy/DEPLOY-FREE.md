# Бесплатный деплой Cinematic Web Kit

> **Рекомендация: Oracle Cloud Always Free VM + Cloudflare + Caddy.** Реально
> бесплатно навсегда, постоянный диск (данные/загрузки не теряются), и идеально
> для кастомных доменов тенантов (Caddy выдаёт TLS на лету). Автоустановка одной
> командой — `deploy/setup-oracle.sh` (см. Вариант B). Fly.io (Вариант A) —
> запасной путь «быстро для теста».

Стек требует **постоянного Node-сервера с диском**: `better-sqlite3` (файл БД),
запись картинок в `public/uploads`, `ffmpeg-static`. Поэтому serverless/edge
(Cloudflare Pages/Workers, Vercel edge) без переписывания не подходят. Ниже —
два бесплатных пути. И DB, и загрузки хранятся на одном постоянном томе `/data`
(симлинк `public/uploads → /data/uploads`, `DATABASE_FILE=/data/app.db`).

---

## Вариант A — Fly.io + Volume (минимум возни)

Нужен установленный `flyctl` и аккаунт Fly.

```bash
# 1. Создать приложение (имя должно быть уникальным — поменяйте в fly.toml)
fly apps create cinematic-web-kit

# 2. Постоянный том под БД и загрузки (регион как в fly.toml)
fly volumes create cwk_data --size 1 --region fra

# 3. Секреты/переменные окружения
fly secrets set SESSION_SECRET="<длинная-случайная-строка>"
# при необходимости: fly secrets set MUAPI_KEY="sk-..." SERVER_IP="<ip>"

# 4. Деплой (собирает Dockerfile)
fly deploy
```

- Обновите `NEXT_PUBLIC_APP_HOST` в `fly.toml` на реальный хост
  (`<app>.fly.dev` или ваш домен через Cloudflare), иначе поддомены/ссылки
  тенантов будут строиться неправильно.
- `min_machines_running = 0` = «спит» при простое (холодный старт, но бесплатно).
  Хотите без задержек — уберите `auto_stop_machines`/`min_machines_running`.
- SQLite — один писатель: держите **одну** машину.

---

## Вариант B — Oracle Cloud Always Free VM + Cloudflare (максимально бесплатно)

Реально бесплатный навсегда VM (ARM Ampere), полный контроль, постоянный диск.

### Автоустановка (одна команда)
На свежей Ubuntu 22.04 VM:
```bash
export APP_DOMAIN=ваш-домен.com
export ACME_EMAIL=you@example.com
curl -fsSL https://raw.githubusercontent.com/roma-frontend/cinematic-web-kit/main/deploy/setup-oracle.sh | bash
```
Скрипт ставит Node 20, собирает приложение, поднимает systemd-службу `cwk`
(данные в `/var/cwk`, загрузки симлинком) и Caddy с автоматическим HTTPS +
on-demand TLS для доменов тенантов. Ниже — те же шаги вручную.

### 1. Создать VM
- Oracle Cloud → Always Free → Compute Instance, образ **Ubuntu 22.04**,
  shape **VM.Standard.A1.Flex** (ARM, входит в Always Free).
- Открыть порты 80/443 (Security List / iptables).

### 2. Поставить Node + сборку
```bash
sudo apt update && sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

git clone https://github.com/roma-frontend/cinematic-web-kit.git
cd cinematic-web-kit
npm ci
npm run build

# постоянные пути под данные (вне репозитория)
sudo mkdir -p /var/cwk/uploads
sudo ln -sfn /var/cwk/uploads public/uploads
```

### 3. Запуск как служба (systemd)
`/etc/systemd/system/cwk.service`:
```ini
[Unit]
Description=Cinematic Web Kit
After=network.target

[Service]
WorkingDirectory=/home/ubuntu/cinematic-web-kit
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_FILE=/var/cwk/app.db
Environment=SESSION_SECRET=<длинная-случайная-строка>
Environment=NEXT_PUBLIC_APP_HOST=ваш-домен.com
ExecStart=/usr/bin/npm run start
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now cwk
```

### 4. HTTPS + мультитенантные домены (Caddy, on-demand TLS)
Уже есть `deploy/Caddyfile` (выдаёт сертификаты доменам тенантов автоматически
через `/api/tls-check`). Поставьте Caddy и используйте его как reverse-proxy на
`localhost:3000`. Альтернатива — `deploy/nginx.conf`.

### 5. Cloudflare (бесплатно)
- Добавьте домен в Cloudflare, пропишите A-запись на IP вашего VM.
- DNS + CDN + TLS бесплатно. Для доменов клиентов — DNS у них указывает на ваш IP,
  Caddy выдаёт сертификат на лету.
- Не хотите открывать порты/светить IP — используйте **Cloudflare Tunnel**
  (`cloudflared`) вместо публичного IP.

---

## Загрузки картинок

- Старые файлы удаляются автоматически: при сохранении в конструкторе
  запускается сборщик мусора (`lib/uploads-gc.ts`) и удаляет из `public/uploads`
  файлы, на которые больше нет ссылок (с окном 10 минут, чтобы не тронуть
  только что загруженный файл).
- Хотите не зависеть от диска и раздавать через CDN — включите **Cloudflare R2**
  (10 ГБ бесплатно). Загрузка уже поддержана: если заданы переменные `R2_*`,
  файлы кладутся в R2 и раздаются с `R2_PUBLIC_BASE_URL`; иначе — локально в
  `public/uploads` (полная обратная совместимость). Сборщик мусора чистит и R2.

### Включить R2
1. Cloudflare → R2 → создать bucket (напр. `cwk-media`).
2. Включить публичный доступ: либо r2.dev-домен, либо привязать свой поддомен
   (напр. `media.ваш-домен.com`) — это и будет `R2_PUBLIC_BASE_URL`.
3. R2 → Manage API Tokens → создать токен (Object Read & Write) — получите
   Access Key ID и Secret.
4. Задать переменные окружения (Fly: `fly secrets set ...`; VM: в `cwk.service`):
```
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=cwk-media
R2_PUBLIC_BASE_URL=https://media.ваш-домен.com
```
После этого новые загрузки уходят в R2. Старые локальные ссылки продолжают
работать (обратная совместимость).

## Переменные окружения (сводка)
| Переменная | Назначение |
| --- | --- |
| `DATABASE_FILE` | путь к файлу SQLite (том), напр. `/data/app.db` |
| `SESSION_SECRET` | секрет для сессий платформы |
| `NEXT_PUBLIC_APP_HOST` | базовый хост (для поддоменов/ссылок тенантов) |
| `MUAPI_KEY` | (опц.) ключ генерации видео |
| `SERVER_IP` | (опц.) IP для DNS-инструкций доменов в дашборде |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` | (опц.) Cloudflare R2 для загрузок; без них — локальный `public/uploads` |
