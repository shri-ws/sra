/**
 * =============================================================================
 * ASHTAKAVARGA REDUCTIONS & AYURDAYA ENGINE (अष्टकवर्ग शोधन एवं पिण्डसाधनायुर्दाय)
 * Classical Authority: Brihat Parashara Hora Shastra (Chapters 84 & 85)
 * =============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AshtakavargaReductionEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Rashi Multipliers (राशिकारक गुणांक — BPHS Ch. 85 Shloka 2)
  const RASHI_GUNAKARA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];

  // Graha Multipliers (ग्रहकारक गुणांक — BPHS Ch. 85 Shloka 3)
  const GRAHA_GUNAKARA = {
    Sun: 5,
    Moon: 5,
    Mars: 8,
    Mercury: 5,
    Jupiter: 10,
    Venus: 7,
    Saturn: 5
  };

  // Dual-sign ownership pairs (Mars, Venus, Mercury, Jupiter, Saturn)
  const DUAL_SIGN_PAIRS = [
    { planet: 'Mars', signs: [0, 7] },      // Aries, Scorpio
    { planet: 'Venus', signs: [1, 6] },     // Taurus, Libra
    { planet: 'Mercury', signs: [2, 5] },   // Gemini, Virgo
    { planet: 'Jupiter', signs: [8, 11] },  // Sagittarius, Pisces
    { planet: 'Saturn', signs: [9, 10] }    // Capricorn, Aquarius
  ];

  // Trines (त्रिकोण — Fire, Earth, Air, Water)
  const TRINES = [
    [0, 4, 8],   // Fire: Aries, Leo, Sagittarius
    [1, 5, 9],   // Earth: Taurus, Virgo, Capricorn
    [2, 6, 10],  // Air: Gemini, Libra, Aquarius
    [3, 7, 11]   // Water: Cancer, Scorpio, Pisces
  ];

  /**
   * 1. TRIKONA SHODHANA (Trinal Reduction — BPHS Ch. 84 Shlokas 1–4)
   */
  function computeTrikonaShodhana(bavVector) {
    const shodhita = [...bavVector];
    for (const trine of TRINES) {
      const minVal = Math.min(shodhita[trine[0]], shodhita[trine[1]], shodhita[trine[2]]);
      if (minVal > 0) {
        shodhita[trine[0]] -= minVal;
        shodhita[trine[1]] -= minVal;
        shodhita[trine[2]] -= minVal;
      }
    }
    return shodhita;
  }

  /**
   * 2. EKADHIPATYA SHODHANA (Dual Rulership Reduction — BPHS Ch. 84 Shlokas 5–12)
   */
  function computeEkadhipatyaShodhana(trikonaVector, occupiedSignsSet) {
    const shodhita = [...trikonaVector];

    for (const pair of DUAL_SIGN_PAIRS) {
      const [s1, s2] = pair.signs;
      const b1 = shodhita[s1];
      const b2 = shodhita[s2];

      // Rule 1: If either sign has 0 bindus, no reduction
      if (b1 === 0 || b2 === 0) continue;

      const p1Occ = occupiedSignsSet.has(s1);
      const p2Occ = occupiedSignsSet.has(s2);

      // Rule 2: If both signs have planets, no reduction
      if (p1Occ && p2Occ) continue;

      // Rule 3: If neither sign is occupied by planets
      if (!p1Occ && !p2Occ) {
        if (b1 === b2) {
          shodhita[s1] = 0;
          shodhita[s2] = 0;
        } else if (b1 < b2) {
          shodhita[s1] = 0;
          shodhita[s2] = b2 - b1;
        } else {
          shodhita[s2] = 0;
          shodhita[s1] = b1 - b2;
        }
        continue;
      }

      // Rule 4: One sign is occupied, the other is vacant
      const occSign = p1Occ ? s1 : s2;
      const vacSign = p1Occ ? s2 : s1;

      if (shodhita[vacSign] > shodhita[occSign]) {
        shodhita[vacSign] = shodhita[occSign];
      } else {
        shodhita[vacSign] = 0;
      }
    }

    return shodhita;
  }

  /**
   * 3. PINDA SADHANA (Product Multipliers & Yoga Pinda — BPHS Ch. 85)
   */
  function computePindaSadhana(finalShodhitaVector, planetsMap) {
    let rashiPinda = 0;
    for (let s = 0; s < 12; s++) {
      rashiPinda += finalShodhitaVector[s] * RASHI_GUNAKARA[s];
    }

    let grahaPinda = 0;
    for (const [pId, mult] of Object.entries(GRAHA_GUNAKARA)) {
      const pObj = planetsMap[pId];
      if (pObj) {
        const signIdx = pObj.sign !== undefined ? pObj.sign : Math.floor(pObj.abs / 30);
        grahaPinda += finalShodhitaVector[signIdx] * mult;
      }
    }

    const yogaPinda = rashiPinda + grahaPinda;

    return {
      rashiPinda,
      grahaPinda,
      yogaPinda
    };
  }

  /**
   * 4. ASHTAKAVARGA AYURDAYA LONGEVITY (BPHS Ch. 85 Shlokas 7–15)
   */
  function computeAshtakavargaAyurdaya(yogaPinda, housePlacement = 1, isCombust = false, isEnemySign = false) {
    // Unreduced Base Years = (Yoga Pinda * 7) / 27
    let unreducedYears = (yogaPinda * 7.0) / 27.0;

    let totalReduction = 0;

    // A. Chakrapata Harana (Visible Hemisphere 12th down to 7th house)
    const CHAKRAPATA_FACTORS = {
      12: 1.0,
      11: 1.0 / 2.0,
      10: 1.0 / 3.0,
      9: 1.0 / 4.0,
      8: 1.0 / 5.0,
      7: 1.0 / 6.0
    };
    if (CHAKRAPATA_FACTORS[housePlacement]) {
      totalReduction += unreducedYears * CHAKRAPATA_FACTORS[housePlacement];
    }

    // B. Shatrukshetra Harana (1/3 reduction if in enemy sign)
    if (isEnemySign) {
      totalReduction += (unreducedYears / 3.0);
    }

    // C. Asta Harana (1/2 reduction if combust)
    if (isCombust) {
      totalReduction += (unreducedYears / 2.0);
    }

    const netYears = Math.max(0, unreducedYears - totalReduction);

    return {
      unreducedYears: parseFloat(unreducedYears.toFixed(2)),
      totalReduction: parseFloat(totalReduction.toFixed(2)),
      netYears: parseFloat(netYears.toFixed(2))
    };
  }

  /**
   * MASTER EXECUTION: FULL REDUCTION PIPELINE FOR ALL 7 PLANETS OR SINGLE VECTOR
   */
  function executeFullAshtakavargaReductions(rawBavInput, planetsInput) {
    let planetsList = Array.isArray(planetsInput) 
      ? planetsInput 
      : (planetsInput && planetsInput.planets ? planetsInput.planets : []);

    if (!Array.isArray(planetsList) && typeof planetsList === 'object') {
      planetsList = Object.entries(planetsList).map(([id, val]) => ({
        id: id,
        abs: (typeof val === 'number') ? val : (val.longitude !== undefined ? val.longitude : (val.abs || 0)),
        sign: (typeof val === 'object' && val.sign !== undefined) ? val.sign : Math.floor(((typeof val === 'number' ? val : (val.longitude || 0)) % 360) / 30),
        house: (typeof val === 'object') ? val.house : undefined,
        isCombust: (typeof val === 'object') ? Boolean(val.isCombust) : false,
        isEnemy: (typeof val === 'object') ? Boolean(val.isEnemy) : false
      }));
    }

    const occupiedSigns = new Set();
    const planetsMap = {};

    for (const p of planetsList) {
      if (p.id === 'Rahu' || p.id === 'Ketu') continue;
      const s = p.sign !== undefined ? p.sign : Math.floor((p.abs || 0) / 30);
      occupiedSigns.add(s);
      planetsMap[p.id] = p;
    }

    // Case 1: Single 12-element vector (e.g. Sarvashtakavarga or specific planet)
    if (Array.isArray(rawBavInput) && rawBavInput.length === 12) {
      const trikona = computeTrikonaShodhana(rawBavInput);
      const ekadhipatya = computeEkadhipatyaShodhana(trikona, occupiedSigns);
      const pinda = computePindaSadhana(ekadhipatya, planetsMap);
      const ayur = computeAshtakavargaAyurdaya(pinda.yogaPinda, 1, false, false);

      const rawSum = rawBavInput.reduce((a, b) => a + b, 0);
      const trikonaSum = trikona.reduce((a, b) => a + b, 0);
      const ekadhipatyaSum = ekadhipatya.reduce((a, b) => a + b, 0);

      return {
        rawBindus: rawBavInput,
        rawTotal: rawSum,
        trikonaShodhita: trikona,
        trikonaTotal: trikonaSum,
        ekadhipatyaShodhita: ekadhipatya,
        ekadhipatyaTotal: ekadhipatyaSum,
        pindaSadhana: {
          rashiPinda: pinda.rashiPinda,
          grahaPinda: pinda.grahaPinda,
          totalShodhitaPinda: pinda.yogaPinda
        },
        ayurdaya: {
          grossLongevityYears: ayur.unreducedYears,
          totalReductionYears: ayur.totalReduction,
          netLongevityYears: ayur.netYears
        }
      };
    }

    // Case 2: Multi-planet dictionary of vectors
    const rawMap = (rawBavInput && typeof rawBavInput === 'object') ? rawBavInput : {};
    const results = {};
    let totalYogaPinda = 0;
    let totalAyurdayaYears = 0;

    for (const [pId, rawVector] of Object.entries(rawMap)) {
      if (!Array.isArray(rawVector) || rawVector.length !== 12) continue;
      const trikona = computeTrikonaShodhana(rawVector);
      const ekadhipatya = computeEkadhipatyaShodhana(trikona, occupiedSigns);
      const pinda = computePindaSadhana(ekadhipatya, planetsMap);
      const pObj = planetsMap[pId] || { house: 1 };
      const ayur = computeAshtakavargaAyurdaya(pinda.yogaPinda, pObj.house || 1, pObj.isCombust, pObj.isEnemy);

      totalYogaPinda += pinda.yogaPinda;
      totalAyurdayaYears += ayur.netYears;

      results[pId] = {
        planet: pId,
        rawBav: rawVector,
        trikonaShodhita: trikona,
        ekadhipatyaShodhita: ekadhipatya,
        rashiPinda: pinda.rashiPinda,
        grahaPinda: pinda.grahaPinda,
        yogaPinda: pinda.yogaPinda,
        ayurdaya: ayur
      };
    }

    return {
      planets: results,
      totalYogaPinda,
      compositeAyurdayaYears: parseFloat((totalAyurdayaYears / 7.0).toFixed(2))
    };
  }

  return {
    computeTrikonaShodhana,
    computeEkadhipatyaShodhana,
    computePindaSadhana,
    computeAshtakavargaAyurdaya,
    executeFullAshtakavargaReductions,
    RASHI_GUNAKARA,
    GRAHA_GUNAKARA
  };
}));
