#!/usr/bin/env python3
"""
GuardHai — project integrity checker.

Run from anywhere:  python3 tools/verify_app.py
Exit code 0 = all checks pass, 1 = at least one failed.

It guards the things that break silently when a codebase grows:

  1. layout      the entry document loads exactly one module and every CSS part
  2. syntax      every module passes `node --check` as an ES module
  3. imports     every relative import resolves to a real file
  4. bridges     every inline onclick="X(…)" has window.X published somewhere
  5. i18n        every data-i18n key exists in both the sw and en dictionaries
  6. ids         no duplicate element ids in the markup
  7. wording     no prototype/demo framing outside mocks/ and backup/
  8. size        no source file over the growth limit (keeps files splittable)
  9. mocks       mocks are never imported by domain/data/services
"""
from __future__ import annotations

import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
INDEX = ROOT / "index.html"
MAX_LINES = 600          # a file that grows past this should be split again

results: list[tuple[bool, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((ok, name, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"   [{detail}]" if detail else ""))


def js_files() -> list[pathlib.Path]:
    return sorted(p for p in SRC.rglob("*.js"))


def main() -> int:
    html = INDEX.read_text(encoding="utf-8")
    sources = {p: p.read_text(encoding="utf-8") for p in js_files()}
    blob = "\n".join(sources.values())

    # ---------------------------------------------------------------- 1 layout
    print("\n1. layout")
    css_parts = sorted((ROOT / "assets" / "css").glob("*.css"))
    linked = re.findall(r'<link rel="stylesheet" href="assets/css/([^"]+)">', html)
    check("8 CSS parts, loaded in filename order",
          [p.name for p in css_parts] == linked,
          ", ".join(linked))
    check("one module entry, no classic script tags for app code",
          html.count('<script type="module"') == 1
          and 'src="./src/main.js"' in html
          and "guardhai-app.js" not in html and "guardhai-home.js" not in html)
    check("index.html has no inline <style> block", "<style" not in html)

    # ---------------------------------------------------------------- 2 syntax
    print("\n2. syntax (node --check, ES module)")
    bad: list[str] = []
    for path, text in sources.items():
        proc = subprocess.run(["node", "--input-type=module", "--check"],
                              input=text, text=True, capture_output=True)
        if proc.returncode != 0:
            bad.append(f"{path.relative_to(ROOT)}: {proc.stderr.splitlines()[3] if len(proc.stderr.splitlines()) > 3 else proc.stderr[:80]}")
    check(f"all {len(sources)} modules parse", not bad, "; ".join(bad[:3]))

    # --------------------------------------------------------------- 3 imports
    print("\n3. import graph")
    spec_re = re.compile(r"""(?:from\s+|import\s*)(['"])(\.{1,2}/[^'"]+)\1""")
    dangling: list[str] = []
    edges = 0
    for path, text in sources.items():
        for _, spec in spec_re.findall(text):
            edges += 1
            target = (path.parent / spec).resolve()
            if not target.is_file():
                dangling.append(f"{path.relative_to(ROOT)} → {spec}")
    check(f"{edges} relative imports resolve", not dangling, "; ".join(dangling[:3]))

    # --------------------------------------------------------------- 4 bridges
    print("\n4. inline handler bridges")
    handlers = sorted(set(re.findall(r'on(?:click|change|input)="\s*([A-Za-z_$][\w$.]*)', html)))
    # inline code may also touch browser builtins directly; those are not bridges
    handlers = [h for h in handlers if h.split('.')[0] not in {'document', 'window', 'event', 'this'}]
    missing = []
    for name in handlers:
        root = name.split(".")[0]
        if not re.search(rf"window\.{re.escape(root)}\s*=", blob) and \
           not re.search(rf"^(?:function|const|let|var)\s+{re.escape(root)}\b", blob, re.M):
            missing.append(name)
    check(f"{len(handlers)} inline handlers have a window bridge", not missing, ", ".join(missing))

    # ------------------------------------------------------------------ 5 i18n
    print("\n5. i18n")
    i18n_src = (SRC / "i18n" / "i18n.js").read_text(encoding="utf-8")
    sw_start = i18n_src.index("sw: {")
    en_start = i18n_src.index("en: {")
    sw = set(re.findall(r"'([\w.]+)':", i18n_src[sw_start:en_start]))
    en = set(re.findall(r"'([\w.]+)':", i18n_src[en_start:]))
    used = set(re.findall(r'data-i18n="([\w.]+)"', html)) | set(re.findall(r"data-i18n='([\w.]+)'", html))
    check(f"sw and en cover the same keys ({len(sw)} keys)", sw == en,
          f"only sw: {sorted(sw - en)[:3]} · only en: {sorted(en - sw)[:3]}")
    check(f"all {len(used)} wired data-i18n keys are translated", used <= sw,
          f"missing: {sorted(used - sw)[:5]}")

    # -------------------------------------------------------------------- 6 ids
    print("\n6. element ids")
    ids = re.findall(r'\sid="([^"]+)"', html)
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    check(f"{len(ids)} ids, no duplicates", not dupes, ", ".join(dupes[:5]))

    # ---------------------------------------------------------------- 7 wording
    print("\n7. product wording")
    offenders = []
    pattern = re.compile(r"prototype|demo mode|\bDEMO\b", re.I)
    for path, text in list(sources.items()) + [(INDEX, html)]:
        rel = path.relative_to(ROOT)
        if str(rel).startswith(("src/mocks", "backup")):
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            if pattern.search(line):
                offenders.append(f"{rel}:{lineno}")
    check("no prototype/demo framing in shipped code", not offenders, ", ".join(offenders[:5]))

    # ------------------------------------------------------------------- 8 size
    print("\n8. file size guard")
    big = [(p.relative_to(ROOT), len(t.splitlines())) for p, t in sources.items()
           if len(t.splitlines()) > MAX_LINES]
    check(f"no module over {MAX_LINES} lines", not big,
          ", ".join(f"{p} ({n})" for p, n in sorted(big, key=lambda x: -x[1])[:5]))

    # ----------------------------------------------------------------- 9 mocks
    print("\n9. mock isolation")
    leaks = []
    for path, text in sources.items():
        rel = path.relative_to(ROOT).as_posix()
        if not rel.startswith(("src/domain", "src/data", "src/services")):
            continue
        if re.search(r"""from\s+['"][^'"]*mocks/""", text):
            leaks.append(rel)
    check("domain/data/services never import mocks", not leaks, ", ".join(leaks))

    # ---------------------------------------------------------------- summary
    passed = sum(1 for ok, _, _ in results if ok)
    total = len(results)
    print("\n" + "-" * 96)
    print(f"{passed}/{total} checks passed")
    if passed != total:
        print("failed:", ", ".join(name for ok, name, _ in results if not ok))
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
