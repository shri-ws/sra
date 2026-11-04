/*
 * gunMilanService.js — 36-गुण अष्टकूट मिलान (Ashtakoot Gun Milan) engine.
 *
 * Standard Muhurta-tradition Ashtakoot (NOT from BPHS; BPHS judges marriage from the
 * 7th house, its lord and Mangal dosha). Eight kootas totalling 36 gunas:
 *   वर्ण 1, वश्य 2, तारा 3, योनि 4, ग्रह मैत्री 5, गण 6, भकूट 7, नाड़ी 8.
 * Also reports EVERY classical parihara (exception) for Nadi & Bhakut dosha, and the
 * varna-priority rule (which koota matters most for each varna).
 *
 * Pure presentation/analysis of Moon nakshatra + rashi that the Patrika engine already
 * returns; it changes no existing calculation. UMD so it runs in the browser and in node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GunMilanEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RASHIS = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"];
  var RASHI_LORDS = ["मंगल", "शुक्र", "बुध", "चन्द्र", "सूर्य", "बुध", "शुक्र", "मंगल", "गुरु", "शनि", "शनि", "गुरु"];

  // 27 nakshatras: yoni (animal), gana, nadi. (Swati's yoni corrected to Buffalo.)
  var NAK = [
    { n: "अश्विनी",        yoni: "अश्व",     gana: "देव",     nadi: "आदि" },
    { n: "भरणी",          yoni: "गज",       gana: "मनुष्य",  nadi: "मध्य" },
    { n: "कृत्तिका",       yoni: "मेष",      gana: "राक्षस",  nadi: "अन्त्य" },
    { n: "रोहिणी",        yoni: "सर्प",      gana: "मनुष्य",  nadi: "अन्त्य" },
    { n: "मृगशिरा",       yoni: "सर्प",      gana: "देव",     nadi: "मध्य" },
    { n: "आर्द्रा",        yoni: "श्वान",    gana: "मनुष्य",  nadi: "आदि" },
    { n: "पुनर्वसु",       yoni: "मार्जार",  gana: "देव",     nadi: "आदि" },
    { n: "पुष्य",         yoni: "मेष",      gana: "देव",     nadi: "मध्य" },
    { n: "आश्लेषा",       yoni: "मार्जार",  gana: "राक्षस",  nadi: "अन्त्य" },
    { n: "मघा",           yoni: "मूषक",     gana: "राक्षस",  nadi: "अन्त्य" },
    { n: "पूर्वाफाल्गुनी", yoni: "मूषक",     gana: "मनुष्य",  nadi: "मध्य" },
    { n: "उत्तराफाल्गुनी", yoni: "गौ",       gana: "मनुष्य",  nadi: "आदि" },
    { n: "हस्त",          yoni: "महिष",     gana: "देव",     nadi: "आदि" },
    { n: "चित्रा",        yoni: "व्याघ्र",   gana: "राक्षस",  nadi: "मध्य" },
    { n: "स्वाति",        yoni: "महिष",     gana: "देव",     nadi: "अन्त्य" },  // Buffalo (not Deer)
    { n: "विशाखा",        yoni: "व्याघ्र",   gana: "राक्षस",  nadi: "अन्त्य" },
    { n: "अनुराधा",       yoni: "मृग",      gana: "देव",     nadi: "मध्य" },
    { n: "ज्येष्ठा",       yoni: "मृग",      gana: "राक्षस",  nadi: "आदि" },
    { n: "मूल",           yoni: "श्वान",    gana: "राक्षस",  nadi: "आदि" },
    { n: "पूर्वाषाढ़ा",    yoni: "वानर",     gana: "मनुष्य",  nadi: "मध्य" },
    { n: "उत्तराषाढ़ा",    yoni: "नकुल",     gana: "मनुष्य",  nadi: "अन्त्य" },
    { n: "श्रवण",         yoni: "वानर",     gana: "देव",     nadi: "अन्त्य" },
    { n: "धनिष्ठा",       yoni: "सिंह",     gana: "राक्षस",  nadi: "मध्य" },
    { n: "शतभिषा",        yoni: "अश्व",     gana: "राक्षस",  nadi: "आदि" },
    { n: "पूर्वाभाद्रपद",  yoni: "सिंह",     gana: "मनुष्य",  nadi: "आदि" },
    { n: "उत्तराभाद्रपद",  yoni: "गौ",       gana: "मनुष्य",  nadi: "मध्य" },
    { n: "रेवती",         yoni: "गज",       gana: "देव",     nadi: "अन्त्य" }
  ];

  // Yoni compatibility (0–4). Same=4, friend=3, neutral=2, enemy=1, sworn enemy=0.
  // Sworn-enemy pairs (0): गौ-व्याघ्र, गज-सिंह, अश्व-महिष, श्वान-मृग, सर्प-नकुल, मार्जार-मूषक, वानर-मेष.
  var YONIS = ["अश्व","गज","मेष","सर्प","श्वान","मार्जार","मूषक","गौ","महिष","व्याघ्र","मृग","वानर","नकुल","सिंह"];
  var YONI = {
    "अश्व":    {"अश्व":4,"गज":2,"मेष":2,"सर्प":2,"श्वान":2,"मार्जार":2,"मूषक":1,"गौ":2,"महिष":0,"व्याघ्र":1,"मृग":3,"वानर":3,"नकुल":2,"सिंह":1},
    "गज":      {"अश्व":2,"गज":4,"मेष":3,"सर्प":3,"श्वान":2,"मार्जार":2,"मूषक":2,"गौ":2,"महिष":3,"व्याघ्र":1,"मृग":2,"वानर":2,"नकुल":2,"सिंह":0},
    "मेष":     {"अश्व":2,"गज":3,"मेष":4,"सर्प":2,"श्वान":1,"मार्जार":2,"मूषक":2,"गौ":3,"महिष":3,"व्याघ्र":0,"मृग":3,"वानर":0,"नकुल":2,"सिंह":1},
    "सर्प":    {"अश्व":2,"गज":3,"मेष":2,"सर्प":4,"श्वान":2,"मार्जार":2,"मूषक":2,"गौ":2,"महिष":2,"व्याघ्र":2,"मृग":2,"वानर":2,"नकुल":0,"सिंह":2},
    "श्वान":   {"अश्व":2,"गज":2,"मेष":1,"सर्प":2,"श्वान":4,"मार्जार":2,"मूषक":2,"गौ":2,"महिष":2,"व्याघ्र":1,"मृग":0,"वानर":2,"नकुल":2,"सिंह":1},
    "मार्जार": {"अश्व":2,"गज":2,"मेष":2,"सर्प":2,"श्वान":2,"मार्जार":4,"मूषक":0,"गौ":2,"महिष":2,"व्याघ्र":2,"मृग":2,"वानर":3,"नकुल":2,"सिंह":2},
    "मूषक":   {"अश्व":1,"गज":2,"मेष":2,"सर्प":2,"श्वान":2,"मार्जार":0,"मूषक":4,"गौ":2,"महिष":2,"व्याघ्र":2,"मृग":2,"वानर":2,"नकुल":2,"सिंह":2},
    "गौ":      {"अश्व":2,"गज":2,"मेष":3,"सर्प":2,"श्वान":2,"मार्जार":2,"मूषक":2,"गौ":4,"महिष":3,"व्याघ्र":0,"मृग":3,"वानर":2,"नकुल":2,"सिंह":1},
    "महिष":   {"अश्व":0,"गज":3,"मेष":3,"सर्प":2,"श्वान":2,"मार्जार":2,"मूषक":2,"गौ":3,"महिष":4,"व्याघ्र":1,"मृग":2,"वानर":2,"नकुल":2,"सिंह":1},
    "व्याघ्र": {"अश्व":1,"गज":1,"मेष":0,"सर्प":2,"श्वान":1,"मार्जार":2,"मूषक":2,"गौ":0,"महिष":1,"व्याघ्र":4,"मृग":1,"वानर":2,"नकुल":2,"सिंह":1},
    "मृग":     {"अश्व":3,"गज":2,"मेष":3,"सर्प":2,"श्वान":0,"मार्जार":2,"मूषक":2,"गौ":3,"महिष":2,"व्याघ्र":1,"मृग":4,"वानर":2,"नकुल":2,"सिंह":2},
    "वानर":   {"अश्व":3,"गज":2,"मेष":0,"सर्प":2,"श्वान":2,"मार्जार":3,"मूषक":2,"गौ":2,"महिष":2,"व्याघ्र":2,"मृग":2,"वानर":4,"नकुल":2,"सिंह":2},
    "नकुल":   {"अश्व":2,"गज":2,"मेष":2,"सर्प":0,"श्वान":2,"मार्जार":2,"मूषक":2,"गौ":2,"महिष":2,"व्याघ्र":2,"मृग":2,"वानर":2,"नकुल":4,"सिंह":2},
    "सिंह":    {"अश्व":1,"गज":0,"मेष":1,"सर्प":2,"श्वान":1,"मार्जार":2,"मूषक":2,"गौ":1,"महिष":1,"व्याघ्र":1,"मृग":2,"वानर":2,"नकुल":2,"सिंह":4}
  };

  // Natural planetary friendship (नैसर्गिक मैत्री). 'F' friend, 'N' neutral, 'E' enemy.
  var REL = {
    "सूर्य":  { "चन्द्र":"F","मंगल":"F","गुरु":"F","बुध":"N","शुक्र":"E","शनि":"E" },
    "चन्द्र": { "सूर्य":"F","बुध":"F","मंगल":"N","गुरु":"N","शुक्र":"N","शनि":"N" },
    "मंगल":  { "सूर्य":"F","चन्द्र":"F","गुरु":"F","बुध":"E","शुक्र":"N","शनि":"N" },
    "बुध":   { "सूर्य":"F","शुक्र":"F","चन्द्र":"E","मंगल":"N","गुरु":"N","शनि":"N" },
    "गुरु":  { "सूर्य":"F","चन्द्र":"F","मंगल":"F","बुध":"E","शुक्र":"E","शनि":"N" },
    "शुक्र": { "बुध":"F","शनि":"F","सूर्य":"E","चन्द्र":"E","मंगल":"N","गुरु":"N" },
    "शनि":   { "बुध":"F","शुक्र":"F","सूर्य":"E","चन्द्र":"E","मंगल":"E","गुरु":"N" }
  };
  function rel(a, b) { if (a === b) return 'S'; return (REL[a] && REL[a][b]) || 'N'; }

  // Varna from rashi (by element): जल→ब्राह्मण, अग्नि→क्षत्रिय, पृथ्वी→वैश्य, वायु→शूद्र.
  var VARNA_RANK = { "ब्राह्मण": 4, "क्षत्रिय": 3, "वैश्य": 2, "शूद्र": 1 };
  function varnaOf(r) {
    if (r === 3 || r === 7 || r === 11) return "ब्राह्मण";   // कर्क, वृश्चिक, मीन (जल)
    if (r === 0 || r === 4 || r === 8) return "क्षत्रिय";     // मेष, सिंह, धनु (अग्नि)
    if (r === 1 || r === 5 || r === 9) return "वैश्य";        // वृष, कन्या, मकर (पृथ्वी)
    return "शूद्र";                                           // मिथुन, तुला, कुम्भ (वायु)
  }

  // Vashya group — मुहूर्त चिन्तामणि, विवाह प्रकरण श्लोक 23 (p.331–332):
  // नर (द्विपद) मिथुन, कन्या, तुला; जलचर कर्क, मकर, कुम्भ, मीन; कीट वृश्चिक; शेष चतुष्पद।
  function vashyaOf(r) {
    if (r === 2 || r === 5 || r === 6) return "द्विपद";
    if (r === 3 || r === 9 || r === 10 || r === 11) return "जलचर";
    if (r === 7) return "कीट";
    return "चतुष्पद";                                           // मेष, वृष, सिंह, धनु
  }
  // Vashya points: the text's table (p.332), row = कन्या, column = वर
  var VASHYA_TABLE = {
    "द्विपद":  { "द्विपद": 2,   "चतुष्पद": 0.5, "जलचर": 0.5, "कीट": 1 },
    "चतुष्पद": { "द्विपद": 0.5, "चतुष्पद": 2,   "जलचर": 2,   "कीट": 2 },
    "जलचर":   { "द्विपद": 0.5, "चतुष्पद": 2,   "जलचर": 2,   "कीट": 2 },
    "कीट":     { "द्विपद": 1,   "चतुष्पद": 2,   "जलचर": 2,   "कीट": 2 }
  };
  function vashyaPts(bg, gg) { return VASHYA_TABLE[gg][bg]; }

  function nakOfIdx(i) { return NAK[((i % 27) + 27) % 27]; }

  // ---- main ----
  // boy/girl: { name, nakIdx(0-26), pada(1-4), rashiIdx(0-11), deg(0-30) }
  function calculateGunMilan(boy, girl) {
    var bNak = nakOfIdx(boy.nakIdx), gNak = nakOfIdx(girl.nakIdx);
    var bLord = RASHI_LORDS[boy.rashiIdx], gLord = RASHI_LORDS[girl.rashiIdx];
    var kootas = [];

    // 1. वर्ण (1)
    var bVar = varnaOf(boy.rashiIdx), gVar = varnaOf(girl.rashiIdx);
    var varnaP = (VARNA_RANK[bVar] >= VARNA_RANK[gVar]) ? 1 : 0;
    kootas.push({ key: "varna", name: "वर्ण", max: 1, pts: varnaP, boy: bVar, girl: gVar,
      note: varnaP ? "वर का वर्ण वधू के बराबर या उच्च है — शुभ।" : "वधू का वर्ण वर से ऊँचा है — वर्ण मिलान शून्य।" });

    // 2. वश्य (2)
    var bVg = vashyaOf(boy.rashiIdx), gVg = vashyaOf(girl.rashiIdx);
    var vashyaP = vashyaPts(bVg, gVg);
    kootas.push({ key: "vashya", name: "वश्य", max: 2, pts: vashyaP, boy: bVg, girl: gVg,
      note: vashyaP === 2 ? "वश्य अनुकूल (श्लोक 23)।" : vashyaP === 1 ? "वश्य मध्यम (श्लोक 23)।" : "वश्य अल्प — नर राशि का जलचर/चतुष्पद से (श्लोक 23)।" });

    // 3. तारा (3). Count inclusive, remainder mod 9; bad taras: 3(विपत्),5(प्रत्यरि),7(वध).
    function taraNum(fromIdx, toIdx) { return (((toIdx - fromIdx + 27) % 27) % 9) + 1; }
    var t1 = taraNum(boy.nakIdx, girl.nakIdx), t2 = taraNum(girl.nakIdx, boy.nakIdx);
    var bad = [3, 5, 7];
    var b1 = bad.indexOf(t1) >= 0, b2 = bad.indexOf(t2) >= 0;
    var taraP = (b1 && b2) ? 0 : (b1 || b2) ? 1.5 : 3;
    var TARA_NAMES = ["", "जन्म", "सम्पत्", "विपत्", "क्षेम", "प्रत्यरि", "साधक", "वध", "मित्र", "अतिमित्र"];
    kootas.push({ key: "tara", name: "तारा", max: 3, pts: taraP, boy: TARA_NAMES[t1] + " तारा", girl: TARA_NAMES[t2] + " तारा",
      note: taraP === 3 ? "दोनों दिशाओं की तारा शुभ।" : taraP === 1.5 ? "एक ओर अशुभ तारा।" : "दोनों ओर अशुभ तारा।" });

    // 4. योनि (4)
    var yoniP = (YONI[bNak.yoni] && YONI[bNak.yoni][gNak.yoni] != null) ? YONI[bNak.yoni][gNak.yoni] : 2;
    kootas.push({ key: "yoni", name: "योनि", max: 4, pts: yoniP, boy: bNak.yoni, girl: gNak.yoni,
      note: yoniP === 4 ? "समान योनि — शारीरिक अनुकूलता उत्तम।" : yoniP === 0 ? "परम शत्रु योनि।" : yoniP >= 3 ? "मित्र योनि।" : yoniP === 1 ? "शत्रु योनि।" : "सम योनि।" });

    // 5. ग्रह मैत्री (5)
    var r1 = rel(bLord, gLord), r2 = rel(gLord, bLord), maitriP;
    if (r1 === 'S') maitriP = 5;
    else {
      var set = [r1, r2].sort().join('');
      if (set === 'FF') maitriP = 5;
      else if (set === 'FN') maitriP = 4;
      else if (set === 'NN') maitriP = 3;
      else if (set === 'EF') maitriP = 1;
      else if (set === 'EN') maitriP = 0.5;
      else maitriP = 0; // EE
    }
    var lordsFriendly = (r1 === 'S') || (maitriP >= 4);
    kootas.push({ key: "maitri", name: "ग्रह मैत्री", max: 5, pts: maitriP, boy: bLord, girl: gLord,
      note: maitriP >= 4 ? "राशि-स्वामी परस्पर मित्र — मानसिक मेल उत्तम।" : maitriP >= 1 ? "राशि-स्वामी सम/आंशिक।" : "राशि-स्वामी शत्रु — मानसिक मेल कठिन।" });

    // 6. गण (6). (AstroSage-style table.)
    var bG = bNak.gana, gG = gNak.gana, ganaP;
    if (bG === gG) ganaP = 6;
    else if (bG === "देव" && gG === "मनुष्य") ganaP = 6;
    else if (bG === "मनुष्य" && gG === "देव") ganaP = 5;
    else if (bG === "देव" && gG === "राक्षस") ganaP = 1;
    else if (bG === "राक्षस" && gG === "देव") ganaP = 1;
    else ganaP = 0; // मनुष्य-राक्षस (किसी भी क्रम में)
    var ganaNote = null;
    if (ganaP < 6) {
      var s37 = (sameNak && boy.rashiIdx !== girl.rashiIdx) || (boy.rashiIdx === girl.rashiIdx && !sameNak) || (sameNak && boy.pada !== girl.pada);
      var bNL = RASHI_LORDS[Math.floor((boy.rashiIdx * 30 + (boy.deg || 0)) * 9 / 30) % 12], gNL = RASHI_LORDS[Math.floor((girl.rashiIdx * 30 + (girl.deg || 0)) * 9 / 30) % 12];
      var s33 = (bLord === gLord || (rel(bLord, gLord) === 'F' && rel(gLord, bLord) === 'F')) || (bNL === gNL || (rel(bNL, gNL) === 'F' && rel(gNL, bNL) === 'F'));
      if (s37 || s33) { ganaNote = "गण भिन्न, पर " + (s37 ? "श्लोक 37 (नक्षत्र/राशि भेद)" : "राशीश/नवांशेश मैत्री (श्लोक 33)") + " से गण दोष नहीं।"; ganaP = 6; }
    }
    kootas.push({ key: "gana", name: "गण", max: 6, pts: ganaP, boy: bG, girl: gG,
      note: ganaNote || (ganaP >= 5 ? "गण अनुकूल — स्वभाव मेल।" : ganaP >= 1 ? "गण आंशिक अनुकूल।" : "गण विरोध — स्वभाव में टकराव सम्भव।") });

    // 7. भकूट (7). दोष: 2-12 (द्विर्द्वादश), 5-9 (नवपंचम), 6-8 (षडाष्टक) — श्लोक 31.
    var fwd = ((girl.rashiIdx - boy.rashiIdx + 12) % 12) + 1;      // 1..12
    var isBhakutDosha = ([2, 12, 5, 9, 6, 8].indexOf(fwd) >= 0);
    // p.343: द्विर्द्वादश मीनादि युग्म राशियों (मीन-मेष, वृष-मिथुन, कर्क-सिंह, कन्या-तुला, वृश्चिक-धनु, मकर-कुम्भ) में शुभ
    var dwShubh = false;
    if (fwd === 2 || fwd === 12) {
      var first = (fwd === 2) ? boy.rashiIdx : girl.rashiIdx;      // the sign the other is 2nd from
      dwShubh = ((first + 1) % 2 === 0);                            // 1-based even sign: मीनादि क्रम
      if (dwShubh) isBhakutDosha = false;
    }
    var bhakutType = (fwd === 2 || fwd === 12) ? "द्विर्द्वादश (2-12)" : (fwd === 5 || fwd === 9) ? "नवपंचम (5-9)" : (fwd === 6 || fwd === 8) ? "षडाष्टक (6-8)" : "";
    // नाड़ी (needed first: every भकूट परिहार requires नाड़ी शुद्धि — श्लोक 32–33, p.343–348)
    var sameNadi = (bNak.nadi === gNak.nadi);
    var sameNak = (((boy.nakIdx % 27) + 27) % 27) === (((girl.nakIdx % 27) + 27) % 27);
    // श्लोक 37 (p.354–356): एक राशि भिन्न नक्षत्र, या एक नक्षत्र भिन्न राशि, या एक नक्षत्र भिन्न चरण — नाड़ी व गण दोष नहीं
    var np1 = (sameNak && boy.pada && girl.pada && boy.pada !== girl.pada);      // एक नक्षत्र, भिन्न चरण
    var np2 = (boy.rashiIdx === girl.rashiIdx && !sameNak);                       // एक राशि, भिन्न नक्षत्र
    var np5 = (sameNak && boy.rashiIdx !== girl.rashiIdx);                        // एक नक्षत्र, भिन्न राशि
    // p.353 चरण-वेध: एक नक्षत्र में चरण 1↔4 व 2↔3 परस्पर विद्ध — तब परिहार नहीं
    var charanVedha = sameNak && boy.pada && girl.pada && (boy.pada + girl.pada === 5);
    var np4 = (boy.rashiIdx !== girl.rashiIdx && (bLord === gLord || maitriP === 5)); // भिन्न राशि, राशि-स्वामी एक/मित्र
    // मुहूर्त चिन्तामणि में नाड़ी का परिहार केवल श्लोक 37 से; राशीश-मैत्री से नहीं (p.347: नाड़ी दोष रहते अन्य परिहार अविचारणीय)
    var nadiShuddh = !sameNadi || (((np1 || np5) && !charanVedha) || np2);

    // नवांश-स्वामी (चन्द्र के नवांश)
    function navLord(p) { var a = p.rashiIdx * 30 + (p.deg || 0); return RASHI_LORDS[Math.floor(a * 9 / 30) % 12]; }
    var bNavL = navLord(boy), gNavL = navLord(girl);
    var navMaitri = bNavL === gNavL || (rel(bNavL, gNavL) === 'F' && rel(gNavL, bNavL) === 'F');

    // भकूट परिहार — श्लोक 32–33 (p.342–348): एकाधिपत्य, राशीश मैत्री, नवांशेश मैत्री, तारा शुद्धि,
    // गण शुद्धि, राशि-वश्यता; प्रत्येक में नाड़ी शुद्धि अनिवार्य
    var bhakutParihars = [];
    var hLord = (bLord === gLord), hMaitri = (bLord !== gLord && maitriP === 5),
        hTara = (taraP === 3), hGana = (bG === gG), hVashya = (vashyaP === 2);
    if (isBhakutDosha) {
      bhakutParihars.push({ text: "दोनों राशियों का एक ही स्वामी (एकाधिपत्य) — श्लोक 32", ok: hLord && nadiShuddh });
      bhakutParihars.push({ text: "राशि-स्वामी परस्पर मित्र — श्लोक 32–33", ok: hMaitri && nadiShuddh });
      bhakutParihars.push({ text: "नवांश-स्वामी (" + bNavL + "–" + gNavL + ") एक या परस्पर मित्र — श्लोक 32–33", ok: navMaitri && nadiShuddh });
      bhakutParihars.push({ text: "तारा शुद्धि — श्लोक 32", ok: hTara && nadiShuddh });
      bhakutParihars.push({ text: "गण शुद्धि (एक गण) — पीताम्बरा p.348", ok: hGana && nadiShuddh });
      bhakutParihars.push({ text: "राशि-वश्यता — श्लोक 32", ok: hVashya && nadiShuddh });
      if (!nadiShuddh) bhakutParihars.push({ text: "नाड़ी दोष होने से कोई भकूट परिहार मान्य नहीं (p.348)", ok: false });
    }
    // राशि/नवांश-स्वामी की मैत्री भकूट दोष को नष्ट करती है (श्लोक 33: "खेटप्रीतिश्चापि दुष्टं भकूटम्") — पूरे 7 गुण;
    // तारा/गण/वश्यता के परिहार से विवाह शुभ, पर भकूट के गुण नहीं जुड़ते
    var bhakutExempt = isBhakutDosha && nadiShuddh && (hLord || hMaitri || navMaitri || hTara || hGana || hVashya);
    var bhakutLordExempt = isBhakutDosha && nadiShuddh && (hLord || hMaitri || navMaitri);
    var bhakutP = (!isBhakutDosha || bhakutLordExempt) ? 7 : 0;
    kootas.push({ key: "bhakut", name: "भकूट", max: 7, pts: bhakutP, boy: RASHIS[boy.rashiIdx], girl: RASHIS[girl.rashiIdx],
      note: dwShubh ? "द्विर्द्वादश, पर मीनादि युग्म राशि — शुभ (p.343)।"
        : !isBhakutDosha ? "भकूट दोष नहीं।"
        : bhakutLordExempt ? (bhakutType + " दोष था, पर स्वामी-मैत्री से भंग (श्लोक 32–33)।")
        : bhakutExempt ? (bhakutType + " भकूट दोष — शास्त्रोक्त परिहार है, विवाह शुभ (श्लोक 32); गुण नहीं जुड़ते।")
        : (bhakutType + " भकूट दोष — परिहार नहीं मिला।") });

    // 8. नाड़ी (8) — श्लोक 34, 37. समान नाड़ी → दोष, जब तक परिहार न हो।
    var nadiParihars = [];
    if (sameNadi) {
      nadiParihars.push({ text: "एक नक्षत्र, भिन्न राशि — श्लोक 37", ok: np5 && !charanVedha });
      nadiParihars.push({ text: "एक नक्षत्र, भिन्न चरण (चरण-वेध न हो: 1↔4, 2↔3) — श्लोक 37, p.353", ok: np1 && !charanVedha });
      nadiParihars.push({ text: "एक राशि, भिन्न नक्षत्र — श्लोक 37", ok: np2 });
      nadiParihars.push({ text: "राशि-स्वामी एक या मित्र — अन्य ग्रन्थों का मत, मुहूर्त चिन्तामणि में नहीं; ज्योतिषी से पुष्टि करें", ok: np4 ? null : false });
    }
    var nadiExempt = sameNadi && nadiShuddh;
    var nadiP = (!sameNadi || nadiExempt) ? 8 : 0;
    kootas.push({ key: "nadi", name: "नाड़ी", max: 8, pts: nadiP, boy: bNak.nadi, girl: gNak.nadi,
      note: !sameNadi ? "भिन्न नाड़ी — उत्तम (संतान-स्वास्थ्य हेतु शुभ)।" : nadiExempt ? "समान नाड़ी थी, पर परिहार से दोष भंग।" : "समान नाड़ी — नाड़ी दोष, परिहार नहीं मिला।" });

    // total
    var total = kootas.reduce(function (s, k) { return s + k.pts; }, 0);
    var quality, qkey;
    if (total >= 32) { quality = "उत्तम — सर्वश्रेष्ठ मिलान"; qkey = "excellent"; }
    else if (total >= 24) { quality = "शुभ — अनुकूल मिलान"; qkey = "good"; }
    else if (total >= 18) { quality = "मध्यम — स्वीकार्य (दोष-परिहार देखें)"; qkey = "medium"; }
    else { quality = "अल्प — विवाह हेतु अनुकूल नहीं (पूरी कुंडली व उपाय आवश्यक)"; qkey = "low"; }

    // varna-priority rule: कौन-सा कूट किस वर्ण के लिए सर्वाधिक महत्वपूर्ण
    var PRIORITY = { "ब्राह्मण": "नाड़ी", "क्षत्रिय": "वर्ण", "वैश्य": "गण", "शूद्र": "योनि" };
    var varnaPriority = {
      boyVarna: bVar, girlVarna: gVar,
      boyKey: PRIORITY[bVar], girlKey: PRIORITY[gVar],
      note: "शास्त्र के अनुसार प्रधान कूट — ब्राह्मण: नाड़ी, क्षत्रिय: वर्ण, वैश्य: गण, शूद्र: योनि। " +
            "वर (" + bVar + ") हेतु « " + PRIORITY[bVar] + " » तथा वधू (" + gVar + ") हेतु « " + PRIORITY[gVar] + " » कूट सबसे महत्वपूर्ण।"
    };

    return {
      kootas: kootas, total: total, max: 36, quality: quality, qkey: qkey,
      bhakut: { dosha: isBhakutDosha, type: bhakutType, exempt: bhakutExempt, parihars: bhakutParihars },
      nadi: { dosha: sameNadi, exempt: nadiExempt, parihars: nadiParihars },
      varnaPriority: varnaPriority,
      boy: { name: boy.name || "वर", nakshatra: bNak.n, pada: boy.pada, rashi: RASHIS[boy.rashiIdx], lord: bLord, varna: bVar, vashya: bVg, yoni: bNak.yoni, gana: bNak.gana, nadi: bNak.nadi },
      girl: { name: girl.name || "वधू", nakshatra: gNak.n, pada: girl.pada, rashi: RASHIS[girl.rashiIdx], lord: gLord, varna: gVar, vashya: gVg, yoni: gNak.yoni, gana: gNak.gana, nadi: gNak.nadi }
    };
  }

  // helper: Moon absolute longitude (0-360 sidereal) -> nak/pada/rashi/deg
  function fromMoonAbs(moonAbs, name) {
    var abs = ((moonAbs % 360) + 360) % 360;
    var nakIdx = Math.floor(abs / (360 / 27));
    var pada = Math.floor((abs % (360 / 27)) / (360 / 108)) + 1;
    var rashiIdx = Math.floor(abs / 30);
    var deg = abs % 30;
    return { name: name, nakIdx: nakIdx, pada: pada, rashiIdx: rashiIdx, deg: deg };
  }

  return { calculateGunMilan: calculateGunMilan, fromMoonAbs: fromMoonAbs, NAK: NAK, RASHIS: RASHIS, RASHI_LORDS: RASHI_LORDS };
}));
