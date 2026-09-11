#!/usr/bin/env bash
#
# Renders backend/.env from SSM Parameter Store. Runs as ExecStartPre on every
# service start, so a config change is picked up by `systemctl restart`.
# Installed to /opt/notwhat/render-env.sh by bootstrap.sh.
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
PREFIX="/notwhat/prod"
APP_DIR="/opt/notwhat/app/backend"
TARGET="$APP_DIR/.env"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

aws ssm get-parameters-by-path \
  --region "$REGION" \
  --path "$PREFIX/" \
  --with-decryption \
  --recursive \
  --query "Parameters[].[Name,Value]" \
  --output text \
  | sed "s|^${PREFIX}/||" \
  | awk -F'\t' 'NF >= 2 { key = $1; sub(/^[^\t]*\t/, ""); print key "=" $0 }' \
  > "$TMP"

# Never install a truncated env file over a working one -- env.js throws on a
# missing MONGO_URI/JWT_SECRET/CLIENT_URL and the service would fail to boot.
if ! grep -q '^MONGO_URI=' "$TMP"; then
  echo "render-env: MONGO_URI missing from $PREFIX -- refusing to overwrite $TARGET" >&2
  exit 1
fi

install -o notwhat -g notwhat -m 600 "$TMP" "$TARGET"
echo "render-env: wrote $(wc -l < "$TARGET") vars to $TARGET"
