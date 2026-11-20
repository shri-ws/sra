"""Write data/sarpa_rahu_ketu/संग्रह.md (readable) from collection.json.
Run after changing the collection: python3 scripts/build_sarpa_sangrah.py"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'data/sarpa_rahu_ketu'
d = json.loads((D / 'collection.json').read_text(encoding='utf-8'))

S = {'book_verified': '✅ आपकी छपी पुस्तक से मिलाया', 'etext_unverified': '🟡 ऑनलाइन पाठ — पुस्तक से मिलाना बाक़ी',
     'ocr_reconstructed': '🟠 स्कैन (OCR) से पढ़ा — पुस्तक से मिलाना बाक़ी', 'modern': '📘 आधुनिक लेखक',
     'reference': '📎 केवल संदर्भ', 'tradition': '🪔 परंपरा — कोई श्लोक नहीं'}
G = ['बृहत्पाराशरहोराशास्त्र', 'बृहज्जातक (वराहमिहिर)', 'बृहत्संहिता (वराहमिहिर)', 'फलदीपिका (मन्त्रेश्वर)', 'मानसागरी',
     'जातक पारिजात (वैद्यनाथ)', 'Crux of Vedic Astrology — Timing of Events (संजय रथ)', 'How to Judge a Horoscope (आर. संथानम)',
     'लोक-परंपरा / आधुनिक ज्योतिष-पुस्तकें']
AUTO = 'BPHS में राहु/केतु/सर्प का उल्लेख'


def num(x):
    try:
        return float(str(x or 0).split('–')[0].split(' ')[0])
    except ValueError:
        return 0


curated = [e for e in d['entries'] if not e['category'].startswith(AUTO)]
auto = [e for e in d['entries'] if e['category'].startswith(AUTO)]
curated.sort(key=lambda e: (G.index(e['granth']) if e['granth'] in G else 99, num(e.get('chapter')), num(e.get('verse'))))

L = ['# सर्प-योग, सर्प-दोष और राहु-केतु — शास्त्र-संग्रह', '',
     'राहु-केतु, सर्प-योग और सर्प-दोष से जुड़े शास्त्र-वचन, हर एक के स्रोत और जाँच की स्थिति के साथ। '
     'रिपोर्ट के नियम (kaalsarpRules.js) इन्हीं प्रविष्टियों से श्लोक और पृष्ठ लेते हैं।', '',
     '**स्थिति के चिह्न:** ' + ' · '.join(S.values()), '',
     '**मुख्य निष्कर्ष:** "कालसर्प योग" इस नाम से किसी उपलब्ध प्राचीन ग्रंथ में नहीं मिला। शास्त्रीय आधार वाले नियम हैं — '
     'सर्प (भुजङ्ग) नाभस-योग, सर्प-शाप से संतान-बाधा, सर्पदंश/सर्पभय योग, ग्रहण-काल में जन्म, सर्प-द्रेष्काण, और राहु-केतु की शान्ति-विधि।', '']
cur = None
for e in curated:
    if e['granth'] != cur:
        cur = e['granth']
        L += ['', f'## {cur}', '']
        if e.get('edition'):
            L += [f'_संस्करण:_ {e["edition"]}', '']
    loc = ' · '.join(x for x in [f"अध्याय {e['chapter']}" if e.get('chapter') else '', e.get('chapter_title') or '',
                                 f"श्लोक {e['verse']}" if e.get('verse') else '',
                                 f"पृ. {e['printed_page']}" if e.get('printed_page') else ''] if x)
    L += [f"### {e['category']}", (f'*{loc}* — ' if loc else '') + S[e['status']], '']
    if e.get('text'):
        L += ['> ' + t for t in e['text']] + ['']
    if e.get('arth_hi'):
        L.append('**अर्थ:** ' + e['arth_hi'])
    if e.get('check'):
        L += ['', '_जाँच:_ ' + e['check']]
    L.append('')
L += ['', f'## परिशिष्ट: BPHS (अध्याय 1–53) में राहु/केतु/सर्प वाले और {len(auto)} श्लोक', '',
      'हमारे जाँचे हुए BPHS डेटाबेस से अपने-आप खोजे गए; इनका अर्थ और कुंडली-नियम अभी लिखा जाना है।', '']
L += [f"- अ. {e['chapter']} ({e['chapter_title']}) श्लो. {e['verse']}, पृ. {e['printed_page']}: {e['text'][0]}" for e in auto]
L += ['', '## अभी बाक़ी (अगले चरण)', '',
      '- BPHS अध्याय 56 (राहु-दशा) और 60 (केतु-दशा) — पूरे अध्याय पुस्तक से उतारने हैं।',
      '- सारावली: archive.org का OCR पढ़ने योग्य नहीं निकला — साफ़ पाठ या आपकी पुस्तक चाहिए।',
      '- होरासार और अध्यात्म-ज्योतिष (आपकी PDF) स्कैन हैं; जातकालंकार पुराने हिन्दी फ़ॉन्ट में है।',
      '- फलदीपिका, मानसागरी (🟠) और बृहज्जातक (🟡) के श्लोक छपी पुस्तक से मिलाने हैं।',
      '- सर्वार्थचिन्तामणि, उत्तरकालामृत, होरारत्न, लाल किताब — अभी खोजे नहीं गए।']
(D / 'संग्रह.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
print(f'संग्रह.md: {len(curated)} curated + {len(auto)} appendix')
