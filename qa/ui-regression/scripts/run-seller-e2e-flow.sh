#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-current}"
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
ADB_BIN="${ADB_BIN:-$HOME/Library/Android/sdk/platform-tools/adb}"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
FLOW_PATH="$ROOT_DIR/.maestro/flows/seller_e2e_visual_flow.yaml"
FLOW_NAME="seller_e2e_visual_flow"
APP_SCREENSHOT_DIR="$ROOT_DIR/qa/ui-regression/screenshots/$MODE/seller-e2e"
LOG_DIR="$ROOT_DIR/qa/ui-regression/logs/$MODE/seller-e2e"

if [[ "$MODE" != "current" && "$MODE" != "baseline" ]]; then
  echo "Usage: run-seller-e2e-flow.sh [current|baseline]"
  exit 1
fi

if [[ ! -x "$ADB_BIN" ]]; then
  echo "adb not found at $ADB_BIN"
  exit 1
fi

if [[ ! -x "$MAESTRO_BIN" ]]; then
  echo "maestro not found at $MAESTRO_BIN"
  exit 1
fi

mkdir -p "$APP_SCREENSHOT_DIR" "$LOG_DIR"

"$ADB_BIN" start-server >/dev/null
if ! "$ADB_BIN" get-state >/dev/null 2>&1; then
  echo "No Android device/emulator detected."
  exit 1
fi

echo "[maestro] running seller e2e visual flow ($MODE)"
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

copy_named_screenshot "seller_01_auth_login" "auth_login"
copy_named_screenshot "seller_02_dashboard" "dashboard"
copy_named_screenshot "seller_03_insights" "insights"
copy_named_screenshot "seller_04_orders" "orders"
copy_named_screenshot "seller_05_products" "products"
copy_named_screenshot "seller_06_returns" "returns"
copy_named_screenshot "seller_07_upload_reel" "upload_reel"

echo "Saved seller e2e screenshots: $APP_SCREENSHOT_DIR"
