#!/usr/bin/env python3
"""
GuardHai — static preview server.

  python3 tools/serve.py [port]        # default 8123

Same behaviour as `python3 -m http.server`, with two differences that matter for
the live preview:

  1. Every response carries `Cache-Control: no-store`, so an edited file is never
     served from the browser cache inside the preview iframe.
  2. Binds 0.0.0.0 by default, so the preview proxy can reach it.

No dependencies, no build step — this only serves the folder it lives in.
"""
from __future__ import annotations

import functools
import http.server
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # keep the log scannable
        msg = fmt % args
        if " 200 " in msg or " 304 " in msg:
            return
        super().log_message(fmt, *args)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=str(ROOT))
    with Server(("0.0.0.0", PORT), handler) as httpd:
        print(f"GuardHai preview → http://0.0.0.0:{PORT}/  (root {ROOT})", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
