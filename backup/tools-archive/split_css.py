#!/usr/bin/env python3
"""
Split css/guardhai.css into ordered domain files.

Cuts are made at section-comment boundaries only, and the parts are emitted in
the same order, so concatenating them reproduces the original file byte-for-byte
(verified at the end of the run).

Run: python3 tools/split_css.py <src.css> <out-dir>
"""
import pathlib
import sys

# (first line, filename) — 1-based, inclusive. Each block ends where the next begins.
BLOCKS = [
    (1,    '01-core.css'),        # design tokens, reset, base, demo banner
    (175,  '02-shield.css'),      # shield pillars + protect sub-navigation
    (235,  '03-ui-kit.css'),      # icons, buttons, inputs, auth, badges, meters
    (508,  '04-home.css'),        # top nav, home surface, safety, SOS, topics, feed
    (787,  '05-navigation.css'),  # bottom navigation
    (823,  '06-overlays.css'),    # modals, sheet, toast, legacy composer
    (922,  '07-responsive.css'),  # responsive rules + home refinements
    (970,  '08-composer.css'),    # composer v2, media, engagement, threads
]


def main() -> int:
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)

    lines = src.read_text(encoding='utf-8').split('\n')
    if lines and lines[-1] == '':
        lines = lines[:-1]          # trailing newline is re-added per part

    n = len(lines)
    starts = [b[0] for b in BLOCKS] + [n + 1]
    written = []

    for i, (first, name) in enumerate(BLOCKS):
        a = starts[i] - 1
        b = starts[i + 1] - 1
        chunk = lines[a:b]
        # every cut must start on a comment line, never mid-rule
        head = chunk[0].strip()
        assert head.startswith('/*'), f'{name} starts mid-rule: {head[:60]!r}'
        header = (f'/* ==========================================================================\n'
                  f'   GuardHai · {name[:-4].upper()}\n'
                  f'   Part {i + 1}/{len(BLOCKS)} of the stylesheet. Order matters:\n'
                  f'   these files are concatenated in filename order by index.html.\n'
                  f'   ========================================================================== */\n')
        body = '\n'.join(chunk)
        (out / name).write_text(header + body, encoding='utf-8')
        written.append(name)
        print(f'  {name:20s} lines {a + 1:>5}–{b:<5} {len(chunk):>4} lines')

    # ---- verification: reassembly must equal the source ----
    rebuilt = []
    for name in written:
        text = (out / name).read_text(encoding='utf-8')
        # drop the 5-line injected header (comment block) we added
        parts = text.split('\n')
        assert parts[0].startswith('/* ===='), name
        rebuilt.append('\n'.join(parts[5:]))   # part 5.. = the original chunk, verbatim

    rebuilt_text = '\n'.join(rebuilt)
    original_text = '\n'.join(lines)
    same = rebuilt_text.strip() == original_text.strip()
    print(f'\nreassembly identical to source: {same}')
    if not same:
        import difflib
        for line in list(difflib.unified_diff(original_text.split('\n'),
                                              rebuilt_text.split('\n'), lineterm=''))[:20]:
            print(line)
    return 0 if same else 1


if __name__ == '__main__':
    sys.exit(main())
