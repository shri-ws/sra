/**
 * =============================================================================
 * SHADBALA & ISHTA-KASHTA ENGINE (षड्बल एवं इष्ट-कष्ट साधन इंजन)
 * Classical Authority: Brihat Parashara Hora Shastra (Chapters 27, 28, 29 & 87)
 * =============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShadbalaEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEEP_EXALTATION = {
    Sun: 10.0,       // 10° Aries
    Moon: 33.0,      // 3° Taurus
    Mars: 298.0,     // 28° Capricorn
    Mercury: 165.0,  // 15° Virgo
    Jupiter: 95.0,   // 5° Cancer
    Venus: 357.0,    // 27° Pisces
    Saturn: 200.0    // 20° Libra
  };

  const DEEP_DEBILITATION = {
    Sun: 190.0,      // 10° Libra
    Moon: 213.0,     // 3° Scorpio
    Mars: 118.0,     // 28° Cancer
    Mercury: 345.0,  // 15° Pisces
    Jupiter: 275.0,  // 5° Capricorn
    Venus: 177.0,    // 27° Virgo
    Saturn: 20.0     // 20° Aries
  };

  const NAISARGIKA_BALA = {
    Sun: 60.0,
    Moon: 51.43,
    Venus: 42.86,
    Jupiter: 34.29,
    Mercury: 25.71,
    Mars: 17.14,
    Saturn: 8.57
  };

  const MIN_REQUIRED_RUPAS = {
    Sun: 6.5,
    Moon: 6.0,
    Mars: 5.0,
    Mercury: 7.0,
    Jupiter: 6.5,
    Venus: 5.5,
    Saturn: 5.0
  };

  const PLANET_NAMES_HI = {
    Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध",
    Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि"
  };

  function norm360(d) {
    return ((d % 360) + 360) % 360;
  }

  /**
   * 1. UCCA BALA (Exaltation Strength — max 60 Virupas)
   */
  function computeUccaBala(planetId, absDeg) {
    if (!DEEP_DEBILITATION[planetId]) return 0;
    const debDeg = DEEP_DEBILITATION[planetId];
    let diff = Math.abs(absDeg - debDeg);
    if (diff > 180.0) diff = 360.0 - diff;
    return diff / 3.0; // 180 / 3 = 60 virupas max
  }

  /**
   * 2. DIG BALA (Directional Strength — max 60 Virupas)
   */
  function computeDigBala(planetId, absDeg, lagnaDeg) {
    // Zero-strength reference points:
    // Sun & Mars zero at 4th cusp (Lagna + 90)
    // Moon & Venus zero at 10th cusp (Lagna + 270)
    // Jupiter & Mercury zero at 7th cusp (Lagna + 180)
    // Saturn zero at 1st cusp (Lagna)
    let zeroPoint = lagnaDeg;
    if (planetId === 'Sun' || planetId === 'Mars') {
      zeroPoint = norm360(lagnaDeg + 90.0);
    } else if (planetId === 'Moon' || planetId === 'Venus') {
      zeroPoint = norm360(lagnaDeg + 270.0);
    } else if (planetId === 'Jupiter' || planetId === 'Mercury') {
      zeroPoint = norm360(lagnaDeg + 180.0);
    } else if (planetId === 'Saturn') {
      zeroPoint = norm360(lagnaDeg);
    }
    let arc = Math.abs(absDeg - zeroPoint);
    if (arc > 180.0) arc = 360.0 - arc;
    return arc / 3.0; // max 60 virupas
  }

  /**
   * 3. KENDRADI BALA (Kendra = 60, Panaphara = 30, Apoklima = 15)
   */
  function computeKendradiBala(houseNum) {
    const kendras = [1, 4, 7, 10];
    const panapharas = [2, 5, 8, 11];
    if (kendras.includes(houseNum)) return 60.0;
    if (panapharas.includes(houseNum)) return 30.0;
    return 15.0; // Apoklima (3, 6, 9, 12)
  }

  /**
   * 4. PAKSHA BALA (Fortnight Illumination Strength — max 60 Virupas)
   */
  function computePakshaBala(moonAbs, sunAbs, planetId) {
    let diff = norm360(moonAbs - sunAbs);
    if (diff > 180.0) diff = 360.0 - diff;
    const beneficVal = diff / 3.0; // 0 to 60
    const maleficVal = 60.0 - beneficVal;

    // Benefics take direct Moon illumination; Malefics take inverse
    if (['Moon', 'Jupiter', 'Venus'].includes(planetId)) {
      return beneficVal;
    } else if (planetId === 'Mercury') {
      // Mercury with benefics is benefic; default to direct
      return beneficVal;
    } else {
      return maleficVal;
    }
  }

  /**
   * 5. AYANA BALA (Solstitial Strength from Declination — max 60 Virupas)
   */
  function computeAyanaBala(planetId, absDeg) {
    // Classical approximate declination amplitude 23.45°
    const rad = Math.PI / 180;
    const sinDelta = Math.sin(absDeg * rad) * Math.sin(23.45 * rad);
    const delta = Math.asin(sinDelta) / rad; // -23.45 to +23.45
    // Northern declination benefits Sun, Mars, Jup, Ven; Southern benefits Moon, Sat
    if (['Sun', 'Mars', 'Jupiter', 'Venus'].includes(planetId)) {
      return ((delta + 24.0) / 48.0) * 60.0;
    } else {
      return ((24.0 - delta) / 48.0) * 60.0;
    }
  }

  /**
   * 6. CHESTA BALA (Motional / Velocity / Retrograde Strength — max 60 Virupas)
   */
  function computeChestaBala(planetId, pObj, sunAbs) {
    if (planetId === 'Sun') {
      // Sun's Chesta Bala is its Ayana Bala (BPHS Ch. 28 Shloka 21)
      return computeAyanaBala('Sun', pObj.abs);
    }
    if (planetId === 'Moon') {
      // Moon's Chesta Bala is its Paksha Bala (BPHS Ch. 28 Shloka 22)
      return computePakshaBala(pObj.abs, sunAbs, 'Moon');
    }

    // Tara Grahas (Mars, Mercury, Jupiter, Venus, Saturn)
    // If retrograde, full 60 virupas (BPHS Vakra = 60)
    if (pObj.isRetrograde || (pObj.speed !== undefined && pObj.speed < 0)) {
      return 60.0;
    }

    // Sighrakendra elongation from Sun
    let elongation = Math.abs(norm360(pObj.abs - sunAbs));
    if (elongation > 180.0) elongation = 360.0 - elongation;

    // Direct motion graduated strength
    if (elongation < 30.0) return 15.0; // Vikala / Combust approach
    if (elongation < 90.0) return 30.0; // Manda
    if (elongation < 150.0) return 45.0; // Chara
    return 60.0; // Near stationary / retrograde threshold
  }

  /**
   * 7. DRIK BALA (Continuous Aspect Function V(theta) — BPHS Ch. 28)
   */
  function computeContinuousAspectValue(theta) {
    const t = norm360(theta);
    if (t < 30.0) return 0.0;
    if (t < 60.0) return (t - 30.0) * 0.5;
    if (t < 90.0) return 15.0 + (t - 60.0) * 1.0;
    if (t < 120.0) return 45.0 + (t - 90.0) * 0.5;
    if (t < 150.0) return 60.0 - (t - 120.0) * 2.0;
    if (t < 180.0) return (t - 150.0) * 2.0;
    if (t < 300.0) return 0.0;
    return (360.0 - t) * 1.0;
  }

  function computeDrikBala(targetId, targetAbs, allPlanets) {
    let drikScore = 0;
    for (const p of allPlanets) {
      if (p.id === targetId || p.id === 'Rahu' || p.id === 'Ketu') continue;
      const theta = norm360(targetAbs - p.abs);
      let aspectVal = computeContinuousAspectValue(theta);

      // Special Full Aspects (Mars 4th/8th, Jup 5th/9th, Sat 3rd/10th)
      if (p.id === 'Mars') {
        if ((theta >= 90 && theta <= 120) || (theta >= 210 && theta <= 240)) {
          aspectVal = Math.max(aspectVal, 60.0);
        }
      } else if (p.id === 'Jupiter') {
        if ((theta >= 120 && theta <= 150) || (theta >= 240 && theta <= 270)) {
          aspectVal = Math.max(aspectVal, 60.0);
        }
      } else if (p.id === 'Saturn') {
        if ((theta >= 60 && theta <= 90) || (theta >= 270 && theta <= 300)) {
          aspectVal = Math.max(aspectVal, 60.0);
        }
      }

      const isBenefic = ['Jupiter', 'Venus', 'Moon'].includes(p.id) || (p.id === 'Mercury');
      if (isBenefic) {
        drikScore += (aspectVal / 4.0);
      } else {
        drikScore -= (aspectVal / 4.0);
      }
    }
    return drikScore;
  }

  /**
   * MASTER COMPUTATION: ALL 6 SHADBALAS + ISHTA/KASHTA
   */
  function computeFullShadbala(calcResult) {
    let planets = calcResult.planets || [];
    if (!Array.isArray(planets) && typeof planets === 'object') {
      planets = Object.entries(planets).map(([key, val]) => ({
        id: key,
        abs: (typeof val === 'number') ? val : (val.longitude !== undefined ? val.longitude : (val.abs || 0)),
        sign: (typeof val === 'object' && val.sign !== undefined) ? val.sign : Math.floor(((typeof val === 'number' ? val : (val.longitude || 0)) % 360) / 30),
        house: (typeof val === 'object') ? val.house : undefined,
        dignity: (typeof val === 'object') ? val.dignity : undefined
      }));
    }

    const lagnaDeg = calcResult.sripatiBhavas 
      ? calcResult.sripatiBhavas[0].mid 
      : (calcResult.lagnaLongitude !== undefined 
          ? calcResult.lagnaLongitude 
          : ((calcResult.lagnaSign !== undefined ? calcResult.lagnaSign : 0) * 30.0 + 15.0));

    const sunObj = planets.find(p => p.id === 'Sun') || { abs: 0 };
    const moonObj = planets.find(p => p.id === 'Moon') || { abs: 0 };

    const results = {};

    for (const p of planets) {
      if (p.id === 'Rahu' || p.id === 'Ketu') continue;

      const pId = p.id;
      const houseNum = p.house || (Math.floor(norm360(p.abs - lagnaDeg) / 30.0) + 1);

      // 1. Sthana Bala
      const ucca = computeUccaBala(pId, p.abs);
      const kendradi = computeKendradiBala(houseNum);
      const saptavarga = (p.dignity === 'Exalted') ? 45 : (p.dignity === 'Own' ? 30 : 15);
      const ojayugma = 15.0; // Average harmonic parity
      const drekkana = 15.0;
      const sthanaBala = ucca + kendradi + saptavarga + ojayugma + drekkana;

      // 2. Dig Bala
      const digBala = computeDigBala(pId, p.abs, lagnaDeg);

      // 3. Kala Bala
      const paksha = computePakshaBala(moonObj.abs, sunObj.abs, pId);
      const ayana = computeAyanaBala(pId, p.abs);
      const natho = 30.0; // Midday/Midnight baseline
      const kalaBala = paksha + ayana + natho;

      // 4. Chesta Bala
      const chestaBala = computeChestaBala(pId, p, sunObj.abs);

      // 5. Naisargika Bala
      const naisargikaBala = NAISARGIKA_BALA[pId] || 15.0;

      // 6. Drik Bala
      const drikBala = computeDrikBala(pId, p.abs, planets);

      // Total Virupas and Rupas
      const totalVirupas = Math.max(0, sthanaBala + digBala + kalaBala + chestaBala + naisargikaBala + drikBala);
      const totalRupas = totalVirupas / 60.0;
      const minRequired = MIN_REQUIRED_RUPAS[pId] || 5.0;
      const strengthRatio = totalRupas / minRequired;

      // CHAPTER 87: ISHTA & KASHTA PHALA (GEOMETRIC MEAN)
      let ishtaParam2 = chestaBala;
      if (pId === 'Sun') ishtaParam2 = ayana;
      if (pId === 'Moon') ishtaParam2 = paksha;

      const ishtaPhala = Math.sqrt(Math.max(0, ucca * ishtaParam2));
      const kashtaPhala = Math.max(0, 60.0 - ishtaPhala);

      results[pId] = {
        name: PLANET_NAMES_HI[pId] || pId,
        id: pId,
        subBalas: {
          sthanaBala: parseFloat(sthanaBala.toFixed(2)),
          digBala: parseFloat(digBala.toFixed(2)),
          kalaBala: parseFloat(kalaBala.toFixed(2)),
          chestaBala: parseFloat(chestaBala.toFixed(2)),
          naisargikaBala: parseFloat(naisargikaBala.toFixed(2)),
          drikBala: parseFloat(drikBala.toFixed(2)),
          uccaBala: parseFloat(ucca.toFixed(2))
        },
        totalVirupas: parseFloat(totalVirupas.toFixed(2)),
        totalRupas: parseFloat(totalRupas.toFixed(2)),
        minRequiredRupas: minRequired,
        strengthRatio: parseFloat(strengthRatio.toFixed(2)),
        ratioToMinRequired: parseFloat(strengthRatio.toFixed(2)),
        isStrong: totalRupas >= minRequired,
        isSufficientlyStrong: totalRupas >= minRequired,
        // Ishta & Kashta (BPHS Ch. 87)
        ishtaPhala: parseFloat(ishtaPhala.toFixed(2)),
        istaPhala: parseFloat(ishtaPhala.toFixed(2)),
        kashtaPhala: parseFloat(kashtaPhala.toFixed(2)),
        ishtaRatio: parseFloat((ishtaPhala / 60.0).toFixed(2))
      };
    }

    return {
      title: "षड्बल एवं इष्ट-कष्ट फल (BPHS Chapters 87 & Shadbala)",
      planets: results,
      ...results
    };
  }

  return {
    computeFullShadbala,
    computeUccaBala,
    computeDigBala,
    computeKendradiBala,
    computePakshaBala,
    computeAyanaBala,
    computeChestaBala,
    computeDrikBala,
    MIN_REQUIRED_RUPAS
  };
}));
