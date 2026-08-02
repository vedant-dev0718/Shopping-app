#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-current}"
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
ADB_BIN="${ADB_BIN:-$HOME/Library/Android/sdk/platform-tools/adb}"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
APP_SCREENSHOT_DIR="$ROOT_DIR/qa/ui-regression/screenshots/$MODE/seller"
HIERARCHY_DIR="$ROOT_DIR/qa/ui-regression/hierarchy/$MODE/seller"
LOG_DIR="$ROOT_DIR/qa/ui-regression/logs/$MODE/seller"

if [[ "$MODE" != "current" && "$MODE" != "baseline" ]]; then
  echo "Usage: run-seller-checkpoints.sh [current|baseline]"
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

mkdir -p "$APP_SCREENSHOT_DIR" "$HIERARCHY_DIR" "$LOG_DIR"

"$ADB_BIN" start-server >/dev/null
if ! "$ADB_BIN" get-state >/dev/null 2>&1; then
  echo "No Android device/emulator detected."
  exit 1
fi

capture_hierarchy() {
  local checkpoint="$1"
  "$ADB_BIN" shell uiautomator dump /sdcard/uidump.xml >/dev/null 2>&1 || true
  "$ADB_BIN" pull /sdcard/uidump.xml "$HIERARCHY_DIR/$checkpoint.xml" >/dev/null 2>&1 || true
}

run_checkpoint() {
  local checkpoint="$1"
  local flow="$2"

  echo "[maestro] checkpoint=$checkpoint"
  "$MAESTRO_BIN" test "$ROOT_DIR/$flow" | tee "$LOG_DIR/$checkpoint.log"

  echo "[adb] screenshot=$checkpoint"
  "$ADB_BIN" exec-out screencap -p > "$APP_SCREENSHOT_DIR/$checkpoint.png"
  capture_hierarchy "$checkpoint"
}

run_checkpoint "dashboard" ".maestro/flows/seller_checkpoint_dashboard.yaml"
run_checkpoint "insights" ".maestro/flows/seller_checkpoint_insights.yaml"
run_checkpoint "orders" ".maestro/flows/seller_checkpoint_orders.yaml"
run_checkpoint "products" ".maestro/flows/seller_checkpoint_products.yaml"
run_checkpoint "returns" ".maestro/flows/seller_checkpoint_returns.yaml"
run_checkpoint "upload_reel" ".maestro/flows/seller_checkpoint_upload_reel.yaml"

echo "Saved seller screenshots: $APP_SCREENSHOT_DIR"
echo "Saved seller hierarchy dumps: $HIERARCHY_DIR"
echo "Saved seller logs: $LOG_DIR"
