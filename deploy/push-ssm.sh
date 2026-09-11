#!/usr/bin/env bash
#
# Uploads backend/.env into SSM Parameter Store under /notwhat/prod/.
# Run from your Mac, once, before the first deploy.
#
#   ./deploy/push-ssm.sh [path-to-env-file]
#
# The AWS access keys are deliberately skipped: the EC2 instance role supplies
# credentials via instance metadata, and src/config/env.js falls back to that
# when the vars are empty.
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
PREFIX="/notwhat/prod"
ENV_FILE="${1:-$(dirname "$0")/../backend/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

SKIP_KEYS="AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY"
# Test-only OTP bypasses must never reach production.
DANGEROUS_KEYS="SIGNUP_OTP_TEST_CODE PASSWORD_RESET_OTP_TEST_CODE"

count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in ''|\#*) continue;; esac
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  val="${line#*=}"   # split on FIRST '=' only; base64 secrets contain '='

  if [[ " $SKIP_KEYS $DANGEROUS_KEYS " == *" $key "* ]]; then
    echo "skip  $key"
    continue
  fi

  # SSM rejects empty values; env.js already defaults these.
  if [[ -z "$val" ]]; then
    echo "empty $key"
    continue
  fi

  aws ssm put-parameter --region "$REGION" --overwrite \
    --name "$PREFIX/$key" --value "$val" --type SecureString >/dev/null
  echo "put   $key"
  count=$((count + 1))
done < "$ENV_FILE"

echo
echo "Uploaded $count parameters to $PREFIX/ in $REGION."
echo
echo "Now override the production-specific values:"
cat <<'EOF'

  aws ssm put-parameter --region us-east-2 --overwrite --type SecureString \
    --name /notwhat/prod/MONGO_URI --value 'mongodb+srv://...'

  for kv in NODE_ENV=production \
            PORT=5001 \
            API_PUBLIC_BASE_URL=https://api.yourdomain.com \
            CLIENT_URLS=https://yourdomain.com; do
    aws ssm put-parameter --region us-east-2 --overwrite --type SecureString \
      --name "/notwhat/prod/${kv%%=*}" --value "${kv#*=}"
  done
EOF
