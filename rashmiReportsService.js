/**
 * Fully Generic Parashar Rashmi Calculation Engine
 * Module: rashmiReportsService.js
 * Reference: Brihat Parashara Hora Shastra (BPHS), Chapter 8: Rashmi Phala Adhyaya (Shlokas 1–40)
 * Covers all 12 Lagnas, any combination of conjunctions, combustion and retrograde rules.
 */

const NEECHA_POINTS = {
  sun: 190.0,     // Tula 10 deg
  moon: 213.0,    // Vrishchik 3 deg
  mars: 118.0,    // Kark 28 deg
  mercury: 345.0, // Meen 15 deg
  jupiter: 275.0, // Makar 5 deg
  venus: 177.0,   // Kanya 27 deg
  saturn: 20.0    // Mesh 20 deg
};

const DHRUWANKS = {
  sun: 10, moon: 9, mars: 5, mercury: 5, jupiter: 7, venus: 8, saturn: 5
};

const PLANET_META = {
  sun: { name: "सूर्य (Sun)", glyph: "☀️", color: "#f59e0b" },
  moon: { name: "चन्द्र (Moon)", glyph: "🌙", color: "#38bdf8" },
  mars: { name: "मंगल (Mars)", glyph: "♂️", color: "#ef4444" },
  mercury: { name: "बुध (Mercury)", glyph: "☿️", color: "#10b981" },
  jupiter: { name: "गुरु (Jupiter)", glyph: "♃", color: "#eab308" },
  venus: { name: "शुक्र (Venus)", glyph: "♀️", color: "#ec4899" },
  saturn: { name: "शनि (Saturn)", glyph: "♄", color: "#8b5cf6" }
};

// Shastra-sammat All 12 Lagnas Functional Classification
const LAGNA_RULES = {
  0: { yogakaraka: ['sun', 'jupiter', 'mars'], malefic: ['mercury', 'venus'] },          // Mesh
  1: { yogakaraka: ['saturn', 'mercury'], malefic: ['jupiter', 'mars'] },                 // Vrishabh
  2: { yogakaraka: ['mercury', 'venus'], malefic: ['mars', 'jupiter'] },                  // Mithun
  3: { yogakaraka: ['mars', 'moon', 'jupiter'], malefic: ['mercury', 'venus', 'saturn'] }, // Kark
  4: { yogakaraka: ['mars', 'sun', 'jupiter'], malefic: ['mercury', 'venus', 'saturn'] },  // Singh
  5: { yogakaraka: ['mercury', 'venus'], malefic: ['mars', 'jupiter'] },                  // Kanya
  6: { yogakaraka: ['saturn', 'mercury', 'venus'], malefic: ['jupiter', 'sun', 'mars'] }, // Tula
  7: { yogakaraka: ['sun', 'jupiter', 'moon'], malefic: ['mercury', 'venus'] },           // Vrishchik
  8: { yogakaraka: ['jupiter', 'sun', 'mars'], malefic: ['venus', 'mercury'] },           // Dhanu
  9: { yogakaraka: ['venus', 'saturn'], malefic: ['sun', 'jupiter', 'mars'] },            // Makar
  10: { yogakaraka: ['venus', 'saturn'], malefic: ['moon', 'jupiter', 'mars'] },          // Kumbh
  11: { yogakaraka: ['moon', 'jupiter', 'mars'], malefic: ['venus', 'saturn', 'mercury'] }// Meen
};

// Classical Parashara True Yogakaraka (Single Planet simultaneously owning Kendra and Trikona)
const TRUE_YOGAKARAKAS = {
  0: [],            // Mesh: None
  1: ['saturn'],    // Vrishabh: Saturn (Lord of 9 & 10)
  2: [],            // Mithun: None
  3: ['mars'],      // Kark: Mars (Lord of 5 & 10)
  4: ['mars'],      // Simha: Mars (Lord of 4 & 9)
  5: [],            // Kanya: None
  6: ['saturn'],    // Tula: Saturn (Lord of 4 & 5)
  7: [],            // Vrishchik: None (Sun 10th lord, Moon 9th lord, Jupiter 2nd & 5th lord)
  8: [],            // Dhanu: None
  9: ['venus'],     // Makar: Venus (Lord of 5 & 10)
  10: ['venus'],    // Kumbh: Venus (Lord of 4 & 9)
  11: []            // Meen: None
};

const KENDRA_TRIKONA_HOUSES = [1, 4, 5, 7, 9, 10];

function generateKundaliReports(inputData) {
  const { lagna, planets } = inputData;
  const rawUccha = {};
  const planetDetails = {};
  let totalUccha = 0;
  let totalChesta = 0;

  // STEP 1: Mool Uccharashmi + Asta & Vakri Modifiers (Shlokas 6, 7, 14–16)
  for (const [p, pl] of Object.entries(planets)) {
    const absDeg = (pl.rashi * 30) + pl.degree;
    let kendra = Math.abs(absDeg - NEECHA_POINTS[p]);
    if (kendra > 180) kendra = 360 - kendra;

    let r = ((kendra / 30.0) * DHRUWANKS[p]) / 6.0;
    const baseUccha = parseFloat(r.toFixed(4));

    let isCombustZeroed = false;
    // Combustion (Shloka 14: Venus and Saturn never become 0)
    if (pl.is_combust && ['mars', 'mercury', 'jupiter'].includes(p)) {
      r = 0.0;
      isCombustZeroed = true;
    }

    // Retrograde (Shloka 14: 2x multiplier for taragrahas)
    let chesta = 0;
    let isVakriDoubled = false;
    if (pl.is_retrograde && !['sun', 'moon'].includes(p)) {
      chesta = r;
      r = r * 2.0;
      isVakriDoubled = true;
    } else {
      chesta = r * 0.30;
    }

    rawUccha[p] = parseFloat(r.toFixed(2));
    totalUccha += r;
    totalChesta += chesta;

    planetDetails[p] = {
      id: p,
      meta: PLANET_META[p] || { name: p, glyph: "🪐", color: "#d97706" },
      rashi: pl.rashi,
      degree: pl.degree,
      absDeg: parseFloat(absDeg.toFixed(2)),
      house: pl.house,
      kendraDeg: parseFloat(kendra.toFixed(2)),
      baseUccha,
      modifiedUccha: parseFloat(r.toFixed(2)),
      chestaRashmi: parseFloat(chesta.toFixed(2)),
      is_combust: !!pl.is_combust,
      is_combust_zeroed: isCombustZeroed,
      is_retrograde: !!pl.is_retrograde,
      is_vakri_doubled: isVakriDoubled,
      is_yogakaraka: false,
      is_true_yogakaraka: false,
      is_malefic: false,
      is_chaturguna: false,
      shodhanAdjustment: 0
    };
  }

  // STEP 2: Generic Multi-Planet Shodhan per House (Shloka 18)
  const rectified = { ...rawUccha };
  const houseMap = {};
  for (const [p, pl] of Object.entries(planets)) {
    if (!houseMap[pl.house]) houseMap[pl.house] = [];
    houseMap[pl.house].push(p);
  }

  const lagnaIndex = Number(lagna.rashi) % 12;
  const roles = LAGNA_RULES[lagnaIndex] || { yogakaraka: [], malefic: [] };
  const trueYogakarakas = TRUE_YOGAKARAKAS[lagnaIndex] || [];

  // Mark roles in planetDetails
  for (const p of Object.keys(planets)) {
    if (roles.yogakaraka.includes(p)) planetDetails[p].is_yogakaraka = true;
    if (roles.malefic.includes(p)) planetDetails[p].is_malefic = true;
    if (trueYogakarakas.includes(p)) planetDetails[p].is_true_yogakaraka = true;
  }

  const shodhanEvents = [];
  for (const [house, pList] of Object.entries(houseMap)) {
    if (pList.length > 1) {
      const yPlanets = pList.filter(p => roles.yogakaraka.includes(p));
      const mPlanets = pList.filter(p => roles.malefic.includes(p));

      if (yPlanets.length > 0 && mPlanets.length > 0) {
        let totalMaleficPool = mPlanets.reduce((sum, p) => sum + rectified[p], 0);
        const initialMaleficPool = totalMaleficPool;
        const initialYValues = {};
        yPlanets.forEach(y => { initialYValues[y] = rectified[y]; });

        // Deduct malefic pool against yogakarakas
        for (const y of yPlanets) {
          if (totalMaleficPool >= rectified[y]) {
            totalMaleficPool -= rectified[y];
            rectified[y] = 0.0; // Rajyoga completely canceled
          } else {
            rectified[y] = parseFloat((rectified[y] - totalMaleficPool).toFixed(2));
            totalMaleficPool = 0.0;
          }
          planetDetails[y].shodhanAdjustment = parseFloat((rectified[y] - initialYValues[y]).toFixed(2));
        }

        // Remaining malefic points distribution
        for (const m of mPlanets) {
          const prevM = rectified[m];
          if (totalMaleficPool > 0) {
            let used = Math.min(rectified[m], totalMaleficPool);
            rectified[m] = parseFloat(used.toFixed(2));
            totalMaleficPool -= used;
          } else {
            rectified[m] = 0.0; // Absorbed in shodhan
          }
          planetDetails[m].shodhanAdjustment = parseFloat((rectified[m] - prevM).toFixed(2));
        }

        shodhanEvents.push({
          house: parseInt(house),
          yogakarakas: yPlanets,
          malefics: mPlanets,
          initialMaleficPool: parseFloat(initialMaleficPool.toFixed(2)),
          finalYValues: Object.fromEntries(yPlanets.map(y => [y, rectified[y]])),
          finalMValues: Object.fromEntries(mPlanets.map(m => [m, rectified[m]]))
        });
      }
    }
  }

  // STEP 3: Rajyoga 4x Multiplier (Shloka 20)
  // Strictly applies ONLY to surviving single True Yogakarakas (simultaneous Kendra + Trikona lords)
  // placed in Kendra (1, 4, 7, 10) or Trikona (1, 5, 9)
  const chaturgunaEvents = [];
  for (const p of trueYogakarakas) {
    const plHouse = planets[p]?.house;
    if (rectified[p] > 0 && KENDRA_TRIKONA_HOUSES.includes(plHouse)) {
      const before = rectified[p];
      rectified[p] = parseFloat((rectified[p] * 4.0).toFixed(2));
      planetDetails[p].is_chaturguna = true;
      chaturgunaEvents.push({
        planet: p,
        before,
        after: rectified[p],
        house: plHouse
      });
    }
  }

  let totalRashmi = Object.values(rectified).reduce((acc, val) => acc + val, 0);
  totalRashmi = parseFloat(totalRashmi.toFixed(2));

  // Finalize planetDetails scores
  for (const [p, score] of Object.entries(rectified)) {
    planetDetails[p].finalRashmi = parseFloat(score.toFixed(2));
  }

  // STEP 4: Gomutrika Nyaya for Conveyance & Attendants (Shloka 40)
  const combined = totalUccha + totalChesta;
  const vahanSevakIndex = Math.floor((combined * (combined / 2.0)) / 60.0);

  // Return Standard JSON Payload for UI
  return {
    report_rajyoga_daridrayoga: {
      title: "Raajyoga Strength / Rashmi Bal",
      subtitle: "बृहत्पाराशरहोराशास्त्र (अध्याय ८: रश्मि फल वर्णन) अनुसार रश्मि-बल एवं राजयोग-दरिद्रयोग सामर्थ्य",
      planet_rashmi_scores: rectified,
      planet_details: planetDetails,
      total_score: totalRashmi,
      total_uccha: parseFloat(totalUccha.toFixed(2)),
      total_chesta: parseFloat(totalChesta.toFixed(2)),
      category: getCategoryTitle(totalRashmi),
      prediction: getCategoryPrediction(totalRashmi),
      shodhan_events: shodhanEvents,
      chaturguna_events: chaturgunaEvents,
      roles: roles,
      true_yogakarakas: trueYogakarakas
    },
    report_vahan_janbal: {
      title: "पाराशर वाहन एवं जनबल रिपोर्ट (गोमूत्रिका विधान)",
      subtitle: "बृहत्पाराशरहोराशास्त्र (श्लोक ३४–४०) अनुसार भौतिक सुख, वाहन एवं आश्रित सामर्थ्य",
      vahan_sevak_index: vahanSevakIndex,
      combined_rashmi: parseFloat(combined.toFixed(2)),
      half_combined: parseFloat((combined / 2.0).toFixed(2)),
      total_uccha: parseFloat(totalUccha.toFixed(2)),
      total_chesta: parseFloat(totalChesta.toFixed(2)),
      janbal_capacity: getJanbalText(totalRashmi),
      prediction: `बृहत्पाराशरहोराशास्त्र श्लोक ४० अनुसार आपके सप्तग्रहों की उच्चरश्मि (${parseFloat(totalUccha.toFixed(2))}) एवं चेष्टारश्मि (${parseFloat(totalChesta.toFixed(2))}) के गोमूत्रिका न्याय से प्राप्त वाहन-सेवक सूचकांक ${vahanSevakIndex} है। यह जातक के जीवन में निजी वाहन, भौतिक साधन, परिचारक व संगठनात्मक भरण-पोषण सामर्थ्य को दर्शाता है।`
    }
  };
}

function getCategoryTitle(score) {
  if (score <= 5.0) return "महादरिद्र एवं पराधीन वर्ग (श्लोक २३)";
  if (score <= 10.0) return "उदर-भरण एवं श्रमिक वर्ग (श्लोक २४)";
  if (score <= 13.0) return "अल्प-धन एवं संघर्ष वर्ग (श्लोक २५–२६)";
  if (score < 16.0) return "विद्वान, धार्मिक एवं कुटुंब-पोषक वर्ग (श्लोक २७–२८)";
  if (score <= 20.99) return "कुलेश, कीर्तिमान एवं सम्मानित वर्ग (श्लोक २९)";
  if (score <= 23.99) return "विख्यात, संपन्न एवं ५०+ जनपोषक वर्ग (श्लोक ३०–३१)";
  if (score <= 30.99) return "श्रीमान्, प्रतापी एवं राजप्रिय वर्ग (श्लोक ३२)";
  if (score <= 35.99) return "मंत्री, सेनापति एवं उच्चाधिकारी वर्ग (श्लोक ३३–३६)";
  if (score <= 40.99) return "देशाधिपत्य एवं संस्थान प्रमुख वर्ग (श्लोक ३७)";
  return "नृप एवं सार्वभौम शासक वर्ग (श्लोक ३८–३९)";
}

function getCategoryPrediction(score) {
  if (score <= 5.0) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक २३ अनुसार: रश्मि बल १ से ५ के मध्य होने पर जातक को अत्यधिक दरिद्रता, पराधीनता, कठिन श्रम के अनुपात में स्वल्प लाभ तथा जीवन निर्वाह हेतु पराए आश्रय का सामना करना पड़ता है।";
  }
  if (score <= 10.0) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक २४ अनुसार: रश्मि बल ५.०१ से १० के मध्य होने पर सामान्य उदर-पोषण मात्र की आय, आर्थिक अस्थिरता तथा जीवन-यापन हेतु निरंतर कठोर परिश्रम की आवश्यकता रहती है।";
  }
  if (score <= 13.0) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक २५–२६ अनुसार: रश्मि बल १०.०१ से १३ के मध्य होने पर सीमित वित्तीय संसाधन, पारिवारिक दायित्वों के निर्वहन में बाधाएं तथा उतार-चढ़ाव युक्त आर्थिक स्थिति रहती है।";
  }
  if (score < 16.0) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक २७–२८ अनुसार: रश्मि बल १३.०१ से १६ के मध्य होने पर जातक सदाचारी, बुद्धिमान, धर्मपरायण, कुटुंब का संतोषप्रद भरण-पोषण करने वाला तथा मर्यादित आजीविका युक्त होता है।";
  }
  if (score <= 20.99) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक २९ अनुसार: रश्मि बल १६.०१ से २०.९९ के मध्य होने पर जातक अपने कुल का मुख्य स्तम्भ (कुलेश), परिवार व आश्रितों का समर्थ पोषक, समाज में सम्मानित एवं कीर्तिमान व्यक्तित्व होता है।";
  }
  if (score <= 23.99) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक ३०–३१ अनुसार: रश्मि बल २१ से २३.९९ के मध्य होने पर जातक विख्यात, उदार, दानशील, ५० से अधिक व्यक्तियों/कर्मचारियों का भरण-पोषण करने वाला तथा आर्थिक दृष्टि से सशक्त होता है।";
  }
  if (score <= 30.99) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक ३२ अनुसार: रश्मि बल २४ से ३०.९९ के मध्य होने पर जातक श्रीमान् (विपुल संपदा से युक्त), आत्मबल व शौर्य से संपन्न, शासन व उच्चाधिकारियों में प्रतिष्ठित तथा जनप्रिय होता है।";
  }
  if (score <= 35.99) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक ३३–३६ अनुसार: रश्मि बल ३१ से ३५.९९ के मध्य होने पर जातक को उच्च प्रशासनिक अधिकार, नीति-निर्माता, विशाल संगठन अथवा प्रशासनिक तंत्र के संचालन का दायित्व प्राप्त होता है।";
  }
  if (score <= 40.99) {
    return "बृहत्पाराशरहोराशास्त्र श्लोक ३७ अनुसार: रश्मि बल ३६ से ४०.९९ के मध्य होने पर जातक विशाल भूभाग, संगठन अथवा बहु-शाखीय व्यापारिक साम्राज्य का प्रमुख (२५ से ३६ इकाइयों का सर्वाधिकारी) होता है।";
  }
  return "बृहत्पाराशरहोराशास्त्र श्लोक ३८–३९ अनुसार: रश्मि बल ४१ से अधिक होने पर जातक राष्ट्र अथवा शीर्ष स्तर का नेतृत्व, सार्वभौम शासक तुल्य विशेषाधिकार, अद्वितीय प्रतिष्ठा एवं अतुल्य कीर्ति से संपन्न होता है।";
}

function getJanbalText(score) {
  if (score < 16.0) return "सीमित पारिवारिक आश्रित (३ से ५ व्यक्ति)";
  if (score < 21.0) return "पारिवारिक व निकट आश्रितों का पूर्ण पोषण (१० से १५ व्यक्ति)";
  if (score < 32.0) return "मध्यम जनबल (५० व्यक्तियों/कर्मियों का भरण-पोषण व नेतृत्व सामर्थ्य)";
  if (score < 40.0) return "व्यापक जनबल (१०० से ५०० व्यक्तियों का नियंत्रण व मार्गदर्शन)";
  return "विशाल जनसमुदाय (५०० से १०००+ व्यक्तियों/संस्थान का पोषण व सर्वाधिकार)";
}

// UMD / Global Window Export for browser and node environments
if (typeof window !== 'undefined') {
  window.generateKundaliReports = generateKundaliReports;
  window.calculateRashmiReports = generateKundaliReports;
  window.LAGNA_RULES = LAGNA_RULES;
  window.TRUE_YOGAKARAKAS = TRUE_YOGAKARAKAS;
  window.KENDRA_TRIKONA_HOUSES = KENDRA_TRIKONA_HOUSES;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateKundaliReports,
    calculateRashmiReports: generateKundaliReports,
    LAGNA_RULES,
    TRUE_YOGAKARAKAS,
    KENDRA_TRIKONA_HOUSES,
    NEECHA_POINTS,
    DHRUWANKS,
    PLANET_META
  };
}
