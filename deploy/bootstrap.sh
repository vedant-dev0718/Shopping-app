#!/usr/bin/env bash
#
# One-time EC2 instance setup. Run as ec2-user on a fresh Amazon Linux 2023 box:
#
#   sudo dnf install -y git
#   git clone git@github.com:vedant-dev0718/Shopping-app.git /tmp/repo \
#     || curl -fsSLO https://raw.githubusercontent.com/.../deploy/bootstrap.sh
#   sudo bash /tmp/repo/deploy/bootstrap.sh
#
# Idempotent: safe to re-run.
set -euo pipefail

APP_USER=notwhat
APP_HOME=/opt/notwhat
APP_DIR="$APP_HOME/app"
REPO="git@github.com:vedant-dev0718/Shopping-app.git"
NODE_MAJOR=22

if [[ $EUID -ne 0 ]]; then
  echo "run with sudo" >&2
  exit 1
fi

echo "==> Packages"
dnf update -y
dnf install -y git nginx tar xz

echo "==> Node.js $NODE_MAJOR"
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  dnf install -y nodejs
fi

echo "==> ffmpeg"
# fluent-ffmpeg (src/utils/ffmpegHLS.js) shells out to these binaries; AL2023
# has no ffmpeg package, so install the static build.
if ! command -v ffmpeg >/dev/null; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/ffmpeg.tar.xz" \
    https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  tar xf "$tmp/ffmpeg.tar.xz" -C "$tmp"
  install "$tmp"/ffmpeg-*-static/ffmpeg "$tmp"/ffmpeg-*-static/ffprobe /usr/local/bin/
  rm -rf "$tmp"
fi

echo "==> Service user"
id -u "$APP_USER" >/dev/null 2>&1 || \
  useradd -r -m -d "$APP_HOME" -s /usr/sbin/nologin "$APP_USER"

echo "==> Swap"
# npm ci with sharp can exceed 2 GB on a t3.small.
if [[ ! -f /swapfile ]]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Deploy key"
if [[ ! -f "$APP_HOME/.ssh/id_ed25519" ]]; then
  sudo -u "$APP_USER" mkdir -p "$APP_HOME/.ssh"
  sudo -u "$APP_USER" ssh-keygen -t ed25519 -N "" -f "$APP_HOME/.ssh/id_ed25519" -q
  sudo -u "$APP_USER" ssh-keyscan -H github.com >> "$APP_HOME/.ssh/known_hosts" 2>/dev/null
  echo
  echo "-------------------------------------------------------------------"
  echo "Add this as a READ-ONLY deploy key at:"
  echo "  https://github.com/vedant-dev0718/Shopping-app/settings/keys"
  echo
  cat "$APP_HOME/.ssh/id_ed25519.pub"
  echo "-------------------------------------------------------------------"
  echo
  read -rp "Press Enter once the key is added..."
fi

echo "==> Clone"
if [[ ! -d "$APP_DIR/.git" ]]; then
  sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR"
fi

echo "==> Dependencies"
cd "$APP_DIR/backend"
sudo -u "$APP_USER" npm ci --omit=dev

echo "==> Install deploy scripts"
install -m 755 "$APP_DIR/deploy/render-env.sh" "$APP_HOME/render-env.sh"
install -m 755 "$APP_DIR/deploy/deploy.sh"     "$APP_HOME/deploy.sh"
install -m 644 "$APP_DIR/deploy/notwhat-api.service" \
  /etc/systemd/system/notwhat-api.service

echo "==> Start API"
systemctl daemon-reload
systemctl enable --now notwhat-api

sleep 4
if curl -fsS http://127.0.0.1:5001/api/health >/dev/null; then
  echo "==> API healthy on :5001"
else
  echo "!! Health check failed. Check: journalctl -u notwhat-api -n 50" >&2
  exit 1
fi

cat <<'EOF'

Next:
  1. Edit deploy/nginx.conf -- replace api.yourdomain.com with your hostname.
  2. sudo cp /opt/notwhat/app/deploy/nginx.conf /etc/nginx/conf.d/notwhat.conf
     sudo systemctl enable --now nginx && sudo nginx -t && sudo systemctl reload nginx
  3. sudo dnf install -y certbot python3-certbot-nginx
     sudo certbot --nginx -d api.yourdomain.com
  4. cd /opt/notwhat/app/backend && sudo -u notwhat npm run seed:admin
EOF
