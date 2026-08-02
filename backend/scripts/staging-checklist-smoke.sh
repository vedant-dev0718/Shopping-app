#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   STAGING_BASE_URL=https://staging-api.example.com TEST_RESET_EMAIL=buyer@example.com \
#   bash backend/scripts/staging-checklist-smoke.sh

BASE_URL="${STAGING_BASE_URL:-}"
TEST_RESET_EMAIL="${TEST_RESET_EMAIL:-}"
VERIFY_RATE_LIMIT_EMAIL="${VERIFY_RATE_LIMIT_EMAIL:-verify-reset-$(date +%s)@example.com}"
SHIPROCKET_EXPECT_503="${SHIPROCKET_EXPECT_503:-false}"

if [[ -z "$BASE_URL" ]]; then
  echo "ERROR: STAGING_BASE_URL is required (for example: https://staging-api.example.com)"
  exit 1
fi

if [[ -z "$TEST_RESET_EMAIL" ]]; then
  echo "ERROR: TEST_RESET_EMAIL is required for forgot-password smoke check"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

pass_count=0
fail_count=0

report_pass() {
  pass_count=$((pass_count + 1))
  echo "[PASS] $1"
}

report_fail() {
  fail_count=$((fail_count + 1))
  echo "[FAIL] $1"
}

check_status_exact() {
  local name="$1"
  local expected_status="$2"
  local method="$3"
  local path="$4"
  local body="${5:-}"
  local extra_header="${6:-}"

  local response_file
  response_file="$(mktemp)"

  local status
  if [[ -n "$body" ]]; then
    if [[ -n "$extra_header" ]]; then
      status=$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -H "$extra_header" -d "$body")
    else
      status=$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -d "$body")
    fi
  else
    status=$(curl -sS -o "$response_file" -w "%{http_code}" -X "$method" "$BASE_URL$path")
  fi

  if [[ "$status" == "$expected_status" ]]; then
    report_pass "$name (status=$status)"
  else
    report_fail "$name (expected=$expected_status actual=$status body=$(cat "$response_file"))"
  fi

  rm -f "$response_file"
}

echo "Running staging smoke checks against: $BASE_URL"

echo "1) Health check"
check_status_exact "GET /api/health" "200" "GET" "/api/health"

echo "2) Forgot password happy path"
check_status_exact "POST /api/auth/forgot-password" "200" "POST" "/api/auth/forgot-password" "{\"email\":\"$TEST_RESET_EMAIL\"}"

echo "3) verify-reset-otp 429 limiter behavior"
# First attempts are expected 400 (invalid OTP), then 429 once limiter threshold is crossed.
last_status=""
for attempt in $(seq 1 11); do
  status=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/verify-reset-otp" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$VERIFY_RATE_LIMIT_EMAIL\",\"otp\":\"000000\"}")
  last_status="$status"
done

if [[ "$last_status" == "429" ]]; then
  report_pass "POST /api/auth/verify-reset-otp returns 429 after threshold"
else
  report_fail "POST /api/auth/verify-reset-otp expected 429 after threshold, got $last_status"
fi

echo "4) Shiprocket bad signature (expects 400 when webhook secret is configured)"
check_status_exact "POST /webhooks/shiprocket invalid signature" "400" "POST" "/webhooks/shiprocket" "{\"shipment_id\":123,\"current_status\":\"DELIVERED\"}" "x-shiprocket-signature: invalid-signature"

if [[ "$SHIPROCKET_EXPECT_503" == "true" ]]; then
  echo "5) Shiprocket missing secret mode (expects 503 in production)"
  check_status_exact "POST /webhooks/shiprocket missing secret returns 503" "503" "POST" "/webhooks/shiprocket" "{\"shipment_id\":123,\"current_status\":\"DELIVERED\"}"
fi

echo ""
echo "Staging smoke summary: PASS=$pass_count FAIL=$fail_count"
if [[ "$fail_count" -gt 0 ]]; then
  exit 2
fi
