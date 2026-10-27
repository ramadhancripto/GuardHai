#!/usr/bin/env python3
#
# ---------------------------------------------------------------------------
# LEGACY — PHASE 1 SNAPSHOT CHECK (expected to report differences now).
#
# This script validates the project state right after the phase-1 split: fixed
# small CSS/JS growth, a specific English SOS string, and the original upload's
# pre-packaging SHA-256. Phases 3 (Home redesign), 4 (composer) and packaging
# (credential redaction) changed all three by design, so several checks now
# FAIL on purpose.
#
#   current scope guard  ->  python3 tools/home_scope_check.py   (23/23)
#   behaviour            ->  node tests/*.spec.js
#
# Kept for the historical record; the original header follows.
# ---------------------------------------------------------------------------
"""
GuardHai prototype — structural verifier for the CURRENT state.

Checks, without a browser:
  T1  every local asset referenced by index.html exists on disk
  T2  index.html contains no inline executable <script> and no inline <style>
  T3  css/guardhai.css is still byte-identical (whitespace-normalised) to the
      original <style> block in the backup
  T4  js/firebase-service.js is still byte-identical to the original module block
  T5  js/guardhai-app.js differs from the original <script> block ONLY in the
      changes documented in docs/BUGFIX-REPORT.md
  T6  the 7 bug fixes are present at source level
  T7  the backup is untouched (sha256)
  T8  JS parses (node --check) and CSS braces balance

Run: python3 tools/verify_prototype.py
Exit code 0 = all pass.
"""
import pathlib, re, hashlib, subprocess, sys, tempfile

# Resolve paths relative to this file so the tool works wherever the folder is
# unzipped (…/tools/verify_prototype.py -> project root is the parent of tools/).
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent if (HERE.parent / "guardhai-prototype").is_dir() else pathlib.Path("/home/user")
BAK = ROOT / "backup/prototype-original-2026-10-27.html"
OUT = ROOT / "guardhai-prototype"
EXPECTED_SHA = "5028a3526b0641c45f806f6607a86d1142283d2ee8051769d4119dc2c2c990e8"

results = []
def check(name, ok, detail=""):
    results.append((ok, name, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))

# ---------------------------------------------------------------- load sources
orig = BAK.read_text(encoding="utf-8")
cf = re.search(r"<script>\(function\(\)\{function c\(\).*?</script>", orig, re.S).group(0)
orig_nocf = orig.replace(cf, "")
lines = orig.split("\n")

def idx(pat, start=0):
    for i in range(start, len(lines)):
        if re.match(pat, lines[i]):
            return i
    raise SystemExit("not found: " + pat)

css_o, css_c = idx(r"^\s*<style>\s*$"), idx(r"^\s*</style>\s*$")
mod_o = idx(r'^\s*<script type="module">\s*$')
mod_c = idx(r"^\s*</script>\s*$", mod_o)
cla_o = idx(r"^\s*<script>\s*$", mod_c)
cla_c = idx(r"^\s*</script>\s*$", cla_o)

def dedent8(t):
    return "\n".join(l[min(len(l) - len(l.lstrip(" ")), 8):] if l.strip() else l
                     for l in t.split("\n"))

orig_css = dedent8("\n".join(lines[css_o + 1:css_c]))
orig_mod = dedent8("\n".join(lines[mod_o + 1:mod_c]))
orig_app = dedent8("\n".join(lines[cla_o + 1:cla_c]))

html = (OUT / "index.html").read_text(encoding="utf-8")
css = (OUT / "css/guardhai.css").read_text(encoding="utf-8")
js = (OUT / "js/guardhai-app.js").read_text(encoding="utf-8")
fb = (OUT / "js/firebase-service.js").read_text(encoding="utf-8")

sq = lambda s: re.sub(r"\s+", "", s)

print("T1 — local asset references resolve")
refs = [m for m in re.findall(r'(?:href|src)="(?!https?:|#|data:)([^"]+)"', html)]
for r in refs:
    check(f"asset: {r}", (OUT / r).exists())

print("\nT2 — no inline code left in index.html")
inline_js = [x for x in re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S) if x.strip()]
check("inline executable <script> blocks: 0", len(inline_js) == 0, str(len(inline_js)))
check("inline <style> blocks: 0", html.count("<style>") == 0, str(html.count("<style>")))

print("\nT3 — css: unchanged except the demo-banner addition (fix 6)")
from collections import Counter
DEMO_CSS_ADDED = [
    "/* Prototype / demo banner — always on top so the demo state is never hidden */",
    ".demo-banner {",
    "background: linear-gradient(135deg, #7C2D12 0%, #B45309 100%);",
    "color: #FFFFFF; font-size: 10.5px; font-weight: 800; line-height: 1.35;",
    "letter-spacing: 0.01em; text-align: center;",
    "padding: 7px 14px; display: flex; align-items: center; justify-content: center;",
    "gap: 8px; position: sticky; top: 0; z-index: 10001;",
    "}",
    ".demo-banner svg { flex-shrink: 0; }",
]
def line_counter(text):
    return Counter(l.strip() for l in text.strip("\n").split("\n") if l.strip())
_only_orig = line_counter(orig_css) - line_counter(css)
_only_new = line_counter(css) - line_counter(orig_css)
check("CSS: nothing removed", sum(_only_orig.values()) == 0,
      f"removed={sum(_only_orig.values())}" + (f" {list(_only_orig)[:3]}" if _only_orig else ""))
check("CSS: only the demo-banner lines were added",
      sum(_only_new.values()) == len(DEMO_CSS_ADDED)
      and all(_only_new[l] == DEMO_CSS_ADDED.count(l) for l in set(DEMO_CSS_ADDED))
      and set(_only_new) == set(DEMO_CSS_ADDED),
      f"added={sum(_only_new.values())} expected={len(DEMO_CSS_ADDED)} unexpected={sorted(set(_only_new) - set(DEMO_CSS_ADDED))}")

print("\nT4 — js/firebase-service.js unchanged vs original module")
check("Firebase module identical", sq(orig_mod) == sq(fb), f"{len(sq(orig_mod))} vs {len(sq(fb))} chars")

print("\nT5 — js/guardhai-app.js changed only in documented ways")
APP_REMOVED = [
    # F4a — dead BLE id
    "const bleEl = document.getElementById('lbl-ble-api-support');",
    'if (bleEl) bleEl.innerText = "Supported (Web BLE Distance Sensor Active)";',
    'if (bleEl) bleEl.innerText = "Restricted (Browser BLE Limited)";',
    # F4b — dead zone id
    "const zoneEl = document.getElementById('lbl-current-zone');",
    "if (zoneEl) zoneEl.innerText = mode + ' Zone';",
    # F1 — duplicate GHIcon
    "/* Icon renderer for protected devices */",
    "function GHIcon(key) {",
    "const map = { laptop: 'i-laptop', watch: 'i-watch', phone: 'i-smartphone', tracker: 'i-bag' };",
    '''return '<svg class="ic" style="width:18px;height:18px"><use href="#' + (map[key] || 'i-smartphone') + '"/></svg>';''',
    "}",
    # F3 — wrong Swahili nav label
    "'nav_shield': 'Network',",
]
APP_ADDED = [
    "// NOTE: this used to also look up '#lbl-ble-api-support', which does not",
    "// exist anywhere in index.html (dead reference, silently a no-op).",
    "// The health row description is the element that actually exists.",
    "// exist anywhere in index.html (dead reference, silently a no-op).",  # used by both F4 fixes
    "// NOTE: this used to also write to '#lbl-current-zone', which does not",
    "// The profile change is still recorded by addSecurityLog() above.",
    "/* NOTE: the second (duplicate) GHIcon definition that used to live here was",
    "removed. The definition above is the superset (names + emoji keys) and was",
    "already the one being called for named icons. */",
    "'nav_shield': 'Ulinzi',",
]
_app_only_orig = line_counter(orig_app) - line_counter(js)
_app_only_new = line_counter(js) - line_counter(orig_app)
_unexp_removed = sorted(set(_app_only_orig) - set(APP_REMOVED))
_unexp_added = sorted(set(_app_only_new) - set(APP_ADDED))
check("app.js: only the documented lines removed",
      sum(_app_only_orig.values()) == len(APP_REMOVED) and not _unexp_removed,
      f"removed={sum(_app_only_orig.values())} expected={len(APP_REMOVED)} unexpected={_unexp_removed}")
check("app.js: only the documented lines added",
      sum(_app_only_new.values()) == len(APP_ADDED) and not _unexp_added,
      f"added={sum(_app_only_new.values())} expected={len(APP_ADDED)} unexpected={_unexp_added}")

print("\nT6 — the 7 fixes present at source level")
check("F1 GHIcon defined exactly once", len(re.findall(r"function GHIcon\s*\(", js)) == 1)
check("F2 #i-play symbol defined", '<symbol id="i-play"' in html)
check("F3 data-i18n wired (>= 10 elements)", html.count('data-i18n="') >= 10, f"{html.count('data-i18n=\"')} elements")
check("F3 sw dictionary no longer maps nav_shield to English",
      "'nav_shield': 'Ulinzi'" in js and "'nav_shield': 'Network'" not in js.split("en: {")[0])
check("F4 dead id lbl-ble-api-support has no getElementById call",
      not re.search(r"getElementById\(\s*'lbl-ble-api-support'", js))
check("F4 dead id lbl-current-zone has no getElementById call",
      not re.search(r"getElementById\(\s*'lbl-current-zone'", js))
check("F5 SOS alert states demo + not sent",
      "No emergency service was contacted" in html and "SOS Emergency Alert Triggered!" not in html)
check("F6 demo banner present", 'id="demoBanner"' in html and ".demo-banner" in css)
check("F7 viewport no longer blocks zoom",
      "user-scalable=no" not in html and "maximum-scale=1.0" not in html)

print("\nT7 — backup untouched")
h = hashlib.sha256(BAK.read_bytes()).hexdigest()
check("backup sha256 matches audit record", h == EXPECTED_SHA, h[:16] + "…")

print("\nT8 — syntax")
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
    f.write(js); app_tmp = f.name
with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as f:
    f.write(fb); fb_tmp = f.name
check("guardhai-app.js parses", subprocess.run(["node", "--check", app_tmp],
      capture_output=True).returncode == 0)
check("firebase-service.js parses as ES module", subprocess.run(["node", "--check", fb_tmp],
      capture_output=True).returncode == 0)
check("CSS braces balanced", css.count("{") == css.count("}"), f"{css.count('{')}/{css.count('}')}")

fails = [r for r in results if not r[0]]
print("\n" + "=" * 70)
print(f"{len(results) - len(fails)}/{len(results)} checks passed")
if fails:
    for _, n, det in fails:
        print("  FAILED:", n, det)
    sys.exit(1)
