#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   LOG_FILE=/var/log/notwhat/backend.log bash backend/scripts/monitor-hardening-metrics.sh
#
# Optional:
#   SINCE_LINES=20000   # number of recent lines to scan (default: 20000)

LOG_FILE="${LOG_FILE:-}"
SINCE_LINES="${SINCE_LINES:-20000}"

if [[ -z "$LOG_FILE" ]]; then
  echo "ERROR: LOG_FILE is required"
  exit 1
fi

if [[ ! -f "$LOG_FILE" ]]; then
  echo "ERROR: LOG_FILE does not exist: $LOG_FILE"
  exit 1
fi

window_file="$(mktemp)"
tail -n "$SINCE_LINES" "$LOG_FILE" > "$window_file"

count_pattern() {
  local label="$1"
  local pattern="$2"
  local count
  count=$(grep -Eic "$pattern" "$window_file" || true)
  echo "$label: $count"
}

echo "Hardening metrics report"
echo "Log file: $LOG_FILE"
echo "Scanned lines: $SINCE_LINES"
echo "Generated at (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

echo "Auth reset 429 counts"
count_pattern "forgot-password 429" "(/api/auth/forgot-password|auth/forgot-password).*(429|Too many password reset codes requested)"
count_pattern "verify-reset-otp 429" "(/api/auth/verify-reset-otp|auth/verify-reset-otp).*(429|Too many reset code verification attempts)"
count_pattern "reset-password 429" "(/api/auth/reset-password|auth/reset-password).*(429|Too many reset password attempts)"

echo ""
echo "Shiprocket webhook rejection counts"
count_pattern "shiprocket 400 invalid signature" "(/webhooks/shiprocket).*(400|Invalid Shiprocket webhook signature)"
count_pattern "shiprocket 503 misconfiguration" "(/webhooks/shiprocket).*(503|Shiprocket webhook is not configured)"

echo ""
echo "Server health smoke"
count_pattern "5xx responses (all endpoints)" "\s5[0-9]{2}\s"

rm -f "$window_file"
