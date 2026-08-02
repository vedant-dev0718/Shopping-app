#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
STITCH_THRESHOLD_PCT="${STITCH_THRESHOLD_PCT:-35}"

cd "$ROOT_DIR"
bash qa/ui-regression/scripts/run-admin-e2e-flow.sh current

cd "$ROOT_DIR/qa/ui-regression"
node scripts/capture-admin-e2e-stitch.mjs
STITCH_THRESHOLD_PCT="$STITCH_THRESHOLD_PCT" node scripts/compare-admin-e2e.mjs

echo "Admin e2e visual regression complete. stitch_threshold=${STITCH_THRESHOLD_PCT}%"
