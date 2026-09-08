#!/usr/bin/env bash
#
# One release pipeline: local checks -> EAS build -> e2e on real devices -> store submit.
#
# Written to run in CodeBuild (that is why every wait lives here and not on a laptop). It is
# runnable by hand too: `bash apps/mobile/app/e2e/release.sh ios`.
#
# Order is deliberate. The steps that have actually broken releases in this repo come BEFORE
# any binary is built or shipped:
#   1. jest — including the suites that mount the real signed-in tree and the login screen.
#      A missing provider or a field pushed under the keyboard is invisible to tsc and to
#      `expo export`, and it shipped to both stores once (builds 8/9) exactly this way.
#   2. tsc + expo export — cheap, catches the rest.
#   3. EAS build of the `e2e` profile — the binary the device farm can install.
#   4. Device Farm run — login in one language, avatar, profile (language switch, links),
#      a real model answer, the right-edge drawer, the browser hand-off. Plus the Langfuse
#      assertion, so "answered but not traced" is a red build.
#   5. Only then the store build (`production`) and `eas submit`.
#
# Nothing is submitted unless every earlier step passed: each step exits non-zero and
# `set -e` stops the pipeline.
#
# Usage:  release.sh [ios|android|all]
#
# Required in the environment (CodeBuild: project env vars / secrets):
#   EXPO_TOKEN            EAS authentication (robot token)
#   AWS_REGION            for the Device Farm step, e.g. eu-north-1
#   CLERK_SECRET_KEY      run_devicefarm.py flips test mode for the fixture user
#   LANGFUSE_*            read by run_devicefarm.py for the tracing assertion
# Optional:
#   SKIP_E2E=1            skip step 4 (use only when the device farm is unavailable)
#
# The `e2e` profile is internal distribution: it exists to be installed on Device Farm and is
# never submitted. What reaches the stores is the `production` build, submitted through the
# `production` submit profile in eas.json with nothing overriding it.

set -euo pipefail

PLATFORM="${1:-all}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
E2E_DIR="$APP_DIR/e2e"
EAS="npx --yes eas-cli@23.2.0"

# The committed ios/ directory makes eas-cli ask for the Apple Team ID even with
# --non-interactive; these two answer it without a prompt.
export EXPO_APPLE_TEAM_ID="${EXPO_APPLE_TEAM_ID:-3Q8MF8D9J4}"
export EXPO_APPLE_TEAM_TYPE="${EXPO_APPLE_TEAM_TYPE:-COMPANY_OR_ORGANIZATION}"

step() { printf '\n=== %s ===\n' "$1"; }

# ---------------------------------------------------------------------------- 1. unit tests
step "jest (mounts the real trees: signed-in navigator, login screen, offline gate)"
cd "$APP_DIR"
npx jest --ci --silent

step "typecheck"
npx tsc --noEmit

step "expo export (bundling errors surface here, not on a device)"
rm -rf /tmp/elli-export
npx expo export --platform all --output-dir /tmp/elli-export > /tmp/elli-export.log 2>&1 || {
  tail -40 /tmp/elli-export.log
  exit 1
}
rm -rf /tmp/elli-export /tmp/elli-export.log

# ------------------------------------------------------------------- 2. e2e build + devices
run_e2e() {
  local platform="$1"

  step "EAS build (profile e2e, $platform)"
  # --wait: the artifact URL is the input of the device farm step.
  $EAS build --profile e2e --platform "$platform" --non-interactive --wait

  local url
  url="$($EAS build:list --platform "$platform" --buildProfile e2e --status finished \
    --limit 1 --non-interactive --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["artifacts"]["applicationArchiveUrl"])')"
  echo "artifact: $url"

  if [ "${SKIP_E2E:-0}" = "1" ]; then
    echo "SKIP_E2E=1 -> device farm skipped"
    return 0
  fi

  step "Device Farm ($platform)"
  cd "$E2E_DIR"
  PLATFORM="$platform" APP_ARCHIVE_URL="$url" python3 run_devicefarm.py
  cd "$APP_DIR"
}

# --------------------------------------------------------------- 3. store build + submit
release() {
  local platform="$1"

  step "EAS build (profile production, $platform)"
  $EAS build --profile production --platform "$platform" --non-interactive --wait

  local build_id
  build_id="$($EAS build:list --platform "$platform" --buildProfile production --status finished \
    --limit 1 --non-interactive --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')"
  echo "build: $build_id"

  step "submit ($platform)"
  if [ "$platform" = "android" ]; then
    # No track override: eas.json's production submit profile decides where it lands.
    $EAS submit --profile production --platform android --id "$build_id" --non-interactive
  else
    # iOS: this uploads to App Store Connect. TestFlight *internal* testers get it as soon as
    # processing ends; reaching EXTERNAL testers or the store still needs a review submission,
    # which EAS cannot do — see the note printed below.
    $EAS submit --profile production --platform ios --id "$build_id" --non-interactive
    cat <<'NOTE'

iOS is uploaded, not yet public. To make it available beyond internal TestFlight:
App Store Connect -> TestFlight -> add the build to an external group (starts a review),
or Distribution -> submit for App Store review. There is no EAS command for that step.
NOTE
  fi
}

case "$PLATFORM" in
  ios)     run_e2e ios;     release ios ;;
  android) run_e2e android; release android ;;
  all)
    run_e2e android
    run_e2e ios
    release android
    release ios
    ;;
  *)
    echo "usage: release.sh [ios|android|all]" >&2
    exit 2
    ;;
esac

step "done"
