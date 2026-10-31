#!/usr/bin/env bash
# GuardHai — run the whole verification set against a local server.
#
#   bash tools/run_tests.sh [port]
#
# Starts the server itself if nothing answers on the port, repairs the browser
# harness if it is missing, then runs every suite (see docs/ARCHITECTURE.md §7).
set -u

PORT="${1:-8123}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="http://127.0.0.1:${PORT}/index.html"
export NODE_PATH="${NODE_PATH:-/tmp/pw/node_modules}"

fail=0
echo "GuardHai test run — ${URL}"
echo

# 0. preflight — a dead server makes every suite fail with a misleading
#    "AuthFlow is not defined", so say it plainly instead.
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "${URL}" 2>/dev/null)
if [ "${code}" != "200" ]; then
  echo "· nothing answering on ${PORT} — starting the preview"
  bash "${ROOT}/tools/preview.sh" "${PORT}" || { echo "RESULT: no server on ${PORT}"; exit 1; }
  echo
fi

# 1. browser harness — idempotent, a no-op (≈50 ms) when it is already there
bash "${ROOT}/tools/setup_tests.sh" | sed 's/^/· /'
harness=${PIPESTATUS[0]}          # not $? — that would be sed's status
if [ "${harness}" -ne 0 ]; then
  echo "RESULT: browser harness unavailable (see tools/setup_tests.sh)"; exit 1
fi
echo

python3 "${ROOT}/tools/verify_app.py" || fail=1
echo

for suite in home composer bugfix profile showcase refine posttypes hero identity health network shield storage; do
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
