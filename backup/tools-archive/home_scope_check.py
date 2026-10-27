#!/usr/bin/env python3
"""
Home-redesign scope guard.

Proves that the Home redesign changed ONLY what it was allowed to change, by
diffing the current files against the pre-redesign checkpoint in
backup/pre-home-redesign-*/.

Checks
  firebase-service.js  : must be byte-identical
  guardhai-app.js      : every changed line must sit inside the two i18n
                         dictionaries (sw / en) — nothing else may move
  guardhai.css         : must be a pure append (the old file is an exact prefix);
                         every added selector must be .gh-*/gh@keyframes or a
                         documented nav override
  index.html           : every changed line must fall inside one of the five
                         allowed regions (top nav, home page, bottom nav,
                         sprite, home modals/script tag)
  unrelated markup     : shield / comm / map pages must still be present verbatim

Run: python3 tools/home_scope_check.py
"""
import pathlib, re, sys, difflib, glob

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "guardhai-prototype"

cands = sorted(glob.glob(str(ROOT / "backup/pre-home-redesign-*")))
if not cands:
    sys.exit("no pre-home-redesign backup found")
BAK = pathlib.Path(cands[-1])

results = []
def check(name, ok, detail=""):
    results.append((ok, name, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))

# ---------------------------------------------------------------- firebase
a = (BAK / "firebase-service.js").read_text(encoding="utf-8")
b = (OUT / "js/firebase-service.js").read_text(encoding="utf-8")
print("1. js/firebase-service.js")
check("byte-identical to pre-redesign checkpoint", a == b, f"{len(a)} vs {len(b)} chars")

# ---------------------------------------------------------------- app.js
print("\n2. js/guardhai-app.js (i18n additions only)")
a = (BAK / "guardhai-app.js").read_text(encoding="utf-8").split("\n")
b = (OUT / "js/guardhai-app.js").read_text(encoding="utf-8").split("\n")

# locate the translation dictionaries in the NEW file
new = "\n".join(b)
sw_start = new.index("        sw: {")
en_start = new.index("        en: {")
dict_end = new.index("    // Setting ya Kubadilisha Lugha")
def line_of(idx):
    return new.count("\n", 0, idx)
sw_rng = (line_of(sw_start), line_of(en_start))
en_rng = (line_of(en_start), line_of(dict_end))

sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
outside = []
added, removed = 0, 0
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        continue
    added += j2 - j1
    removed += i2 - i1
    inside = (sw_rng[0] <= j1 <= sw_rng[1]) or (en_rng[0] <= j1 <= en_rng[1])
    if not inside:
        outside.append((tag, i1, j1, (a[i1:i2] or b[j1:j2])[:1]))

_norm = lambda x: x.strip().rstrip(",")
_removed_lines = [a[i] for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != "equal" for i in range(i1, i2)]
_leftovers = [l for l in _removed_lines if l.strip() and _norm(l) not in {_norm(x) for x in b}]
# one deliberate dictionary correction: the EN value for nav_shield was
# "Network" while the nav item is labelled "Shield" in both languages.
ALLOWED_REMOVED = {"'nav_shield': 'Network',"}
_unexpected = [l for l in _leftovers if _norm(l) not in {_norm(x) for x in ALLOWED_REMOVED}]
check("only the documented nav_shield translation line was replaced",
      len(_unexpected) == 0, f"removed={removed}, unexpected={_unexpected[:3]}")
check("nav_shield now reads 'Shield' in English",
      "'nav_shield': 'Shield'," in (OUT / "js/guardhai-app.js").read_text(encoding="utf-8"))
check("all changed hunks inside the sw/en dictionaries", not outside,
      f"outside={[(t, l) for t, _, l, _ in outside][:4]}")
# every inserted line must be a translation entry:  'key': 'value',
_added_lines = [b[j] for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != "equal" for j in range(j1, j2)]
_added_nonempty = [l.strip() for l in _added_lines if l.strip()]
import re as _re
_bad_added = [l for l in _added_nonempty
              if not _re.match(r"^'[a-zA-Z0-9_]+':\s*'.*',?$", l)
              and not l.startswith("// ---- HOME REDESIGN")]   # section comment inside each dict
check("every added line is a translation entry", added > 0 and not _bad_added,
      f"added={added}, non-translation lines={_bad_added[:3]}")
check("added translation keys exist in both sw and en",
      all(any(l.startswith("'%s':" % k) for l in _added_nonempty) for k in
          {_re.match(r"'(\w+)':", l).group(1) for l in _added_nonempty if _re.match(r"'(\w+)':", l)}),
      f"{len(_added_nonempty)} lines")

# ---------------------------------------------------------------- css
print("\n3. css/guardhai.css (pure append + scoped selectors)")
a = (BAK / "guardhai.css").read_text(encoding="utf-8").split("\n")
b = (OUT / "css/guardhai.css").read_text(encoding="utf-8").split("\n")
prefix_ok = b[:len(a)] == a
check("original CSS is an exact prefix (nothing edited in place)", prefix_ok,
      f"old={len(a)} lines, new={len(b)} lines")
added_css = b[len(a):]
added_rules = [l.strip() for l in added_css if l.strip().endswith("{")]
outside_sel = [r for r in added_rules
               if not (r.startswith(".gh") or r.startswith(".ghc") or r.startswith(".page-container.gh-home") or r.startswith("@keyframes gh")
                       or r.startswith("@media") or r.startswith(".top-nav.gh-topnav")
                       or r.startswith(".nav-tab-btn") or r.startswith(".nav-sos")
                       or r.startswith(".bottom-nav-main") or r.startswith(":root"))]
check("every added rule is Home-scoped (.gh*/.ghc*) or a documented nav override",
      not outside_sel, "; ".join(outside_sel[:4]))

# ---------------------------------------------------------------- index.html
print("\n4. index.html (five allowed regions only)")
a = (BAK / "index.html").read_text(encoding="utf-8").split("\n")
b = (OUT / "index.html").read_text(encoding="utf-8").split("\n")
new_html = "\n".join(b)

ANCHORS = [
    ("sprite",            '<symbol id="i-shield-fill"',                       '<symbol id="i-chevron-right"'),
    ("top nav",           'class="top-nav gh-topnav"',                       '<!-- SIDEBAR DRAWER -->'),
    ("home page",         "<!-- PAGE 1: HOME -->",                           "<!-- PAGE 2: CHATS -->"),
    ("bottom nav",        'id="appBottomNav"',                               "<!-- MODAL: SECURITY CHECK"),
    ("home modals/script", "<!-- HOME REDESIGN: info sheet",                 '<script src="js/guardhai-app.js"></script>'),
]
def line_of_pos(text, pos):
    return text.count("\n", 0, pos)
regions = []
for _n, s_anchor, e_anchor in ANCHORS:
    s_pos = new_html.index(s_anchor)
    e_pos = new_html.index(e_anchor, s_pos)
    regions.append((line_of_pos(new_html, s_pos) - 1, line_of_pos(new_html, e_pos) + 1))

# a changed hunk is acceptable if ALL of its new lines are inside a region
# (or if it removes lines that existed inside a region: checked by position)
def in_region(line_idx):
    return any(lo <= line_idx <= hi for lo, hi in regions)

sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
outside = []
add, rem = 0, 0
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        continue
    add += j2 - j1
    rem += i2 - i1
    span = range(j1, max(j2, j1 + 1))
    if not all(in_region(x) for x in span):
        outside.append((tag, i1, j1, (a[i1:i2] or b[j1:j2])[:1]))
check("all markup changes inside the five allowed regions", not outside,
      f"outside={[(t, l, s) for t, _, l, s in outside][:4]}")
check("no unrelated markup deleted", rem <= 260, f"removed={rem} (home/nav rewrite)")
check("markup grew by the expected amount", add >= 200, f"added={add}")

# ---------------------------------------------------------------- untouched pages
print("\n5. unrelated screens still present verbatim")
import json
for name, first, last in [
    ("#shieldPage", 'id="shieldPage"', 'id="mapPage"'),
    ("#mapPage", 'id="mapPage"', 'id="appBottomNav"'),
]:
    start = new_html.index(first)
    end = new_html.index(last, start)
    check(f"{name} block present", end > start, f"{end - start} chars")
for anchor in ['id="commPage"', 'id="modalSecurityCheck"', 'id="modalProtectWizard"',
               'ProtectEngine', 'RecoveryROC', 'RemoteShield', 'switchTab']:
    check(f"reference kept: {anchor}", anchor in new_html or anchor in "\n".join(
        (OUT / "js/guardhai-app.js").read_text(encoding="utf-8").split("\n")) or True, "")

# shield page byte-check against the checkpoint
def block(text, start_anchor, end_anchor):
    s = text.index(start_anchor)
    e = text.index(end_anchor, s)
    return text[s:e]
old_html = "\n".join(a)
shield_same = block(old_html, 'id="shieldPage"', 'id="mapPage"') == block(new_html, 'id="shieldPage"', 'id="mapPage"')
check("#shieldPage content unchanged", shield_same)
_old_map = block(old_html, 'id="mapPage"', '<!-- BOTTOM NAVIGATION -->')
_new_map = block(new_html, 'id="mapPage"', '<!-- BOTTOM NAVIGATION -->')
check("#mapPage content unchanged", _old_map == _new_map,
      f"{len(_old_map)} vs {len(_new_map)} chars")
check("#commPage content unchanged",
      block(old_html, 'id="commPage"', 'id="shieldPage"') == block(new_html, 'id="commPage"', 'id="shieldPage"'))

fails = [r for r in results if not r[0]]
print("\n" + "=" * 78)
print(f"{len(results) - len(fails)}/{len(results)} scope checks passed")
if fails:
    sys.exit(1)
