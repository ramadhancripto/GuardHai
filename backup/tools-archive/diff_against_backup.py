#!/usr/bin/env python3
"""
Review every change made to the prototype after the audit.

Compares each artefact separately against the original single-file backup:
  1. markup   (index.html)          vs  original document with the CSS/JS blocks elided
  2. css      (css/guardhai.css)    vs  original <style> block
  3. module   (js/firebase-service.js) vs original <script type="module"> block
  4. app      (js/guardhai-app.js)  vs  original <script> block

Only content differences are shown: the 8-space dedent applied during the split is
normalised away, and the Cloudflare challenge script is ignored.

Run: python3 tools/diff_against_backup.py
"""
import pathlib, re, difflib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent if (HERE.parent / "guardhai-prototype").is_dir() else pathlib.Path("/home/user")
BAK = ROOT / "backup/prototype-original-2026-10-27.html"
OUT = ROOT / "guardhai-prototype"

orig = BAK.read_text(encoding="utf-8")
cf = re.search(r"<script>\(function\(\)\{function c\(\).*?</script>", orig, re.S).group(0)
orig = orig.replace(cf, "")
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


def dedent8(text):
    return "\n".join(l[min(len(l) - len(l.lstrip(" ")), 8):] if l.strip() else l
                     for l in text.split("\n"))


orig_css = dedent8("\n".join(lines[css_o + 1:css_c]))
orig_mod = dedent8("\n".join(lines[mod_o + 1:mod_c]))
orig_app = dedent8("\n".join(lines[cla_o + 1:cla_c]))

# original markup, with the three extracted blocks collapsed to placeholders
orig_html = "\n".join(
    lines[:css_o]
    + ["<!-- CSS BLOCK -->"]
    + lines[css_c + 1:mod_o]
    + ["<!-- MODULE BLOCK -->"]
    + lines[mod_c + 1:cla_o]
    + ["<!-- APP BLOCK -->"]
    + lines[cla_c + 1:]
)

new_html = (OUT / "index.html").read_text(encoding="utf-8")
new_html = (new_html
            .replace('<link rel="stylesheet" href="css/guardhai.css">', "<!-- CSS BLOCK -->")
            .replace('<script type="module" src="js/firebase-service.js"></script>', "<!-- MODULE BLOCK -->")
            .replace('<script src="js/guardhai-app.js"></script>', "<!-- APP BLOCK -->"))

pairs = [
    ("markup   index.html", orig_html, new_html),
    ("css      css/guardhai.css", orig_css, (OUT / "css/guardhai.css").read_text(encoding="utf-8")),
    ("module   js/firebase-service.js", orig_mod, (OUT / "js/firebase-service.js").read_text(encoding="utf-8")),
    ("app      js/guardhai-app.js", orig_app, (OUT / "js/guardhai-app.js").read_text(encoding="utf-8")),
]

grand_add = grand_del = 0
for label, a_text, b_text in pairs:
    a = [l.rstrip() for l in a_text.strip("\n").split("\n")]
    b = [l.rstrip() for l in b_text.strip("\n").split("\n")]
    d = list(difflib.unified_diff(a, b, f"backup/{label}", f"current/{label}", n=1, lineterm=""))
    add = sum(1 for l in d if l.startswith("+") and not l.startswith("+++"))
    dele = sum(1 for l in d if l.startswith("-") and not l.startswith("---"))
    grand_add += add
    grand_del += dele
    print("=" * 100)
    print(f"{label}:  {len(a)} -> {len(b)} lines   (+{add} / -{dele})")
    print("=" * 100)
    if not d:
        print("  (no changes)")
    for l in d:
        print(l[:190])
    print()

print("=" * 100)
print(f"TOTAL CONTENT CHANGES: +{grand_add} / -{grand_del} lines")
print("=" * 100)
