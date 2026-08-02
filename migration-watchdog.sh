#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

INTERVAL_SECONDS="${INTERVAL_SECONDS:-120}"
REQUIRE_IOS="${REQUIRE_IOS:-0}"
MAX_CONSECUTIVE_PASSES="${MAX_CONSECUTIVE_PASSES:-2}"
RUN_ONCE="${RUN_ONCE:-1}"

pass_streak=0
iteration=0

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }

run_check() {
  local name="$1"
  shift
  echo "[$(timestamp)] CHECK: $name"
  if "$@"; then
    echo "[$(timestamp)] PASS:  $name"
    return 0
  else
    echo "[$(timestamp)] FAIL:  $name"
    return 1
  fi
}

backend_node_check() {
  cd "$ROOT_DIR/backend"
  npm test -- --runInBand >/tmp/notwhat-backend-test.log 2>&1
}

backend_spring_check() {
  cd "$ROOT_DIR/backend-spring"
  if [[ -x "./mvnw" ]]; then
    ./mvnw -q test >/tmp/notwhat-spring-test.log 2>&1
  else
    mvn -q test >/tmp/notwhat-spring-test.log 2>&1
  fi
}

shared_kmp_check() {
  cd "$ROOT_DIR/shared"
  if [[ -x "./gradlew" ]]; then
    ./gradlew -q test >/tmp/notwhat-shared-test.log 2>&1
  else
    gradle -q test >/tmp/notwhat-shared-test.log 2>&1
  fi
}

ios_check() {
  cd "$ROOT_DIR"
  xcodebuild test \
    -project ios/NotWhat.xcodeproj \
    -scheme NotWhat \
    -destination 'platform=iOS Simulator,name=iPhone 16' \
    >/tmp/notwhat-ios-test.log 2>&1
}

is_marked_complete() {
  [[ -f "$ROOT_DIR/.migration-complete" ]]
}

while true; do
  iteration=$((iteration + 1))
  all_ok=1

  run_check "Node backend tests" backend_node_check || all_ok=0
  run_check "Spring backend tests" backend_spring_check || all_ok=0
  run_check "KMP shared tests" shared_kmp_check || all_ok=0

  if [[ "$REQUIRE_IOS" == "1" ]]; then
    run_check "iOS tests" ios_check || all_ok=0
  fi

  if [[ "$all_ok" == "1" ]]; then
    pass_streak=$((pass_streak + 1))
  else
    pass_streak=0
  fi

  if is_marked_complete && [[ "$pass_streak" -ge "$MAX_CONSECUTIVE_PASSES" ]]; then
    echo "[$(timestamp)] MIGRATION COMPLETE"
    exit 0
  fi

  if [[ "$RUN_ONCE" == "1" ]]; then
    echo "[$(timestamp)] RUN_ONCE done"
    exit 0
  fi

  sleep "$INTERVAL_SECONDS"
done
