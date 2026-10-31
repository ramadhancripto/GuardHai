#!/usr/bin/env bash
# GuardHai — make the browser harness ready, idempotently.
#
#   bash tools/setup_tests.sh            # install / repair what is missing
#   bash tools/setup_tests.sh --check    # exit 1 if anything is missing, change nothing
#
# Why this exists: `tests/*.spec.js` drive Playwright, but the sandbox keeps only
# /home/user. Node modules live in /tmp and are wiped, and chromium needs system
# libraries that are not installed in a fresh container. Without this, every
# suite fails with a misleading `ReferenceError: AuthFlow is not defined`
# (the page never loaded, so the app's globals never existed).
#
# Layout it produces (all recreateable, nothing secret):
#   ${GH_PW_DIR:-/tmp/pw}/node_modules/playwright   the driver
#   $HOME/.cache/ms-playwright/...                  the chromium headless shell
set -u

PW_DIR="${GH_PW_DIR:-/tmp/pw}"
PW_VERSION="${GH_PW_VERSION:-1.55.0}"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

say() { printf '%s\n' "$*"; }
have_mod() { [ -d "${PW_DIR}/node_modules/playwright" ]; }
# playwright nests the binary two or three levels down depending on the build
shell_bin() {
  find "${HOME}/.cache/ms-playwright" -name 'chrome-headless-shell' -type f 2>/dev/null | sort | head -1
}
have_bin() { [ -n "$(shell_bin)" ]; }
missing_libs() {
  local bin; bin="$(shell_bin)"
  [ -n "$bin" ] || { echo "no-browser"; return; }
  ldd "$bin" 2>/dev/null | awk '/not found/{print $1}' | tr '\n' ' '
}

MOD_OK=0; BIN_OK=0; LIB_OK=0
have_mod && MOD_OK=1
have_bin && BIN_OK=1
[ "$(missing_libs)" = "" ] && LIB_OK=1

if [ "$CHECK" = "1" ]; then
  say "module=${MOD_OK} browser=${BIN_OK} libs=${LIB_OK} ($(missing_libs))"
  [ "$MOD_OK$BIN_OK$LIB_OK" = "111" ] && exit 0 || exit 1
fi

# ---------------------------------------------------------------- 1. the driver
if [ "$MOD_OK" = "0" ]; then
  say "· installing playwright@${PW_VERSION} into ${PW_DIR}"
  mkdir -p "${PW_DIR}"
  ( cd "${PW_DIR}" && [ -f package.json ] || npm init -y >/dev/null 2>&1
    cd "${PW_DIR}" && npm install "playwright@${PW_VERSION}" --no-audit --no-fund >/dev/null 2>&1 ) \
    || { say "! npm install failed (network?)"; exit 1; }
fi

# ---------------------------------------------------------------- 2. the browser
if [ "$BIN_OK" = "0" ]; then
  say "· downloading the chromium headless shell"
  ( cd "${PW_DIR}" && npx playwright install chromium >/dev/null 2>&1 ) \
    || { say "! browser download failed"; exit 1; }
fi

# ------------------------------------------------------ 3. the system libraries
if [ "$LIB_OK" = "0" ]; then
  libs="$(missing_libs)"
  say "· missing system libraries: ${libs}"
  if sudo -n true 2>/dev/null; then
    ( cd "${PW_DIR}" && sudo -n env PATH="$PATH" npx playwright install-deps chromium >/dev/null 2>&1 ) \
      || say "! install-deps failed — run: sudo npx playwright install-deps chromium"
  else
    say "! no passwordless sudo: install manually → apt-get install libnspr4 libnss3 libasound2t64"
  fi
fi

# ---------------------------------------------------------------- 4. the verdict
MOD_OK=0; BIN_OK=0; LIB_OK=0
have_mod && MOD_OK=1
have_bin && BIN_OK=1
[ "$(missing_libs)" = "" ] && LIB_OK=1

if [ "$MOD_OK$BIN_OK$LIB_OK" = "111" ]; then
  say "OK  harness ready — NODE_PATH=${PW_DIR}/node_modules"
  exit 0
fi
say "FAILED module=${MOD_OK} browser=${BIN_OK} libs=${LIB_OK}"
exit 1
