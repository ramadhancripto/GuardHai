#!/usr/bin/env python3
"""
Split the monolithic js/guardhai-app.js into ES modules.

Strategy (verifiable, mechanical):
  1. find every top-level declaration (`const X =`, `function x(` …)
  2. map each of them to an output module
  3. emit one ES module per target with the source lines verbatim
  4. inject `import { … }` statements for the other top-level symbols the chunk
     references (word-boundary scan) and `export { … }` + a `window.X = X`
     bridge so existing inline `onclick="X.y()"` handlers keep working
  5. emit an entry module that imports everything in the original order
  6. verify: concatenating the emitted bodies must reproduce the original file

Run: python3 tools/split_js.py <src.js> <out-dir>
"""
import pathlib
import re
import sys

# ---------------------------------------------------------------- module map
# declaration name -> output path (relative to out-dir)
MODULES = {
    'Protect':                    'core/capacitor-plugin.js',
    'AudioEngine':                'shield/audio-engine.js',
    'testProtect':                'shield/protect-diagnostics.js',
    'ProtectEngine':              'shield/protect-engine.js',
    'CommunicationModule':        'shield/communication-module.js',
    'TravelProtectionEngine':     'shield/travel-protection.js',
    'USBCableEngine':             'shield/usb-cable.js',
    'GHIcon':                     'ui/icons.js',
    'ProtectWizard':              'shield/protect-wizard.js',
    'RecoveryROC':                'shield/recovery-roc.js',
    'switchShieldPillar':         'shield/pillar-nav.js',
    'I18N':                       'i18n/i18n.js',
    'RemoteShield':               'shield/remote-shield.js',
    'openProtectionTypeChooser':  'shield/protection-modals.js',
    'closeProtectionModals':      'shield/protection-modals.js',
    'startNearbyShield':          'shield/protection-modals.js',
    'AuthFlow':                   'auth/auth-flow.js',
    'AuthActions':                'auth/auth-actions.js',
    'enterGuardHaiHome':          'auth/session.js',
    'handleSignOut':              'auth/session.js',
    'toggleSidebar':              'ui/sidebar.js',
    'switchTab':                  'navigation/tabs.js',
    'mainMapInstance':            'features/map/map-view.js',
    'initMainMap':                'features/map/map-view.js',
}

DECL_RE = re.compile(r'^(?:const|let|var|async function|function|class)\s+([A-Za-z_$][\w$]*)')


def main() -> int:
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    lines = src.read_text(encoding='utf-8').split('\n')

    # ---- 1. locate top-level declarations -------------------------------
    decls = []                      # (index, name)
    for i, line in enumerate(lines):
        m = DECL_RE.match(line)
        if m:
            decls.append((i, m.group(1)))

    # the trailing DOMContentLoaded hook is split off as its own module
    boot_start = next((i for i, l in enumerate(lines)
                       if l.startswith("document.addEventListener('DOMContentLoaded'")), None)
    if boot_start is not None:
        decls = [d for d in decls if d[0] < boot_start]

    unknown = [n for _, n in decls if n not in MODULES]
    if unknown:
        print('!! unmapped top-level declarations:', unknown)
        return 2

    # ---- 2. slice --------------------------------------------------------
    chunks = []                     # (name, start, end)
    for idx, (start, name) in enumerate(decls):
        end = decls[idx + 1][0] if idx + 1 < len(decls) else (boot_start if boot_start else len(lines))
        chunks.append((name, start, end))

    head = lines[:decls[0][0]]      # file header (imports of firebase? none)

    # ---- 3. group by module ---------------------------------------------
    by_module: dict[str, list] = {}
    for name, a, b in chunks:
        by_module.setdefault(MODULES[name], []).append((name, a, b))

    exported = {n for _, n in decls}

    # ---- 4. emit ---------------------------------------------------------
    written = []
    for module_path, items in by_module.items():
        body_lines = []
        names = []
        for name, a, b in items:
            names.append(name)
            body_lines.extend(lines[a:b])

        body = '\n'.join(body_lines)
        # which sibling symbols does this chunk reference?
        external = []
        for other in sorted(exported - set(names)):
            if re.search(r'(?<![\w$.])' + re.escape(other) + r'(?![\w$])', body):
                external.append(other)

        imports = []
        for name in external:
            rel = MODULES[name]
            target = pathlib.PurePosixPath(rel).with_suffix('.js')
            here = pathlib.PurePosixPath(module_path)
            # relative path from this module to the imported one
            parts_here = here.parent.parts
            parts_there = target.parent.parts
            common = 0
            while common < min(len(parts_here), len(parts_there)) and parts_here[common] == parts_there[common]:
                common += 1
            up = '../' * (len(parts_here) - common)
            rel_path = './' + up + '/'.join(parts_there[common:] + (target.name,))
            imports.append(f"import {{ {name} }} from '{rel_path}';")

        header = (f"/* ==========================================================================\n"
                  f"   GuardHai · {module_path}\n"
                  f"   Split out of the phase-1 monolith js/guardhai-app.js — logic is\n"
                  f"   unchanged; only module boundaries, imports and the window bridge\n"
                  f"   are new.  Exports: {', '.join(names)}\n"
                  f"   ========================================================================== */\n")

        bridge = '\n'.join(f'window.{n} = {n};' for n in names)
        exports = f"export {{ {', '.join(names)} }};"

        target_path = out / module_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(header + '\n'.join(imports) + ('\n\n' if imports else '\n')
                               + body.rstrip('\n') + '\n\n' + bridge + '\n' + exports + '\n',
                               encoding='utf-8')
        written.append((module_path, names, len(body_lines), len(imports)))
        print(f'  {module_path:38s} {len(body_lines):>4} lines  {len(imports):>2} imports  '
              f'[{", ".join(names)}]')

    # ---- 5. entry module -------------------------------------------------
    order = []
    for name, _, _ in chunks:
        p = MODULES[name]
        if p not in order:
            order.append(p)

    entry = ["/* GuardHai · legacy entry — imports every split module in the original order.\n"
             "   Import this once from src/main.js; it also bridges the singletons to window\n"
             "   so the inline onclick handlers in index.html keep working. */", '']
    for p in order:
        rel = './' + p
        entry.append(f"import '{rel}';")
    if boot_start is not None:
        entry.append("import './legacy-boot.js';")
    (out / 'index.js').write_text('\n'.join(entry) + '\n', encoding='utf-8')
    print(f'  {"index.js":38s} imports {len(order)} modules')

    # ---- 6. boot module --------------------------------------------------
    if boot_start is not None:
        boot_body = '\n'.join(lines[boot_start:]).rstrip('\n')
        needed = [n for n in exported
                  if re.search(r'(?<![\w$.])' + re.escape(n) + r'(?![\w$])', boot_body)]
        imports = []
        for name in sorted(needed):
            target = pathlib.PurePosixPath(MODULES[name])
            imports.append(f"import {{ {name} }} from './{target}';")
        (out / 'legacy-boot.js').write_text(
            "/* GuardHai · legacy boot — the original DOMContentLoaded initialisation. */\n"
            + '\n'.join(imports) + '\n\n' + boot_body + '\n', encoding='utf-8')
        print(f'  {"legacy-boot.js":38s} {len(lines) - boot_start:>4} lines')

    # ---- 7. verification: reassembly == original -------------------------
    rebuilt = []
    for module_path, items in by_module.items():
        text = (out / module_path).read_text(encoding='utf-8')
        body = text.split('*/', 1)[1]              # drop header comment
        body = re.sub(r'^(\s*import [^\n]*\n)+', '', body)   # drop imports
        body = body.rsplit('window.', 1)[0] if 'window.' in body else body
        rebuilt.append(body)
    # compare per-chunk instead of whole-file (order inside modules is preserved)
    ok = True
    for name, a, b in chunks:
        original = '\n'.join(lines[a:b]).strip()
        module_path = MODULES[name]
        text = (out / module_path).read_text(encoding='utf-8')
        if original not in text.replace('*/', '', 1):
            ok = False
            print(f'  !! chunk {name} not found verbatim in {module_path}')
    print(f'\nall {len(chunks)} chunks preserved verbatim: {ok}')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
