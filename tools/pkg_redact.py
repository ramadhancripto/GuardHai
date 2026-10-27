#!/usr/bin/env python3
"""
Credential redaction for the shipped package.

    python3 tools/pkg_redact.py <package-root>

Rewrites the Firebase web-config values in every text file under the package
root with deployment placeholders, and drops a short notice above the config so
a reader knows why they do not work out of the box.

The rules are written by *field name*, never by secret value, so this script
contains no credentials itself. The working tree is not touched: pass a staging
directory, never the repo root.

Exit code 1 means a live-looking value is still present somewhere in the tree.
"""
from __future__ import annotations

import pathlib
import re
import sys

PLACEHOLDERS = {
    "apiKey": "YOUR_FIREBASE_API_KEY",
    "authDomain": "YOUR_PROJECT.firebaseapp.com",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_PROJECT.firebasestorage.app",
    "messagingSenderId": "YOUR_FIREBASE_SENDER_ID",
    "appId": "YOUR_FIREBASE_APP_ID",
    "measurementId": "YOUR_MEASUREMENT_ID",
}

TEXT_SUFFIXES = {".js", ".html", ".css", ".json", ".md", ".txt", ".py", ".sh", ".csv", ".yml", ".yaml"}

FIELD_RE = re.compile(
    r"""(\b(?:%s)\b\s*:\s*)(['"])([^'"]*)\2""" % "|".join(PLACEHOLDERS)
)
LEAK_RE = re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b|firebaseio\.com|firebasestorage\.app")

NOTICE = """/* ---------------------------------------------------------------------------
   Firebase configuration placeholders.

   Replace these six values with the ones from your own Firebase project
   (Console → Project settings → General → Your apps) before deploying.
   The rest of GuardHai runs without them: Firebase is optional and is loaded
   with a dynamic import, so an unconfigured build still works offline.
   --------------------------------------------------------------------------- */
const firebaseConfig = {"""


def redact_text(text: str) -> tuple[str, int]:
    count = 0

    def repl(match: re.Match) -> str:
        nonlocal count
        prefix, quote, value = match.group(1), match.group(2), match.group(3)
        field = re.match(r"\w+", prefix).group(0)
        if value.startswith("YOUR_"):
            return match.group(0)
        count += 1
        return f"{prefix}{quote}{PLACEHOLDERS[field]}{quote}"

    updated = FIELD_RE.sub(repl, text)
    if count and "const firebaseConfig = {" in updated:
        updated = updated.replace("const firebaseConfig = {", NOTICE, 1)
    return updated, count


def main() -> int:
    if len(sys.argv) < 2:
        sys.exit("usage: python3 tools/pkg_redact.py <package-root>")
    root = pathlib.Path(sys.argv[1]).resolve()

    touched, total = [], 0
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        updated, count = redact_text(original)
        if count:
            path.write_text(updated, encoding="utf-8")
            touched.append((path.relative_to(root), count))
            total += count

    print(f"redacted {total} value(s) in {len(touched)} file(s)")
    for rel, count in touched:
        print(f"  {rel}: {count}")

    leaks = []
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for lineno, line in enumerate(text.splitlines(), 1):
                if LEAK_RE.search(line) and "YOUR_" not in line:
                    leaks.append(f"{path.relative_to(root)}:{lineno}")
    if leaks:
        print("\nSTILL PRESENT (check manually):")
        for item in leaks[:20]:
            print("  " + item)
        return 1
    print("no live-looking credentials remain")
    return 0


if __name__ == "__main__":
    sys.exit(main())
