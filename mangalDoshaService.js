/**
 * Classical Mangal Dosha & 21 Authentic Parihara Rules Engine
 * Module: mangalDoshaService.js
 * Reference Authorities:
 * - Brihat Parashara Hora Shastra (BPHS)
 * - Phaladeepika & Mansagari
 * - Agastya Samhita
 * - Jataka Parijata & Devakeralam
 * - Muhurta Chintamani & Muhurta Ganapati
 * - Vasishtha Samhita & Chandrakala Nadi
 * - Jataka Tattvam & Shambhu Hora Prakasha
 * - Muhurta Martanda & Brihajjataka Tika
 * - Narada Samhita & Maharshi Atri Smriti
 * - Muhurta Kalpadruma & Sarvartha Chintamani
 * - Jataka Deepika & Muhurta Tattva
 * 
 * Strict Zero-Bilingual-Clutter Mathematical Classical Standard.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MangalDoshaEngine = factory();
    root.calculateMangalDoshaReport = root.MangalDoshaEngine.calculateMangalDoshaReport;
    root.extractMangalDoshaContract = root.MangalDoshaEngine.extractMangalDoshaContract;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Dosha-Causing Houses: 1st (Lagna), 4th (Sukha/Patala), 7th (Jamitra/Kalatra), 8th (Ayu/Mrityu), 12th (Vyaya)
  const DOSHA_HOUSES = [1, 4, 7, 8, 12];

  const RASHIS_HI = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"
  ];
  const RASHIS_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];

  /**
   * Core Helper: Relative House Helper (1-12)
   * Calculates house distance from fromHouse to toHouse inclusive (1 to 12)
   */
  function getRelativeHouse(fromHouse, toHouse) {
    let diff = (toHouse - fromHouse + 1);
    if (diff <= 0) diff += 12;
    return diff;
  }

  /**
   * Helper: Calculate completed years of age from DOB string (YYYY-MM-DD)
   */
  function calculateAge(dobStr) {
    if (!dobStr) return 0;
    const birthDate = new Date(dobStr);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  /**
   * Helper: Calculate Balaadi Avastha based on Rashi parity and degree (0°-30°)
   * Odd Rashis (1,3,5,7,9,11): 0-6 Bala, 6-12 Kumara, 12-18 Yuva, 18-24 Vriddha, 24-30 Mrita
   * Even Rashis (2,4,6,8,10,12): 0-6 Mrita, 6-12 Vriddha, 12-18 Yuva, 18-24 Kumara, 24-30 Bala
   */
  function calculateBalaadiAvastha(rashi, deg) {
    const isOdd = (rashi % 2 !== 0);
    const d = Math.max(0, Math.min(29.9999, deg || 0));
    const slot = Math.floor(d / 6); // 0, 1, 2, 3, 4
    if (isOdd) {
      if (slot === 0) return 'bala';
      if (slot === 1) return 'kumara';
      if (slot === 2) return 'yuva';
      if (slot === 3) return 'vriddha';
      return 'mrita';
    } else {
      if (slot === 0) return 'mrita';
      if (slot === 1) return 'vriddha';
      if (slot === 2) return 'yuva';
      if (slot === 3) return 'kumara';
      return 'bala';
    }
  }

  /**
   * Normalize an input rashi to 1-12 index (1=Mesha, 12=Meena)
   */
  function normalizeRashi(r) {
    if (typeof r !== 'number') return 1;
    if (r >= 1 && r <= 12) return Math.round(r);
    if (r >= 0 && r <= 11) return Math.round(r) + 1;
    return ((Math.round(r) - 1) % 12 + 12) % 12 + 1;
  }

  /**
   * Vimshottari Dasha Constants & Mars Dasha Window Checker (Ages 21 to 36)
   */
  const DASHA_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

  function isMarsDashaActiveInWindow(moonAbsDeg, startAge = 21, endAge = 36) {
    if (typeof moonAbsDeg !== 'number' || isNaN(moonAbsDeg)) return false;
    const normMoon = ((moonAbsDeg % 360) + 360) % 360;
    const nakDeg = 360 / 27; // 13° 20' = 13.333333333333334°
    const nakIdx = Math.floor(normMoon / nakDeg);
    const remFraction = 1 - ((normMoon % nakDeg) / nakDeg);

    let lordIdx = nakIdx % 9;
    let currentAge = 0;

    let firstLord = DASHA_LORDS[lordIdx];
    let firstMdYears = DASHA_YEARS[firstLord] * remFraction;

    while (currentAge < 100) {
      let mdLord = DASHA_LORDS[lordIdx];
      let totalMdYears = DASHA_YEARS[mdLord];
      let actualMdDuration = (currentAge === 0) ? firstMdYears : totalMdYears;
      let mdStart = currentAge;
      let mdEnd = currentAge + actualMdDuration;

      let adLordStartIdx = DASHA_LORDS.indexOf(mdLord);
      let adStartAge = mdStart;

      let adElapsedBeforeBirth = (totalMdYears - actualMdDuration);
      let accumulatedAd = 0;

      for (let i = 0; i < 9; i++) {
        let adLord = DASHA_LORDS[(adLordStartIdx + i) % 9];
        let adDuration = (totalMdYears * DASHA_YEARS[adLord]) / 120;
        accumulatedAd += adDuration;

        if (accumulatedAd <= adElapsedBeforeBirth) continue;

        let effectiveAdStart = adStartAge;
        let effectiveAdEnd = mdStart + (accumulatedAd - adElapsedBeforeBirth);
        adStartAge = effectiveAdEnd;

        let isMarsActive = (mdLord === "Mars" || adLord === "Mars");
        if (isMarsActive) {
          if (effectiveAdStart < endAge && effectiveAdEnd > startAge) {
            return true;
          }
        }
      }

      currentAge = mdEnd;
      lordIdx = (lordIdx + 1) % 9;
    }
    return false;
  }

  /**
   * Extract standardized Mangal Dosha Engine Contract from SRA's currentCalculation object
   */
  function extractMangalDoshaContract(calc, jatakaOverride) {
    if (!calc || !calc.planets) return null;

    const lagnaObj = calc.planets.find(p => p.id === "Lagna");
    const sunObj = calc.planets.find(p => p.id === "Sun");
    const marsObj = calc.planets.find(p => p.id === "Mars");
    const moonObj = calc.planets.find(p => p.id === "Moon");
    const mercObj = calc.planets.find(p => p.id === "Mercury");
    const venusObj = calc.planets.find(p => p.id === "Venus");
    const jupObj = calc.planets.find(p => p.id === "Jupiter");
    const satObj = calc.planets.find(p => p.id === "Saturn");
    const rahObj = calc.planets.find(p => p.id === "Rahu");
    const ketObj = calc.planets.find(p => p.id === "Ketu");

    if (!lagnaObj || !marsObj || !moonObj || !venusObj) return null;

    const lagnaRashi = (lagnaObj.sign !== undefined) ? (lagnaObj.sign + 1) : Math.floor(lagnaObj.abs / 30) + 1;
    const lagnaDeg = parseFloat(((lagnaObj.deg !== undefined) ? lagnaObj.deg : (lagnaObj.abs % 30)).toFixed(2));

    const sunAbs = sunObj ? sunObj.abs : 0;
    const COMBUST_LIMITS = {
      Moon: 12.0, Mars: 17.0, Mercury: 14.0, Jupiter: 11.0, Venus: 10.0, Saturn: 15.0
    };

    function mapPlanet(pl) {
      if (!pl) return null;
      const rashi = (pl.sign !== undefined) ? (pl.sign + 1) : Math.floor(pl.abs / 30) + 1;
      const deg = parseFloat(((pl.deg !== undefined) ? pl.deg : (pl.abs % 30)).toFixed(2));
      let isCombust = false;
      if (sunObj && pl.id !== "Sun") {
        let diff = Math.abs(pl.abs - sunAbs);
        if (diff > 180) diff = 360 - diff;
        let limit = COMBUST_LIMITS[pl.id] || 10.0;
        if (pl.retro && pl.id === "Venus") limit = 8.0;
        isCombust = (diff <= limit);
      }
      const house = pl.rasiHouse || ((pl.sign - (lagnaRashi - 1) + 12) % 12 + 1);
      const state = calculateBalaadiAvastha(rashi, deg);
      return {
        house,
        rashi,
        degree: deg,
        is_retrograde: !!pl.retro,
        is_combust: isCombust,
        state
      };
    }

    // Navamsha (D9) extraction
    let d9LagnaRashi = 1;
    let d9MarsRashi = 1;
    let d9MarsHouse = 1;
    let d9MoonRashi = 1;
    let d9MoonHouse = 1;
    let d9VenusRashi = 1;
    let d9VenusHouse = 1;

    // Use internal getVargaSign if available, or compute canonical D9
    function computeD9Sign(sign0to11, deg) {
      if (typeof getVargaSign === 'function') {
        return getVargaSign(sign0to11, deg, 9) + 1;
      }
      const eps = 0.00001;
      let nStart = (sign0to11 % 3 === 0) ? sign0to11 : (sign0to11 % 3 === 1 ? (sign0to11 + 8) % 12 : (sign0to11 + 4) % 12);
      return ((nStart + Math.floor((deg - eps) / (3 + 20 / 60))) % 12) + 1;
    }

    const lSign0 = (lagnaObj.sign !== undefined) ? lagnaObj.sign : Math.floor(lagnaObj.abs / 30);
    d9LagnaRashi = computeD9Sign(lSign0, lagnaDeg);

    const mSign0 = (marsObj.sign !== undefined) ? marsObj.sign : Math.floor(marsObj.abs / 30);
    const mDeg = (marsObj.deg !== undefined) ? marsObj.deg : (marsObj.abs % 30);
    d9MarsRashi = computeD9Sign(mSign0, mDeg);
    d9MarsHouse = (d9MarsRashi - d9LagnaRashi + 12) % 12 + 1;

    const moSign0 = (moonObj.sign !== undefined) ? moonObj.sign : Math.floor(moonObj.abs / 30);
    const moDeg = (moonObj.deg !== undefined) ? moonObj.deg : (moonObj.abs % 30);
    d9MoonRashi = computeD9Sign(moSign0, moDeg);
    d9MoonHouse = (d9MoonRashi - d9LagnaRashi + 12) % 12 + 1;

    const vSign0 = (venusObj.sign !== undefined) ? venusObj.sign : Math.floor(venusObj.abs / 30);
    const vDeg = (venusObj.deg !== undefined) ? venusObj.deg : (venusObj.abs % 30);
    d9VenusRashi = computeD9Sign(vSign0, vDeg);
    d9VenusHouse = (d9VenusRashi - d9LagnaRashi + 12) % 12 + 1;

    // Jataka Info & Day of Birth
    const b = calc.birthDetails || {};
    const dobStr = (jatakaOverride && jatakaOverride.dob) || (b.year ? `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}` : "2000-01-01");
    const bDate = new Date(dobStr);
    let dayOfBirth = (jatakaOverride && jatakaOverride.day_of_birth) || "";
    if (!dayOfBirth && !isNaN(bDate.getTime())) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      dayOfBirth = days[bDate.getDay()];
    }

    const jataka_info = {
      name: (jatakaOverride && jatakaOverride.name) || b.candidateName || "जातक",
      gender: (jatakaOverride && jatakaOverride.gender) || b.gender || "male",
      dob: dobStr,
      tob: (jatakaOverride && jatakaOverride.tob) || (b.hour !== undefined ? `${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}` : "12:00"),
      pob: (jatakaOverride && jatakaOverride.pob) || b.placeName || "वाराणसी",
      day_of_birth: dayOfBirth
    };

    // Mars Nakshatra Calculation (1 to 27)
    const marsAbs = (marsObj.abs !== undefined) ? marsObj.abs : ((marsObj.sign || 0) * 30 + (marsObj.deg || 0));
    const marsNakNum = Math.floor((((marsAbs % 360) + 360) % 360) / (360 / 27)) + 1;

    // 7th Lord Calculation
    const seventhRashi = ((lagnaRashi - 1 + 6) % 12) + 1;
    const SIGN_LORDS = { 1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury", 7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter" };
    const OWN_SIGNS = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };
    const EXALTED_SIGNS = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
    const rulerName = SIGN_LORDS[seventhRashi];
    const rulerObjRaw = calc.planets.find(p => p.id === rulerName);
    const rulerPlanet = mapPlanet(rulerObjRaw);
    let seventhLordInfo = null;
    if (rulerPlanet) {
      seventhLordInfo = {
        planet: rulerName,
        house: rulerPlanet.house,
        rashi: rulerPlanet.rashi,
        is_own_sign: OWN_SIGNS[rulerName] ? OWN_SIGNS[rulerName].includes(rulerPlanet.rashi) : false,
        is_exalted: (EXALTED_SIGNS[rulerName] === rulerPlanet.rashi)
      };
    }

    // Dasha Info (Vimshottari Mars Dasha active in marital window ages 21 to 36)
    const moonAbs = (moonObj.abs !== undefined) ? moonObj.abs : ((moonObj.sign || 0) * 30 + (moonObj.deg || 0));
    const dasha_info = {
      mars_dasha_active_in_window: isMarsDashaActiveInWindow(moonAbs, 21, 36)
    };

    return {
      jataka_info,
      d1: {
        lagna: { rashi: lagnaRashi, degree: lagnaDeg },
        Sun: mapPlanet(sunObj),
        Moon: mapPlanet(moonObj),
        Mars: { ...mapPlanet(marsObj), nakshatra_number: marsNakNum },
        Mercury: mapPlanet(mercObj),
        Jupiter: mapPlanet(jupObj),
        Venus: mapPlanet(venusObj),
        Saturn: mapPlanet(satObj),
        Rahu: mapPlanet(rahObj),
        Ketu: mapPlanet(ketObj),
        "7th_lord": seventhLordInfo
      },
      d9: {
        lagna: { rashi: d9LagnaRashi },
        Mars: { house: d9MarsHouse, rashi: d9MarsRashi },
        Moon: { house: d9MoonHouse, rashi: d9MoonRashi },
        Venus: { house: d9VenusHouse, rashi: d9VenusRashi }
      },
      dasha_info,
      partner_d1: (jatakaOverride && jatakaOverride.partner_d1) || null
    };
  }

  /**
   * Main Calculation Engine: calculateMangalDoshaReport(inputData, lang)
   * 
   * Strict implementation of the PRD / Technical Specification:
   * - Step 1: Tri-Lagna Dosha Identification (Gross Score)
   * - Step 2: 21 Authentic Parihara Rules Evaluation
   * - Step 3: Final Computation, Clamping & Categorization
   * - Step 4: Print & UI Report Payload Construction
   */
  function calculateMangalDoshaReport(inputData, lang) {
    const isEn = (lang === 'en');
    const signsList = isEn ? RASHIS_EN : RASHIS_HI;

    if (!inputData || !inputData.d1 || !inputData.d1.Mars) {
      throw new Error("Invalid Input Data: d1 with Mars is mandatory for Mangal Dosha Engine.");
    }

    const { jataka_info = {}, d1, d9 = {}, dasha_info = null, partner_d1 = null } = inputData;

    // Normalize D1 Mars, Moon, Venus, Jupiter, Saturn, Rahu, Ketu
    const mars = {
      house: d1.Mars.house,
      rashi: normalizeRashi(d1.Mars.rashi),
      degree: typeof d1.Mars.degree === 'number' ? d1.Mars.degree : 15.0,
      is_retrograde: !!d1.Mars.is_retrograde,
      is_combust: !!d1.Mars.is_combust,
      state: d1.Mars.state || calculateBalaadiAvastha(normalizeRashi(d1.Mars.rashi), d1.Mars.degree || 15.0)
    };

    const moon = d1.Moon ? {
      house: d1.Moon.house,
      rashi: normalizeRashi(d1.Moon.rashi)
    } : { house: 1, rashi: 1 };

    const venus = d1.Venus ? {
      house: d1.Venus.house,
      rashi: normalizeRashi(d1.Venus.rashi)
    } : { house: 1, rashi: 1 };

    const jupiter = d1.Jupiter ? {
      house: d1.Jupiter.house,
      rashi: normalizeRashi(d1.Jupiter.rashi)
    } : { house: 1, rashi: 1 };

    // D9 Normalized
    const d9Mars = (d9 && d9.Mars) ? {
      house: d9.Mars.house || 1,
      rashi: normalizeRashi(d9.Mars.rashi)
    } : null;

    // ─────────────────────────────────────────────────────────────
    // INPUT DEPENDENCIES FOR 21 PARIHARA RULES
    // ─────────────────────────────────────────────────────────────
    const lagnaRashi = (d1.lagna && d1.lagna.rashi) ? normalizeRashi(d1.lagna.rashi) : 1;

    let dayOfBirth = (jataka_info && jataka_info.day_of_birth) || "";
    if (!dayOfBirth && jataka_info && jataka_info.dob) {
      const bDate = new Date(jataka_info.dob);
      if (!isNaN(bDate.getTime())) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        dayOfBirth = days[bDate.getDay()];
      }
    }

    let marsNakNumber = (d1.Mars && d1.Mars.nakshatra_number);
    if (!marsNakNumber) {
      const mDegAbs = ((mars.rashi - 1) * 30) + (mars.degree || 0);
      marsNakNumber = Math.floor((((mDegAbs % 360) + 360) % 360) / (360 / 27)) + 1;
    }

    let lord7 = d1["7th_lord"];
    if (!lord7 && d1.lagna && d1.lagna.rashi) {
      const seventhRashi = ((lagnaRashi - 1 + 6) % 12) + 1;
      const SIGN_LORDS = { 1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury", 7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter" };
      const OWN_SIGNS = { Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6], Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11] };
      const EXALTED_SIGNS = { Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7 };
      const rulerName = SIGN_LORDS[seventhRashi];
      const rulerPlanet = d1[rulerName];
      if (rulerPlanet) {
        const rHouse = rulerPlanet.house;
        const rRashi = normalizeRashi(rulerPlanet.rashi);
        lord7 = {
          planet: rulerName,
          house: rHouse,
          rashi: rRashi,
          is_own_sign: OWN_SIGNS[rulerName] ? OWN_SIGNS[rulerName].includes(rRashi) : false,
          is_exalted: (EXALTED_SIGNS[rulerName] === rRashi)
        };
      }
    }

    let dashaInfo = dasha_info || inputData.dasha_info;
    if (!dashaInfo && d1.Moon) {
      let moonAbs = null;
      if (typeof d1.Moon.abs === 'number') moonAbs = d1.Moon.abs;
      else if (typeof d1.Moon.degree === 'number') moonAbs = ((normalizeRashi(d1.Moon.rashi) - 1) * 30) + d1.Moon.degree;
      else if (d1.Moon.rashi) moonAbs = (normalizeRashi(d1.Moon.rashi) - 1) * 30 + 15;
      if (moonAbs !== null) {
        dashaInfo = {
          mars_dasha_active_in_window: isMarsDashaActiveInWindow(moonAbs, 21, 36)
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 1: TRI-LAGNA DOSHA IDENTIFICATION & GROSS SCORE
    // ─────────────────────────────────────────────────────────────
    const triLagnaBreakup = [];
    const appliedShlokas = [];

    // Rule 1.1: Lagna se Mangal Dosha (Weight: 50%)
    const isDoshaFromLagna = DOSHA_HOUSES.includes(mars.house);
    const scoreFromLagna = isDoshaFromLagna ? 50 : 0;
    triLagnaBreakup.push({
      reference: isEn ? "Ascendant (Lagna)" : "लग्न (Lagna)",
      mars_house: mars.house,
      mars_rashi: signsList[mars.rashi - 1],
      is_dosha: isDoshaFromLagna,
      weight: "50%",
      points: scoreFromLagna,
      desc: isEn 
        ? `Mars is posited in House ${mars.house} from Lagna (${isDoshaFromLagna ? 'Malefic Dosha Factor' : 'No Dosha'}).`
        : `लग्न से मंगल भाव ${mars.house} में स्थित है (${isDoshaFromLagna ? 'दोष कारक भाव' : 'दोष रहित भाव'})।`
    });

    if (isDoshaFromLagna) {
      appliedShlokas.push({
        rule: isEn ? "Classical Lagna Mangal Dosha Mandate" : "मूल विधान श्लोक (लग्न से भौम दोष)",
        shloka: "लग्ने व्यये च पाताले जामित्रे चाष्टमे कुजे।\nस्त्रीणां भर्तृविनाशः स्यात्पुंसां भार्याविनश्यति॥",
        ref: "बृहत्पाराशरहोराशास्त्रम् एवं फलदीपिका",
        meaning: isEn
          ? "Mars in 1st, 12th, 4th, 7th, or 8th house from Lagna causes discord, conflict or severe distress in marital life."
          : "लग्न (1), व्यय (12), पाताल (4), जामित्र (7) अथवा अष्टम (8) भाव में मंगल होने से जातक के दांपत्य जीवन में कलह, असंतोष अथवा अनिष्टकारी प्रभाव पड़ता है।"
      });
    }

    // Rule 1.2: Chandra Lagna se Mangal Dosha (Weight: 30%)
    const houseFromMoon = getRelativeHouse(moon.house, mars.house);
    const isDoshaFromMoon = DOSHA_HOUSES.includes(houseFromMoon);
    const scoreFromMoon = isDoshaFromMoon ? 30 : 0;
    triLagnaBreakup.push({
      reference: isEn ? "Moon (Chandra Lagna)" : "चंद्रमा (Moon)",
      mars_house: houseFromMoon,
      mars_rashi: signsList[mars.rashi - 1],
      is_dosha: isDoshaFromMoon,
      weight: "30%",
      points: scoreFromMoon,
      desc: isEn
        ? `Mars is in House ${houseFromMoon} relative to Natal Moon (${isDoshaFromMoon ? 'Mental Agitation Dosha' : 'Harmonious'}).`
        : `चंद्रमा से सापेक्ष गणना में मंगल भाव ${houseFromMoon} में स्थित है (${isDoshaFromMoon ? 'दोष कारक भाव' : 'दोष रहित भाव'})।`
    });

    if (isDoshaFromMoon) {
      appliedShlokas.push({
        rule: isEn ? "Moon-Relative Mangal Dosha" : "चंद्र लग्न से भौम दोष",
        shloka: "इन्दोः कलत्रे च सुखे मरणे च व्ययेऽथवा।\nलग्ने भौमः स्थितो यस्य तस्य दोषः प्रजायते॥",
        ref: "जातक पारिजात",
        meaning: isEn
          ? "Mars in 1, 4, 7, 8, or 12th house from Moon causes emotional friction, temperamental incompatibility and mental stress."
          : "चंद्रमा (मन के कारक) से 1, 4, 7, 8 या 12वें भाव में मंगल होने से जातक एवं जीवनसाथी के बीच मानसिक व वैचारिक तनाव उत्पन्न होता है।"
      });
    }

    // Rule 1.3: Shukra se Mangal Dosha (Weight: 20%)
    const houseFromVenus = getRelativeHouse(venus.house, mars.house);
    const isDoshaFromVenus = DOSHA_HOUSES.includes(houseFromVenus);
    const scoreFromVenus = isDoshaFromVenus ? 20 : 0;
    triLagnaBreakup.push({
      reference: isEn ? "Venus (Shukra)" : "शुक्र (Venus)",
      mars_house: houseFromVenus,
      mars_rashi: signsList[mars.rashi - 1],
      is_dosha: isDoshaFromVenus,
      weight: "20%",
      points: scoreFromVenus,
      desc: isEn
        ? `Mars is in House ${houseFromVenus} relative to Venus (${isDoshaFromVenus ? 'Physical/Affection Impediment' : 'Harmonious'}).`
        : `शुक्र से सापेक्ष गणना में मंगल भाव ${houseFromVenus} में स्थित है (${isDoshaFromVenus ? 'दोष कारक भाव' : 'दोष रहित भाव'})।`
    });

    if (isDoshaFromVenus) {
      appliedShlokas.push({
        rule: isEn ? "Venus-Relative Mangal Dosha" : "शुक्र से भौम दोष",
        shloka: "लग्नेन्दुपूज्यात् कलत्रेऽष्टमे वा व्यये चापि भौमः स्थितो दोषकृत् स्यात्।",
        ref: "मुहूर्तचिन्तामणि",
        meaning: isEn
          ? "Mars in dosha houses from Venus (significator of conjugal passion and bodily bliss) disturbs conjugal harmony and sensual attraction."
          : "शुक्र (काम एवं दांपत्य सुख के कारक) से मंगल का दोष कारक भावों में होना वैवाहिक सामंजस्य, आकर्षण और शारीरिक सुख में बाधक बनता है।"
      });
    }

    const grossScore = Math.min(100, scoreFromLagna + scoreFromMoon + scoreFromVenus);

    // D9 Validation Object
    const isVargottama = !!(d9Mars && mars.rashi === d9Mars.rashi);
    const d9Validation = {
      mars_rashi: d9Mars ? signsList[d9Mars.rashi - 1] : "—",
      mars_house: d9Mars ? d9Mars.house : "—",
      is_vargottama: isVargottama,
      note: isVargottama
        ? (isEn ? "Mars is Vargottama in D9 Navamsha, significantly neutralizing dosha malice." : "मंगल नवांश में वर्गोत्तम है, जो दोष के अनिष्टकारी प्रभाव को न्यूनतम करता है।")
        : (isEn ? "Mars occupies different signs in D1 and D9." : "मंगल D1 एवं D9 में पृथक राशियों में स्थित है।")
    };

    // Special Condition Check: If grossScore === 0, no parihara required!
    if (grossScore === 0) {
      return {
        report_title: isEn ? "Classical Mangal Dosha & Authentic Parihara Certification" : "प्रामाणिक मांगलिक दोष एवं परिहार विवरण पत्रिका",
        jataka_name: jataka_info.name || (isEn ? "Native" : "जातक"),
        jataka_gender: jataka_info.gender || "male",
        jataka_dob: jataka_info.dob || "—",
        jataka_tob: jataka_info.tob || "—",
        jataka_pob: jataka_info.pob || "—",
        gross_dosha_percentage: 0,
        parihara_deduction_percentage: 0,
        net_dosha_percentage: 0,
        dosha_category: isEn ? "Completely Free from Mangal Dosha" : "पूर्णतः मांगलिक दोष मुक्त",
        badge_color: "Green",
        badge_hex: "#16a34a",
        is_manglik: false,
        tri_lagna_breakup: triLagnaBreakup,
        d9_validation: d9Validation,
        applied_shlokas: appliedShlokas,
        applied_pariharas: [],
        all_pariharas: [],
        spouse_recommendation: {
          must_marry_manglik: false,
          advice_text: isEn
            ? "The birth chart is 100% free from Mangal Dosha. The native is fully eligible to marry a non-manglik or parihara-mitigated partner without astrological hindrance."
            : "कुंडली में मांगलिक दोष शून्य है। जातक का विवाह किसी भी सामान्य अथवा परिहार-प्राप्त मांगलिक जातक के साथ पूरी तरह सुरक्षित और प्रशस्त है।",
          remedies: isEn
            ? "No specific Mars propitiation or Shanti ritual required."
            : "किसी विशिष्ट मंगल शांति अनुष्ठान की आवश्यकता नहीं है। सामान्य कुलदेवता पूजन व दांपत्य मंगल कामना पर्याप्त है।"
        }
      };
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: 14 AUTHENTIC PARIHARA RULE ENGINE
    // ─────────────────────────────────────────────────────────────
    const allPariharas = [];
    const appliedPariharas = [];

    // Helper to evaluate and register each Parihara
    function evaluateParihara(ruleDef) {
      const isApplicable = !!ruleDef.condition();
      const item = {
        rule_id: ruleDef.id,
        title: isEn ? ruleDef.title_en : ruleDef.title_hi,
        deduction: ruleDef.deduction,
        is_applicable: isApplicable,
        shloka: ruleDef.shloka,
        ref: ruleDef.ref,
        explanation: isEn ? ruleDef.explanation_en : ruleDef.explanation_hi,
        logic_summary: ruleDef.logic_summary
      };
      allPariharas.push(item);
      if (isApplicable) {
        appliedPariharas.push(item);
        appliedShlokas.push({
          rule: item.title,
          shloka: item.shloka,
          ref: item.ref,
          meaning: item.explanation
        });
      }
    }

    // PARIHARA 1: Agastya Samhita Specific Bhava-Rashi Rule (-50%)
    evaluateParihara({
      id: 1,
      title_hi: "अगस्त्य संहिता विशिष्ट भाव-राशि नियम",
      title_en: "Agastya Samhita Specific House-Sign Rule",
      deduction: 50,
      logic_summary: "Lagna(1) in Aries(1), 12th in Sag(9), 4th in Scorpio(8), 7th in Taurus(2)/Libra(7), 8th in Cancer(4)",
      condition: () => (
        (mars.house === 1 && mars.rashi === 1) ||
        (mars.house === 12 && mars.rashi === 9) ||
        (mars.house === 4 && mars.rashi === 8) ||
        (mars.house === 7 && (mars.rashi === 2 || mars.rashi === 7)) ||
        (mars.house === 8 && mars.rashi === 4)
      ),
      shloka: "अजे लग्ने व्यये चापे पाताले वृश्चिके स्थिते।\nवृषे जूके च जामित्रे कर्कटे चाष्टमे कुजे॥\nभौमदोषो न विद्यते॥",
      ref: "अगस्त्य संहिता",
      explanation_hi: "लग्न में मेष, व्यय में धनु, पाताल में वृश्चिक, सप्तम में वृष/तुला तथा अष्टम में कर्क का मंगल होने पर भौम दोष स्वतः निष्प्रभावी हो जाता है।",
      explanation_en: "Mars situated in Aries in 1st, Sagittarius in 12th, Scorpio in 4th, Taurus/Libra in 7th, or Cancer in 8th house completely neutralizes Bhauma Dosha."
    });

    // PARIHARA 2: Svarashi or Uccha Rashi Mangal (-35%)
    evaluateParihara({
      id: 2,
      title_hi: "स्वराशि अथवा उच्च राशि में मंगल",
      title_en: "Mars in Own Sign or Exaltation Sign",
      deduction: 35,
      logic_summary: "Mars in Aries(1), Scorpio(8), or Capricorn(10)",
      condition: () => (mars.rashi === 1 || mars.rashi === 8 || mars.rashi === 10),
      shloka: "स्वक्षेत्रे वा स्वतुङ्गे वा वर्गोत्तमेऽपि वा।\nभौमदोषो न विद्यते॥",
      ref: "फलदीपिका / मानसागरी",
      explanation_hi: "मंगल अपनी स्वराशि (मेष, वृश्चिक) अथवा अपनी उच्च राशि (मकर) में स्थित होने पर क्रूर प्रभाव त्यागकर योगकारक व शुभ फल देने वाला बन जाता है।",
      explanation_en: "Mars in its own signs (Aries, Scorpio) or exaltation sign (Capricorn) abandons malefic propensities and becomes a protective Yogakaraka."
    });

    // PARIHARA 3: Navamsha me Vargottama Mangal (-30%)
    evaluateParihara({
      id: 3,
      title_hi: "नवांश में वर्गोत्तम मंगल",
      title_en: "Vargottama Mars in Navamsha (D9)",
      deduction: 30,
      logic_summary: "d1.Mars.rashi === d9.Mars.rashi",
      condition: () => !!(d9Mars && mars.rashi === d9Mars.rashi),
      shloka: "वर्गोत्तमे गते भौमे न दोषः परिकीर्तितः।\nदोषभङ्गो भवेत्तत्र दांपत्यं सुखवर्धनम्॥",
      ref: "जातक पारिजात",
      explanation_hi: "जब मंगल लग्न कुंडली (D1) और नवांश कुंडली (D9) दोनों में समान राशि में स्थित होकर वर्गोत्तम हो जाता है, तो उसका दांपत्य-नाशक दोष समाप्त हो जाता है।",
      explanation_en: "When Mars attains Vargottama status (identical sign in D1 and D9), its disruptive marital potency is dissolved, enhancing marital felicity."
    });

    // PARIHARA 4: Devaguru Brihaspati Aspect or Conjunction (-40%)
    evaluateParihara({
      id: 4,
      title_hi: "देवगुरु बृहस्पति की पूर्ण दृष्टि अथवा युति",
      title_en: "Jupiter's Full Aspect (5th, 7th, 9th) or Conjunction",
      deduction: 40,
      logic_summary: "Jupiter relative house to Mars is 1 (yuti), 5, 7, or 9",
      condition: () => {
        let jupToMars = getRelativeHouse(jupiter.house, mars.house);
        return (jupToMars === 1 || jupToMars === 5 || jupToMars === 7 || jupToMars === 9);
      },
      shloka: "गुरुणा संदृष्टे युक्ते वा भौमदोषो न विद्यते।",
      ref: "देवकेरलम् / मुहूर्तचिन्तामणि",
      explanation_hi: "देवगुरु बृहस्पति की अमृतमयी दृष्टि (5वीं, 7वीं, 9वीं) या युति मंगल की उग्रता और तामसिक ऊर्जा को शांत कर दांपत्य को सुरक्षा प्रदान करती है।",
      explanation_en: "Jupiter's benign nectarine aspect (5th, 7th, 9th) or conjunction pacifies the aggressive fire of Mars and protects the marital bond."
    });

    // PARIHARA 5: Chandra-Mangal Yuti (Shashi-Mangal Yoga) (-30%)
    evaluateParihara({
      id: 5,
      title_hi: "चंद्र-मंगल युति (शशि-मंगल योग)",
      title_en: "Moon-Mars Conjunction (Shashi-Mangal Yoga)",
      deduction: 30,
      logic_summary: "d1.Mars.house === d1.Moon.house",
      condition: () => (mars.house === moon.house),
      shloka: "शशिना संस्थितो भौमः शशिमङ्गलयोगकृत्।\nन तत्र जायते दोषो लक्ष्म्याश्चैव समागमः॥",
      ref: "वसिष्ठ संहिता",
      explanation_hi: "मंगल और चंद्रमा एक ही भाव में युति करके महालक्ष्मी योग का निर्माण करते हैं, जिससे दांपत्य में अनिष्टकारी दोष भंग होकर सुख-समृद्धि की प्राप्ति होती है।",
      explanation_en: "Conjunction of Moon and Mars creates the illustrious Mahalakshmi (Shashi-Mangal) Yoga, nullifying dosha into prosperity and affection."
    });

    // PARIHARA 6: Kendra अथवा Trikona me Bali Guru ya Shukra (-25%)
    evaluateParihara({
      id: 6,
      title_hi: "केंद्र अथवा त्रिकोण में बली गुरु या शुक्र",
      title_en: "Jupiter or Venus in Kendra / Trikona",
      deduction: 25,
      logic_summary: "Jupiter or Venus posited in houses 1, 4, 7, 10, 5, or 9",
      condition: () => {
        const KENDRA_TRIKONA = [1, 4, 7, 10, 5, 9];
        return (KENDRA_TRIKONA.includes(jupiter.house) || KENDRA_TRIKONA.includes(venus.house));
      },
      shloka: "सिंहे मकरे वा जीवे केन्द्रकोणगतेऽपि वा।\nकुजदोषवतो नास्ति दोषश्चन्द्रभृगोर्यदि॥",
      ref: "मुहूर्तचिन्तामणि",
      explanation_hi: "यदि कुंडली के केंद्र (1, 4, 7, 10) या त्रिकोण (5, 9) भावों में देवगुरु बृहस्पति अथवा दैत्यगुरु शुक्र विराजमान हों, तो वे समस्त दोषों का शमन करने में सक्षम होते हैं।",
      explanation_en: "When natural benefics Jupiter or Venus occupy angular (Kendra) or trinal (Trikona) houses, their powerful auspices dispel planetary afflictions."
    });

    // PARIHARA 7: Simha अथवा Kumbha Rashi ka Mangal (-25%)
    evaluateParihara({
      id: 7,
      title_hi: "सिंह अथवा कुंभ राशि का मंगल",
      title_en: "Mars in Leo or Aquarius",
      deduction: 25,
      logic_summary: "d1.Mars.rashi === 5 (Leo) or 11 (Aquarius)",
      condition: () => (mars.rashi === 5 || mars.rashi === 11),
      shloka: "कुजो न दोषकृत् प्रोक्तः सिंहे कुम्भे च संस्थिते।",
      ref: "मुहूर्तगणपति",
      explanation_hi: "सिंह राशि (मित्र सूर्य की राशि) तथा कुंभ राशि (शनि की मूलत्रिकोण राशि) में स्थित मंगल को कई ग्रंथकारों ने दोष-रहित माना है।",
      explanation_en: "Classical authorities exempt Mars from causing marital dosha when situated in Leo (Sun's realm) or Aquarius (Saturn's Moolatrikona)."
    });

    // PARIHARA 8: Dwitiya Bhava me Budha ki Rashi (-25%)
    evaluateParihara({
      id: 8,
      title_hi: "द्वितीय भाव में बुध की राशि (मिथुन/कन्या)",
      title_en: "Mars in 2nd House in Mercury's Signs (Gemini/Virgo)",
      deduction: 25,
      logic_summary: "d1.Mars.house === 2 && rashi in [3, 6]",
      condition: () => (mars.house === 2 && (mars.rashi === 3 || mars.rashi === 6)),
      shloka: "द्वितीये बुधराशौ चेत्कुजदोषो न विद्यते।",
      ref: "बृहज्जातक टीका",
      explanation_hi: "द्वितीय भाव में मिथुन अथवा कन्या राशि का मंगल होने पर वाणी या कुटुम्ब सुख का हनन नहीं होता।",
      explanation_en: "In the 2nd house (considered in South Indian tradition), Mars placed in Gemini or Virgo causes no affliction to familial harmony or speech."
    });

    // PARIHARA 9: Mangal ka Ast (Combustion) hona (-30%)
    evaluateParihara({
      id: 9,
      title_hi: "मंगल का अस्त (Combustion) होना",
      title_en: "Mars is Combust (Asta)",
      deduction: 30,
      logic_summary: "d1.Mars.is_combust === true",
      condition: () => (mars.is_combust === true),
      shloka: "अस्तंगते तथा दीने बाले वृद्धे मृते कुजे।\nदोषस्य न्यूनता ज्ञेया शुभकर्मसु सर्वदा॥",
      ref: "ज्योतिर्विद्याभरणम्",
      explanation_hi: "सूर्य के अत्यधिक सानिध्य से जब मंगल अस्त हो जाता है, तो उसके नैसर्गिक अनिष्टकारी फल देने की रश्मियां और मारक सामर्थ्य क्षीण हो जाते हैं।",
      explanation_en: "Combustion by Sun deprives Mars of its autonomous malefic rays, significantly diminishing its capacity to cause matrimonial destruction."
    });

    // PARIHARA 10: Mangal ka Bala/Mritavastha me hona (-25%)
    evaluateParihara({
      id: 10,
      title_hi: "मंगल का बाल/मृतावस्था में होना",
      title_en: "Mars in Infant (Bala) or Dead (Mrita) State",
      deduction: 25,
      logic_summary: "degree <= 3.0 or degree >= 28.0 or state in ['bala', 'mrita']",
      condition: () => (
        mars.degree <= 3.0 ||
        mars.degree >= 28.0 ||
        mars.state === 'bala' ||
        mars.state === 'mrita'
      ),
      shloka: "बाल्ये वा मरणे भौमे फलं शून्यं प्रजायते।",
      ref: "फलदीपिका",
      explanation_hi: "मृत (28°-30°) या बाल (0°-3°) अवस्था में ग्रह का चेष्टा-बल न्यूनतम होने से वह जातक पर प्रबल मांगलिक प्रभाव नहीं डाल पाता।",
      explanation_en: "Mars in infancy (0°-3°) or demise state (28°-30°) has negligible operational potency, reducing its manglik impact to near zero."
    });

    // PARIHARA 11: Navamsha (D9) me Upachaya bhavon me Mangal (-20%)
    evaluateParihara({
      id: 11,
      title_hi: "नवांश (D9) में उपचय भावों में मंगल",
      title_en: "Mars in Upachaya Houses (3, 6, 10, 11) in D9",
      deduction: 20,
      logic_summary: "d9.Mars.house in [3, 6, 10, 11]",
      condition: () => {
        const UPACAHYA_HOUSES = [3, 6, 10, 11];
        return !!(d9Mars && UPACAHYA_HOUSES.includes(d9Mars.house));
      },
      shloka: "उपचये नवांशे तु कुजे दोषो न विद्यते।",
      ref: "चन्द्रकला नाड़ी",
      explanation_hi: "नवांश कुंडली में मंगल का 3, 6, 10 या 11वें (उपचय) भाव में जाना यह दर्शाता है कि विवाह के उपरांत समय बीतने के साथ मंगल अपनी उग्रता छोड़कर पराक्रम व प्रगति देगा।",
      explanation_en: "Placement of Mars in Upachaya houses (3, 6, 10, 11) in the Navamsha chart channels its energy into gradual marital maturation and worldly growth."
    });

    // PARIHARA 12: Navamsha me Guru ki Rashi (Dhanu/Meen) me Mangal (-25%)
    evaluateParihara({
      id: 12,
      title_hi: "नवांश में गुरु की राशि (धनु/मीन) में मंगल",
      title_en: "Mars in Jupiter's Signs (Sagittarius/Pisces) in D9",
      deduction: 25,
      logic_summary: "d9.Mars.rashi in [9, 12]",
      condition: () => !!(d9Mars && (d9Mars.rashi === 9 || d9Mars.rashi === 12)),
      shloka: "नवांशके जीवगृहे कुजदोषो विनश्यति।",
      ref: "जातक तत्वम्",
      explanation_hi: "नवांश में मंगल के देवगुरु बृहस्पति की राशि (धनु या मीन) में स्थित होने पर आंतरिक दांपत्य संबंध सात्विक व सुरक्षित रहते हैं।",
      explanation_en: "When Mars resides in Jupiter's signs (Sagittarius or Pisces) in the D9 chart, deep marital bonds remain spiritualized and protected."
    });

    // PARIHARA 13: Jataka ki Aayu 28 Varsha Purna Hona (-30%)
    const currentAge = calculateAge(jataka_info.dob);
    evaluateParihara({
      id: 13,
      title_hi: "जातक की आयु 28 वर्ष पूर्ण होना",
      title_en: "Native Has Completed 28 Years of Age",
      deduction: 30,
      logic_summary: `Current age ${currentAge} >= 28`,
      condition: () => (currentAge >= 28),
      shloka: "अष्टाविंशत्परं वर्षं भौमदोषो न विद्यते।",
      ref: "मानसागरी - विवाह प्रकरण",
      explanation_hi: "मंगल का प्राकृतिक परिपक्वता काल (Maturity Age) 28 वर्ष माना गया है। 28 वर्ष की आयु के पश्चात मंगल के उग्र स्वभाव का दांपत्य पर घातक प्रभाव स्वतः समाप्त हो जाता है।",
      explanation_en: "The classical planetary maturity age of Mars is 28 years. After completing 28 years, Mars matures, extinguishing its erratic destructive fire."
    });

    // PARIHARA 14: Jeevansathi ke saath Samdosha / Paap Saamya (-100%)
    let partnerCounterDetails = [];
    let hasPartnerCounterDosha = false;

    if (partner_d1) {
      const malefics = ['Mars', 'Saturn', 'Rahu', 'Ketu'];
      malefics.forEach(mKey => {
        const pl = partner_d1[mKey] || partner_d1[mKey.toLowerCase()];
        if (pl && DOSHA_HOUSES.includes(pl.house)) {
          hasPartnerCounterDosha = true;
          partnerCounterDetails.push(`${mKey} (H${pl.house})`);
        }
      });
    }

    evaluateParihara({
      id: 14,
      title_hi: "जीवनसाथी के साथ समदोष / पाप साम्य",
      title_en: "Partner Equal Malefic Counter-Dosha (Paap Samya)",
      deduction: 100,
      logic_summary: "Partner has Mars/Saturn/Rahu/Ketu in houses 1, 4, 7, 8, or 12",
      condition: () => hasPartnerCounterDosha,
      shloka: "शनिर्भौमोऽथवा कश्चित्पापो वा तादृशो भवेत्।\nतेष्वेव स्थानेषु यदा तदा दोषो न विद्यते॥",
      ref: "शम्भुहोराप्रकाश एवं बृहत्पाराशर",
      explanation_hi: "यदि दूसरे जातक (वर/कन्या) की कुंडली में भी 1, 4, 7, 8, या 12वें भाव में मंगल, शनि, राहु अथवा केतु स्थित हो, तो दोनों कुंडलियों का पाप प्रभाव आपस में कटकर शून्य हो जाता है (विष से विष का नाश)।",
      explanation_en: "When the partner's chart possesses Mars, Saturn, Rahu, or Ketu in the matching dosha houses (1, 4, 7, 8, 12), the malefic charges cancel each other out completely (poison cures poison)."
    });

    // ─────────────────────────────────────────────────────────────
    // ADDITIONAL CLASSICAL RULES: 15 THROUGH 21
    // ─────────────────────────────────────────────────────────────

    // PARIHARA 15: South Indian Tradition - Dwitiya Bhava me Budha ki Rashi (-30%)
    evaluateParihara({
      id: 15,
      title_hi: "द्वितीय भाव में बुध राशि परिहार (दक्षिण भारतीय मत)",
      title_en: "Mars in 2nd House in Mercury Sign (South Indian Tradition)",
      deduction: 30,
      logic_summary: "d1.Mars.house === 2 && [3, 6].includes(d1.Mars.rashi)",
      condition: () => (mars.house === 2 && (mars.rashi === 3 || mars.rashi === 6)),
      shloka: "द्वितीये बुधराशौ चेत्कुजदोषो न विद्यते।",
      ref: "मुहूर्त मार्तण्ड / बृहज्जातक टीका",
      explanation_hi: "द्वितीय भाव में मिथुन अथवा कन्या (बुध की राशि) का मंगल होने से कुटुम्ब व वाणी पर मंगल का अनिष्ट प्रभाव समाप्त हो जाता है।",
      explanation_en: "In South Indian tradition, 2nd house Mars placed in Gemini or Virgo causes no affliction to familial harmony or speech."
    });

    // PARIHARA 16: Nakshatra-based Placement (Ketu & Mitra Nakshatras) (-30%)
    evaluateParihara({
      id: 16,
      title_hi: "विशिष्ट नक्षत्र अवस्थिति परिहार",
      title_en: "Specific Nakshatra Placement Exemption",
      deduction: 30,
      logic_summary: "Mars in Ashwini(1), Mrigashira(5), Magha(10), Anuradha(17), or Mula(19)",
      condition: () => {
        const EXEMPT_NAKSHATRAS = [1, 5, 10, 17, 19];
        return EXEMPT_NAKSHATRAS.includes(marsNakNumber);
      },
      shloka: "अश्विनी मघामूलेषु भौमदोषो न विद्यते।\nअनुराधा मृगे चैव जामित्रेऽपि शुभप्रदः॥",
      ref: "नारद संहिता / महर्षि अत्रि स्मृति",
      explanation_hi: "मंगल अश्विनी, मघा, मूल, अनुराधा अथवा मृगशिरा नक्षत्र में स्थित होकर अपनी मारक क्षमता खो देता है और दांपत्य को आघात नहीं पहुंचाता।",
      explanation_en: "Mars placed in Ashwini, Mrigashira, Magha, Anuradha, or Mula nakshatra pacifies its aggressive malice and turns protective."
    });

    // PARIHARA 17: Shukra-Mangal or Guru-Mangal Conjunction (-35%)
    let isWithVenus = (mars.house === venus.house);
    let isWithJupiter = (mars.house === jupiter.house);
    evaluateParihara({
      id: 17,
      title_hi: isWithJupiter ? "गुरु-भौम युति परिहार" : "भृगु-भौम (शुक्र-मंगल) युति परिहार",
      title_en: isWithJupiter ? "Jupiter-Mars Conjunction Parihara" : "Venus-Mars Conjunction Parihara",
      deduction: 35,
      logic_summary: "d1.Mars.house === d1.Venus.house || d1.Mars.house === d1.Jupiter.house",
      condition: () => (isWithVenus || isWithJupiter),
      shloka: "गुरुणा भृगुणा वापि युक्ते भौमे न दोषभाक्।",
      ref: "मुहूर्त कल्पद्रुम",
      explanation_hi: `मंगल के साथ ${(mars.house === jupiter.house) ? 'देवगुरु बृहस्पति' : 'दैत्यगुरु शुक्र'} एक ही भाव में युतिबद्ध हैं, जिससे मंगल की तामसिक अग्नि शांत होकर सौम्यता में परिवर्तित हो जाती है।`,
      explanation_en: `Mars is conjoined with ${(mars.house === jupiter.house) ? 'Jupiter (Devaguru)' : 'Venus (Bhrigu)'} in the same house, cooling Mars's fiery aggression into harmonious beneficence.`
    });

    // PARIHARA 18: Lagnesha Exemption (Aries & Scorpio Ascendants) (-45%)
    evaluateParihara({
      id: 18,
      title_hi: "स्वयं लग्नेश होने का परिहार (मेष / वृश्चिक लग्न)",
      title_en: "Mars as Lagnesha Exemption (Aries / Scorpio Ascendant)",
      deduction: 45,
      logic_summary: "d1.lagna.rashi === 1 || d1.lagna.rashi === 8",
      condition: () => (lagnaRashi === 1 || lagnaRashi === 8),
      shloka: "सर्वे त्रिकोणनेतारो ग्रहाः शुभफलप्रदाः।\nकुजो यदि स्वयं लग्नेशः सर्वदोषहरो भवेत्॥",
      ref: "बृहत्पाराशरहोराशास्त्रम्",
      explanation_hi: "जातक का जन्म मेष अथवा वृश्चिक लग्न में हुआ है, अतः मंगल इस कुंडली का लग्नेश (रक्षक) है। लग्नेश कभी अपनी ही कुंडली में वैवाहिक जीवन का विनाश नहीं करता।",
      explanation_en: "The native is born in Aries or Scorpio ascendant, making Mars the Lagna Lord (custodian of life). As ascendant lord, Mars does not destroy marital bliss in its own chart."
    });

    // PARIHARA 19: 7th Lord Exalted or in Own Sign in Kendra/Trikona (-35%)
    evaluateParihara({
      id: 19,
      title_hi: "सप्तमेश का उच्च/स्वक्षेत्री होकर शुभ स्थानों में बैठना",
      title_en: "7th Lord Exalted or in Own Sign in Kendra/Trikona",
      deduction: 35,
      logic_summary: "lord7 && (lord7.is_exalted || lord7.is_own_sign) && [1, 4, 7, 10, 5, 9].includes(lord7.house)",
      condition: () => {
        const KENDRA_TRIKONA = [1, 4, 7, 10, 5, 9];
        return !!(lord7 && (lord7.is_exalted || lord7.is_own_sign) && KENDRA_TRIKONA.includes(lord7.house));
      },
      shloka: "सप्तमेशे बलोपेते शुभग्रहनिरीक्षिते।\nकेन्द्रकोणगते वापि कुजदोषो विनश्यति॥",
      ref: "फलदीपिका",
      explanation_hi: "दांपत्य भाव का स्वामी (सप्तमेश) स्वयं उच्च/स्वराशि होकर केंद्र या त्रिकोण में पूर्ण बली है। जब दांपत्य का स्वामी सशक्त हो, तो मंगल वैवाहिक सुख को भंग नहीं कर पाता।",
      explanation_en: "The lord of the 7th house is dignified in its own sign or exaltation sign within Kendra (1, 4, 7, 10) or Trikona (5, 9), guaranteeing an unshakeable marital foundation."
    });

    // PARIHARA 20: Absence of Mars Dasha/Antardasha in Marriage Window (Ages 21-36) (-25%)
    evaluateParihara({
      id: 20,
      title_hi: "विवाह काल में मंगल दशा-अंतर्दशा की अनुपस्थिति (काल परिहार)",
      title_en: "Absence of Mars Dasha/Antardasha in Prime Marriage Window (Ages 21-36)",
      deduction: 25,
      logic_summary: "dasha_info.mars_dasha_active_in_window === false",
      condition: () => !!(dashaInfo && dashaInfo.mars_dasha_active_in_window === false),
      shloka: "दशाविरोधे जाते तु न दोषः फलदायकः।\nयस्य यस्य दशा नास्ति स स निष्फलमुच्यते॥",
      ref: "सर्वार्थचिन्तामणि / दशाफल प्रकरण",
      explanation_hi: "जातक की विवाह योग्य मुख्य आयु अवधि (२१ से ३६ वर्ष) के दौरान मंगल की महादशा अथवा अंतर्दशा सक्रिय नहीं है। दशा के अभाव में मंगल का अनिष्ट प्रभाव जातक पर प्रभावी नहीं होता।",
      explanation_en: "Mars Mahadasha or Antardasha is not operative during the prime marriage age bracket (21 to 36 years). Without its active planetary cycle, Mars remains dormant."
    });

    // PARIHARA 21: Tuesday Birth Exemption (Bhaumavara) (-20%)
    evaluateParihara({
      id: 21,
      title_hi: "भौमवार (मंगलवार) जन्म परिहार",
      title_en: "Tuesday Birth Parihara (Bhaumavara)",
      deduction: 20,
      logic_summary: "jataka_info.day_of_birth.toLowerCase() === 'tuesday'",
      condition: () => (dayOfBirth && dayOfBirth.toLowerCase() === "tuesday"),
      shloka: "भौमवारे यदा जन्म कुजदोषो न विद्यते।",
      ref: "जातक दीपिका / मुहूर्त तत्व",
      explanation_hi: "जातक का जन्म मंगलवार को होने से मंगल इसका अधिष्ठाता ग्रह है, अतः जातक की प्रकृति में मंगल का सामंजस्य पहले से विद्यमान होता है।",
      explanation_en: "Being born on Tuesday (day of Mars), Mars is the presiding lord of birth, establishing natural biological affinity and immunity against its afflictions."
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 3: FINAL SCORE & CLASSIFICATION COMPUTATION
    // ─────────────────────────────────────────────────────────────
    const totalDeduction = appliedPariharas.reduce((sum, item) => sum + item.deduction, 0);
    const finalDeduction = Math.min(totalDeduction, grossScore);
    let netDosha = grossScore - finalDeduction;
    if (grossScore === 0) netDosha = 0;

    // Output Categorization Matrix
    let categoryName = "";
    let badgeColor = "";
    let badgeHex = "";
    let mustMarryManglik = false;
    let adviceText = "";
    let remediesText = "";

    if (netDosha >= 60) {
      // 60% to 100%: Severe Manglik
      categoryName = isEn ? "Severe (Ghor) Manglik Dosha" : "तीव्र (घोर) मांगलिक दोष";
      badgeColor = "Red";
      badgeHex = "#dc2626";
      mustMarryManglik = true;
      adviceText = isEn
        ? "Mandatory Requirement: The native must only marry a similarly Manglik native or one whose chart offers full Counter-Dosha (Paap Samya with Saturn/Rahu/Mars in 1, 4, 7, 8, 12). Perform classical Kumbha Vivaha / Arka Vivaha or Bhauma Shanti Mahayajna prior to marriage."
        : "अनिवार्य शर्त: जातक का विवाह केवल समान मांगलिक (Manglik) जातक से ही होना चाहिए। अथवा सामने वाले के 1, 4, 7, 8, 12 में शनि/राहु हो (साम्य परिहार)। विवाह पूर्व शास्त्रीय कुंभ विवाह/अर्क विवाह या मंगल शांति अनुष्ठान कराएं।";
      remediesText = isEn
        ? "Classical Kumbha / Arka Vivaha, Mangal Shanti Yajna, daily recitation of Rinmochaka Mangala Stotra and Sundarkand."
        : "विवाह पूर्व कुंभ विवाह / अर्क विवाह, मंगल शांति महायज्ञ, ऋणमोचक मंगल स्तोत्र व सुंदरकांड का नित्य पाठ।";
    } else if (netDosha >= 25) {
      // 25% to 59%: Moderate / Partial Manglik
      categoryName = isEn ? "Moderate / Partial Manglik Dosha" : "मध्यम / आंशिक मांगलिक दोष";
      badgeColor = "Orange";
      badgeHex = "#ea580c";
      mustMarryManglik = false;
      adviceText = isEn
        ? "Marriage is feasible with a non-manglik partner provided Ashtakoot Gun Milan score exceeds 24 points and Nadi Dosha is absent. If the partner has Jupiter in Kendra or Trikona, married life remains secure."
        : "जातक का विवाह सामान्य जातक से भी संभव है, बशर्ते गुण मिलान में २४+ गुण मिलें और नाड़ी दोष न हो। यदि सामने वाले के केंद्र या त्रिकोण में गुरु हो, तो दांपत्य सुरक्षित रहेगा। सुंदरकांड/हनुमान चालीसा का पाठ श्रेयस्कर है।";
      remediesText = isEn
        ? "Sundarkand or Hanuman Chalisa recitation, Mangal Gayatri Japa, and charitable offering of red lentils (masoor) and copper on Tuesdays."
        : "सुंदरकांड/हनुमान चालीसा का पाठ, मंगल गायत्री जप एवं मंगलवार को लाल मसूर व तांबे का दान श्रेयस्कर है।";
    } else if (netDosha >= 1) {
      // 1% to 24%: Mild / Negligible Manglik
      categoryName = isEn ? "Mild / Negligible Manglik - Parihara Mitigated" : "अल्प (नगण्य) मांगलिक - परिहार युक्त";
      badgeColor = "Yellow";
      badgeHex = "#d97706";
      mustMarryManglik = false;
      adviceText = isEn
        ? "Due to powerful classical exceptions (Pariharas), the adverse influence of Mars has been largely neutralized. The native can marry a non-manglik partner without apprehension."
        : "शास्त्रोक्त परिहारों के कारण मंगल का दुष्प्रभाव लगभग समाप्त हो चुका है। जातक का विवाह गैर-मांगलिक (Non-Manglik) जीवनसाथी के साथ भी निर्बाध रूप से किया जा सकता है।";
      remediesText = isEn
        ? "Regular Hanuman upasana and sweet offerings on Tuesdays for continued harmony."
        : "नियमित हनुमान उपासना एवं मंगलवार को मिष्ठान्न वितरण।";
    } else {
      // 0%: Completely Free
      categoryName = isEn ? "Completely Free from Mangal Dosha" : "पूर्णतः मांगलिक दोष मुक्त";
      badgeColor = "Green";
      badgeHex = "#16a34a";
      mustMarryManglik = false;
      adviceText = isEn
        ? "Mangal Dosha is completely nullified in the birth chart. The native can marry any prospective partner with full confidence."
        : "कुंडली में मांगलिक दोष शून्य है। जातक का विवाह किसी भी सामान्य अथवा परिहार-प्राप्त मांगलिक जातक के साथ पूरी तरह सुरक्षित और प्रशस्त है।";
      remediesText = isEn
        ? "No specific Mars propitiation required."
        : "किसी विशिष्ट मंगल शांति अनुष्ठान की आवश्यकता नहीं है।";
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: PRINT & UI REPORT PAYLOAD
    // ─────────────────────────────────────────────────────────────
    return {
      report_title: isEn ? "Classical Mangal Dosha & Authentic Parihara Certification" : "प्रामाणिक मांगलिक दोष एवं परिहार विवरण पत्रिका",
      jataka_name: jataka_info.name || (isEn ? "Native" : "जातक"),
      jataka_gender: jataka_info.gender || "male",
      jataka_dob: jataka_info.dob || "—",
      jataka_tob: jataka_info.tob || "—",
      jataka_pob: jataka_info.pob || "—",
      current_age: currentAge,
      gross_dosha_percentage: grossScore,
      parihara_deduction_percentage: finalDeduction,
      raw_deduction_percentage: totalDeduction,
      net_dosha_percentage: netDosha,
      dosha_category: categoryName,
      badge_color: badgeColor,
      badge_hex: badgeHex,
      is_manglik: (netDosha > 0),
      mars_details: {
        house: mars.house,
        rashi: signsList[mars.rashi - 1],
        rashi_num: mars.rashi,
        degree: mars.degree,
        is_retrograde: mars.is_retrograde,
        is_combust: mars.is_combust,
        state: mars.state
      },
      tri_lagna_breakup: triLagnaBreakup,
      d9_validation: d9Validation,
      applied_shlokas: appliedShlokas,
      applied_pariharas: appliedPariharas,
      all_pariharas: allPariharas,
      spouse_recommendation: {
        must_marry_manglik: mustMarryManglik,
        advice_text: adviceText,
        remedies: remediesText
      },
      partner_counter_details: partnerCounterDetails
    };
  }

  return {
    DOSHA_HOUSES,
    getRelativeHouse,
    calculateAge,
    calculateBalaadiAvastha,
    isMarsDashaActiveInWindow,
    extractMangalDoshaContract,
    calculateMangalDoshaReport
  };
}));
