#!/usr/bin/env python3
"""
GuardHai prototype splitter.

Goal: separate the single-file prototype (index.html) into
  - css/guardhai.css          (the <style> block)
  - js/firebase-service.js    (<script type="module">, Firebase layer)
  - js/guardhai-app.js        (classic <script>, application core)
  - index.html                (markup only + <link>/<script src> tags)

Content is copied byte-for-byte out of the original file (no retyping),
so nothing can silently drift. The Cloudflare challenge script that was
injected into the saved copy is dropped (it is artifact, not app code).

Run: python3 tools/split_prototype.py
"""
import re
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent if (HERE.parent / "backup").is_dir() else pathlib.Path("/home/user")
SRC = ROOT / "backup/prototype-original-2026-10-27.html"
OUT = ROOT / "guardhai-prototype"

src = SRC.read_text(encoding="utf-8")
lines = src.split("\n")


def block(start_pat, end_pat, text_offset_from=0):
    """Return (start_line_idx, end_line_idx, inner_text) for a line-anchored block."""
    i = text_offset_from
    while not re.match(start_pat, lines[i]):
        i += 1
    start = i
    j = start + 1
    while not re.match(end_pat, lines[j]):
        j += 1
    return start, j, "\n".join(lines[start + 1:j])


# ---------------------------------------------------------------- CSS block
css_open, css_close, css_body = block(r"^\s*<style>\s*$", r"^\s*</style>\s*$")
assert css_body.strip(), "empty <style> block"

# ------------------------------------------------- module script (Firebase)
mod_open, mod_close, mod_body = block(
    r'^\s*<script type="module">\s*$', r"^\s*</script>\s*$"
)
assert "firebaseConfig" in mod_body, "unexpected module script content"

# ------------------------------------------- classic script (application core)
cla_open, cla_close, cla_body = block(
    r"^\s*<script>\s*$", r"^\s*</script>\s*$", text_offset_from=mod_close
)
assert "ProtectEngine" in cla_body, "unexpected classic script content"

# ------------------------------------------------- Cloudflare artifact block
cf_idx = None
for idx, ln in enumerate(lines):
    if "__CF$cv$params" in ln:
        cf_idx = idx
        break
assert cf_idx is not None

# The CF line is `<script>...CF...</script></body>` on one physical line, so it
# also carries the closing </body>. We drop the whole line and re-add </body>.
pre = lines[:css_open]                  # doctype + <head> up to <style>
mid_a = lines[css_close + 1:mod_open]   # </style> .. <script type=module> (markup)
mid_b = lines[mod_close + 1:cla_open]   # </script> .. <script> (markup)
tail = lines[cla_close + 1:cf_idx]      # after classic </script> .. (CF)

# ------------------------------------------------ sanity: parse the wrappers
assert mid_a[0].strip() == "</head>", mid_a[0]
assert mid_a[1].strip() == "<body>", mid_a[1]
assert not any("<script" in l for l in mid_a + mid_b + tail), "unexpected inline script"
assert lines[cla_close].strip() == "</script>", lines[cla_close]
assert lines[cf_idx].rstrip().endswith("</body>"), lines[cf_idx][-40:]
assert lines[-1].strip() == "</html>" and lines[-2] == "", lines[-3:]  # no trailing NL in source

# ------------------------------------------------------------- write outputs
def write(path, text, note=""):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    n = text.count("\n") + (0 if text.endswith("\n") else 1)
    print(f"  wrote {path.relative_to(OUT)}  ({n} lines, {len(text)} bytes) {note}")
    return text


def dedent_8(text):
    """Remove up to 8 leading spaces per line (the <style>/<script> base indent)."""
    out = []
    for ln in text.split("\n"):
        n = len(ln) - len(ln.lstrip(" "))
        out.append(ln[min(n, 8):])
    return "\n".join(out)


css = dedent_8(css_body).rstrip() + "\n"
firebase = dedent_8(mod_body).strip() + "\n"
app = dedent_8(cla_body).strip() + "\n"

write(OUT / "css/guardhai.css", css)
write(OUT / "js/firebase-service.js", firebase)
write(OUT / "js/guardhai-app.js", app)

# (verification reads the raw slices straight from the backup, so no copies
#  of the originals are kept inside the deliverable folder)

# ------------------------------------------------------------- new index.html
# <head> keeps everything, CSS becomes an external <link>.
# <body> markup is untouched; the two scripts become external files.
new_lines = (
    pre
    + ['    <link rel="stylesheet" href="css/guardhai.css">']
    + mid_a
    + mid_b
    + tail
    + [
        '    <script type="module" src="js/firebase-service.js"></script>',
        '    <script src="js/guardhai-app.js"></script>',
        "</body>",
        "</html>",
    ]
)
html = "\n".join(new_lines) + "\n"
write(OUT / "index.html", html)

print("\nextracted line ranges from original:")
print(f"  css        : {css_open + 1}-{css_close + 1}")
print(f"  firebase   : {mod_open + 1}-{mod_close + 1}")
print(f"  app        : {cla_open + 1}-{cla_close + 1}")
print(f"  dropped CF : {cf_idx + 1}")
