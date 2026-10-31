#!/usr/bin/env bash
# GuardHai — restart the preview server on a given port (default 8123).
#
#   bash tools/preview.sh          # restart on 8123
#   bash tools/preview.sh 8130     # or another port
#
# Clears anything already holding the port, then serves with no-store caching.
set -u
PORT="${1:-8123}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

# 1. clear a stale listener, if any
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 && echo "cleared stale listener on ${PORT}"
fi

# 2. start
nohup python3 tools/serve.py "$PORT" >/tmp/guardhai-preview.log 2>&1 &
PID=$!
echo "started pid ${PID} on port ${PORT}"

# 3. wait until it answers (max ~10 s)
for i in $(seq 1 20); do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:${PORT}/index.html" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "OK  http://0.0.0.0:${PORT}/  (index.html 200)"
    exit 0
  fi
  sleep 0.5
done

echo "FAILED to answer on ${PORT} after 10s — log:" >&2
tail -20 /tmp/guardhai-preview.log >&2
exit 1
