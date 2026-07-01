#!/usr/bin/env python3
"""Extract translated lesson bodies from the Amharic / Afaan Oromo docs.

Both docs share the structure: lesson header → 💡 Did-You-Know → 🤖 Message/Ergaa N
blocks → 📌 nav footer. We split each track section by the 📌 footers (one per
lesson), anchor on the Did-You-Know to skip menu text, and split into messages.
Lessons map to the English curriculum order; the 4 reformatted Digital
Foundations lessons keep their image header.

Writes src/content/{am,om}/lessons.json  (nodes override, lessonId -> {messages})
"""

import json
import re

EN = json.load(open('/tmp/en_lessons.json'))
ORDER = [e['id'] for e in EN]
IMG = {e['id']: e['img'] for e in EN if e['img']}
EN_N = {e['id']: e['n'] for e in EN}

MSG_RE = re.compile(r'(?:Message|Ergaa)\s*\d')
# strip a leading "🤖 … Message/Ergaa N …:" marker prefix from a line
MARK_STRIP = re.compile(r'^.*?(?:Message|Ergaa)\s*\d+[^:：]*[:：]?')

CONF = {
    'am': {
        'src': '/tmp/am.txt',
        'nav': 'አሰሳ',  # 📌 አሰሳ — real footer (content also uses 📌 as a bullet)
        'youth': ('ትራክ 1', 'ፈተና – የታዳጊ'),
        'adult': ('ትራክ 2', 'ፈተና – የአዋቂ'),
    },
    'om': {
        'src': '/tmp/om.txt',
        # footer wording is inconsistent: Karaa Imalaa / Kallattii Imalaa /
        # Keessa-deemuu / Deemsa, plus the typo "Imaklaa" (Ima.?l covers both)
        'nav': r'Ima.?l|Kallattii|deemuu|Deemsa',
        'youth': ('Karaa 1: Moojula Dargaggoo', 'Battallee – Gama Dargaggoo'),
        'adult': ('Karaa 2: Moojula Ga', 'Battallee – Gama Ga'),
    },
}


def bound(lines, start, end):
    s = next((i for i, l in enumerate(lines) if start in l), 0)
    e = next((i for i, l in enumerate(lines) if end in l and i > s), len(lines))
    return lines[s:e]


def split_lessons(section, kw):
    """Split a track section into per-lesson regions by 📌 <nav> footers.

    Content can use 📌 as a bullet (e.g. THINK's "📌 N: NECESSARY"), so the
    footer must also carry the nav keyword (am 'አሰሳ' / om 'deemuu')."""
    nav = [i for i, l in enumerate(section) if '📌' in l and re.search(kw, l)]
    regions, prev = [], 0
    for n in nav:
        regions.append(section[prev:n])
        prev = n + 1
    return regions


def parse_region(region):
    msg_idxs = [i for i, l in enumerate(region) if '🤖' in l and MSG_RE.search(l)]
    first = msg_idxs[0] if msg_idxs else len(region)
    dyk_start = next((i for i in range(first) if '💡' in region[i]), None)
    if dyk_start is None:
        return None
    messages = ['\n'.join(l.strip() for l in region[dyk_start:first] if l.strip())]
    for j, s in enumerate(msg_idxs):
        e = msg_idxs[j + 1] if j + 1 < len(msg_idxs) else len(region)
        head = MARK_STRIP.sub('', region[s], count=1).strip()
        rest = [l.strip() for l in region[s + 1:e] if l.strip()]
        messages.append('\n'.join(([head] if head else []) + rest))
    return messages


for lang, conf in CONF.items():
    lines = open(conf['src'], encoding='utf-8').read().split('\n')
    regions = []
    for track in ('youth', 'adult'):
        section = bound(lines, *conf[track])
        for r in split_lessons(section, conf['nav']):
            p = parse_region(r)
            if p is not None:
                regions.append(p)
    print(f'{lang}: extracted {len(regions)} lessons (expected {len(ORDER)})')
    nodes = {}
    mism = []
    for i, lid in enumerate(ORDER):
        if i >= len(regions):
            break
        msgs = regions[i]
        if len(msgs) != EN_N[lid]:
            mism.append(f'{lid.split(".")[-1]}({len(msgs)}!={EN_N[lid]})')
        if lid in IMG:
            msgs = [{'text': msgs[0], 'image': IMG[lid]}] + msgs[1:]
        nodes[lid] = {'messages': msgs}
    if mism:
        print('  count mismatches:', ', '.join(mism))
    out = f'src/content/{lang}/lessons.json'
    json.dump({'nodes': nodes}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  -> wrote {out}  ({len(nodes)} lessons)')
