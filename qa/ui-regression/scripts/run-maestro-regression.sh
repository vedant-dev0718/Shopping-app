#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-current}"
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
ADB_BIN="${ADB_BIN:-$HOME/Library/Android/sdk/platform-tools/adb}"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
OUT_DIR="$ROOT_DIR/qa/ui-regression/screenshots/$MODE/app"

if [[ "$MODE" != "current" && "$MODE" != "baseline" ]]; then
  echo "Usage: run-maestro-regression.sh [current|baseline]"
  exit 1
fi

if [[ ! -x "$ADB_BIN" ]]; then
  echo "adb not found at $ADB_BIN"
  exit 1
fi

if [[ ! -x "$MAESTRO_BIN" ]]; then
  echo "maestro not found at $MAESTRO_BIN"
  echo "Install it with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
  exit 1
fi

mkdir -p "$OUT_DIR"

"$ADB_BIN" start-server >/dev/null
if ! "$ADB_BIN" get-state >/dev/null 2>&1; then
  echo "No Android device/emulator detected."
  exit 1
fi

run_variant() {
  local name="$1"
  local flow="$2"
  local app_id="$3"

  echo "[maestro] Running flow for $name"
  "$MAESTRO_BIN" test "$ROOT_DIR/$flow"

  echo "[adb] Capturing screenshot for $name"
  "$ADB_BIN" shell am start -n "$app_id/com.notwhat.app.MainActivity" >/dev/null
  "$ADB_BIN" exec-out screencap -p > "$OUT_DIR/$name.png"
}

run_variant "buyer" ".maestro/flows/buyer_login_home.yaml" "com.notwhat.app.buyer"
run_variant "seller" ".maestro/flows/seller_login_console.yaml" "com.notwhat.app.seller"
run_variant "admin" ".maestro/flows/admin_login_console.yaml" "com.notwhat.app.admin"

echo "Saved app screenshots in $OUT_DIR"
