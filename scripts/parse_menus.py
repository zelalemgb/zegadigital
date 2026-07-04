#!/usr/bin/env python3
"""Extract translated module submenus (title, body, lesson labels) from the
Amharic / Afaan Oromo docs and map them onto the English module structure.

A module menu in the docs is a run of keycap option lines (1️⃣…N️⃣) followed by
a 0️⃣ back line, with the title + body on the two lines above the "please select"
prompt. Track menus match the same shape but contain a Quiz option — excluded.

Writes src/content/{am,om}/menus.json  (nodes override: moduleId -> {title, body, options[]}).
"""

import json
import re

EN = json.load(open('/tmp/en_modules.json'))  # 11 modules, curriculum order

KEYCAP = re.compile(r'^\s*([0-9])️?⃣')  # 1️⃣ … 0️⃣

CONF = {
    'am': {'src': '/tmp/am.txt', 'select': ['ይምረጡ', 'ምረጥ', 'ምረጭ'], 'quiz': 'ፈተና', 'back': '🔙 ተመለስ'},
    'om': {'src': '/tmp/om.txt', 'select': ['fili', 'filadhu', 'filadhaa', 'Filadhu'], 'quiz': 'Battallee', 'back': "🔙 Deebi'i"},
}


def keycap(line):
    m = KEYCAP.match(line)
    return m.group(1) if m else None


def strip_keycap(line):
    return KEYCAP.sub('', line).strip()


def find_menu_blocks(lines):
    """Return [{opts:[label..], title, body}] for every module-style menu."""
    blocks = []
    i = 0
    while i < len(lines):
        d = keycap(lines[i])
        if d and d != '0':
            j = i
            opts = []
            while j < len(lines) and keycap(lines[j]) and keycap(lines[j]) != '0':
                opts.append(strip_keycap(lines[j]))
                j += 1
            k = j
            while k < len(lines) and lines[k].strip() == '':
                k += 1
            if k < len(lines) and keycap(lines[k]) == '0':
                # title/body = two non-blank lines above the "select" prompt
                above = [l.strip() for l in lines[max(0, i - 6):i] if l.strip()]
                blocks.append({'opts': opts, 'above': above})
            i = j
        else:
            i += 1
    return blocks


for lang, conf in CONF.items():
    lines = open(conf['src'], encoding='utf-8').read().split('\n')
    blocks = find_menu_blocks(lines)
    # Drop track menus (they carry a Quiz option) and any block whose options
    # don't look like a module submenu.
    modules = [b for b in blocks if not any(conf['quiz'] in o for o in b['opts'])]

    print(f'{lang}: {len(blocks)} menu blocks, {len(modules)} module menus (expected {len(EN)})')
    nodes = {}
    mism = []
    for idx, en in enumerate(EN):
        if idx >= len(modules):
            break
        blk = modules[idx]
        lessons = len(en['options']) - 1  # last EN option is Back
        if len(blk['opts']) != lessons:
            mism.append(f"{en['id']}({len(blk['opts'])}!={lessons})")
        # title/body: strip the "select" prompt, take the two lines above it.
        ctx = [l for l in blk['above'] if not any(s in l for s in conf['select'])]
        ctx = [l for l in ctx if '🤖' not in l]  # drop "🤖 Module Menu:" marker
        body = ctx[-1] if ctx else ''
        title = ctx[-2] if len(ctx) >= 2 else en['title']
        options = [{'label': lbl} for lbl in blk['opts']] + [{'label': conf['back']}]
        nodes[en['id']] = {'title': title, 'body': body, 'options': options}
    if mism:
        print('  option-count mismatches:', ', '.join(mism))
    out = f'src/content/{lang}/menus.json'
    json.dump({'nodes': nodes}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  -> wrote {out} ({len(nodes)} module menus)')
