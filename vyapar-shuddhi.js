/* vyapar-shuddhi.js — व्यापार / नया कार्य आरम्भ मुहूर्त, जातक की कुण्डली के अनुसार (25 Nov 2026).

   दो भाग:
   1. workProfile(natal) — जातक के "कार्य-ग्रह": कौन-से ग्रह उसके काम-धन्धे को चलाते हैं।
   2. scanRange(...)      — चुनी हुई तारीख़ों के हर लग्न-खण्ड को मुहूर्त चिन्तामणि के नियमों और
                            जातक के कार्य-ग्रहों पर परखकर रैंक देता है।

   प्रमाण (हर नियम के साथ `ref` में लिखा है; पृष्ठ संख्या जहाँ पुस्तक से मिलाई गई):
   - मुहूर्त चिन्तामणि (रामदैवज्ञ, पीयूषधारा टीका), नक्षत्रप्रकरण — jainqq.org/booktext/Muhurt_Chintamani/002342:
       श्लो. 2–8 नक्षत्र-संज्ञाएँ (ध्रुव, चर, उग्र, मिश्र, क्षिप्र, मृदु, तीक्ष्ण) — पृ. 70–72
       श्लो. 17 विक्रय व विपणि (दुकान/व्यापार आरम्भ) — पृ. 79–80
       श्लो. 24 विष्टि (भद्रा) में दिया धन नहीं लौटता — पृ. 84
       श्लो. 26 सेवा (नौकरी) आरम्भ — पृ. 85
       श्लो. 27 द्रव्य-प्रयोग (धन लगाना/उधार) — पृ. 86–87
     विवाह प्रकरण, 21 महादोष (जन्म-राशि/लग्न से अष्टम लग्न) — उपयोगकर्ता की पुस्तक पृ. 356
   - बृहत्पाराशरहोराशास्त्रम् (चौखम्बा, सुधा टीका; साइट का BPHS पुस्तक-डेटाबेस):
       7.2–3 सप्तमांश = पुत्र-पौत्र, नवांश = कलत्र, दशांश = महत्फल (कर्म) — पृ. 57
       12.8 सप्तम भाव से वणिक्-क्रिया (व्यापार) — पृ. 81
       22.4 कर्मेश शुभयुक्त शुभ स्थान में → वाणिज्य या राज से लाभ — पृ. 117
       30.2–5 आरूढ लग्न; 30.8–9 आरूढ से एकादश में शुभ → न्याय से धन — पृ. 165–166
       33.13–15 आत्मकारक, अमात्यकारक; सात चर कारक — पृ. 180
       34.15 कारकांश में बली बुध → वाणिज्य में निपुण; 34.57–61 कारकांश से दशम/एकादश — पृ. 186, 192
   - फलदीपिका (मन्त्रेश्वर, अनु. वी. सुब्रह्मण्य शास्त्री), अध्याय 5 कर्माजीव — wisdomlib.org:
       5.1 लग्न, चन्द्र, सूर्य में जो बली हो, उससे दशमेश जिस नवांश में हो, उस नवांश के स्वामी से आजीविका
       5.2–5.8 नवांशेश के अनुसार काम (सूर्य … शनि); 5.9 नवांशेश बली तो बिना श्रम धन

   जहाँ नियम किसी श्लोक से सीधे नहीं, बल्कि ऊपर के सिद्धान्त को मुहूर्त पर लगाकर बना है, वहाँ
   ref में "युक्ति" लिखा है — ताकि पढ़ने वाला जान सके कि वह शास्त्र-वाक्य नहीं, उस पर आधारित गणना है।

   Pure functions; Node (module.exports) and browser (window.VyaparShuddhi). Planet positions come from the
   site's engine (Swiss Ephemeris): one chart at local noon for each day, moved by each planet's speed. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VyaparShuddhi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── basics ────────────────────────────────────────────────────────────────
  const N = x => ((x % 360) + 360) % 360;
  const D2R = Math.PI / 180;
  const NAKW = 40 / 3;
  const sgn = l => Math.floor(N(l) / 30);                     // 0..11 (मेष = 0)
  const nak = l => Math.floor(N(l) / NAKW);                   // 0..26 (अश्विनी = 0)
  const house = (fromSign, s) => ((s - fromSign + 12) % 12) + 1;   // 1..12
  const plus = (s, h) => (s + h - 1) % 12;                    // sign that is house h from s

  const P7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const P9 = P7.concat(['Rahu', 'Ketu']);
  const HI = { Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु' };
  const RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const NAK = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वाफाल्गुनी',
    'उत्तराफाल्गुनी', 'हस्त', 'चित्रा', 'स्वाती', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा',
    'शतभिषा', 'पूर्वाभाद्रपद', 'उत्तराभाद्रपद', 'रेवती'];
  const TITHI = ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'];
  const VAAR = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
  const VAAR_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  // नैसर्गिक मैत्री (BPHS 3)
  const FRIEND = {
    Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus']
  };
  const ENEMY = {
    Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars']
  };
  const BENEFIC = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
  const MALEFIC = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  // सूर्य से इतने अंश पास होने पर अस्त (सामान्य अंश; वक्री बुध 12, वक्री शुक्र 8)
  const COMBUST = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };

  // मुहूर्त चिन्तामणि नक्षत्रप्रकरण श्लो. 2–8 की संज्ञाएँ (0 = अश्विनी)
  const CLASS = {
    dhruva: [3, 11, 20, 25],               // रोहिणी, तीनों उत्तरा — श्लो. 2
    chara: [6, 14, 21, 22, 23],            // पुनर्वसु, स्वाती, श्रवण, धनिष्ठा, शतभिषा — श्लो. 3
    ugra: [1, 9, 10, 19, 24],              // भरणी, मघा, तीनों पूर्वा — श्लो. 4
    mishra: [2, 15],                       // कृत्तिका, विशाखा — श्लो. 5
    kshipra: [0, 7, 12],                   // अश्विनी, पुष्य, हस्त (+अभिजित्) — श्लो. 6
    mridu: [4, 13, 16, 26],                // मृगशिरा, चित्रा, अनुराधा, रेवती (मैत्र) — श्लो. 7
    tikshna: [5, 8, 17, 18]                // आर्द्रा, आश्लेषा, ज्येष्ठा, मूल — श्लो. 8
  };
  const CLASS_HI = { dhruva: 'ध्रुव (स्थिर)', chara: 'चर', ugra: 'उग्र', mishra: 'मिश्र', kshipra: 'क्षिप्र (लघु)', mridu: 'मृदु (मैत्र)', tikshna: 'तीक्ष्ण' };
  const classOf = n => Object.keys(CLASS).find(k => CLASS[k].includes(n));

  const REF = {
    mc17: 'मुहूर्त चिन्तामणि, नक्षत्रप्रकरण श्लो. 17 (पृ. 79–80)',
    mc24: 'मुहूर्त चिन्तामणि, नक्षत्रप्रकरण श्लो. 24 (पृ. 84)',
    mc26: 'मुहूर्त चिन्तामणि, नक्षत्रप्रकरण श्लो. 26 (पृ. 85)',
    mc27: 'मुहूर्त चिन्तामणि, नक्षत्रप्रकरण श्लो. 27 (पृ. 86–87)',
    mcClass: 'मुहूर्त चिन्तामणि, नक्षत्रप्रकरण श्लो. 2–8 (पृ. 70–72)',
    mcAshtama: 'मुहूर्त चिन्तामणि, विवाह प्रकरण — 21 महादोष (पृ. 356)',
    gochara: 'मुहूर्त चिन्तामणि, गोचर-विचार (चन्द्र बल, तारा बल) — श्लोक-संख्या पुस्तक से मिलान बाकी',
    bphs7: 'BPHS 7.2–3 (पृ. 57): दशांश से महत्फल (कर्म), नवांश से कलत्र, सप्तमांश से सन्तान',
    bphs12: 'BPHS 12.8 (पृ. 81): सप्तम भाव से वणिक्-क्रिया',
    bphs22: 'BPHS 22.4 (पृ. 117): कर्मेश शुभयुक्त शुभ स्थान में — वाणिज्य या राज से लाभ',
    bphs30: 'BPHS 30.2–5, 30.8–9 (पृ. 165–166): आरूढ लग्न, उससे एकादश',
    bphs33: 'BPHS 33.13–15 (पृ. 180): अमात्यकारक',
    bphs34: 'BPHS 34.15, 34.57–61 (पृ. 186, 192): कारकांश से दशम-एकादश',
    pd51: 'फलदीपिका 5.1: बली लग्न/चन्द्र/सूर्य से दशमेश के नवांशेश से आजीविका',
    pd5: 'फलदीपिका 5.2–5.8: नवांशेश के अनुसार काम',
    yukti: 'युक्ति — ऊपर के शास्त्रीय सिद्धान्त को मुहूर्त-कुण्डली पर लगाकर',
    bphs28: 'BPHS 28 स्पष्टबलनिर्णय (पृ. 154–161): षड्बल — स्थान, दिक्, काल, चेष्टा, नैसर्गिक, दृक्',
    bphs7v: 'BPHS 7.17–27 (पृ. 59–61): विंशोपक बल',
    bphs29: 'BPHS 29.1–6, 29.12 (पृ. 161–163): इष्ट-कष्ट — उच्चरश्मि, चेष्टारश्मि; दशा का शुभाशुभ फल इसी से',
    pd59: 'फलदीपिका 5.9: नवांशेश बली तो बिना श्रम धन',
    mcAsta: 'मुहूर्त चिन्तामणि, विवाह प्रकरण — 21 महादोष "उदयास्त-शुद्धि" (पृ. 356)',
    mcGrahan: 'मुहूर्त चिन्तामणि, विवाह प्रकरण — "ग्रहणाद्दिनसप्तकम्", ग्रहण-नक्षत्र (पृ. 364, 425–427)',
    mcSank: 'मुहूर्त चिन्तामणि, विवाह प्रकरण श्लो. 79–80 (पृ. 399–400): संक्रान्ति',
    mcVish: 'मुहूर्त चिन्तामणि, विवाह प्रकरण श्लो. 49–51 (पृ. 372): विषघटी',
    mcDur: 'मुहूर्त चिन्तामणि, विवाह प्रकरण श्लो. 54 (पृ. 375): वार-निषिद्ध मुहूर्त; श्लो. 65: कुलिक',
    mcGanda: 'मुहूर्त चिन्तामणि, विवाह प्रकरण श्लो. 43: गण्डान्त',
    mcMala: 'मलमास / क्षय मास — शुभ आरम्भ वर्ज्य (मुहूर्त ग्रन्थ; श्लोक-संख्या पुस्तक से मिलान बाकी)',
    parampara: 'परम्परा (लोक-व्यवहार में शुभ आरम्भ टाले जाते हैं)'
  };
  // विवाह प्रकरण के ये महादोष सभी शुभ आरम्भों में टाले जाते हैं, इसलिए व्यापार मुहूर्त में भी लगाए हैं।

  // पाराशरी बल: साइट के BPHS मॉड्यूल (अ. 3 मैत्री, 7 वर्ग व विंशोपक, 27 स्पष्ट दृष्टि, 28 षड्बल)
  function lab() {
    const g = typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : {});
    let L3 = g.BphsLabCh03, C5 = g.BphsLabCh05_08, D27 = g.BphsLabCh27, S28 = g.BphsLabCh28;
    if ((!L3 || !C5 || !D27 || !S28) && typeof require === 'function') {
      try { L3 = require('./bphsLabCh03.js'); C5 = require('./bphsLabCh05_08.js'); D27 = require('./bphsLabCh27.js'); S28 = require('./bphsLabCh28.js'); } catch (e) {}
    }
    return L3 && C5 && D27 && S28 ? { L3, C5, D27, S28 } : null;
  }
  function shadbalaOf(chart) {
    const X = lab(); if (!X) return null;
    try { const an = X.L3.analyze(chart); return { X, an, sb: X.S28.shadbala(chart, an, X.C5, X.D27), req: X.S28.REQUIRED }; } catch (e) { return null; }
  }
  const SB_RATIO = (SB, p) => SB && SB.sb.planets[p] ? SB.sb.planets[p].total / SB.req[p] : null;

  // ── इष्ट-कष्ट (BPHS 29.2–6, पुस्तक पृ. 161–162 की टीका और उदाहरण के अनुसार) ──
  // रश्मि: केन्द्र (0–6 राशि, 6 से अधिक हो तो 12 में से घटाया) की राशि में 1 जोड़ें, अंशादि दूने करें (29.2)
  const rashmi = x => { x = Math.min(180, Math.max(0, x)); return Math.floor(x / 30) + 1 + 2 * (x % 30) / 30; };
  const foldDeg = x => { x = N(x); return x > 180 ? 360 - x : x; };
  const DEBIL_PT = { Sun: 190, Moon: 213, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20 };
  /* abs: निरयन; ayan: अयनांश; cheshtaKendra: मंगल–शनि का चेष्टा-केन्द्र (BPHS 28.24–25, 0–180°) */
  function ishtaKashtaOf(id, abs, sunAbs, ayan, cheshtaKendra) {
    const U = rashmi(foldDeg(abs - DEBIL_PT[id]));                      // उच्चरश्मि (29.2)
    let C;                                                              // चेष्टारश्मि (29.3–4)
    if (id === 'Sun') C = rashmi(foldDeg(abs + ayan + 90));             // सायन सूर्य + 3 राशि
    else if (id === 'Moon') C = rashmi(foldDeg(abs - sunAbs));          // चन्द्र − सूर्य
    else if (typeof cheshtaKendra === 'number') C = rashmi(cheshtaKendra);
    else return null;
    // 29.6; रश्मि 8 तक जा सकती है, तो योगार्ध कभी 60 से ऊपर — "कष्टमिष्टोनखाङ्गकम्" (60 − इष्ट) ऋण न हो, इसलिए 60 पर रोका
    const ishta = Math.min(60, ((U - 1) * 10 + (C - 1) * 10) / 2);
    return { uccha: U, cheshta: C, shubhRashmi: (U + C) / 2, ishta, kashta: 60 - ishta };
  }

  // काम के प्रकार — हर एक का मुहूर्त चिन्तामणि श्लोक अलग
  const WORK = {
    vipani: { title: 'दुकान, शोरूम, दफ़्तर, फ़ैक्ट्री या नया व्यापार शुरू करना', ref: REF.mc17 },
    vikraya: { title: 'बड़ा सौदा, माल बेचना, नया स्टॉक बिक्री पर लगाना', ref: REF.mc17 },
    seva: { title: 'नई नौकरी या सेवा ज्वाइन करना', ref: REF.mc26 },
    dhan: { title: 'धन लगाना, निवेश, उधार देना', ref: REF.mc27 }
  };

  // कारोबार की श्रेणी → कारक ग्रह (फलदीपिका 5.2–5.8 और BPHS 34.15)
  const DOMAIN = {
    general: { title: 'सामान्य व्यापार, ट्रेडिंग, दुकान', karaka: ['Mercury', 'Venus'], why: 'बुध वाणिज्य (BPHS 34.15), शुक्र व्यापारी (फलदीपिका 2)' },
    food: { title: 'खाद्य, किराना, होटल, डेयरी, कृषि', karaka: ['Moon', 'Venus'], why: 'चन्द्र कृषि-गो-जल (फलदीपिका 5.3), शुक्र दूध (5.7)' },
    jewel: { title: 'सोना, चांदी, आभूषण, रत्न', karaka: ['Venus', 'Mars'], why: 'शुक्र चांदी-आभूषण (फलदीपिका 5.7), मंगल सोना-धातु (5.4)' },
    cloth: { title: 'कपड़ा, गारमेंट, फ़ैशन, सौन्दर्य', karaka: ['Venus', 'Moon'], why: 'शुक्र रेशम-सुगन्ध (फलदीपिका 5.7), चन्द्र वस्त्र-व्यापार (5.3)' },
    tech: { title: 'IT, सॉफ़्टवेयर, लेखा, लेखन, मीडिया, परामर्श', karaka: ['Mercury', 'Jupiter'], why: 'बुध लेखन-गणना (फलदीपिका 5.5), गुरु उपदेश (5.6)' },
    finance: { title: 'बैंकिंग, फ़ाइनेंस, निवेश, शिक्षा', karaka: ['Jupiter', 'Mercury'], why: 'गुरु शास्त्र-शिक्षण व ब्याज (फलदीपिका 5.6)' },
    land: { title: 'ज़मीन, निर्माण, लोहा, मशीनरी, वाहन', karaka: ['Mars', 'Saturn'], why: 'मंगल भूमि-धातु (फलदीपिका 5.4), शनि श्रम-लकड़ी (5.8)' },
    medical: { title: 'दवा, क्लिनिक, अस्पताल, सरकारी ठेका', karaka: ['Sun', 'Jupiter'], why: 'सूर्य औषध व राजसेवा (फलदीपिका 5.2)' }
  };

  // फलदीपिका 5.2–5.8: आजीविका ग्रह (दशमेश का नवांशेश) से काम
  const PD_WORK = {
    Sun: 'औषध, धातु, ऊन, मन्त्र, राजा या प्रतिष्ठित व्यक्ति की सेवा (5.2)',
    Moon: 'जल से उत्पन्न वस्तुएँ, कृषि, पशुपालन, वस्त्र-व्यापार, स्त्री की सेवा (5.3)',
    Mars: 'धातु, भूमि, सोना, अग्नि-रसोई, शस्त्र, साहस के काम (5.4)',
    Mercury: 'लेखन, गणना, ज्योतिष, काव्य, शास्त्र-अध्ययन, पौरोहित्य (5.5)',
    Jupiter: 'विद्या-उपदेश, पुराण, धर्म-शिक्षा, राज-कृपा, ब्याज पर धन (5.6)',
    Venus: 'आभूषण, चांदी, सुगन्ध, दूध, रेशम, संगीत-नृत्य, पशु, स्त्री से सम्बद्ध (5.7)',
    Saturn: 'श्रम, लकड़ी, कन्द-मूल, सेवक, बोझ ढोना, कम लागत की वस्तुएँ (5.8)'
  };

  // ── planet helpers ────────────────────────────────────────────────────────
  function dignity(p, s) {
    if (!EXALT.hasOwnProperty(p)) return 2;
    if (EXALT[p] === s) return 5;
    if ((EXALT[p] + 6) % 12 === s) return 0;
    if (OWN[p].includes(s)) return 4;
    const l = LORD[s];
    if (FRIEND[p].includes(l)) return 3;
    if (ENEMY[p].includes(l)) return 1;
    return 2;
  }
  const DIG_HI = ['नीच', 'शत्रु राशि', 'सम राशि', 'मित्र राशि', 'स्वराशि', 'उच्च'];
  const friendly = (a, b) => a === b || (FRIEND[a] || []).includes(b);
  const hostile = (a, b) => (ENEMY[a] || []).includes(b);

  // सरल बल: राशि-बल + भाव (केन्द्र/त्रिकोण +, त्रिक −). षड्बल नहीं — यह साफ़ बताया जाता है।
  function simpleStrength(p, s, lagnaSign) {
    const h = house(lagnaSign, s);
    let v = dignity(p, s);
    if ([1, 4, 7, 10].includes(h)) v += 2; else if ([5, 9].includes(h)) v += 1.5; else if (h === 11) v += 1;
    if ([6, 8, 12].includes(h)) v -= 2;
    return v;
  }

  // ── 1. जातक के कार्य-ग्रह ─────────────────────────────────────────────────
  /* natal = engine /calculate result (planets with abs; shodashavarga D9/D10 signs 0..11; vimshottariDasa) */
  function workProfile(natal, domainKey) {
    const pl = {};
    (natal.planets || []).forEach(p => { pl[p.id] = p; });
    const lagna = sgn(pl.Lagna.abs), moonS = sgn(pl.Moon.abs), sunS = sgn(pl.Sun.abs);
    const S = id => sgn(pl[id].abs);
    const sv = natal.shodashavarga || {};
    const d9 = sv.D9 || {}, d10 = sv.D10 || {};
    const items = [];                       // [{planet, role, why, ref, weight}]
    const add = (planet, role, why, ref, weight) => { if (planet) items.push({ planet, role, why, ref, weight }); };

    // (क) फलदीपिका 5.1 — लग्न, चन्द्र, सूर्य में बली से दशमेश, उसका नवांशेश = आजीविका ग्रह
    const SB = shadbalaOf(natal);
    const bases = [['लग्न', lagna], ['चन्द्र', moonS], ['सूर्य', sunS]].map(([n, s]) => {
      const lord = LORD[plus(s, 10)];
      const r = SB_RATIO(SB, lord);
      return { from: n, tenth: plus(s, 10), lord, strength: r !== null ? r : simpleStrength(lord, S(lord), lagna) / 10 };
    });
    const best = bases.slice().sort((a, b) => b.strength - a.strength)[0];
    const navSign = typeof d9[best.lord] === 'number' ? d9[best.lord] : null;
    const livelihood = navSign === null ? null : LORD[navSign];
    add(best.lord, 'कर्मेश (बली ' + best.from + ' से दशमेश)', `${best.from} से दशम ${RASHI[best.tenth]}, स्वामी ${HI[best.lord]} — ${DIG_HI[dignity(best.lord, S(best.lord))]}, ${house(lagna, S(best.lord))}वें भाव में`, REF.pd51, 3);
    if (livelihood) add(livelihood, 'आजीविका ग्रह (दशमेश का नवांशेश)', `${HI[best.lord]} नवांश में ${RASHI[navSign]} में — उसका स्वामी ${HI[livelihood]}: ${PD_WORK[livelihood] || ''}`, REF.pd51 + '; ' + REF.pd5, 3);

    // (ख) लग्न से दशमेश (BPHS 22)
    const lord10 = LORD[plus(lagna, 10)];
    if (lord10 !== best.lord) add(lord10, 'लग्न से दशमेश', `दशम भाव ${RASHI[plus(lagna, 10)]} का स्वामी`, REF.bphs22, 2);

    // (ग) दशांश (D10) — BPHS 7.3 "दशांशे महत्फलम्"
    let d10Info = null;
    if (typeof d10.Lagna === 'number') {
      const dl = d10.Lagna, d10l10 = LORD[plus(dl, 10)], d10lag = LORD[dl];
      const inD10_10 = P9.filter(p => d10[p] === plus(dl, 10));
      d10Info = { lagna: dl, tenthLord: d10l10, lagnaLord: d10lag, inTenth: inD10_10 };
      add(d10l10, 'दशांश (D10) में दशमेश', `D10 लग्न ${RASHI[dl]}, दशम ${RASHI[plus(dl, 10)]} का स्वामी`, REF.bphs7, 2);
      if (d10lag !== d10l10) add(d10lag, 'दशांश लग्नेश', `D10 लग्न ${RASHI[dl]} का स्वामी`, REF.bphs7, 1);
    }

    // (घ) आत्मकारक, अमात्यकारक — सात चर कारक, राशि में अंश के क्रम से (BPHS 33.13–15)
    const byDeg = P7.slice().sort((a, b) => (N(pl[b].abs) % 30) - (N(pl[a].abs) % 30));
    const ak = byDeg[0], amk = byDeg[1];
    add(amk, 'अमात्यकारक', `अंशों में दूसरे स्थान का ग्रह (${(N(pl[amk].abs) % 30).toFixed(1)}°) — आत्मकारक ${HI[ak]} का मन्त्री`, REF.bphs33, 2);
    const karakamsha = typeof d9[ak] === 'number' ? d9[ak] : null;

    // (ङ) आरूढ लग्न और उससे एकादश (BPHS 30)
    const lagLord = LORD[lagna];
    const cnt = house(lagna, S(lagLord));
    let al = plus(S(lagLord), cnt);
    const alH = house(lagna, al);
    if (alH === 1) al = plus(lagna, 10); else if (alH === 7) al = plus(lagna, 4);
    const al11 = plus(al, 11);

    // (च) व्यापार की श्रेणी के कारक (फलदीपिका 5)
    const dom = DOMAIN[domainKey] || DOMAIN.general;
    dom.karaka.forEach((k, i) => add(k, 'कारोबार का कारक', dom.why, REF.pd5, i === 0 ? 1.5 : 1));
    // व्यापार में बुध सदा (BPHS 34.15) और सप्तम भाव (BPHS 12.8)
    const lord7 = LORD[plus(lagna, 7)];
    add(lord7, 'सप्तमेश (वणिक्-क्रिया)', `सप्तम ${RASHI[plus(lagna, 7)]} का स्वामी — व्यापार और साझेदारी`, REF.bphs12, 1);

    // ग्रहों को जोड़कर एक सूची: ग्रह → कुल भार और कारण
    const work = {};
    items.forEach(it => {
      const w = work[it.planet] || (work[it.planet] = { planet: it.planet, hi: HI[it.planet], weight: 0, roles: [] });
      w.weight += it.weight; w.roles.push(it);
    });
    // षड्बल (BPHS 28) और विंशोपक (BPHS 7.17–27): सबल ग्रह का भार बढ़े, निर्बल का घटे
    Object.values(work).forEach(w => {
      const r = SB_RATIO(SB, w.planet);
      if (r !== null) {
        const q = SB.sb.planets[w.planet];
        w.shad = { rupas: +(q.total / 60).toFixed(2), required: +(SB.req[w.planet] / 60).toFixed(2), ratio: +r.toFixed(2) };
        w.weight += r >= 1 ? 1 : r < 0.8 ? -0.5 : 0;
        const ik = ishtaKashtaOf(w.planet, pl[w.planet].abs, pl.Sun.abs, natal.astronomy.ayanamsa_deg,
          SB.sb.planets[w.planet].cheshta && SB.sb.planets[w.planet].cheshta.kendra);
        if (ik) { w.ik = { ishta: +ik.ishta.toFixed(1), kashta: +ik.kashta.toFixed(1) }; w.weight += ik.ishta > ik.kashta ? 0.5 : -0.5; }
        try {
          const p = pl[w.planet], v = SB.X.C5.vimshopaka(w.planet, p.sign, p.deg, SB.an.relations);
          if (v && v.shodasha) w.vim = { total: +v.shodasha.total.toFixed(1), grade: v.shodasha.grade };
        } catch (e) {}
      }
    });
    const workList = Object.values(work).sort((a, b) => b.weight - a.weight);

    // कारकांश से दशम/एकादश (BPHS 34.57–61) — जन्म-कुण्डली का संकेत, मुहूर्त पर नहीं बदलता
    const notes = [];
    if (karakamsha !== null) {
      const k10 = plus(karakamsha, 10), k11 = plus(karakamsha, 11);
      const inK10 = P9.filter(p => d9[p] === k10), inK11 = P9.filter(p => d9[p] === k11);
      if (inK10.some(p => ['Mercury', 'Venus'].includes(p))) notes.push({ text: 'कारकांश से दशम में बुध/शुक्र — "व्यापारे बहुलाभः" (व्यापार में बहुत लाभ)।', ref: 'BPHS 34.59 (पृ. 192)' });
      else if (inK10.some(p => BENEFIC.includes(p))) notes.push({ text: 'कारकांश से दशम में शुभ ग्रह — स्थिर धन।', ref: 'BPHS 34.57 (पृ. 192)' });
      else if (inK10.some(p => MALEFIC.includes(p))) notes.push({ text: 'कारकांश से दशम में पाप ग्रह — व्यवसाय में धन-हानि का संकेत; मुहूर्त विशेष ध्यान से चुनें।', ref: 'BPHS 34.58 (पृ. 192)' });
      if (inK11.length) notes.push({ text: 'कारकांश से एकादश में ग्रह — सब ओर से लाभ।', ref: 'BPHS 34.61 (पृ. 192)' });
    }
    const in11fromAL = P9.filter(p => S(p) === al11);
    const lr = livelihood ? SB_RATIO(SB, livelihood) : null;
    if (lr !== null) notes.push(lr >= 1
      ? { text: `आजीविका ग्रह ${HI[livelihood]} षड्बल में सबल (आवश्यक का ${lr.toFixed(2)} गुना) — कम श्रम में धन-लाभ का योग।`, ref: REF.pd59 + '; ' + REF.bphs28 }
      : { text: `आजीविका ग्रह ${HI[livelihood]} षड्बल में आवश्यक से कम (${lr.toFixed(2)} गुना) — लाभ परिश्रम से; मुहूर्त में इसका बली होना और ज़रूरी।`, ref: REF.pd59 + '; ' + REF.bphs28 });
    if (in11fromAL.some(p => BENEFIC.includes(p))) notes.push({ text: `आरूढ लग्न (${RASHI[al]}) से एकादश में शुभ ग्रह — न्याय से धन।`, ref: 'BPHS 30.8–9 (पृ. 166)' });
    if (dignity(best.lord, S(best.lord)) >= 3 && [1, 2, 4, 5, 7, 9, 10, 11].includes(house(lagna, S(best.lord))) &&
        P9.some(p => p !== best.lord && BENEFIC.includes(p) && S(p) === S(best.lord)))
      notes.push({ text: `कर्मेश ${HI[best.lord]} शुभ ग्रह के साथ शुभ स्थान में — वाणिज्य या राज से लाभ।`, ref: REF.bphs22 });

    return {
      lagna, moonSign: moonS, moonNak: nak(pl.Moon.abs), sunSign: sunS,
      karmesh: best, bases, livelihood, livelihoodWork: livelihood ? PD_WORK[livelihood] : '',
      d10: d10Info, ak, amk, karakamsha, al, al11, lord7,
      domain: dom, work: workList, workSet: workList.map(w => w.planet), notes,
      dasha: natal.vimshottariDasa || null, bala: SB ? 'shadbala' : 'simple',
      ik: SB ? Object.fromEntries(P7.map(id => [id, ishtaKashtaOf(id, pl[id].abs, pl.Sun.abs, natal.astronomy.ayanamsa_deg,
        SB.sb.planets[id] && SB.sb.planets[id].cheshta && SB.sb.planets[id].cheshta.kendra)]).filter(([, v]) => v)) : null,
      d7Note: 'सप्तमांश (D7) व्यापार के लिए नहीं: BPHS 7.2 में सप्तमांश से पुत्र-पौत्र (सन्तान) का विचार कहा है। व्यापार-कर्म के लिए दशांश (D10) और ग्रह-बल के लिए नवांश (D9) लिए गए हैं।'
    };
  }

  // दशा: किसी तारीख़ पर महादशा और अन्तर्दशा
  function dashaAt(dasha, dateStr) {
    if (!dasha || !dasha.timeline) return null;
    const md = dasha.timeline.find(m => m.start <= dateStr && dateStr < m.end);
    if (!md) return null;
    const ad = (md.antardashas || []).find(a => a.start <= dateStr && dateStr < a.end);
    return { md: md.lord, ad: ad ? ad.subLord : null };
  }

  // ── 2. मुहूर्त-खण्डों की जाँच ─────────────────────────────────────────────
  function tropicalAsc(jdUT, lat, lon) {
    const d = jdUT - 2451545.0, T = d / 36525;
    const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T * T * T / 38710000;
    const ramc = N(gmst + lon) * D2R, eps = (23.4392911 - 0.0130042 * T) * D2R;
    return N(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * D2R) * Math.sin(eps))) / D2R);
  }
  const localJd = (y, m, d, min, tz) => (Date.UTC(y, m - 1, d) + min * 60000 - tz * 3600000) / 86400000 + 2440587.5;
  const hm = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };

  function siderealMc(jdUT, lon, ayan) {
    const d = jdUT - 2451545.0, T = d / 36525;
    const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T * T * T / 38710000;
    const ramc = N(gmst + lon) * D2R, eps = (23.4392911 - 0.0130042 * T) * D2R;
    return N(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / D2R - ayan);
  }
  // श्रीपति भाव-मध्य: लग्न, चतुर्थ, सप्तम, दशम; बीच के भाव चाप के तीसरे भाग से; सन्धि दो मध्यों के बीच
  function sripati(asc, mc) {
    const ic = N(mc + 180), ds = N(asc + 180), arc = (a, b) => N(b - a);
    const quads = [[asc, ic], [ic, ds], [ds, mc], [mc, asc]];
    const mids = [];
    quads.forEach(([a, b]) => { const w = arc(a, b) / 3; mids.push(a, N(a + w), N(a + 2 * w)); });
    const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => mids[i]);   // houses 1..12
    return order.map((m, i) => {
      const prev = order[(i + 11) % 12], next = order[(i + 1) % 12];
      return { house: i + 1, mid: m, sandhi1: N(prev + arc(prev, m) / 2), sandhi2: N(m + arc(m, next) / 2) };
    });
  }
  // मुहूर्त के क्षण का पूरा चार्ट (षड्बल के लिए): दिन के इंजन-चार्ट से ग्रह, उस मिनट का लग्न, दशम व भाव
  function slotChart(dayChart, jd, asc, mc) {
    const ast = dayChart.astronomy, t = (jd - ast.jd_ut);
    const planets = dayChart.planets.filter(p => p.id !== 'Lagna').map(p => {
      const abs = N(p.abs + (p.speed || 0) * t);
      return Object.assign({}, p, { abs, sign: sgn(abs), deg: abs % 30 });
    });
    planets.unshift({ id: 'Lagna', abs: asc, sign: sgn(asc), deg: asc % 30, speed: 0 });
    return { planets, sripatiBhavas: sripati(asc, mc), panchang: dayChart.panchang,
      astronomy: Object.assign({}, ast, { jd_ut: jd }) };
  }

  // मु.चि. श्लो. 49–51 विषघटी (नक्षत्र के प्रारम्भ से इतनी घटी के बाद 4 घटी), श्लो. 54 दुर्मुहूर्त, 65 कुलिक, 80 संक्रान्ति घटी
  const VISH = [50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 56, 24, 20, 10, 10, 18, 16, 24, 30];
  const DURMUHURTA_DAY = { 0: [14], 1: [9, 12], 2: [4], 3: [8], 4: [6, 12], 5: [9, 4], 6: [1, 2] };
  const KULIKA_DAY = { 0: 14, 1: 12, 2: 10, 3: 8, 4: 6, 5: 4, 6: 2 };
  const SANK_GHATI = { Moon: 2, Mars: 9, Mercury: 6, Jupiter: 88, Venus: 9, Saturn: 160 };
  // अमान्त चान्द्र मास: अमावस्या के समय सूर्य की राशि से (मीन → चैत्र)
  const MASA = ['वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];

  // रविवार से राहुकाल दिन के किस आठवें भाग में (1..8)
  const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
  const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

  /* day = { date:'YYYY-MM-DD', chart: engine chart at local noon (planets with abs+speed, astronomy with
             ayanamsa_deg, sunrise.sunrise_local_hrs, sunset.sunset_local_hrs) }
     opts = { lat, lon, tz, work, profile, daytime } → slots with score and reasons */
  function scanDay(day, opts) {
    const [y, mo, d] = day.date.split('-').map(Number);
    const ch = day.chart, ast = ch.astronomy || {};
    const ayan = ast.ayanamsa_deg;
    const sr = (ast.sunrise && ast.sunrise.sunrise_local_hrs) * 60, ss = (ast.sunset && ast.sunset.sunset_local_hrs) * 60;
    if (!isFinite(sr) || !isFinite(ss) || typeof ayan !== 'number') return [];
    const pos = {};
    (ch.planets || []).forEach(p => { pos[p.id] = p; });
    const at = (id, min) => N(pos[id].abs + (pos[id].speed || 0) * (min - 720) / 1440);
    const vaar = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();   // 0 = रवि (दिन सूर्योदय से)
    const dm = ss - sr;
    const rahuS = sr + (RAHU_PART[vaar] - 1) * dm / 8, rahuE = rahuS + dm / 8;
    const abhS = sr + 7 * dm / 15, abhE = sr + 8 * dm / 15;
    const from = sr, to = opts.daytime === false ? Math.min(1440, ss + 180) : ss;
    const jdNoon = localJd(y, mo, d, 720, opts.tz);

    // ── दिन-स्तर के दोष: मलमास, क्षय मास, गुरु-शुक्र अस्त, ग्रहण के 7 दिन, अयन/विषुव संक्रान्ति ──
    const sunSpd = pos.Sun.speed || 0.9856, moonSpd = pos.Moon.speed || 13.18, relSpd = moonSpd - sunSpd;
    const E0 = N(pos.Moon.abs - pos.Sun.abs);
    let sunAtNM = sgn(pos.Sun.abs - sunSpd * E0 / relSpd), sunAtNext = sgn(pos.Sun.abs + sunSpd * (360 - E0) / relSpd);
    if (Array.isArray(opts.newMoons) && opts.newMoons.length) {
      const prev = opts.newMoons.filter(x => x.jd <= jdNoon).pop(), next = opts.newMoons.find(x => x.jd > jdNoon);
      if (prev) sunAtNM = (prev.sunSign + 11) % 12;          // vivah-shuddhi गिनती 1–12
      if (next) sunAtNext = (next.sunSign + 11) % 12;
    }
    const masa = MASA[sunAtNM], dayStop = [], dayWarn = [];
    if (sunAtNM === sunAtNext) dayStop.push({ text: 'अधिक (मल) मास', ref: REF.mcMala });
    if ((sunAtNext - sunAtNM + 12) % 12 === 2) dayStop.push({ text: 'क्षय मास', ref: REF.mcMala });
    const sep = (a, b) => { const x = N(a - b); return Math.min(x, 360 - x); };
    if (sep(pos.Jupiter.abs, pos.Sun.abs) < 11) dayStop.push({ text: 'गुरु अस्त', ref: REF.mcAsta });
    if (sep(pos.Venus.abs, pos.Sun.abs) < ((pos.Venus.speed || 1) < 0 ? 8 : 10)) dayStop.push({ text: 'शुक्र अस्त', ref: REF.mcAsta });
    (opts.eclipses || []).forEach(e => {
      const dd = jdNoon - e.jd;
      if (dd >= -0.5 && dd < 7.5) dayStop.push({ text: `${e.kind === 0 ? 'सूर्य' : 'चन्द्र'} ग्रहण (${e.date}) के 7 दिन के भीतर`, ref: REF.mcGrahan });
    });
    { const sNow = N(pos.Sun.abs), b0 = Math.floor(sNow / 30) * 30;
      [[b0, (b0 - sNow) / sunSpd], [b0 + 30, (b0 + 30 - sNow) / sunSpd]].forEach(([b, tt]) => {
        if ([0, 90, 180, 270].includes(N(b)) && Math.abs(Math.floor((720 + tt * 1440) / 1440)) <= 1) dayStop.push({ text: 'अयन/विषुव संक्रान्ति का पूर्व, वर्तमान या आगामी दिन', ref: REF.mcSank });
      }); }
    // परम्परा से टाले जाने वाले समय (दण्ड, निषेध नहीं)
    const sunSg = sgn(pos.Sun.abs), tNoon = Math.floor(E0 / 12);
    if (sunSg === 8 || sunSg === 11) dayWarn.push({ pts: 12, text: `खरमास (सूर्य ${RASHI[sunSg]} में)`, ref: REF.parampara });
    if (masa === 'भाद्रपद' && tNoon >= 15) dayWarn.push({ pts: 15, text: 'पितृ पक्ष', ref: REF.parampara });
    if (masa === 'फाल्गुन' && tNoon >= 7 && tNoon <= 14) dayWarn.push({ pts: 12, text: 'होलाष्टक', ref: REF.parampara });
    if (dayStop.length) return [];

    // ग्रहों की संक्रान्ति-घटी (श्लो. 80): राशि बदलने के आगे-पीछे वर्ज्य मिनट (सूर्य ±16 घटी)
    const sankWin = [];
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach(k => {
      const spd = pos[k].speed; if (!spd) return;
      const half = (k === 'Sun' ? 16 : SANK_GHATI[k] / 2) * 24, l = N(pos[k].abs), base = Math.floor(l / 30) * 30;
      [base, base + 30].forEach(b => {
        const tt = (b - l) / spd; if (Math.abs(tt) > 5) return;
        if (k === 'Sun' && [0, 90, 180, 270].includes(N(b))) return;
        const mm = 720 + tt * 1440; sankWin.push([mm - half, mm + half]);
      });
    });
    const grahanNaks = (opts.eclipses || []).filter(e => jdNoon - e.jd > 0 && jdNoon - e.jd < 183).map(e => e.nak);
    const lagAt = m => sgn(N(tropicalAsc(localJd(y, mo, d, m, opts.tz), opts.lat, opts.lon) - ayan));
    const jupStrong = [8, 11, 3].includes(sgn(pos.Jupiter.abs));

    // हर मिनट पर स्थिति; जो बातें एक-सी रहें वे एक खण्ड. खण्ड का आरम्भ और अन्त वही मिनट हैं जिन पर
    // जाँच हुई — लग्न या तिथि बदलने का क्षण कभी खण्ड के भीतर नहीं आता (लग्न-गणना इंजन से 0.001° तक मिलती है)
    const STEP = 1, raw = [];
    for (let m = Math.ceil(from); m < to; m += STEP) {
      const sun = at('Sun', m), moon = at('Moon', m);
      const el = N(moon - sun);
      const tIdx = Math.floor(el / 12);                       // 0..29
      const kIdx = Math.floor(el / 6);                        // करण 0..59
      const vishti = kIdx >= 1 && kIdx <= 56 && (kIdx - 1) % 7 === 6;
      const lag = lagAt(m);
      const hIdx = Math.floor((m - sr) / (dm / 12));
      const hora = HORA_ORDER[(HORA_ORDER.indexOf(VAAR_LORD[vaar]) + hIdx) % 7];
      // मिनट-स्तर के दोष
      const dz = [], nk = nak(moon), abh = m >= abhS && m < abhE;
      const muh = Math.floor((m - sr) / (dm / 15)) + 1;
      if ((DURMUHURTA_DAY[vaar] || []).includes(muh)) dz.push('dur');
      if (KULIKA_DAY[vaar] === muh) dz.push('kulika');
      const g = (N(moon) % NAKW) / NAKW * 60, moonH = house(lag, sgn(moon));
      if (g >= VISH[nk] && g < VISH[nk] + 4 && ![4, 5, 7, 9, 10].includes(moonH)) dz.push('vish');
      if (sankWin.some(([a, b]) => m >= a && m <= b)) dz.push('sank');
      if (grahanNaks.includes(nk)) dz.push('grahanNak');
      if (!abh) {
        const moonStrong = [1, 3].includes(sgn(moon));
        if (!moonStrong && [0, 60, 120, 180, 240, 300, 360].some(b => Math.abs(el - b) < 0.2)) dz.push('tGanda');
        if ([0, 120, 240, 360].some(b => Math.abs(N(moon) - b) < 2 / 60 * NAKW || Math.abs(N(moon) - b) > 360 - 2 / 60 * NAKW)) dz.push('nGanda');
        if (!jupStrong && (([3, 7, 11].includes(lag) && lagAt(m + 12) !== lag) || ([4, 8, 0].includes(lag) && lagAt(m - 12) !== lag))) dz.push('lGanda');
      }
      const st = { lag, tIdx, nk, vishti, rahu: m >= rahuS && m < rahuE, dz: dz.join(',') };
      const key = [st.lag, st.tIdx, st.nk, st.vishti, st.rahu, st.dz].join('|');
      const last = raw[raw.length - 1];
      if (last && last.key === key) { last.end = m; last.horas.push([m, hora]); }
      else raw.push(Object.assign({ key, start: m, end: m, horas: [[m, hora]] }, st));
    }
    return raw.filter(s => s.end - s.start >= 12).map(s => judge(s, { y, mo, d, vaar, at, opts, abhS, abhE, date: day.date, masa, dayWarn, dayChart: ch }))
      .filter(Boolean);
  }

  function judge(s, c) {
    const { opts, at } = c, prof = opts.profile, work = opts.work || 'vipani';
    const mid = (s.start + s.end) / 2;
    const P = {};
    P9.forEach(id => { P[id] = sgn(at(id, mid)); });
    const H = id => house(s.lag, P[id]);
    const tithiNum = (s.tIdx % 15) + 1, shukla = s.tIdx < 15;
    const tithiName = s.tIdx === 29 ? 'अमावस्या' : s.tIdx === 14 ? 'पूर्णिमा' : (shukla ? 'शुक्ल ' : 'कृष्ण ') + TITHI[(s.tIdx % 15)];
    const pos = [], neg = [], stop = [];
    let score = 30;
    const good = (pts, text, ref) => { score += pts; pos.push({ text, ref }); };
    const bad = (pts, text, ref) => { score -= pts; neg.push({ text, ref }); };
    const reject = (text, ref) => { stop.push({ text, ref }); };
    const ncls = classOf(s.nk);
    let bestHora = null, core = null;

    // ── मुहूर्त चिन्तामणि के नियम ──
    const rikta = [4, 9, 14].includes(tithiNum) && s.tIdx !== 29;
    if (work === 'vipani' || work === 'vikraya') {
      if (rikta) reject(`रिक्ता तिथि (${tithiName}) — "रिक्ता… विना"`, REF.mc17);
      if (c.vaar === 2) reject('मंगलवार — "भौम… विना"', REF.mc17);
      if (s.lag === 10) reject('कुम्भ लग्न — "घटतनुं विना"', REF.mc17);
    }
    if (rikta && (work === 'seva' || work === 'dhan')) bad(15, `रिक्ता तिथि (${tithiName})`, 'परम्परा — रिक्ता तिथियाँ शुभ आरम्भ में वर्ज्य');
    if (s.tIdx === 29) bad(20, 'अमावस्या — नए आरम्भ के लिए क्षीण चन्द्र', 'परम्परा (मुहूर्त ग्रन्थों में सामान्यतः वर्ज्य)');
    if (s.vishti) reject('भद्रा (विष्टि करण)', REF.mc24);
    const DZ = { dur: ['दुर्मुहूर्त', REF.mcDur], kulika: ['कुलिक', REF.mcDur], vish: ['विषघटी', REF.mcVish], sank: ['ग्रह-संक्रान्ति काल', REF.mcSank],
      grahanNak: ['ग्रहण-नक्षत्र (पिछले 6 मास)', REF.mcGrahan], tGanda: ['तिथि-गण्डान्त', REF.mcGanda], nGanda: ['नक्षत्र-गण्डान्त', REF.mcGanda], lGanda: ['लग्न-गण्डान्त', REF.mcGanda] };
    (s.dz ? s.dz.split(',') : []).forEach(k => DZ[k] && reject(DZ[k][0], DZ[k][1]));
    (c.dayWarn || []).forEach(w => bad(w.pts, w.text, w.ref));
    if (s.rahu) reject('राहुकाल', 'परम्परा (दिनमान के आठ भाग)');

    if (work === 'vipani') {
      if (['mridu', 'dhruva', 'kshipra'].includes(ncls)) good(14, `${NAK[s.nk]} ${CLASS_HI[ncls]} नक्षत्र — विपणि के लिए विहित ("मैत्रध्रुवक्षिप्रभैः")`, REF.mc17);
      else reject(`${NAK[s.nk]} (${CLASS_HI[ncls]}) — दुकान आरम्भ के विहित नक्षत्रों (मृदु, ध्रुव, क्षिप्र) में नहीं`, REF.mc17);
      if (H('Moon') === 1 || H('Venus') === 1) good(14, `लग्न में ${H('Moon') === 1 && H('Venus') === 1 ? 'चन्द्र और शुक्र' : H('Moon') === 1 ? 'चन्द्र' : 'शुक्र'} — "लग्ने चन्द्रसिते"`, REF.mc17);
      const m812 = MALEFIC.filter(p => [8, 12].includes(H(p)));
      core = ['mridu', 'dhruva', 'kshipra'].includes(ncls) && !m812.length && BENEFIC.some(p => [2, 10, 11].includes(H(p)));
      if (m812.length) bad(18 * m812.length, `8वें/12वें भाव में पाप ग्रह (${m812.map(p => HI[p]).join(', ')}) — "व्ययाष्टरहितैः पापैः" पूरा नहीं`, REF.mc17);
      else good(8, '8वाँ और 12वाँ भाव पाप ग्रहों से ख़ाली', REF.mc17);
      const b2 = BENEFIC.filter(p => [2, 10, 11].includes(H(p)));
      if (b2.length) good(Math.min(16, 6 * b2.length), `शुभ ग्रह 2/10/11 में (${b2.map(p => HI[p] + ' ' + H(p)).join(', ')}) — "शुभैर्द्व्यायखे"`, REF.mc17);
    } else if (work === 'vikraya') {
      if ([10, 19, 24, 15, 2, 8, 1].includes(s.nk)) good(14, `${NAK[s.nk]} — विक्रय के लिए विहित (तीनों पूर्वा, विशाखा, कृत्तिका, आश्लेषा, भरणी)`, REF.mc17);
      else bad(14, `${NAK[s.nk]} विक्रय के विहित नक्षत्रों में नहीं`, REF.mc17);
      const kb = BENEFIC.filter(p => [1, 4, 7, 10, 5, 9].includes(H(p)));
      core = [10, 19, 24, 15, 2, 8, 1].includes(s.nk) && kb.length > 0;
      if (kb.length) good(Math.min(14, 5 * kb.length), `शुभ ग्रह केन्द्र-त्रिकोण में (${kb.map(p => HI[p]).join(', ')})`, REF.mc17);
      const mu = MALEFIC.filter(p => [3, 6, 11].includes(H(p)));
      if (mu.length) good(Math.min(10, 4 * mu.length), `पाप ग्रह 3/6/11 में (${mu.map(p => HI[p]).join(', ')}) — "षट्त्र्यायेष्वशुभैः"`, REF.mc17);
    } else if (work === 'seva') {
      if (['kshipra', 'mridu'].includes(ncls)) good(14, `${NAK[s.nk]} ${CLASS_HI[ncls]} — सेवा आरम्भ के लिए विहित`, REF.mc26);
      else bad(16, `${NAK[s.nk]} सेवा के विहित (क्षिप्र, मैत्र) नक्षत्रों में नहीं`, REF.mc26);
      if ([0, 3, 4, 5].includes(c.vaar)) good(8, `${VAAR[c.vaar]} — सेवा के लिए विहित वार (बुध, शुक्र, रवि, गुरु)`, REF.mc26);
      else bad(10, `${VAAR[c.vaar]} सेवा के विहित वारों में नहीं`, REF.mc26);
      if (['Mercury', 'Jupiter', 'Venus', 'Moon'].includes(LORD[s.lag])) good(6, `${RASHI[s.lag]} सौम्य लग्न`, REF.mc26);
      const sm = ['Sun', 'Mars'].filter(p => [10, 11].includes(H(p)));
      core = ['kshipra', 'mridu'].includes(ncls) && [0, 3, 4, 5].includes(c.vaar) && sm.length > 0;
      if (sm.length) good(10, `${sm.map(p => HI[p]).join(' और ')} 10वें/11वें में — "अर्के कुजे वा खलाभे"`, REF.mc26);
    } else if (work === 'dhan') {
      if ([14, 6, 4, 13, 16, 26, 15, 7, 21, 22, 23, 0].includes(s.nk)) good(14, `${NAK[s.nk]} — द्रव्य-प्रयोग के लिए विहित`, REF.mc27);
      else bad(14, `${NAK[s.nk]} द्रव्य-प्रयोग के विहित नक्षत्रों में नहीं`, REF.mc27);
      if ([0, 3, 6, 9].includes(s.lag)) good(8, `${RASHI[s.lag]} चर लग्न`, REF.mc27);
      const dirty = MALEFIC.filter(p => [5, 8, 9].includes(H(p)));
      core = [14, 6, 4, 13, 16, 26, 15, 7, 21, 22, 23, 0].includes(s.nk) && [0, 3, 6, 9].includes(s.lag) && !dirty.length;
      if (dirty.length) bad(10 * dirty.length, `5/8/9 भाव में पाप ग्रह (${dirty.map(p => HI[p]).join(', ')}) — "धर्मसुताष्टशुद्धि" नहीं`, REF.mc27);
      if (c.vaar === 3) reject('बुधवार को धन नहीं देना चाहिए', REF.mc27);
      if (['tikshna', 'mishra', 'dhruva', 'ugra'].includes(ncls)) reject(`${CLASS_HI[ncls]} नक्षत्र में लगाया धन नहीं लौटता`, REF.mc24);
    }

    // ── जातक से सम्बन्ध: चन्द्र बल, तारा बल, अष्टम लग्न ──
    if (prof) {
      const cb = house(prof.moonSign, P.Moon);
      if (cb === 8) reject('गोचर चन्द्र जन्म-राशि से 8वाँ (अष्टम चन्द्र)', REF.gochara);
      else if ([1, 3, 6, 7, 10, 11].includes(cb)) good(8, `चन्द्र बल: जन्म-राशि से ${cb}वाँ चन्द्र`, REF.gochara);
      else if ([4, 12].includes(cb)) bad(8, `जन्म-राशि से ${cb}वाँ चन्द्र`, REF.gochara);
      const tara = ((s.nk - prof.moonNak + 27) % 27) % 9 + 1;
      const TN = ['', 'जन्म', 'सम्पत्', 'विपत्', 'क्षेम', 'प्रत्यरि', 'साधक', 'वध', 'मित्र', 'परम मित्र'];
      if ([3, 5, 7].includes(tara)) bad(tara === 7 ? 25 : 14, `${TN[tara]} तारा (जन्म-नक्षत्र से)`, REF.gochara);
      else if (tara !== 1) good(6, `${TN[tara]} तारा`, REF.gochara);
      const hl = house(prof.lagna, s.lag), hr = house(prof.moonSign, s.lag);
      if (hl === 8 || hr === 8) reject(`मुहूर्त लग्न ${RASHI[s.lag]} जन्म-${hl === 8 ? 'लग्न' : 'राशि'} से 8वाँ`, REF.mcAshtama);
      if (hl === 12) bad(10, `मुहूर्त लग्न जन्म-लग्न से 12वाँ (व्यय)`, REF.yukti);

      // ── कार्य-ग्रह मुहूर्त-कुण्डली में ──
      const ws = prof.work.slice(0, 5);
      let wPts = 0;
      ws.forEach(w => {
        const p = w.planet, h = H(p), dg = dignity(p, P[p]);
        const asta = p !== 'Sun' && COMBUST[p] && Math.min(N(at(p, mid) - at('Sun', mid)), N(at('Sun', mid) - at(p, mid))) < COMBUST[p];
        let t = '';
        if ([1, 4, 7, 10, 5, 9, 11].includes(h) && dg >= 2 && !asta) { wPts += 4 + w.weight; t = `${HI[p]} (${w.roles[0].role}) मुहूर्त में ${h}वें भाव, ${DIG_HI[dg]}`; good(0, t, REF.yukti + ' — ' + w.roles[0].ref); }
        else if ([6, 8, 12].includes(h) || dg === 0 || asta) { wPts -= 3 + w.weight; t = `${HI[p]} (${w.roles[0].role}) मुहूर्त में ${asta ? 'अस्त' : dg === 0 ? 'नीच' : h + 'वें भाव'}`; bad(0, t, REF.yukti + ' — ' + w.roles[0].ref); }
      });
      score += Math.max(-24, Math.min(26, wPts));
      const ll = LORD[s.lag];
      if (prof.workSet.slice(0, 4).includes(ll)) good(10, `मुहूर्त लग्नेश ${HI[ll]} स्वयं आपका कार्य-ग्रह`, REF.yukti);
      else if (prof.workSet.slice(0, 3).some(w => friendly(ll, w))) good(5, `मुहूर्त लग्नेश ${HI[ll]} आपके कार्य-ग्रह का मित्र`, REF.yukti);
      else if (prof.workSet.slice(0, 2).some(w => hostile(ll, w))) bad(5, `मुहूर्त लग्नेश ${HI[ll]} आपके मुख्य कार्य-ग्रह का शत्रु`, REF.yukti);
      // मुहूर्त लग्न जन्म के दशम/एकादश/द्वितीय या आरूढ से एकादश
      if ([10, 11, 2].includes(hl)) good(8, `मुहूर्त लग्न ${RASHI[s.lag]} आपकी कुण्डली का ${hl}वाँ भाव (${hl === 10 ? 'कर्म' : hl === 11 ? 'लाभ' : 'धन'})`, REF.yukti + ' — ' + REF.bphs22);
      if (s.lag === prof.al11 || s.lag === prof.al) good(6, `मुहूर्त लग्न ${s.lag === prof.al ? 'आपका आरूढ लग्न' : 'आरूढ से एकादश'}`, REF.yukti + ' — ' + REF.bphs30);
      // होरा: खण्ड के भीतर जो समय कार्य-ग्रह की होरा में पड़े
      // एक-एक होरा के लगातार मिनट; उनमें से कार्य-ग्रह की सबसे लम्बी होरा
      const runs = [];
      s.horas.forEach(([m, h]) => { const r = runs[runs.length - 1]; if (r && r.h === h && m === r.to + 1) r.to = m; else runs.push({ h, from: m, to: m }); });
      const okRuns = runs.filter(r => prof.workSet.slice(0, 3).includes(r.h)).sort((a, b) => (b.to - b.from) - (a.to - a.from));
      if (okRuns.length) {
        const hFrom = okRuns[0].from, hTo = okRuns[0].to, hPl = okRuns[0].h;
        bestHora = { from: hm(hFrom), to: hm(Math.min(hTo, s.end)), planet: HI[hPl] };
        good(5, `${hm(hFrom)}–${hm(Math.min(hTo, s.end))} ${HI[hPl]} की होरा — आपका कार्य-ग्रह (इस खण्ड में यही समय सबसे अच्छा)`, 'होरा (दिनमान के 12 भाग, वार-स्वामी से क्रम)');
      }
      // दशा
      const da = dashaAt(prof.dasha, c.date);
      if (da && da.ad) {
        const set = prof.workSet.slice(0, 5);
        if (set.includes(da.ad) || set.includes(da.md)) good(6, `उस दिन ${HI[da.md]}-${HI[da.ad]} दशा — कार्य-ग्रह की दशा`, 'विंशोत्तरी दशा (BPHS दशाध्याय) — ' + REF.yukti);
        // 29.1, 29.12: दशा का शुभ-अशुभ फल दशा-स्वामी के इष्ट-कष्ट से (जन्म-कुण्डली में)
        [['महादशा', da.md], ['अन्तर्दशा', da.ad]].forEach(([nm, lord]) => {
          const ik = prof.ik && prof.ik[lord];
          if (!ik) return;
          if (ik.ishta > ik.kashta) good(3, `${nm}-स्वामी ${HI[lord]} का इष्ट ${ik.ishta.toFixed(1)}, कष्ट ${ik.kashta.toFixed(1)} — दशा का फल शुभ`, REF.bphs29);
          else bad(3, `${nm}-स्वामी ${HI[lord]} का कष्ट ${ik.kashta.toFixed(1)}, इष्ट ${ik.ishta.toFixed(1)} — दशा का फल कठिन`, REF.bphs29);
        });
      }
    }

    // अभिजित् (सामान्य शुभ) और D9 वर्गोत्तम लग्न
    if (s.start < c.abhE && s.end > c.abhS && c.vaar !== 3) good(5, 'अभिजित् मुहूर्त का भाग', REF.mcClass + ' (अभिजित् क्षिप्र-संज्ञक)');

    if (stop.length) return null;

    // ── षड्बल (BPHS 28) मुहूर्त के क्षण पर: कार्य-ग्रह और मुहूर्त लग्नेश ──
    if (prof && prof.bala === 'shadbala' && c.dayChart && c.dayChart.sripatiBhavas && c.dayChart.astronomy && c.dayChart.astronomy.sunrise) {
      const jd = localJd(c.y, c.mo, c.d, mid, opts.tz), ayan = c.dayChart.astronomy.ayanamsa_deg;
      const asc = N(tropicalAsc(jd, opts.lat, opts.lon) - ayan), mc = siderealMc(jd, opts.lon, ayan);
      const SB = shadbalaOf(slotChart(c.dayChart, jd, asc, mc));
      if (SB) {
        const say = (p, r) => `${(SB.sb.planets[p].total / 60).toFixed(1)} रूप, आवश्यक ${(SB.req[p] / 60).toFixed(1)}`;
        prof.work.slice(0, 5).filter(w => SB.sb.planets[w.planet]).forEach(w => {
          const r = SB_RATIO(SB, w.planet);
          if (r >= 1) good(3, `${HI[w.planet]} मुहूर्त में षड्बल से सबल (${say(w.planet)})`, REF.bphs28);
          else if (r < 0.75) bad(3, `${HI[w.planet]} मुहूर्त में षड्बल से निर्बल (${say(w.planet)})`, REF.bphs28);
        });
        const ll = LORD[s.lag], r = SB_RATIO(SB, ll);
        if (r !== null && r >= 1) good(5, `मुहूर्त लग्नेश ${HI[ll]} षड्बल से सबल (${say(ll)})`, REF.bphs28);
        else if (r !== null && r < 0.75) bad(5, `मुहूर्त लग्नेश ${HI[ll]} षड्बल से निर्बल (${say(ll)})`, REF.bphs28);
      }
    }
    const startMin = s.start;
    return {
      date: c.date, vaar: VAAR[c.vaar], masa: c.masa, tithi: tithiName, nakshatra: NAK[s.nk], nakClass: CLASS_HI[ncls],
      lagna: RASHI[s.lag], lagnaIdx: s.lag, hora: bestHora, core,
      start: hm(startMin), end: hm(s.end), startMin, endMin: s.end,
      raw: score, score: Math.max(0, Math.min(100, Math.round(score))), positives: pos, negatives: neg
    };
  }

  /* days = [{date, chart}], opts as scanDay → ranked list (best slot per day first, then all) */
  function scanRange(days, opts) {
    const all = [];
    days.forEach(dy => { try { all.push(...scanDay(dy, opts)); } catch (e) {} });
    // श्रेणी: अंक के साथ उस काम के श्लोक की सारी मुख्य शर्तें (core) भी पूरी हों
    all.forEach(s => {
      let t = s.raw >= 95 ? 3 : s.raw >= 75 ? 2 : s.raw >= 55 ? 1 : 0;
      if (s.core === false && t === 3) t = 2;
      s.tierN = t;
      s.tier = ['साधारण', 'ग्राह्य', 'उत्तम', 'सर्वश्रेष्ठ'][t];
    });
    all.sort((a, b) => b.tierN - a.tierN || b.raw - a.raw || a.date.localeCompare(b.date));
    const perDay = {};
    const best = all.filter(s => (perDay[s.date] = (perDay[s.date] || 0) + 1) <= 2);   // हर दिन के दो सबसे अच्छे खण्ड
    const top = best.length ? Math.max(...best.map(s => s.raw)) : 1;
    best.forEach((s, i) => { s.rank = i + 1; s.score = Math.max(0, Math.round(100 * s.raw / Math.max(top, 1))); });
    return best;
  }

  return { workProfile, scanDay, scanRange, dashaAt, ishtaKashtaOf, rashmi, WORK, DOMAIN, REF, CLASS, NAK, RASHI, HI, PD_WORK, dignity };
});
