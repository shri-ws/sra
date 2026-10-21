/**
 * Master Parashar Rashmi & Gomutrika Engine
 * File: rashmiMasterService.js
 * Classical Authority: Brihat Parashara Hora Shastra, Uttara Khanda, Ch. 8 (Shlokas 1-40)
 */

const NEECHA_DEGREES = {
  sun: 190.0,     // Tula 10
  moon: 213.0,    // Vrishchik 3
  mars: 118.0,    // Kark 28
  mercury: 345.0, // Meen 15
  jupiter: 275.0, // Makar 5
  venus: 177.0,   // Kanya 27
  saturn: 20.0    // Mesh 20
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

// Classical Master Configuration for 12 Lagnas (0 = Mesh, 1 = Vrishabh ... 11 = Meen)
const LAGNA_RULES = {
  0:  { yogakaraka: [],                  malefic: ['mercury'] },
  1:  { yogakaraka: ['saturn'],          malefic: ['jupiter', 'mars'] },
  2:  { yogakaraka: [],                  malefic: ['mars'] },
  3:  { yogakaraka: ['mars'],            malefic: ['mercury', 'venus'] },
  4:  { yogakaraka: ['mars'],            malefic: ['mercury', 'venus'] },
  5:  { yogakaraka: [],                  malefic: ['mars'] },
  6:  { yogakaraka: ['saturn'],          malefic: ['jupiter', 'sun'] },
  7:  { yogakaraka: [],                  malefic: ['mercury', 'venus'] },
  8:  { yogakaraka: [],                  malefic: ['venus'] },
  9:  { yogakaraka: ['venus'],           malefic: ['sun', 'jupiter', 'mars'] },
  10: { yogakaraka: ['venus'],           malefic: ['moon', 'jupiter'] },
  11: { yogakaraka: [],                  malefic: ['venus', 'saturn'] }
};

// Shastra-sanmat functional benefics for Shodhan (Kendra/Trikona lords in conjunction)
const FUNCTIONAL_BENEFICS_FOR_SHODHAN = {
  0: ['sun', 'jupiter', 'mars'],
  1: ['saturn', 'mercury'],
  2: ['mercury', 'venus'],
  3: ['mars', 'moon', 'jupiter'],
  4: ['mars', 'sun', 'jupiter'],
  5: ['mercury', 'venus'],
  6: ['saturn', 'mercury', 'venus'],
  7: ['sun', 'jupiter', 'moon'],
  8: ['jupiter', 'sun', 'mars'],
  9: ['venus', 'saturn'],
  10: ['venus', 'saturn'],
  11: ['moon', 'jupiter', 'mars']
};

function calculateRashmiReports(chartInput) {
  const { lagna, planets } = chartInput;
  const lagnaRashi = Number(lagna.rashi) % 12;
  const lagnaConfig = LAGNA_RULES[lagnaRashi] || { yogakaraka: [], malefic: [] };
  const shodhanBenefics = FUNCTIONAL_BENEFICS_FOR_SHODHAN[lagnaRashi] || lagnaConfig.yogakaraka;

  const rawUccha = {};
  const baseChesta = {};
  let sumBaseUccha = 0;
  let sumChesta = 0;

  // -------------------------------------------------------------
  // STEP 1: Base Uccharashmi, Combustion and Retrograde (Shlokas 6, 7, 14)
  // -------------------------------------------------------------
  for (const [planetName, pData] of Object.entries(planets)) {
    const absDeg = (pData.rashi * 30.0) + pData.degree;
    let dist = Math.abs(absDeg - NEECHA_DEGREES[planetName]);
    if (dist > 180.0) dist = 360.0 - dist;

    const kendraRashi = dist / 30.0;
    let r = (kendraRashi * DHRUWANKS[planetName]) / 6.0;

    // Chesta Rashmi calculation baseline
    let c = 0;
    if (pData.is_retrograde && !['sun', 'moon'].includes(planetName)) {
      c = r;
      r = r * 2.0; // Shloka 14: Retrograde doubles ray strength
    } else {
      c = r * 0.30; // Direct motion baseline chesta
    }

    // Shloka 14: Combustion (Venus & Saturn NEVER combust to zero)
    if (pData.is_combust && ['mars', 'mercury', 'jupiter'].includes(planetName)) {
      r = 0.0;
    }

    rawUccha[planetName] = parseFloat(r.toFixed(2));
    baseChesta[planetName] = parseFloat(c.toFixed(2));
    sumBaseUccha += r;
    sumChesta += c;
  }

  // -------------------------------------------------------------
  // STEP 2: Conjunction Shodhan per House (Shloka 18)
  // -------------------------------------------------------------
  const rectified = { ...rawUccha };
  const houseMap = {};
  for (const [planetName, pData] of Object.entries(planets)) {
    const h = pData.house;
    if (!houseMap[h]) houseMap[h] = [];
    houseMap[h].push(planetName);
  }

  for (const [houseNo, pList] of Object.entries(houseMap)) {
    if (pList.length > 1) {
      // Functional benefics (Kendra/Trikona lords) conjoined with malefics in same house
      const yPlanets = pList.filter(p => shodhanBenefics.includes(p));
      const mPlanets = pList.filter(p => lagnaConfig.malefic.includes(p));

      if (yPlanets.length > 0 && mPlanets.length > 0) {
        let maleficPool = mPlanets.reduce((acc, p) => acc + rectified[p], 0);

        for (const y of yPlanets) {
          if (maleficPool >= rectified[y]) {
            maleficPool -= rectified[y];
            rectified[y] = 0.0; // Rajyoga/Benefic rays completely destroyed
          } else {
            rectified[y] = parseFloat((rectified[y] - maleficPool).toFixed(2));
            maleficPool = 0.0;
          }
        }

        // Remaining malefic points assignment
        for (const m of mPlanets) {
          if (maleficPool > 0) {
            const rem = Math.min(rectified[m], maleficPool);
            rectified[m] = parseFloat(rem.toFixed(2));
            maleficPool -= rem;
          } else {
            rectified[m] = 0.0; // Absorbed in destroying the rajyoga
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 3: Rajyoga 4x Multiplier (Shloka 20)
  // Strict condition: Must be designated single-handed yogakaraka, survived shodhan (> 0),
  // and placed in Kendra (1,4,7,10) or Trikona (1,5,9)
  // -------------------------------------------------------------
  const KENDRA_TRIKONA = [1, 4, 5, 7, 9, 10];
  for (const p of lagnaConfig.yogakaraka) {
    const pHouse = planets[p]?.house;
    if (rectified[p] > 0.0 && KENDRA_TRIKONA.includes(pHouse)) {
      rectified[p] = parseFloat((rectified[p] * 4.0).toFixed(2));
    }
  }

  let totalScore = Object.values(rectified).reduce((acc, val) => acc + val, 0);
  totalScore = parseFloat(totalScore.toFixed(2));

  // -------------------------------------------------------------
  // STEP 4: Gomutrika Nyaya for Conveyance & Attendants (Shloka 40)
  // -------------------------------------------------------------
  const combined = sumBaseUccha + sumChesta;
  const halfCombined = combined / 2.0;
  const vahanSevakIndex = Math.floor((combined * halfCombined) / 60.0);

  const slab = resolveSlab(totalScore);

  return {
    report_rajyoga_daridrayoga: {
      report_title: "राजयोग-दरिद्रयोग रिपोर्ट (पाराशर रश्मि-बल विधान)",
      title: "राजयोग-दरिद्रयोग रिपोर्ट (पाराशर रश्मि-बल विधान)",
      total_score: totalScore,
      total_rashmi_bal: totalScore,
      planet_scores: rectified,
      planet_rashmi_scores: rectified,
      slab_shloka: slab.shloka,
      category_name: slab.title,
      category: slab.title,
      prediction_text: slab.prediction,
      prediction: slab.prediction
    },
    report_vahan_janbal: {
      report_title: "पाराशर वाहन एवं जनबल रिपोर्ट (गोमूत्रिका विधान)",
      title: "पाराशर वाहन एवं जनबल रिपोर्ट (गोमूत्रिका विधान)",
      vahan_sevak_index: vahanSevakIndex,
      janbal_capacity: resolveJanbal(totalScore),
      combined_sum: parseFloat(combined.toFixed(2)),
      combined_rashmi: parseFloat(combined.toFixed(2)),
      half_combined: parseFloat(halfCombined.toFixed(2)),
      prediction_text: `गोमूत्रिका न्याय अनुसार आपके जीवन में भौतिक वाहनों, सहायकों व सुख-साधनों का सामर्थ्य सूचकांक ${vahanSevakIndex} है।`,
      prediction: `गोमूत्रिका न्याय अनुसार आपके जीवन में भौतिक वाहनों, सहायकों व सुख-साधनों का सामर्थ्य सूचकांक ${vahanSevakIndex} है।`
    }
  };
}

function resolveSlab(score) {
  if (score <= 5.0) {
    return {
      shloka: "श्लोक २३",
      title: "महादरिद्र एवं पराधीन वर्ग",
      prediction: "जीवन में अत्यधिक संघर्ष, पराधीनता, परिश्रम के अनुपात में स्वल्प लाभ एवं आजीविका हेतु निरंतर श्रम।"
    };
  } else if (score <= 10.0) {
    return {
      shloka: "श्लोक २४",
      title: "उदर-भरण एवं श्रमिक वर्ग",
      prediction: "सामान्य उदर-पोषण योग्य आय, आर्थिक अस्थिरता तथा जीवन-यापन हेतु कठोर परिश्रम की आवश्यकता।"
    };
  } else if (score <= 13.0) {
    return {
      shloka: "श्लोक २५-२६",
      title: "अल्प-धन एवं संघर्ष वर्ग",
      prediction: "सीमित वित्तीय संसाधन, पारिवारिक दायित्वों के निर्वहन में बाधाएं तथा उतार-चढ़ाव युक्त आर्थिक स्थिति।"
    };
  } else if (score < 16.0) {
    return {
      shloka: "श्लोक २७-२८",
      title: "विद्वान, धार्मिक एवं कुटुंब-पोषक वर्ग",
      prediction: "सदाचारी, बुद्धिमान, धर्मपरायण, कुटुंब का संतोषप्रद भरण-पोषण करने वाला तथा मर्यादित आजीविका युक्त।"
    };
  } else if (score <= 20.99) {
    return {
      shloka: "श्लोक २९",
      title: "कुलेश, कीर्तिमान एवं सम्मानित वर्ग",
      prediction: "कुल का मुख्य स्तम्भ (कुलेश), परिवार व आश्रितों का समर्थ पोषक, समाज में सम्मानित एवं कीर्तिमान व्यक्तित्व।"
    };
  } else if (score <= 23.99) {
    return {
      shloka: "श्लोक ३०-३१",
      title: "विख्यात, संपन्न एवं ५०+ जनपोषक वर्ग",
      prediction: "विख्यात, उदार, दानशील, ५० से अधिक व्यक्तियों/कर्मचारियों का भरण-पोषण करने वाला तथा आर्थिक दृष्टि से सशक्त।"
    };
  } else if (score <= 30.99) {
    return {
      shloka: "श्लोक ३२",
      title: "श्रीमान्, प्रतापी एवं राजप्रिय वर्ग",
      prediction: "श्रीमान् (विपुल संपदा से युक्त), आत्मबल व शौर्य से संपन्न, शासन व उच्चाधिकारियों में प्रतिष्ठित तथा जननायक।"
    };
  } else if (score <= 35.99) {
    return {
      shloka: "श्लोक ३३-३६",
      title: "मंत्री, सेनापति एवं उच्चाधिकारी वर्ग",
      prediction: "उच्च प्रशासनिक अधिकार, नीति-निर्माता, विशाल संगठन अथवा सैन्य/प्रशासनिक तंत्र का संचालक।"
    };
  } else if (score <= 40.99) {
    return {
      shloka: "श्लोक ३७",
      title: "देशाधिपत्य एवं संस्थान प्रमुख वर्ग",
      prediction: "विशाल भूभाग, संगठन अथवा बहु-शाखीय व्यापारिक साम्राज्य का प्रमुख; २५ से ३६ ग्रामों/इकाइयों का सर्वाधिकारी।"
    };
  } else {
    return {
      shloka: "श्लोक ३८-३९",
      title: "नृप एवं सार्वभौम शासक वर्ग",
      prediction: "राष्ट्र अथवा शीर्ष स्तर का नेतृत्व, सार्वभौम शासक तुल्य विशेषाधिकार, अद्वितीय प्रतिष्ठा एवं अतुल्य कीर्ति।"
    };
  }
}

function resolveJanbal(score) {
  if (score < 16.0) {
    return "सीमित पारिवारिक आश्रित (३ से ५ व्यक्ति)";
  } else if (score < 21.0) {
    return "पारिवारिक व निकट आश्रितों का पूर्ण पोषण (१० से १५ व्यक्ति)";
  } else if (score < 32.0) {
    return "मध्यम जनबल (५० व्यक्तियों/कर्मियों का भरण-पोषण व नेतृत्व सामर्थ्य)";
  } else if (score < 40.0) {
    return "व्यापक जनबल (१०० से ५०० व्यक्तियों का नियंत्रण व मार्गदर्शन)";
  } else {
    return "विशाल जनसमुदाय (५०० से १०००+ व्यक्तियों/संस्थान का पोषण व सर्वाधिकार)";
  }
}

// UMD / Global Window & Module Export
if (typeof window !== 'undefined') {
  window.calculateRashmiReports = calculateRashmiReports;
  window.generateKundaliReports = calculateRashmiReports;
  window.LAGNA_RULES = LAGNA_RULES;
  window.NEECHA_DEGREES = NEECHA_DEGREES;
  window.DHRUWANKS = DHRUWANKS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateRashmiReports,
    generateKundaliReports: calculateRashmiReports,
    LAGNA_RULES,
    NEECHA_DEGREES,
    DHRUWANKS,
    resolveSlab,
    resolveJanbal
  };
}
