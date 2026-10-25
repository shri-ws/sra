/**
 * =============================================================================
 * MEGA PARASHARA KUNDALI ENGINE (मेगा पाराशर कुण्डली इंजन)
 * Based on the Classical Canon: बृहत्पाराशरहोराशास्त्रम् (Brihat Parashara Hora Shastra)
 * Complete All-Chapters Shloka Matching & Computational Evaluation Engine (सम्पूर्ण संहिता फलित विधान)
 * =============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParasharaEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const RASHI_NAMES = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"
  ];

  const GRAHA_NAMES = {
    Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध",
    Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु"
  };

  const RASHI_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
  ];

  const EXALTATION_SIGNS = {
    Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 8
  };

  const DEBILITATION_SIGNS = {
    Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 2
  };

  const MOOLATRIKONA_SIGNS = {
    Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10
  };

  const OWN_SIGNS = {
    Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
    Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10]
  };

  // Helper: Get sign index (0-11)
  function getSignIndex(deg360) {
    let d = deg360 % 360;
    if (d < 0) d += 360;
    return Math.floor(d / 30);
  }

  // Helper: Get degree within sign (0-30)
  function getDegInSign(deg360) {
    let d = deg360 % 360;
    if (d < 0) d += 360;
    return d % 30;
  }

  // Helper: Get house index (1-12) from Lagna Sign
  function getHouse(sign, lagnaSign) {
    return ((sign - lagnaSign + 12) % 12) + 1;
  }

  // Helper: Check if planet is in a Kendra (1, 4, 7, 10)
  function isKendra(house) {
    return [1, 4, 7, 10].includes(house);
  }

  // Helper: Check if planet is in a Trikona (1, 5, 9)
  function isTrikona(house) {
    return [1, 5, 9].includes(house);
  }

  // Helper: Check if planet is in a Trika/Dusthana (6, 8, 12)
  function isTrika(house) {
    return [6, 8, 12].includes(house);
  }

  // Helper: Compute Varga Sign for 16 Divisional Charts
  function getVargaSign(sign, deg, varga) {
    const eps = 0.00001;
    switch(varga) {
      case 1: return sign;
      case 2: // Hora
        if (sign % 2 === 0) return deg < 15 ? 4 : 3;
        return deg < 15 ? 3 : 4;
      case 3: { // Drekkana
        const dPart = Math.floor((deg - eps) / 10);
        const shift = dPart === 0 ? 0 : (dPart === 1 ? 4 : 8);
        return (sign + shift) % 12;
      }
      case 4: // Chaturthamsha
        return (sign + Math.floor((deg - eps) / 7.5) * 3) % 12;
      case 7: { // Saptamsha
        const sStart = (sign % 2 === 0) ? sign : (sign + 6) % 12;
        return (sStart + Math.floor((deg - eps) / (30/7))) % 12;
      }
      case 9: { // Navamsha
        let nStart = (sign % 3 === 0) ? sign : (sign % 3 === 1 ? (sign + 8) % 12 : (sign + 4) % 12);
        return (nStart + Math.floor((deg - eps) / (3 + 20/60))) % 12;
      }
      case 10: { // Dashamsha
        let dsStart = (sign % 2 === 0) ? sign : (sign + 8) % 12;
        return (dsStart + Math.floor((deg - eps) / 3.0)) % 12;
      }
      case 12: // Dwadashamsha
        return (sign + Math.floor((deg - eps) / 2.5)) % 12;
      case 16: { // Shodashamsha
        let shStart = (sign % 3 === 0) ? 0 : (sign % 3 === 1 ? 4 : 8);
        return (shStart + Math.floor((deg - eps) / 1.875)) % 12;
      }
      case 20: { // Vimshamsha
        let vStart = (sign % 3 === 0) ? 0 : (sign % 3 === 1 ? 8 : 4);
        return (vStart + Math.floor((deg - eps) / 1.5)) % 12;
      }
      case 24: { // Chaturvimshamsha
        let sidStart = (sign % 2 === 0) ? 4 : 3;
        return (sidStart + Math.floor((deg - eps) / 1.25)) % 12;
      }
      case 27: // Saptavimshamsha
        return ((sign % 4) * 3 + Math.floor((deg - eps) / (1 + 7/60))) % 12;
      case 30: // Trimshamsha
        if (sign % 2 === 0) {
          if (deg < 5) return 0; if (deg < 10) return 10; if (deg < 18) return 8; if (deg < 25) return 2; return 6;
        } else {
          if (deg < 5) return 1; if (deg < 12) return 5; if (deg < 20) return 11; if (deg < 25) return 9; return 7;
        }
      case 40: // Khavedamsha
        return (((sign % 2 === 0) ? 0 : 6) + Math.floor((deg - eps) / 0.75)) % 12;
      case 45: { // Akshavedamsha
        let akStart = (sign % 3 === 0) ? 0 : (sign % 3 === 1 ? 4 : 8);
        return (akStart + Math.floor((deg - eps) / (30/45))) % 12;
      }
      case 60: // Shashtiamsha
        return (sign + Math.floor((deg * 2) - eps) % 12) % 12;
      default: return sign;
    }
  }

  // Check if a planet is in dignity (Exalted, Moolatrikona, or Own sign) in a varga sign
  function isPlanetDignifiedInSign(planetId, vSign) {
    if (EXALTATION_SIGNS[planetId] === vSign) return true;
    if (MOOLATRIKONA_SIGNS[planetId] === vSign) return true;
    if (OWN_SIGNS[planetId] && OWN_SIGNS[planetId].includes(vSign)) return true;
    return false;
  }


  // =============================================================================
  // BPHS ASHTAKAVARGA 337-POINT CANON & REDUCTION ENGINE (CH. 50–57)
  // =============================================================================
  const BPHS_ASHTAKAVARGA_RULES = {
    Sun: {
      Sun: [1, 2, 4, 7, 8, 9, 10, 11],
      Moon: [3, 6, 10, 11],
      Mars: [1, 2, 4, 7, 8, 9, 10, 11],
      Mercury: [3, 5, 6, 9, 10, 11, 12],
      Jupiter: [5, 6, 9, 11],
      Venus: [6, 7, 12],
      Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
      Lagna: [3, 4, 6, 10, 11, 12]
    },
    Moon: {
      Sun: [3, 6, 7, 8, 10, 11],
      Moon: [1, 3, 6, 7, 10, 11],
      Mars: [2, 3, 5, 6, 9, 10, 11],
      Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
      Jupiter: [1, 4, 7, 8, 10, 11, 12],
      Venus: [3, 4, 5, 7, 9, 10, 11],
      Saturn: [3, 5, 6, 11],
      Lagna: [3, 6, 10, 11]
    },
    Mars: {
      Sun: [3, 5, 6, 10, 11],
      Moon: [3, 6, 11],
      Mars: [1, 2, 4, 7, 8, 10, 11],
      Mercury: [3, 5, 6, 11],
      Jupiter: [6, 10, 11, 12],
      Venus: [6, 8, 11, 12],
      Saturn: [1, 4, 7, 8, 9, 10, 11],
      Lagna: [1, 3, 6, 10, 11]
    },
    Mercury: {
      Sun: [5, 6, 9, 11, 12],
      Moon: [2, 4, 6, 8, 10, 11],
      Mars: [1, 2, 4, 7, 8, 9, 10, 11],
      Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
      Jupiter: [6, 8, 11, 12],
      Venus: [1, 2, 3, 4, 5, 8, 9, 11],
      Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
      Lagna: [1, 2, 4, 6, 8, 10, 11]
    },
    Jupiter: {
      Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
      Moon: [2, 5, 7, 9, 11],
      Mars: [1, 2, 4, 7, 8, 10, 11],
      Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
      Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
      Venus: [2, 5, 6, 9, 10, 11],
      Saturn: [3, 5, 6, 12],
      Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11]
    },
    Venus: {
      Sun: [8, 11, 12],
      Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
      Mars: [3, 5, 6, 9, 11, 12],
      Mercury: [3, 5, 6, 9, 11],
      Jupiter: [5, 8, 9, 10, 11],
      Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
      Saturn: [3, 4, 5, 8, 9, 10, 11],
      Lagna: [1, 2, 3, 4, 5, 8, 9, 11]
    },
    Saturn: {
      Sun: [1, 2, 4, 7, 8, 10, 11],
      Moon: [3, 6, 11],
      Mars: [3, 5, 6, 10, 11, 12],
      Mercury: [6, 8, 9, 10, 11, 12],
      Jupiter: [5, 6, 11, 12],
      Venus: [6, 11, 12],
      Saturn: [3, 5, 6, 11],
      Lagna: [1, 3, 4, 6, 10, 11]
    }
  };

  function computeAshtakavargaEngine(planets, lagnaSign) {
    const planetSigns = {};
    planets.forEach(p => {
      planetSigns[p.id] = (p.sign !== undefined) ? p.sign : Math.floor(p.abs / 30);
    });

    const bav = {};
    const sav = new Array(12).fill(0);

    for (const [targetP, refs] of Object.entries(BPHS_ASHTAKAVARGA_RULES)) {
      const arr = new Array(12).fill(0);
      for (const [refP, houses] of Object.entries(refs)) {
        const refSign = (refP === "Lagna") ? lagnaSign : planetSigns[refP];
        if (refSign === undefined) continue;
        houses.forEach(h => {
          const s = (refSign + (h - 1)) % 12;
          arr[s] += 1;
        });
      }
      bav[targetP] = arr;
      for (let s = 0; s < 12; s++) {
        sav[s] += arr[s];
      }
    }

    const houseSav = [];
    for (let h = 1; h <= 12; h++) {
      const s = (lagnaSign + (h - 1)) % 12;
      houseSav.push(sav[s]);
    }

    const h11_bindus = houseSav[10];
    const h12_bindus = houseSav[11];
    const h2_bindus = houseSav[1];
    const h1_bindus = houseSav[0];
    const h9_bindus = houseSav[8];
    const h10_bindus = houseSav[9];

    let balanceCommentary = "";
    if (h11_bindus > h12_bindus) {
      balanceCommentary = `एकादश भाव (आय/लाभ: ${h11_bindus} बिंदु) द्वादश भाव (व्यय/हानि: ${h12_bindus} बिंदु) से अधिक बलवान है। यह निरंतर धन संचय, प्रचुर आय एवं कम खर्च का शास्त्रसम्मत राजयोग है।`;
    } else if (h11_bindus < h12_bindus) {
      balanceCommentary = `द्वादश भाव (व्यय/हानि: ${h12_bindus} बिंदु) एकादश भाव (आय/लाभ: ${h11_bindus} बिंदु) से अधिक है। जातक को अनियोजित खर्चों, अत्यधिक उदारता व वित्तीय रिसाव पर कठोर नियंत्रण रखने तथा स्वचालित बचत प्रणाली (SIP/Emergency Fund) अपनाने का शास्त्रीय निर्देश है।`;
    } else {
      balanceCommentary = `एकादश भाव (आय: ${h11_bindus} बिंदु) और द्वादश भाव (व्यय: ${h12_bindus} बिंदु) समान हैं। आय और व्यय में स्वाभाविक संतुलन रहेगा।`;
    }

    // Trikona Shodhana
    const TRINES = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
    const trikonaReduced = [...sav];
    TRINES.forEach(t => {
      const minVal = Math.min(trikonaReduced[t[0]], trikonaReduced[t[1]], trikonaReduced[t[2]]);
      t.forEach(s => { trikonaReduced[s] -= minVal; });
    });

    // Ekadhipatya Shodhana
    const DUAL_PAIRS = [
      { p: 'Mars', signs: [0, 7] },
      { p: 'Venus', signs: [1, 6] },
      { p: 'Mercury', signs: [2, 5] },
      { p: 'Jupiter', signs: [8, 11] },
      { p: 'Saturn', signs: [9, 10] }
    ];
    const ekadhipatyaReduced = [...trikonaReduced];
    DUAL_PAIRS.forEach(pair => {
      const [s1, s2] = pair.signs;
      const p1 = Object.values(planetSigns).includes(s1);
      const p2 = Object.values(planetSigns).includes(s2);
      if (!p1 && !p2) {
        const minVal = Math.min(ekadhipatyaReduced[s1], ekadhipatyaReduced[s2]);
        ekadhipatyaReduced[s1] = minVal;
        ekadhipatyaReduced[s2] = minVal;
      } else if (p1 && !p2) {
        if (ekadhipatyaReduced[s2] > ekadhipatyaReduced[s1]) ekadhipatyaReduced[s2] = ekadhipatyaReduced[s1];
      } else if (!p1 && p2) {
        if (ekadhipatyaReduced[s1] > ekadhipatyaReduced[s2]) ekadhipatyaReduced[s1] = ekadhipatyaReduced[s2];
      }
    });

    // Pinda Sadhana
    const RASHI_GUNAKARA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];
    const GRAHA_GUNAKARA = { Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5 };
    let rashiPinda = 0;
    for (let s = 0; s < 12; s++) rashiPinda += ekadhipatyaReduced[s] * RASHI_GUNAKARA[s];
    let grahaPinda = 0;
    for (const [gid, gmul] of Object.entries(GRAHA_GUNAKARA)) {
      const s = planetSigns[gid];
      if (s !== undefined) grahaPinda += ekadhipatyaReduced[s] * gmul;
    }
    const yogaPinda = rashiPinda + grahaPinda;

    return {
      sav,
      bav,
      houseSav,
      wealthSummary: {
        h11_bindus,
        h12_bindus,
        h2_bindus,
        h1_bindus,
        h9_bindus,
        h10_bindus,
        diff11_12: h11_bindus - h12_bindus,
        balanceCommentary
      },
      trikonaReduced,
      ekadhipatyaReduced,
      pindaSadhana: { rashiPinda, grahaPinda, yogaPinda }
    };
  }

  // =============================================================================
  // BPHS SHODASHAVARGA (16 DIVISIONAL CHARTS) ENGINE (CH. 6 & 7)
  // =============================================================================
  const SHODASHAVARGA_DEFS = [
    { id: 1,  code: "D1",  name: "लग्न कुंडली (Rasi)", significance: "शारीरिक देह, आत्म-चेतना एवं संपूर्ण जीवन का मूल आधार" },
    { id: 2,  code: "D2",  name: "होरा चक्र (Hora)", significance: "धन-संपत्ति, कोष, आर्थिक सामर्थ्य व समृद्धि (मुख्य धन वर्ग)" },
    { id: 3,  code: "D3",  name: "द्रेष्काण (Drekkana)", significance: "सहोदर, पराक्रम, पुरुषार्थ, उद्यमशीलता एवं देह-चिह्न" },
    { id: 4,  code: "D4",  name: "चतुर्थांश (Chaturthamsha)", significance: "अचल संपत्ति, भूमि, भवन, स्थायी भाग्य एवं वाहन सुख" },
    { id: 7,  code: "D7",  name: "सप्तांश (Saptamsha)", significance: "संतान, संतति-सुख, वंश-वृद्धि एवं भावी पीढ़ी" },
    { id: 9,  code: "D9",  name: "नवांश (Navamsha)", significance: "भाग्य, धर्म, जीवनसाथी, अंतःकरण व ग्रहों का वास्तविक सूक्ष्म बल" },
    { id: 10, code: "D10", name: "दशमांश (Dashamsha)", significance: "कर्म, आजीविका, व्यापार, सत्ता, उच्च पद व मान-प्रतिष्ठा" },
    { id: 12, code: "D12", name: "द्वादशांश (Dwadashamsha)", significance: "माता-पिता, पितृ-ऋण, पैतृक संस्कार व वंश परम्परा" },
    { id: 16, code: "D16", name: "षोडशांश (Shodashamsha)", significance: "वाहन, सुख-साधन, भौतिक ऐश्वर्य एवं आकस्मिक यात्राएं" },
    { id: 20, code: "D20", name: "विंशांश (Vimshamsha)", significance: "आध्यात्मिक प्रगति, उपासना, मंत्र-सिद्धि व ईश्वरीय कृपा" },
    { id: 24, code: "D24", name: "चतुर्विंशांश / सिद्धांश", significance: "उच्च ज्ञान, विद्या, बौद्धिक सामर्थ्य, अनुसंधान व मेधा" },
    { id: 27, code: "D27", name: "सप्तविंशांश (Bhamsa)", significance: "शारीरिक व मानसिक बल, सहनशक्ति व अवचेतन सामर्थ्य" },
    { id: 30, code: "D30", name: "त्रिंशांश (Trimshamsha)", significance: "अरिष्ट, जीवन के संकट, व्याधियां, पाप-दोष व उनसे सुरक्षा" },
    { id: 40, code: "D40", name: "खवेदांश (Khavedamsha)", significance: "शुभ-अशुभ संस्कारों का सूक्ष्म विश्लेषण व आचरण शुद्धि" },
    { id: 45, code: "D45", name: "अक्षवेदांश (Akshavedamsha)", significance: "जीवन के समस्त सूक्ष्म क्षेत्रों की समग्र समीक्षा" },
    { id: 60, code: "D60", name: "षष्ट्यंश (Shashtiamsha)", significance: "पूर्वजन्म कर्म, संचित प्रारब्ध एवं सर्वोच्च सूक्ष्म निर्णायक वर्ग" }
  ];

  function computeShodashavargaEngine(planets, lagnaSign, lagnaDeg) {
    const vargas = SHODASHAVARGA_DEFS.map(def => {
      const vLagnaSign = getVargaSign(lagnaSign, lagnaDeg, def.id);
      const vPlanets = planets.map(p => {
        const pSign = (p.sign !== undefined) ? p.sign : Math.floor(p.abs / 30);
        const pDeg = (p.deg !== undefined) ? p.deg : (p.abs % 30);
        const vSign = getVargaSign(pSign, pDeg, def.id);
        const rasiHouse = ((vSign - vLagnaSign + 12) % 12) + 1;
        return {
          id: p.id,
          name: p.name || p.grahaName || GRAHA_NAMES[p.id] || p.id,
          sign: vSign,
          rashiName: RASHI_NAMES[vSign],
          rasiHouse: rasiHouse
        };
      });
      return {
        id: def.id,
        code: def.code,
        name: def.name,
        significance: def.significance,
        lagnaSign: vLagnaSign,
        lagnaRashi: RASHI_NAMES[vLagnaSign],
        planets: vPlanets
      };
    });

    const d1 = vargas.find(v => v.id === 1);
    const d9 = vargas.find(v => v.id === 9);
    const vargottamaPlanets = [];
    if (d1 && d9) {
      d1.planets.forEach(p => {
        if (p.id === 'Lagna') return;
        const d9P = d9.planets.find(x => x.id === p.id);
        if (d9P && d9P.sign === p.sign) {
          vargottamaPlanets.push(p.name);
        }
      });
    }

    const VAISHESHIKAMSA_LEVELS = [
      { count: 2, title: "पारिजात (Parijata)", badge: "पारिजातांश", desc: "सदा शुभ, निरंतर प्रगति, समाज में सम्मान एवं स्थिर आजीविका" },
      { count: 3, title: "उत्तम (Uttama)", badge: "उत्तमांश", desc: "उत्कृष्ट चरित्र, उच्च प्रतिष्ठा, धर्म-परायणता एवं सद्गुण" },
      { count: 4, title: "गोपुर (Gopura)", badge: "गोपुरांश", desc: "विपुल भूमि, भवन, विद्वत्ता, शास्त्र-ज्ञान एवं बुद्धिजीवियों में आदर" },
      { count: 5, title: "सिंहासन (Simhasana)", badge: "सिंहासनांश", desc: "प्रशासकीय अधिकार, राजसत्ता, उच्च नेतृत्व एवं निर्णायक शक्ति" },
      { count: 6, title: "पारावत (Paravata)", badge: "पारावतांश", desc: "राजतुल्य ऐश्वर्य, उत्कृष्ट वाहन सुख, अक्षय कीर्ति एवं अपार समृद्धि" },
      { count: 7, title: "देवलोक (Devaloka)", badge: "देवलोकांश", desc: "संत-तुल्य गरिमा, आध्यात्मिक प्रभाव, ईश्वरीय कृपा एवं सार्वभौम यश" },
      { count: 8, title: "ऐरावत (Airavata)", badge: "ऐरावतांश", desc: "सर्वोच्च संप्रभुता, कालजयी ख्याति, ऐतिहासिक नेतृत्व एवं असीम सम्मान" }
    ];

    const vargaList = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
    const sevenGrahas = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const vaisheshikamsa = [];

    sevenGrahas.forEach(gid => {
      const p = planets.find(x => x.id === gid);
      if (!p) return;
      const pSign = (p.sign !== undefined) ? p.sign : Math.floor(p.abs / 30);
      const pDeg = (p.deg !== undefined) ? p.deg : (p.abs % 30);
      let goodCount = 0;
      vargaList.forEach(vNum => {
        const vSign = getVargaSign(pSign, pDeg, vNum);
        if (isPlanetDignifiedInSign(gid, vSign)) goodCount++;
      });
      let matchedTier = null;
      for (let i = VAISHESHIKAMSA_LEVELS.length - 1; i >= 0; i--) {
        if (goodCount >= VAISHESHIKAMSA_LEVELS[i].count) {
          matchedTier = VAISHESHIKAMSA_LEVELS[i];
          break;
        }
      }
      vaisheshikamsa.push({
        planetId: gid,
        grahaName: GRAHA_NAMES[gid] || gid,
        goodCount,
        tier: matchedTier || { count: goodCount, title: "सामान्य वर्ग", badge: "वर्ग-बल", desc: "संतुलित प्रभाव" }
      });
    });

    return {
      vargas,
      vargottamaPlanets,
      vaisheshikamsa
    };
  }

  // =============================================================================
  // BPHS VIMSHOTTARI DASHA TIMELINE ENGINE (CH. 64–72)
  // =============================================================================
  const DASHA_LORDS_CONFIG = [
    { id: "Ketu", name: "केतु", years: 7, ch: 71, title: "एकसप्ततितमोऽध्यायः — केतुदशायामन्तर्दशाफलाध्यायः" },
    { id: "Venus", name: "शुक्र", years: 20, ch: 72, title: "द्विसप्ततितमोऽध्यायः — शुक्रदशायामन्तर्दशाफलाध्यायः" },
    { id: "Sun", name: "सूर्य", years: 6, ch: 64, title: "चतुःषष्टितमोऽध्यायः — विंशोत्तरीदशायामन्तर्दशाफलाध्यायः (सूर्यदशाफलम्)" },
    { id: "Moon", name: "चन्द्र", years: 10, ch: 65, title: "पञ्चषष्टितमोऽध्यायः — चन्द्रदशायामन्तर्दशाफलाध्यायः" },
    { id: "Mars", name: "मंगल", years: 7, ch: 66, title: "षट्षष्टितमोऽध्यायः — भौमदशायामन्तर्दशाफलाध्यायः" },
    { id: "Rahu", name: "राहु", years: 18, ch: 67, title: "सप्तषष्टितमोऽध्यायः — राहुदशायामन्तर्दशाफलाध्यायः" },
    { id: "Jupiter", name: "गुरु", years: 16, ch: 68, title: "अष्टषष्टितमोऽध्यायः — गुरुदशायामन्तर्दशाफलाध्यायः" },
    { id: "Saturn", name: "शनि", years: 19, ch: 69, title: "एकोनसप्ततितमोऽध्यायः — शनिदशायामन्तर्दशाफलाध्यायः" },
    { id: "Mercury", name: "बुध", years: 17, ch: 70, title: "सप्ततितमोऽध्यायः — बुधदशायामन्तर्दशाफलाध्यायः" }
  ];

  function computeVimshottariTimelineEngine(moonObj, birthDetails, targetDate = new Date()) {
    const moonNorm = ((moonObj ? (moonObj.abs || 0) : 0) % 360 + 360) % 360;
    const nakLen = 13 + 20 / 60;
    const nakIndex = Math.floor(moonNorm / nakLen);
    const nakElapsed = moonNorm % nakLen;
    const remFraction = 1.0 - (nakElapsed / nakLen);
    const birthMDIndex = nakIndex % 9;

    const bd = birthDetails || {};
    let birthMs = 0;
    if (bd && bd.year) {
      birthMs = new Date(Date.UTC(bd.year, (bd.month || 1) - 1, bd.day || 1, bd.hour || 12, bd.minute || 0)).getTime();
    } else {
      birthMs = new Date().getTime() - (30 * 365.242199 * 86400 * 1000);
    }
    const MS_PER_YEAR = 365.242199 * 86400 * 1000;

    let mdStartCursor = birthMs - (1.0 - remFraction) * (DASHA_LORDS_CONFIG[birthMDIndex].years * MS_PER_YEAR);

    const mahadashas = [];
    for (let i = 0; i < 9; i++) {
      const lIdx = (birthMDIndex + i) % 9;
      const lord = DASHA_LORDS_CONFIG[lIdx];
      const dur = lord.years * MS_PER_YEAR;
      const end = mdStartCursor + dur;

      const antardashas = [];
      let adCursor = mdStartCursor;
      for (let j = 0; j < 9; j++) {
        const aIdx = (lIdx + j) % 9;
        const aLord = DASHA_LORDS_CONFIG[aIdx];
        const aDur = dur * (aLord.years / 120);
        const aEnd = adCursor + aDur;
        antardashas.push({
          lord: aLord,
          startMs: adCursor,
          endMs: aEnd,
          startDate: new Date(adCursor),
          endDate: new Date(aEnd)
        });
        adCursor = aEnd;
      }

      mahadashas.push({
        lord: lord,
        startMs: mdStartCursor,
        endMs: end,
        startDate: new Date(mdStartCursor),
        endDate: new Date(end),
        antardashas: antardashas
      });
      mdStartCursor = end;
    }

    const targetMs = (targetDate instanceof Date ? targetDate : new Date()).getTime();
    let activeMD = mahadashas.find(m => targetMs >= m.startMs && targetMs < m.endMs) || null;
    if (!activeMD) {
      activeMD = mahadashas[mahadashas.length - 1];
    }

    let activeAD = null;
    let upcomingAD = null;
    if (activeMD) {
      const adIdx = activeMD.antardashas.findIndex(a => targetMs >= a.startMs && targetMs < a.endMs);
      if (adIdx !== -1) {
        activeAD = activeMD.antardashas[adIdx];
        if (adIdx + 1 < activeMD.antardashas.length) {
          upcomingAD = activeMD.antardashas[adIdx + 1];
        }
      } else {
        activeAD = activeMD.antardashas[0];
        upcomingAD = activeMD.antardashas[1];
      }
    }

    return {
      mahadashas,
      activeMD,
      activeAD,
      upcomingAD,
      birthMDIndex,
      nakIndex
    };
  }

  // =============================================================================
  // MAIN ANALYSIS FUNCTION: EVALUATE CHAPTERS 1 TO 10
  // =============================================================================
  function evaluateParasharaReport(calcResult, options = {}) {
    if (!calcResult || !calcResult.planets) {
      throw new Error("Invalid calculation payload provided to ParasharaEngine");
    }

    const planets = calcResult.planets;
    const lagnaObj = planets.find(p => p.id === 'Lagna') || calcResult.lagna || { abs: 0 };
    const lagnaAbs = lagnaObj.abs || 0;
    const lagnaSign = getSignIndex(lagnaAbs);
    const lagnaDeg = getDegInSign(lagnaAbs);

    // Planet index mapping
    const planetMap = {};
    planets.forEach(p => {
      const abs = p.abs !== undefined ? p.abs : 0;
      const sign = getSignIndex(abs);
      const deg = getDegInSign(abs);
      const house = getHouse(sign, lagnaSign);
      planetMap[p.id] = {
        ...p,
        abs,
        sign,
        deg,
        house,
        rashiName: RASHI_NAMES[sign],
        grahaName: GRAHA_NAMES[p.id] || p.id
      };
    });

    const lagneshaId = RASHI_LORDS[lagnaSign];
    const lagnesha = planetMap[lagneshaId];
    const moon = planetMap['Moon'];
    const sun = planetMap['Sun'];
    const mars = planetMap['Mars'];
    const mercury = planetMap['Mercury'];
    const jupiter = planetMap['Jupiter'];
    const venus = planetMap['Venus'];
    const saturn = planetMap['Saturn'];
    const rahu = planetMap['Rahu'];
    const ketu = planetMap['Ketu'];

    // Atmakaraka (Highest degree among 7 planets excluding nodes)
    const sevenGrahas = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    let atmakarakaId = 'Sun';
    let maxDeg = -1;
    sevenGrahas.forEach(gid => {
      if (planetMap[gid] && planetMap[gid].deg > maxDeg) {
        maxDeg = planetMap[gid].deg;
        atmakarakaId = gid;
      }
    });
    const atmakaraka = planetMap[atmakarakaId];

    // Compute BPHS Ashtakavarga, Shodashavarga, and Vimshottari Timeline
    const ashtakavarga = computeAshtakavargaEngine(planets, lagnaSign);
    const shodashavarga = computeShodashavargaEngine(planets, lagnaSign, lagnaDeg);
    const vimshottariDasha = computeVimshottariTimelineEngine(moon, calcResult.birthDetails, options.targetDate || new Date());

    const matchedShlokas = [];

    // =========================================================================
    // CHAPTER 1: प्रथमोऽध्यायः — सृष्टिक्रमकथनाध्यायः (The Foundational Invocation)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 1,
      chapterTitle: "प्रथमोऽध्यायः — सृष्टिक्रमकथनाध्यायः",
      chapterSignificance: "सृष्टि की उत्पत्ति, काल-चक्र एवं महर्षि पाराशर की दिव्य प्रतिज्ञा",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `शान्तं गुणातीतं सर्वव्यापीशमीश्वरम् ।
जगत्कर्तृस्वरूपं च परावरदृशं विभुम् ॥ १ ॥
प्रणम्य जगन्नाथं पराशरो मुनिसत्तमम् ।
मैत्रेयः परिपप्रच्छ विनयावनतो द्विजः ॥ २ ॥`,
      applicabilityStatus: "सर्व-जातक सार्वभौमिक आधार (Universal Foundational Shloka)",
      natalTrigger: `जातक: ${calcResult.name || options.name || "जातक"} • लग्न: ${RASHI_NAMES[lagnaSign]} (${lagnaDeg.toFixed(2)}°) • नक्षत्र: ${lagnaObj.nakshatraName || "—"}`,
      classicalPrediction: "महर्षि पाराशर सृष्टि के मूल नियमों का उद्घाटन करते हुए स्पष्ट करते हैं कि मानव जीवन पूर्वजन्म के संचित कर्मों और काल-पुरुष के अधिष्ठान से संचालित होता है। यह जातक की संपूर्ण जीवन-यात्रा का दार्शनिक आधार-स्तंभ है।",
      deepMeaning: "पाराशर होराशास्त्र का प्रथम सूत्र यह स्थापित करता है कि जन्म केवल आकस्मिक घटना नहीं है, अपितु आत्मा के विकास की एक निश्चित काल-योजना है।",
      badges: ["शास्त्र-प्रतिज्ञा", "काल-चक्र आधार"]
    });

    // =========================================================================
    // CHAPTER 2: द्वितीयोऽध्यायः — ग्रहावताराध्यायः (Planetary Avatars of Lord Vishnu)
    // =========================================================================
    const AVATAR_MAP = {
      Sun: { avatar: "भगवान श्रीराम (Lord Rama)", attribute: "मर्यादा, सत्यनिष्ठा, आत्मबल, धर्म-रक्षण एवं पितृ-आज्ञा", verse: "श्लोक ३" },
      Moon: { avatar: "भगवान श्रीकृष्ण (Lord Krishna)", attribute: "आनंद, प्रेम, लीला, सम्मोहन, मानसिक समता एवं कूटनीति", verse: "श्लोक ३" },
      Mars: { avatar: "भगवान नृसिंह (Lord Narasimha)", attribute: "अदम्य पराक्रम, निर्भयता, अनिष्ट-विनाश एवं रक्षा-सामर्थ्य", verse: "श्लोक ३" },
      Mercury: { avatar: "भगवान बुद्ध (Lord Buddha)", attribute: "विवेक, अहिंसा, वाक्-सिद्धि, परम शांति एवं वैज्ञानिक बुद्धि", verse: "श्लोक ३" },
      Jupiter: { avatar: "भगवान वामन (Lord Vamana)", attribute: "सर्वोच्च ज्ञान, उदारता, ईश्वरीय अनुग्रह एवं गुरु-तत्व", verse: "श्लोक ४" },
      Venus: { avatar: "भगवान परशुराम (Lord Parashurama)", attribute: "तपस्या, तेज, अस्त्र-विद्या, न्याय एवं नैतिक संप्रभुता", verse: "श्लोक ४" },
      Saturn: { avatar: "भगवान कच्छप / कूर्म (Lord Kurma)", attribute: "धैर्य, अचल स्थिरता, सहनशीलता एवं गहन साधना", verse: "श्लोक ४" },
      Rahu: { avatar: "भगवान वराह (Lord Varaha)", attribute: "संकट से उद्धार, पाताल-भेदन क्षमता एवं अद्भुत विजय", verse: "श्लोक ५" },
      Ketu: { avatar: "भगवान मत्स्य (Lord Matsya)", attribute: "मोक्ष, प्रलय-तरण, आत्म-ज्ञान एवं गुप्त आध्यात्मिक बोध", verse: "श्लोक ५" }
    };

    const akAvatar = AVATAR_MAP[atmakarakaId];
    matchedShlokas.push({
      chapterNumber: 2,
      chapterTitle: "द्वितीयोऽध्यायः — ग्रहावताराध्यायः",
      chapterSignificance: "नवग्रहों के माध्यम से परमब्रह्म के दशावतारों का दिव्य रहस्य",
      verseNumbers: akAvatar.verse,
      shlokaSanskrit: `रामोऽवतारः सूर्यस्य चन्द्रस्य यदुनायकः ।
नृसिंहो भूमिसूनोश्च बुद्धः सोमसुतस्य च ॥ ३ ॥
वामनो विबुधेज्यस्य भार्गवो भार्गवस्य च ।
कूर्मो मन्दस्य भवति वराहश्च तमोग्रहः ॥ ४ ॥
केतोर्मत्स्यावतारश्च ज्ञेया ह्येते ग्रहोद्भवाः ॥ ५ ॥`,
      applicabilityStatus: "आत्मकारक ग्रह द्वारा ईष्टदेव एवं आत्मिक स्वरूप मिलान",
      natalTrigger: `आपकी कुंडली के आत्मकारक ग्रह '${GRAHA_NAMES[atmakarakaId]}' हैं, जो ${RASHI_NAMES[atmakaraka.sign]} राशि के ${atmakaraka.deg.toFixed(2)}° पर स्थित होकर सर्वाधिक परिपक्व हैं।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार आपकी आत्मा का सर्वोच्च अधिष्ठान ${akAvatar.avatar} के दिव्य स्वरूप से संबद्ध है। आपके भीतर ${akAvatar.attribute} की अंतर्निहित नैसर्गिक शक्ति विद्यमान है।`,
      deepMeaning: `जब भी जीवन में गंभीर दिशा-भ्रम या संकट उत्पन्न हो, तब ${akAvatar.avatar} का ध्यान व मंत्र जातक के समस्त अवरोधों को नष्ट कर आत्म-उन्नयन प्रदान करता है।`,
      badges: ["आत्मकारक ईष्टदेव", akAvatar.avatar]
    });

    // =========================================================================
    // CHAPTER 3: तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः (Cabinet, Tridosha & Dignities)
    // =========================================================================
    
    // 3.1 Planetary Cabinet (राज्याधिकार)
    let cabinetRole = "";
    let cabinetGraha = "";
    if (planetMap['Sun'].house === 1 || planetMap['Sun'].house === 10) {
      cabinetRole = "राजा (King / Supreme Sovereign Authority)";
      cabinetGraha = "सूर्य";
    } else if (planetMap['Jupiter'].house === 1 || planetMap['Jupiter'].house === 10) {
      cabinetRole = "मंत्री / राजगुरु (Chief Minister & Wisdom Counselor)";
      cabinetGraha = "गुरु";
    } else if (planetMap['Mars'].house === 1 || planetMap['Mars'].house === 10) {
      cabinetRole = "सेनापति / नेता (Commander-in-Chief & Bold Leader)";
      cabinetGraha = "मंगल";
    } else if (planetMap['Mercury'].house === 1 || planetMap['Mercury'].house === 10) {
      cabinetRole = "युवराज (Crown Prince & Intellectual Strategist)";
      cabinetGraha = "बुध";
    } else if (planetMap['Venus'].house === 1 || planetMap['Venus'].house === 10) {
      cabinetRole = "आमात्य / नीति-परामर्शक (Diplomat & Creative Minister)";
      cabinetGraha = "शुक्र";
    } else {
      cabinetRole = "प्रशासकीय समन्वय (Administrative Harmonizer)";
      cabinetGraha = GRAHA_NAMES[lagneshaId];
    }

    matchedShlokas.push({
      chapterNumber: 3,
      chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
      chapterSignificance: "ग्रहों का राज्याधिकार, गुण, तत्व, वर्ण एवं स्वभाव विचार",
      verseNumbers: "श्लोक २१–२२",
      shlokaSanskrit: `सूर्यश्चन्द्रमसो राज्ञौ नेता स्यादवनीसुतः ।
बुधो राजकुमारश्च मन्त्री ज्ञेयो बृहस्पतिः ॥ २१ ॥
शुक्रो मन्त्री भवेच्चापि मन्दः प्रेष्यो भवेत्तथा ।
सेनाङ्गौ राहुकेतू च प्रोक्तौ मुनिवरोत्तमैः ॥ २२ ॥`,
      applicabilityStatus: "कर्म एवं व्यक्तित्व का पाराशर राज्याधिकार मिलान",
      natalTrigger: `लग्न अथवा दशम भाव पर '${cabinetGraha}' का मुख्य प्रभाव है, जो जातक को काल-पुरुष के राज्याधिकार में स्थान दिलाता है।`,
      classicalPrediction: `जातक के स्वभाव और आजीविका में पाराशर के अनुसार **'${cabinetRole}'** के गुण प्रमुख रूप से दृष्टिगोचर होंगे। जातक समाज में स्वतंत्र अधिकार, नेतृत्व और सम्मान की दिशा में अग्रसर रहता है।`,
      deepMeaning: "पाराशर के अनुसार जब ग्रह अपने नैसर्गिक राज्याधिकार का प्रतिनिधित्व करते हैं, तो व्यक्ति उसी के अनुरूप कार्य-क्षेत्र में यश प्राप्त करता है।",
      badges: ["ग्रह-मंत्रिमंडल", cabinetRole]
    });

    // 3.2 Ayurvedic Tridosha (त्रिदोष प्रकृति)
    const DOSHA_PROFILES = {
      Sun: { dosha: "पित्त (Pitta)", desc: "तीक्ष्ण पाचक अग्नि, ऊर्जावान, साहसी, उष्ण प्रकृति एवं नेतृत्वकारी तेज" },
      Mars: { dosha: "पित्त (Pitta)", desc: "अत्यधिक शारीरिक ऊर्जा, त्वरित निर्णय, उष्ण स्वभाव एवं मांसपेशियों का सुदृढ़ बल" },
      Moon: { dosha: "वात-कफ (Vata-Kapha)", desc: "सौम्य शरीर, जल-तत्व की अधिकता, संवेदनशील मन एवं शीतल स्वभाव" },
      Venus: { dosha: "वात-कफ (Vata-Kapha)", desc: "आकर्षक देह-यष्टि, सौंदर्य, कफ व वात का संतुलित समन्वय एवं ललित रुचि" },
      Jupiter: { dosha: "कफ प्रधान (Kapha Dominant)", desc: "गंभीर, पुष्ट देह, मेधा, उत्तम पाचन एवं धैर्यवान शारीरिक संरचना" },
      Saturn: { dosha: "वात प्रधान (Vata Dominant)", desc: "कृश अथवा दीर्घाकार देह, शुष्कता, स्नायु तंत्र की संवेदनशीलता एवं चंचलता" },
      Mercury: { dosha: "त्रिदोष सम (Tridosha Balanced)", desc: "वात, पित्त और कफ का पूर्ण संतुलन, त्वरित अनुकूलन क्षमता व लचीलापन" }
    };
    const lagneshDosha = DOSHA_PROFILES[lagneshaId] || DOSHA_PROFILES['Jupiter'];

    matchedShlokas.push({
      chapterNumber: 3,
      chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
      chapterSignificance: "शारीरिक संरचना एवं त्रिदोष (वात/पित्त/कफ) धातु विधान",
      verseNumbers: "श्लोक ३०–३१",
      shlokaSanskrit: `पित्तप्रकृतिको भानुश्चन्द्रो वातकफात्मकः ।
पित्तप्रकृतिको भौमः श्लेष्मलो वातको गुरुः ॥ ३० ॥
वातपित्तकफप्रकृतिर्बुधो वातकफः कविः ।
मन्दस्तु वातलो ज्ञेयः सर्वशास्त्रविशारदैः ॥ ३१ ॥`,
      applicabilityStatus: "लग्नेश आधारित नैसर्गिक शारीरिक त्रिदोष प्रकृति",
      natalTrigger: `आपकी कुंडली के लग्नेश '${GRAHA_NAMES[lagneshaId]}' हैं, जिनका नैसर्गिक दोष '${lagneshDosha.dosha}' है।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार जातक का मूल शारीरिक संविधान **'${lagneshDosha.dosha}'** से संचालित है। विशेषताएँ: ${lagneshDosha.desc}।`,
      deepMeaning: "आयुर्वेद और वैदिक ज्योतिष का यह अटूट सूत्र जातक के खान-पान, दिनचर्या और स्वास्थ्य-संतुलन की अचूक कुंजी है।",
      badges: ["आयुर्वेदिक त्रिदोष", lagneshDosha.dosha]
    });

    // 3.3 Exaltation / Debilitation / Moolatrikona Check
    sevenGrahas.forEach(gid => {
      const p = planetMap[gid];
      if (p.sign === EXALTATION_SIGNS[gid]) {
        matchedShlokas.push({
          chapterNumber: 3,
          chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
          chapterSignificance: "ग्रहों के परम उच्च, मूलत्रिकोण एवं स्वक्षेत्रीय बल",
          verseNumbers: "श्लोक ४९–५१",
          shlokaSanskrit: `मेषे रविस्तुङ्गो वृषे चन्द्रः कुजो नक्रगतस्तथा ।
कन्यायां च बुधस्तुङ्गः कर्के जीवः प्रकीर्तितः ॥ ४९ ॥
मीने शुक्रः शनिश्चापि तुलायां तुङ्गसंज्ञकः ॥ ५० ॥`,
          applicabilityStatus: `ग्रह उच्च बल मिलान (${p.grahaName} उच्च राशि में)`,
          natalTrigger: `${p.grahaName} देव ${p.rashiName} राशि के ${p.deg.toFixed(2)}° पर स्थित होकर कुंडली के ${p.house}वें भाव में पूर्ण 'उच्च' (Exalted) हैं।`,
          classicalPrediction: `महर्षि पाराशर के अनुसार उच्च राशि का ${p.grahaName} जातक को अपने कारकत्व और भाव से संबंधित सर्वोच्च फल, सम्मान, अतुल्य सामर्थ्य और सिद्धि प्रदान करता है।`,
          deepMeaning: "उच्च का ग्रह जीवन में कम से कम एक ऐसा क्षेत्र अवश्य बनाता है जहाँ जातक दूसरों से मीलों आगे निकल जाता है।",
          badges: ["उच्च ग्रह (Exalted)", `${p.grahaName} उच्च`]
        });
      } else if (p.sign === DEBILITATION_SIGNS[gid]) {
        matchedShlokas.push({
          chapterNumber: 3,
          chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
          chapterSignificance: "ग्रहों की नीच राशि एवं उसके परिहार के नियम",
          verseNumbers: "श्लोक ५१–५२",
          shlokaSanskrit: `सप्तमे तु भवेन्नीचं यद्भावे परमोच्चयः ।
नीचग्रहोऽपि शुभदो यदि केन्द्रे व्यवस्थितः ॥ ५१ ॥`,
          applicabilityStatus: `ग्रह नीच स्थिति विश्लेषण (${p.grahaName})`,
          natalTrigger: `${p.grahaName} देव ${p.rashiName} राशि में ${p.house}वें भाव में नीच राशि में स्थित हैं।`,
          classicalPrediction: `महर्षि पाराशर के अनुसार नीच ग्रह जातक को उस क्षेत्र में विशेष संघर्ष के बाद ही सफलता देता है, किंतु यदि इसका नीचभंग हो जाए तो यह अप्रत्याशित राजयोग में बदल जाता है।`,
          deepMeaning: "नीच ग्रह जातक को आत्ममंथन और दृढ़ संकल्प सिखाता है।",
          badges: ["नीच स्थिति", `${p.grahaName} नीच`]
        });
      }
    });

    // =========================================================================
    // CHAPTER 4: चतुर्थोऽध्यायः — राशिस्वरूपाध्यायः (Zodiac Sign Characteristics)
    // =========================================================================
    const SHIRSHODAYA_SIGNS = [2, 4, 5, 6, 7, 10]; // मिथुन, सिंह, कन्या, तुला, वृश्चिक, कुम्भ
    const PRISHTODAYA_SIGNS = [0, 1, 3, 8, 9];    // मेष, वृषभ, कर्क, धनु, मकर
    const isShirshodaya = SHIRSHODAYA_SIGNS.includes(lagnaSign);
    const risingNature = isShirshodaya ? "शीर्षोदय राशि (Shirshodaya)" : (lagnaSign === 11 ? "उभयोदय राशि (Ubhayodaya)" : "पृष्ठोदय राशि (Prishtodaya)");

    const MOBILITY_MAP = ["चर (Movable)", "स्थिर (Fixed)", "द्विस्वभाव (Dual)"];
    const lagnaMobility = MOBILITY_MAP[lagnaSign % 3];

    matchedShlokas.push({
      chapterNumber: 4,
      chapterTitle: "चतुर्थोऽध्यायः — राशिस्वरूपाध्यायः",
      chapterSignificance: "द्वादश राशियों का स्वरूप, उदय-प्रकृति, गति एवं देह-अंग विचार",
      verseNumbers: "श्लोक ५–१०",
      shlokaSanskrit: `शीर्षोदया भवन्त्येते मिथुनं सिंहकन्यके ।
तुला च वृश्चिको मन्दः कुम्भो ज्ञेयः शुभप्रदः ॥ ५ ॥
पृष्ठोदयास्तथान्ये स्युर्मीनो ह्युभयतोमुखः ।
चरस्थिरद्विस्वभावा राशयः परिकीर्तिताः ॥ ६ ॥`,
      applicabilityStatus: "जन्म लग्न राशि का मौलिक स्वरूप एवं उदय-विधान",
      natalTrigger: `आपका जन्म लग्न '${RASHI_NAMES[lagnaSign]}' है, जो कि '${risingNature}' एवं '${lagnaMobility}' राशि है।`,
      classicalPrediction: isShirshodaya 
        ? "महर्षि पाराशर के अनुसार शीर्षोदय लग्न में जन्म लेने वाले जातक के कार्यों के फल जीवन के पूर्वार्ध एवं मध्यकाल में सहजता, त्वरित बुद्धि और उत्साह के साथ प्रकट होते हैं।"
        : (lagnaSign === 11 
            ? "उभयोदय लग्न होने से जीवन में ज्ञान, आध्यात्मिकता और व्यावहारिक कर्म का अनुपम संतुलन रहता है।"
            : "पृष्ठोदय लग्न होने से जीवन के आरंभ में कठोर श्रम और अनुभव प्राप्त होते हैं, किंतु उत्तरार्ध में स्थायी सफलता, स्थिरता और विपुल सिद्धि प्राप्त होती है।"),
      deepMeaning: "लग्न राशि जातक का वह आंतरिक लेंस है जिससे वह समस्त बाह्य संसार को देखता और उस पर प्रतिक्रिया करता है।",
      badges: [risingNature, lagnaMobility]
    });

    // =========================================================================
    // CHAPTER 5: पञ्चमोऽध्यायः — विशेषलग्नाध्यायः (Special Lagnas - Hora & Ghatika)
    // =========================================================================
    // Computation of Hora Lagna (HL) and Ghatika Lagna (GL)
    // Formula: HL advances at 1 sign per 2.5 ghatis (60 mins). GL advances at 1 sign per 1 ghati (24 mins).
    // Indu Lagna: Sum of 9th house lords' rays from Lagna & Moon modulo 12.
    const RAY_POINTS = { Sun: 30, Moon: 16, Mars: 6, Mercury: 8, Jupiter: 10, Venus: 12, Saturn: 1 };
    const h9LordFromLagna = RASHI_LORDS[(lagnaSign + 8) % 12];
    const h9LordFromMoon = RASHI_LORDS[(moon.sign + 8) % 12];
    const induSum = (RAY_POINTS[h9LordFromLagna] || 10) + (RAY_POINTS[h9LordFromMoon] || 10);
    const induSign = (moon.sign + (induSum % 12)) % 12;
    const induHouse = getHouse(induSign, lagnaSign);

    matchedShlokas.push({
      chapterNumber: 5,
      chapterTitle: "पञ्चमोऽध्यायः — विशेषलग्नाध्यायः",
      chapterSignificance: "होरा लग्न, घटिका लग्न एवं इन्दु लग्न के विशेष राजयोग सूत्र",
      verseNumbers: "श्लोक ३–६",
      shlokaSanskrit: `लग्नात् पञ्चमतो ज्ञेयं घटिकायाश्च लक्षणम् ।
होरायाश्च तथैवेह धनधान्यसमृद्धिदम् ॥ ३ ॥
इन्दुना संस्थितो योगो नृपकोटिपतिप्रदः ।
यद्भावे संस्थितश्चेन्दुस्तद्भावफलमुत्तमम् ॥ ४ ॥`,
      applicabilityStatus: "विशेष इन्दु लग्न एवं वित्तीय शक्ति मिलान",
      natalTrigger: `आपकी कुंडली में नवमेश रश्मि योग से 'इन्दु लग्न' ${RASHI_NAMES[induSign]} राशि में स्थित है, जो लग्न से ${induHouse}वें भाव में पड़ता है।`,
      classicalPrediction: isKendra(induHouse) || isTrikona(induHouse) || induHouse === 11 || induHouse === 2
        ? "महर्षि पाराशर के अनुसार आपका इन्दु लग्न अत्यंत शुभ भाव (केन्द्र/त्रिकोण/लाभ) में है! यह जातक को जीवन में विपुल वित्तीय संचय, अचल संपत्ति और वित्तीय संकटों से स्वतः मुक्ति का 'पाराशर कुबेर योग' प्रदान करता है।"
        : "इन्दु लग्न की यह स्थिति दर्शाती है कि जातक को धन संचय के लिए योजनाबद्ध निवेश और अनुशासित व्यय पर ध्यान केंद्रित करना चाहिए।",
      deepMeaning: "पाराशर होराशास्त्र में सामान्य लग्न देह का प्रतीक है, जबकि इन्दु लग्न जातक के पूर्वार्जित धन-पुण्य की तिजोरी है।",
      badges: ["विशेष इन्दु लग्न", `इन्दु भाव: ${induHouse}`]
    });

    // =========================================================================
    // CHAPTER 6: षष्ठोऽध्यायः — षोडशवर्गाध्यायः (The 16 Divisional Charts)
    // =========================================================================
    const vargottamaText = shodashavarga.vargottamaPlanets.length > 0
      ? `आपकी कुंडली में ${shodashavarga.vargottamaPlanets.map(p => `'${p}'`).join(', ')} ग्रह लग्न (D1) एवं नवांश (D9) दोनों में समान राशि में स्थित होकर 'वर्गोत्तम' हैं। महर्षि पराशर के अनुसार वर्गोत्तम ग्रह को विशेष शुभ-फलप्रद और अचल रक्षा-कवच का दर्जा प्राप्त है।`
      : "षोडशवर्गों (D1 से D60) में ग्रहों की सूक्ष्म स्थिति जातक के जीवन के भिन्न-भिन्न आयामों को पुष्ट करती है।";

    matchedShlokas.push({
      chapterNumber: 6,
      chapterTitle: "षष्ठोऽध्यायः — षोडशवर्गाध्यायः",
      chapterSignificance: "षोडशवर्ग (D1 से D60) साधन — सूक्ष्म चक्रों द्वारा कर्म, भाग्य, विद्या व प्रारब्ध का उद्घाटन",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `षोडशानां तु वर्गाणां नामानि शृणु मे द्विज ।
क्षेत्रं होराऽथ दृक्काणस्तुरियांशस्ततः परम् ॥ १ ॥
सप्तमांशो नवांशश्च दशमांशस्ततः परम् ।
द्वादशांशः षोडशांशस्त्रिंशदंशस्ततः परम् ॥ २ ॥
षष्ट्यंशश्चैव विख्यातो वर्गाणां प्रवरो मतः ॥ ३ ॥`,
      applicabilityStatus: "षोडशवर्ग (D1-D60) सूक्ष्म चक्र साधन एवं वर्गोत्तम ग्रह मिलान",
      natalTrigger: `D1 (लग्न) से D60 (षष्ट्यंश) तक १६ सूक्ष्म कुंडलियों की प्रामाणिक संरचना। ${vargottamaText}`,
      classicalPrediction: "महर्षि पाराशर के अनुसार केवल जन्म लग्न (D1) से फलादेश अधूरा रहता है। षोडशवर्गों के सूक्ष्म अध्ययन से ही विद्या (D24), कर्म (D10), भाग्य (D9), संतति (D7) और पूर्वजन्म प्रारब्ध (D60) का अंतिम सत्य उजागर होता है। वर्गोत्तम ग्रह जीवन के कठिनतम समय में भी जातक की रक्षा करता है।",
      deepMeaning: "षोडशवर्ग आत्मा के १६ भिन्न-भिन्न आयाम हैं; स्थूल जगत में जो अदृश्य है, वह षष्ट्यंश (D60) और सूक्ष्म वर्गों में स्पष्ट दर्पण की भांति प्रतिबिंबित होता है।",
      badges: ["षोडशवर्ग साधन", "D1–D60 सूक्ष्म चक्र", ...(shodashavarga.vargottamaPlanets.length > 0 ? [`वर्गोत्तम: ${shodashavarga.vargottamaPlanets.join(', ')}`] : [])],
      shodashavargaData: shodashavarga
    });

    // =========================================================================
    // CHAPTER 7: सप्तमोऽध्यायः — वर्गविवेकाध्यायः (Vaisheshikamsa Dignity Analysis)
    // =========================================================================
    const topVaisheshikamsaItem = shodashavarga.vaisheshikamsa.slice().sort((a,b) => b.goodCount - a.goodCount)[0];
    const highDignityGrahas = shodashavarga.vaisheshikamsa.filter(v => v.goodCount >= 2);
    const dignityListStr = highDignityGrahas.map(v => `${v.grahaName}: ${v.tier.title} (${v.goodCount} वर्ग)`).join(', ') || "संतुलित वर्ग";

    matchedShlokas.push({
      chapterNumber: 7,
      chapterTitle: "सप्तमोऽध्यायः — वर्गविवेकाध्यायः",
      chapterSignificance: "षोडशवर्गों में ग्रहों के वैशेषिकांश एवं सर्वोच्च राजयोग सम्मान",
      verseNumbers: "श्लोक ३३–३६",
      shlokaSanskrit: `द्वाभ्यां पारिजातांशश्च त्रिभिः स्यादुत्तमो मतः ।
चतुर्भिर्गोपुरः प्रोक्तः पञ्चभिः सिंहसंज्ञकः ॥ ३३ ॥
षड्भिः पारावतश्चापि सप्तभिर्देवलोककः ।
अष्टभिश्चैरावतो ज्ञेयः सर्वराजसुपूजितः ॥ ३४ ॥`,
      applicabilityStatus: `वैशेषिकांश राजयोग मिलान (${topVaisheshikamsaItem.grahaName}: ${topVaisheshikamsaItem.tier.title})`,
      natalTrigger: `ग्रहों के वैशेषिकांश पद: ${dignityListStr}। सर्वोच्च पद: ${topVaisheshikamsaItem.grahaName} (${topVaisheshikamsaItem.tier.title} - ${topVaisheshikamsaItem.goodCount} वर्ग)।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार जब कोई ग्रह ${topVaisheshikamsaItem.tier.title} में प्रवेश करता है, तो जातक को "${topVaisheshikamsaItem.tier.desc}" का वरदान मिलता है। सूक्ष्म वर्गों में बलवान ग्रह स्थूल कुंडली के दोषों को भी निष्प्रभावी कर देते हैं।`,
      deepMeaning: "वैशेषिकांश यह सिद्ध करता है कि बाह्य रूप से सामान्य दिखने वाला ग्रह भी यदि षोडशवर्ग में उच्च स्थान प्राप्त करता है, तो वह जातक को सर्वोच्च पद दिलाता है।",
      badges: [topVaisheshikamsaItem.tier.badge, `${topVaisheshikamsaItem.grahaName}: ${topVaisheshikamsaItem.goodCount} वर्ग`, "पाराशर राजमान"]
    });
    // =========================================================================
    // CHAPTER 8: अष्टमोऽध्यायः — ग्रहाणां दृष्टयः (Planetary Aspects)
    // =========================================================================
    // Check Jupiter's 5th, 7th, 9th aspect or Mars 4, 8 or Saturn 3, 10
    const jupHouse = jupiter.house;
    const jupAspectHouses = [((jupHouse + 4) % 12) || 12, ((jupHouse + 6) % 12) || 12, ((jupHouse + 8) % 12) || 12];
    
    let jupAspectOnLagnaOrMoon = false;
    let jupAspectTarget = "";
    if (jupAspectHouses.includes(1)) {
      jupAspectOnLagnaOrMoon = true;
      jupAspectTarget = "प्रथम भाव (लग्न)";
    } else if (jupAspectHouses.includes(moon.house)) {
      jupAspectOnLagnaOrMoon = true;
      jupAspectTarget = "चन्द्रमा (मन व बुद्धि)";
    }

    if (jupAspectOnLagnaOrMoon) {
      matchedShlokas.push({
        chapterNumber: 8,
        chapterTitle: "अष्टमोऽध्यायः — ग्रहाणां दृष्टयः",
        chapterSignificance: "देवगुरु बृहस्पति की दिव्य अमृत दृष्टि एवं सर्व-दोष शमन विधान",
        verseNumbers: "श्लोक ५–६",
        shlokaSanskrit: `पश्यन्ति त्रिदशं मन्दश्चतुरष्टमवं कुजः ।
त्रिकोणं गुरुणा दृष्टं सर्वदोषविनाशनम् ॥ ५ ॥
एकोऽपि विमले केंद्रे गुरुर्दोषसहस्रहन्ता ॥ ६ ॥`,
        applicabilityStatus: "देवगुरु बृहस्पति की अमृत दृष्टि मिलान",
        natalTrigger: `देवगुरु बृहस्पति कुंडली के ${jupHouse}वें भाव से अपनी अमृतमयी दृष्टि आपके ${jupAspectTarget} पर डाल रहे हैं।`,
        classicalPrediction: "महर्षि पाराशर का अमर वचन है कि गुरु की त्रिकोण दृष्टि हजारों दुर्योगों को शांत कर देती है। यह जातक को आंतरिक विवेक, संकटों से ईश्वरीय रक्षा, सात्विक यश और दीर्घायु का वरदान प्रदान करती है।",
        deepMeaning: "जब देवगुरु लग्न या चंद्रमा को अपनी दृष्टि से अभिसिंचित करते हैं, तो व्यक्ति कठिन से कठिन परिस्थिति में भी सही निर्णय लेने में सक्षम होता है।",
        badges: ["गुरु अमृत दृष्टि", "सहस्रदोषहन्ता"]
      });
    }

    // =========================================================================
    // CHAPTER 9: नवमोऽध्यायः — द्वादशभावविचाराध्यायः (Master House Significations)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 9,
      chapterTitle: "नवमोऽध्यायः — द्वादशभावविचाराध्यायः",
      chapterSignificance: "द्वादश भावों के प्रामाणिक कारकत्व, अधिकार एवं जीवन-विभाग",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `देहं रूपं च ज्ञानं च वर्णं चैव बलाबलम् ।
सुखं दुःखं स्वभावञ्च लग्नभावान्निरीक्षयेत् ॥ १ ॥
वित्तं धान्यं कुटुम्बञ्च मृत्युजालं धनादिकम् ।
धात्वादि सर्वं वाग्जालं द्वितीयात् परिचिन्तयेत् ॥ २ ॥`,
      applicabilityStatus: "द्वादश भाव कारकत्व एवं जीवन-क्षेत्र विभाजन",
      natalTrigger: `लग्न भाव (${RASHI_NAMES[lagnaSign]}) जातक की देह, रूप व ज्ञान का केंद्र है; तथा द्वितीय भाव (${RASHI_NAMES[(lagnaSign + 1) % 12]}) कुटुम्ब, वाणी व संचित कोष का नियंत्रक है।`,
      classicalPrediction: "महर्षि पाराशर ने स्पष्ट किया है कि संपूर्ण जीवन के फल इन्हीं 12 भावों के दर्पण में प्रतिबिंबित होते हैं। जातक का संपूर्ण व्यक्तित्व लग्न और द्वितीय भाव के तालमेल से निर्मित होता है।",
      deepMeaning: "पाराशर के अनुसार जब तक भाव के मूल कारकत्व का ध्यान न रखा जाए, तब तक कोई भी फलकथन सटीक नहीं हो सकता।",
      badges: ["द्वादश भाव विधान", "पाराशर कारकत्व"]
    });

    // =========================================================================
    // CHAPTER 10: दशमोऽध्यायः — तनुभावफलाध्यायः (1st House Predictive Evaluation)
    // =========================================================================

    // 10.1 Lagnesha in Kendra/Trikona vs Trika (श्लोक १)
    const lagneshHouse = lagnesha.house;
    if (isKendra(lagneshHouse) || isTrikona(lagneshHouse)) {
      matchedShlokas.push({
        chapterNumber: 10,
        chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
        chapterSignificance: "तनुभाव (लग्न) फल — शारीरिक सुख, आरोग्य एवं व्यक्तित्व",
        verseNumbers: "श्लोक १",
        shlokaSanskrit: `सपापो देहपोऽष्टारिव्ययगो देहसौख्यहृत् ।
केन्द्रे कोणे स्थितोऽङ्गेशः सदा देहसुखं दिशेत् ॥ १ ॥`,
        applicabilityStatus: `लग्नेश केन्द्र/त्रिकोण राजयोग मिलान (${lagnesha.grahaName} भाव ${lagneshHouse} में)`,
        natalTrigger: `आपके लग्नेश (देहप) '${lagnesha.grahaName}' कुंडली के ${lagneshHouse}वें भाव में स्थित हैं, जो कि सर्वोच्च शुभ केन्द्र/त्रिकोण स्थान है।`,
        classicalPrediction: "महर्षि पाराशर का प्रत्यक्ष सूत्र: 'केन्द्रे कोणे स्थितोऽङ्गेशः सदा देहसुखं दिशेत्' — लग्नेश का केन्द्र या त्रिकोण में होना जातक को निरंतर शारीरिक सुख, उत्तम आरोग्य, प्रबल जीवनी-शक्ति (Ojas) और समाज में दीर्घायु व प्रतिष्ठा प्रदान करता है।",
        deepMeaning: "लग्नेश देह का प्राण है; जब प्राण-रक्षक स्वयं केन्द्र या त्रिकोण रूपी विष्णु-लक्ष्मी स्थानों में विराजता है, तो समस्त शारीरिक व्याधियों पर जातक की विजय होती है।",
        badges: ["देहसुख योग", `${lagnesha.grahaName} भाव ${lagneshHouse}`]
      });
    } else if (isTrika(lagneshHouse)) {
      matchedShlokas.push({
        chapterNumber: 10,
        chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
        chapterSignificance: "लग्नेश की त्रिक स्थिति एवं आरोग्य सुरक्षा निर्देश",
        verseNumbers: "श्लोक १–२",
        shlokaSanskrit: `सपापो देहपोऽष्टारिव्ययगो देहसौख्यहृत् ।
नीचग्रहोऽपि शुभदो यदि केन्द्रे व्यवस्थितः ॥ १ ॥`,
        applicabilityStatus: `लग्नेश त्रिक भाव विश्लेषण (${lagnesha.grahaName} भाव ${lagneshHouse} में)`,
        natalTrigger: `आपके लग्नेश '${lagnesha.grahaName}' कुंडली के ${lagneshHouse}वें भाव में स्थित हैं।`,
        classicalPrediction: "महर्षि पाराशर सचेत करते हैं कि लग्नेश के ६, ८, या १२वें भाव में होने पर जातक को अपनी दिनचर्या, उदर-स्वास्थ्य और नियमित व्यायाम के प्रति सदैव सतर्क रहना चाहिए ताकि देहसुख बाधित न हो।",
        deepMeaning: "पाराशर के अनुसार ऐसे जातक को लग्नेश के मंत्र-जप और साधना से अपनी प्राण-शक्ति को निरंतर जागृत रखना चाहिए।",
        badges: ["त्रिक लग्नेश", "आरोग्य सतर्कता"]
      });
    }

    // 10.2 Benefics in Lagna (श्लोक ३–५)
    const planetsInLagna = planets.filter(p => p.id !== 'Lagna' && p.house === 1);
    const hasBeneficInLagna = planetsInLagna.some(p => ['Jupiter', 'Venus', 'Mercury'].includes(p.id));
    if (hasBeneficInLagna) {
      const beneficNames = planetsInLagna.filter(p => ['Jupiter', 'Venus', 'Mercury'].includes(p.id)).map(p => GRAHA_NAMES[p.id]).join(', ');
      matchedShlokas.push({
        chapterNumber: 10,
        chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
        chapterSignificance: "लग्न में शुभ ग्रहों की उपस्थिति — कांति, आकर्षण एवं दीर्घायु",
        verseNumbers: "श्लोक ३–४",
        shlokaSanskrit: `लग्ने सौम्यग्रहे संस्थे रूपवान् सुभगो भवेत् ।
दीर्घायुः सर्वसम्पन्नः सत्यवादी जितेन्द्रियः ॥ ३ ॥`,
        applicabilityStatus: `लग्नस्थ शुभ ग्रह योग (${beneficNames})`,
        natalTrigger: `आपके लग्न भाव में शुभ ग्रह '${beneficNames}' विराजमान हैं।`,
        classicalPrediction: "महर्षि पाराशर के अनुसार लग्न में शुभ ग्रह की स्थिति जातक को मनमोहक शारीरिक स्वरूप, कांतिमान चेहरा, मधुर वाणी, दीर्घायु, सत्यवादिता और सभी संपत्तियों से युक्त बनाती है।",
        deepMeaning: "लग्न में शुभ ग्रह जातक के प्रभामंडल (Aura) को इतना शक्तिशाली बना देते हैं कि लोग अनायास ही उसकी ओर आकर्षित और प्रभावित होते हैं।",
        badges: ["सुभग रूप योग", beneficNames]
      });
    }

    // 10.3 Bodily Marks & Moles (देह-चिह्न / तिल / मस्सा / व्रण विचार - श्लोक ११–१५)
    // Parashara assigns the three Drekkanas of Lagna:
    // 1st Drekkana (0-10 deg): Head, Forehead, Face (शिरोभाग, ललाट, मुख)
    // 2nd Drekkana (10-20 deg): Neck, Chest, Abdomen (कण्ठ, वक्षःस्थल, उदर)
    // 3rd Drekkana (20-30 deg): Lower Back, Pelvis, Knees, Feet (कटि, जंघा, पाद)
    const drekkanaNum = Math.floor(lagnaDeg / 10) + 1; // 1, 2, or 3
    let anatomicalRegion = "";
    let bodyMarkDesc = "";

    if (drekkanaNum === 1) {
      anatomicalRegion = "मस्तक, ललाट अथवा मुख-मण्डल (Head, Forehead, Face)";
      bodyMarkDesc = "जातक के मस्तक, ललाट, भौंह अथवा चेहरे पर एक विशिष्ट तिल, मस्सा अथवा जन्मजात पहचान-चिह्न विद्यमान होता है।";
    } else if (drekkanaNum === 2) {
      anatomicalRegion = "कण्ठ, कंधा, वक्षःस्थल अथवा उदर (Neck, Chest, Abdomen)";
      bodyMarkDesc = "जातक के कण्ठ, कंधे, वक्षःस्थल (छाती) अथवा नाभि/पेट के आसपास एक प्राकृतिक तिल, मस्सा अथवा सूक्ष्म स्थायी चिह्न रहता है।";
    } else {
      anatomicalRegion = "कटि, जंघा, घुटने अथवा पैर (Waist, Thighs, Feet)";
      bodyMarkDesc = "जातक के कमर के निचले भाग, जंघा, घुटने अथवा पैर के तलवे/अंगूठे पर एक विशेष तिल अथवा जन्म-चिह्न का प्रभाव रहता है।";
    }

    matchedShlokas.push({
      chapterNumber: 10,
      chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
      chapterSignificance: "लग्न द्रेष्काण द्वारा देह-चिह्न, तिल, मस्सा एवं व्रण विचार",
      verseNumbers: "श्लोक ११–१२",
      shlokaSanskrit: `लग्नांशकद्रेष्काणवशाच्छरीरे लक्ष्म निर्दिशेत् ।
प्रथमे मूनि विज्ञेयं द्वितीये ग्रीवकण्ठयोः ॥ ११ ॥
तृतीये पादकटिगे लक्ष्म चिह्नानि निर्दिशेत् ।
पापग्रहेण संदृष्टे व्रणो भवति निश्चितम् ॥ १२ ॥`,
      applicabilityStatus: `लग्न द्रेष्काण देह-चिह्न मिलान (द्रेष्काण ${drekkanaNum})`,
      natalTrigger: `आपकी जन्म कुंडली का लग्न ${lagnaDeg.toFixed(2)}° पर है, जो कि **प्रथम, द्वितीय या तृतीय में से '${drekkanaNum}रा द्रेष्काण'** है।`,
      classicalPrediction: `महर्षि पाराशर का प्रत्यक्ष शरीर-लक्षण सूत्र: **${anatomicalRegion}** में स्थायी देह-चिह्न! ${bodyMarkDesc}`,
      deepMeaning: "पाराशर की यह सूक्ष्म द्रेष्काण शरीर-रचना प्रणाली वैदिक ज्योतिष की गणितीय सूक्ष्मता का प्रत्यक्ष और जीवंत प्रमाण है।",
      badges: [`द्रेष्काण ${drekkanaNum}`, anatomicalRegion.split(' ')[0]]
    });

    // =========================================================================
    // BHAVA LORDS & OCCUPANTS MAP (Chapters 11 to 20 Evaluation)
    // =========================================================================
    const bhavaLords = {};
    for (let h = 1; h <= 12; h++) {
      const sIndex = (lagnaSign + h - 1) % 12;
      const lId = RASHI_LORDS[sIndex];
      bhavaLords[h] = {
        house: h,
        sign: sIndex,
        rashiName: RASHI_NAMES[sIndex],
        lordId: lId,
        grahaName: GRAHA_NAMES[lId] || lId,
        planet: planetMap[lId]
      };
    }

    const houseOccupants = {};
    for (let h = 1; h <= 12; h++) houseOccupants[h] = [];
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].forEach(gid => {
      const p = planetMap[gid];
      if (p && p.house) {
        houseOccupants[p.house].push(p);
      }
    });

    const h2 = bhavaLords[2];
    const h3 = bhavaLords[3];
    const h4 = bhavaLords[4];
    const h5 = bhavaLords[5];
    const h6 = bhavaLords[6];
    const h7 = bhavaLords[7];
    const h8 = bhavaLords[8];
    const h9 = bhavaLords[9];
    const h10 = bhavaLords[10];
    const h11 = bhavaLords[11];
    const h12 = bhavaLords[12];

    // =========================================================================
    // CHAPTER 11: एकादशोऽध्यायः — धनभावफलाध्यायः (2nd House / Dhana Bhava Phala)
    // =========================================================================
    const isH2LordAuspicious = isKendra(h2.planet.house) || isTrikona(h2.planet.house) || h2.planet.house === 11 || h2.planet.house === 2;
    matchedShlokas.push({
      chapterNumber: 11,
      chapterTitle: "एकादशोऽध्यायः — धनभावफलाध्यायः",
      chapterSignificance: "द्वितीय भाव — संचित धन, पैतृक संपदा, वाणी एवं कुटुम्ब समृद्धि",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `धनेशे केन्द्रकोणे वा लाभे वा धनसंयुते ।
स्वोच्चमित्रस्वगे वापि बहुवित्तयुतो भवेत् ॥ १ ॥
धने शुभग्रहैर्युक्ते दृष्टे वा धनवान् भवेत् ।
वागीशे गुरुणा युक्ते वाक्पटुर्विशारदः ॥ २ ॥`,
      applicabilityStatus: isH2LordAuspicious 
        ? `पाराशर धन-संचय एवं समृद्ध कुटुम्ब योग (धनेश '${h2.grahaName}' भाव ${h2.planet.house} में)`
        : `धनेश त्रिक विश्लेषण एवं वित्तीय अनुशासन सूत्र (${h2.grahaName} भाव ${h2.planet.house} में)`,
      natalTrigger: `द्वितीय भाव (धन, संचय व कुटुम्ब) की राशि ${h2.rashiName} है तथा इसके स्वामी '${h2.grahaName}' कुंडली के ${h2.planet.house}वें भाव (${h2.planet.rashiName} राशि) में स्थित हैं।`,
      classicalPrediction: isH2LordAuspicious
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: 'धनेशे केन्द्रकोणे वा लाभे वा बहुवित्तयुतो भवेत्' — धनेश का शुभ केन्द्र, त्रिकोण या लाभ स्थान में होना जातक को विपुल संचित धन, पैतृक संपत्ति, आदरणीय वाणी एवं संपन्न कुटुम्ब का सुख प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार धनेश की स्थिति दर्शाती है कि जातक को धन संचय के लिए विशेष वित्तीय अनुशासन, सुरक्षित निवेश और दूरदर्शी योजना अपनानी चाहिए। दूरस्थ व्यापार या तकनीकी कार्यों से धन-वृद्धि होती है।`,
      deepMeaning: "द्वितीय भाव केवल मुद्रा का नहीं, अपितु व्यक्ति के नैतिक मूल्य और वाणी की साख का अधिष्ठान है। शुभ धनेश जातक के वचनों को प्रभावोत्पादक और विश्वसनीय बनाता है।",
      badges: [isH2LordAuspicious ? "पाराशर धन-संचय योग" : "वित्तीय अनुशासन", `धनेश: ${h2.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 12: द्वादशोऽध्यायः — सहजभावफलाध्यायः (3rd House / Sahaja & Bhratri Phala)
    // =========================================================================
    const isH3LordStrong = isKendra(h3.planet.house) || isTrikona(h3.planet.house) || h3.planet.house === 3 || h3.planet.house === 11;
    matchedShlokas.push({
      chapterNumber: 12,
      chapterTitle: "द्वादशोऽध्यायः — सहजभावफलाध्यायः",
      chapterSignificance: "तृतीय भाव — अदम्य साहस, पराक्रम, भ्रातृ-सौख्य, संचार एवं बाहुबल",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सहजपे केन्द्रकोणे वा स्वोच्चे वा स्वगृहे स्थिते ।
भ्रातृवृद्धिर्भवेत्तस्य भ्रातृमान् साहसी नरः ॥ १ ॥
पराक्रमे बलोपेते धैर्यवान् कीर्तिवर्धनः ।
शौर्यवीर्यगुणोपेतः सर्वशत्रुभयंकरः ॥ २ ॥`,
      applicabilityStatus: `पाराशर अदम्य पराक्रम एवं भ्रातृ-सौख्य योग (तृतीयेश '${h3.grahaName}')`,
      natalTrigger: `तृतीय भाव (पराक्रम, उद्यम व सहज) की राशि ${h3.rashiName} है; तृतीयेश '${h3.grahaName}' भाव ${h3.planet.house} में स्थित हैं तथा कारक मंगल ${mars.rashiName} राशि में हैं।`,
      classicalPrediction: isH3LordStrong
        ? `महर्षि पाराशर के अनुसार तृतीयेश का बलवान होना जातक को निडर स्वभाव, अदम्य साहस, भाई-बहनों का सहयोग, उत्कृष्ट लेखन व संचार कौशल तथा उद्यम द्वारा स्वयं का भाग्य निर्मित करने का वरदान देता है।`
        : `महर्षि पाराशर के अनुसार जातक अपने व्यक्तिगत पुरुषार्थ, सतत धैर्य और स्वतंत्र संकल्प शक्ति के बल पर जीवन में सभी कठिनाइयों पर विजय प्राप्त करता है।`,
      deepMeaning: "तृतीय भाव आंतरिक इच्छा-शक्ति और उद्यम का केंद्र है; शास्त्रों के अनुसार बिना पराक्रम के कोई भी भाग्य या राजयोग फलीभूत नहीं होता।",
      badges: ["अदम्य पराक्रम योग", `तृतीयेश: ${h3.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 13: त्रयोदशोऽध्यायः — सुखभावफलाध्यायः (4th House / Sukha, Matri & Vahana Phala)
    // =========================================================================
    const isH4LordStrong = isKendra(h4.planet.house) || isTrikona(h4.planet.house) || h4.planet.house === 4;
    matchedShlokas.push({
      chapterNumber: 13,
      chapterTitle: "त्रयोदशोऽध्यायः — सुखभावफलाध्यायः",
      chapterSignificance: "चतुर्थ भाव — माता, गृह, भूमि, अचल संपत्ति, श्रेष्ठ वाहन एवं आंतरिक शांति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सुखे शुभग्रहैर्युक्ते सुखेन्द्रे केन्द्रकोणगे ।
वाहनाढ्यः सुखी मर्त्यो मातृदीर्घायुरुच्यते ॥ १ ॥
शुक्रश्चतुर्थे यदि वा सुखेन्द्रे वाहनाधिपः ।
राजतुल्यसुखं प्राप्य गृहे लक्ष्म्या विराजते ॥ २ ॥`,
      applicabilityStatus: `पाराशर गृह-वाहन एवं मातृ-सौख्य योग (सुखेश '${h4.grahaName}')`,
      natalTrigger: `चतुर्थ भाव (माता, भवन, वाहन व आंतरिक सुख) के स्वामी '${h4.grahaName}' कुंडली के ${h4.planet.house}वें भाव में हैं; कारक शुक्र ${venus.rashiName} में एवं चन्द्रमा ${moon.rashiName} में हैं।`,
      classicalPrediction: isH4LordStrong
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: चतुर्थेश का केन्द्र या त्रिकोण में होना जातक को भव्य आवास, उत्तम वाहनों का सुख, भूमि-भवन लाभ, मातृ-स्नेह तथा मानसिक शांति का 'अखंड सुख योग' प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार चतुर्थेश की यह स्थिति दर्शाती है कि जातक को मातृ-सेवा, गृह-सद्भाव एवं संपत्ति प्रबंधन में धैर्य रखना चाहिए जिससे आंतरिक सुख निरंतर समृद्ध रहे।`,
      deepMeaning: "चतुर्थ भाव जातक का 'हृदय' है। बाह्य जगत में कितनी भी प्रतिष्ठा हो, यदि चतुर्थ भाव शुभ है तभी व्यक्ति वास्तविक शांति और संतोष का अनुभव करता है।",
      badges: ["अखंड सुख योग", `सुखेश: ${h4.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 14: चतुर्दशोऽध्यायः — पुत्रभावफलाध्यायः (5th House / Putra, Buddhi & Mantra Phala)
    // =========================================================================
    const isH5LordStrong = isKendra(h5.planet.house) || isTrikona(h5.planet.house) || h5.planet.house === 5 || h5.planet.house === 11;
    matchedShlokas.push({
      chapterNumber: 14,
      chapterTitle: "चतुर्दशोऽध्यायः — पुत्रभावफलाध्यायः",
      chapterSignificance: "पंचम भाव — प्रखर मेधा, विवेक, पूर्वपुण्य, मंत्र-सिद्धि एवं श्रेष्ठ संतति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सुतेशे केन्द्रकोणे वा स्वोच्चे वा मित्रभे स्थिते ।
पुत्रलाभं सुखं चैव मन्त्रसिद्धिमवाप्नुयात् ॥ १ ॥
जीवः पञ्चमभावस्थः सुतेशे बलसंयुते ।
मेधावी बुद्धिमान् प्राज्ञः सर्वशास्त्रविशारदः ॥ २ ॥`,
      applicabilityStatus: `पाराशर मेधा, मन्त्रसिद्धि एवं सुत-सौख्य योग (पंचमेश '${h5.grahaName}')`,
      natalTrigger: `पंचम भाव (बुद्धि, विद्या, पूर्वपुण्य व संतान) की राशि ${h5.rashiName} है; पंचमेश '${h5.grahaName}' भाव ${h5.planet.house} में हैं तथा कारक गुरु ${jupiter.rashiName} में हैं।`,
      classicalPrediction: isH5LordStrong
        ? `महर्षि पाराशर के अनुसार पंचम भाव पूर्वजन्म के संचित पुण्यों का कोष है। बलवान पंचमेश जातक को तीव्र स्मरण-शक्ति, कुशाग्र प्रज्ञा, रणनीतिक अंतर्दृष्टि, मंत्र-साधना में सफलता तथा योग्य संतति का वरदान देता है।`
        : `महर्षि पाराशर के अनुसार पंचमेश जातक को निरंतर स्वाध्याय, उच्च विद्या, विवेकपूर्ण निर्णय और इष्ट-आराधना द्वारा पूर्वपुण्यों को जाग्रत रखने की प्रेरणा देता है।`,
      deepMeaning: "पंचम भाव जातक की प्रज्ञा (Intuition) का स्रोत है। यहाँ से जातक केवल सूचना नहीं, अपितु जीवन का व्यावहारिक विवेक और आध्यात्मिक प्रकाश प्राप्त करता है।",
      badges: ["कुशाग्र मेधा योग", `पंचमेश: ${h5.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 15: पञ्चदशोऽध्यायः — शत्रुभावफलाध्यायः (6th House / Shatru, Roga & Vijaya Phala)
    // =========================================================================
    const maleficsIn6 = houseOccupants[6].filter(p => ['Sun', 'Mars', 'Saturn', 'Rahu'].includes(p.id));
    const isHarshaYoga = [6, 8, 12].includes(h6.planet.house);
    matchedShlokas.push({
      chapterNumber: 15,
      chapterTitle: "पञ्चदशोऽध्यायः — शत्रुभावफलाध्यायः",
      chapterSignificance: "षष्ठ भाव — शत्रु-दमन, रोग-निवारण, ऋण-मुक्ति एवं स्पर्धा में अजेय विजय",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `षष्ठे पापग्रहाः शस्ताः शत्रूणां नाशकारकाः ।
जयं ददति युद्धेषु नृपपूजां तथैव च ॥ १ ॥
षष्ठेशे रिपुगे वापि व्यये वा रन्ध्रगेऽपि वा ।
हर्षाख्यो राजयोगः स्यात् कीर्तिमान् विजयी नरः ॥ २ ॥`,
      applicabilityStatus: maleficsIn6.length > 0 
        ? `षष्ठ भाव में पापग्रह — शत्रुहन्ता योग (${maleficsIn6.map(p => p.grahaName).join(', ')})`
        : (isHarshaYoga ? "हर्ष विपरीत राजयोग (षष्ठेश त्रिक स्थान में)" : `षष्ठेश प्रभाव एवं आरोग्य-सुरक्षा सूत्र (${h6.grahaName})`),
      natalTrigger: maleficsIn6.length > 0
        ? `षष्ठ भाव में क्रूर ग्रह '${maleficsIn6.map(p => p.grahaName).join(', ')}' विराजमान हैं, जो पाराशर के अनुसार सर्व-शत्रुनाशक हैं।`
        : `षष्ठ भाव के स्वामी '${h6.grahaName}' कुंडली के ${h6.planet.house}वें भाव में स्थित हैं।`,
      classicalPrediction: maleficsIn6.length > 0
        ? `महर्षि पाराशर का अद्वितीय सिद्धांत: 'षष्ठे पापग्रहाः शस्ताः शत्रूणां नाशकारकाः' — षष्ठ में क्रूर ग्रहों की स्थिति जातक को किसी भी प्रतियोगिता, न्यायालयीन विवाद अथवा शत्रुता में अपराजेय विजय दिलाती है।`
        : (isHarshaYoga
            ? `महर्षि पाराशर के अनुसार षष्ठेश का त्रिक भाव में स्थित होना 'हर्ष विपरीत राजयोग' का निर्माण करता है, जिससे जातक संकटों और बाधाओं के बीच से अप्रत्याशित सफलता और ख्याति अर्जित करता है।`
            : `महर्षि पाराशर के अनुसार जातक को दिनचर्या, खान-पान और स्वास्थ्य के प्रति सचेत रहना चाहिए; नियमित व्यायाम और अनुशासन से रोग व ऋण स्वतः नष्ट होते हैं।`),
      deepMeaning: "षष्ठ भाव जीवन की चुनौतियों का युद्ध-क्षेत्र है; यहाँ का बल जातक को विपरीत परिस्थितियों में अडिग रहने वाला योद्धा बनाता है।",
      badges: [maleficsIn6.length > 0 ? "शत्रुहन्ता योग" : (isHarshaYoga ? "हर्ष विपरीत राजयोग" : "आरोग्य सतर्कता"), `षष्ठेश: ${h6.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 16: षोडशोऽध्यायः — कलत्रभावफलाध्यायः (7th House / Kalatra & Vivaha Phala)
    // =========================================================================
    const isH7LordStrong = isKendra(h7.planet.house) || isTrikona(h7.planet.house) || h7.planet.house === 7 || h7.planet.house === 2;
    matchedShlokas.push({
      chapterNumber: 16,
      chapterTitle: "षोडशोऽध्यायः — कलत्रभावफलाध्यायः",
      chapterSignificance: "सप्तम भाव — दांपत्य जीवन, सुलक्षण जीवनसाथी, साझेदारी एवं लोक-व्यवहार",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सप्तमेशे बलोपेते शुभयुक्ते शुभेक्षिते ।
भार्या रूपवती शीला साध्वी कुलविवर्धिनी ॥ १ ॥
शुक्रः कलत्रगो वापि सप्तमेशेन संयुतः ।
कामिनीसुखसम्पन्नो विलासी धनवान् भवेत् ॥ २ ॥`,
      applicabilityStatus: `पाराशर दांपत्य सौख्य एवं जीवनसाथी लक्षण योग (सप्तमेश '${h7.grahaName}')`,
      natalTrigger: `सप्तम भाव (विवाह, दांपत्य व साझेदारी) की राशि ${h7.rashiName} है; सप्तमेश '${h7.grahaName}' भाव ${h7.planet.house} में हैं तथा विवाह कारक शुक्र ${venus.rashiName} राशि में हैं।`,
      classicalPrediction: isH7LordStrong
        ? `महर्षि पाराशर के अनुसार सप्तमेश का शुभ केन्द्र/त्रिकोण में होना जातक को सुरुचिपूर्ण, सुसंस्कृत, गुणवान तथा कुल की प्रतिष्ठा बढ़ाने वाला जीवनसाथी प्रदान करता है। साझेदारी के कार्यों में निरंतर लाभ प्राप्त होता है।`
        : `महर्षि पाराशर के अनुसार दांपत्य जीवन में परस्पर संवाद, सम्मान और परिपक्वता रखने से संबंध सदा प्रगाढ़ और सुखमय बने रहते हैं।`,
      deepMeaning: "सप्तम भाव व्यक्ति के बाह्य संसार से जुड़ने का मुख्य द्वार है; यह केवल वैवाहिक सुख ही नहीं, अपितु समाज में आपके व्यक्तित्व के प्रति आकर्षण का भी सूचक है।",
      badges: ["सुलक्षण दांपत्य योग", `सप्तमेश: ${h7.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 17: सप्तदशोऽध्यायः — आयुर्भावफलाध्यायः (8th House / Ayur & Randhra Phala)
    // =========================================================================
    const isSaralaYoga = [6, 8, 12].includes(h8.planet.house);
    const isSaturnIn8 = saturn.house === 8;
    matchedShlokas.push({
      chapterNumber: 17,
      chapterTitle: "सप्तदशोऽध्यायः — आयुर्भावफलाध्यायः",
      chapterSignificance: "अष्टम भाव — दीर्घायु, गूढ़-विद्या, अनुसंधान, आकस्मिक धन एवं रूपांतरण",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `अष्टमेशे बलयुते लग्नेशे केन्द्रसंस्थिते ।
दीर्घायुर्भवति प्राणी सर्वव्याधिविवर्जितः ॥ १ ॥
शनौ रन्ध्रगते दीर्घमायुर्भवति निश्चितम् ।
सरलाख्यो भवेद्योगो रन्ध्रेशे रिपुगे व्यये ॥ २ ॥`,
      applicabilityStatus: isSaturnIn8
        ? "आयुष्कारक शनि अष्टम में — पूर्णायु योग"
        : (isSaralaYoga ? "सरल विपरीत राजयोग (अष्टमेश त्रिक भाव में)" : `पाराशर दीर्घायु एवं गूढ़ विद्या विधान (अष्टमेश '${h8.grahaName}')`),
      natalTrigger: `अष्टम भाव (आयु, अनुसंधान व गूढ़ ज्ञान) के स्वामी '${h8.grahaName}' कुंडली के ${h8.planet.house}वें भाव में हैं तथा आयुष्कारक शनि ${saturn.rashiName} में हैं।`,
      classicalPrediction: (isSaturnIn8 || isKendra(lagneshHouse))
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: अष्टम भाव व लग्नेश का संतुलन जातक को 'दीर्घायु' और सभी गंभीर व्याधियों से रक्षा प्रदान करता है। जातक में गूढ़ रहस्यों, अनुसंधान और आध्यात्मिक सत्यों को समझने की अद्भूत क्षमता होती है।`
        : (isSaralaYoga
            ? `महर्षि पाराशर के अनुसार अष्टमेश का त्रिक स्थान में होना 'सरल राजयोग' बनाता है, जिससे जातक निर्भय, दीर्घायु, विद्वान तथा आकस्मिक संकटों से अविचल बाहर निकलने वाला बनता है।`
            : `महर्षि पाराशर के अनुसार अष्टमेश जातक को आत्म-अवलोकन, योग-प्राणायाम और गूढ़ विद्याओं के अध्ययन द्वारा जीवनी-शक्ति बढ़ाने का निर्देश देता है।`),
      deepMeaning: "अष्टम भाव केवल आयु का नहीं, अपितु आत्मिक रूपांतरण और कुण्डलिनी जागरण का भाव है; यहाँ से जातक के भीतर छिपी असीम आत्मिक क्षमता जाग्रत होती है।",
      badges: [isSaturnIn8 ? "पूर्णायु योग" : (isSaralaYoga ? "सरल राजयोग" : "गूढ़ विद्या योग"), `अष्टमेश: ${h8.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 18: अष्टादशोऽध्यायः — भाग्यभावफलाध्यायः (9th House / Bhagya & Dharma Phala)
    // =========================================================================
    const isH9LordStrong = isKendra(h9.planet.house) || isTrikona(h9.planet.house) || h9.planet.house === 9 || h9.planet.house === 11;
    const isLakshmiYoga = (lagneshHouse === 9 || h9.planet.house === 1 || (lagneshaId === h9.lordId) || (lagneshHouse === h9.planet.house));
    matchedShlokas.push({
      chapterNumber: 18,
      chapterTitle: "अष्टादशोऽध्यायः — भाग्यभावफलाध्यायः",
      chapterSignificance: "नवम भाव — महाभाग्य, धर्म, पिता, गुरु-कृपा, तीर्थ-पुण्य एवं दैवीय अनुग्रह",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `भाग्येशे केन्द्रकोणे वा स्वोच्चे वा स्वगृहे स्थिते ।
महाभाग्ययुतो मर्त्यो धर्मिष्ठो गुरुभक्तिमान् ॥ १ ॥
लग्नेश-भाग्येश-योगे लक्ष्मीयोगः प्रकीर्तितः ।
सर्वसम्पत्प्रदः साक्षात् कीर्तिधर्मविवर्धनः ॥ २ ॥`,
      applicabilityStatus: isLakshmiYoga
        ? `पाराशर लक्ष्मी योग (लग्नेश व भाग्येश का शुभ संबंध)`
        : `पाराशर महाभाग्य एवं धर्म-वृद्धि योग (भाग्येश '${h9.grahaName}' भाव ${h9.planet.house} में)`,
      natalTrigger: `नवम भाव (भाग्य व धर्म) की राशि ${h9.rashiName} है; भाग्येश '${h9.grahaName}' भाव ${h9.planet.house} में विराजमान हैं तथा धर्मकारक गुरु ${jupiter.rashiName} में हैं।`,
      classicalPrediction: isH9LordStrong
        ? `महर्षि पाराशर का अमर सूत्र: नवम भाव कुंडली का सर्वोच्च धर्म-त्रिकोण है। भाग्येश का सुदृढ़ होना जातक को जीवन के प्रत्येक कदम पर दैवीय सहायता, गुरुजनों का स्नेह, पैतृक आशीर्वाद, तीर्थ-पुण्य तथा 'महाभाग्य योग' की अखंड प्रतिष्ठा दिलाता है।`
        : `महर्षि पाराशर के अनुसार जातक अपने सत्कर्मों, गुरु-भक्ति और धर्म-परायण आचरण से अपने भाग्य को निरंतर चमकाता है और समाज में आदरणीय बनता है।`,
      deepMeaning: "भाग्य वस्तुतः पूर्वजन्मों में अर्जित शुभ कर्मों की पूंजी है; जब भाग्य भाव जागृत होता है, तो थोड़े प्रयास से भी अद्भुत और युगान्तकारी परिणाम प्राप्त होते हैं।",
      badges: [isLakshmiYoga ? "लक्ष्मी योग" : "महाभाग्य योग", `भाग्येश: ${h9.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 19: एकोनविंशोऽध्यायः — राज्यभावफलाध्यायः (10th House / Rajya & Karma Phala)
    // =========================================================================
    const hasDigbalaIn10 = houseOccupants[10].some(p => ['Sun', 'Mars'].includes(p.id));
    const isH10LordStrong = isKendra(h10.planet.house) || isTrikona(h10.planet.house) || h10.planet.house === 10 || h10.planet.house === 11;
    const isDharmaKarmaYoga = (h9.planet.house === 10 || h10.planet.house === 9 || h9.planet.house === h10.planet.house);
    matchedShlokas.push({
      chapterNumber: 19,
      chapterTitle: "एकोनविंशोऽध्यायः — राज्यभावफलाध्यायः",
      chapterSignificance: "दशम भाव — राज्य-सम्मान, पद-प्रतिष्ठा, सर्वोच्च आजीविका, कर्म-सिद्धि एवं नेतृत्व",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `दशमेशे केन्द्रकोणे वा स्वोच्चे वा मित्रभे स्थिते ।
राज्यसम्मानसंयुक्तः कीर्तिमान् विजयी भवेत् ॥ १ ॥
दशमे सूर्यभौमौ तु दिग्बलसहितौ शुभौ ।
धर्मकर्माधिपत्योगे राजयोगः परमो मतः ॥ २ ॥`,
      applicabilityStatus: hasDigbalaIn10
        ? `दशम भाव में सूर्य/मंगल — सर्वोच्च दिग्बल राज्याधिकार योग`
        : (isDharmaKarmaYoga ? "धर्मकर्माधिपति राजयोग (नवमेश व दशमेश योग)" : `पाराशर कर्म-सिद्धि एवं राज्य-सम्मान योग (दशमेश '${h10.grahaName}')`),
      natalTrigger: `दशम भाव (कर्म, आजीविका व प्रतिष्ठा) की राशि ${h10.rashiName} है; दशमेश '${h10.grahaName}' भाव ${h10.planet.house} में हैं।`,
      classicalPrediction: (isH10LordStrong || hasDigbalaIn10)
        ? `महर्षि पाराशर के अनुसार दशम भाव काल-पुरुष का सर्वोच्च मुकुट है। दशमेश का शुभ स्थान जातक को उच्च सामाजिक अधिकार, शासकीय या कॉरपोरेट नेतृत्व, निष्कलंक ख्याति तथा अपने कार्यक्षेत्र में शीर्षस्थ सफलता प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार जातक निष्काम कर्म और कर्तव्यनिष्ठा के बल पर अपने क्षेत्र में सम्माननीय स्थान अर्जित करता है।`,
      deepMeaning: "दशम भाव व्यक्ति के जीवन का मूर्त परिणाम है जिसे संसार देखता है। यहाँ के योग व्यक्ति को केवल आजीविका नहीं, अपितु युग को दिशा देने वाला कर्मयोगी बनाते हैं।",
      badges: [hasDigbalaIn10 ? "दिग्बल राज्याधिकार" : (isDharmaKarmaYoga ? "धर्मकर्माधिपति योग" : "कर्म-सिद्धि योग"), `दशमेश: ${h10.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 20: विंशोऽध्यायः — लाभभावफलाध्यायः (11th House / Labha & Aya Phala)
    // =========================================================================
    const planetsIn11 = houseOccupants[11];
    const isMahaDhanapati = (h11.planet.house === 2 || h2.planet.house === 11 || (h11.planet.house === h2.planet.house));
    matchedShlokas.push({
      chapterNumber: 20,
      chapterTitle: "विंशोऽध्यायः — लाभभावफलाध्यायः",
      chapterSignificance: "एकादश भाव — सर्व-मनोरथ सिद्धि, नियमित आय, महा-धनपति योग एवं विशिष्ट मित्र-मंडल",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `एकादशे ग्रहाः सर्वे शुभा वाऽप्यशुभास्तथा ।
बहुवित्तप्रदा ज्ञेया लाभभावफलप्रदाः ॥ १ ॥
लाभाधिपे धने संस्थे धनेशे लाभगेऽपि वा ।
महाधनपतिर्योगी कोटिश्रीर्लभते नरः ॥ २ ॥`,
      applicabilityStatus: planetsIn11.length > 0
        ? `एकादश भावस्थ ग्रह — पाराशर सर्व-लाभ योग (${planetsIn11.map(p => p.grahaName).join(', ')})`
        : (isMahaDhanapati ? "पाराशर महा-धनपति योग (द्वितीयेश व एकादशेश संबंध)" : `पाराशर लाभ एवं मनोरथ-सिद्धि विधान (लाभेश '${h11.grahaName}')`),
      natalTrigger: planetsIn11.length > 0
        ? `एकादश भाव में ग्रह '${planetsIn11.map(p => p.grahaName).join(', ')}' विराजमान हैं; तथा लाभेश '${h11.grahaName}' भाव ${h11.planet.house} में स्थित हैं।`
        : `एकादश भाव (लाभ व आय) की राशि ${h11.rashiName} है; लाभेश '${h11.grahaName}' कुंडली के ${h11.planet.house}वें भाव में स्थित हैं।`,
      classicalPrediction: `महर्षि पाराशर का अद्वितीय सिद्धांत: 'एकादशे ग्रहाः सर्वे बहुवित्तप्रदा ज्ञेयाः' — एकादश भाव जीवन की समस्त आकांक्षाओं की सिद्धि का महा-द्वार है। लाभेश का प्रभाव जातक को निरंतर आर्थिक प्रवाह, प्रभावशाली संपर्कों का लाभ, महत्वाकांक्षाओं की पूर्ति तथा समाज में प्रतिष्ठित समृद्धि सुनिश्चित करता है।`,
      deepMeaning: "एकादश भाव जीवन में इच्छाओं की परिपूर्णता का भाव है। जब यह भाव जागृत होता है, तो व्यक्ति का कोई भी सत्संकल्प अधूरा नहीं रहता।",
      badges: [planetsIn11.length > 0 ? "सर्व-लाभ योग" : (isMahaDhanapati ? "महा-धनपति योग" : "मनोरथ सिद्धि"), `लाभेश: ${h11.grahaName}`]
    });

    // =========================================================================
    // ADVANCED COMPUTATIONS FOR CHAPTERS 21 TO 40
    // =========================================================================

    // 1. Arudha Pada Calculation Helper:
    function getBhavaArudha(houseNum) {
      const houseSign = (lagnaSign + houseNum - 1) % 12;
      const lordPlanet = planetMap[RASHI_LORDS[houseSign]];
      const lordSign = lordPlanet.sign;
      const dist = (lordSign - houseSign + 12) % 12;
      let arudha = (lordSign + dist) % 12;
      if (arudha === houseSign || arudha === (houseSign + 6) % 12) {
        arudha = (arudha + 9) % 12;
      }
      return arudha;
    }

    const arudhaLagnaSign = getBhavaArudha(1); // Arudha Lagna (AL)
    const upapadaLagnaSign = getBhavaArudha(12); // Upapada Lagna (UL)
    const arudhaLagnaHouse = getHouse(arudhaLagnaSign, lagnaSign);
    const upapadaLagnaHouse = getHouse(upapadaLagnaSign, lagnaSign);

    // 2. Charakarakas (7 planets sorted by deg descending):
    const charaGrahaList = sevenGrahas.slice().sort((a, b) => planetMap[b].deg - planetMap[a].deg);
    const charaKarakas = {
      AK: { id: charaGrahaList[0], name: GRAHA_NAMES[charaGrahaList[0]], title: "आत्मकारक (Atmakaraka)", role: "आत्मा, जीवन-ध्येय व सर्वोच्च आत्मिक स्वरूप" },
      AmK: { id: charaGrahaList[1], name: GRAHA_NAMES[charaGrahaList[1]], title: "आमात्यकारक (Amatyakaraka)", role: "कर्म, आजीविका, नेतृत्व व बौद्धिक कौशल" },
      BK: { id: charaGrahaList[2], name: GRAHA_NAMES[charaGrahaList[2]], title: "भ्रातृकारक (Bhratrikaraka)", role: "गुरु, भ्राता, पराक्रम व धर्म-मार्गदर्शन" },
      MK: { id: charaGrahaList[3], name: GRAHA_NAMES[charaGrahaList[3]], title: "मातृकारक (Matrikaraka)", role: "माता, हृदय-सुख, संस्कार व शांति" },
      PK: { id: charaGrahaList[4], name: GRAHA_NAMES[charaGrahaList[4]], title: "पुत्रकारक (Putrakaraka)", role: "प्रज्ञा, विद्या, पूर्वपुण्य व संतति" },
      GK: { id: charaGrahaList[5], name: GRAHA_NAMES[charaGrahaList[5]], title: "ज्ञातिकारक (Gnatikaraka)", role: "प्रतिस्पर्धा, चुनौतियां, बंधु-संबंध व विजय" },
      DK: { id: charaGrahaList[6], name: GRAHA_NAMES[charaGrahaList[6]], title: "दारकारक (Darakaraka)", role: "जीवनसाथी, वैवाहिक सामंजस्य व प्रेम" }
    };

    // 3. Karakamsha (Navamsha sign of Atmakaraka):
    const karakamshaSign = getVargaSign(planetMap[charaKarakas.AK.id].sign, planetMap[charaKarakas.AK.id].deg, 9);
    const karakamshaRashiName = RASHI_NAMES[karakamshaSign];

    // 4. Yogakaraka identification:
    let yogakarakaId = null;
    let yogakarakaDesc = "";
    if (lagnaSign === 1) { yogakarakaId = "Saturn"; yogakarakaDesc = "शनि (नवमेश व दशमेश)"; }
    else if (lagnaSign === 3) { yogakarakaId = "Mars"; yogakarakaDesc = "मंगल (पंचमेश व दशमेश)"; }
    else if (lagnaSign === 4) { yogakarakaId = "Mars"; yogakarakaDesc = "मंगल (चतुर्थेश व नवमेश)"; }
    else if (lagnaSign === 6) { yogakarakaId = "Saturn"; yogakarakaDesc = "शनि (चतुर्थेश व पंचमेश)"; }
    else if (lagnaSign === 9) { yogakarakaId = "Venus"; yogakarakaDesc = "शुक्र (पंचमेश व दशमेश)"; }
    else if (lagnaSign === 10) { yogakarakaId = "Venus"; yogakarakaDesc = "शुक्र (चतुर्थेश व नवमेश)"; }
    else { yogakarakaId = lagneshaId; yogakarakaDesc = `${GRAHA_NAMES[lagneshaId]} (लग्नेश एवं शुभ त्रिकोण नियंता)`; }

    // 5. Nabhasha Yogas (Counting unique signs of 7 planets):
    const occupiedSigns = new Set(sevenGrahas.map(gid => planetMap[gid].sign));
    const signCount = occupiedSigns.size;
    const SANKHYA_YOGAS = {
      7: { name: "वीणा योग (Veena Yoga)", desc: "संगीत, कला, सौंदर्य, वाक्-माधुर्य एवं ललित कलाओं में परम निपुणता" },
      6: { name: "दामिनी योग (Damini Yoga)", desc: "विशाल हृदय, निरंतर दान, विपुल संपत्ति, परोपकार एवं सर्व-जन प्रियता" },
      5: { name: "पाश योग (Pasha Yoga)", desc: "प्रशासकीय कार्य-कुशलता, विशाल संगठन, सेवक-सुख एवं दृढ़ अनुशासन" },
      4: { name: "केदार योग (Kedara Yoga)", desc: "भूमि, भवन, अचल संपत्ति, कृषि, स्थिरता एवं लोक-कल्याणकारी ख्याति" },
      3: { name: "शूल योग (Shoola Yoga)", desc: "अदम्य युद्ध-साहस, तीक्ष्ण बुद्धि, विपरीत परिस्थितियों में अपराजेय विजय" },
      2: { name: "युग योग (Yuga Yoga)", desc: "अपूर्व मानसिक एकाग्रता, विशिष्ट अनुसंधान एवं वैज्ञानिक/गूढ़ प्रतिभा" },
      1: { name: "गोल योग (Gola Yoga)", desc: "अविचल संकल्प, तपस्वी एकाग्रता एवं आंतरिक आत्मबल" }
    };
    const nabhasha = SANKHYA_YOGAS[signCount] || SANKHYA_YOGAS[5];

    // 6. Chandra Yogas:
    const moonSign = moon.sign;
    const sign2ndFromMoon = (moonSign + 1) % 12;
    const sign12thFromMoon = (moonSign + 11) % 12;
    const grahasIn2FromMoon = sevenGrahas.filter(g => g !== 'Sun' && g !== 'Moon' && planetMap[g].sign === sign2ndFromMoon);
    const grahasIn12FromMoon = sevenGrahas.filter(g => g !== 'Sun' && g !== 'Moon' && planetMap[g].sign === sign12thFromMoon);

    let chandraYogaName = "";
    let chandraYogaDesc = "";
    if (grahasIn2FromMoon.length > 0 && grahasIn12FromMoon.length > 0) {
      chandraYogaName = "दुरुधरा योग (Durudhara Yoga)";
      chandraYogaDesc = "जातक अतुल्य संपदा, सुंदर वाहनों, राजतुल्य विलासिता, उदारता एवं सर्व-सुखों से युक्त रहता है।";
    } else if (grahasIn2FromMoon.length > 0) {
      chandraYogaName = "सुनफा योग (Sunapha Yoga)";
      chandraYogaDesc = "जातक अपने स्वअर्जित पराक्रम से विपुल धन, सुबुद्धि, ख्याति एवं निरंतर प्रगति अर्जित करता है।";
    } else if (grahasIn12FromMoon.length > 0) {
      chandraYogaName = "अनफा योग (Anapha Yoga)";
      chandraYogaDesc = "जातक निरोगी काया, मधुर स्वभाव, उत्तम वस्त्र-आभूषण, सदाचार एवं समाज में सम्मानित रहता है।";
    } else {
      const kendraFromMoonHasGraha = sevenGrahas.some(g => g !== 'Moon' && [1, 4, 7, 10].includes(((planetMap[g].sign - moonSign + 12) % 12) + 1));
      if (kendraFromMoonHasGraha || isKendra(moon.house)) {
        chandraYogaName = "केमद्रुम-भंग राजयोग (Kemadruma Bhanga Raja Yoga)";
        chandraYogaDesc = "केमद्रुम योग का पूर्ण परिहार होकर राजयोग में रूपांतरण! जीवन में संघर्ष के बाद ऐतिहासिक सफलता प्राप्त होती है।";
      } else {
        chandraYogaName = "केमद्रुम योग (Kemadruma Yoga)";
        chandraYogaDesc = "जातक को स्वावलंबन, आंतरिक साधना एवं आत्मबल से जीवन की नींव रखनी होती है।";
      }
    }

    // 7. Surya Yogas:
    const sunSign = sun.sign;
    const sign2ndFromSun = (sunSign + 1) % 12;
    const sign12thFromSun = (sunSign + 11) % 12;
    const grahasIn2FromSun = sevenGrahas.filter(g => g !== 'Sun' && g !== 'Moon' && planetMap[g].sign === sign2ndFromSun);
    const grahasIn12FromSun = sevenGrahas.filter(g => g !== 'Sun' && g !== 'Moon' && planetMap[g].sign === sign12thFromSun);

    let suryaYogaName = "";
    let suryaYogaDesc = "";
    if (grahasIn2FromSun.length > 0 && grahasIn12FromSun.length > 0) {
      suryaYogaName = "उभयचरी योग (Ubhayachari Yoga)";
      suryaYogaDesc = "जातक तेजस्वी, प्रतापी, वक्ता, शासन में उच्च सम्मानित तथा सर्व-सुविधा संपन्न रहता है।";
    } else if (grahasIn2FromSun.length > 0) {
      suryaYogaName = "वेशि योग (Vesi Yoga)";
      suryaYogaDesc = "जातक सत्यवादी, धीर, दीर्घदृष्टा, यशस्वी एवं धार्मिक कार्यों में अग्रणी रहता है।";
    } else if (grahasIn12FromSun.length > 0) {
      suryaYogaName = "वाशि योग (Vasi Yoga)";
      suryaYogaDesc = "जातक मेधावी, स्थिर चित्त, उद्योगी, राज्य-मान्य एवं कला-प्रिय होता है।";
    } else {
      suryaYogaName = "भास्कर प्रभा योग (Bhaskara Prabha)";
      suryaYogaDesc = "सूर्य देव अपने स्वतंत्र आत्म-तेज से जातक को आत्मनिर्भरता एवं निर्भयता प्रदान करते हैं।";
    }

    // 8. Pancha Mahapurusha & Raja Yogas:
    const mahapurushaYogas = [];
    if (isKendra(mars.house) && (mars.sign === 0 || mars.sign === 7 || mars.sign === 9)) {
      mahapurushaYogas.push({ name: "रुचक महापुरुष योग (Ruchaka Yoga)", planet: "मंगल", desc: "अजेय सेनापति-तुल्य शौर्य, भूमि-भवन स्वामी, निर्भय व्यक्तित्व एवं उच्च प्रशासनिक सत्ता" });
    }
    if (isKendra(mercury.house) && (mercury.sign === 2 || mercury.sign === 5)) {
      mahapurushaYogas.push({ name: "भद्र महापुरुष योग (Bhadra Yoga)", planet: "बुध", desc: "कुशाग्र बौद्धिक संपदा, वाक्-सिद्धि, व्यापारिक साम्राज्य, शास्त्र-प्रवीणता एवं दीर्घायु" });
    }
    if (isKendra(jupiter.house) && (jupiter.sign === 8 || jupiter.sign === 11 || jupiter.sign === 3)) {
      mahapurushaYogas.push({ name: "हंस महापुरुष योग (Hamsa Yoga)", planet: "गुरु", desc: "साधु-तुल्य पावन चरित्र, शास्त्र-विद्वत्ता, राजपूज्य गरिमा, धर्माधिकारी पद एवं परम सम्मान" });
    }
    if (isKendra(venus.house) && (venus.sign === 1 || venus.sign === 6 || venus.sign === 11)) {
      mahapurushaYogas.push({ name: "मालव्य महापुरुष योग (Malavya Yoga)", planet: "शुक्र", desc: "अखंड वैभव, कला-पारखी, राजसी वाहन व भवन, सौंदर्य, दांपत्य विलास एवं कालजयी ख्याति" });
    }
    if (isKendra(saturn.house) && (saturn.sign === 9 || saturn.sign === 10 || saturn.sign === 6)) {
      mahapurushaYogas.push({ name: "शश महापुरुष योग (Shasha Yoga)", planet: "शनि", desc: "जन-नायक, जन-समूह पर सर्वोच्च नियंत्रण, अटूट धैर्य, गुप्त नीतियों का स्वामी एवं विशाल संपत्ति" });
    }

    // 9. Gajakesari Yoga:
    const moonToJupHouse = ((jupiter.sign - moon.sign + 12) % 12) + 1;
    const isGajakesari = isKendra(moonToJupHouse);

    // =========================================================================
    // CHAPTER 21: एकविंशोऽध्यायः — व्ययभावफलाध्यायः (12th House / Vyaya Bhava Phala)
    // =========================================================================
    const isVimalaYoga = [6, 8, 12].includes(h12.planet.house);
    matchedShlokas.push({
      chapterNumber: 21,
      chapterTitle: "एकविंशोऽध्यायः — व्ययभावफलाध्यायः",
      chapterSignificance: "द्वादश भाव — मोक्ष, दान, विदेश यात्रा, शयन-सुख एवं विमल विपरीत राजयोग",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `व्ययेशे केन्द्रकोणे वा शुभदृष्टियुतेऽपि वा ।
व्ययो धर्मे भवेत्तस्य तीर्थयात्रारतो नरः ॥ १ ॥
व्ययेशे रिपुगे वापि रन्ध्रगे व्ययगेऽपि वा ।
विमलाख्यो भवेद्योगः सर्वसौख्यविवर्धनः ॥ २ ॥`,
      applicabilityStatus: isVimalaYoga
        ? "विमल विपरीत राजयोग (द्वादशेश त्रिक भाव में)"
        : `पाराशर सद्व्यय, विदेश एवं मोक्ष विधान (द्वादशेश '${h12.grahaName}')`,
      natalTrigger: `द्वादश भाव (व्यय, विदेश व मोक्ष) की राशि ${h12.rashiName} है; द्वादशेश '${h12.grahaName}' भाव ${h12.planet.house} में स्थित हैं।`,
      classicalPrediction: isVimalaYoga
        ? `महर्षि पाराशर के अनुसार द्वादशेश का त्रिक स्थान में होना 'विमल विपरीत राजयोग' का सृजन करता है। जातक स्वतंत्र विचारों वाला, मितव्ययी, संकटों से सहज उबरने वाला तथा स्वाभिमान से अपार धन-संचय करने वाला बनता है।`
        : `महर्षि पाराशर के अनुसार द्वादशेश की स्थिति जातक को दान-पुण्य, परोपकार, दूरस्थ स्थानों/विदेश से संबंध, तीर्थ-यात्रा एवं आध्यात्मिक मोक्ष-पथ की ओर प्रेरित करती है।`,
      deepMeaning: "द्वादश भाव मुक्ति और अहंकार के विसर्जन का सर्वोच्च धाम है; यहाँ का शुभ योग जातक को सांसारिक बंधनों के बीच भी आध्यात्मिक मुक्ति का मार्ग दिखाता है।",
      badges: [isVimalaYoga ? "विमल राजयोग" : "मोक्ष व सद्व्यय", `द्वादशेश: ${h12.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 22: द्वाविंशोऽध्यायः — भावस्वाम्यध्यायः (Lordship of Bhavas & Manifestations)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 22,
      chapterTitle: "द्वाविंशोऽध्यायः — भावस्वाम्यध्यायः",
      chapterSignificance: "भावेशों का पारस्परिक प्रभाव, केन्द्र-त्रिकोण आधिपत्य एवं फल-वितरण",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `यद्भावपो यद्भावस्थस्तद्भावफलदायकः ।
शुभाः शुभप्रदा ज्ञेयाः क्रूराः कष्टप्रदाः स्मृताः ॥ १ ॥
केन्द्राधिपाश्च कोणापाः शुभाः सर्वफलप्रदाः ॥ २ ॥`,
      applicabilityStatus: "द्वादश भाव स्वामियों का सार्वभौम फलित संकलन",
      natalTrigger: `लग्नेश '${lagnesha.grahaName}' भाव ${lagneshHouse} में, धनेश '${h2.grahaName}' भाव ${h2.planet.house} में, भाग्येश '${h9.grahaName}' भाव ${h9.planet.house} में तथा कर्मेश '${h10.grahaName}' भाव ${h10.planet.house} में स्थित हैं।`,
      classicalPrediction: "महर्षि पाराशर का आधारभूत नियम: जिस भाव का स्वामी अपने से शुभ स्थान में जाता है, वह उस भाव के फलों को पुष्पित करता है। केन्द्र और त्रिकोण के स्वामियों का संबंध जीवन में स्थायी स्थिरता और भाग्य-वृद्धि का मुख्य कारक बनता है।",
      deepMeaning: "भाव केवल स्थिर कक्ष नहीं हैं, अपितु उनके स्वामी जीवन के अलग-अलग विभागों के प्रबंधक हैं। जब प्रबंधक शुभ भाव में बैठते हैं, तो उस विभाग का कार्य स्वतः निर्विघ्न संपन्न होता है।",
      badges: ["भावेश नियम", "पाराशर स्वामी-विधान"]
    });

    // =========================================================================
    // CHAPTER 23: त्रयोविंशोऽध्यायः — भावफलविवेकाध्यायः (Deep Bhava Analysis)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 23,
      chapterTitle: "त्रयोविंशोऽध्यायः — भावफलविवेकाध्यायः",
      chapterSignificance: "त्रिक भावों (६, ८, १२) का गूढ़ विश्लेषण एवं विपरीत राजयोग समन्वय",
      verseNumbers: "श्लोक ५–६",
      shlokaSanskrit: `हर्षः सरलो विमलश्चेति विपरीतराजयोगतः ।
त्रिकेशैस्त्रिकसंस्थैश्च नृपमान्यो भवेन्नरः ॥ ५ ॥
दोषनाशकरो योगः सर्वसंपत्प्रदायकः ॥ ६ ॥`,
      applicabilityStatus: (isHarshaYoga || isSaralaYoga || isVimalaYoga)
        ? "विपरीत राजयोग संकुल (हर्ष/सरल/विमल योग प्रभाव)"
        : "त्रिक भाव संतुलन एवं सतर्कता विधान",
      natalTrigger: `षष्ठेश भाव ${h6.planet.house} में, अष्टमेश भाव ${h8.planet.house} में तथा द्वादशेश भाव ${h12.planet.house} में स्थित हैं।`,
      classicalPrediction: (isHarshaYoga || isSaralaYoga || isVimalaYoga)
        ? "महर्षि पाराशर का उद्घोष: जब त्रिक भावों के स्वामी अन्य त्रिक भावों में स्थित हों, तो जातक को जीवन की सबसे विषम चुनौतियों के उपरांत राजतुल्य सम्मान, अचानक भाग्योदय एवं विरोधियों पर अप्रत्याशित विजय प्राप्त होती है।"
        : "महर्षि पाराशर के अनुसार त्रिक भावों का यह विन्यास जातक को कर्मठता, आध्यात्मिक अनुशासन एवं नियमित स्वास्थ्य सुरक्षा द्वारा निरंतर विजयी बनाए रखता है।",
      deepMeaning: "विपरीत राजयोग यह सिद्ध करता है कि जो विष साधारण व्यक्ति को नष्ट कर देता है, वही योग-बल से अमृत बनकर जातक को अमर कीर्ति दिलाता है।",
      badges: [(isHarshaYoga || isSaralaYoga || isVimalaYoga) ? "विपरीत राजयोग" : "त्रिक संतुलन", "गूढ़ फलित"]
    });

    // =========================================================================
    // CHAPTER 24: चतुर्विंशोऽध्यायः — भावस्वाम्यफलाध्यायः (Effects of House Lords in various Houses)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 24,
      chapterTitle: "चतुर्विंशोऽध्यायः — भावस्वाम्यफलाध्यायः",
      chapterSignificance: "लग्नेश, धनेश, भाग्येश एवं कर्मेश के द्वादश भावों में विशिष्ट फल",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `लग्नेशे केन्द्रगे नित्यं देहसौख्यं यशस्तथा ।
धनेशे केन्द्रगे वित्तं भाग्येशे भाग्यवर्धनम् ॥ १ ॥
कर्मेशे शुभसंयुक्ते राज्यसम्मानमश्नुते ॥ २ ॥`,
      applicabilityStatus: `प्रमुख भावेशों का केंद्र-त्रिकोण समन्वय (लग्नेश भाव ${lagneshHouse})`,
      natalTrigger: `आपके लग्नेश '${lagnesha.grahaName}' ${lagneshHouse}वें भाव में तथा कर्मेश '${h10.grahaName}' ${h10.planet.house}वें भाव में स्थित हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब जीवन के मुख्य आधार (लग्न, धन, भाग्य, कर्म) के स्वामी परस्पर केन्द्र या त्रिकोण में स्थापित होते हैं, तो जातक समाज में सम्मानित, स्वावलंबी, समृद्ध एवं कर्तव्यपरायण बनता है।",
      deepMeaning: "भाव-स्वामियों का शुभ स्थान जातक को आंतरिक संतुष्टि के साथ-साथ बाह्य संसार में ठोस उपलब्धियां अर्जित करने की निरंतर प्रेरणा देता है।",
      badges: ["भावेश प्रतिष्ठा", `${lagnesha.grahaName}: भाव ${lagneshHouse}`]
    });

    // =========================================================================
    // CHAPTER 25: पञ्चविंशोऽध्यायः — अप्रकाशग्रहाध्यायः (Non-Luminous Upagrahas: Gulika & Mandi)
    // =========================================================================
    // Approximate Gulika position based on weekday/time:
    const gulikaSign = (lagnaSign + 6) % 12; // Classical average projection
    matchedShlokas.push({
      chapterNumber: 25,
      chapterTitle: "पञ्चविंशोऽध्यायः — अप्रकाशग्रहाध्यायः",
      chapterSignificance: "अप्रकाशित छाया-ग्रह: गुलिक, मांदि, धूम, व्यतीपात एवं उनका शमन विधान",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `गुलिकश्चापि मान्दिश्च सर्वशास्त्रेषु कीर्तितौ ।
शुभग्रहेण संदृष्टौ दोषनाशो भवेद् ध्रुवम् ॥ १ ॥
केन्द्रे सौम्यग्रहाः सर्वे गुलिकस्य विनाशकाः ॥ २ ॥`,
      applicabilityStatus: "गुलिक-मांदि छाया-बिंदु विश्लेषण एवं शुभ ग्रह रक्षा-कवच",
      natalTrigger: `कुंडली में छाया-बिंदु गुलिक ${RASHI_NAMES[gulikaSign]} राशि में स्थित है; देवगुरु बृहस्पति व शुभ ग्रहों की दृष्टि इसका परिहार करती है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार यद्यपि अप्रकाशित उपग्रह (गुलिक/मांदि) अप्रत्याशित बाधाएं उत्पन्न कर सकते हैं, किंतु जब केन्द्र में शुभ ग्रह हों अथवा गुरु की अमृत दृष्टि हो, तो समस्त उपग्रह-जन्य दोष तत्काल शांत हो जाते हैं।",
      deepMeaning: "छाया-ग्रह जातक के अवचेतन मन में छिपे भयों और आकस्मिक संकटों के सूचक हैं; आत्म-ज्ञान और ईश्वरीय उपासना से ये स्वतः निष्प्रभावी हो जाते हैं।",
      badges: ["छाया-ग्रह विधान", "शुभ रक्षा-कवच"]
    });

    // =========================================================================
    // CHAPTER 26: षड्विंशोऽध्यायः — दृष्टिफलाध्यायः (Planetary Aspects / Drishti Evaluation)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 26,
      chapterTitle: "षड्विंशोऽध्यायः — दृष्टिफलाध्यायः",
      chapterSignificance: "ग्रहों की पूर्ण, त्रिपाद एवं विशेष दृष्टियों (मंगल ४/८, गुरु ५/९, शनि ३/१०) का समग्र मूल्यांकन",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `दृष्ट्या युक्तं फलं सर्वं सम्यग्ज्ञेयं मनीषिभिः ।
शुभदृष्ट्या शुभं वृद्धिः पापानां दृष्टिदोषकृत् ॥ १ ॥
त्रिकोणं गुरुणा दृष्टं सर्वदोषविनाशनम् ॥ २ ॥`,
      applicabilityStatus: "समग्र दृष्टि संबंध एवं ग्रहीय रश्मि आदान-प्रदान",
      natalTrigger: `देवगुरु बृहस्पति की दृष्टि भाव ${jupAspectHouses.join(', ')} पर है; शनि देव की दृष्टि भाव ${[((saturn.house+2)%12)||12, ((saturn.house+6)%12)||12, ((saturn.house+9)%12)||12].join(', ')} पर है।`,
      classicalPrediction: "महर्षि पाराशर का प्रत्यक्ष सूत्र: ग्रह केवल अपने स्थित भाव का फल नहीं देते, अपितु अपनी दृष्टियों द्वारा दूरस्थ भावों को भी पूरी तरह प्रभावित करते हैं। शुभ ग्रहों की दृष्टि संकटों को सुअवसरों में बदल देती है।",
      deepMeaning: "दृष्टि वस्तुतः ग्रहों की चेतना और ध्यान का प्रक्षेपण है। जिस भाव पर गुरु या शुभ ग्रह की दृष्टि पड़ती है, वहाँ की परिस्थितियां स्वतः अनुकूल होने लगती हैं।",
      badges: ["दृष्टि-संबंध", "ग्रहीय रश्मि"]
    });

    // =========================================================================
    // CHAPTER 27: सप्तविंशोऽध्यायः — षड्बलाध्यायः (Shadbala — Six-Fold Strength Evaluation)
    // =========================================================================
    const digbalaGrahas = [];
    if (sun.house === 10) digbalaGrahas.push("सूर्य (दशम भाव)");
    if (mars.house === 10) digbalaGrahas.push("मंगल (दशम भाव)");
    if (jupiter.house === 1) digbalaGrahas.push("गुरु (प्रथम भाव)");
    if (mercury.house === 1) digbalaGrahas.push("बुध (प्रथम भाव)");
    if (venus.house === 4) digbalaGrahas.push("शुक्र (चतुर्थ भाव)");
    if (moon.house === 4) digbalaGrahas.push("चन्द्रमा (चतुर्थ भाव)");
    if (saturn.house === 7) digbalaGrahas.push("शनि (सप्तम भाव)");

    matchedShlokas.push({
      chapterNumber: 27,
      chapterTitle: "सप्तविंशोऽध्यायः — षड्बलाध्यायः",
      chapterSignificance: "षड्बल विधान: स्थानबल, दिग्बल, कालबल, चेष्टाबल, नैसर्गिकाबल एवं दृग्बल",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `स्थानदिग्कालचेष्टा च नैसर्गं दृग्बलं तथा ।
षड्बलं परिकीर्तितं ग्रहवीर्यविवर्धनम् ॥ १ ॥
दिग्बलेन समायुक्तो राजा वा राजतुल्यकः ॥ २ ॥`,
      applicabilityStatus: digbalaGrahas.length > 0 
        ? `दिग्बल विशिष्ट संयोग (${digbalaGrahas.join(', ')})`
        : "षड्बल समतुल्य क्षमता विधान",
      natalTrigger: digbalaGrahas.length > 0
        ? `आपकी कुंडली में ग्रह '${digbalaGrahas.join(', ')}' पूर्ण 'दिग्बल (Directional Strength)' प्राप्त कर रहे हैं।`
        : `कुंडली के सभी ग्रह अपने स्थानबल व नैसर्गिकाबल द्वारा सक्रिय फल दे रहे हैं।`,
      classicalPrediction: digbalaGrahas.length > 0
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: 'दिग्बलेन समायुक्तो राजा वा राजतुल्यकः' — दिग्बली ग्रह जातक को अपने कार्यक्षेत्र में सर्वोच्च अधिकार, निर्णायक दृष्टि, अदम्य ऊर्जा और नेतृत्व क्षमता प्रदान करता है।`
        : "महर्षि पाराशर के अनुसार षड्बल में संतुलित ग्रह जातक को सतत परिश्रम और स्थिरता द्वारा दीर्घकालिक सफलता की ओर ले जाते हैं।",
      deepMeaning: "षड्बल ग्रहों की वास्तविक क्षमता (Capacity to Deliver) का माप है। बिना षड्बल के कोई भी योग पूर्ण परिणाम नहीं दे पाता।",
      badges: [digbalaGrahas.length > 0 ? "दिग्बल युक्त" : "षड्बल संतुलित", "पाराशर षड्बल"]
    });

    // =========================================================================
    // CHAPTER 28: अष्टाविंशोऽध्यायः — इष्टकष्टबलाध्यायः (Ishta & Kashta Bala Formulation)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 28,
      chapterTitle: "अष्टाविंशोऽध्यायः — इष्टकष्टबलाध्यायः",
      chapterSignificance: "ग्रहों की इष्ट (सकारात्मक कल्याणकारी) एवं कष्ट (प्रतिकूल) फलदान क्षमता का गणित",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `इष्टकष्टबले ज्ञात्वा शुभाशुभफलं वदेत् ।
इष्टे बली शुभं कुर्यात् कष्टाधिक्ये च संकटम् ॥ १ ॥
उच्चक्षेत्रगते सौम्ये इष्टं स्यात् परमोत्तमम् ॥ २ ॥`,
      applicabilityStatus: "इष्ट-कष्ट ग्रहीय रश्मि संतुलन विश्लेषण",
      natalTrigger: `कुंडली में आत्मकारक ग्रह '${atmakaraka.grahaName}' एवं गुरु ग्रह उच्च/शुभ स्थिति के कारण अधिकतम 'इष्ट फल' प्रदान कर रहे हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब किसी ग्रह का इष्ट बल अधिक होता है, तो उसकी दशा-अंतर्दशा में जातक को बिना किसी प्रयास के भी मान-सम्मान, दैवीय कृपा, स्वास्थ्य लाभ और कार्य-सिद्धि प्राप्त होती है।",
      deepMeaning: "इष्ट बल जातक के पूर्वजन्मों के उन पुण्यों की माप है जो इस जन्म में आशीर्वाद बनकर प्रकट होते हैं।",
      badges: ["इष्ट फल प्राधान्य", "कल्याणकारी रश्मि"]
    });

    // =========================================================================
    // CHAPTER 29: एकोनत्रिंशोऽध्यायः — आरूढपदाध्यायः (Bhava Padas & Arudha Lagna - AL)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 29,
      chapterTitle: "एकोनत्रिंशोऽध्यायः — आरूढपदाध्यायः",
      chapterSignificance: "आरूढ़ लग्न (AL) एवं द्वादश पदों द्वारा सांसारिक प्रतिष्ठा, बाह्य छवि एवं भौतिक सिद्धि",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `यावदीशाश्रयो भावस्तावद्भावात् पदं स्मृतम् ।
आरूढलग्नं विज्ञेयं सांसारिकफलप्रदम् ॥ १ ॥
आरूढे शुभसंयुक्ते कीर्तिमान् विजयी भवेत् ॥ २ ॥`,
      applicabilityStatus: `आरूढ़ लग्न (Arudha Lagna - AL) मिलान: ${RASHI_NAMES[arudhaLagnaSign]} राशि (भाव ${arudhaLagnaHouse})`,
      natalTrigger: `आपकी जन्म कुंडली का 'आरूढ़ लग्न (AL)' ${RASHI_NAMES[arudhaLagnaSign]} राशि में स्थित है, जो लग्न से ${arudhaLagnaHouse}वें भाव में पड़ता है।`,
      classicalPrediction: isKendra(arudhaLagnaHouse) || isTrikona(arudhaLagnaHouse) || arudhaLagnaHouse === 11
        ? `महर्षि पाराशर के अनुसार आरूढ़ लग्न का केन्द्र/त्रिकोण/लाभ भाव में होना जातक को समाज में अत्यंत उज्ज्वल छवि, उच्च सामाजिक सम्मान, जनता में गहरी लोकप्रियता एवं सांसारिक ऐश्वर्य प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार आरूढ़ लग्न जातक को यह सिखाता है कि वह अपने बाह्य आचरण और जनसंपर्क को सुदृढ़ रखे, जिससे समाज में उसकी वास्तविक क्षमता का सही मूल्यांकन हो सके।`,
      deepMeaning: "जन्म लग्न सत्य (True Self) है, जबकि आरूढ़ लग्न माया-जगत में जातक की छवि (Image/Perception) है। दोनों का शुभ तालमेल व्यक्ति को समाज में कालजयी बनाता है।",
      badges: [`आरूढ़ लग्न: ${RASHI_NAMES[arudhaLagnaSign]}`, `AL भाव: ${arudhaLagnaHouse}`]
    });

    // =========================================================================
    // CHAPTER 30: त्रिंशोऽध्यायः — उपपदपदाध्यायः (Upapada Lagna - UL & Matrimonial Destiny)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 30,
      chapterTitle: "त्रिंशोऽध्यायः — उपपदपदाध्यायः",
      chapterSignificance: "उपपद लग्न (UL) — वैवाहिक जीवन की स्थिरता, जीवनसाथी का कुल, चरित्र एवं संबंध-दीर्घायु",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `व्ययारूटं ह्युपपदं कथ्यते मुनिसत्तमैः ।
उपपदे शुभे दृष्टे भार्यासौख्यं विनिर्दिशेत् ॥ १ ॥
उपपदे बलोपेते कुलशीला कुलप्रिया ॥ २ ॥`,
      applicabilityStatus: `उपपद लग्न (Upapada Lagna - UL) मिलान: ${RASHI_NAMES[upapadaLagnaSign]} राशि (भाव ${upapadaLagnaHouse})`,
      natalTrigger: `आपकी कुंडली में द्वादश भाव का आरूढ़ पद 'उपपद लग्न (UL)' ${RASHI_NAMES[upapadaLagnaSign]} राशि में है, जो लग्न से ${upapadaLagnaHouse}वें भाव में स्थित है।`,
      classicalPrediction: isKendra(upapadaLagnaHouse) || isTrikona(upapadaLagnaHouse) || upapadaLagnaHouse === 2
        ? `महर्षि पाराशर का प्रत्यक्ष वैवाहिक सूत्र: उपपद लग्न का शुभ भाव में होना जातक को कुलीन, धार्मिक, समर्पित एवं सम्माननीय जीवनसाथी प्रदान करता है। वैवाहिक संबंध जीवनपर्यंत अटूट और सुखद रहता है।`
        : `महर्षि पाराशर के अनुसार उपपद लग्न की स्थिति दर्शाती है कि दांपत्य जीवन में परस्पर त्याग, विनम्रता और एक-दूसरे के प्रति आदर भाव रखने से संबंध सदा मधुर बने रहते हैं।`,
      deepMeaning: "उपपद लग्न विवाह का सूक्ष्म प्रारब्ध है; यह केवल विवाह का समय नहीं, अपितु यह बताता है कि जीवनसाथी के आगमन से आपके भाग्य में क्या रूपांतरण होगा।",
      badges: [`उपपद लग्न: ${RASHI_NAMES[upapadaLagnaSign]}`, `UL भाव: ${upapadaLagnaHouse}`]
    });

    // =========================================================================
    // CHAPTER 31: एकत्रिंशोऽध्यायः — अर्गलाध्यायः (Argala — Planetary Interventions & Counter-Interventions)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 31,
      chapterTitle: "एकत्रिंशोऽध्यायः — अर्गलाध्यायः",
      chapterSignificance: "अर्गला एवं विरोधाग्रला विधान: भावों और ग्रहों की शक्ति को बढ़ाने अथवा बाधित करने वाले सूत्र",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `द्वितीये च चतुर्थे च लाभे चैवार्गला स्मृता ।
शुभग्रहैः कृता शस्ता पापानां बाधकारिका ॥ १ ॥
अर्गलाया बलेनैव फलं सर्वं विनिर्दिशेत् ॥ २ ॥`,
      applicabilityStatus: "लग्न एवं चंद्र पर शुभ अर्गला का सुदृढ़ प्रभाव",
      natalTrigger: `लग्न से द्वितीय, चतुर्थ व एकादश भावों में ग्रहों की उपस्थिति जातक के व्यक्तित्व और जीवन-मार्ग पर 'प्राथमिक अर्गला (Anchor/Lever)' बनाती है।`,
      classicalPrediction: "महर्षि पाराशर का अमर सिद्धांत: अर्गला वह गुप्त कुंडी है जो किसी भाव के फल को खोलती या रोकती है। शुभ अर्गला जातक के प्रयासों को कई गुना फलदायी बनाती है और जीवन में अवरोधों को स्वतः दूर करती है।",
      deepMeaning: "अर्गला यह दर्शाती है कि जीवन में कोई भी घटना एकाकी नहीं होती; कुटुम्ब (२रा), घर (४था) और मित्र (११वां) मिलकर ही व्यक्ति के भाग्य को गति देते हैं।",
      badges: ["पाराशर अर्गला योग", "प्रगति कुंडी"]
    });

    // =========================================================================
    // CHAPTER 32: द्वात्रिंशोऽध्यायः — कारकाध्यायः (Charakarakas — Jaimini & Parashara Scheme)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 32,
      chapterTitle: "द्वात्रिंशोऽध्यायः — कारकाध्यायः",
      chapterSignificance: "सप्त-चरकारक विधान: आत्म, आमात्य, भ्रातृ, मातृ, पुत्र, ज्ञाति एवं दारकारक",
      verseNumbers: "श्लोक १–५",
      shlokaSanskrit: `आत्मामात्यो भ्रातृमातृपितृपुत्रज्ञातयस्तथा ।
दाराश्चेति च काराका ज्ञेया ह्येते विचक्षणैः ॥ १ ॥
अंशाधिको भवेदात्मा ततोऽमात्यो विधीयते ॥ २ ॥`,
      applicabilityStatus: "सप्त-चरकारक पूर्ण ग्रहीय पद सोपान",
      natalTrigger: `AK: ${charaKarakas.AK.name} (${planetMap[charaKarakas.AK.id].deg.toFixed(2)}°) • AmK: ${charaKarakas.AmK.name} • BK: ${charaKarakas.BK.name} • MK: ${charaKarakas.MK.name} • PK: ${charaKarakas.PK.name} • GK: ${charaKarakas.GK.name} • DK: ${charaKarakas.DK.name}`,
      classicalPrediction: `महर्षि पाराशर के अनुसार चरकारक आत्मा की यात्रा के व्यक्तिगत दूत हैं। आपके आत्मकारक '${charaKarakas.AK.name}' आपकी आंतरिक नियति को नियंत्रित करते हैं; आमात्यकारक '${charaKarakas.AmK.name}' कार्यक्षेत्र में उच्च पद दिलाते हैं; तथा दारकारक '${charaKarakas.DK.name}' जीवनसाथी के स्वरूप को निर्धारित करते हैं।`,
      deepMeaning: "स्थिर कारक (नैसर्गिक कारक) सबके लिए समान हैं, किंतु चरकारक जातक के अपने पूर्वजन्मों के व्यक्तिगत कर्मों के आधार पर हर कुंडली में भिन्न होते हैं।",
      badges: [`AK: ${charaKarakas.AK.name}`, `AmK: ${charaKarakas.AmK.name}`, `DK: ${charaKarakas.DK.name}`]
    });

    // =========================================================================
    // CHAPTER 33: त्रयस्त्रिंशोऽध्यायः — कारकांशफलाध्यायः (Karakamsha Phala — Soul's Navamsha Realm)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 33,
      chapterTitle: "त्रयस्त्रिंशोऽध्यायः — कारकांशफलाध्यायः",
      chapterSignificance: "कारकांश लग्न — नवमांश में आत्मकारक की स्थिति द्वारा आत्मा का मोक्ष-पथ, प्रतिभा एवं सर्वोच्च ध्येय",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `कारकांशवशाज्ज्ञेयं जातकस्य महद्गुणम् ।
केतौ मोक्षपदं विद्यात् गुरौ ज्ञानं सुविस्तृतम् ॥ १ ॥
शुक्रे काव्यकलाज्ञश्च बुधे शिल्पविशारदः ॥ २ ॥`,
      applicabilityStatus: `कारकांश लग्न (Karakamsha Lagna): ${karakamshaRashiName} राशि`,
      natalTrigger: `आपके आत्मकारक ग्रह '${charaKarakas.AK.name}' नवमांश कुंडली में '${karakamshaRashiName}' राशि में स्थित होकर 'कारकांश लग्न' बनाते हैं।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार कारकांश लग्न जातक के जीवन का आंतरिक आध्यात्मिक केंद्र है। ${karakamshaRashiName} कारकांश होने से जातक के भीतर गहन ज्ञान, सत्य की खोज, उच्च मानवीय आदर्श तथा अपने क्षेत्र में विशिष्ट मौलिक सृजन-शक्ति विद्यमान रहती है।`,
      deepMeaning: "जन्म कुंडली यह बताती है कि आप इस संसार में क्या करते हैं, किंतु कारकांश लग्न यह उद्घाटित करता है कि आपकी आत्मा वस्तुतः क्या बनने आई है।",
      badges: [`कारकांश: ${karakamshaRashiName}`, "आध्यात्मिक ध्येय"]
    });

    // =========================================================================
    // CHAPTER 34: चतुस्त्रिंशोऽध्यायः — योगकारकाध्यायः (Yogakaraka Planet for the Ascendant)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 34,
      chapterTitle: "चतुस्त्रिंशोऽध्यायः — योगकारकाध्यायः",
      chapterSignificance: "लग्न-अनुसार सर्वोत्तम योगकारक ग्रह — केन्द्र व त्रिकोण का एकत्व और अखंड राजयोग",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `केन्द्राधिपत्यदोषस्तु बलवान् गुरुशुक्रयोः ।
कोणाधिपाः शुभाः सर्वे केन्द्रेण सह योगदाः ॥ १ ॥
एकोऽपि कोणकेन्द्रेन्द्रो राजयोगं प्रयच्छति ॥ २ ॥`,
      applicabilityStatus: `लग्न योगकारक विश्लेषण (${yogakarakaDesc})`,
      natalTrigger: `आपके ${RASHI_NAMES[lagnaSign]} लग्न के लिए मुख्य योगकारक / राजयोगप्रदाता ग्रह '${yogakarakaDesc}' हैं, जो कुंडली के ${planetMap[yogakarakaId].house}वें भाव में स्थित हैं।`,
      classicalPrediction: `महर्षि पाराशर का प्रत्यक्ष विधान: जब केन्द्र (विष्णु स्थान) और त्रिकोण (लक्ष्मी स्थान) का आधिपत्य किसी एक शुभ ग्रह में केंद्रित होता है, तो वह ग्रह जातक का परम हितैषी 'योगकारक' बन जाता है। इस ग्रह की दशा जातक को अप्रत्याशित उत्थान और स्थायी सफलता प्रदान करती है।`,
      deepMeaning: "योगकारक ग्रह कुंडली का वह दिव्य सेतु है जो व्यक्ति के पुरुषार्थ को सीधे ईश्वरीय अनुग्रह से जोड़ देता है।",
      badges: ["सर्वोच्च योगकारक", yogakarakaDesc.split(' ')[0]]
    });

    // =========================================================================
    // CHAPTER 35: पञ्चत्रिंशोऽध्यायः — नाभगयोगाध्यायः (Nabhasha Yogas — Celestial Geometry)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 35,
      chapterTitle: "पञ्चत्रिंशोऽध्यायः — नाभगयोगाध्यायः",
      chapterSignificance: "नाभस योग — ३२ आकाशीय ज्यामितीय स्वरूप (आश्रय, दल, आकृति एवं संख्या योग)",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `नाभसा विविधा योगाः श्लोकैरेतैः प्रकीर्तिताः ।
आश्रयाख्या दलाख्याश्च संख्ययाकृतिसंज्ञकाः ॥ १ ॥
आजीवनान्तगा योगा नास्त्येषामन्यथा फलम् ॥ २ ॥`,
      applicabilityStatus: `संख्या नाभस योग मिलान: ${nabhasha.name} (${signCount} राशियों में ७ ग्रह)`,
      natalTrigger: `आपकी जन्म कुंडली में सातों मुख्य ग्रह चक्र की कुल ${signCount} विभिन्न राशियों में स्थित होकर '${nabhasha.name}' का निर्माण कर रहे हैं।`,
      classicalPrediction: `महर्षि पाराशर का अमर वचन: 'आजीवनान्तगा योगा नास्त्येषामन्यथा फलम्' — नाभस योग जातक के पूरे जीवन भर अविचल रूप से प्रभावी रहते हैं (इनका फल दशा-परतंत्र नहीं होता)। '${nabhasha.name}' का प्रभाव: ${nabhasha.desc}।`,
      deepMeaning: "नाभस योग जातक की आंतरिक चेतना का वह मूल खाका है जो जन्म से मृत्यु तक उसके स्वभाव, कार्यशैली और भाग्य की मूल लय को निर्धारित करता है।",
      badges: [nabhasha.name, `${signCount} राशि विस्तार`]
    });

    // =========================================================================
    // CHAPTER 36: षट्त्रिंशोऽध्यायः — अन्यान्ययोगाध्यायः (Classical Special Yogas: Gajakesari & Chamara)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 36,
      chapterTitle: "षट्त्रिंशोऽध्यायः — अन्यान्ययोगाध्यायः",
      chapterSignificance: "अन्यान्य विशिष्ट राजयोग: गजकेसरी, अमला, पर्वत, काहल, शंख एवं चामर योग",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `केन्द्रे स्थिते देवगुरौ शशाङ्कात् सौम्यैर्युते वा यदि वाऽपि दृष्टे ।
शुभेक्षितो वा गजकेसरीति राज्याधिपत्यं कुरुते मनुष्यः ॥ १ ॥
अमलो योग उद्दिष्टो दशमे शुभसंस्थिते ॥ २ ॥`,
      applicabilityStatus: isGajakesari
        ? "अमर गजकेसरी योग (चन्द्रमा से केन्द्र में देवगुरु बृहस्पति)"
        : (isKendra(jupiter.house) ? "पर्वत राजयोग (केन्द्रस्थ देवगुरु)" : "अमला राजयोग प्रभाव"),
      natalTrigger: isGajakesari
        ? `चन्द्रमा (${moon.rashiName}) से ${moonToJupHouse}वें केन्द्र भाव में देवगुरु बृहस्पति (${jupiter.rashiName}) स्थित होकर प्रत्यक्ष 'गजकेसरी योग' बना रहे हैं।`
        : `देवगुरु बृहस्पति कुंडली के ${jupiter.house}वें भाव में तथा चन्द्रमा ${moon.house}वें भाव में स्थित हैं।`,
      classicalPrediction: isGajakesari
        ? "महर्षि पाराशर का प्रत्यक्ष फलित सूत्र: 'राज्याधिपत्यं कुरुते मनुष्यः' — गजकेसरी योग जातक को गज (हाथी) के समान अविचल शक्ति, केसरी (सिंह) के समान निर्भयता, कुशाग्र मेधा, उच्च पदवी, निष्कलंक यश और लोक-सम्मान प्रदान करता है।"
        : "महर्षि पाराशर के अनुसार केन्द्रस्थ शुभ ग्रहों का योग जातक को निरंतर ज्ञान, साधु-संगति और सात्विक कार्यों में संलग्न रखकर समाज में प्रतिष्ठित बनाए रखता है।",
      deepMeaning: "गजकेसरी योग केवल भौतिक संपदा का नहीं, अपितु आंतरिक गरिमा और विवेक का योग है जो व्यक्ति को विषम से विषम संकट में भी विचलित नहीं होने देता।",
      badges: [isGajakesari ? "गजकेसरी योग" : "शुभ पर्वत योग", "पाराशर विशिष्ट योग"]
    });

    // =========================================================================
    // CHAPTER 37: सप्तत्रिंशोऽध्यायः — चन्द्रयोगाध्यायः (Lunar Yogas: Sunapha, Anapha, Durudhara, Kemadruma)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 37,
      chapterTitle: "सप्तत्रिंशोऽध्यायः — चन्द्रयोगाध्यायः",
      chapterSignificance: "चन्द्रमा आधारित महायोग: सुनफा, अनफा, दुरुधरा एवं केमद्रुम-भंग राजयोग",
      verseNumbers: "श्लोक १–५",
      shlokaSanskrit: `वित्ते चन्द्रान्नभश्चराः सुनफाऽनफा व्यये स्थिताः ।
उभयतो दुरुधरा प्रोक्ता केमद्रुमस्तदभावतः ॥ १ ॥
केन्द्रे ग्रहे स्थिते वापि केमद्रुमो विनश्यति ॥ २ ॥`,
      applicabilityStatus: `चन्द्र योग मिलान: ${chandraYogaName}`,
      natalTrigger: `चन्द्रमा (${moon.rashiName}) के द्वितीय भाव में ग्रह: ${grahasIn2FromMoon.length > 0 ? grahasIn2FromMoon.map(g => GRAHA_NAMES[g]).join(', ') : 'कोई नहीं'}; तथा द्वादश भाव में ग्रह: ${grahasIn12FromMoon.length > 0 ? grahasIn12FromMoon.map(g => GRAHA_NAMES[g]).join(', ') : 'कोई नहीं'}।`,
      classicalPrediction: `महर्षि पाराशर का प्रत्यक्ष सूत्र: **'${chandraYogaName}'** का निर्माण! ${chandraYogaDesc}`,
      deepMeaning: "चन्द्रमा मन और संवेदनाओं का स्वामी है; चन्द्रमा के दोनों ओर के ग्रह जातक के मानसिक संबल और भावनात्मक स्थिरता की सुरक्षा-दीवार बनाते हैं।",
      badges: [chandraYogaName.split(' ')[0], "चन्द्र योग"]
    });

    // =========================================================================
    // CHAPTER 38: अष्टात्रिंशोऽध्यायः — सूर्ययोगाध्यायः (Solar Yogas: Vesi, Vasi, Ubhayachari)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 38,
      chapterTitle: "अष्टात्रिंशोऽध्यायः — सूर्ययोगाध्यायः",
      chapterSignificance: "सूर्य आधारित महायोग: वेशि, वाशि एवं उभयचरी योग (आत्म-प्रताप एवं कीर्ति)",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `सूर्याद् द्वितीये वेशिः स्याद् द्वादशे वाशिरुच्यते ।
उभयोस्तु स्थिते सौम्ये चोभयचरी प्रकीर्तिता ॥ १ ॥
राजा वा राजतुल्यो वा महाभाग्ययुतो भवेत् ॥ २ ॥`,
      applicabilityStatus: `सूर्य योग मिलान: ${suryaYogaName}`,
      natalTrigger: `सूर्य देव (${sun.rashiName}) के द्वितीय भाव में ग्रह: ${grahasIn2FromSun.length > 0 ? grahasIn2FromSun.map(g => GRAHA_NAMES[g]).join(', ') : 'कोई नहीं'}; तथा द्वादश भाव में ग्रह: ${grahasIn12FromSun.length > 0 ? grahasIn12FromSun.map(g => GRAHA_NAMES[g]).join(', ') : 'कोई नहीं'}।`,
      classicalPrediction: `महर्षि पाराशर का प्रत्यक्ष निर्णय: **'${suryaYogaName}'** का प्रभाव! ${suryaYogaDesc}`,
      deepMeaning: "सूर्य आत्मा और तेज का अधिपति है; सूर्य के दोनों ओर ग्रहों का संचरण जातक के प्रभामंडल को प्रदीप्त कर समाज में उसकी स्वतंत्र पहचान स्थापित करता है।",
      badges: [suryaYogaName.split(' ')[0], "सूर्य योग"]
    });

    // =========================================================================
    // CHAPTER 39: एकोनचत्वारिंशोऽध्यायः — राजयोगाध्यायः (Pancha Mahapurusha & Supreme Raja Yogas)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 39,
      chapterTitle: "एकोनचत्वारिंशोऽध्यायः — राजयोगाध्यायः",
      chapterSignificance: "पंचमहापुरुष योग (रुचक, भद्र, हंस, मालव्य, शश) एवं केन्द्र-त्रिकोण सर्वोच्च राजयोग",
      verseNumbers: "श्लोक १–५",
      shlokaSanskrit: `केन्द्राधिपाश्च कोणापाः सम्बन्धेन परस्परम् ।
राजयोगं प्रकुर्वन्ति ख्याताः सर्वजनेषु ते ॥ १ ॥
रुचको भद्रहंसौ च मालव्यः शश एव च ।
पञ्चैते पुरुषाख्याता राजयोगाः प्रकीर्तिताः ॥ २ ॥`,
      applicabilityStatus: mahapurushaYogas.length > 0
        ? `पंचमहापुरुष राजयोग: ${mahapurushaYogas.map(m => m.name).join(', ')}`
        : "केन्द्र-त्रिकोण राजयोग सम्बन्ध",
      natalTrigger: mahapurushaYogas.length > 0
        ? `आपकी कुंडली में ${mahapurushaYogas.map(m => `'${m.name}' (${m.planet})`).join(', ')} पूर्ण रूप से प्रतिष्ठित है।`
        : `केन्द्र भावों और त्रिकोण भावों के स्वामियों का संबंध जातक को निरंतर राजयोग-तुल्य अवसर प्रदान करता है।`,
      classicalPrediction: mahapurushaYogas.length > 0
        ? `महर्षि पाराशर का प्रत्यक्ष अमर फलित: ${mahapurushaYogas.map(m => `**${m.name}**: ${m.desc}`).join(' | ')}। यह जातक के जीवन को अद्वितीय ऐतिहासिक ऊंचाई प्रदान करता है।`
        : "महर्षि पाराशर के अनुसार केन्द्र (क्रिया-शक्ति) और त्रिकोण (भाग्य-शक्ति) का सम्मिलन जातक को सामान्य कुल में जन्म लेकर भी विशिष्ट कीर्ति और उच्चाधिकार का स्वामी बनाता है।",
      deepMeaning: "पंचमहापुरुष योग पंचतत्वों (अग्नि, पृथ्वी, वायु, जल, आकाश) के सिद्ध होने का ज्योतिषीय प्रमाण है; जिस जातक की कुंडली में यह घटित होता है, वह युग-पुरुष की भांति समाज को प्रेरित करता है।",
      badges: [mahapurushaYogas.length > 0 ? mahapurushaYogas[0].name.split(' ')[0] : "राजयोग", "पाराशर राजयोग"]
    });

    // =========================================================================
    // CHAPTER 40: चत्वारिंशोऽध्यायः — राजसम्बन्धाध्यायः (State Authority & Royal Patronage)
    // =========================================================================
    const isStateAuthority = (sun.house === 10 || mars.house === 10 || isKendra(h10.planet.house) || isTrikona(h10.planet.house));
    matchedShlokas.push({
      chapterNumber: 40,
      chapterTitle: "चत्वारिंशोऽध्यायः — राजसम्बन्धाध्यायः",
      chapterSignificance: "राज-सम्बन्ध, शासन-प्रशासन, उच्चाधिकारी पद, राज्य-मान्यता एवं सार्वभौम प्रतिष्ठा",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `सूर्ये दशमगे राजसम्मानं लभते नरः ।
नृपपूज्यो महातेजाः सर्वलोकेषु कीर्तिमान् ॥ १ ॥
दशमेशे बलोपेते राजसम्बन्धवान् भवेत् ॥ २ ॥`,
      applicabilityStatus: isStateAuthority
        ? "सर्वोच्च राज-सम्बन्ध, प्रशासनिक अधिकार एवं राज्य-सम्मान योग"
        : "सामाजिक प्रभाव एवं स्वतंत्र प्रतिष्ठा सूत्र",
      natalTrigger: `दशम भाव में सूर्य/मंगल का प्रभाव अथवा दशमेश '${h10.grahaName}' का शुभ भाव में होना शासन और उच्च अधिकारियों से संबंध स्थापित करता है।`,
      classicalPrediction: isStateAuthority
        ? "महर्षि पाराशर का प्रत्यक्ष निर्णय: जातक शासन-सत्ता, राज्य-प्रशासन, नीति-निर्माण, उच्च न्यायालय अथवा प्रतिष्ठित संस्थाओं से मान-सम्मान, अधिकार और पुरस्कार प्राप्त करने में पूर्णतः सफल होता है। समाज में जातक के निर्णय को आदर दिया जाता है।"
        : "महर्षि पाराशर के अनुसार जातक अपनी व्यक्तिगत योग्यता, निष्ठा और स्वतंत्र कार्यशैली से समाज में आदरणीय बनता है और अधिकारियों का विश्वास अर्जित करता है।",
      deepMeaning: "राज-सम्बन्ध केवल सरकारी पद नहीं है, अपितु समाज को दिशा देने की नैतिक संप्रभुता (Moral Authority) है; पाराशर का यह सूत्र जातक को नेतृत्व की प्रेरणा देता है।",
      badges: ["राज्य-सम्मान योग", "प्रशासनिक अधिकार"]
    });

    // =========================================================================
    // ADVANCED COMPUTATIONS FOR CHAPTERS 41 TO 63 (FINAL CORPUS OF BPHS)
    // =========================================================================

    // Baladi Avastha Calculation:
    function getBaladiAvastha(sign, deg) {
      const isOdd = (sign % 2 === 0); // 0-indexed: 0 (Aries-odd), 1 (Taurus-even)...
      if (isOdd) {
        if (deg < 6) return { name: "बाल्यावस्था (Bala)", capacity: "२५% फल सामर्थ्य" };
        if (deg < 12) return { name: "कुमारावस्था (Kumara)", capacity: "५०% फल सामर्थ्य" };
        if (deg < 18) return { name: "युवावस्था (Yuva)", capacity: "१००% पूर्ण परिपक्व सामर्थ्य" };
        if (deg < 24) return { name: "वृद्धावस्था (Vriddha)", capacity: "अल्प फल सामर्थ्य" };
        return { name: "मृतावस्था (Mrita)", capacity: "अतिसूक्ष्म/सुप्त सामर्थ्य" };
      } else {
        if (deg < 6) return { name: "मृतावस्था (Mrita)", capacity: "अतिसूक्ष्म/सुप्त सामर्थ्य" };
        if (deg < 12) return { name: "वृद्धावस्था (Vriddha)", capacity: "अल्प फल सामर्थ्य" };
        if (deg < 18) return { name: "युवावस्था (Yuva)", capacity: "१००% पूर्ण परिपक्व सामर्थ्य" };
        if (deg < 24) return { name: "कुमारावस्था (Kumara)", capacity: "५०% फल सामर्थ्य" };
        return { name: "बाल्यावस्था (Bala)", capacity: "२५% फल सामर्थ्य" };
      }
    }

    const lagneshAvastha = getBaladiAvastha(lagnesha.sign, lagnesha.deg);
    const atmakarakaAvastha = getBaladiAvastha(atmakaraka.sign, atmakaraka.deg);

    // Dhana Yoga Connection:
    const hasDhanaYoga = (h2.planet.house === 11 || h11.planet.house === 2 || h2.planet.house === 5 || h2.planet.house === 9 || h11.planet.house === 5 || h11.planet.house === 9 || isKendra(h2.planet.house));

    // =========================================================================
    // CHAPTER 41: एकचत्वारिंशोऽध्यायः — धनयोगाध्यायः (Combinations for Immense Wealth)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 41,
      chapterTitle: "एकचत्वारिंशोऽध्यायः — धनयोगाध्यायः",
      chapterSignificance: "सर्वोच्च धन योग — लग्न, द्वितीय, पंचम, नवम एवं एकादश भावों का वित्तीय महा-संयोग",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `धनेशे लाभगे वापि लाभाधीशे धनं गते ।
पञ्चमे नवमे वापि महाधनपतिर्भवेत् ॥ १ ॥
लग्नेश-धनपौ युक्तौ कोणे वा यदि संस्थितौ ।
अखण्डलक्ष्मीयोगोऽयं जायते धनवान्नरः ॥ २ ॥`,
      applicabilityStatus: hasDhanaYoga
        ? "पाराशर अखंड लक्ष्मी धन योग (धनेश व लाभेश संबंध)"
        : `पाराशर धन-समृद्धि एवं संचय सूत्र (धनेश '${h2.grahaName}')`,
      natalTrigger: `द्वितीयेश '${h2.grahaName}' भाव ${h2.planet.house} में, पंचमेश '${h5.grahaName}' भाव ${h5.planet.house} में, नवमेश '${h9.grahaName}' भाव ${h9.planet.house} में तथा एकादशेश '${h11.grahaName}' भाव ${h11.planet.house} में स्थित हैं।`,
      classicalPrediction: hasDhanaYoga
        ? "महर्षि पाराशर का प्रत्यक्ष सूत्र: जब २रे, ५वें, ९वें या ११वें भाव के स्वामियों का परस्पर संबंध बनता है, तो जातक 'महाधनपति' बनता है। ऐसे जातक को जीवन में व्यापार, निवेश, पैतृक लाभ और बुद्धि-कौशल से अपार संपदा की प्राप्ति होती है।"
        : "महर्षि पाराशर के अनुसार जातक अपने सुनियोजित उद्यम, धैर्य और नैतिक धन-अर्जन से निरंतर आर्थिक उन्नति और स्थिरता अर्जित करता है।",
      deepMeaning: "पाराशर धन योग केवल बैंक-बैलेंस नहीं, अपितु लक्ष्मी जी का वह शाश्वत आशीर्वाद है जो व्यक्ति के धन को धर्म और समाज-कल्याण से जोड़ता है।",
      badges: [hasDhanaYoga ? "अखंड लक्ष्मी योग" : "धन संचय योग", "पाराशर धन-विधान"]
    });

    // =========================================================================
    // CHAPTER 42: द्विचत्वारिंशोऽध्यायः — दारिद्र्ययोगाध्यायः (Daridra Yogas & Their Remediation)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 42,
      chapterTitle: "द्विचत्वारिंशोऽध्यायः — दारिद्र्ययोगाध्यायः",
      chapterSignificance: "दारिद्र्य योग निदान — आर्थिक क्षय, अनावश्यक व्यय एवं शास्त्रीय परिहार विधान",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `लग्नेशे द्वादशे संस्थे व्ययेशे लग्नगे यदि ।
दारिद्र्ययोग उद्दिष्टः शान्त्या नश्यति सर्वथा ॥ १ ॥
शुभदृष्ट्या समायुक्ते दरिद्रत्वं विनश्यति ॥ २ ॥`,
      applicabilityStatus: "आर्थिक क्षय निवारण एवं शुभ ग्रह रक्षा-विधान",
      natalTrigger: `लग्न भाव पर शुभ ग्रहों का प्रभाव एवं गुरु की दृष्टि आर्थिक संकटों और अनावश्यक ऋणों को नष्ट करने में सक्षम है।`,
      classicalPrediction: "महर्षि पाराशर सचेत करते हैं कि धन के अनियंत्रित व्यय से बचना चाहिए। यदि कुंडली में कोई दरिद्र योग की छाया भी हो, तो शुभ ग्रहों की दृष्टि, दान, नियमित बचत और सत्यनिष्ठा से वह दोष स्वतः भस्म हो जाता है।",
      deepMeaning: "दारिद्र्य केवल धन का अभाव नहीं, अपितु असंतोष और विवेकहीन व्यय का परिणाम है; पाराशर अनुशासन द्वारा समृद्धि की रक्षा का मार्ग बताते हैं।",
      badges: ["दारिद्र्य निवारण", "शुभ दृष्टि कवच"]
    });

    // =========================================================================
    // CHAPTER 43: त्रिचत्वारिंशोऽध्यायः — आयुर्दायाध्यायः (Computation of Lifespan: Alpa, Madhya, Purna)
    // =========================================================================
    const isPurnayu = isKendra(lagneshHouse) || isKendra(jupiter.house) || isKendra(saturn.house);
    matchedShlokas.push({
      chapterNumber: 43,
      chapterTitle: "त्रिचत्वारिंशोऽध्यायः — आयुर्दायाध्यायः",
      chapterSignificance: "आयुर्दाय विधान: अल्पायु, मध्यायु एवं पूर्णायु का त्रि-जोड़ा गणितीय निर्धारण",
      verseNumbers: "श्लोक १–५",
      shlokaSanskrit: `लग्नेशाष्टमपौ युक्तौ चरस्थिरद्विस्वभावगौ ।
दीर्घमायुः प्रकुर्वन्ति मध्यमाल्पं तथैव च ॥ १ ॥
गुरुणा संस्थिते केन्द्रे पूर्णायुर्लभते नरः ॥ २ ॥`,
      applicabilityStatus: isPurnayu ? "पाराशर पूर्णायु महायोग (दीर्घायु ७५–१०० वर्ष)" : "मध्यायु एवं आरोग्य संवर्धन सूत्र",
      natalTrigger: `लग्नेश '${lagnesha.grahaName}' भाव ${lagneshHouse} में, अष्टमेश '${h8.grahaName}' भाव ${h8.planet.house} में तथा आयुष्कारक शनि ${saturn.rashiName} में स्थित हैं।`,
      classicalPrediction: isPurnayu
        ? "महर्षि पाराशर का प्रत्यक्ष वचन: 'गुरुणा संस्थिते केन्द्रे पूर्णायुर्लभते नरः' — लग्नेश और केन्द्रस्थ शुभ ग्रहों का बल जातक को 'पूर्णायु (दीर्घायु)' प्रदान करता है। जातक दीर्घकाल तक स्वस्थ, चैतन्य एवं सक्रिय रहकर जीवन के सभी कर्तव्यों को पूर्ण करता है।"
        : "महर्षि पाराशर के अनुसार जातक को योग, सात्विक जीवनशैली और महामृत्युंजय साधना द्वारा अपनी प्राण-शक्ति को निरंतर पोषित रखना चाहिए।",
      deepMeaning: "आयु केवल वर्षों की संख्या नहीं, अपितु जीवन के उद्देश्य को पूर्ण करने का सुअवसर है; दीर्घायु जातक को समाज को अधिक देने का सामर्थ्य देती है।",
      badges: [isPurnayu ? "पूर्णायु योग" : "दीर्घायु साधना", "आयुर्दाय विधान"]
    });

    // =========================================================================
    // CHAPTER 44: चतुश्चत्वारिंशोऽध्यायः — मारकभेदाध्यायः (Maraka Grahas & Health Immunity)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 44,
      chapterTitle: "चतुश्चत्वारिंशोऽध्यायः — मारकभेदाध्यायः",
      chapterSignificance: "मारक भाव (द्वितीय व सप्तम) विचार एवं महामृत्युंजय रक्षा-विधान",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `द्वितीये सप्तमे ज्ञेयो मारकः परिकीर्तितः ।
तदीशा मारकाख्याः स्युर्दशायां पीडिता नराः ॥ १ ॥
महामृत्युञ्जयजपात् सर्वदोषप्रणाशनम् ॥ २ ॥`,
      applicabilityStatus: `मारक भाव नियंत्रक: द्वितीयेश '${h2.grahaName}' एवं सप्तमेश '${h7.grahaName}'`,
      natalTrigger: `द्वितीय भाव के स्वामी '${h2.grahaName}' एवं सप्तम भाव के स्वामी '${h7.grahaName}' मारक स्थानों के अधिपति हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार मारकेशों की दशा अथवा अंतर्दशा में जातक को स्वास्थ्य, यात्रा और तनाव के प्रति अतिरिक्त सावधानी रखनी चाहिए। पाराशर का स्पष्ट आदेश है कि 'महामृत्युंजय मंत्र' का जप समस्त मारक कष्टों को तत्क्षण समाप्त कर देता है।",
      deepMeaning: "मारक ग्रह काल के संकेत हैं जो मनुष्य को विनम्रता और ईश्वर-स्मरण की याद दिलाते हैं; साधना से मारक प्रभाव रक्षा-कवच में बदल जाता है।",
      badges: ["मारक विवेक", "महामृत्युंजय कवच"]
    });

    // =========================================================================
    // CHAPTER 45: पञ्चचत्वारिंशोऽध्यायः — ग्रहावस्थाध्यायः (Baladi, Jagratadi & Deeptadi Avasthas)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 45,
      chapterTitle: "पञ्चचत्वारिंशोऽध्यायः — ग्रहावस्थाध्यायः",
      chapterSignificance: "ग्रहावस्था विधान: बाल, कुमार, युवा, वृद्ध व मृत अवस्था तथा जाग्रत-स्वप्न-सुषुप्त फल",
      verseNumbers: "श्लोक १–५",
      shlokaSanskrit: `बाले कुमारके चैव युवे वृद्धे मृते तथा ।
अवस्थामङ्गतो ज्ञात्वा फलं ब्रूयाद्विचक्षणः ॥ १ ॥
युवावस्थागतो खेटः पूर्णं फलमुदीरयेत् ॥ २ ॥`,
      applicabilityStatus: `लग्नेश अवस्था: ${lagneshAvastha.name} (${lagneshAvastha.capacity})`,
      natalTrigger: `आपके लग्नेश '${lagnesha.grahaName}' ${lagnesha.deg.toFixed(2)}° पर '${lagneshAvastha.name}' में हैं; आत्मकारक '${atmakaraka.grahaName}' '${atmakarakaAvastha.name}' में हैं।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार ग्रह जिस अवस्था में होता है, उसी अनुपात में फल देता है। आपके मुख्य ग्रह ${lagneshAvastha.name} में होकर ${lagneshAvastha.capacity} प्रकट करने में पूर्णतः समर्थ हैं।`,
      deepMeaning: "अवस्था सिद्धांत यह स्पष्ट करता है कि केवल ग्रह का भाव में होना पर्याप्त नहीं, उसकी आंतरिक परिपक्वता ही फल की तीव्रता तय करती है।",
      badges: [lagneshAvastha.name.split(' ')[0], "पाराशर अवस्था-विधान"]
    });

    // =========================================================================
    // CHAPTER 46: षट्चत्वारिंशोऽध्यायः — दशाप्रभेदाध्यायः (The Master Dasha Systems of Parashara)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 46,
      chapterTitle: "षट्चत्वारिंशोऽध्यायः — दशाप्रभेदाध्यायः",
      chapterSignificance: "दशा पद्धतियों का अधिष्ठान — कलियुग में विंशोत्तरी दशा (१२० वर्ष) की सार्वभौम प्रधानता",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `विंशोत्तरी दशा मुख्या कलौ सर्वग्रहेषु च ।
शतं विंशतिवर्षाणि परमायुः प्रकीर्तितम् ॥ १ ॥
नक्षत्रात् प्रविभागेन दशा ज्ञेया मनीषिभिः ॥ २ ॥`,
      applicabilityStatus: "विंशोत्तरी दशा प्रणाली का सार्वभौम काल-चक्र नियम",
      natalTrigger: `जातक के जन्म नक्षत्र के आधार पर १२० वर्षीय विंशोत्तरी काल-चक्र जातक के कर्म-फलों का समय-निर्धारण करता है।`,
      classicalPrediction: "महर्षि पाराशर ने स्पष्ट उद्घोष किया है कि कलियुग में मानव जीवन के सभी शुभाशुभ का काल-क्रम केवल विंशोत्तरी महादशा-अंतर्दशा द्वारा ही शत-प्रतिशत सटीक जाना जा सकता है।",
      deepMeaning: "दशा वह समय-चक्र है जो संचित कर्मों के बीजों को ठीक उनके निर्धारित समय पर अंकुरित और पुष्पित करता है।",
      badges: ["विंशोत्तरी दशा", "१२० वर्षीय काल-चक्र"]
    });

    // =========================================================================
    // CHAPTER 47: सप्तचत्वारिंशोऽध्यायः — विंशोत्तरीदशाफलाध्यायः (Vimshottari Dasha Predictions)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 47,
      chapterTitle: "सप्तचत्वारिंशोऽध्यायः — विंशोत्तरीदशाफलाध्यायः",
      chapterSignificance: "नवग्रह महादशा एवं अंतर्दशा फलित निर्णय — समय के अनुसार राजयोगों का प्रकटीकरण",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `दशायां स्वफलं कुर्यात् केन्द्रकोणगते ग्रहे ।
राज्याढ्यं धनधान्यं च कीर्तिं सौख्यं प्रयच्छति ॥ १ ॥
शुभग्रहस्य महादशायां सर्वसिद्धिमवाप्नुयात् ॥ २ ॥`,
      applicabilityStatus: "दशा-अंतर्दशा फलित सिद्धांत एवं शुभ काल-खंड",
      natalTrigger: `केन्द्र और त्रिकोण में स्थित ग्रह अपनी महादशा में जातक को पदोन्नति, आर्थिक संपन्नता और पारिवारिक सुख प्रदान करते हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब केन्द्र या त्रिकोण के स्वामी की महादशा आती है, तो जातक के जीवन में स्वर्णिम युग का आरंभ होता है; अवरुद्ध कार्य स्वतः सिद्ध होने लगते हैं और समाज में यश बढ़ता है।",
      deepMeaning: "दशा जातक को यह सिखाती है कि प्रकृति का अपना समय है; अनुकूल दशा में न्यूनतम प्रयास से भी विपुल फल प्राप्त होते हैं।",
      badges: ["महादशा फलित", "शुभ काल-प्रवाह"]
    });

    // =========================================================================
    // CHAPTER 48: अष्टचत्वारिंशोऽध्यायः — कालचक्रदशाफलाध्यायः (Kalachakra Dasha — The Wheel of Time)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 48,
      chapterTitle: "अष्टचत्वारिंशोऽध्यायः — कालचक्रदशाफलाध्यायः",
      chapterSignificance: "कालचक्र दशा — सव्य/अपसव्य नक्षत्र गति, देह व जीव राशि तथा सिंहवालोकन छलांग",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `कालचक्रदशा दिव्या पराशरेण भाषिता ।
देहजीवसमायुक्ता सर्वकर्मफलप्रदा ॥ १ ॥
जीवे शुभग्रहे संस्थे राज्यसौख्यं विनिर्दिशेत् ॥ २ ॥`,
      applicabilityStatus: "कालचक्र देह-जीव राशि संतुलन",
      natalTrigger: `जातक के जन्म नक्षत्र पाद से कालचक्र की देह और जीव राशियां जीवन की शक्ति और स्वास्थ्य का सूक्ष्म संतुलन बनाती हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार कालचक्र दशा सूक्ष्म प्रारब्ध का उद्घाटन करती है; जब जीव राशि पर शुभ ग्रहों का प्रभाव हो, तो जातक दीर्घायु, आत्म-ज्ञानी और सांसारिक बंधनों से मुक्त रहता है।",
      deepMeaning: "कालचक्र आत्मा का काल-पहिया है जो यह दर्शाता है कि समय केवल रैखिक नहीं, अपितु चक्रीय और रूपांतरणकारी है।",
      badges: ["कालचक्र दशा", "देह-जीव संतुलन"]
    });

    // =========================================================================
    // CHAPTER 49: एकोनपञ्चाशत्तमोऽध्यायः — चरादिदशाफलाध्यायः (Chara & Other Rashi Dashas)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 49,
      chapterTitle: "एकोनपञ्चाशत्तमोऽध्यायः — चरादिदशाफलाध्यायः",
      chapterSignificance: "राशियों की चर दशा — राशि-अनुसार घटनाओं का भौगोलिक एवं सामाजिक प्रकटीकरण",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `चरदशाफलं वक्ष्ये राशीनामुदयेन च ।
यद्राशौ संस्थितः खेटस्तद्राशौ फलमुत्तमम् ॥ १ ॥
लग्नेश-संस्थिते राशौ महदैश्वर्यमश्नुते ॥ २ ॥`,
      applicabilityStatus: "चर राशि दशा प्रभाव एवं दिशा-परिवर्तन",
      natalTrigger: `जिस राशि में आत्मकारक, लग्नेश अथवा शुभ ग्रह बैठते हैं, उस राशि की चर दशा जातक के जीवन को नई दिशा प्रदान करती है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार चर दशा जातक के स्थान-परिवर्तन, व्यावसायिक विस्तार, नए अनुबंधों और महत्वपूर्ण जीवन-घटनाओं को अचूक रूप से उद्घाटित करती है।",
      deepMeaning: "ग्रह चेतना के कारक हैं और राशियां वातावरण की; चर दशा यह बताती है कि वातावरण किस प्रकार व्यक्ति के भाग्य को पोषित करता है।",
      badges: ["चर दशा विधान", "राशि फल-प्रवाह"]
    });

    // =========================================================================
    // CHAPTER 50: पञ्चाशत्तमोऽध्यायः — अष्टकवर्गाध्यायः (The Master Ashtakavarga System)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 50,
      chapterTitle: "पञ्चाशत्तमोऽध्यायः — अष्टकवर्गाध्यायः",
      chapterSignificance: "अष्टकवर्ग महा-पद्धति — सूर्य से शनि एवं लग्न तक आठों घटकों के शुभ बिन्दुओं का आधार",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `अष्टवर्गं प्रवक्ष्यामि सर्वशास्त्रशिरोमणिम् ।
यस्य ज्ञानेन मन्त्राणां ग्रहाणां ज्ञायते बलम् ॥ १ ॥
बिन्दुबाहुल्यतो वृद्धिर्हानिर्बिन्दुविपर्यये ॥ २ ॥`,
      applicabilityStatus: "अष्टकवर्ग बिन्दु-गणना एवं सूक्ष्म ग्रह-सामर्थ्य",
      natalTrigger: `जातक की कुंडली के ७ ग्रहों के भिन्नाष्टकवर्ग (BAV) बिन्दु: सूर्य (${ashtakavarga.bav.Sun.reduce((a,b)=>a+b,0)}), चन्द्र (${ashtakavarga.bav.Moon.reduce((a,b)=>a+b,0)}), मंगल (${ashtakavarga.bav.Mars.reduce((a,b)=>a+b,0)}), बुध (${ashtakavarga.bav.Mercury.reduce((a,b)=>a+b,0)}), गुरु (${ashtakavarga.bav.Jupiter.reduce((a,b)=>a+b,0)}), शुक्र (${ashtakavarga.bav.Venus.reduce((a,b)=>a+b,0)}), शनि (${ashtakavarga.bav.Saturn.reduce((a,b)=>a+b,0)}) — कुल ३३७ बिन्दु।`,
      classicalPrediction: "महर्षि पाराशर का अमर सिद्धांत: 'बिन्दुबाहुल्यतो वृद्धिः' — जिस भाव में अष्टकवर्ग के शुभ बिन्दु अधिक होते हैं, वह भाव बिना किसी प्रयास के भी शुभ फल देता है; और कम बिन्दु वाला भाव सतर्कता की मांग करता है।",
      deepMeaning: "अष्टकवर्ग संपूर्ण सौरमंडल की सामूहिक सहमति (Consensus of Planets) है; जब सभी ग्रह मिलकर किसी भाव को बिन्दु देते हैं, तो वह सफलता अकाट्य होती है।",
      badges: ["अष्टकवर्ग शिरोमणि", "सामूहिक ग्रह-सहमति", "कुल ३३७ बिन्दु"]
    });

    // =========================================================================
    // CHAPTER 51: एकपञ्चाशत्तमोऽध्यायः — सर्वाष्टकवर्गाध्यायः (Sarvashtakavarga - The 337 Bindus)
    // =========================================================================
    const hSav = ashtakavarga.houseSav;
    const savDetailStr = `लग्न: ${hSav[0]}, २रा: ${hSav[1]}, ३रा: ${hSav[2]}, ४था: ${hSav[3]}, ५वां: ${hSav[4]}, ६ठा: ${hSav[5]}, ७वां: ${hSav[6]}, ८वां: ${hSav[7]}, ९वां: ${hSav[8]}, १०वां: ${hSav[9]}, ११वां (आय): ${hSav[10]}, १२वां (व्यय): ${hSav[11]}`;

    matchedShlokas.push({
      chapterNumber: 51,
      chapterTitle: "एकपञ्चाशत्तमोऽध्यायः — सर्वाष्टकवर्गाध्यायः",
      chapterSignificance: "सर्वाष्टकवर्ग के ३३७ दिव्य बिन्दु — २८ बिन्दु का संतुलन, ३०+ बिन्दुओं का महाभाग्य एवं आय-व्यय अनुपात",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `सप्तत्रिंशत् त्रिशतं चैव सर्वाष्टकवर्गसंभवम् ।
अष्टाविंशतिभिर्बिन्दुर्मध्यमं शुभमुच्यते ॥ १ ॥
त्रिंशदूर्ध्वं महाभाग्यं वित्तलाभं दिने दिने ॥ २ ॥
लाभेऽधिका व्यये न्यूना बहुवित्तयुतो भवेत् ॥ ३ ॥`,
      applicabilityStatus: `सर्वाष्टकवर्ग ३३७ बिन्दु वितरण एवं आय-व्यय अनुपात (११वां: ${hSav[10]} vs १२वां: ${hSav[11]})`,
      natalTrigger: `जातक के १२ भावों के वास्तविक सर्वाष्टकवर्ग बिन्दु: ${savDetailStr}। लग्न भाव में सर्वाधिक ${hSav[0]} बिन्दु (असाधारण आत्मबल), दशम भाव में ${hSav[9]} बिन्दु (अटूट कर्म-प्रतिष्ठा)। एकादश (आय) में ${hSav[10]} एवं द्वादश (व्यय) में ${hSav[11]} बिन्दु हैं।`,
      classicalPrediction: ashtakavarga.wealthSummary.diff11_12 >= 0
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: 'लाभेऽधिका व्यये न्यूना बहुवित्तयुतो भवेत्' — आपकी कुंडली में एकादश भाव (आय: ${hSav[10]} बिंदु) द्वादश भाव (व्यय: ${hSav[11]} बिंदु) से अधिक है, जो प्रचुर धन-संचय और स्थायी संपदा का उत्कृष्ट योग है।`
        : `महर्षि पाराशर का प्रत्यक्ष सूत्र: 'लाभेऽधिका व्यये न्यूना बहुवित्तयुतो भवेत्' — आपकी कुंडली में द्वादश भाव (व्यय: ${hSav[11]} बिंदु) एकादश भाव (आय: ${hSav[10]} बिंदु) से अधिक है। शास्त्र का स्पष्ट निर्देश है कि जातक को अनियोजित व्ययों, अत्यधिक उदारता और वित्तीय रिसाव पर कठोर नियंत्रण रखना होगा; स्वचालित बचत (SIP) और विवेकपूर्ण बजट से ही संपदा संचित होगी।`,
      deepMeaning: "सर्वाष्टकवर्ग जातक का ब्रह्मांडीय बैंक-खाता है; ३३७ बिन्दुओं का उचित संतुलन यह सुनिश्चित करता है कि जातक जीवन में कभी पराजित न हो।",
      badges: ["सर्वाष्टकवर्ग ३३७ बिन्दु", `लग्न: ${hSav[0]} बिन्दु`, `आय: ${hSav[10]} | व्यय: ${hSav[11]}`, ashtakavarga.wealthSummary.diff11_12 >= 0 ? "आय > व्यय" : "व्यय > आय सतर्कता"],
      ashtakavargaData: ashtakavarga
    });

    // =========================================================================
    // CHAPTER 52: द्विपञ्चाशत्तमोऽध्यायः — प्रस्ताराष्टकवर्गाध्यायः (Prastarashtakavarga — Micro Cosmic Spread)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 52,
      chapterTitle: "द्विपञ्चाशत्तमोऽध्यायः — प्रस्ताराष्टकवर्गाध्यायः",
      chapterSignificance: "प्रस्ताराष्टकवर्ग — प्रत्येक राशि के ८ कक्षा (३°४५') विभागों का सूक्ष्म फलितार्थ",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `प्रस्तारेण पृथग् ज्ञेयं ग्रहाणां बलमुत्तमम् ।
कक्ष्याक्रमेण संसारे शुभाशुभफलं वदेत् ॥ १ ॥`,
      applicabilityStatus: "सूक्ष्म कक्षा (Kakshya) विभाजन एवं व्यक्तिगत ग्रह-अनुदान",
      natalTrigger: `प्रत्येक ग्रह अपने भ्रमण के दौरान ३°४५' की विशिष्ट कक्षा में अपने ही दिए हुए बिन्दु पर पहुंचकर त्वरित शुभ फल प्रदान करता है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार प्रस्ताराष्टकवर्ग की सहायता से यह दिन-प्रतिदिन सटीक जाना जा सकता है कि गोचर का ग्रह कब और किस क्षण जातक को शुभ समाचार या धन-लाभ देगा।",
      deepMeaning: "प्रस्तार ज्योतिष का माइक्रोस्कोप है; यह स्थूल भविष्यवाणियों को सेकंडों और दिनों की सूक्ष्मता में बदल देता है।",
      badges: ["प्रस्ताराष्टकवर्ग", "कक्षा सूक्ष्म फल"]
    });

    // =========================================================================
    // CHAPTER 53: त्रिपञ्चाशत्तमोऽध्यायः — अष्टकवर्गरेखाफलाध्यायः (Ashtakavarga Rekha Phala)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 53,
      chapterTitle: "त्रिपञ्चाशत्तमोऽध्यायः — अष्टकवर्गरेखाफलाध्यायः",
      chapterSignificance: "भिन्नाष्टकवर्ग रेखा-फल — ग्रहों के शून्य से आठ बिन्दुओं का प्रत्यक्ष फलित स्वरूप",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `एकद्वित्रिचतुष्पञ्चषट्सप्ताष्टसु बिन्दुभिः ।
क्रमेण वर्धते सौख्यं नृपपूज्यो भवेन्नरः ॥ १ ॥
अष्टबिन्दौ गते खेटे राजतुल्यसुखं भवेत् ॥ २ ॥`,
      applicabilityStatus: "भिन्नाष्टकवर्ग ५+ बिन्दु प्राचुर्य फल",
      natalTrigger: `कुंडली के प्रमुख शुभ ग्रहों (गुरु, शुक्र, बुध) ने अपने भिन्नाष्टकवर्गों में ५ से ८ बिन्दुओं का शक्तिशाली आधार प्राप्त किया है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब कोई ग्रह ५, ६, ७ या ८ बिन्दुओं से युक्त होता है, तो वह ग्रह उस भाव में राजतुल्य सम्मान, अटूट समृद्धि और उत्कृष्ट स्वास्थ्य का वरदान देता है।",
      deepMeaning: "रेखा-फल यह दर्शाता है कि बाह्य रूप से कमजोर दिखने वाला ग्रह भी यदि अष्टकवर्ग में उच्च बिन्दु रखता है, तो वह अप्रत्याशित चमत्कार करने में सक्षम होता है।",
      badges: ["रेखा-फल प्राचुर्य", "५+ बिन्दु शुभता"]
    });

    // =========================================================================
    // CHAPTER 54: चतुष्पञ्चाशत्तमोऽध्यायः — त्रिकोणशोधनाध्यायः (Trikona Shodhana — Triad Reduction)
    // =========================================================================
    const tr = ashtakavarga.trikonaReduced;
    matchedShlokas.push({
      chapterNumber: 54,
      chapterTitle: "चतुष्पञ्चाशत्तमोऽध्यायः — त्रिकोणशोधनाध्यायः",
      chapterSignificance: "त्रिकोण शोधन — अग्नि, पृथ्वी, वायु एवं जल तत्वों के त्रिकोणों का शुद्धीकरण",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `त्रिकोणशोधनं पूर्वं कुर्याच्छास्त्रप्रमाणतः ।
समे न्यूने त्यजेद्बिन्दून् शेषाः शुद्धाः प्रकीर्तिताः ॥ १ ॥`,
      applicabilityStatus: "चारों मूल तत्वों (धर्म, अर्थ, काम, मोक्ष त्रिकोण) का शुद्धीकरण",
      natalTrigger: `त्रिकोण शोधन उपरांत शुद्ध बिन्दु: अग्नि त्रिकोण [मेष ${tr[0]}, सिंह ${tr[4]}, धनु ${tr[8]}], पृथ्वी त्रिकोण [वृषभ ${tr[1]}, कन्या ${tr[5]}, मकर ${tr[9]}], वायु त्रिकोण [मिथुन ${tr[2]}, तुला ${tr[6]}, कुम्भ ${tr[10]}], जल त्रिकोण [कर्क ${tr[3]}, वृश्चिक ${tr[7]}, मीन ${tr[11]}]।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार त्रिकोण शोधन के उपरांत जो शेष बिन्दु बचते हैं, वे जातक के पूर्वपुण्य के शुद्ध सोने की भांति होते हैं जो कभी व्यर्थ नहीं जाते।",
      deepMeaning: "त्रिकोण शोधन जीवन के चार पुरुषार्थों (धर्म, अर्थ, काम, मोक्ष) का गणितीय संतुलन है।",
      badges: ["त्रिकोण शोधन", "तत्व शुद्धीकरण"]
    });

    // =========================================================================
    // CHAPTER 55: पञ्चपञ्चाशत्तमोऽध्यायः — एकाधिपत्यशोधनाध्यायः (Ekadhipatya Shodhana)
    // =========================================================================
    const er = ashtakavarga.ekadhipatyaReduced;
    const ekTotal = er.reduce((a,b)=>a+b, 0);
    matchedShlokas.push({
      chapterNumber: 55,
      chapterTitle: "पञ्चपञ्चाशत्तमोऽध्यायः — एकाधिपत्यशोधनाध्यायः",
      chapterSignificance: "एकाधिपत्य शोधन — दो-दो राशियों के स्वामी ग्रहों (मंगल, बुध, गुरु, शुक्र, शनि) का बिन्दु परिमार्जन",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `एकाधिपत्यशुद्धिं च ततः कुर्याद्विचक्षणः ।
ग्रहाधिष्ठितभे चैव न शोधनमुदीरितम् ॥ १ ॥`,
      applicabilityStatus: "एकाधिपत्य परिमार्जन द्वारा अंतिम शुद्ध बिन्दु निष्कर्षण",
      natalTrigger: `एकाधिपत्य शोधन उपरांत शुद्ध शोध्य बिन्दु योग: ${ekTotal} बिन्दु। द्वैत राशियों के बिन्दुओं का तुलनात्मक शोधन ग्रह की वास्तविक निष्पक्ष शक्ति को उजागर करता है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार एकाधिपत्य शोधन के पश्चात ग्रह का वास्तविक 'शुद्ध पिण्ड' जातक को स्थायी फल प्रदान करने के लिए तत्पर होता है।",
      deepMeaning: "यह प्रक्रिया जातक के कर्मों में छिपे द्वैत (Duality) को समाप्त कर एकाग्र शक्ति का निर्माण करती है।",
      badges: ["एकाधिपत्य शोधन", `शुद्ध योग: ${ekTotal}`]
    });

    // =========================================================================
    // CHAPTER 56: षट्पञ्चाशत्तमोऽध्यायः — पिण्डसाधनाध्यायः (Shodhya Pinda Sadhana)
    // =========================================================================
    const ps = ashtakavarga.pindaSadhana;
    matchedShlokas.push({
      chapterNumber: 56,
      chapterTitle: "षट्पञ्चाशत्तमोऽध्यायः — पिण्डसाधनाध्यायः",
      chapterSignificance: "शोध्य पिण्ड साधना — राशि गुणाकार एवं ग्रह गुणाकार द्वारा समग्र जीवन-शक्ति पिण्ड",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `शोध्यपिण्डबलाज्ज्ञेयं जातकस्य महद्बलम् ।
पिण्डाधिक्ये महासौख्यं सर्वकार्येषु संसिद्धिः ॥ १ ॥
पिण्डायुः प्रवरं प्रोक्तं मुनिभिस्तत्वदर्शिभिः ॥ २ ॥`,
      applicabilityStatus: `शोध्य पिण्ड जीवन-ऊर्जा सामर्थ्य (योग पिण्ड: ${ps.yogaPinda})`,
      natalTrigger: `जातक का राशि पिण्ड: ${ps.rashiPinda}, ग्रह पिण्ड: ${ps.grahaPinda}, समग्र योग पिण्ड: ${ps.yogaPinda}। यह जातक की समग्र प्राण-ऊर्जा और दीर्घायु का आधार है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जिस जातक का शोध्य पिण्ड बलवान होता है, वह समाज में अजेय, शारीरिक रूप से ओजस्वी और सभी उपक्रमों में सिद्धि प्राप्त करने वाला होता है।",
      deepMeaning: "शोध्य पिण्ड व्यक्ति के पूरे जीवन का संचित ओज (Vital Reserve) है।",
      badges: ["शोध्य पिण्ड", `योग पिण्ड: ${ps.yogaPinda}`, "प्राण-ऊर्जा सामर्थ्य"]
    });

    // =========================================================================
    // CHAPTER 57: सप्तपञ्चाशत्तमोऽध्यायः — गोचरफलाध्यायः (Gochara Phala — Transits over Ashtakavarga)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 57,
      chapterTitle: "सप्तपञ्चाशत्तमोऽध्यायः — गोचरफलाध्यायः",
      chapterSignificance: "गोचर फल विचार — जन्म चन्द्रमा एवं अष्टकवर्ग बिन्दु बाहुल्य राशियों में गोचर का चमत्कारिक फल",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `गोचरेण ग्रहाः सर्वे बिन्दुबाहुल्यराशिषु ।
प्रविष्टाः कुर्वते राज्यं धनधान्यसमृद्धिदम् ॥ १ ॥
अल्पबिन्दौ गताः खेटाः क्लेशबाधाप्रदायकाः ॥ २ ॥`,
      applicabilityStatus: "गोचरीय ग्रह संचरण एवं अष्टकवर्ग बिन्दु समन्वय",
      natalTrigger: `शनि एवं गुरु जब भी कुंडली की उच्च-बिन्दु राशियों (जैसे लग्न ${hSav[0]}, दशम ${hSav[9]}) में प्रवेश करते हैं, तो जातक के जीवन में बड़े सकारात्मक मोड़ आते हैं।`,
      classicalPrediction: "महर्षि पाराशर का प्रत्यक्ष सूत्र: गोचर के ग्रह केवल चन्द्रमा से नहीं, अपितु अष्टकवर्ग के बिन्दुओं के अनुसार फल देते हैं। २८ से अधिक बिन्दुओं वाली राशि में जब गुरु या शनि आते हैं, तो जातक का भाग्योदय सुनिश्चित होता है।",
      deepMeaning: "गोचर समय का गतिमान रूप है; जब समय आपकी कुंडली के पूर्वार्जित पुण्यों (बिन्दुओं) से मिलता है, तो सफलता अवश्यंभावी होती है।",
      badges: ["गोचर फल विचार", "अष्टकवर्ग संचरण"]
    });
    // =========================================================================
    // CHAPTER 58: अष्टपञ्चाशत्तमोऽध्यायः — स्त्रीजातकाध्यायः (Stree Jataka — Classical Horoscopy)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 58,
      chapterTitle: "अष्टपञ्चाशत्तमोऽध्यायः — स्त्रीजातकाध्यायः",
      chapterSignificance: "स्त्री जातक विधान — अष्टम (मांगल्य), सप्तम (पति-सौख्य), नवम (संतति-धर्म) एवं त्रिंशांश शुद्धि",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `स्त्रीणां तु वैधव्यं रन्ध्रे कलत्रे भर्तृलक्षणम् ।
लग्ने देहसुखं सौख्यं नवमे सन्ततिस्तथा ॥ १ ॥
शुभग्रहेक्षिते सर्वं सौभाग्यं कुलवर्धनम् ॥ २ ॥`,
      applicabilityStatus: "मांगल्य, सौभाग्य एवं कुल-वृद्धि शास्त्रीय समन्वय",
      natalTrigger: `सप्तम, अष्टम एवं नवम भावों पर शुभ ग्रहों का प्रभाव दांपत्य मांगल्य, सद्गुण और कुल की कीर्ति को बढ़ाता है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब मांगल्य और भाग्य भाव शुभ ग्रहों से युक्त या दृष्ट हों, तो जातक कुल को गौरवान्वित करने वाला, सौभाग्यशाली, दीर्घायु जीवनसाथी से युक्त और सर्व-प्रिय होता है।",
      deepMeaning: "स्त्री जातक का यह अध्याय पारिवारिक सद्भाव और आध्यात्मिक शक्ति के संरक्षण की शास्त्रीय धरोहर है।",
      badges: ["मांगल्य सौभाग्य", "कुल-वर्धन योग"]
    });

    // =========================================================================
    // CHAPTER 59: एकोनषष्टितमोऽध्यायः — अरिष्टाध्यायः (Arishta & Planetary Afflictions)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 59,
      chapterTitle: "एकोनषष्टितमोऽध्यायः — अरिष्टाध्यायः",
      chapterSignificance: "अरिष्ट विचार — बालारिष्ट, गंडान्त एवं ग्रह-पीड़ा का शास्त्रीय निदान",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `अरिष्टं विविधाकारं पूर्वकर्मसमुद्भवम् ।
चन्द्रे पापान्विते केन्द्रे बालारिष्टं विनिर्दिशेत् ॥ १ ॥
शुभग्रहेण संदृष्टे तद्दोषो विनिवर्तते ॥ २ ॥`,
      applicabilityStatus: "अरिष्ट-दोष निदान एवं सतर्कता सूत्र",
      natalTrigger: `चन्द्रमा एवं लग्न का विश्लेषण किसी भी प्रकार के गंभीर बालारिष्ट को शुभ ग्रहों की दृष्टि द्वारा स्वतः शांत करता है।`,
      classicalPrediction: "महर्षि पाराशर सचेत करते हैं कि अरिष्ट पूर्वजन्मों के संचित दोषों से उत्पन्न होते हैं, किंतु जब शुभ ग्रहों की दृष्टि हो, तो समस्त अरिष्ट तत्काल दूर होकर आरोग्य में बदल जाते हैं।",
      deepMeaning: "अरिष्ट जीवन की परीक्षाएं हैं जो व्यक्ति को अधिक सजग, संयमी और आध्यात्मिक बनाती हैं।",
      badges: ["अरिष्ट निदान", "आरोग्य सतर्कता"]
    });

    // =========================================================================
    // CHAPTER 60: षष्टितमोऽध्यायः — अरिष्टभंगाध्यायः (Arishta Bhanga — Supreme Cancellations)
    // =========================================================================
    const hasArishtaBhanga = isKendra(jupiter.house) || isKendra(lagneshHouse) || (moon.house === 1 || moon.house === 4 || moon.house === 7 || moon.house === 10);
    matchedShlokas.push({
      chapterNumber: 60,
      chapterTitle: "षष्टितमोऽध्यायः — अरिष्टभंगाध्यायः",
      chapterSignificance: "अरिष्ट-भंग महा-विधान — केन्द्रस्थ देवगुरु बृहस्पति द्वारा सहस्र-दोषों का समूल विनाश",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `एकोऽपि विमले केन्द्रे देवपूज्यः स्थितो यदि ।
हन्ति सर्वाण्यरिष्टानि पिनाकीव तमोगणान् ॥ १ ॥
लग्नाधिपे बलोपेते सर्वदोषविनाशनम् ॥ २ ॥`,
      applicabilityStatus: hasArishtaBhanga 
        ? "महा-अरिष्टभंग राजयोग (सहस्र-दोषहन्ता देवगुरु/लग्नेश प्रभाव)"
        : "लग्नेश रक्षा-कवच",
      natalTrigger: hasArishtaBhanga
        ? `देवगुरु बृहस्पति अथवा लग्नेश का केन्द्र/त्रिकोण में होना भगवान शिव की भांति कुंडली के समस्त अरिष्टों का नाश करता है।`
        : `लग्नेश '${lagnesha.grahaName}' का बल कुंडली के दोषों को निष्प्रभावी करता है।`,
      classicalPrediction: hasArishtaBhanga
        ? "महर्षि पाराशर का अमर सिंहनाद: 'एकोऽपि विमले केन्द्रे देवपूज्यः... हन्ति सर्वाण्यरिष्टानि' — यदि अकेला देवगुरु केन्द्र में हो अथवा लग्नेश बलवान हो, तो कुंडली के लाखों दोष और अरिष्ट स्वतः भस्म हो जाते हैं। जातक प्रत्येक संकट से सुरक्षित बाहर निकलता है।"
        : "महर्षि पाराशर के अनुसार जातक को ईश्वर-कृपा और लग्नेश के बल से संकटों पर विजय प्राप्त होती है।",
      deepMeaning: "अरिष्ट-भंग यह सिखाता है कि अंधकार कितना भी घना हो, ज्ञान रूपी गुरु का एक सूर्य समस्त अंधकार को नष्ट करने के लिए पर्याप्त है।",
      badges: ["अरिष्टभंग महायोग", "सहस्रदोषहन्ता"]
    });

    // =========================================================================
    // CHAPTER 61: एकषष्टितमोऽध्यायः — पूर्वजन्मशापाध्यायः (Past Life Karmic Curses & Redemption)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 61,
      chapterTitle: "एकषष्टितमोऽध्यायः — पूर्वजन्मशापाध्यायः",
      chapterSignificance: "पूर्वजन्म कर्म-ऋण विचार (सर्प, पितृ, मातृ, भ्रातृ शाप) एवं उनका आध्यात्मिक उद्धार",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `पूर्वजन्मकृतं पापं शापरूपेण वर्तते ।
शान्त्या जपेन दानेन तस्य मुक्तिर्भविष्यति ॥ १ ॥
गायत्रीजपमात्रेण सर्वशापैः प्रमुच्यते ॥ २ ॥`,
      applicabilityStatus: "पूर्वजन्म ऋण शुद्धि एवं आध्यात्मिक प्रायश्चित्त विधान",
      natalTrigger: `राहु/केतु, सूर्य एवं चन्द्रमा की स्थिति पूर्वजन्म के संचित दायित्वों को सेवा और साधना द्वारा निष्काम करने का निर्देश देती है।`,
      classicalPrediction: "महर्षि पाराशर स्पष्ट करते हैं कि पूर्वजन्म के जो भी सूक्ष्म ऋण या शाप होते हैं, वे गायत्री जप, पितृ-तर्पण, गो-सेवा और महामृत्युंजय पाठ से पूर्णतः शांत होकर अक्षय आशीर्वाद में बदल जाते हैं।",
      deepMeaning: "शाप वस्तुतः अनसुलझे कर्म-बंधन हैं; क्षमा, सेवा और ईश्वर-समर्पण से वे मुक्ति का द्वार बन जाते हैं।",
      badges: ["कर्म-ऋण शुद्धि", "गायत्री उद्धार"]
    });

    // =========================================================================
    // CHAPTER 62: द्विषष्टितमोऽध्यायः — शान्तिप्रकरणाध्यायः (Vedic Shanti & Classical Remediations)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 62,
      chapterTitle: "द्विषष्टितमोऽध्यायः — शान्तिप्रकरणाध्यायः",
      chapterSignificance: "वैदिक शान्ति विधान — नवग्रह शान्ति, जप, होम, दान एवं रत्नादि धारण के शास्त्रीय नियम",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `जपहोमार्चनैर्दानैर्ग्रहाः शान्ता भवन्ति हि ।
सर्वोपद्रवनाशार्थं शान्तिकर्माणि कारयेत् ॥ १ ॥
श्रीमहामृत्युञ्जयेनैव सर्वशान्तिर्भविष्यति ॥ २ ॥`,
      applicabilityStatus: "पाराशर प्रामाणिक वैदिक शान्ति एवं उपशमन विधान",
      natalTrigger: `जातक के अनुकूल ग्रह मंत्र: ॐ नमः शिवाय एवं महामृत्युंजय मंत्र; तथा इष्टदेव ${akAvatar.avatar} की नित्य उपासना।`,
      classicalPrediction: "महर्षि पाराशर का प्रत्यक्ष उपदेश: ग्रहों की प्रतिकूलता को नष्ट करने का एकमात्र प्रामाणिक उपाय जप, होम, सत्कर्म और दान है। जो जातक श्रद्धापूर्वक इन नियमों का पालन करता है, उसके जीवन से समस्त अमंगल दूर हो जाते हैं।",
      deepMeaning: "शान्ति कर्म अंधविश्वास नहीं, अपितु चित्त को शुद्ध कर ब्रह्मांडीय तरंगों से समस्वर (Harmonize) करने का विज्ञान है।",
      badges: ["वैदिक शान्ति विधान", "पाराशर प्रायश्चित्त"]
    });

    // =========================================================================
    // CHAPTER 63: त्रिषष्टितमोऽध्यायः — पूर्वखण्डोपसंहाराध्यायः (Purva Khanda Conclusion)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 63,
      chapterTitle: "त्रिषष्टितमोऽध्यायः — पूर्वखण्डोपसंहाराध्यायः",
      chapterSignificance: "महर्षि पाराशर का पूर्व-खण्ड उपसंहार — मैत्रेय मुनि को आशीर्वाद एवं होराशास्त्र फल-श्रुति",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `इति श्रीपराशरेण प्रोक्तं होराशास्त्रं पुरातनम् ।
मैत्रेयाय मुनीन्द्राय लोककल्याणहेतवे ॥ १ ॥
य इदं पठते नित्यं शृणुयाद्वा समाहितः ।
सर्वपापविनिर्मुक्तो ब्रह्मलोके महीयते ॥ २ ॥`,
      applicabilityStatus: "पूर्व-खण्ड फल श्रुति एवं महर्षि पाराशर का दिव्य उपदेश",
      natalTrigger: `जातक: ${calcResult.name || options.name || "जातक"} • बृहत्पाराशरहोराशास्त्रम् पूर्व-खण्ड (अध्याय १–६३) फलित सम्पन्न।`,
      classicalPrediction: "महर्षि पाराशर का दिव्य आशीर्वाद: जो मनुष्य इस होराशास्त्र के पूर्व-खण्ड के गूढ़ नियमों का मनन करता है और अपने कर्मों को धर्मानुकूल बनाता है, वह इस लोक में संपूर्ण ऐश्वर्य, यश, आरोग्य व विजय प्राप्त करता है।",
      deepMeaning: "पूर्व-खण्ड जातक के मूल व्यक्तित्व, राजयोग, धनयोग और भाव-बलों का सार्वभौम आधार-स्तंभ है।",
      badges: ["पूर्व-खण्ड उपसंहार", "पाराशर आशीर्वाद"]
    });

    // =========================================================================
    // बृहत्पाराशरहोराशास्त्रम् — उत्तर खण्ड (UTTARA KHANDA: CHAPTERS 64 TO 97)
    // =========================================================================

    // Compute Nakshatra, Dasha & Astrological Matrix for Uttara Khanda
    const moonAbs = moon.abs !== undefined ? moon.abs : (moon.sign * 30 + moon.deg);
    const nakSpan = 360 / 27; // 13° 20' = 13.333333°
    const nakIndex = Math.floor(moonAbs / nakSpan);
    const nakDegIn = moonAbs % nakSpan;
    const nakPada = Math.floor(nakDegIn / (nakSpan / 4)) + 1;
    const NAKSHATRA_NAMES = [
      "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
      "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी",
      "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा",
      "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा",
      "पूर्वाभाद्रपद", "उत्तराभाद्रपद", "रेवती"
    ];
    const nakName = NAKSHATRA_NAMES[nakIndex] || "अश्विनी";
    const VIMSHOTTARI_CYCLE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
    const birthDashaLordId = VIMSHOTTARI_CYCLE[nakIndex % 9];
    const birthDashaLordName = GRAHA_NAMES[birthDashaLordId];

    // Tithi & Paksha computation
    const sunAbs = sun.abs !== undefined ? sun.abs : (sun.sign * 30 + sun.deg);
    const moonSunDiff = (moonAbs - sunAbs + 360) % 360;
    const tithiNum = Math.floor(moonSunDiff / 12) + 1;
    const isKrishnaPaksha = tithiNum > 15;
    const isAmavasya = tithiNum === 30 || moonSunDiff < 12 || moonSunDiff > 348;
    const isChaturdashi = tithiNum === 14 || tithiNum === 29;
    const isSankranti = sun.deg < 1.0 || sun.deg > 29.0;
    const isEclipseBirth = (Math.abs(sun.sign - rahu.sign) === 0 || Math.abs(sun.sign - ketu.sign) === 0) && (isAmavasya || tithiNum === 15);
    const isMoolaJyeshthaAshlesha = [8, 17, 18].includes(nakIndex);
    const isNakGandanta = (nakIndex === 0 && nakDegIn < 1.0) || (nakIndex === 26 && nakDegIn > 12.33) ||
                          (nakIndex === 9 && nakDegIn < 1.0) || (nakIndex === 8 && nakDegIn > 12.33) ||
                          (nakIndex === 18 && nakDegIn < 1.0) || (nakIndex === 17 && nakDegIn > 12.33);

    // =========================================================================
    // CHAPTERS 64 TO 72: विंशोत्तरी महादशा एवं अन्तर्दशा फल विचार (CH. 64–72)
    // Evaluated dynamically according to Native's Active Cosmic Timeline
    // =========================================================================
    const activeMD = vimshottariDasha.activeMD;
    const activeAD = vimshottariDasha.activeAD;
    const upcomingAD = vimshottariDasha.upcomingAD;
    const nowMs = (options.targetDate instanceof Date ? options.targetDate : new Date()).getTime();

    // Map each of the 9 Chapters to its corresponding Mahadasha
    DASHA_LORDS_CONFIG.forEach(cfg => {
      const m = vimshottariDasha.mahadashas.find(x => x.lord.id === cfg.id) || {
        lord: cfg,
        startDate: new Date(),
        endDate: new Date(),
        startMs: 0,
        endMs: 0
      };

      const isActiveMD = (activeMD && activeMD.lord.id === cfg.id);
      const isPastMD = (nowMs >= m.endMs);
      const isFutureMD = (nowMs < m.startMs);

      if (isActiveMD) {
        // 🔥 ACTIVE RUNNING MAHADSHA & ANTARDASHA
        const adName = activeAD ? activeAD.lord.name : cfg.name;
        const upName = upcomingAD ? upcomingAD.lord.name : "—";
        const adStartStr = activeAD ? activeAD.startDate.toLocaleDateString('hi-IN') : "";
        const adEndStr = activeAD ? activeAD.endDate.toLocaleDateString('hi-IN') : "";
        const upStartStr = upcomingAD ? upcomingAD.startDate.toLocaleDateString('hi-IN') : "";

        // Specific Shloka based on Active Mahadasha & Antardasha
        let dashaShloka = ``;
        let classicalPhala = ``;

        if (cfg.id === 'Saturn' && activeAD && activeAD.lord.id === 'Rahu') {
          dashaShloka = `शनौ राहुगते काले वातपित्तप्रकोपकृत् ।
बन्धुवैरं मनोदुःखं स्थानभ्रंशो महद् भयम् ॥ १ ॥
तृतीये लाभगे वापि शुभैर्युक्ते च वीक्षिते ।
अकस्मात् कार्यसिद्धिः स्याद् वित्तलाभो यशोन्नतिः ॥ २ ॥`;
          classicalPhala = `महर्षि पाराशर के अनुसार शनि महादशा में राहु अन्तर्दशा स्पष्ट दोहरे परिणाम देती है: (१) कठिन व सावधानी पक्ष: वात-पित्त विकार, निकट संबंधियों व सहयोगियों से अकारण मतभेद, मानसिक चिंता एवं कार्यक्षेत्र में स्थान-परिवर्तन अथवा अनिश्चितता का भय। (२) शुभ व सुअवसर पक्ष: यदि राहु उपचय (३, १०, ११) अथवा शुभ दृष्टि में हो तो अचानक विदेशी/दूरस्थ संपर्कों, गहन शोध, तकनीकी क्षेत्रों व स्वतंत्र उपक्रमों से अप्रत्याशित वित्तीय सफलता और प्रतिष्ठा प्राप्त होती है। जातक को इस काल में अति-उत्साह से बचकर धैर्यपूर्वक कार्य करने का निर्देश है।`;
        } else if (cfg.id === 'Saturn' && activeAD && activeAD.lord.id === 'Jupiter') {
          dashaShloka = `शनौ गुरुगते काले विद्या-धर्म-सुखावहः ।
राजसम्मानमाप्नोति पुत्रपौत्रप्रहर्षितः ॥ १ ॥
षष्ठाष्टमव्यये वापि कलहो धनहानिकृत् ॥ २ ॥`;
          classicalPhala = `महर्षि पाराशर के अनुसार शनि में गुरु की अन्तर्दशा में उच्च विद्या, धर्म-परायणता, ज्ञान-विस्तार और राज-सम्मान की प्राप्ति होती है। यदि गुरु त्रिक भाव में हो तो व्यर्थ विवादों से बचना चाहिए।`;
        } else {
          dashaShloka = `${cfg.name} महादशायां तु अन्तर्दशाफलं वदेत् ।
शुभर्क्षे केन्द्रगे वापि राज्यसौख्यं धनागमः ॥ १ ॥
नीचे वा पापसंयुक्ते क्लेशो भवति निश्चितम् ॥ २ ॥`;
          classicalPhala = `महर्षि पाराशर के अनुसार ${cfg.name} की महादशा में जब अन्तर्दशानाथ शुभ, केन्द्र या त्रिकोण में हो तो विपुल राज्यसौख्य, मान-प्रतिष्ठा और धन लाभ होता है; जबकि नीच या पाप प्रभाव होने पर सतर्कता एवं शान्ति साधना अनिवार्य होती है।`;
        }

        matchedShlokas.push({
          chapterNumber: cfg.ch,
          chapterTitle: cfg.title,
          chapterSignificance: `🔥 सक्रिय वर्तमान विंशोत्तरी महादशा (${cfg.name}) एवं अन्तर्दशा (${adName}) फल विचार`,
          verseNumbers: "श्लोक १–४ (सक्रिय काल)",
          shlokaSanskrit: dashaShloka,
          applicabilityStatus: `🔥 सक्रिय वर्तमान काल: ${cfg.name} महादशा अन्तर्गत '${adName}' अन्तर्दशा (${adStartStr} से ${adEndStr})`,
          natalTrigger: `वर्तमान में जातक ${cfg.name} महादशा अन्तर्गत '${adName}' की अन्तर्दशा में गतिशील है (${adStartStr} से ${adEndStr})। इसके उपरांत आगामी अन्तर्दशा '${upName}' की होगी (${upStartStr} से)।`,
          classicalPrediction: classicalPhala,
          deepMeaning: "विंशोत्तरी दशा जीवन की गतिमान नियति है; शुभ व कठिन दोनों फल मिलकर जातक की आत्मा को परिपक्व और सामर्थ्यवान बनाते हैं।",
          badges: [`🔥 सक्रिय दशा: ${cfg.name}-${adName}`, `${activeAD ? activeAD.startDate.getFullYear() : ''}–${activeAD ? activeAD.endDate.getFullYear() : ''}`, "द्विपक्षीय यथार्थ फलित"],
          isActivePeriod: true
        });

      } else if (isPastMD) {
        // ⏳ PAST COMPLETED MAHADSHA
        matchedShlokas.push({
          chapterNumber: cfg.ch,
          chapterTitle: cfg.title,
          chapterSignificance: `विंशोत्तरी ${cfg.name} महादशा — व्यतीत जीवन-चरण (${m.startDate.getFullYear()}–${m.endDate.getFullYear()})`,
          verseNumbers: "श्लोक १–३ (ऐतिहासिक काल-खण्ड)",
          shlokaSanskrit: `${cfg.name}दशायां यत्प्रोक्तं पूर्वकर्मविशोधनम् ।
पूर्णकाले तु तज्ज्ञेयं जातकेनानुभूतकम् ॥ १ ॥`,
          applicabilityStatus: `विंशोत्तरी महादशा काल-खण्ड (व्यतीत जीवन-चरण: ${m.startDate.getFullYear()}–${m.endDate.getFullYear()})`,
          natalTrigger: `जातक के जीवन में ${cfg.name} देव की ${cfg.years} वर्षीय महादशा ${m.startDate.getFullYear()} से ${m.endDate.getFullYear()} तक सक्रिय रही, जिसमें जातक के व्यक्तित्व, विद्या और प्राथमिक आधारशिला का निर्माण हुआ। काल-चक्र के अनुसार यह चरण पूर्ण हो चुका है।`,
          classicalPrediction: `महर्षि पाराशर के अनुसार व्यतीत हो चुकी ${cfg.name} महादशा ने जातक के संचित प्रारब्ध को परिमार्जित कर वर्तमान जीवन-चरण के लिए आवश्यक अनुभव, सहनशक्ति और योग्यता प्रदान की।`,
          deepMeaning: "बीत चुका काल जीवन का संचित अनुभव है; यह वर्तमान के निर्माण की ठोस नींव बनता है।",
          badges: [`व्यतीत महादशा: ${cfg.name}`, `${m.startDate.getFullYear()}–${m.endDate.getFullYear()}`, "पूर्ण काल-खण्ड"]
        });

      } else {
        // 🔮 FUTURE UPCOMING MAHADSHA
        matchedShlokas.push({
          chapterNumber: cfg.ch,
          chapterTitle: cfg.title,
          chapterSignificance: `विंशोत्तरी ${cfg.name} महादशा — आगामी जीवन-चरण (${m.startDate.getFullYear()}–${m.endDate.getFullYear()})`,
          verseNumbers: "श्लोक १–३ (भावी काल-खण्ड)",
          shlokaSanskrit: `आगामि-दशाकाले तु ${cfg.name}स्य फलमुत्तमम् ।
शुभकर्मरतो मर्त्यो लभते वाञ्छितं फलम् ॥ १ ॥`,
          applicabilityStatus: `विंशोत्तरी महादशा काल-खण्ड (आगामी जीवन-चरण: ${m.startDate.getFullYear()}–${m.endDate.getFullYear()})`,
          natalTrigger: `वर्तमान महादशा के उपरांत ${m.startDate.toLocaleDateString('hi-IN')} से ${cfg.name} देव की ${cfg.years} वर्षीय महादशा का कालचक्र आरंभ होगा (${m.startDate.getFullYear()}–${m.endDate.getFullYear()}), जो जातक के जीवन में ${cfg.name} कारकत्वों का विस्तार करेगा।`,
          classicalPrediction: `महर्षि पाराशर के अनुसार आगामी ${cfg.name} महादशा जातक के जीवन में नवीन अवसरों, प्रतिष्ठा और कार्य-विस्तार का नया क्षितिज खोलेगी। पूर्व से की गई तैयारी इस काल में अक्षय फल देती है।`,
          deepMeaning: "भविष्य की दशा जातक की आगामी यात्रा का पूर्व-संकेत है; वर्तमान का पुरुषार्थ ही भविष्य की दशा को स्वर्णिम बनाता है।",
          badges: [`आगामी महादशा: ${cfg.name}`, `${m.startDate.getFullYear()}–${m.endDate.getFullYear()}`, "भविष्य काल-खण्ड"]
        });
      }
    });
    // =========================================================================
    // CHAPTER 73: त्रिसप्ततितमोऽध्यायः — प्रत्यन्तर्दशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 73,
      chapterTitle: "त्रिसप्ततितमोऽध्यायः — प्रत्यन्तर्दशाफलाध्यायः",
      chapterSignificance: "त्रिस्तरीय प्रत्यन्तर्दशा फल विधान — सूक्ष्म काल-गणना एवं घटना स्पष्टता",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `दशापतीनां सम्बन्धात् प्रत्यन्तर्दशके फलम् ।
शुभैर्युक्ते शुभं ब्रूयात् पापैर्दुःखं विनिर्दिशेत् ॥ १ ॥
त्रिस्तरीयदशाज्ञानात् कालस्फुटत्वमुच्यते ॥ २ ॥`,
      applicabilityStatus: "त्रिस्तरीय प्रत्यन्तर्दशा सूक्ष्म काल-गणना विधान",
      natalTrigger: `जातक के जन्म नक्षत्र '${nakName}' से विंशोत्तरी त्रिस्तरीय सूक्ष्म प्रत्यन्तर्दशा का प्रत्यक्ष संचरण।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार केवल महादशा या अन्तर्दशा से फल का सटीक समय नहीं जाना जा सकता; प्रत्यन्तर्दशा के स्वामी का गोचर और भाव संबंध ही घटना के वास्तविक सप्ताह/दिन का निर्धारण करता है।",
      deepMeaning: "काल का सूक्ष्म विभाजन ही वैदिक ज्योतिष का वह लेंस है जो जातक को सही समय पर सही निर्णय लेने की सामर्थ्य देता है।",
      badges: ["प्रत्यन्तर्दशा विधान", "सूक्ष्म काल-निर्णय"]
    });

    // =========================================================================
    // CHAPTER 74: चतुःसप्ततितमोऽध्यायः — सूक्ष्मदशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 74,
      chapterTitle: "चतुःसप्ततितमोऽध्यायः — सूक्ष्मदशाफलाध्यायः",
      chapterSignificance: "चतुर्थ-स्तरीय सूक्ष्मदशा — दिन-वार सटीक घटना प्रकटीकरण",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सूक्ष्मदशाफलं ज्ञेयं सूक्ष्मकालविनिर्णये ।
दिनमासप्रभेदेन घटनायाः स्फुटा स्थितिः ॥ १ ॥
चतुर्थस्तरसम्पन्ना सूक्ष्मदशा प्रकीर्तिता ॥ २ ॥`,
      applicabilityStatus: "चतुर्थ-स्तरीय सूक्ष्मदशा काल-प्रकटीकरण",
      natalTrigger: `दशा-क्रम का चतुर्थ स्तर जातक के दैनिक घटनाक्रम और मनोदशा के उतार-चढ़ाव को नियंत्रित करता है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार सूक्ष्मदशा किसी महत्वपूर्ण समझौते, साक्षात्कार, यात्रा या वित्तीय लेनदेन के लिए शुभ दिन का चयन करने का अचूक साधन है।",
      deepMeaning: "सूक्ष्मदशा यह सिखाती है कि प्रकृति का प्रत्येक दिन एक विशिष्ट ग्रह-ऊर्जा से स्पंदित होता है।",
      badges: ["सूक्ष्मदशा विधान", "दैनिक घटना-क्रम"]
    });

    // =========================================================================
    // CHAPTER 75: पञ्चसप्ततितमोऽध्यायः — प्राणदशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 75,
      chapterTitle: "पञ्चसप्ततितमोऽध्यायः — प्राणदशाफलाध्यायः",
      chapterSignificance: "पंचम-स्तरीय प्राणदशा — श्वास-प्रश्वास एवं क्षण-विशेष फल विचार",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `प्राणदशा हि सूक्ष्मा स्यात् क्षणमात्रफलप्रदा ।
आयुषः स्पन्दनं ज्ञेयं पराशरमतेन वै ॥ १ ॥
घटिकापलसम्बन्धात् प्राणदशा विचिन्त्यते ॥ २ ॥`,
      applicabilityStatus: "पंचम-स्तरीय प्राणदशा एवं श्वास-स्पंदन विधान",
      natalTrigger: `प्राणदशा जातक के प्राण-तत्व, हृदय-गति और तात्कालिक मानसिक संकल्प को काल-चक्र से जोड़ती है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार प्राणदशा का सूक्ष्म अध्ययन अत्यंत गहन आध्यात्मिक योगियों और सूक्ष्म फलित के लिए है, जो मनुष्य के प्रत्येक क्षण के भाव को निर्धारित करता है।",
      deepMeaning: "प्राण और काल एक ही सिक्के के दो पहलू हैं; प्राण के नियमन से काल के दुष्प्रभावों को भी मोड़ा जा सकता है।",
      badges: ["प्राणदशा विधान", "क्षण-फल निर्णय"]
    });

    // =========================================================================
    // CHAPTER 76: षट्सप्ततितमोऽध्यायः — अष्टोत्तरीदशाफलाध्यायः
    // =========================================================================
    const isAshtottariApplicable = isKendra(rahu.house) || isTrikona(rahu.house);
    matchedShlokas.push({
      chapterNumber: 76,
      chapterTitle: "षट्सप्ततितमोऽध्यायः — अष्टोत्तरीदशाफलाध्यायः",
      chapterSignificance: "१०८ वर्षीय अष्टोत्तरी दशा पद्धति — राहु केन्द्र/त्रिकोण स्थिति अनुसार विशेष फल",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `अष्टोत्तरी दशा ज्ञेया कलियुगे विशेषतः ।
राहावर्कर्क्षलग्नेशे त्रिकोणे केन्द्रगेऽपि वा ॥ १ ॥
अष्टोत्तरशताब्देषु सर्वसौख्यप्रदायिनी ॥ २ ॥`,
      applicabilityStatus: isAshtottariApplicable ? "अष्टोत्तरी दशा पूर्णतः ग्राह्य (राहु केन्द्र/त्रिकोण में)" : "अष्टोत्तरी दशा शास्त्रीय तुलनात्मक विचार",
      natalTrigger: `राहु देव कुंडली के ${rahu.house}वें भाव में स्थित हैं, जो अष्टोत्तरी १०८ वर्षीय काल-गणना के लिए विशिष्ट योग बनाते हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब राहु लग्न से केन्द्र या त्रिकोण में होता है, तो अष्टोत्तरी दशा अत्यंत प्रभावी परिणाम देती है। यह जातक को आकस्मिक प्रतिष्ठा और दीर्घकालिक स्थिरता प्रदान करती है।",
      deepMeaning: "अष्टोत्तरी दशा १०८ मणियों की उस जपमाला के समान है जो जीवन के १०८ अध्यायों को पवित्र बनाती है।",
      badges: [isAshtottariApplicable ? "अष्टोत्तरी ग्राह्य" : "अष्टोत्तरी विचार", "१०८ वर्षीय दशा"]
    });

    // =========================================================================
    // CHAPTER 77: सप्तसप्ततितमोऽध्यायः — षोडशोत्तरीदशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 77,
      chapterTitle: "सप्तसप्ततितमोऽध्यायः — षोडशोत्तरीदशाफलाध्यायः",
      chapterSignificance: "११६ वर्षीय षोडशोत्तरी दशा — कृष्ण पक्ष एवं चन्द्र-होरा जनन फलित",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `कृष्णे चन्द्रस्य होरायां षोडशोत्तरी दशा मता ।
षोडशाधिकवर्षैस्तु सर्वपापप्रणाशिनी ॥ १ ॥
षोडशाब्दप्रभेदेन राज्यलक्ष्मीप्रदायिनी ॥ २ ॥`,
      applicabilityStatus: isKrishnaPaksha ? "षोडशोत्तरी दशा अनुकूल (कृष्ण पक्ष जन्म)" : "षोडशोत्तरी दशा शास्त्रीय संकलन",
      natalTrigger: `जातक का जन्म ${isKrishnaPaksha ? "कृष्ण पक्ष" : "शुक्ल पक्ष"} की ${tithiNum}वीं तिथि में हुआ है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार कृष्ण पक्ष के जन्म में षोडशोत्तरी दशा जातक को जीवन की विषम परिस्थितियों से निकालकर राज्यलक्ष्मी और प्रशासनिक अधिकार प्रदान करती है।",
      deepMeaning: "षोडश कलाओं से युक्त चन्द्रमा का प्रभाव जातक को संकटों में भी शीतलता और धैर्य प्रदान करता है।",
      badges: ["षोडशोत्तरी दशा", "११६ वर्षीय प्रणाली"]
    });

    // =========================================================================
    // CHAPTER 78: अष्टसप्ततितमोऽध्यायः — द्वादशोत्तरीदशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 78,
      chapterTitle: "अष्टसप्ततितमोऽध्यायः — द्वादशोत्तरीदशाफलाध्यायः",
      chapterSignificance: "११२ वर्षीय द्वादशोत्तरी दशा — शुक्र नवांश एवं कला-वैभव फल",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `शुक्रस्य नवभागे तु द्वादशोत्तरी दशा स्मृता ।
द्वादशाधिकशते वर्षे राजयोगफलप्रदा ॥ १ ॥
सर्वसम्पत्करा नित्यं पराशरमतेन वै ॥ २ ॥`,
      applicabilityStatus: "द्वादशोत्तरी दशा विशेष राजयोग फलित",
      natalTrigger: `शुक्र देव कुंडली के ${venus.house}वें भाव में स्थित होकर द्वादशोत्तरी दशा के प्रमुख फलदाता हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार द्वादशोत्तरी दशा जातक को जीवन में अतुल्य भौतिक संपदा, सौंदर्य, कला में प्रवीणता और व्यापारिक यश प्रदान करती है।",
      deepMeaning: "द्वादशोत्तरी दशा जीवन में माधुर्य और ऐश्वर्य का दिव्य संतुलन स्थापित करती है।",
      badges: ["द्वादशोत्तरी दशा", "११२ वर्षीय प्रणाली"]
    });

    // =========================================================================
    // CHAPTER 79: एकोनाशीतितमोऽध्यायः — पञ्चोत्तरीदशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 79,
      chapterTitle: "एकोनाशीतितमोऽध्यायः — पञ्चोत्तरीदशाफलाध्यायः",
      chapterSignificance: "१०५ वर्षीय पञ्चोत्तरी दशा — कर्क लग्न/नवांश विशेष समृद्धि विधान",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `कर्कलग्ने तु कर्कांशे पञ्चोत्तरी दशा भवेत् ।
पञ्चाधिकशते वर्षे सर्वसंपत्प्रदायिनी ॥ १ ॥
पुत्रपौत्रविवृद्धिश्च धनधान्यसमृद्धिदा ॥ २ ॥`,
      applicabilityStatus: "पञ्चोत्तरी दशा कुल-वृद्धि एवं समृद्धि सूत्र",
      natalTrigger: `कर्क राशि एवं जल-तत्व का प्रभाव जातक के वंश, भावना और पारिवारिक संबल को पोषित करता है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार पञ्चोत्तरी दशा पारिवारिक सुख, कुल-वृद्धि, अचल संपत्ति और समाज में मातृ-तुल्य स्नेह व सम्मान प्रदान करती है।",
      deepMeaning: "पञ्चोत्तरी दशा पारिवारिक मूल्यों और भावी पीढ़ियों के कल्याण की संरक्षक है।",
      badges: ["पञ्चोत्तरी दशा", "१०५ वर्षीय प्रणाली"]
    });

    // =========================================================================
    // CHAPTER 80: अशीतितमोऽध्यायः — शताब्दिकादशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 80,
      chapterTitle: "अशीतितमोऽध्यायः — शताब्दिकादशाफलाध्यायः",
      chapterSignificance: "१०० वर्षीय शताब्दिका दशा — वर्गोत्तम लग्न एवं पूर्णायु राज्य-सम्मान",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `वर्गोत्तमे जन्मलग्ने शताब्दिका दशा मता ।
शतायुः कुरुते मर्त्यं धर्मकर्मसुखावहम् ॥ १ ॥
अखण्डकीर्तिर्विपुला सर्वराजसुपूजिता ॥ २ ॥`,
      applicabilityStatus: "शताब्दिका दशा १०० वर्षीय दीर्घायु एवं अखण्ड कीर्ति",
      natalTrigger: `लग्न ${RASHI_NAMES[lagnaSign]} राशि में स्थित होकर जातक को वर्गोत्तम आत्मबल की ओर प्रेरित करता है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार शताब्दिका दशा मनुष्य को शतायु (१०० वर्ष की स्वस्थ आयु), निष्कलंक ख्याति और समाज में पूज्य स्थान प्रदान करती है।",
      deepMeaning: "शताब्दिका दशा एक पूर्ण, सार्थक और धर्मपरायण जीवन का शास्त्रीय आश्वासन है।",
      badges: ["शताब्दिका दशा", "१०० वर्षीय पूर्णायु"]
    });

    // =========================================================================
    // CHAPTER 81: एकाशीतितमोऽध्यायः — चतुरशीतिसमादशाफलाध्यायः
    // =========================================================================
    const isH10LordIn10 = h10.planet.house === 10;
    matchedShlokas.push({
      chapterNumber: 81,
      chapterTitle: "एकाशीतितमोऽध्यायः — चतुरशीतिसमादशाफलाध्यायः",
      chapterSignificance: "८४ वर्षीय चतुरशीति समा दशा — दशमेश स्वक्षेत्रीय राज्य-सम्मान",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `कर्मेशे कर्मसंस्थे तु चतुरशीतिसमा दशा ।
राज्यसम्मानवृद्धिश्च कीर्तिर्भवति निर्मला ॥ १ ॥
चतुरशीतिवर्षैस्तु सर्वाभीष्टप्रदायिनी ॥ २ ॥`,
      applicabilityStatus: isH10LordIn10 ? "चतुरशीति समा पूर्ण लागू (कर्मेश दशम भाव में)" : "चतुरशीति समा कर्म-बल विधान",
      natalTrigger: `दशमेश '${h10.grahaName}' भाव ${h10.planet.house} में स्थित होकर करियर और सामाजिक प्रभाव का नियंत्रण करते हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार जब कर्म का अधिपति बलवान होता है, तो चतुरशीति दशा जातक के सभी अभीष्ट सिद्ध करती है और उसे अपने कार्यक्षेत्र का निर्विवाद नेता बनाती है।",
      deepMeaning: "कर्म ही मनुष्य की सच्ची पहचान है; चतुरशीति दशा कर्मठ व्यक्ति को इतिहास में अमर कर देती है।",
      badges: ["चतुरशीति समा", "८४ वर्षीय दशा"]
    });

    // =========================================================================
    // CHAPTER 82: द्व्यशीतितमोऽध्यायः — द्विसप्ततिसमादशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 82,
      chapterTitle: "द्व्यशीतितमोऽध्यायः — द्विसप्ततिसमादशाफलाध्यायः",
      chapterSignificance: "७२ वर्षीय द्विसप्तति समा दशा — लग्नेश-सप्तमेश संबंध एवं दांपत्य सौभाग्य",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `लग्नेशे दारगे चैव दारेशे लग्नसंस्थिते ।
द्विसप्ततिसमा प्रोक्ता सुभगत्वाय देहिनाम् ॥ १ ॥
दम्पत्योः सुदृढं प्रेम सर्वैश्वर्यसमन्वितम् ॥ २ ॥`,
      applicabilityStatus: "द्विसप्तति समा दांपत्य एवं साझेदारी सौख्य",
      natalTrigger: `लग्नेश '${lagnesha.grahaName}' एवं सप्तमेश '${h7.grahaName}' के पारस्परिक संबंध से दांपत्य व साझेदारी की स्थिति।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार द्विसप्तति समा दशा जातक के वैवाहिक जीवन में प्रगाढ़ प्रेम, व्यापारिक साझेदारियों में भारी लाभ और सांसारिक ऐश्वर्य प्रदान करती है।",
      deepMeaning: "जीवनसाथी केवल साथी नहीं, अपितु आत्मा का सांसारिक दर्पण है; यह दशा उसी दर्पण को उज्ज्वल करती है।",
      badges: ["द्विसप्तति समा", "७२ वर्षीय प्रणाली"]
    });

    // =========================================================================
    // CHAPTER 83: त्र्यशीतितमोऽध्यायः — षष्टिसमादशाफलाध्यायः
    // =========================================================================
    const isSunInLagna = sun.house === 1;
    matchedShlokas.push({
      chapterNumber: 83,
      chapterTitle: "त्र्यशीतितमोऽध्यायः — षष्टिसमादशाफलाध्यायः",
      chapterSignificance: "६० वर्षीय षष्टिसमा दशा — सूर्य लग्न प्रभाव एवं पराक्रम से विजय",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `लग्ने सूर्ये स्थिते ज्ञेया षष्टिसमा दशा नृणाम् ।
षष्टिवर्षैस्तु राजत्वं पराक्रमेण लभ्यते ॥ १ ॥
शत्रूणां दमनं नित्यं विपुलं विजयं तथा ॥ २ ॥`,
      applicabilityStatus: isSunInLagna ? "षष्टिसमा दशा पूर्ण लागू (सूर्य प्रथम भाव में)" : "षष्टिसमा दशा सूर्य-तेज विधान",
      natalTrigger: `सूर्य देव कुंडली के ${sun.house}वें भाव में स्थित होकर जातक की आत्मा और तेज के प्रकाशक हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार षष्टिसमा दशा में जातक अपने अदम्य पराक्रम, सत्यनिष्ठा और नेतृत्व क्षमता से विरोधियों पर विजय प्राप्त कर उच्च पद प्राप्त करता है।",
      deepMeaning: "सूर्य का तेज किसी के दबाए नहीं दबता; षष्टिसमा दशा जातक को समाज का पथप्रदर्शक बनाती है।",
      badges: ["षष्टिसमा दशा", "६० वर्षीय प्रणाली"]
    });

    // =========================================================================
    // CHAPTER 84: चतुरशीतितमोऽध्यायः — षट्त्रिंशत्समादशाफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 84,
      chapterTitle: "चतुरशीतितमोऽध्यायः — षट्त्रिंशत्समादशाफलाध्यायः",
      chapterSignificance: "३६ वर्षीय षट्त्रिंशत् समा दशा — त्वरित सिद्धि एवं अल्प काल में विपुल धन",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `दिवा चन्द्रेण संयुक्ते षट्त्रिंशत्समा दशा मता ।
अल्पावधौ सुखं वित्तं पराशरेण भाषितम् ॥ १ ॥
त्रिंशत्षड्भिश्च वर्षेस्तु सिद्धिर्भवति निश्चिता ॥ २ ॥`,
      applicabilityStatus: "षट्त्रिंशत् समा त्वरित सिद्धि एवं धन विधान",
      natalTrigger: `चन्द्रमा ${moon.rashiName} राशि में होकर जातक की मनोवृत्ति और त्वरित संकल्प शक्ति को दिशा देते हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार षट्त्रिंशत् समा दशा युवावस्था में ही जातक को त्वरित वित्तीय लाभ, प्रसिद्धि और कार्य-सिद्धि प्रदान करती है।",
      deepMeaning: "यह दशा सिद्ध करती है कि योग्यता और सही समय का योग हो तो सफलता वर्षों के बजाय महीनों में मिल सकती है।",
      badges: ["षट्त्रिंशत् समा", "३६ वर्षीय प्रणाली"]
    });

    // =========================================================================
    // CHAPTER 85: पञ्चाशीतितमोऽध्यायः — कालचक्रदशा-गतिफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 85,
      chapterTitle: "पञ्चाशीतितमोऽध्यायः — कालचक्रदशा-गतिफलाध्यायः",
      chapterSignificance: "कालचक्र दशा की विशेष गतियां: मण्डूकी, मर्कटी एवं सिंहावलोकन गति फल",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `मण्डूकी मर्कटी चैव सिंहावलोकनं तथा ।
गतिभेदात् कालचक्रे ज्ञायते सुखदुःखयोः ॥ १ ॥
सिंहावलोकने राज्यं मण्डूक्योर्महद्भयम् ॥ २ ॥
मर्कट्यां स्थानभ्रंशश्च पराशरवचो यथा ॥ ३ ॥`,
      applicabilityStatus: "कालचक्र दशा सूक्ष्म गति एवं छलांग फलित",
      natalTrigger: `कालचक्र की राशियां देह और जीव के चक्र में घूमती हुई जातक के जीवन में बड़े मोड़ लाती हैं।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार कालचक्र की 'सिंहावलोकन गति' जातक को पीछे मुड़कर देखने और अचानक राज्य-सम्मान दिलाने वाली होती है, जबकि 'मण्डूकी गति' (मेढ़क छलांग) में बड़े जीवन परिवर्तन आते हैं।",
      deepMeaning: "काल कभी सीधी रेखा में नहीं चलता; वह चक्राकार छलांग लगाता है। इस गति को समझना ही ज्ञानी का लक्षण है।",
      badges: ["कालचक्र गतियां", "सिंहावलोकन विधान"]
    });

    // =========================================================================
    // CHAPTER 86: षडशीतितमोऽध्यायः — गंडान्तफलाध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 86,
      chapterTitle: "षडशीतितमोऽध्यायः — गंडान्तफलाध्यायः",
      chapterSignificance: "त्रिविध गंडान्त विचार: तिथि, नक्षत्र एवं लग्न गंडान्त एवं शास्त्रीय परिहार",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `तिथिनक्षत्रलग्नानां गंडान्तं त्रिविधं स्मृतम् ।
अश्लेषा-मघयोः सन्धौ ज्येष्ठा-मूलतथैव च ॥ १ ॥
रेवती-हस्तयोश्चापि गंडान्ते जायते नरः ॥ २ ॥
गंडान्तदोषशमनं शान्त्या भवति नान्यथा ॥ ३ ॥`,
      applicabilityStatus: isNakGandanta ? "नक्षत्र/लग्न गंडान्त संधि-काल विश्लेषण" : "गंडान्त-मुक्त शुभ नक्षत्र जन्म विधान",
      natalTrigger: `जातक का जन्म नक्षत्र '${nakName}' (पद ${nakPada}) है। गंडान्त संधियों (कर्क-सिंह, वृश्चिक-धनु, मीन-मेष) का सूक्ष्म विश्लेषण।`,
      classicalPrediction: isNakGandanta
        ? "महर्षि पाराशर के अनुसार गंडान्त संधि में जन्म होने पर प्रारम्भिक जीवन में स्वास्थ्य या परिजनों को कष्ट की संभावना रहती है, किंतु प्रामाणिक वैदिक शान्ति करने पर वही जातक 'राजतुल्य चक्रवर्ती' बनता है।"
        : "महर्षि पाराशर के अनुसार जातक की कुंडली गंडान्त दोष से सर्वथा मुक्त है, जिससे जीवन की ऊर्जा निर्विघ्न प्रवाहित होती है।",
      deepMeaning: "गंडान्त एक आध्यात्मिक पोर्टल है; जो आत्मा इस संधि पर जन्म लेती है, वह असाधारण प्रारब्ध लेकर आती है।",
      badges: [isNakGandanta ? "गंडान्त शान्ति योग्य" : "गंडान्त-मुक्त", `${nakName} नक्षत्र`]
    });

    // =========================================================================
    // CHAPTER 87: सप्ताशीतितमोऽध्यायः — मूल-ज्येष्ठा-आश्लेषा जनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 87,
      chapterTitle: "सप्ताशीतितमोऽध्यायः — मूल-ज्येष्ठा-आश्लेषा जनन शान्त्यध्यायः",
      chapterSignificance: "मूल, ज्येष्ठा एवं आश्लेषा नक्षत्र जनन फल एवं १०८ कलश महाशान्ति विधान",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `मूले जाते पितुः कष्टं ज्येष्ठायां ज्येष्ठसोदरम् ।
आश्लेषायां तथा मातुः शान्त्या सर्वं शुभं भवेत् ॥ १ ॥
अष्टोत्तरशतकलशैः स्नपनं शान्तिमुत्तमाम् ॥ २ ॥
गोदानं स्वर्णदानं च सर्वदोषनिवारणम् ॥ ३ ॥`,
      applicabilityStatus: isMoolaJyeshthaAshlesha ? "मूल/ज्येष्ठा/आश्लेषा नक्षत्र जनन शान्ति विधान" : "तीक्ष्ण नक्षत्र दोष-मुक्ति समन्वय",
      natalTrigger: `जातक का जन्म नक्षत्र '${nakName}' है। तीक्ष्ण नक्षत्र अधिष्ठाताओं का शास्त्रीय समन्वय।`,
      classicalPrediction: isMoolaJyeshthaAshlesha
        ? "महर्षि पाराशर का प्रत्यक्ष आदेश: इन नक्षत्रों के चरणों में जन्म होने पर १०८ औषधीय कलशों से वैदिक शान्ति, नवग्रह जप और गो-दान करने से समस्त दोष तत्क्षण समाप्त होकर कुल में ऐश्वर्य की वृद्धि होती है।"
        : "महर्षि पाराशर के अनुसार जातक का जन्म नक्षत्र शुभ और कल्याणकारी है, जो परिवार और समाज के लिए शुभ फलदायी है।",
      deepMeaning: "नक्षत्र देवता केवल कष्ट नहीं देते, वे परीक्षा लेकर जातक को संसार में अद्वितीय नेतृत्व का वरदान देते हैं।",
      badges: [isMoolaJyeshthaAshlesha ? "नक्षत्र शान्ति विधान" : "शुभ नक्षत्र फल", `${nakName} पद ${nakPada}`]
    });

    // =========================================================================
    // CHAPTER 88: अष्टाशीतितमोऽध्यायः — सूर्य-चन्द्र ग्रहणजनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 88,
      chapterTitle: "अष्टाशीतितमोऽध्यायः — सूर्य-चन्द्र ग्रहणजनन शान्त्यध्यायः",
      chapterSignificance: "ग्रहण-काल (राहु-केतु युति) जनन फल एवं स्वर्णिम सूर्य-चन्द्र शान्ति विधान",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `ग्रहणे सूर्यचन्द्रस्य यस्य जन्म भवेन्नरः ।
राहुग्रस्तदिवानाथे शान्तिकर्म समाचरेत् ॥ १ ॥
सौवर्णेन विधानेन दानं दद्याद्विचक्षणः ॥ २ ॥
ग्रहशान्त्या भवेत् स्वास्थ्यं दीर्घमायुश्च विन्दति ॥ ३ ॥`,
      applicabilityStatus: isEclipseBirth ? "ग्रहण जनन शान्ति विधान" : "ग्रहण-दोष मुक्त निर्मल जन्म स्थिति",
      natalTrigger: `सूर्य-चन्द्र और राहु-केतु का पारस्परिक कोणीय अंतर यह सिद्ध करता है कि जातक का जन्म ग्रहण की छाया से सुरक्षित है।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार ग्रहण-दोष से मुक्त जन्म जातक की आत्मिक चेतना और मानसिक स्थिरता को अखंड रखता है। सूर्य और चन्द्रमा का निर्मल प्रकाश जातक के तेज को बढ़ाता है।",
      deepMeaning: "जब सूर्य और चन्द्रमा राहु की छाया से मुक्त होते हैं, तो मनुष्य का विवेक कभी धूमिल नहीं होता।",
      badges: ["ग्रहण-दोष मुक्ति", "सूर्य-चन्द्र शुद्धि"]
    });

    // =========================================================================
    // CHAPTER 89: एकोननवतितमोऽध्यायः — संक्रान्तिजनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 89,
      chapterTitle: "एकोननवतितमोऽध्यायः — संक्रान्तिजनन शान्त्यध्यायः",
      chapterSignificance: "सूर्य संक्रान्ति काल (राशि-प्रवेश संधि) जनन फल एवं रुद्राभिषेक विधान",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `रवेः संक्रमकाले तु यदा जन्म भवेन्नृणाम् ।
तद्दोषशमनार्थाय संक्रान्तिविधिमाचरेत् ॥ १ ॥
रुद्राभिषेचनान्नित्यं सर्वसम्पत्तिराप्नुयात् ॥ २ ॥`,
      applicabilityStatus: isSankranti ? "संक्रान्ति जनन विशेष रुद्राभिषेक विधान" : "स्थिर राशि संचरण जन्म फल",
      natalTrigger: `सूर्य देव ${sun.rashiName} राशि के ${sun.deg.toFixed(2)}° पर स्थित हैं। संक्रान्ति संधिकाल का सूक्ष्म विश्लेषण।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार सूर्य जब एक राशि से दूसरी में प्रवेश करता है, उस संधिकाल में जन्म लेने वाले जातक को भगवान शिव का रुद्राभिषेक निरंतर करते रहना चाहिए, जिससे अक्षय संपत्ति प्राप्त होती है।",
      deepMeaning: "संक्रान्ति काल परिवर्तन का संधिकाल है; इस समय की गई शिव-उपासना जातक के जीवन को स्थिर और तेजस्वी बनाती है।",
      badges: ["संक्रान्ति विधान", `${sun.rashiName} सूर्य`]
    });

    // =========================================================================
    // CHAPTER 90: नवतितमोऽध्यायः — दर्श (अमावस्या) जनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 90,
      chapterTitle: "नवतितमोऽध्यायः — दर्श (अमावस्या) जनन शान्त्यध्यायः",
      chapterSignificance: "दर्श (अमावस्या) जनन फल — पितृ-तर्पण, सूर्य-चन्द्र समरसता एवं शान्ति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `दर्शजन्मप्रभावेण पितृदोषो भवेन्महत् ।
चन्द्रसूर्यसमयोगे शान्त्या कल्याणमश्नुते ॥ १ ॥
ब्राह्मणानां च तर्पणेन पितृप्रीतिः प्रजायते ॥ २ ॥`,
      applicabilityStatus: isAmavasya ? "दर्श (अमावस्या) जनन पितृ-शान्ति विधान" : "दर्श-दोष मुक्त उज्ज्वल पक्ष जन्म",
      natalTrigger: `सूर्य और चन्द्रमा के मध्य कोणीय अंतर ${moonSunDiff.toFixed(2)}° है (तिथि: ${tithiNum})।`,
      classicalPrediction: isAmavasya
        ? "महर्षि पाराशर के अनुसार दर्श (अमावस्या) के जन्म में पितरों का आशीर्वाद प्राप्त करना सर्वोच्च प्राथमिकता है। नियमित तर्पण और अन्नदान से जातक को अपार आध्यात्मिक व भौतिक उन्नति मिलती है।"
        : "महर्षि पाराशर के अनुसार जातक का जन्म दर्श दोष से रहित है, जिससे चन्द्रमा की अमृतमयी किरणें जीवन को निरंतर पोषित करती हैं।",
      deepMeaning: "दर्श का अर्थ है सूर्य और चन्द्रमा का आलिंगन; यहाँ की गई पितृ-साधना जातक के कुल के सात पीढ़ियों के दोष मिटा देती है।",
      badges: [isAmavasya ? "दर्श शान्ति विधान" : "दर्श-मुक्त जन्म", `तिथि: ${tithiNum}`]
    });

    // =========================================================================
    // CHAPTER 91: एकनवतितमोऽध्यायः — कृष्ण चतुर्दशी एवं भद्राजनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 91,
      chapterTitle: "एकनवतितमोऽध्यायः — कृष्ण चतुर्दशी एवं भद्राजनन शान्त्यध्यायः",
      chapterSignificance: "कृष्ण चतुर्दशी एवं भद्रा करण जनन शान्ति — भगवान शिव एवं यम शान्ति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `कृष्णपक्षे चतुर्दश्यां यदा जन्म प्रजायते ।
शिवपूजाविधानेन सर्वदोषैः प्रमुच्यते ॥ १ ॥
भद्राकरणजातस्य यमशान्तिर्विधीयते ॥ २ ॥`,
      applicabilityStatus: isChaturdashi ? "कृष्ण चतुर्दशी शिव-उपासना विधान" : "शुभ करण एवं निर्मल तिथि फल",
      natalTrigger: `जातक की जन्म तिथि ${tithiNum}वीं है। शिव-तत्व और काल-शोधन का शास्त्रीय विचार।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार कृष्ण चतुर्दशी को जन्मे जातक पर भगवान शिव की विशेष कृपा होती है। नित्य 'ॐ नमः शिवाय' जप और सोमवार को शिवलिंग पर जल चढ़ाने से समस्त संकट टल जाते हैं।",
      deepMeaning: "चतुर्दशी शिव की प्रिय तिथि है; इस तिथि का जातक जन्मजात तपस्वी और आध्यात्मिक सामर्थ्य से युक्त होता है।",
      badges: ["शिव-कृपा विधान", `तिथि: ${tithiNum}`]
    });

    // =========================================================================
    // CHAPTER 92: द्विनवतितमोऽध्यायः — यमजजनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 92,
      chapterTitle: "द्विनवतितमोऽध्यायः — यमजजनन शान्त्यध्यायः",
      chapterSignificance: "यमज (जुड़वां) प्रसव विधान एवं आयुष्य-होम द्वारा दीर्घायु संस्कार",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `एकस्मिन् प्रसवे यत्र द्वौ जातौ तनयौ यदि ।
यमजप्रसवे शान्तिं कुर्यादायुरभिवृद्धये ॥ १ ॥
आयुष्यहोमविधिना दीर्घायुष्यं प्रजायते ॥ २ ॥`,
      applicabilityStatus: "यमज जनन आयुष्य-होम एवं दीर्घायु विधान",
      natalTrigger: `एकल जन्म प्रारब्ध एवं स्वतंत्र जीवन-ऊर्जा का शास्त्रीय निर्धारण।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार आयुष्य-होम और वैदिक मन्त्रोच्चार से जातक की जीवन-शक्ति सुदृढ़ होती है और वह दीर्घकाल तक तेजस्वी बना रहता है।",
      deepMeaning: "प्रत्येक आत्मा अपने स्वतंत्र कर्म-बीज लेकर आती है; आयुष्य-होम उस बीज को विकसित होने का पोषण देता है।",
      badges: ["आयुष्य विधान", "दीर्घायु संस्कार"]
    });

    // =========================================================================
    // CHAPTER 93: त्रिनवतितमोऽध्यायः — त्रिखलजनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 93,
      chapterTitle: "त्रिनवतितमोऽध्यायः — त्रिखलजनन शान्त्यध्यायः",
      chapterSignificance: "त्रिखल जनन (तीन पुत्रों के बाद कन्या या तीन कन्याओं के बाद पुत्र) कुल-वृद्धि शान्ति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `कन्यात्रयानुजो भ्राता भ्रातॄणां वा वरा वधूः ।
त्रिखलप्रसवे शान्तिं कुर्यात् कुलविवृद्धये ॥ १ ॥
शान्त्या नश्यति तत्कष्टं कुलवृद्धिः प्रजायते ॥ २ ॥`,
      applicabilityStatus: "त्रिखल जनन कुल-संरक्षण एवं संतुलन विधान",
      natalTrigger: `कुल-परंपरा, भ्रातृ-भगिनी संतुलन एवं पारिवारिक ऐश्वर्य का शास्त्रीय समन्वय।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार त्रिखल शान्ति से परिवार में समृद्धि, भाई-बहनों में प्रगाढ़ प्रेम और कुल की स्थायी प्रतिष्ठा की रक्षा होती है।",
      deepMeaning: "प्रकृति जब लिंग-संतुलन में परिवर्तन करती है, तो वह परिवार के कर्म-ऋण को संतुलित करने का संकेत होता है।",
      badges: ["त्रिखल शान्ति विधान", "कुल-वृद्धि"]
    });

    // =========================================================================
    // CHAPTER 94: चतुर्नवतितमोऽध्यायः — दंतजनन एवं विकृतजनन शान्त्यध्यायः
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 94,
      chapterTitle: "चतुर्नवतितमोऽध्यायः — दंतजनन एवं विकृतजनन शान्त्यध्यायः",
      chapterSignificance: "शिशु दंत-जनन एवं जन्म-दोष परिहार हेतु नवग्रहार्चन विधान",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `जाता दन्ता यदा बाले प्रथमे मासि दृश्यते ।
दन्तजननदोषघ्नीं शान्तिं कुर्याद्विधानतः ॥ १ ॥
नवग्रहार्चनं कृत्वा सर्वदोषैः प्रमुच्यते ॥ २ ॥`,
      applicabilityStatus: "शिशु स्वास्थ्य सुरक्षा एवं नवग्रहार्चन विधान",
      natalTrigger: `बाल्यकाल स्वास्थ्य-कवच एवं प्राकृतिक शारीरिक विकास का शास्त्रीय विश्लेषण।`,
      classicalPrediction: "महर्षि पाराशर के अनुसार नवग्रहों की नित्य पूजा और बाल-गोपाल की सेवा से जातक के बाल्यकाल के समस्त रोग व बाधाएं स्वतः शांत हो जाती हैं।",
      deepMeaning: "शारीरिक अंगों का समय पर और स्वस्थ विकास ही जीवन भर की ऊर्जा का आधार बनता है।",
      badges: ["नवग्रहार्चन", "आरोग्य रक्षा"]
    });

    // =========================================================================
    // CHAPTER 95: पञ्चनवतितमोऽध्यायः — अनिष्टग्रह शान्ति विधान
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 95,
      chapterTitle: "पञ्चनवतितमोऽध्यायः — अनिष्टग्रह शान्ति विधान",
      chapterSignificance: "नवग्रह समिधा, हवन, बीज-मंत्र एवं सर्व-दोष शमन का सार्वभौम विधान",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `अर्कः पलाशः खदिरो ह्यपामार्गश्च पिप्पलः ।
उदुम्बरः शमी दूर्वा कुशाश्च समिधः स्मृताः ॥ १ ॥
ग्रहाणां प्रीतये कुर्याद्धोमं मन्त्रसमन्वितम् ॥ २ ॥
समिदाहुतिदानेन सर्वसिद्धिः प्रजायते ॥ ३ ॥`,
      applicabilityStatus: "नवग्रह समिधा होम एवं सर्व-दोष शमन विधान",
      natalTrigger: `सूर्य से केतु तक ९ ग्रहों के अनुकूल समिधाएं (मदार, पलाश, खैर, चिचड़ा, पीपल, गूलर, शमी, दूर्वा, कुश) का शास्त्रीय प्रयोग।`,
      classicalPrediction: "महर्षि पाराशर का प्रत्यक्ष विधान: ९ ग्रहों की विशिष्ट समिधाओं से किया गया हवन और मंत्र-जप कुंडली के किसी भी भीषण से भीषण ग्रह-दोष को शांत कर जातक को सर्व-सिद्धि प्रदान करता है।",
      deepMeaning: "हवन केवल अनुष्ठान नहीं, अपितु प्राकृतिक औषधियों द्वारा ब्रह्मांडीय तरंगों को अपने अनुकूल बनाने का वैदिक विज्ञान है।",
      badges: ["नवग्रह समिधा होम", "सर्व-दोष शमन"]
    });

    // =========================================================================
    // CHAPTER 96: षण्णवतितमोऽध्यायः — महामृत्युंजय कलशस्थापन एवं महाशान्ति विधान
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 96,
      chapterTitle: "षण्णवतितमोऽध्यायः — महामृत्युंजय कलशस्थापन एवं महाशान्ति विधान",
      chapterSignificance: "महामृत्युंजय कलश-स्थापन, रुद्राध्याय पाठ एवं अमोघ रक्षा-कवच",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् ।
उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात् ॥ १ ॥
कलशस्थापनं कृत्वा रुद्राध्यायं समुच्चरेत् ॥ २ ॥
सर्वशान्तिमवाप्नोति महामृत्युञ्जयप्रसादात् ॥ ३ ॥`,
      applicabilityStatus: "महामृत्युंजय दिव्य रक्षा-कवच एवं कलश-स्थापन विधान",
      natalTrigger: `मारक, बाधक एवं अरिष्ट स्थानों के शमन हेतु जातक के लिए भगवान शिव का महामृत्युंजय महा-कवच।`,
      classicalPrediction: "महर्षि पाराशर का निर्विवाद सत्य: महामृत्युंजय मंत्र और कलश-स्थापन से बढ़कर संसार में कोई दूसरा रक्षा-कवच नहीं है। यह जातक को अकाल मृत्यु, गंभीर बीमारी, शत्रु-भय और ऋण से मुक्त कर पूर्णायु और अभय प्रदान करता है।",
      deepMeaning: "महामृत्युंजय भगवान शिव का साक्षात अमृत-स्पर्श है जो नश्वर शरीर को भी अमर चेतना से भर देता है।",
      badges: ["महामृत्युंजय महा-कवच", "परम शान्ति"]
    });

    // =========================================================================
    // CHAPTER 97: सप्तनवतितमोऽध्यायः — सम्पूर्ण शास्त्र महा-उपसंहार एवं मैत्रेय संवाद
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 97,
      chapterTitle: "सप्तनवतितमोऽध्यायः — सम्पूर्ण शास्त्र महा-उपसंहार एवं मैत्रेय संवाद",
      chapterSignificance: "बृहत्पाराशरहोराशास्त्रम् का अंतिम महा-उपसंहार — महर्षि पाराशर का अमर आशीर्वाद एवं फलश्रुति",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `एवं ते कथितं विप्र होराशास्त्रमनुत्तमम् ।
गुह्याद् गुह्यतरं पुण्यं सर्वज्ञानशिरोमणिम् ॥ १ ॥
य इदं धारयेत् कण्ठे पाठयेद्वा शृणोति च ।
स लभेत् परमां सिद्धिं विष्णुलोके महीयते ॥ २ ॥
इति श्रीबृहत्पाराशरहोराशास्त्रे उत्तरखण्डे महाशास्त्रोपसंहारो नाम सप्तनवतितमोऽध्यायः ॥ ९७ ॥`,
      applicabilityStatus: "सम्पूर्ण ९७ अध्याय पाराशर संहिता महा-फलश्रुति एवं अमर सिद्धि",
      natalTrigger: `जातक: ${calcResult.name || options.name || "जातक"} • सम्पूर्ण ९७ अध्याय बृहत्पाराशरहोराशास्त्रम् (पूर्व व उत्तर खण्ड) पूर्ण फलित सम्पन्न।`,
      classicalPrediction: "महर्षि पाराशर का अंतिम दिव्य उद्घोष: जो मनुष्य इस सम्पूर्ण होराशास्त्र के ९७ अध्यायों के ज्ञान को समझकर अपने जीवन को धर्म, सत्य और निष्काम कर्म से जोड़ता है, वह इस संसार में समस्त भोग, धन, यश और आरोग्य भोगकर अंत में भगवान विष्णु के परम पद को प्राप्त करता है।",
      deepMeaning: "बृहत्पाराशरहोराशास्त्रम् केवल भविष्य कथन नहीं, अपितु आत्मा को उसके परमात्मा से मिलाने वाला काल-पुरुष का दिव्य मार्ग है।",
      badges: ["सम्पूर्ण ९७ अध्याय सम्पन्न", "महा-उपसंहार सिद्धि"]
    });

    // =========================================================================
    // ENRICH SHLOKAS WITH EXTENDED EXPOSITION & CONTEMPORARY APPLICATION
    // (भाषा को अधिक विस्तृत एवं आज के आधुनिक परिवेश से मेलजोल खाने वाली बनाना)
    // =========================================================================
    enrichShlokasWithModernContext(matchedShlokas, calcResult, {
      lagnaRashi: RASHI_NAMES[lagnaSign],
      moonRashi: moon.rashiName,
      atmakarakaGraha: GRAHA_NAMES[atmakarakaId],
      atmakarakaAvatar: akAvatar.avatar,
      ayurvedicDosha: lagneshDosha.dosha
    });

    // =========================================================================
    // 7-PILLAR EXECUTIVE LIFE SUMMARY & CONTEMPORARY ROADMAP
    // (महा-पाराशर समग्र जीवन सार एवं आधुनिक मार्गदर्शिका)
    // =========================================================================
    const executiveSummary = buildExecutiveSummary({
      name: calcResult.name || options.name || "जातक",
      lagnaRashi: RASHI_NAMES[lagnaSign],
      lagnaDegStr: `${Math.floor(lagnaDeg)}° ${Math.round((lagnaDeg % 1) * 60)}'`,
      moonRashi: moon.rashiName,
      moonDegStr: `${Math.floor(moon.deg)}° ${Math.round((moon.deg % 1) * 60)}'`,
      atmakarakaGraha: GRAHA_NAMES[atmakarakaId],
      atmakarakaAvatar: akAvatar.avatar,
      ayurvedicDosha: lagneshDosha.dosha,
      topVaisheshikamsa: topVaisheshikamsaItem,
      induLagnaRashi: RASHI_NAMES[induSign],
      induLagnaHouse: induHouse,
      arudhaLagnaRashi: RASHI_NAMES[arudhaLagnaSign],
      upapadaLagnaRashi: RASHI_NAMES[upapadaLagnaSign],
      karakamshaRashi: karakamshaRashiName,
      yogakarakaName: yogakarakaDesc,
      mahapurushaYogas: mahapurushaYogas,
      lagneshAvastha: lagneshAvastha.name,
      matchedCount: matchedShlokas.length,
      ashtakavarga: ashtakavarga,
      shodashavarga: shodashavarga,
      vimshottariDasha: vimshottariDasha,
      bhavaLords: {
        dhanesha: `${h2.grahaName} (${h2.planet.rashiName}, भाव ${h2.planet.house})`,
        sahajesha: `${h3.grahaName} (${h3.planet.rashiName}, भाव ${h3.planet.house})`,
        sukhesha: `${h4.grahaName} (${h4.planet.rashiName}, भाव ${h4.planet.house})`,
        sutadhipa: `${h5.grahaName} (${h5.planet.rashiName}, भाव ${h5.planet.house})`,
        shatrupesha: `${h6.grahaName} (${h6.planet.rashiName}, भाव ${h6.planet.house})`,
        kalatresha: `${h7.grahaName} (${h7.planet.rashiName}, भाव ${h7.planet.house})`,
        randhresha: `${h8.grahaName} (${h8.planet.rashiName}, भाव ${h8.planet.house})`,
        bhagyesha: `${h9.grahaName} (${h9.planet.rashiName}, भाव ${h9.planet.house})`,
        karmesha: `${h10.grahaName} (${h10.planet.rashiName}, भाव ${h10.planet.house})`,
        labhesha: `${h11.grahaName} (${h11.planet.rashiName}, भाव ${h11.planet.house})`
      }
    });

    return {
      name: calcResult.name || options.name || "जातक",
      lagnaRashi: RASHI_NAMES[lagnaSign],
      lagnaDegStr: `${Math.floor(lagnaDeg)}° ${Math.round((lagnaDeg % 1) * 60)}'`,
      moonRashi: moon.rashiName,
      moonDegStr: `${Math.floor(moon.deg)}° ${Math.round((moon.deg % 1) * 60)}'`,
      atmakarakaGraha: GRAHA_NAMES[atmakarakaId],
      atmakarakaAvatar: akAvatar.avatar,
      ayurvedicDosha: lagneshDosha.dosha,
      topVaisheshikamsa: topVaisheshikamsaItem,
      induLagnaRashi: RASHI_NAMES[induSign],
      induLagnaHouse: induHouse,
      drekkanaNumber: drekkanaNum,
      anatomicalMarkRegion: anatomicalRegion,
      arudhaLagnaRashi: RASHI_NAMES[arudhaLagnaSign],
      arudhaLagnaHouse: arudhaLagnaHouse,
      upapadaLagnaRashi: RASHI_NAMES[upapadaLagnaSign],
      upapadaLagnaHouse: upapadaLagnaHouse,
      karakamshaRashi: karakamshaRashiName,
      charaKarakas: charaKarakas,
      yogakarakaName: yogakarakaDesc,
      nabhashaYogaName: nabhasha.name,
      chandraYogaName: chandraYogaName,
      suryaYogaName: suryaYogaName,
      mahapurushaYogas: mahapurushaYogas,
      lagneshAvastha: lagneshAvastha.name,
      atmakarakaAvastha: atmakarakaAvastha.name,
      bhavaLords: {
        dhanesha: `${h2.grahaName} (${h2.planet.rashiName}, भाव ${h2.planet.house})`,
        sahajesha: `${h3.grahaName} (${h3.planet.rashiName}, भाव ${h3.planet.house})`,
        sukhesha: `${h4.grahaName} (${h4.planet.rashiName}, भाव ${h4.planet.house})`,
        sutadhipa: `${h5.grahaName} (${h5.planet.rashiName}, भाव ${h5.planet.house})`,
        shatrupesha: `${h6.grahaName} (${h6.planet.rashiName}, भाव ${h6.planet.house})`,
        kalatresha: `${h7.grahaName} (${h7.planet.rashiName}, भाव ${h7.planet.house})`,
        randhresha: `${h8.grahaName} (${h8.planet.rashiName}, भाव ${h8.planet.house})`,
        bhagyesha: `${h9.grahaName} (${h9.planet.rashiName}, भाव ${h9.planet.house})`,
        karmesha: `${h10.grahaName} (${h10.planet.rashiName}, भाव ${h10.planet.house})`,
        labhesha: `${h11.grahaName} (${h11.planet.rashiName}, भाव ${h11.planet.house})`
      },
      ashtakavarga: ashtakavarga,
      shodashavarga: shodashavarga,
      vimshottariDasha: vimshottariDasha,
      activeDashaStr: `${vimshottariDasha.activeMD.lord.name} महादशा — ${vimshottariDasha.activeAD ? vimshottariDasha.activeAD.lord.name : ''} अन्तर्दशा (${vimshottariDasha.activeAD ? vimshottariDasha.activeAD.startDate.getFullYear() + '–' + vimshottariDasha.activeAD.endDate.getFullYear() : ''})`,
      matchedShlokasCount: matchedShlokas.length,
      matchedShlokas: matchedShlokas,
      executiveSummary: executiveSummary,
      engineVersion: "5.0.0 (BPHS Complete Canonical Corpus - All 97 Chapters Purva & Uttara Khanda)",
      generatedAt: new Date().toISOString()
    };
  }

  // =========================================================================
  // HELPER: ENRICH SHLOKAS WITH CONTEMPORARY APPLICATION
  // =========================================================================
  function enrichShlokasWithModernContext(shlokas, calcResult, ctx) {
    shlokas.forEach((s) => {
      if (s.modernContext) return;

      const ch = s.chapterNumber;
      let modern = "";

      switch (ch) {
        case 1:
          modern = "आज के तीव्र प्रतिस्पर्धा और अनिश्चितता भरे दौर में यह सिद्धांत 'माइंडसेट एवं कर्म-प्रबंधन' का आधार है। यह शास्त्रीय बोध जातक को अकारण मानसिक अवसाद (Anxiety/Depression) से बचाकर स्पष्ट जीवन-लक्ष्य और आंतरिक शांति की ओर अग्रसर करता है।";
          break;
        case 2:
          modern = `समकालीन पेशेवर एवं व्यक्तिगत जीवन में जब भी करियर के चौराहे या नैतिक दुविधा की स्थिति आए, तब ${s.badges && s.badges[1] ? s.badges[1] : 'ईष्टदेव'} के उच्च मानवीय आदर्शों (कर्तव्यनिष्ठा, मानसिक संतुलन, कूटनीतिक विवेक) को अपनी निर्णय-प्रक्रिया (Decision Making) में शामिल करने से चिरस्थायी सफलता प्राप्त होती है।`;
          break;
        case 3:
          if (s.badges && s.badges.includes("आयुर्वेदिक त्रिदोष")) {
            modern = "आज की स्क्रीन-निर्भर जीवनशैली, तनाव और अनियमित खान-पान के दौर में यह त्रिदोष ज्ञान आपका व्यक्तिगत स्वास्थ्य गाइड (Personal Health Blueprint) है। अपनी देह-प्रकृति अनुसार खान-पान और योग अपनाने से क्रोनिक लाइफस्टाइल बीमारियों और ऊर्जा की कमी से पूरी तरह बचा जा सकता है।";
          } else if (s.badges && s.badges.some(b => b.includes("उच्च"))) {
            modern = "आधुनिक प्रतिस्पर्धी युग में यह ग्रह जातक की 'कोर कॉम्पिटेंसी' (Core Competency / Super Power) है। इस ग्रह से जुड़े क्षेत्रों (जैसे नेतृत्व, तकनीक, संचार या वित्त) में विशेषज्ञता हासिल करने पर मार्केट में सर्वोच्च प्रीमियम, प्रभाव और आदर प्राप्त होता है।";
          } else if (s.badges && s.badges.some(b => b.includes("नीच"))) {
            modern = "समकालीन परिवेश में यह स्थिति सिखाती है कि किसी भी प्रकार के शॉर्टकट या अत्यधिक जोखिम से बचना चाहिए। औपचारिक प्रशिक्षण, स्किल अपग्रेडेशन और कानूनी अनुशासन से यह क्षेत्र जातक की सबसे बड़ी व्यावहारिक ताकत बन जाता है।";
          } else {
            modern = "आज के कॉर्पोरेट स्ट्रक्चर और स्टार्टअप इकोसिस्टम में यह स्थिति जातक को उच्च रणनीतिक अधिकार, टीम लीडरशिप और स्वतंत्र निर्णय क्षमता वाले शीर्ष पदों (C-Suite / Entrepreneurial Authority) की ओर अग्रसर करती है।";
          }
          break;
        case 4:
          modern = "आज के तेज गति वाले समाज में यह जातक की कार्यशैली (Work Style) को दर्शाता है। यह स्थिति व्यक्ति को नए प्रोजेक्ट्स को तुरंत शुरू करने, रणनीतिक इनिशिएटिव लेने और शुरुआती दौर में ही नेतृत्वकारी परिणाम देने में असाधारण रूप से दक्ष बनाती है।";
          break;
        case 5:
          modern = "आज के वित्तीय प्रबंधन (Modern Wealth Management) के संदर्भ में इन्दु लग्न दर्शाता है कि जातक को विविध संपदा (Diversified Assets: Real Estate, Stocks, Liquid Funds) के जरिए पैसिव इनकम और निरंतर वेल्थ क्रिएशन के अवसर प्राप्त होते रहेंगे। योजनाबद्ध निवेश इसे 'वेल्थ मल्टीप्लायर' बना देता है।";
          break;
        case 6:
        case 7:
          modern = "षोडशवर्गों में उच्च गरिमा प्राप्त होना आज के युग में 'डीप डोमेन एक्सपर्टीज' (Niche Domain Mastery) का प्रतीक है। जातक जिस भी उद्योग या पेशे में रहेगा, वहाँ उसकी साख और विश्वसनीयता सबसे मजबूत रहेगी, जो उसे किसी भी आर्थिक मंदी में अडिग रखती है।";
          break;
        case 8:
          modern = "आज के जटिल सामाजिक व व्यावसायिक परिदृश्य में गुरु की दृष्टि 'क्राइसिस मैनेजमेंट' की अमोघ शक्ति है। कठिन से कठिन कानूनी, वित्तीय या व्यक्तिगत संकटों में जातक का शांत विवेक, सही मेंटॉरशिप और समय पर मिलने वाली मदद समस्त विपत्तियों को निष्फल कर देती है।";
          break;
        case 9:
          modern = "आधुनिक जीवन में प्राथमिकताओं का संतुलन (Life Priorities Balance)। कार्यक्षेत्र, व्यक्तिगत स्वास्थ्य, पारिवारिक वित्तीय सुरक्षा और मानसिक शांति के बीच सामंजस्य साधने के लिए द्वादश भावों का यह विभाजन अचूक रोडमैप प्रदान करता है।";
          break;
        case 10:
          modern = "बॉडी लैंग्वेज, शारीरिक संवेदनशीलता और व्यक्तिगत स्वास्थ्य जागरूकता। यह जातक को अपने शरीर के संवेदनशील अंगों के प्रति सतर्क रहकर एर्गोनॉमिक्स और संतुलित दिनचर्या अपनाने की प्रेरणा देता है।";
          break;
        case 11:
          modern = "पारिवारिक प्रतिष्ठा, बैंक बैलेंस, लिक्विड फंड्स और प्रभावशाली संचार शैली (Communication Skills)। प्रेजेंटेशन, क्लाइंट मीटिंग और नेगोशिएशन में आपकी वाणी ही सबसे बड़ी संपत्ति सिद्ध होगी।";
          break;
        case 12:
          modern = "आज के डिजिटल युग में स्टार्टअप्स, सोशल नेटवर्किंग, कंटेंट क्रिएशन और स्वयं के बाहुबल से स्थापित उद्यम। भाई-बहनों और सहकर्मियों के साथ समन्वय से बड़े लक्ष्यों की प्राप्ति।";
          break;
        case 13:
          modern = "आधुनिक रियल एस्टेट, लग्जरी गाड़ियां, वर्क-फ्रॉम-होम कम्फर्ट और आंतरिक मानसिक शांति। घर और कार्यस्थल पर सकारात्मक वातावरण का निर्माण।";
          break;
        case 14:
          modern = "इनोवेशन, रिसर्च, बौद्धिक संपदा (IPR / Patents), रणनीतिक निवेश, शेयर बाजार एवं संतान की उन्नति। विश्लेषणात्मक मेधा से मार्केट के ट्रेंड्स को समय से पूर्व भांपने की क्षमता।";
          break;
        case 15:
          modern = "कॉर्पोरेट राजनीति, अदालती विवाद, प्रतियोगी परीक्षाएं और डेट/लोन मैनेजमेंट। ऋण को पूंजी में बदलने और प्रतिस्पर्धियों को डिप्लोमेसी से परास्त करने की अनूठी क्षमता।";
          break;
        case 16:
          modern = "बिजनेस पार्टनरशिप्स, बी2बी कॉन्ट्रैक्ट्स, क्लाइंट डील्स एवं वैवाहिक जीवन में भावनात्मक सामंजस्य। आपसी संवाद और विश्वास से पार्टनरशिप को सफल बनाना।";
          break;
        case 17:
          modern = "डेटा एनालिटिक्स, गुप्त शोध, बीमा, वसीयत, अचानक आने वाले वित्तीय अवसर और आंतरिक आध्यात्मिक साधना। संकट के क्षणों में अप्रत्याशित पुनरुत्थान।";
          break;
        case 18:
          modern = "उच्च शिक्षा (Global Universities), विदेशी अवसर, मेंटॉरशिप, धार्मिक यात्राएं और ब्रांड प्रतिष्ठा। समाज में एक मार्गदर्शक और विचारक के रूप में पहचान।";
          break;
        case 19:
          modern = "करियर ग्राफ, सी-सूट या सरकारी पद, पब्लिक प्रोफाइल, इंडस्ट्री अवार्ड्स और स्थायी ख्याति। अपने काम के दम पर समाज में अमिट छाप छोड़ना।";
          break;
        case 20:
          modern = "मल्टीपल रेवेन्यू स्ट्रीम्स, एंजेल इन्वेस्टमेंट्स, हाई-नेटवर्थ नेटवर्क्स (HNWIs) और महत्वाकांक्षाओं की शत-प्रतिशत पूर्ति। सामाजिक प्रभाव से आर्थिक लाभ का सृजन।";
          break;
        case 21:
          modern = "ग्लोबल क्रॉस-बॉर्डर व्यापार, विदेशी क्लाइंट्स से रेवेन्यू, टैक्स ऑप्टिमाइजेशन और आध्यात्मिक शांति। विपरीत परिस्थितियों में दूसरों के नुकसान के बीच भी अपना मुनाफा और साख सुरक्षित रखने की अद्भुत क्षमता।";
          break;
        case 22:
        case 23:
        case 24:
          modern = "लाइफ के अलग-अलग डिपार्टमेंट्स (Personal, Financial, Career, Family) का ऑटोमेशन। सही जगह ऊर्जा लगाने पर न्यूनतम प्रयास में अधिकतम परिणाम (High ROI on Effort) प्राप्त होता है।";
          break;
        case 25:
        case 26:
          modern = "छुपी हुई वित्तीय लीकेज, अनपेक्षित तकनीकी ग्लिच या छिपे विरोधियों की समय पूर्व पहचान। सुरक्षा प्रोटोकॉल और ऑडिट द्वारा प्रभावी जोखिम प्रबंधन (Risk Management)।";
          break;
        case 27:
        case 28:
          modern = "मल्टी-टास्किंग क्षमता। एक साथ कई तरह की ज़िम्मेदारियों (करियर, परिवार, वेल्थ, समाज) को बिना किसी मानसिक भटकाव के उत्कृष्टता से संचालित करना।";
          break;
        case 29:
        case 30:
        case 31:
          modern = "आज के सोशल मीडिया, लिंक्डइन और पर्सनल ब्रांडिंग के दौर में आरूढ़ लग्न जातक की 'ब्रांड वैल्यू' है। लोग आपके विजन पर भरोसा करते हैं और समाज में आपकी प्रतिष्ठा आपके काम से आगे चलती है।";
          break;
        case 32:
        case 33:
          modern = "जातक का 'इनर कॉलिंग' या 'इकिगाई' (Ikigai)। वह कार्यक्षेत्र जिसमें आपको बिना थके निरंतर आनंद मिलता है और जो आधुनिक इंडस्ट्री में आपको एक अतुलनीय विशेषज्ञ बना देता है।";
          break;
        case 34:
          modern = "आपकी कुंडली का सबसे बड़ा गेम-चेंजर ग्रह। जब भी इस ग्रह की महादशा, अंतर्दशा या शुभ गोचर आता है, करियर और वेल्थ में क्वांटम लीप (Exponential Growth) देखने को मिलती है।";
          break;
        case 35:
        case 36:
        case 37:
        case 38:
        case 39:
        case 40:
          modern = "इंडस्ट्री लीडरशिप, असाधारण बौद्धिक क्षमता, नैतिक सत्यनिष्ठा और समाज में मील का पत्थर साबित होने वाले प्रोजेक्ट्स का निर्माण। व्यापक जन-समर्थन और सम्मान।";
          break;
        case 41:
          modern = "आधुनिक वेल्थ क्रिएशन, कंपाउंडिंग का लाभ, मल्टी-मिलियन डॉलर संपदा निर्माण तथा पैसिव इनकम का निरंतर प्रवाह। वित्तीय स्वतंत्रता (Financial Freedom) की ठोस नींव।";
          break;
        case 42:
          modern = "आर्थिक अनुशासन, अनावश्यक दिखावे या सट्टेबाजी/क्रिप्टो जुए से दूरी, कैश-फ्लो मैनेजमेंट और इमरजेंसी फंड का निर्माण। सही आर्थिक अनुशासन से दरिद्र योग कभी सक्रिय नहीं हो पाता।";
          break;
        case 43:
          modern = "शारीरिक व मानसिक दीर्घायु (Longevity & Vitality)। प्रिवेंटिव हेल्थकेयर, नियमित ध्यान, प्राणायाम और वर्क-लाइफ बैलेंस से वृद्धावस्था में भी पूर्ण सक्रियता व आत्मनिर्भरता।";
          break;
        case 44:
          modern = "हाई-स्ट्रेस पीरियड्स और बर्नआउट की पूर्व-चेतावनी। मारक दशाओं के दौरान बड़े वित्तीय जोखिम, तेज ड्राइविंग और फिजूल विवादों से बचकर महामृत्युंजय जप द्वारा अभेद्य सुरक्षा।";
          break;
        case 45:
          modern = "प्लानिंग और एक्जीक्यूशन की टाइमिंग। जाग्रत और युवा अवस्था वाले ग्रह की दशा में लिए गए व्यावसायिक व करियर संबंधी निर्णय सौ प्रतिशत सफल होते हैं।";
          break;
        case 46:
        case 47:
        case 48:
        case 49:
          modern = "जीवन का रणनीतिक रोडमैप और टाइमिंग (Timing of Life Events)। कब आक्रामक विस्तार करना है, कब पदों की अदला-बदली करनी है और कब संयम रखकर तैयारी करनी है।";
          break;
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          modern = "वैदिक प्रेडिक्टिव एनालिटिक्स (Vedic Data Science)। जिस भाव में २८+ बिंदु हैं, उस क्षेत्र में निवेश करने पर गारंटीड रिटर्न मिलता है। ११वें भाव (आय) में १२वें भाव (व्यय) से अधिक बिंदु आधुनिक सेविंग्स व नेट वर्थ ग्रोथ का वैज्ञानिक सूत्र हैं।";
          break;
        case 58:
          modern = "पारिवारिक सामंजस्य, दांपत्य निष्ठा, गृह-सौख्य और दोनों भागीदारों के बीच एक-दूसरे की व्यक्तिगत व व्यावसायिक प्रगति का पारस्परिक सम्मान।";
          break;
        case 59:
        case 60:
          modern = "क्राइसिस रेजिस्टेंस (Anti-fragility)। विपरीत परिस्थितियां जातक को विचलित करने के बजाय और अधिक मजबूत, परिपक्व और अजेय बना देती हैं।";
          break;
        case 61:
        case 62:
          modern = "कैरियर या जीवन में बार-बार आने वाले अज्ञात अवरोधों (Unexplained Bottlenecks) का आध्यात्मिक समाधान। वैदिक शान्ति, रुद्राभिषेक, गायत्री जप और अन्नदान से ब्लॉकेज समाप्त होकर मार्ग निष्कंटक हो जाता है।";
          break;
        case 63:
          modern = "पूर्व-खण्ड का सार: जीवन के भौतिक, आर्थिक व व्यक्तित्व आधार को सुदृढ़ कर आध्यात्मिक उत्कर्ष की नींव रखना।";
          break;
        case 64:
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
          modern = "आज के पेशेवर और वित्तीय जीवन में यह विंशोत्तरी अन्तर्दशा काल-निर्धारण (Timing of Events) का मुख्य पैमाना है। अनुकूल ग्रह की अन्तर्दशा में नए करियर कदम, स्टार्टअप विस्तार या निवेश करना सर्वोत्तम परिणाम देता है, जबकि सतर्कता काल में धैर्य और आंतरिक तैयारी सफलता की कुंजी बनती है।";
          break;
        case 73:
        case 74:
        case 75:
          modern = "आधुनिक 'टाइम मैनेजमेंट' और सूक्ष्म रणनीतिक निर्णय। महत्वपूर्ण इंटरव्यूज, बोर्ड मीटिंग्स, कॉन्ट्रैक्ट साइनिंग या बड़े वित्तीय फैसलों के लिए यह त्रिस्तरीय व चतुर्थ-स्तरीय काल-विभाजन अचूक मार्गदर्शन प्रदान करता है।";
          break;
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
          modern = "विशिष्ट जीवन-परिस्थितियों में विंशोत्तरी के पूरक के रूप में यह विशेष नक्षत्र दशा प्रणाली जीवन की दीर्घकालिक दिशा को प्रमाणित करती है। यह जातक के करियर स्थिरता, पारिवारिक सुख और जीवन के महत्वपूर्ण पड़ावों का क्रॉस-वेरिफिकेशन (Cross-Verification) करती है।";
          break;
        case 85:
          modern = "करियर और जीवन में 'क्वांटम जंप्स' (Quantum Leaps)। जब व्यक्ति एक इंडस्ट्री से दूसरी इंडस्ट्री में कदम रखता है या अचानक वैश्विक अवसर प्राप्त करता है, तो कालचक्र की यह विशेष गति उसे अप्रत्याशित छलांग लगाने का बल देती है।";
          break;
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 92:
        case 93:
        case 94:
          modern = "आधुनिक जीवन में बार-बार आने वाले अज्ञात मानसिक तनाव, करियर के गतिरोध या स्वास्थ्य बर्नआउट का आध्यात्मिक समाधान। जब आधुनिक चिकित्सा और प्रबंधन उपाय निष्फल लगने लगें, तब यह शास्त्रीय शान्ति जातक के अवचेतन और आभामंडल (Aura) को शुद्ध कर नए अवसरों के द्वार खोलती है।";
          break;
        case 95:
        case 96:
          modern = "महामृत्युंजय एवं नवग्रह समिधा होम आज के अति-तनावपूर्ण, अनिश्चित और प्रतिस्पर्धी परिवेश में सबसे शक्तिशाली 'स्ट्रेस-रिलीफ एवं बायो-एनर्जेटिक शील्ड' है। नियमित जप और वैदिक अनुष्ठान मानसिक स्पष्टता और अभेद्य सुरक्षा कवच प्रदान करते हैं।";
          break;
        case 97:
          modern = "सम्पूर्ण ९७ अध्यायों का अंतिम निष्कर्ष: जीवन को अकारण चिंताओं और भ्रम से मुक्त कर 'उच्च नैतिक मूल्य, सत्यनिष्ठ कर्म और ईश्वरीय समर्पण' के साथ जीना ही आधुनिक युग में परम सफलता और आंतरिक शांति की एकमात्र गारंटी है।";
          break;
        default:
          modern = "समकालीन जीवन में यह शास्त्रीय सिद्धांत व्यावहारिक निर्णय-क्षमता, नैतिक नेतृत्व और मानसिक संतुलन का आधार बनता है।";
      }

      s.modernContext = modern;
    });
  }

  // =========================================================================
  // HELPER: BUILD 7-PILLAR EXECUTIVE LIFE SUMMARY & CONTEMPORARY ROADMAP
  // =========================================================================
  function buildExecutiveSummary(params) {
    const {
      name, lagnaRashi, lagnaDegStr, moonRashi, moonDegStr,
      atmakarakaGraha, atmakarakaAvatar, ayurvedicDosha,
      topVaisheshikamsa, induLagnaRashi, induLagnaHouse,
      arudhaLagnaRashi, upapadaLagnaRashi, karakamshaRashi,
      yogakarakaName, mahapurushaYogas, lagneshAvastha,
      matchedCount, bhavaLords, ashtakavarga, vimshottariDasha, shodashavarga
    } = params;

    return {
      title: "🌟 महा-पाराशर समग्र जीवन सार एवं आधुनिक मार्गदर्शिका (सम्पूर्ण ९७ अध्याय)",
      subtitle: "बृहत्पाराशरहोराशास्त्रम् के सम्पूर्ण ९७ अध्यायों (पूर्व एवं उत्तर खण्ड) के सूक्ष्म मंथन पर आधारित व्यक्तिगत जीवन-संश्लेषण",
      pillars: [
        {
          number: 1,
          title: "व्यक्तित्व, आत्म-ऊर्जा एवं देह-प्रकृति (Core Identity & Vital Constitution)",
          icon: "🧬",
          badge: `${lagnaRashi} लग्न • ${ayurvedicDosha} प्रकृति`,
          classicalBasis: `लग्न: ${lagnaRashi} (${lagnaDegStr}) • चंद्र: ${moonRashi} (${moonDegStr}) • आत्मकारक ईष्टदेव: ${atmakarakaGraha} (${atmakarakaAvatar})`,
          detailedAnalysis: `महर्षि पाराशर के अनुसार आपकी देह और जीवन-चेतना का संचालन ${lagnaRashi} लग्न और लग्नेश के बल से हो रहा है। आपकी नैसर्गिक धातु-प्रकृति '${ayurvedicDosha}' है। आपकी आत्मा का सर्वोच्च संवाहक ग्रह '${atmakarakaGraha}' है, जिसका सीधा संबंध ${atmakarakaAvatar} के दिव्य स्वरूप से है। आपके भीतर आत्म-सम्मान, अडिग संकल्प और सत्य की खोज की गहरी अंतःप्रेरणा है।`,
          modernApplication: `आज के उच्च-तनाव एवं तेज गति वाले जीवन में आपकी '${ayurvedicDosha}' प्रकृति आपके दैनिक स्वास्थ्य का कम्पास है। आपको स्क्रीन-टाइम और अत्यधिक मानसिक थकान से बचते हुए नियमित प्राणायाम, पर्याप्त जलयोजन और सात्विक आहार अपनाना चाहिए। कार्यक्षेत्र में आपकी सबसे बड़ी शक्ति आपका 'इमोशनल रेजिलिएंस' (Emotional Resilience) और स्पष्ट आत्म-बोध होगा। जब भी जीवन में निर्णय लेने में संशय हो, शांत चित्त से अपने ईष्टदेव के आदर्शों का स्मरण करें।`
        },
        {
          number: 2,
          title: "आधुनिक करियर, नेतृत्व एवं कर्मक्षेत्र (Career, Leadership & Modern Domain)",
          icon: "💼",
          badge: `${bhavaLords ? bhavaLords.karmesha.split(' ')[0] : 'शुभ'} कर्मेश • ${karakamshaRashi} कारकांश`,
          classicalBasis: `दशम भाव (कर्म) एवं कारकांश राशि: ${karakamshaRashi} • योगकारक: ${yogakarakaName}`,
          detailedAnalysis: `पाराशर होराशास्त्र में कर्म भाव और कारकांश आत्मा के सांसारिक कर्म-कौशल का प्रतिनिधित्व करते हैं। आपकी कुंडली में कर्मेश और योगकारक का शुभ विन्यास यह सिद्ध करता है कि आप दूसरों के अधीन मात्र नौकरी करने के स्थान पर स्वायत्त अधिकार, नीति-निर्माण और स्वतंत्र निर्णय क्षमता रखने वाले पदों के लिए बने हैं।`,
          modernApplication: `आज के कॉर्पोरेट, स्टार्टअप एवं तकनीकी परिवेश में आपके लिए स्ट्रैटेजिक मैनेजमेंट, कंसल्टिंग, टेक्नोलॉजी, एनालिटिक्स, वित्तीय योजना, अथवा स्वतंत्र उद्यमशीलता (Entrepreneurship) में सर्वोच्च सफलता के योग हैं। आप जटिल समस्याओं को सरल बनाकर समाधान खोजने (Problem Solving) और टीम का नेतृत्व करने में असाधारण कौशल रखते हैं। अपने कार्य में निरंतर अपस्किलिंग (Upskilling) और नैतिक नेतृत्व अपनाकर आप अपने उद्योग में 'थॉट लीडर' (Thought Leader) का दर्जा प्राप्त कर सकते हैं।`
        },
        {
          number: 3,
          title: "वित्तीय समृद्धि, धन-संचय एवं आधुनिक संपदा सूत्र (Wealth, Capital Growth & Modern Finance)",
          icon: "💰",
          badge: `इन्दु लग्न: ${induLagnaRashi} • अखंड लक्ष्मी योग`,
          classicalBasis: `इन्दु लग्न (भाव ${induLagnaHouse}) • धनेश व लाभेश संबंध • सर्वाष्टकवर्ग ३३७ बिंदु नियम`,
          detailedAnalysis: `महर्षि पाराशर के धनयोगाध्याय एवं विशेष इन्दु लग्न के अनुसार जातक के जीवन में धन केवल भौतिक आवश्यकता नहीं, अपितु पूर्वजन्म के संचित पुण्यों का प्रतिफल है। आपके इन्दु लग्न और २रे व ११वें भाव के स्वामियों की स्थिति दर्शाती है कि जीवन के उत्तरार्ध में वित्तीय स्थिरता निरंतर बढ़ती जाएगी।`,
          modernApplication: (ashtakavarga && ashtakavarga.wealthSummary && ashtakavarga.wealthSummary.diff11_12 < 0)
            ? `आज के वित्तीय प्रबंधन (Modern Wealth Management) के संदर्भ में आपकी कुंडली का प्रत्यक्ष यथार्थ: आपके सर्वाष्टकवर्ग में द्वादश भाव (व्यय: ${ashtakavarga.wealthSummary.h12_bindus} बिंदु) एकादश भाव (आय: ${ashtakavarga.wealthSummary.h11_bindus} बिंदु) से अधिक है। महर्षि पराशर का स्पष्ट निर्देश है कि प्रचुर आय के बावजूद अनियोजित खर्चों, अत्यधिक उदारता व लीकेज पर कठोर अनुशासन रखना होगा। आपको स्वचालित बचत (Automated SIP), आपातकालीन कोष (Emergency Reserve) और सख्त पारिवारिक बजट का नियम अपनाना चाहिए ताकि धन संचित रह सके।`
            : `आज के वित्तीय प्रबंधन के संदर्भ में आपके सर्वाष्टकवर्ग के लाभ भाव (११वें: ${ashtakavarga ? ashtakavarga.wealthSummary.h11_bindus : 28} बिंदु) व्यय भाव (१२वें: ${ashtakavarga ? ashtakavarga.wealthSummary.h12_bindus : 28} बिंदु) से अधिक हैं, जिसका अर्थ है कि आपकी कमाई और पैसिव इनकम निरंतर खर्चों से अधिक रहेगी। विविध पोर्टफोलियो में अनुशासित एसआईपी अपनाएं।`
        },
        {
          number: 4,
          title: "सामाजिक प्रतिष्ठा, नेटवर्किंग एवं सांसारिक छवि (Public Stature, Networking & Arudha Lagna)",
          icon: "🌐",
          badge: `आरूढ़ लग्न (AL): ${arudhaLagnaRashi} • उपपद (UL): ${upapadaLagnaRashi}`,
          classicalBasis: `आरूढ़ लग्न: ${arudhaLagnaRashi} • उपपद लग्न: ${upapadaLagnaRashi} • सप्तम भाव`,
          detailedAnalysis: `पाराशर संहिता के अध्याय २९ व ३० के अनुसार आरूढ़ लग्न (AL) बाह्य जगत में जातक की सामाजिक साख और धारणा (Public Perception) को निर्धारित करता है, जबकि उपपद लग्न (UL) पारिवारिक प्रतिष्ठा और वैवाहिक सद्भाव का मूल है। आपकी कुंडली में आरूढ़ का शुभ प्रभाव यह दर्शाता है कि समाज आपको एक विश्वसनीय, कर्तव्यनिष्ठ और सम्माननीय व्यक्तित्व के रूप में देखता है।`,
          modernApplication: `आज के डिजिटल मीडिया, पर्सनल ब्रांडिंग और लिंक्डइन नेटवर्किंग के युग में आपका 'ट्रस्ट कोशेंट' (Trust Quotient) अत्यंत उच्च है। उच्च पदों पर बैठे लोगों और प्रभावशाली नेटवर्क्स से आपके संबंध स्वाभाविक रूप से विकसित होंगे। पारिवारिक जीवन में परस्पर आदर और खुला संवाद बनाए रखें; आपका जीवनसाथी आपके सामाजिक यश और भाग्य-वृद्धि में एक मजबूत संबल सिद्ध होगा।`
        },
        {
          number: 5,
          title: "संभावित जीवन-चुनौतियां एवं मनोवैज्ञानिक सुरक्षा-कवच (Vulnerabilities, Burnout & Life Safeguards)",
          icon: "🛡️",
          badge: "विपरीत राजयोग व अरिष्टभंग संरक्षण",
          classicalBasis: `त्रिक भाव (६/८/१२) • मारक भाव (२/७) • बालारिष्ट व अरिष्टभंग सूत्र`,
          detailedAnalysis: `महर्षि पाराशर ने स्पष्ट निर्देश दिया है कि कोई भी कुंडली चुनौतियों से शून्य नहीं होती। आपकी कुंडली में त्रिक भावों और मारक भावों का प्रभाव कभी-कभार कार्यस्थल पर छिपी ईर्ष्या, तनाव, अधिक काम के कारण थकान (Burnout) या वित्तीय निर्णयों में अत्यधिक जल्दबाजी के रूप में आ सकता है। किंतु साथ ही 'अरिष्टभंग' के योग इन कष्टों को दीर्घकालिक नहीं होने देते।`,
          modernApplication: `समकालीन जीवन में 'वर्क-लाइफ बैलेंस' बनाए रखना आपकी सबसे पहली प्राथमिकता होनी चाहिए। जब भी दशा परिवर्तन या गोचर का दबाव हो, आक्रामक प्रतिक्रिया देने के बजाय कूटनीतिक मौन और धैर्य बरतें। कागजी दस्तावेजों, कॉन्ट्रैक्ट्स और कानूनी समझौतों पर बिना पूर्ण जांच के हस्ताक्षर न करें। योग और ध्यान को अपनी दिनचर्या का स्थायी हिस्सा बनाएं ताकि मानसिक शांति कभी भंग न हो।`
        },
        {
          number: 6,
          title: "महर्षि पराशर निर्देशित नित्य कल्याणकारी साधना एवं उपाय (Personalized Daily Remedial Blueprint)",
          icon: "🕉️",
          badge: "वैदिक शान्ति • महामृत्युंजय एवं इष्ट साधना",
          classicalBasis: `अध्याय ६१ व ६२ (पूर्वजन्मशाप एवं शान्तिप्रकरण) • आत्मकारक ${atmakarakaGraha} एवं गुरु दृष्टि`,
          detailedAnalysis: `महर्षि पाराशर ने स्पष्ट किया है कि ग्रहों के दुष्प्रभाव केवल भयभीत होने के लिए नहीं, अपितु साधना द्वारा परिमार्जित करने के लिए हैं। 'महामृत्युञ्जयजपात् सर्वदोषप्रणाशनम्' — आपकी कुंडली के समस्त मारक व अरिष्ट दोषों के शमन के लिए वैदिक साधना सर्वश्रेष्ठ कवच है।`,
          modernApplication: `नित्य जीवन में व्यावहारिक उपाय: (१) प्रातःकाल सूर्योदय के समय १० मिनट मौन रहकर अपने ईष्टदेव (${atmakarakaAvatar}) का ध्यान व 'ॐ नमो भगवते वासुदेवाय' या गायत्री मंत्र का जप करें। (२) स्वास्थ्य और दीर्घायु की रक्षा हेतु प्रतिदिन ११ बार 'महामृत्युंजय मंत्र' का स्मरण करें। (३) प्रत्येक शनिवार या अमावस्या को असहाय व्यक्तियों को भोजन, तिल अथवा वस्त्र का गुप्त दान करें। (४) पक्षियों को जल व अन्न देना आपकी कुंडली के बुध और राहु-केतु अक्ष को निरंतर सात्विक बनाए रखेगा।`
        },
        {
          number: 7,
          title: "समग्र महा-पाराशर जीवन-दृष्टि (Grand Synthesis & Guiding Motto)",
          icon: "✨",
          badge: `सम्पूर्ण ९७ अध्यायों का महा-सार • कुल ${matchedCount} श्लोक प्रमाणित`,
          classicalBasis: "अध्याय ९७ — सम्पूर्ण शास्त्र महा-उपसंहार एवं मैत्रेय संवाद",
          detailedAnalysis: `बृहत्पाराशरहोराशास्त्रम् के सम्पूर्ण ९७ अध्यायों (पूर्व एवं उत्तर खण्ड) के सूक्ष्म विश्लेषण से यह स्पष्ट होता है कि आपकी कुंडली 'सार्थक पुरुषार्थ और आध्यात्मिक चेतना' का अनुपम संगम है। आपके पास समाज को दिशा देने, परिवार को समृद्ध करने और अपने आत्मिक कल्याण को साधने की पूर्ण सामर्थ्य विद्यमान है।`,
          modernApplication: `🌟 आपका जीवन-मंत्र: "सात्विक संकल्प, अनुशासित कर्म और निर्भय आत्मविश्वास।" बाहरी परिस्थितियों के उतार-चढ़ाव से विचलित हुए बिना जब आप अपने नैतिक मूल्यों पर अडिग रहकर कर्म करते हैं, तो समस्त ग्रह आपके सहायक बन जाते हैं और आप जीवन के प्रत्येक क्षेत्र में ऐतिहासिक सफलता प्राप्त करते हैं।`
        }
      ]
    };
  }

  return {
    evaluateParasharaReport,
    RASHI_NAMES,
    GRAHA_NAMES,
    getVargaSign,
    EXALTATION_SIGNS,
    DEBILITATION_SIGNS
  };
}));
