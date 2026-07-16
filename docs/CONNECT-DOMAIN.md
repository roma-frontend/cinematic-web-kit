# Подключение домена

> Эта инструкция описывает, как привязать собственный домен к приложению и
> настроить HTTPS для него. Используется либо Fly.io + Cloudflare, либо выделенный
> сервер с Caddy.

## 1. Домен → приложение Fly

1. Добавь домен в приложение:
   ```bash
   fly certs add example.com
   fly certs add www.example.com
   ```
2. Проверь, какие DNS-записи ожидает Fly:
   ```bash
   fly certs show example.com
   ```
3. В панели регистратора / Cloudflare пропиши записи:
   - ** apex ** (`example.com`) — `A` и `AAAA` на IP машины;
   - **`www`** — `CNAME` на `<app>.fly.dev` (или на IP, если используешь Caddy/Nginx).
4. Подожди, пока DNS растечётся, и убедись, что сертификат выдан:
   ```bash
   fly certs show example.com
   ```
5. Обнови `NEXT_PUBLIC_APP_HOST` в `fly.toml` на реальный хост, иначе ссылки
   поддоменов тенантов будут формироваться неправильно.

## 2. HTTPS и сертификаты через Caddy

Если деплой идёт на собственном VM, Caddy может взять выдачу TLS на себя:

- Запусти приложение на `127.0.0.1:3000`;
- Подними Caddy с конфигом из `deploy/Caddyfile`:
  ```bash
  sudo caddy run --config deploy/Caddyfile
  ```
- Caddy сам получит Let's Encrypt для основного хоста и wildcard
  `*.your-host`, а также on-demand TLS для доменов тенантов через
  `/api/tls-check?domain=<host>`.
- DNS должна уже вести на внешний IP этого сервера.

## 3. Почта info@ / support@

Чтобы принимать письма на адреса вида `info@example.com`, настрой **Cloudflare
Email Routing**: создай правила для нужных получателей и укажи внешний почтовый
ящик (Gmail, Яндекс и т.д.), на который будет пересылаться входящая почта.

## 4. Проверка

- `https://example.com` открывается без предупреждений о сертификате.
- В заголовке ответа/логах Caddy видно, что TLS успешно согласован.
- Письмо на `info@example.com` доходит до конечного ящика.
