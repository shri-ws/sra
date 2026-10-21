/**
 * Parashar Rashmi & Governance Engine
 * Module: rashmiReportsService.js
 * Reference: Brihat Parashara Hora Shastra (BPHS), Chapter 8: Rashmi Phala Adhyaya (Shlokas 1–40)
 */

const NEECHA_POINTS = {
  sun: 190.0,     // Tula 10°
  moon: 213.0,    // Vrishchik 3°
  mars: 118.0,    // Kark 28°
  mercury: 345.0, // Meen 15°
  jupiter: 275.0, // Makar 5°
  venus: 177.0,   // Kanya 27°
  saturn: 20.0    // Mesh 20°
};

const DHRUWANKS = {
  sun: 10,
  moon: 9,
  mars: 5,
  mercury: 5,
  jupiter: 7,
  venus: 8,
  saturn: 5
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

// Functionally benefic/yogakaraka based on Lagna index (0=Mesh...11=Meen)
function getFunctionalRoles(lagnaRashi) {
  const roles = { yogakaraka: [], malefic: [] };
  switch (lagnaRashi) {
    case 0: // Mesh
      roles.yogakaraka = ['sun', 'jupiter'];
      roles.malefic = ['mercury'];
      break;
    case 1: // Vrishabh
      roles.yogakaraka = ['saturn', 'mercury'];
      roles.malefic = ['jupiter', 'mars'];
      break;
    case 2: // Mithun
      roles.yogakaraka = ['venus', 'mercury'];
      roles.malefic = ['mars', 'jupiter'];
      break;
    case 3: // Kark
      roles.yogakaraka = ['mars', 'moon'];
      roles.malefic = ['mercury', 'venus'];
      break;
    case 4: // Singh
      roles.yogakaraka = ['mars', 'sun'];
      roles.malefic = ['mercury', 'venus'];
      break;
    case 5: // Kanya
      roles.yogakaraka = ['venus', 'mercury'];
      roles.malefic = ['mars', 'jupiter'];
      break;
    case 6: // Tula
      roles.yogakaraka = ['saturn'];
      roles.malefic = ['jupiter'];
      break;
    case 7: // Vrishchik
      roles.yogakaraka = ['sun', 'jupiter'];
      roles.malefic = ['mercury', 'venus'];
      break;
    case 8: // Dhanu
      roles.yogakaraka = ['sun', 'mars'];
      roles.malefic = ['venus', 'mercury'];
      break;
    case 9: // Makar
      roles.yogakaraka = ['venus', 'saturn'];
      roles.malefic = ['sun', 'jupiter'];
      break;
    case 10: // Kumbha
      roles.yogakaraka = ['venus'];
      roles.malefic = ['moon', 'jupiter'];
      break;
    case 11: // Meen
      roles.yogakaraka = ['moon', 'mars'];
      roles.malefic = ['sun', 'venus', 'mercury'];
      break;
    default:
      roles.yogakaraka = ['jupiter'];
      roles.malefic = ['saturn'];
  }
  return roles;
}

function getCategoryTitle(score) {
  if (score <= 5) return "महादरिद्र एवं पराधीनता वर्ग (श्लोक २३)";
  if (score <= 10) return "साधारण उदर-पोषण वर्ग (श्लोक २४)";
  if (score <= 13) return "कष्ट एवं संघर्ष वर्ग (श्लोक २५–२६)";
  if (score <= 15) return "कुटुंब पोषक एवं स्थिर वर्ग (श्लोक २७–२८)";
  if (score <= 20) return "कुलेश एवं पोषक वर्ग (श्लोक २७–२९)";
  if (score <= 23) return "विख्यात एवं दानशील वर्ग (श्लोक ३०–३१)";
  if (score <= 30) return "श्रीमान् एवं राजप्रिय वर्ग (श्लोक ३०–३२)";
  if (score <= 35) return "मंत्री, सेनापति व जननायक वर्ग (श्लोक ३३–३६)";
  if (score <= 40) return "क्षेत्राधिपति एवं उच्च प्रशासक वर्ग (श्लोक ३७)";
  return "देशाधिपत्य एवं शासक वर्ग (श्लोक ३३–३९)";
}

function getCategoryPrediction(score) {
  if (score <= 5) return "जीवन में अत्यधिक परिश्रम, पराधीनता तथा धन का अभाव। कठिन संघर्षों के उपरांत ही प्राथमिक आवश्यकताएं पूर्ण होती हैं।";
  if (score <= 10) return "साधारण उदर-पोषण, अनिश्चित आजीविका। जीवन में उतार-चढ़ाव बना रहता है तथा संचय सीमित रहता है।";
  if (score <= 13) return "जीवन के आरंभिक काल में अत्यधिक संघर्ष, परिश्रम के अनुपात में सीमित लाभ तथा आर्थिक उतार-चढ़ाव।";
  if (score <= 15) return "शांत, विचारशील व बुद्धिमान व्यक्तित्व। कुटुंब का निष्ठावान पोषक, निश्चित एवं स्थिर आय के स्रोत।";
  if (score <= 20) return "परिवार व कुटुम्ब के मुख्य पोषक (कुलेश), समाज में सम्मानित, दायित्ववान एवं स्थायी प्रतिष्ठा।";
  if (score <= 23) return "विख्यात, परोपकारी एवं दानशील। अपने सामर्थ्य से ५० से अधिक आश्रितों व कर्मचारियों का कुशल पालक।";
  if (score <= 30) return "विपुल धन-धान्य, शासन-प्रशासन में प्रतिष्ठा, उच्चाधिकारियों का सहयोग एवं प्रतापी व्यक्तित्व।";
  if (score <= 35) return "मंत्री, सेनापति, संस्था प्रमुख अथवा जननायक। व्यापक जनसमूह का नेतृत्व तथा शासन-प्रशासन में प्रभावशाली सत्ता।";
  if (score <= 40) return "विशाल क्षेत्र, उद्योग या मंडलाधिपति तुल्य प्रभाव। उच्च प्रशासनिक पद, नीति-निर्धारक अधिकार एवं सर्वमान्य प्रतिष्ठा।";
  return "विशाल जनसमूह का नेतृत्व, उच्च प्रशासनिक पद, संस्था प्रमुख अथवा शासक-तुल्य अधिकार व आधिपत्य।";
}

function getJanbalText(score) {
  if (score < 21) return "सीमित पारिवारिक स्तर (५ से १० निकटवर्ती आश्रितों का भरण-पोषण)";
  if (score < 32) return "मध्यम जनबल (५० व्यक्तियों/कर्मियों का भरण-पोषण व नेतृत्व सामर्थ्य)";
  if (score < 35) return "उच्च जनबल (४५ से १०० प्रमुख कार्मिकों/अधिकारियों का प्रबंधन)";
  return "विशाल जनबल (५०० से १०००+ व्यक्तियों/संस्थान का पोषण व मार्गदर्शन)";
}

function generateKundaliReports(inputData) {
  const { lagna, planets } = inputData;
  const rawUccha = {};
  const planetDetails = {};
  let totalUccha = 0;
  let totalChesta = 0;

  // Step 1: Mool Uccharashmi + Asta/Vakri Modifiers (Shlokas 6, 7, 14–16)
  for (const [p, pl] of Object.entries(planets)) {
    const absDeg = (pl.rashi * 30) + pl.degree;
    let kendra = Math.abs(absDeg - NEECHA_POINTS[p]);
    if (kendra > 180) kendra = 360 - kendra;

    let r = ((kendra / 30.0) * DHRUWANKS[p]) / 6.0;
    const baseUccha = parseFloat(r.toFixed(4));

    let isCombustZeroed = false;
    // Asta check (Shloka 14: Venus and Saturn never combust to zero)
    if (pl.is_combust && ['mars', 'mercury', 'jupiter'].includes(p)) {
      r = 0.0;
      isCombustZeroed = true;
    }

    // Vakri check (Shloka 14: 2x multiplier)
    let chesta = 0;
    let isVakriDoubled = false;
    if (pl.is_retrograde && !['sun', 'moon'].includes(p)) {
      chesta = r;
      r *= 2.0;
      isVakriDoubled = true;
    } else {
      chesta = r * 0.3;
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

  // Step 2: Rajyoga vs Daridrayoga Shodhan (Shloka 18)
  const rectified = { ...rawUccha };
  const houseMap = {};
  for (const [p, pl] of Object.entries(planets)) {
    if (!houseMap[pl.house]) houseMap[pl.house] = [];
    houseMap[pl.house].push(p);
  }

  const { yogakaraka, malefic } = getFunctionalRoles(lagna.rashi);

  // Mark roles in planetDetails
  for (const p of Object.keys(planets)) {
    if (yogakaraka.includes(p)) planetDetails[p].is_yogakaraka = true;
    if (malefic.includes(p)) planetDetails[p].is_malefic = true;
  }

  const shodhanEvents = [];
  for (const [house, pList] of Object.entries(houseMap)) {
    if (pList.length > 1) {
      const yPlanet = pList.find(p => yogakaraka.includes(p));
      const mPlanet = pList.find(p => malefic.includes(p));

      if (yPlanet && mPlanet) {
        const prevY = rectified[yPlanet];
        const prevM = rectified[mPlanet];
        if (rectified[mPlanet] >= rectified[yPlanet]) {
          rectified[mPlanet] -= rectified[yPlanet];
          rectified[yPlanet] = 0.0;
        } else {
          rectified[yPlanet] -= rectified[mPlanet];
          rectified[mPlanet] = 0.0;
        }
        planetDetails[yPlanet].shodhanAdjustment = parseFloat((rectified[yPlanet] - prevY).toFixed(2));
        planetDetails[mPlanet].shodhanAdjustment = parseFloat((rectified[mPlanet] - prevM).toFixed(2));
        shodhanEvents.push({
          house: parseInt(house),
          yogakaraka: yPlanet,
          malefic: mPlanet,
          prevY,
          prevM,
          finalY: rectified[yPlanet],
          finalM: rectified[mPlanet]
        });
      }
    }
  }

  // Step 3: Rajyoga 4x Multiplier (Shloka 20)
  const chaturgunaEvents = [];
  for (const p of yogakaraka) {
    if (rectified[p] > 0 && ![6, 8, 12].includes(planets[p].house)) {
      const before = rectified[p];
      rectified[p] = parseFloat((rectified[p] * 4.0).toFixed(2));
      planetDetails[p].is_chaturguna = true;
      chaturgunaEvents.push({
        planet: p,
        before,
        after: rectified[p],
        house: planets[p].house
      });
    }
  }

  let totalRashmi = Object.values(rectified).reduce((acc, val) => acc + val, 0);
  totalRashmi = parseFloat(totalRashmi.toFixed(2));

  // Finalize planetDetails scores
  for (const [p, score] of Object.entries(rectified)) {
    planetDetails[p].finalRashmi = parseFloat(score.toFixed(2));
  }

  // Step 4: Gomutrika Nyaya for Conveyance & Attendants (Shloka 40)
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
      roles: { yogakaraka, malefic }
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

// UMD / Global Window Export for browser and node environments
if (typeof window !== 'undefined') {
  window.generateKundaliReports = generateKundaliReports;
  window.getFunctionalRoles = getFunctionalRoles;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateKundaliReports,
    getFunctionalRoles,
    NEECHA_POINTS,
    DHRUWANKS,
    PLANET_META
  };
}
