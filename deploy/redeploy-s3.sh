#!/usr/bin/env bash
#
# One-command redeploy over S3, for use until a GitHub deploy key exists.
# Run from your Mac, at the repo root:
#
#   ./deploy/redeploy-s3.sh
#
# Packages backend/ + deploy/, uploads to S3, then drives the instance over
# SSM to extract, reinstall, and restart. Health-checks at the end.
#
# Once the deploy key is added, switch to deploy.sh on the instance (git pull)
# and retire this script.
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
INSTANCE="${NOTWHAT_INSTANCE:-i-0bc5980208dc5cd8c}"
BUCKET="${NOTWHAT_DEPLOY_BUCKET:-notwhat-bucket--use2-az2--x-s3}"
KEY="_deploy/notwhat-app.tar.gz"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Packaging"
TARBALL="$(mktemp -t notwhat-app).tar.gz"
trap 'rm -f "$TARBALL"' EXIT
tar --exclude=node_modules --exclude=.git --exclude=.env \
    --exclude=.mongo-data --exclude=.DS_Store \
    -czf "$TARBALL" -C "$ROOT" backend deploy
echo "    $(du -h "$TARBALL" | cut -f1)"

echo "==> Uploading to s3://$BUCKET/$KEY"
aws s3api put-object --bucket "$BUCKET" --key "$KEY" \
  --body "$TARBALL" --region "$REGION" >/dev/null

echo "==> Deploying on $INSTANCE"
cat > /tmp/notwhat-redeploy.json <<JSON
{"commands":[
"set -eu",
"cd /opt/notwhat/app",
"cp -a backend/.env /tmp/env.bak 2>/dev/null || true",
"aws s3api get-object --bucket $BUCKET --key $KEY --region $REGION /tmp/app.tar.gz >/dev/null",
"tar xzf /tmp/app.tar.gz -C /opt/notwhat/app",
"cp -a /tmp/env.bak backend/.env 2>/dev/null || true",
"chown -R notwhat:notwhat /opt/notwhat/app",
"cd backend && sudo -u notwhat npm ci --omit=dev >/tmp/npm.log 2>&1 || (tail -20 /tmp/npm.log; exit 1)",
"install -m 755 /opt/notwhat/app/deploy/render-env.sh /opt/notwhat/render-env.sh",
"install -m 644 /opt/notwhat/app/deploy/notwhat-api.service /etc/systemd/system/notwhat-api.service",
"systemctl daemon-reload",
"systemctl restart notwhat-api",
"sleep 6",
"curl -fsS -m 5 http://127.0.0.1:5001/api/health >/dev/null && echo DEPLOY_OK || (journalctl -u notwhat-api -n 30 --no-pager; exit 1)"
]}
JSON

CMD=$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript --timeout-seconds 1800 \
  --parameters file:///tmp/notwhat-redeploy.json \
  --query 'Command.CommandId' --output text)

for _ in $(seq 1 60); do
  S=$(aws ssm get-command-invocation --region "$REGION" --command-id "$CMD" \
      --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)
  [ "$S" = InProgress ] || [ "$S" = Pending ] || break
  sleep 10
done

OUT=$(aws ssm get-command-invocation --region "$REGION" --command-id "$CMD" \
      --instance-id "$INSTANCE" --query 'StandardOutputContent' --output text)

if [ "$S" = Success ] && printf '%s' "$OUT" | grep -q DEPLOY_OK; then
  echo "==> Deployed. API healthy."
else
  echo "!! Deploy failed (status: $S)" >&2
  printf '%s\n' "$OUT" | tail -30 >&2
  exit 1
fi
