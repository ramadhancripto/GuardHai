#!/usr/bin/env python3
"""
Second-level split of shield/protect-engine.js (1,559 lines) into mixins.

The object is already divided by section banners. Each banner-delimited group
becomes its own module that exports a plain object; protect-engine.js keeps the
core and merges the rest with Object.assign(ProtectEngine, …). Method bodies are
copied verbatim — `this` semantics are unchanged because the methods end up as
properties of the same object.

Run: python3 tools/split_protect_engine.py <file>
"""
import pathlib
import re
import sys

CUTS = [
    ('AUTOMATED TRIGGER ENGINE & MODULES',   'protect-triggers.js',      'ProtectTriggers'),
    ('BLUETOOTH PROTECTION STATE MACHINE',   'protect-state-machine.js', 'ProtectStateMachine'),
    ('SIGNAL STATE SIMULATION',              'protect-signals.js',       'ProtectSignals'),
    ('RECONNECTION ENGINE',                  'protect-response.js',      'ProtectResponse'),
    ('SMART RESPONSE CHAIN',                 None,                        None),   # same module as reconnection
    ('GRACE TIMER CONFIGURATION',            'protect-analyzers.js',     'ProtectAnalyzers'),
    ('RSSI TREND ANALYZER',                  None,                        None),
    ('PROTECTION SESSION MANAGER',           None,                        None),
    ('PROTECTION CONFIDENCE CALCULATOR (ENHANCED)', None,                 None),
]


def main() -> int:
    p = pathlib.Path(sys.argv[1])
    lines = p.read_text(encoding='utf-8').split('\n')

    obj_start = next(i for i, l in enumerate(lines) if l.startswith('const ProtectEngine = {'))
    obj_end = max(i for i, l in enumerate(lines) if l.strip() == '};')

    # locate each banner inside the object
    marks = []
    for title, module, export in CUTS:
        idx = next((i for i in range(obj_start, obj_end)
                    if title in lines[i] and i + 1 < len(lines)), None)
        if idx is None:
            print(f'!! banner not found: {title}')
            return 1
        # walk back to the opening "/* ====" line
        j = idx
        while j > obj_start and not lines[j].strip().startswith('/* ===='):
            j -= 1
        marks.append((j, module, export, title))

    # de-duplicate / carry the module name forward over continuation banners
    active = None
    bounds = []
    for j, module, export, title in sorted(marks):
        if module:
            active = (module, export)
            bounds.append((j, module, export))
    bounds.sort()

    inner = lines[obj_start + 1:obj_end]
    offset = obj_start + 1

    pieces = []
    prev = offset
    for start_abs, module, export in bounds:
        if start_abs > prev:
            pieces.append((None, None, lines[prev:start_abs]))
        pieces.append((module, export, None))
        prev = start_abs
    pieces.append((None, None, lines[prev:obj_end]))

    # rebuild: collect text per module
    chunks: dict[str, list[str]] = {}
    order: list[tuple[str, str]] = []
    current = None
    for module, export, _ in pieces:
        if module:
            current = (module, export)
            chunks.setdefault(module, [])
            order.append(current)
            continue
        if current is None:
            chunks.setdefault('__core__', [])
            continue

    # second pass with the actual text
    chunks = {'__core__': []}
    current_module = '__core__'
    cursor = offset
    for start_abs, module, export in bounds:
        chunks.setdefault(current_module, []).extend(lines[cursor:start_abs])
        current_module = module
        chunks.setdefault(module, [])
        cursor = start_abs
    chunks.setdefault(current_module, []).extend(lines[cursor:obj_end])

    # ---- write the mixin files -----------------------------------------
    out_dir = p.parent
    mixins = []
    for module, export in order:
        body = chunks[module]
        # trim leading/trailing blank lines
        while body and not body[0].strip():
            body.pop(0)
        while body and not body[-1].strip():
            body.pop()
        text = (f"/* ==========================================================================\n"
                f"   GuardHai · shield/{module}\n"
                f"   Extracted verbatim from the ProtectEngine object literal. Merged back\n"
                f"   onto ProtectEngine with Object.assign; methods keep the same `this`.\n"
                f"   ========================================================================== */\n"
                f"export const {export} = {{\n"
                + '\n'.join(body) + '\n};\n')
        (out_dir / module).write_text(text, encoding='utf-8')
        mixins.append((module, export))
        print(f'  {module:30s} {len(body):>4} lines  export {export}')

    # ---- rewrite the core file -----------------------------------------
    core = chunks['__core__']
    while core and not core[0].strip():
        core.pop(0)
    while core and not core[-1].strip():
        core.pop()

    header_end = obj_start
    head = lines[:header_end]
    tail = lines[obj_end + 1:]          # window bridge + export

    imports = ''.join(
        f"import {{ {export} }} from './{module}';\n" for module, export in mixins)
    assigns = 'Object.assign(ProtectEngine, ' + ', '.join(e for _, e in mixins) + ');'

    new = (('\n'.join(head)).rstrip('\n') + '\n'
           + imports + '\n'
           + 'const ProtectEngine = {\n' + '\n'.join(core) + '\n};\n\n'
           + assigns + '\n'
           + '\n'.join(tail).lstrip('\n'))

    p.write_text(new, encoding='utf-8')
    print(f'  {"protect-engine.js":30s} {len(core):>4} lines  (core + Object.assign)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
