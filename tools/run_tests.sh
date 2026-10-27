#!/usr/bin/env bash
# GuardHai — run the whole verification set against a local server.
#
#   bash tools/run_tests.sh [port]
#
# Starts nothing itself: point it at a running server (default 8123) and make
# sure Playwright is available through NODE_PATH (see docs/ARCHITECTURE.md §7).
set -u

PORT="${1:-8123}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="http://127.0.0.1:${PORT}/index.html"
export NODE_PATH="${NODE_PATH:-/tmp/pw/node_modules}"

fail=0
echo "GuardHai test run — ${URL}"
echo

python3 "${ROOT}/tools/verify_app.py" || fail=1
echo

for suite in home composer bugfix profile; do
  echo "── ${suite}.spec.js"
  node "${ROOT}/tests/${suite}.spec.js" "${URL}" | tail -3
  status=${PIPESTATUS[0]}
  [ "${status}" -ne 0 ] && fail=1
  echo
done

if [ "${fail}" -ne 0 ]; then
  echo "RESULT: at least one suite failed"
  exit 1
fi
echo "RESULT: all checks passed"
