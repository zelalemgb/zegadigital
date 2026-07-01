#!/usr/bin/env python3
"""Extract translated quiz questions from the Amharic / Afaan Oromo docs.

Each translated quiz is a self-contained set (counts differ from English), so we
emit the full question list per track. The correct answer is read from the ✅
marker; every question is validated to have exactly 4 options + an answer.

Writes src/content/{am,om}/quiz.json
"""

import json
import re
import sys

LETTERS = ['A', 'B', 'C', 'D']
# Both scripts map to A/B/C/D (the Amharic doc mixes the two).
LETTER_MAP = {'ሀ': 'A', 'ለ': 'B', 'ሐ': 'C', 'መ': 'D', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'}

CONF = {
    'am': {
        'src': '/tmp/am.txt',
        'q_re': re.compile(r'^\s*ጥያቄ[፡:]\s*\d+'),
        'youth_start': 'የታዳጊ ትራክ ጥያቄዎች',
        'adult_start': 'የአዋቂዎች ትራክ ጥያቄዎች',
        'youth_end': 'የወጣት ፈተና',
        'adult_end': 'የአዋቂዎች ፈተና',
    },
    'om': {
        'src': '/tmp/om.txt',
        'q_re': re.compile(r'^\s*G\d+\s*:'),
        'youth_start': 'Baankii Kuusaa Battallee',
        'adult_start': 'Battallee Dargaggootaa — Ergaa Cuunfaa',
        'youth_end': 'Battallee Dargaggootaa — Ergaa Cuunfaa',
        'adult_end': 'Battallee Ga’eessotaa — Ergaa Cuunfaa',
    },
}


def clean_letter(line):
    return line.replace('✅', '').replace('❌', '').strip()


def region(lines, start, end):
    s = next((i for i, l in enumerate(lines) if start in l), None)
    if s is None:
        return []
    e = next((i for i, l in enumerate(lines) if end in l and i > s), len(lines))
    return lines[s + 1:e]


def is_letter(line):
    return clean_letter(line) in LETTER_MAP


def parse_block(block):
    """block = lines for one question (marker line excluded)."""
    q_lines, options, answer, explain = [], {}, None, None
    i = 0
    n = len(block)
    # question text: until first option letter
    while i < n:
        if is_letter(block[i]):
            break
        if block[i].strip():
            q_lines.append(block[i].strip())
        i += 1
    # options
    while i < n:
        raw = block[i]
        if is_letter(raw):
            key = LETTER_MAP[clean_letter(raw)]
            is_answer = '✅' in raw
            i += 1
            text = []
            while i < n and not is_letter(block[i]) and '🤖' not in block[i] and '💡' not in block[i]:
                if block[i].strip():
                    text.append(block[i].strip())
                i += 1
            options[key] = ' '.join(text)
            if is_answer:
                answer = key
        elif '💡' in raw and explain is None:
            explain = raw.split('💡', 1)[1].strip()
            i += 1
        else:
            i += 1
    return {'q': ' '.join(q_lines), 'options': options, 'answer': answer, 'explain': explain or ''}


def parse_track(lines, conf, start, end):
    reg = region(lines, start, end)
    idxs = [i for i, l in enumerate(reg) if conf['q_re'].match(l)]
    out = []
    for j, s in enumerate(idxs):
        e = idxs[j + 1] if j + 1 < len(idxs) else len(reg)
        out.append(parse_block(reg[s + 1:e]))
    return out


def validate(track, name):
    ok = True
    for k, q in enumerate(track):
        opts = q['options']
        if sorted(opts.keys()) != LETTERS or not q['answer'] or not q['q']:
            print(f'  !! {name} Q{k+1} malformed: answer={q["answer"]} opts={list(opts.keys())} q={q["q"][:30]!r}')
            ok = False
    return ok


for lang, conf in CONF.items():
    lines = open(conf['src'], encoding='utf-8').read().split('\n')
    youth = parse_track(lines, conf, conf['youth_start'], conf['youth_end'])
    adult = parse_track(lines, conf, conf['adult_start'], conf['adult_end'])
    print(f'{lang}: youth={len(youth)} adult={len(adult)}')
    okv = validate(youth, f'{lang}/youth') & validate(adult, f'{lang}/adult')
    data = {'youth': {'questions': youth}, 'adult': {'questions': adult}}
    out = f'src/content/{lang}/quiz.json'
    json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  -> wrote {out}  (valid={okv})')
