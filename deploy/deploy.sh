#!/usr/bin/env bash
#
# Redeploy: pull, install, restart, health check.
# Installed to /opt/notwhat/deploy.sh by bootstrap.sh.
#
#   sudo /opt/notwhat/deploy.sh [branch]      # defaults to main
set -euo pipefail

BRANCH="${1:-main}"
APP_USER=notwhat
APP_DIR=/opt/notwhat/app

if [[ $EUID -ne 0 ]]; then
  echo "run with sudo" >&2
  exit 1
fi

cd "$APP_DIR"
PREV="$(git rev-parse --short HEAD)"

sudo -u "$APP_USER" git fetch --all --prune
sudo -u "$APP_USER" git checkout "$BRANCH"
sudo -u "$APP_USER" git reset --hard "origin/$BRANCH"

cd "$APP_DIR/backend"
sudo -u "$APP_USER" npm ci --omit=dev

systemctl restart notwhat-api

for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:5001/api/health >/dev/null 2>&1; then
    echo "deployed $PREV -> $(git -C "$APP_DIR" rev-parse --short HEAD) on $BRANCH"
    exit 0
  fi
  sleep 2
done

echo "!! Health check failed after restart. Rolling back to $PREV." >&2
cd "$APP_DIR"
sudo -u "$APP_USER" git reset --hard "$PREV"
cd "$APP_DIR/backend"
sudo -u "$APP_USER" npm ci --omit=dev
systemctl restart notwhat-api
echo "!! Rolled back. Inspect: journalctl -u notwhat-api -n 80" >&2
exit 1
