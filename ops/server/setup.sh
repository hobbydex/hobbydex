#!/usr/bin/env bash
# One-time (and safe to repeat) setup of a fresh Debian 12/13 or Ubuntu 24.04 server for hobbydex.com.
# Run as root, from a directory holding this script and the Caddyfile next to it:
#   ./setup.sh <deploy-public-key-or-file> [--pre-dns]
# The first argument is a public key line ("ssh-ed25519 AAAA... comment") or a file with one key per line;
# it becomes authorized_keys of the `deploy` user that CI uploads as. --pre-dns makes Caddy use its own
# internal certificate until DNS points here (see the Caddyfile); leave it out once DNS has moved.
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "run as root" >&2; exit 1; }
KEY_ARG="${1:-}"
[ -n "$KEY_ARG" ] || { echo "usage: $0 <deploy-public-key-or-file> [--pre-dns]" >&2; exit 1; }
PRE_DNS=0; [ "${2:-}" = "--pre-dns" ] && PRE_DNS=1
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/Caddyfile" ] || { echo "Caddyfile not found next to $0" >&2; exit 1; }
if [ -f "$KEY_ARG" ]; then KEYS="$(cat "$KEY_ARG")"; else KEYS="$KEY_ARG"; fi
case "$KEYS" in ssh-*|ecdsa-*|sk-*) ;; *) echo "not a public key: $KEY_ARG" >&2; exit 1 ;; esac

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q rsync curl gpg ufw unattended-upgrades apt-transport-https ca-certificates

# --- deploy user: no password, key login only
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
passwd -l deploy >/dev/null
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$KEYS" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# --- site layout: releases/<id> directories, `current` symlink to the live one (see deploy.sh)
install -d -m 755 -o deploy -g deploy /srv/hobbydex /srv/hobbydex/releases
if [ ! -e /srv/hobbydex/current ]; then
  install -d -m 755 -o deploy -g deploy /srv/hobbydex/releases/0-placeholder
  echo '<!doctype html><title>Hobbydex</title><p>Hobbydex is moving here. Back soon.' \
    > /srv/hobbydex/releases/0-placeholder/index.html
  chmod 644 /srv/hobbydex/releases/0-placeholder/index.html
  ln -s releases/0-placeholder /srv/hobbydex/current
  chown -h deploy:deploy /srv/hobbydex/current
fi

# --- Caddy from its official apt repository
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi
# the access log (Caddyfile `log`) is written by the caddy user; Caddy rolls it, no logrotate job
install -d -m 755 -o caddy -g caddy /var/log/caddy
install -d /etc/caddy/tls.d
if [ "$PRE_DNS" = 1 ]; then echo 'tls internal' > /etc/caddy/tls.d/internal.conf; fi
install -m 644 "$HERE/Caddyfile" /etc/caddy/Caddyfile
# validate as the caddy user: as root it would create access.log owned by root and the reload would fail
runuser -u caddy -- caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
# the deploy user reads the access log through the caddy group (bot-report.py, no sudo)
usermod -aG caddy deploy
systemctl enable caddy >/dev/null
systemctl reload-or-restart caddy
# the deploy user may reload Caddy after a release changed its redirect map (deploy.sh); this command and no other
printf '%s\n' 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload caddy' > /etc/sudoers.d/hobbydex-caddy-reload
chmod 440 /etc/sudoers.d/hobbydex-caddy-reload
visudo -cf /etc/sudoers.d/hobbydex-caddy-reload >/dev/null

# --- automatic security updates (reboots at 03:30 when one needs it; the daily deploy runs at 04:17 UTC)
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
cat > /etc/apt/apt.conf.d/52hobbydex-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:30";
EOF
# Caddy comes from its own repository, not the Debian one; upgrade it with the rest.
cat > /etc/apt/apt.conf.d/52hobbydex-caddy <<'EOF'
Unattended-Upgrade::Origins-Pattern { "site=dl.cloudsmith.io"; };
EOF

# --- firewall: SSH, HTTP, HTTPS (443 also over UDP for HTTP/3)
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80 >/dev/null
ufw allow 443 >/dev/null
ufw --force enable >/dev/null

# --- SSH: key login only (a file sorting before cloud-init's 50-cloud-init.conf wins)
cat > /etc/ssh/sshd_config.d/10-hobbydex.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

echo "setup done: deploy user ready, Caddy running, ufw on, SSH password login off"
