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

  // Mark roles in planetDetails
  for (const p of Object.keys(planets)) {
    if (roles.yogakaraka.includes(p)) planetDetails[p].is_yogakaraka = true;
    if (roles.malefic.includes(p)) planetDetails[p].is_malefic = true;
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
  // Strictly applies ONLY to surviving yogakarakas placed in Kendra (1,4,7,10) or Trikona (1,5,9)
  const chaturgunaEvents = [];
  for (const p of roles.yogakaraka) {
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
      title: "राजयोग-दरिद्रयोग रिपोर्ट",
      subtitle: "बृहत्पाराशरहोराशास्त्र अनुसार रश्मि-बल एवं योग शोधन विश्लेषण",
      planet_rashmi_scores: rectified,
      planet_details: planetDetails,
      total_score: totalRashmi,
      total_uccha: parseFloat(totalUccha.toFixed(2)),
      total_chesta: parseFloat(totalChesta.toFixed(2)),
      category: getCategoryTitle(totalRashmi),
      prediction: getCategoryPrediction(totalRashmi),
      shodhan_events: shodhanEvents,
      chaturguna_events: chaturgunaEvents,
      roles: roles
    },
    report_vahan_janbal: {
      title: "पाराशर वाहन एवं जनबल रिपोर्ट",
      subtitle: "गोमूत्रिका विधान अनुसार भौतिक सुख, वाहन एवं आश्रित सामर्थ्य",
      vahan_sevak_index: vahanSevakIndex,
      combined_rashmi: parseFloat(combined.toFixed(2)),
      half_combined: parseFloat((combined / 2.0).toFixed(2)),
      janbal_capacity: getJanbalText(totalRashmi),
      prediction: `गोमूत्रिका न्याय अनुसार आपके जीवन में भौतिक वाहनों, सहायकों व सुख-साधनों का सामर्थ्य सूचकांक ${vahanSevakIndex} है।`
    }
  };
}

function getCategoryTitle(score) {
  if (score <= 13) return "कष्ट एवं संघर्ष वर्ग (श्लोक २३–२६)";
  if (score <= 20) return "कुलेश एवं पोषक वर्ग (श्लोक २७–२९)";
  if (score <= 30) return "श्रीमान् एवं राजप्रिय वर्ग (श्लोक ३०–३२)";
  return "देशाधिपत्य एवं शासक वर्ग (श्लोक ३३–३९)";
}

function getCategoryPrediction(score) {
  if (score <= 13) return "जीवन के आरंभिक काल में अत्यधिक संघर्ष, परिश्रम के अनुपात में सीमित लाभ तथा आर्थिक उतार-चढ़ाव।";
  if (score <= 20) return "परिवार व कुटुम्ब के मुख्य पोषक, समाज में सम्मानित, दायित्ववान एवं स्थायी प्रतिष्ठा।";
  if (score <= 30) return "विपुल धन-धान्य, शासन-प्रशासन में प्रतिष्ठा, उच्चाधिकारियों का सहयोग एवं प्रतापी व्यक्तित्व।";
  return "विशाल जनसमूह का नेतृत्व, उच्च प्रशासनिक पद, संस्था प्रमुख अथवा शासक-तुल्य अधिकार व आधिपत्य।";
}

function getJanbalText(score) {
  if (score < 21) return "सीमित पारिवारिक स्तर (५ से १० निकटवर्ती आश्रितों का भरण-पोषण)";
  if (score < 32) return "मध्यम जनबल (५० व्यक्तियों/कर्मियों का भरण-पोषण व नेतृत्व सामर्थ्य)";
  return "विशाल जनबल (५०० से १०००+ व्यक्तियों/संस्थान का पोषण व मार्गदर्शन)";
}

// UMD / Global Window Export for browser and node environments
if (typeof window !== 'undefined') {
  window.generateKundaliReports = generateKundaliReports;
  window.LAGNA_RULES = LAGNA_RULES;
  window.KENDRA_TRIKONA_HOUSES = KENDRA_TRIKONA_HOUSES;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateKundaliReports,
    LAGNA_RULES,
    KENDRA_TRIKONA_HOUSES,
    NEECHA_POINTS,
    DHRUWANKS,
    PLANET_META
  };
}
