# Deploy — automatic HTTPS for the platform and tenant custom domains

The app serves every site over HTTP on `127.0.0.1:3000`. TLS is terminated by a
reverse proxy in front of it. Two ready configs are provided.

## Recommended: Caddy (fully automatic, incl. tenant custom domains)

`deploy/Caddyfile` gives you:
- automatic Let's Encrypt certs for your platform host + `*.your-host` subdomains;
- **on-demand TLS** for tenant custom domains — a cert is issued the first time a
  visitor opens an attached domain over HTTPS, gated by the app's
  `GET /api/tls-check?domain=<host>` endpoint (returns 200 only for known domains,
  so nobody can trick the server into requesting certs for random names).

```bash
# 1. Point DNS at this server: A/AAAA for your-host and A for *.your-host (wildcard).
# 2. Edit deploy/Caddyfile: replace example.com and the ACME email.
# 3. Run the app (127.0.0.1:3000), then:
sudo caddy run --config deploy/Caddyfile
# or install as a service:
sudo caddy start --config deploy/Caddyfile
```

Tenants then just add their domain in the dashboard, point DNS (A → this server's
IP, or CNAME → your platform host), and HTTPS starts working automatically once
DNS resolves — no per-domain config needed.

## Alternative: Nginx + Certbot

`deploy/nginx.conf` covers the platform host + wildcard via a DNS-01 wildcard
cert, and shows how to issue a per-domain cert with certbot when a tenant adds a
custom domain (Nginx can't do on-demand issuance, so custom domains need a
certbot run + reload — templatable/automatable).

## Environment

Set these in `.env.local` (or the process environment) before starting the app:

```
NEXT_PUBLIC_APP_HOST=your-host.com     # platform host (no scheme)
SERVER_IP=203.0.113.10                 # public IP shown to tenants for A-records + DNS verification
```
