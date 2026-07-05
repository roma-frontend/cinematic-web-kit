#!/usr/bin/env bash
# One-shot setup for Cinematic Web Kit on a fresh Ubuntu 22.04 VM
# (Oracle Cloud Always Free — VM.Standard.A1.Flex, ARM). Installs Node 20, the
# app (systemd service) and Caddy (automatic HTTPS + tenant custom domains via
# on-demand TLS). Data + uploads persist under /var/cwk.
#
# Usage (on the VM, as a sudo-capable user):
#   export APP_DOMAIN=example.com          # your platform domain (required)
#   export ACME_EMAIL=you@example.com      # Let's Encrypt email (required)
#   curl -fsSL https://raw.githubusercontent.com/roma-frontend/cinematic-web-kit/main/deploy/setup-oracle.sh | bash
# or: bash deploy/setup-oracle.sh  (from a cloned repo)
set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:?set APP_DOMAIN=your-domain.com}"
ACME_EMAIL="${ACME_EMAIL:?set ACME_EMAIL=you@example.com}"
REPO="${REPO:-https://github.com/roma-frontend/cinematic-web-kit.git}"
APP_DIR="${APP_DIR:-$HOME/cinematic-web-kit}"
RUN_USER="$(whoami)"

echo "==> Installing system packages (Node 20, Caddy, build tools)"
sudo apt-get update
sudo apt-get install -y git curl build-essential debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
# Caddy official repo
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update && sudo apt-get install -y caddy

echo "==> Fetching app into $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then (cd "$APP_DIR" && git pull); else git clone "$REPO" "$APP_DIR"; fi
cd "$APP_DIR"
npm ci
npm run build

echo "==> Persistent data dir + uploads symlink"
sudo mkdir -p /var/cwk/uploads
sudo chown -R "$RUN_USER":"$RUN_USER" /var/cwk
ln -sfn /var/cwk/uploads "$APP_DIR/public/uploads"

SECRET="$(openssl rand -hex 32)"

echo "==> systemd service"
sudo tee /etc/systemd/system/cwk.service >/dev/null <<EOF
[Unit]
Description=Cinematic Web Kit
After=network.target

[Service]
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_FILE=/var/cwk/app.db
Environment=SESSION_SECRET=$SECRET
Environment=NEXT_PUBLIC_APP_HOST=$APP_DOMAIN
ExecStart=/usr/bin/npm run start
Restart=always
User=$RUN_USER

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now cwk

echo "==> Caddy (automatic HTTPS + on-demand TLS for tenant domains)"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
{
	email $ACME_EMAIL
	on_demand_tls {
		ask http://127.0.0.1:3000/api/tls-check
	}
}

$APP_DOMAIN, *.$APP_DOMAIN {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}

:443 {
	tls {
		on_demand
	}
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}

:80 {
	redir https://{host}{uri} permanent
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

cat <<DONE

==> Done.
App:   https://$APP_DOMAIN   (service: sudo systemctl status cwk)
Data:  /var/cwk/app.db  |  Uploads: /var/cwk/uploads
DNS:   point A/AAAA of $APP_DOMAIN and a wildcard *.$APP_DOMAIN to this VM's IP
       (через Cloudflare — DNS-записи в режиме "DNS only" или proxied).
Tenant custom domains: their DNS → this IP; Caddy issues certs on demand.
Update later:  cd $APP_DIR && git pull && npm ci && npm run build && sudo systemctl restart cwk
DONE
