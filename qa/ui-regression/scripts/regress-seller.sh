#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

export PATH="$PATH:$HOME/.maestro/bin"

cd "$ROOT_DIR"
bash qa/ui-regression/scripts/run-seller-checkpoints.sh current

cd "$ROOT_DIR/qa/ui-regression"
npm run capture:stitch:seller
npm run compare:seller

echo "Seller regression complete."
