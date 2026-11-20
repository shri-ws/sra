"""Build kaalsarpRules.js from kaalsarpRules.src.js + data/sarpa_rahu_ketu/collection.json.

Every rule in the engine names its sources by id; this copies those entries (shloka text, book,
edition, chapter, verse, page, check status) into the shipped file, so the report always shows
exactly what the collection holds. Run: python3 scripts/build_kaalsarp_rules.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / 'kaalsarpRules.src.js').read_text(encoding='utf-8')
coll = json.loads((ROOT / 'data/sarpa_rahu_ketu/collection.json').read_text(encoding='utf-8'))
by_id = {e['id']: e for e in coll['entries']}

wanted = sorted(set(re.findall(r"'((?:bphs|bj|pd|ms|tradition|modern)-[^']+)'", src)))
missing = [w for w in wanted if w not in by_id]
if missing:
    raise SystemExit(f'source ids not in collection.json: {missing}')

KEEP = ('id', 'category', 'granth', 'edition', 'chapter', 'chapter_title', 'verse',
        'printed_page', 'pdf_page', 'text', 'arth_hi', 'status', 'check')
sources = {w: {k: by_id[w].get(k) for k in KEEP} for w in wanted}
out = src.replace('/*SOURCES*/{}', json.dumps(sources, ensure_ascii=False, indent=1))
out = out.replace('GENERATED FILE kaalsarpRules.js is built from this source',
                  'GENERATED — do not edit. Built from kaalsarpRules.src.js')
(ROOT / 'kaalsarpRules.js').write_text(out, encoding='utf-8')
print(f'kaalsarpRules.js: {len(sources)} sources')
