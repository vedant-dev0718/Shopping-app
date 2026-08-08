#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-current}"
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
FLOW_PATH="$ROOT_DIR/.maestro/flows/buyer_accepted_bid_paynow_ios.yaml"
APP_SCREENSHOT_DIR="$ROOT_DIR/qa/ui-regression/screenshots/$MODE/buyer-ios-accepted-bid"
LOG_DIR="$ROOT_DIR/qa/ui-regression/logs/$MODE/buyer-ios-accepted-bid"

if [[ "$MODE" != "current" && "$MODE" != "baseline" ]]; then
  echo "Usage: run-buyer-ios-accepted-bid-flow.sh [current|baseline]"
  exit 1
fi

if [[ ! -x "$MAESTRO_BIN" ]]; then
  echo "maestro not found at $MAESTRO_BIN"
  exit 1
fi

mkdir -p "$APP_SCREENSHOT_DIR" "$LOG_DIR"

echo "[maestro] running buyer accepted-bid iOS flow ($MODE)"
"$MAESTRO_BIN" test "$FLOW_PATH" | tee "$LOG_DIR/flow.log"

LATEST_RUN_DIR="$(ls -1dt "$HOME/.maestro/tests"/* 2>/dev/null | head -1 || true)"
if [[ -z "$LATEST_RUN_DIR" ]]; then
  echo "No Maestro run directory found in $HOME/.maestro/tests"
  exit 1
fi

SRC_ROOT_DIR="$LATEST_RUN_DIR"

copy_named_screenshot() {
  local source_name="$1"
  local target_name="$2"
  local match
  match="$(find "$SRC_ROOT_DIR" -type f -name "${source_name}.png" | head -1 || true)"
  if [[ -z "$match" ]]; then
    echo "Missing screenshot for step: $source_name"
    exit 1
  fi
  cp "$match" "$APP_SCREENSHOT_DIR/$target_name.png"
  echo "[ok] copied $target_name.png"
}

copy_named_screenshot "buyer_ios_accepted_bid_01_bargains" "accepted_bid_bargains"
copy_named_screenshot "buyer_ios_accepted_bid_02_cart" "accepted_bid_cart"

echo "Saved buyer iOS accepted-bid screenshots: $APP_SCREENSHOT_DIR"
