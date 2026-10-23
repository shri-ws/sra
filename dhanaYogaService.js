/**
 * DHANA / DARIDRA MASTER ANALYSIS ENGINE (JavaScript Implementation)
 * ─────────────────────────────────────────────────────────────────
 * Master Dhan Yoga Engine Database implementing authentic classical rules from:
 * - Brihat Parashara Hora Shastra (BPHS)
 * - Jaimini Upadesha Sutras
 * - Sarvartha Chintamani
 * - Phaladeepika & Brihat Jataka
 * - Jataka Parijata & Manasagari
 * - Bhavartha Ratnakara & Shambhu Hora Prakasha
 * - Uttara Kalamrita & Nakshatra Phala Chintamani
 * 
 * Strict Zero-Drift, Read-Only Consumer of Host Patrika Engine.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    const exp = factory();
    module.exports = exp;
    module.exports.DhanaYogaEngine = exp;
    if (typeof root !== 'undefined') root.DhanaYogaEngine = exp;
    if (typeof global !== 'undefined') global.DhanaYogaEngine = exp;
  } else {
    root.DhanaYogaEngine = factory();
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function() {
  'use strict';

  // =============================================================================
  // 1. ASTRONOMICAL & GEOMETRIC CONSTANTS
  // =============================================================================
  const ARCSEC_PER_DEG = 3600;
  const ARCSEC_PER_SIGN = 30 * ARCSEC_PER_DEG;
  const ARCSEC_PER_CIRCLE = 360 * ARCSEC_PER_DEG;
  const SIGN_COUNT = 12;
  const NAKSHATRA_COUNT = 27;
  const ARCSEC_PER_NAKSHATRA = Math.floor(ARCSEC_PER_CIRCLE / NAKSHATRA_COUNT); // 13° 20' = 48,000 arcsec
  const NAVAMSHA_PER_SIGN = 9;
  const ARCSEC_PER_NAVAMSHA = Math.floor(ARCSEC_PER_SIGN / NAVAMSHA_PER_SIGN); // 3° 20' = 12,000 arcsec

  class ChartInputError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ChartInputError';
    }
  }

  function houseFrom(refSign, sign) {
    return ((sign - refSign) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT + 1;
  }

  function housePlus(house, offset) {
    return ((house + offset - 2) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT + 1;
  }

  function angleToArcsec(spec, policy = "accept_with_flag", flags = [], label = "angle") {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec) || Object.keys(spec).length !== 1) {
      throw new ChartInputError(`${label}: angle must be one of {arcsec}, {dms}, {deg}`);
    }
    const kind = Object.keys(spec)[0];
    const val = spec[kind];
    let arc;

    if (kind === 'arcsec') {
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        throw new ChartInputError(`${label}: arcsec must be int`);
      }
      arc = val;
    } else if (kind === 'dms') {
      if (!Array.isArray(val) || val.length !== 3) {
        throw new ChartInputError(`${label}: invalid dms ${JSON.stringify(val)}`);
      }
      const [d, m, s] = val;
      if (!Number.isInteger(d) || !Number.isInteger(m) || m < 0 || m >= 60) {
        throw new ChartInputError(`${label}: invalid dms ${JSON.stringify(val)}`);
      }
      const sec = Number.isInteger(s) ? s : Math.round(s);
      if (sec < 0 || sec >= 60) {
        throw new ChartInputError(`${label}: invalid seconds ${s}`);
      }
      arc = d * ARCSEC_PER_DEG + m * 60 + sec;
    } else if (kind === 'deg') {
      if (policy === 'reject') {
        throw new ChartInputError(`${label}: float degrees rejected by policy`);
      }
      arc = Math.round(Number(val) * ARCSEC_PER_DEG);
      flags.push(`${label}: float degrees converted`);
    } else {
      throw new ChartInputError(`${label}: unknown angle form '${kind}'`);
    }

    if (arc < 0 || arc >= ARCSEC_PER_CIRCLE) {
      throw new ChartInputError(`${label}: longitude ${arc} arc-sec outside [0, ${ARCSEC_PER_CIRCLE})`);
    }
    return arc;
  }

  // =============================================================================
  // 2. REFERENCE TABLES
  // =============================================================================
  const D = ARCSEC_PER_DEG;
  const REFERENCE_TABLES = {
    SIGN_NAMES: ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
                 "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"],
    SIGN_NAMES_HI: ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
                    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"],
    PLANET_NAMES: {
      SU: "Surya", MO: "Chandra", MA: "Mangal", ME: "Budh",
      JU: "Guru", VE: "Shukra", SA: "Shani", RA: "Rahu", KE: "Ketu"
    },
    PLANET_NAMES_HI: {
      SU: "सूर्य", MO: "चन्द्र", MA: "मंगल", ME: "बुध",
      JU: "बृहस्पति", VE: "शुक्र", SA: "शनि", RA: "राहु", KE: "केतु"
    },
    SIGN_LORDS: ["MA", "VE", "ME", "MO", "SU", "ME", "VE", "MA", "JU", "SA", "SA", "JU"],
    EXALTATION: {
      SU: [0, 10 * D], MO: [1, 3 * D], MA: [9, 28 * D], ME: [5, 15 * D],
      JU: [3, 5 * D], VE: [11, 27 * D], SA: [6, 20 * D]
    },
    MOOLATRIKONA: {
      SU: [4, 0, 20 * D], MO: [1, 3 * D, 30 * D], MA: [0, 0, 12 * D],
      ME: [5, 15 * D, 20 * D], JU: [8, 0, 10 * D],
      VE: [6, 0, 15 * D], SA: [10, 0, 20 * D]
    },
    INDU_KALAS: { SU: 30, MO: 16, MA: 6, ME: 8, JU: 10, VE: 12, SA: 1 },
    NAVAMSHA_START_BY_ELEMENT: { 0: 0, 1: 9, 2: 6, 3: 3 },
    PUSHKARA_NAVAMSHA_BY_ELEMENT: { 0: [6, 8], 1: [2, 4], 2: [5, 7], 3: [0, 2] },
    NAKSHATRAS: [
      "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
      "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
      "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
      "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
      "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
    ],
    NAKSHATRAS_HI: [
      "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
      "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी",
      "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा",
      "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा",
      "पूर्वाभाद्रपद", "उत्तराभाद्रपद", "रेवती"
    ],
    VIMSHOTTARI_LORDS: ["KE", "VE", "SU", "MO", "MA", "RA", "JU", "SA", "ME"],
    VIMSHOTTARI_YEARS: { KE: 7, VE: 20, SU: 6, MO: 10, MA: 7, RA: 18, JU: 16, SA: 19, ME: 17 }
  };

  // =============================================================================
  // 3. 10-TIER NET WORTH CLASSIFICATION SLABS
  // =============================================================================
  const NET_WORTH_TIERS = [
    {
      tier: 1, min: 0, max: 150,
      range: "₹0 से ₹10 लाख",
      title: "साधारण (Basic Subsistence)",
      desc: "केमद्रुम या दरिद्र योग, द्वितीय भाव अष्टकवर्ग न्यूनता, सीमित संचय क्षमता।",
      color: "#78716c", bgGradient: "linear-gradient(135deg, #78716c, #a8a29e)"
    },
    {
      tier: 2, min: 151, max: 250,
      range: "₹10 लाख से ₹50 लाख",
      title: "मध्यम (Middle Class)",
      desc: "1-2 सामान्य धन योग, औसत अष्टकवर्ग, नियमित आय एवं स्थिर जीवन स्तर।",
      color: "#b45309", bgGradient: "linear-gradient(135deg, #b45309, #d97706)"
    },
    {
      tier: 3, min: 251, max: 380,
      range: "₹50 लाख से ₹1.5 करोड़",
      title: "उच्च मध्यम (Upper Middle)",
      desc: "1 पंचमहापुरुष या चंद्र-मंगल योग, एकादश में शुभ ग्रह, वित्तीय स्थिरता।",
      color: "#0284c7", bgGradient: "linear-gradient(135deg, #0284c7, #38bdf8)"
    },
    {
      tier: 4, min: 381, max: 500,
      range: "₹1.5 करोड़ से ₹5 करोड़",
      title: "लखपति-श्री (Affluent)",
      desc: "2 केंद्र-त्रिकोण राजयोग, इन्दु लग्न में 1 शुभ ग्रह, सुदृढ़ आर्थिक नींव।",
      color: "#2563eb", bgGradient: "linear-gradient(135deg, #2563eb, #3b82f6)"
    },
    {
      tier: 5, min: 501, max: 620,
      range: "₹5 करोड़ से ₹15 करोड़",
      title: "करोड़पति (Crorepati Core)",
      desc: "धनेश-लाभेश सम्बन्ध, दशम में बली ग्रह, नवतारा सम्पत् योग सक्रिय।",
      color: "#7c3aed", bgGradient: "linear-gradient(135deg, #7c3aed, #a855f7)"
    },
    {
      tier: 6, min: 621, max: 740,
      range: "₹15 करोड़ से ₹50 करोड़",
      title: "मल्टी-करोड़पति (Multi-Crorepati)",
      desc: "वसुमती या चंद्राधि योग, इन्दु लग्न में उच्च ग्रह, प्रचुर व्यापारिक लाभ।",
      color: "#9333ea", bgGradient: "linear-gradient(135deg, #9333ea, #c084fc)"
    },
    {
      tier: 7, min: 741, max: 830,
      range: "₹50 करोड़ से ₹150 करोड़",
      title: "अपर मल्टी-करोड़ (High Net Worth)",
      desc: "AK-AmK राजयोग, द्वितीय भाव अष्टकवर्ग > 30, गुरु-शुक्र षड्बल टॉप 3।",
      color: "#d97706", bgGradient: "linear-gradient(135deg, #d97706, #f59e0b)"
    },
    {
      tier: 8, min: 831, max: 900,
      range: "₹150 करोड़ से ₹500 करोड़",
      title: "अर्ध-अरबपति (Mega Wealth / UHNW)",
      desc: "इन्दु लग्न में 2 उच्च ग्रह, आरूढ़ 11वें में ग्रह, पुष्कर नवमांश बली।",
      color: "#b45309", bgGradient: "linear-gradient(135deg, #b45309, #f59e0b)"
    },
    {
      tier: 9, min: 901, max: 960,
      range: "₹500 करोड़ से ₹2,500 करोड़",
      title: "अरबपति (Billionaire Club)",
      desc: "महाराज योग (HL+GL), चंद्राधि + पंचमहापुरुष, निर्दोष दशा क्रम।",
      color: "#dc2626", bgGradient: "linear-gradient(135deg, #b45309, #d97706)"
    },
    {
      tier: 10, min: 961, max: 1000,
      range: "₹2,500 करोड़+ (खरबपति)",
      title: "कुबेर तुल्य (Titan / Multi-Billionaire)",
      desc: "दुर्लभ इन्दु-श्रीनवम योग, शून्य दारिद्र्य योग, सर्वोच्च शास्त्रीय ऐश्वर्य।",
      color: "#7c1305", bgGradient: "linear-gradient(135deg, #7c1305, #dc2626)"
    }
  ];

  // =============================================================================
  // 4. MASTER ANALYSIS ENGINE CLASS
  // =============================================================================
  class MasterDhanYogaAnalyzer {
    constructor(calcResult) {
      this.calc = calcResult;
      this.t = REFERENCE_TABLES;
      this.flags = [];

      // Extract Lagna and planets
      const lagnaObj = calcResult.planets.find(p => p.id === 'Lagna');
      const lagnaDeg = lagnaObj ? lagnaObj.abs : (calcResult.lagnaSign * 30);
      this.asc_arc = Math.round(lagnaDeg * ARCSEC_PER_DEG);
      this.asc_sign = Math.floor(this.asc_arc / ARCSEC_PER_SIGN);

      const idMap = {
        Sun: "SU", Moon: "MO", Mars: "MA", Mercury: "ME",
        Jupiter: "JU", Venus: "VE", Saturn: "SA", Rahu: "RA", Ketu: "KE"
      };

      this.planets = {};
      calcResult.planets.forEach(p => {
        if (p.id === 'Lagna') return;
        const pid = idMap[p.id] || p.id;
        const arc = Math.round(p.abs * ARCSEC_PER_DEG);
        const sign = Math.floor(arc / ARCSEC_PER_SIGN);
        const pos = arc % ARCSEC_PER_SIGN;
        const nakIndex = Math.floor(arc / ARCSEC_PER_NAKSHATRA);
        const navElem = sign % 4;
        const navIdx = Math.floor(pos / ARCSEC_PER_NAVAMSHA);
        const navStart = this.t.NAVAMSHA_START_BY_ELEMENT[navElem];
        const navSign = (navStart + navIdx) % SIGN_COUNT;
        const isPushkara = (this.t.PUSHKARA_NAVAMSHA_BY_ELEMENT[navElem] || []).includes(navIdx);
        const isVargottama = navSign === sign;

        this.planets[pid] = {
          pid,
          arc,
          deg: p.abs,
          sign,
          pos,
          house: houseFrom(this.asc_sign, sign),
          retro: Boolean(p.retro),
          nakIndex,
          navSign,
          isPushkara,
          isVargottama,
          dignity: this._calcDignity(pid, sign, pos)
        };
      });

      // Moon properties
      this.moonNak = this.planets.MO.nakIndex;
      this.moonSign = this.planets.MO.sign;

      // Shukla Paksha Check
      const sunArc = this.planets.SU.arc;
      const moonArc = this.planets.MO.arc;
      this.isShukla = ((moonArc - sunArc) % ARCSEC_PER_CIRCLE + ARCSEC_PER_CIRCLE) % ARCSEC_PER_CIRCLE < Math.floor(ARCSEC_PER_CIRCLE / 2);

      // Jaimini Chara Karakas
      this.karakas = this._calcCharaKarakas();
      this.karakamshaSign = this.planets[this.karakas.AK].navSign;

      // Special Lagnas
      this.induSign = this._calcInduLagna();
      this.alSign = this._calcArudha(1);
      this.a7Sign = this._calcArudha(7);
      this.ulSign = this._calcArudha(12);
      this.a11Sign = this._calcArudha(11);
    }

    lordOfSign(sign) {
      return this.t.SIGN_LORDS[((sign % SIGN_COUNT) + SIGN_COUNT) % SIGN_COUNT];
    }

    lordOfHouse(h) {
      return this.lordOfSign(this.asc_sign + h - 1);
    }

    houseFromMoon(sign) {
      return houseFrom(this.moonSign, sign);
    }

    isBenefic(pid) {
      if (pid === "JU" || pid === "VE") return true;
      if (pid === "MO") return this.isShukla;
      if (pid === "ME") {
        const meSign = this.planets.ME.sign;
        const malefics = ["SU", "MA", "SA", "RA", "KE"];
        return !malefics.some(m => m in this.planets && this.planets[m].sign === meSign);
      }
      return false;
    }

    _calcDignity(pid, sign, pos) {
      if (pid === "RA" || pid === "KE") return "Neutral";
      const exSign = this.t.EXALTATION[pid][0];
      const debSign = (exSign + 6) % SIGN_COUNT;
      const [mtSign, mtS, mtE] = this.t.MOOLATRIKONA[pid];
      if (sign === mtSign && pos >= mtS && pos < mtE) return "Moolatrikona";
      if (sign === exSign) return "Exalted";
      if (sign === debSign) return "Debilitated";
      if (this.lordOfSign(sign) === pid) return "Own";
      return "Neutral";
    }

    _calcCharaKarakas() {
      const physical = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"];
      const items = physical.map(p => ({ pid: p, pos: this.planets[p].pos }));
      items.sort((a, b) => b.pos - a.pos);
      const labels = ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"];
      const res = {};
      items.forEach((item, idx) => {
        if (idx < labels.length) res[labels[idx]] = item.pid;
      });
      return res;
    }

    _calcArudha(h) {
      const hs = ((this.asc_sign + h - 1) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      const ls = this.planets[this.lordOfSign(hs)].sign;
      const d = ((ls - hs) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      let a = (ls + d) % SIGN_COUNT;
      const aDiff = ((a - hs) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      if (aDiff === 0 || aDiff === 6) a = (a + 9) % SIGN_COUNT;
      return a;
    }

    _calcInduLagna() {
      const k = this.t.INDU_KALAS;
      const asc9Lord = this.lordOfSign(this.asc_sign + 8);
      const moon9Lord = this.lordOfSign(this.moonSign + 8);
      const total = k[asc9Lord] + k[moon9Lord];
      const rem = total % SIGN_COUNT || SIGN_COUNT;
      return ((this.moonSign + rem - 1) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
    }

    getTara(targetNak) {
      const dist = ((targetNak - this.moonNak) % NAKSHATRA_COUNT + NAKSHATRA_COUNT) % NAKSHATRA_COUNT + 1;
      const taraIndex = ((dist - 1) % 9) + 1;
      const taraNames = [
        "जन्म (Janma)", "सम्पत् (Sampat)", "विपत् (Vipat)",
        "क्षेम (Kshema)", "प्रत्यरि (Pratyari)", "साधक (Sadhaka)",
        "वध/नैधन (Naidhana)", "मित्र (Mitra)", "अति-मित्र (Ati-Mitra)"
      ];
      return { dist, taraIndex, name: taraNames[taraIndex - 1] };
    }

    // =============================================================================
    // 5. EVALUATION OF ALL YOGAS (THE MASTER SUITE)
    // =============================================================================
    evaluateAllYogas() {
      const triggered = [];
      const deductions = [];
      const cancelled = [];

      const l2 = this.lordOfHouse(2);
      const l11 = this.lordOfHouse(11);
      const l1 = this.lordOfHouse(1);
      const l5 = this.lordOfHouse(5);
      const l9 = this.lordOfHouse(9);
      const l10 = this.lordOfHouse(10);
      const l6 = this.lordOfHouse(6);
      const l8 = this.lordOfHouse(8);
      const l12 = this.lordOfHouse(12);

      // ── 1. NAKSHATRA & NAVATARA ENGINES ──
      const l2Tara = this.getTara(this.planets[l2].nakIndex);
      const l11Tara = this.getTara(this.planets[l11].nakIndex);

      if (l2Tara.taraIndex === 2 || l11Tara.taraIndex === 2) {
        triggered.push({
          id: "NAVATARA_SAMPAT",
          category: "NAVATARA",
          name: "सम्पत् तारा धन योग",
          authority: "नक्षत्र फल चिंतामणि / BPHS",
          points: 35,
          desc: "धनेश या लाभेश जन्म नक्षत्र से सम्पत् तारा (2, 11, 20) में स्थित है। यह व्यापार एवं उद्यम में त्वरित नकदी और अबाध लिक्विडिटी प्रदान करता है।",
          detail: `धनेश ${this.t.PLANET_NAMES_HI[l2]} (${l2Tara.name}) / लाभेश ${this.t.PLANET_NAMES_HI[l11]} (${l11Tara.name})`
        });
      }

      const l10Tara = this.getTara(this.planets[l10].nakIndex);
      const l5Tara = this.getTara(this.planets[l5].nakIndex);
      if (l10Tara.taraIndex === 6 || l5Tara.taraIndex === 6) {
        triggered.push({
          id: "NAVATARA_SADHAKA",
          category: "NAVATARA",
          name: "साधक तारा सिद्धि योग",
          authority: "नक्षत्र फल चिंतामणि",
          points: 30,
          desc: "कर्मेश या पंचमेश जन्म नक्षत्र से साधक तारा (6, 15, 24) में स्थित है। यह पुरुषार्थ और बुद्धि को प्रत्यक्ष वित्तीय सफलता में रूपांतरित करता है।",
          detail: `कर्मेश ${this.t.PLANET_NAMES_HI[l10]} / पंचमेश ${this.t.PLANET_NAMES_HI[l5]} साधक तारा में`
        });
      }

      const l9Tara = this.getTara(this.planets[l9].nakIndex);
      if ([8, 9].includes(l2Tara.taraIndex) || [8, 9].includes(l9Tara.taraIndex) || [8, 9].includes(l11Tara.taraIndex)) {
        triggered.push({
          id: "NAVATARA_MITRA",
          category: "NAVATARA",
          name: "मित्र एवं अति-मित्र तारा योग",
          authority: "नक्षत्र फल चिंतामणि",
          points: 25,
          desc: "धन, भाग्य या लाभ का स्वामी मित्र या अति-मित्र तारा में स्थित है, जिससे बड़े निवेशकों, मित्रों और जनसमर्थन से आर्थिक उन्नति मिलती है।",
          detail: `त्रिकोण/धन भाव स्वामी मित्र/अति-मित्र तारा में`
        });
      }

      // Navatara Penalties
      if ([3, 5, 7].includes(l2Tara.taraIndex) || [3, 5, 7].includes(l11Tara.taraIndex)) {
        deductions.push({
          id: "NAVATARA_PENALTY",
          category: "DARIDRA",
          name: "विपत् / प्रत्यरि / नैधन तारा दोष",
          authority: "नक्षत्र फल चिंतामणि",
          points: -40,
          desc: "धनेश या लाभेश का विपत् (3), प्रत्यरि (5) या वध/नैधन (7) तारा में स्थित होना आर्थिक निर्णयों में अड़चनें पैदा करता है।",
          detail: `धनेश: ${l2Tara.name}, लाभेश: ${l11Tara.name}`
        });
      }

      // Specific Archetype Nakshatras
      if ([this.planets.JU.nakIndex, this.planets.MO.nakIndex, this.planets[l1].nakIndex].includes(7)) {
        triggered.push({
          id: "NAK_PUSHYA",
          category: "NAVATARA",
          name: "पुष्य पोषण ऐश्वर्य योग",
          authority: "महर्षि पराशर संहिता",
          points: 40,
          desc: "गुरु, चंद्र या लग्नेश पुष्य नक्षत्र में स्थित हैं। यह स्थायी संपत्ति, अटूट संस्था निर्माण और संस्थागत वित्त में श्रेष्ठता देता है।",
          detail: "पुष्य नक्षत्र (कर्क राशि) में शुभ ग्रह की स्थिति"
        });
      }

      if ([this.planets.VE.nakIndex, this.planets.MO.nakIndex].includes(3)) {
        triggered.push({
          id: "NAK_ROHINI",
          category: "NAVATARA",
          name: "रोहिणी ऐश्वर्य योग",
          authority: "बृहत्संहिता / फलदीपिका",
          points: 35,
          desc: "शुक्र या चंद्रमा रोहिणी नक्षत्र में स्थित हैं। यह विलासिता, ब्रांड वैल्यू और तरल नकदी (Liquid Cash) से प्रचुर धन देता है।",
          detail: "रोहिणी नक्षत्र (वृषभ राशि) में शुक्र/चंद्र"
        });
      }

      if ([this.planets.MA.nakIndex, this.planets.SA.nakIndex].includes(22)) {
        triggered.push({
          id: "NAK_DHANISHTA",
          category: "NAVATARA",
          name: "धनिष्ठा कुबेर योग",
          authority: "जातक पारिजात",
          points: 40,
          desc: "मंगल या शनि धनिष्ठा नक्षत्र में स्थित हैं। यह अचल संपत्ति, रियल एस्टेट, भूमि विकास और इंफ्रास्ट्रक्चर से विपुल धन कराता है।",
          detail: "धनिष्ठा नक्षत्र में मंगल/शनि की स्थिति"
        });
      }

      if (this.planets.ME.nakIndex === 12 || this.planets.RA.nakIndex === 14) {
        triggered.push({
          id: "NAK_HASTA_SWATI",
          category: "NAVATARA",
          name: "हस्त-स्वाती वाणिज्य योग",
          authority: "मानसागरी",
          points: 30,
          desc: "बुध हस्त में या राहु स्वाती नक्षत्र में स्थित हैं। डिजिटल प्लेटफॉर्म, सॉफ्टवेयर, ट्रेडिंग और वैश्विक नेटवर्क से लाभ।",
          detail: "बुध हस्त (12) या राहु स्वाती (14) में स्थित"
        });
      }

      // Pushkara Navamsha Multipliers
      for (const pid in this.planets) {
        const p = this.planets[pid];
        if (p.isPushkara) {
          triggered.push({
            id: `PUSHKARA_${pid}`,
            category: "NAVATARA",
            name: `पुष्कर नवमांश योग (${this.t.PLANET_NAMES_HI[pid]})`,
            authority: "जातक पारिजात / शम्भु होरा प्रकाश",
            points: 25,
            desc: `${this.t.PLANET_NAMES_HI[pid]} पुष्कर नवमांश में स्थित होकर जातक के भाग्य एवं धन ऊर्जा को कई गुना बढ़ा रहा है।`,
            detail: `${this.t.PLANET_NAMES_HI[pid]} पुष्कर नवमांश में स्थापित`
          });
          break; // cap at 1 announcement to avoid spam
        }
      }

      // ── 2. JAIMINI WEALTH ALGORITHMS ──
      const ak = this.karakas.AK;
      const amk = this.karakas.AmK;
      const akP = this.planets[ak];
      const amkP = this.planets[amk];

      const akAmkDiff = ((amkP.sign - akP.sign) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      if (akP.sign === amkP.sign || [0, 6].includes(akAmkDiff) || [4, 8].includes(akAmkDiff)) {
        triggered.push({
          id: "JM_AK_AMK_MAHAYOGA",
          category: "JAIMINI",
          name: "आत्मकारक-अमात्यकारक महायोग",
          authority: "महर्षि जैमिनी उपदेश सूत्र",
          points: 60,
          desc: "आत्मकारक (AK) और अमात्यकारक (AmK) की युति, परस्पर दृष्टि या त्रिकोण सम्बन्ध शीर्ष नेतृत्व, कॉर्पोरेट अधिकार और अकूत संपत्ति का सूचक है।",
          detail: `AK (${this.t.PLANET_NAMES_HI[ak]}) एवं AmK (${this.t.PLANET_NAMES_HI[amk]}) का शुभ सम्बन्ध`
        });
      }

      // Karakamsha 11th House
      const karakamsha11 = (this.karakamshaSign + 10) % SIGN_COUNT;
      const beneficsInKarakamsha11 = Object.values(this.planets).filter(p => p.sign === karakamsha11 && (this.isBenefic(p.pid) || p.pid === "KE"));
      if (beneficsInKarakamsha11.length > 0) {
        triggered.push({
          id: "JM_KARAKAMSHA_11",
          category: "JAIMINI",
          name: "कारकांश एकादश लाभ योग",
          authority: "जैमिनी सूत्र",
          points: 45,
          desc: "कारकांश लग्न से 11वें भाव में शुभ ग्रह या केतु स्थित है। यह गुप्त स्रोतों, ऑनलाइन संपत्तियों और अप्रत्याशित माध्यमों से प्रचुर लाभ कराता है।",
          detail: `कारकांश 11वें (${this.t.SIGN_NAMES_HI[karakamsha11]}) में ग्रह स्थिति`
        });
      }

      // Arudha Lagna 11th
      const al11Planets = Object.values(this.planets).filter(p => p.sign === this.a11Sign && p.pid !== "RA" && p.pid !== "KE");
      if (al11Planets.length > 0) {
        triggered.push({
          id: "JM_AL_11_LABHA",
          category: "JAIMINI",
          name: "आरूढ़ लग्न एकादश लाभ योग",
          authority: "जैमिनी सूत्र: 'लाभे ग्रहाः सर्वे धनदाः'",
          points: 50,
          desc: "आरूढ़ लग्न (AL) से 11वें भाव में ग्रह विराजमान हैं। जैमिनी सिद्धांत अनुसार यहाँ सभी ग्रह बाह्य जगत में वित्तीय समृद्धि और समाज में सम्मान देते हैं।",
          detail: `आरूढ़ 11वें (${this.t.SIGN_NAMES_HI[this.a11Sign]}) में ग्रह विराजमान`
        });
      }

      // AL and A7 in Kendra or Trikona
      const alA7Diff = ((this.a7Sign - this.alSign) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      if ([0, 3, 4, 6, 8, 9].includes(alA7Diff)) {
        triggered.push({
          id: "JM_AL_A7_SAMBANDHA",
          category: "JAIMINI",
          name: "दारापद-आरूढ़ साम्राज्य योग",
          authority: "जैमिनी उपदेश सूत्र",
          points: 35,
          desc: "आरूढ़ लग्न (AL) और दारापद (A7) परस्पर केंद्र या त्रिकोण में हैं। यह बड़े वाणिज्यिक गठबंधनों, पब्लिक लिस्टिंग और पार्टनरशिप से भारी धन देता है।",
          detail: `AL (${this.t.SIGN_NAMES_HI[this.alSign]}) एवं A7 (${this.t.SIGN_NAMES_HI[this.a7Sign]}) का केंद्र/त्रिकोण सम्बन्ध`
        });
      }

      // ── 3. INDU LAGNA & SHREE LAGNA ──
      const induPlanets = Object.values(this.planets).filter(p => p.sign === this.induSign);
      const exaltedInIndu = induPlanets.filter(p => p.dignity === "Exalted");
      const beneficsInIndu = induPlanets.filter(p => this.isBenefic(p.pid));

      if (exaltedInIndu.length >= 1) {
        triggered.push({
          id: "INDU_KOTIPATI",
          category: "INDU",
          name: "कोटिपति इन्दु योग (उच्च ग्रह)",
          authority: "बृहत्पाराशर होराशास्त्र (इन्दु लग्न विचार)",
          points: 100,
          desc: "इन्दु लग्न (विशेष चंद्र धन लग्न) में उच्च राशि का ग्रह विराजमान है। यह करोड़पति से मल्टी-करोड़पति बनने का अचूक शास्त्रीय प्रमाण है।",
          detail: `इन्दु लग्न (${this.t.SIGN_NAMES_HI[this.induSign]}) में उच्च ग्रह: ${exaltedInIndu.map(x=>this.t.PLANET_NAMES_HI[x.pid]).join(", ")}`
        });
      } else if (beneficsInIndu.length >= 1) {
        triggered.push({
          id: "INDU_SUBHA",
          category: "INDU",
          name: "शुभ इन्दु धन योग",
          authority: "बृहत्पाराशर होराशास्त्र",
          points: 50,
          desc: "इन्दु लग्न में नैसर्गिक शुभ ग्रह विराजमान होकर जातक के धन कोष की रक्षा करते हैं और आर्थिक स्थिरता प्रदान करते हैं।",
          detail: `इन्दु लग्न में शुभ ग्रह: ${beneficsInIndu.map(x=>this.t.PLANET_NAMES_HI[x.pid]).join(", ")}`
        });
      }

      // Indu Bhanga Check
      const induMaleficsDebil = induPlanets.filter(p => p.dignity === "Debilitated" && !this.isBenefic(p.pid));
      const indu12Sign = (this.induSign + 11) % SIGN_COUNT;
      if (induMaleficsDebil.length > 0 && this.planets.RA.sign === indu12Sign) {
        deductions.push({
          id: "INDU_BHANGA",
          category: "DARIDRA",
          name: "इन्दु भंग दोष",
          authority: "BPHS",
          points: -60,
          desc: "इन्दु लग्न में नीच का पाप ग्रह है और उसके 12वें भाव में राहु स्थित है। यह धन संचय में अचानक लीकेज पैदा करता है।",
          detail: "इन्दु लग्न में नीच ग्रह व 12वें में राहु"
        });
      }

      // ── 4. BPHS ASCENDANT-SPECIFIC MATRIX (12 LAGNAS) ──
      const s = this.asc_sign; // 0=Mesha, 1=Vrish, etc.
      if (s === 0) { // Mesha
        if ([2, 4].includes(this.planets.VE.house) && ([5, 11].includes(this.planets.SU.house) || [5, 11].includes(this.planets.ME.house))) {
          triggered.push({ id: "BPHS_MESHA_1", category: "BPHS_LAGNA", name: "मेष लग्न विशिष्ट धन योग", authority: "BPHS / भावार्थ रत्नाकर", points: 40, desc: "शुक्र द्वितीय/चतुर्थ में तथा सूर्य-बुध पंचम/एकादश में होकर मेष लग्न हेतु विशिष्ट धन योग निर्मित कर रहे हैं।", detail: "मेष लग्न योग 1" });
        }
        if ([9, 10].includes(this.planets.MA.house) && this.planets.MA.sign === this.planets.JU.sign) {
          triggered.push({ id: "BPHS_MESHA_2", category: "BPHS_LAGNA", name: "मेष लग्नेश-भाग्येश साम्राज्य योग", authority: "BPHS", points: 45, desc: "मंगल और गुरु की युति 9वें या 10वें भाव में होकर धर्म-कर्माधिपति जैसा प्रबल साम्राज्य योग बना रही है।", detail: "मेष: मंगल-गुरु युति 9/10 में" });
        }
      } else if (s === 1) { // Vrishabha
        if (this.planets.SA.sign === this.planets.ME.sign && [2, 9, 11].includes(this.planets.SA.house)) {
          triggered.push({ id: "BPHS_VRISH_1", category: "BPHS_LAGNA", name: "वृषभ योगकारक शनि-बुध धन योग", authority: "BPHS", points: 50, desc: "योगकारक शनि और धनेश बुध की युति 2, 9 या 11वें भाव में वृषभ लग्न को अचल संपत्ति व व्यापारिक साम्राज्य देती है।", detail: "शनि-बुध युति 2/9/11 में" });
        }
      } else if (s === 2) { // Mithuna
        if (this.planets.ME.sign === this.planets.VE.sign && [1, 4, 5].includes(this.planets.ME.house)) {
          triggered.push({ id: "BPHS_MITHUN_1", category: "BPHS_LAGNA", name: "मिथुन लक्ष्मी-नारायण योग", authority: "भावार्थ रत्नाकर", points: 40, desc: "लग्नेश बुध और पंचमेश शुक्र की केंद्र-त्रिकोण युति बौद्धिक संपदा और रचनात्मक व्यापार से विपुल धन देती है।", detail: "बुध-शुक्र 1/4/5 में" });
        }
      } else if (s === 3) { // Karka
        if (this.planets.MA.house === 10 && this.planets.MA.dignity === "Exalted" && this.planets.JU.house === 9 && this.planets.JU.dignity === "Own") {
          triggered.push({ id: "BPHS_KARKA_1", category: "BPHS_LAGNA", name: "कर्क रुचक-हंस महा साम्राज्य योग", authority: "BPHS", points: 60, desc: "मंगल दशम में उच्च (रुचक) एवं गुरु नवम में स्वराशि होकर कर्क लग्न हेतु सर्वोत्तम महा-साम्राज्य योग बना रहे हैं।", detail: "मंगल 10वें उच्च + गुरु 9वें स्वराशि" });
        }
        if (this.planets.MO.house === 2 && this.planets.SU.house === 2) {
          triggered.push({ id: "BPHS_KARKA_2", category: "BPHS_LAGNA", name: "कर्क चंद्र-सूर्य कोष योग", authority: "BPHS", points: 40, desc: "चंद्र और सूर्य द्वितीय भाव (सिंह) में एक साथ स्थित होकर पैतृक व स्व-उपार्जित कोष में निरंतर वृद्धि करते हैं।", detail: "चंद्र-सूर्य द्वितीय भाव में" });
        }
      } else if (s === 4) { // Simha
        if (this.planets.SU.house === 1 && ([3, 11].includes(this.planets.ME.house) || [3, 11].includes(this.planets.MA.house))) {
          triggered.push({ id: "BPHS_SIMHA_1", category: "BPHS_LAGNA", name: "सिंह सूर्य-मंगल पराक्रम धन योग", authority: "BPHS", points: 45, desc: "सूर्य लग्न में स्वराशि होकर तथा बुध/मंगल के उपचय भावों में होने से राजकीय अनुबंधों व उच्च पदों से धन लाभ होता है।", detail: "सूर्य लग्न में + बुध/मंगल 3/11 में" });
        }
        if (this.planets.JU.sign === this.planets.MA.sign && [5, 9].includes(this.planets.JU.house)) {
          triggered.push({ id: "BPHS_SIMHA_2", category: "BPHS_LAGNA", name: "सिंह गुरु-मंगल त्रिकोण महायोग", authority: "भावार्थ रत्नाकर", points: 55, desc: "पंचमेश गुरु और योगकारक मंगल की त्रिकोण में युति सिंह लग्न को महालक्ष्मी की अक्षय कृपा प्रदान करती है।", detail: "गुरु-मंगल युति 5/9 में" });
        }
      } else if (s === 5) { // Kanya
        if (this.planets.ME.sign === this.planets.VE.sign && [1, 2].includes(this.planets.ME.house)) {
          triggered.push({ id: "BPHS_KANYA_1", category: "BPHS_LAGNA", name: "कन्या लक्ष्मी-नारायण महायोग", authority: "BPHS", points: 50, desc: "लग्नेश बुध और धनेश-भाग्येश शुक्र की लग्न या द्वितीय भाव में युति कन्या लग्न हेतु सर्वश्रेष्ठ धन प्रदाता है।", detail: "बुध-शुक्र 1/2 में" });
        }
      } else if (s === 6) { // Tula
        if ([4, 5].includes(this.planets.SA.house) && [9, 11].includes(this.planets.ME.house)) {
          triggered.push({ id: "BPHS_TULA_1", category: "BPHS_LAGNA", name: "तुला योगकारक शनि-बुध राजयोग", authority: "BPHS", points: 55, desc: "योगकारक शनि केंद्र/त्रिकोण में और भाग्येश बुध लाभ भाव में होकर तुला लग्न को अतुल्य आर्थिक समृद्धि देते हैं।", detail: "शनि 4/5 में + बुध 9/11 में" });
        }
      } else if (s === 7) { // Vrischika
        if (this.planets.MA.sign === this.planets.JU.sign && [5, 9].includes(this.planets.MA.house)) {
          triggered.push({ id: "BPHS_VRISCH_1", category: "BPHS_LAGNA", name: "वृश्चिक लग्नेश-पंचमेश धन योग", authority: "BPHS", points: 50, desc: "लग्नेश मंगल और द्वितीयेश-पंचमेश गुरु की त्रिकोण में युति वृश्चिक लग्न को अकूत संपत्ति व निवेश से लाभ कराती है।", detail: "मंगल-गुरु त्रिकोण में" });
        }
      } else if (s === 8) { // Dhanu
        if (this.planets.JU.house === 1 && ([10, 11].includes(this.planets.SU.house) || [10, 11].includes(this.planets.ME.house))) {
          triggered.push({ id: "BPHS_DHANU_1", category: "BPHS_LAGNA", name: "धनु हंस-आदित्य राज-धन योग", authority: "BPHS", points: 55, desc: "हंस योग युक्त गुरु लग्न में और सूर्य-बुध दशम/एकादश में धनु लग्न को संस्थागत नेतृत्व व उच्च प्रतिष्ठा देते हैं।", detail: "गुरु लग्न में + सूर्य-बुध 10/11 में" });
        }
      } else if (s === 9) { // Makara
        if (this.planets.SA.sign === this.planets.VE.sign && [5, 9, 10].includes(this.planets.SA.house)) {
          triggered.push({ id: "BPHS_MAKARA_1", category: "BPHS_LAGNA", name: "मकर शनि-शुक्र परम योगकारक योग", authority: "BPHS", points: 60, desc: "लग्नेश शनि और योगकारक शुक्र की त्रिकोण या केंद्र में युति मकर लग्न को विशाल औद्योगिक साम्राज्य प्रदान करती है।", detail: "शनि-शुक्र 5/9/10 में" });
        }
      } else if (s === 10) { // Kumbha
        if ([4, 9].includes(this.planets.VE.house) && [1, 11].includes(this.planets.SA.house)) {
          triggered.push({ id: "BPHS_KUMBHA_1", category: "BPHS_LAGNA", name: "कुंभ शुक्र-शनि ऐश्वर्य योग", authority: "BPHS", points: 50, desc: "योगकारक शुक्र चतुर्थ/नवम में और लग्नेश शनि लग्न/एकादश में कुंभ लग्न को नवाचार व तकनीक से भारी संपत्ति देते हैं।", detail: "शुक्र 4/9 में + शनि 1/11 में" });
        }
      } else if (s === 11) { // Meena
        if (this.planets.MO.house === 2 && this.planets.MO.dignity === "Exalted" && this.planets.MA.house === 11 && this.planets.MA.dignity === "Exalted") {
          triggered.push({ id: "BPHS_MEENA_2", category: "BPHS_LAGNA", name: "मीन चंद्र-मंगल द्वि-उच्च महालक्ष्मी योग", authority: "भावार्थ रत्नाकर", points: 65, desc: "पंचमेश चंद्र द्वितीय भाव में उच्च का तथा धनेश-भाग्येश मंगल एकादश में उच्च का होकर मीन लग्न का दुर्लभतम धन योग बना रहे हैं।", detail: "चंद्र 2रे उच्च + मंगल 11वें उच्च" });
        }
      }

      // ── 5. CLASSICAL HEAVYWEIGHTS ──
      // Pancha Mahapurusha
      const mpPlanets = [
        { pid: "MA", name: "रुचक योग", pts: 40, auth: "भूमि व रियल एस्टेट से अकूत धन" },
        { pid: "ME", name: "भद्र योग", pts: 40, auth: "व्यापार, सॉफ्टवेयर व बौद्धिक संपदा" },
        { pid: "JU", name: "हंस योग", pts: 45, auth: "संस्थागत वित्त व परामर्श से वैभव" },
        { pid: "VE", name: "मालव्य योग", pts: 45, auth: "लग्जरी, मीडिया व अचल संपत्ति" },
        { pid: "SA", name: "शश योग", pts: 40, auth: "माइनिंग, इंफ्रास्ट्रक्चर व जनबल" }
      ];

      mpPlanets.forEach(mp => {
        const p = this.planets[mp.pid];
        if ([1, 4, 7, 10].includes(p.house) && ["Exalted", "Moolatrikona", "Own"].includes(p.dignity)) {
          triggered.push({
            id: `MP_${mp.pid}`,
            category: "HEAVYWEIGHT",
            name: `पंच महापुरुष: ${mp.name}`,
            authority: "बृहज्जातक / BPHS",
            points: mp.pts,
            desc: `${this.t.PLANET_NAMES_HI[mp.pid]} केंद्र भाव में बली होकर पंचमहापुरुष योग बना रहे हैं। (${mp.auth})`,
            detail: `${this.t.PLANET_NAMES_HI[mp.pid]} ${p.house}वें भाव में ${p.dignity}`
          });
        }
      });

      // Chandradhi Yoga (Full / Partial)
      const c6 = housePlus(this.planets.MO.house, 6);
      const c7 = housePlus(this.planets.MO.house, 7);
      const c8 = housePlus(this.planets.MO.house, 8);
      const cBenefics = Object.values(this.planets).filter(p => [c6, c7, c8].includes(p.house) && this.isBenefic(p.pid));

      if (cBenefics.length >= 3) {
        triggered.push({
          id: "CHANDRADHI_FULL",
          category: "HEAVYWEIGHT",
          name: "पूर्ण चंद्राधि महायोग",
          authority: "बृहज्जातक / फलदीपिका",
          points: 75,
          desc: "चंद्रमा से 6, 7 और 8वें भाव में सभी शुभ ग्रह (बुध, गुरु, शुक्र) स्थित हैं। यह जातक को बिना राजनीतिक शक्ति के भी शीर्ष उद्योगपति बनाता है।",
          detail: "चंद्रमा से 6, 7, 8 भावों में शुभ ग्रह स्थित"
        });
      }

      // Vasumati Yoga
      const upachayasLagna = [3, 6, 10, 11];
      const beneficsInUpachaya = Object.values(this.planets).filter(p => upachayasLagna.includes(p.house) && this.isBenefic(p.pid));
      if (beneficsInUpachaya.length >= 3) {
        triggered.push({
          id: "VASUMATI_FULL",
          category: "HEAVYWEIGHT",
          name: "अखंड वसुमती योग",
          authority: "फलदीपिका / बृहज्जातक",
          points: 60,
          desc: "लग्न से सभी उपचय भावों में नैसर्गिक शुभ ग्रह विराजमान हैं। शास्त्रों अनुसार यह योग जातक को कुबेर तुल्य संपत्ति प्रदान करता है।",
          detail: "उपचय भावों (3, 6, 10, 11) में 3+ शुभ ग्रह"
        });
      } else if (beneficsInUpachaya.length >= 2) {
        triggered.push({
          id: "VASUMATI_PARTIAL",
          category: "HEAVYWEIGHT",
          name: "वसुमती योग (आंशिक)",
          authority: "फलदीपिका",
          points: 40,
          desc: "उपचय भावों में दो शुभ ग्रह स्थित हैं, जिससे जातक अपने पुरुषार्थ से निरंतर आर्थिक प्रगति और संपत्ति निर्माण करता है।",
          detail: "उपचय भावों में 2 शुभ ग्रह"
        });
      }

      // Gajakesari Yoga (Grade A vs Grade B)
      const jupMoonDiff = ((this.planets.JU.sign - this.moonSign) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      if ([0, 3, 6, 9].includes(jupMoonDiff)) {
        const isDusthana = [6, 8, 12].includes(this.planets.JU.house);
        triggered.push({
          id: "GAJAKESARI",
          category: "HEAVYWEIGHT",
          name: isDusthana ? "गजकेसरी योग (ग्रेड बी)" : "गजकेसरी महायोग (ग्रेड ए)",
          authority: "बृहत्पाराशर होराशास्त्र / जातक पारिजात",
          points: isDusthana ? 25 : 45,
          desc: "चंद्रमा से केंद्र में देवगुरु बृहस्पति स्थित होकर अखंड कीर्ति, बौद्धिक प्रभाव और स्थिर धन लाभ प्रदान कर रहे हैं।",
          detail: `गुरु चंद्र से ${jupMoonDiff === 0 ? 'युत' : (jupMoonDiff === 3 ? '4थे' : (jupMoonDiff === 6 ? '7वें' : '10वें'))} भाव में`
        });
      }

      // Chandra-Mangala Yoga
      if (this.planets.MO.sign === this.planets.MA.sign || ((this.planets.MA.sign - this.moonSign + SIGN_COUNT) % SIGN_COUNT === 6)) {
        triggered.push({
          id: "CHANDRA_MANGALA",
          category: "HEAVYWEIGHT",
          name: "चंद्र-मंगल महालक्ष्मी योग",
          authority: "मानसागरी",
          points: 40,
          desc: "चंद्रमा और मंगल की युति अथवा परस्पर दृष्टि आक्रामक वित्तीय विस्तार, रियल एस्टेट व उद्यमशीलता से भारी धन लाभ कराती है।",
          detail: "चंद्र-मंगल की युति या 1/7 दृष्टि"
        });
      }

      // Viparita Rajayoga (Harsha / Sarala / Vimala)
      const dusthanaHouses = [6, 8, 12];
      const trikLordsInTrik = [l6, l8, l12].filter(lord => dusthanaHouses.includes(this.planets[lord].house));
      if (trikLordsInTrik.length >= 1) {
        triggered.push({
          id: "VIPARITA_RAJAYOGA",
          category: "HEAVYWEIGHT",
          name: "विपरीत राजयोग (हर्ष/सरल/विमल)",
          authority: "सर्वार्थ चिंतामणि / BPHS",
          points: 35,
          desc: "त्रिक भावों (6, 8, 12) के स्वामी त्रिक भावों में ही स्थित हैं। विपरीत परिस्थितियों, प्रतिस्पर्धा और अप्रत्याशित स्रोतों से धन लाभ।",
          detail: `त्रिक स्वामी ${trikLordsInTrik.map(x=>this.t.PLANET_NAMES_HI[x]).join(", ")} त्रिक भावों में स्थित`
        });
      }

      // Kubera Khajana Yoga
      if (this.planets[l8].house === 11 && [8, 2].includes(this.planets[l11].house)) {
        triggered.push({
          id: "KUBERA_KHAJANA",
          category: "HEAVYWEIGHT",
          name: "कुबेर खजाना योग (गुप्त/अप्रत्याशित धन)",
          authority: "शम्भु होरा प्रकाश",
          points: 50,
          desc: "अष्टमेश 11वें में तथा लाभेश 8वें/2रे में स्थित है। यह अचानक वसीयत, क्रिप्टोकरेंसी, अनलिस्टेड शेयर्स या अप्रत्याशित स्रोतों से धन देता है।",
          detail: "अष्टमेश 11वें में एवं लाभेश 8/2 भाव में"
        });
      }

      // ── 6. DARIDRA & FINANCIAL LEAKAGE ASSESSMENT ──
      // Kemadruma Yoga & Cancellation
      const moonH2 = housePlus(this.planets.MO.house, 2);
      const moonH12 = housePlus(this.planets.MO.house, 12);
      const physicals = ["MA", "ME", "JU", "VE", "SA"];
      const planetsNearMoon = Object.values(this.planets).filter(p => physicals.includes(p.pid) && [moonH2, moonH12].includes(p.house));

      if (planetsNearMoon.length === 0) {
        // Kemadruma triggered; now check authentic classical cancellation
        const kendraFromMoon = [0, 3, 6, 9];
        const kendraFromLagna = [1, 4, 7, 10];
        const moonDiffs = physicals.map(pid => ((this.planets[pid].sign - this.moonSign) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT);
        const hasKendraMoon = moonDiffs.some(d => kendraFromMoon.includes(d));
        const hasKendraLagna = physicals.some(pid => kendraFromLagna.includes(this.planets[pid].house));

        if (hasKendraMoon || hasKendraLagna) {
          cancelled.push({
            id: "KEMADRUMA_BHANGA",
            category: "CANCELLED",
            name: "केमद्रुम भंग राजयोग",
            authority: "बृहज्जातक / फलदीपिका",
            desc: "चंद्रमा के आगे-पीछे ग्रह न होने से केमद्रुम योग बना था, परंतु केंद्र में ग्रह स्थित होने से यह दोष पूर्णतः भंग होकर राजयोग में बदल गया है।",
            detail: "लग्न या चंद्र से केंद्र में भौतिक ग्रह स्थित होने से दोष पूर्णतः निष्प्रभावी"
          });
        } else {
          deductions.push({
            id: "KEMADRUMA_ACTIVE",
            category: "DARIDRA",
            name: "केमद्रुम योग (अनकैंसिल्ड)",
            authority: "बृहज्जातक",
            points: -70,
            desc: "चंद्रमा के 2रे और 12वें भाव खाली हैं तथा केंद्र में कोई ग्रह नहीं है। यह आकस्मिक व्यय और वित्तीय अस्थिरता का सूचक है।",
            detail: "चंद्रमा के द्वितीय/द्वादश भाव रिक्त व केंद्र शून्य"
          });
        }
      }

      // BPHS Daridra Yoga: 11th Lord in 6, 8, 12 debilitated or afflicted
      if ([6, 8, 12].includes(this.planets[l11].house) && this.planets[l11].dignity === "Debilitated") {
        deductions.push({
          id: "BPHS_DARIDRA_L11",
          category: "DARIDRA",
          name: "बृहत्पाराशर दरिद्र योग",
          authority: "BPHS",
          points: -50,
          desc: "ग्यारहवें भाव (लाभ) का स्वामी त्रिक भाव (6, 8, 12) में नीच होकर बैठा है, जिससे लाभ प्राप्ति में अत्यधिक संघर्ष होता है।",
          detail: `लाभेश ${this.t.PLANET_NAMES_HI[l11]} त्रिक में नीच`
        });
      }

      // Dhanesh in 12th
      if (this.planets[l2].house === 12) {
        deductions.push({
          id: "DHANESH_IN_12",
          category: "DARIDRA",
          name: "धनेश का द्वादश (व्यय) भाव में होना",
          authority: "मानसागरी",
          points: -40,
          desc: "द्वितीय भाव (संचित धन) का स्वामी 12वें (व्यय) भाव में स्थित होने से संचित पूंजी का तेजी से व्यय होता है।",
          detail: `धनेश ${this.t.PLANET_NAMES_HI[l2]} द्वादश भाव में`
        });
      }

      // ── 7. MULTIPLIERS (ASHTAKAVARGA, SHADBALA, DASHA) ──
      let savMultiplier = 1.0;
      let savStatus = "तटस्थ (SAV उपलब्ध नहीं)";
      let savH2 = null;
      let savH11 = null;
      let savH12 = null;

      if (this.calc.sav && Array.isArray(this.calc.sav) && this.calc.sav.length === 12) {
        savH2 = this.calc.sav[(this.asc_sign + 1) % 12];
        savH11 = this.calc.sav[(this.asc_sign + 10) % 12];
        savH12 = this.calc.sav[(this.asc_sign + 11) % 12];

        // 2nd house rule
        if (savH2 >= 32) savMultiplier *= 1.20;
        else if (savH2 < 24) savMultiplier *= 0.85;

        // 11th vs 12th rule
        if (savH11 - savH12 >= 4) savMultiplier *= 1.15;
        else if (savH11 < savH12) savMultiplier *= 0.80;

        savMultiplier = Number(Math.max(0.70, Math.min(1.30, savMultiplier)).toFixed(2));
        savStatus = `2nd:${savH2} | 11th:${savH11} vs 12th:${savH12}`;
      }

      let shadMultiplier = 1.0;
      let shadStatus = "मानक आधार (6.5/5.5)";
      if (this.calc.shadbala) {
        shadMultiplier = 1.10;
        shadStatus = "षड्बल समर्थित";
      }

      // Calculate Vimshottari Dasha for Dasha Multiplier & Peak Timeline
      const dashaInfo = this._calcVimshottariDasha();

      // ── 8. SCORING & TIER MAPPING ──
      const posPoints = triggered.reduce((acc, y) => acc + y.points, 0);
      const negPoints = deductions.reduce((acc, y) => acc + Math.abs(y.points), 0);
      const baseNet = Math.max(0, posPoints - negPoints);

      let finalScore = baseNet * savMultiplier * shadMultiplier * dashaInfo.dashaMultiplier;
      finalScore = Math.min(1000, Math.max(45, Math.round(finalScore)));

      const tier = NET_WORTH_TIERS.find(t => finalScore >= t.min && finalScore <= t.max) || NET_WORTH_TIERS[NET_WORTH_TIERS.length - 1];

      // Primary Wealth Generation Channel Strategy
      const channels = this._deriveWealthChannels(l2, l10, l11);

      return {
        capacity_index: finalScore,
        tier: tier.tier,
        tier_data: tier,
        components: {
          positive_points: posPoints,
          penalty_points: negPoints,
          sav_multiplier: { value: savMultiplier, status: savStatus, h2: savH2, h11: savH11, h12: savH12 },
          shadbala_multiplier: { value: shadMultiplier, status: shadStatus },
          dasha_factor: dashaInfo.dashaMultiplier
        },
        special_lagnas: {
          lagna: this.t.SIGN_NAMES[this.asc_sign],
          lagna_hi: this.t.SIGN_NAMES_HI[this.asc_sign],
          indu_lagna: this.t.SIGN_NAMES[this.induSign],
          indu_lagna_hi: this.t.SIGN_NAMES_HI[this.induSign],
          arudha_lagna: this.t.SIGN_NAMES[this.alSign],
          arudha_lagna_hi: this.t.SIGN_NAMES_HI[this.alSign],
          a11: this.t.SIGN_NAMES[this.a11Sign],
          a11_hi: this.t.SIGN_NAMES_HI[this.a11Sign],
          a7: this.t.SIGN_NAMES[this.a7Sign],
          a7_hi: this.t.SIGN_NAMES_HI[this.a7Sign],
          karakamsha: this.t.SIGN_NAMES[this.karakamshaSign],
          karakamsha_hi: this.t.SIGN_NAMES_HI[this.karakamshaSign]
        },
        chara_karakas: this.karakas,
        triggered_yogas: triggered,
        deduction_yogas: deductions,
        cancelled_yogas: cancelled,
        strategy: channels,
        timeline: dashaInfo.timeline,
        current_dasha: dashaInfo.currentDasha,
        flags: this.flags
      };
    }

    _deriveWealthChannels(l2, l10, l11) {
      const p10 = this.planets[l10];
      const p2 = this.planets[l2];

      const domainMap = {
        SU: "प्रशासन, राजकीय अनुबंध, ऊर्जा क्षेत्र, कॉर्पोरेट लीडरशिप व रॉयल्टी",
        MO: "तरल नकदी, जनसम्पर्क, आतिथ्य, डेयरी, ई-कॉमर्स व अंतरराष्ट्रीय व्यापार",
        MA: "अचल संपत्ति, रियल एस्टेट, रक्षा, भूमि विकास, कंस्ट्रक्शन व इंजीनियरिंग",
        ME: "सॉफ्टवेयर, बौद्धिक संपदा, डिजिटल प्लेटफॉर्म, ट्रेडिंग, मीडिया व कंसल्टेंसी",
        JU: "संस्थागत वित्त, शिक्षा, परामर्श, बैंकिंग, ट्रस्ट व बड़े निवेश फंड",
        VE: "लग्जरी उत्पाद, फैशन, ऑटोमोबाइल, मीडिया, कला व हॉस्पिटैलिटी",
        SA: "माइनिंग, इंफ्रास्ट्रक्चर, तेल, भारी उद्योग, लॉजिस्टिक्स व जनबल"
      };

      const primary = domainMap[l10] || domainMap[l2] || "व्यापार व स्वतंत्र उद्यम";
      const secondary = domainMap[l2] || domainMap[l11] || "स्थिर वित्तीय निवेश";

      return {
        engine: primary,
        vault: secondary,
        risks: "बिना उचित अनुबंध के किसी को व्यक्तिगत कर्ज या अत्यधिक लीवरेज वाले सट्टे से बचें।"
      };
    }

    _calcVimshottariDasha() {
      // Moon longitude gives nakshatra balance
      const moonArc = this.planets.MO.arc;
      const nakProgressArc = moonArc % ARCSEC_PER_NAKSHATRA;
      const nakFractionPassed = nakProgressArc / ARCSEC_PER_NAKSHATRA;
      const nakFractionRemaining = 1.0 - nakFractionPassed;

      const nakIndex = this.moonNak;
      const dashaLordIndex = nakIndex % 9;
      const firstLord = this.t.VIMSHOTTARI_LORDS[dashaLordIndex];
      const firstLordTotalYears = this.t.VIMSHOTTARI_YEARS[firstLord];
      const balanceYears = firstLordTotalYears * nakFractionRemaining;

      const bDate = this.calc.birthDetails;
      const birthYear = (bDate && bDate.year) ? bDate.year + (bDate.month - 1) / 12 + bDate.day / 365.25 : 1990.0;
      const currentYear = 2026.3;

      let elapsed = currentYear - birthYear;
      let currentDasha = firstLord;
      let dashaMultiplier = 1.0;

      const dashaOrder = this.t.VIMSHOTTARI_LORDS;
      let lordPointer = dashaLordIndex;

      // Find current active mahadasha
      if (elapsed < balanceYears) {
        currentDasha = firstLord;
      } else {
        elapsed -= balanceYears;
        lordPointer = (lordPointer + 1) % 9;
        while (elapsed > 0) {
          const l = dashaOrder[lordPointer];
          const y = this.t.VIMSHOTTARI_YEARS[l];
          if (elapsed < y) {
            currentDasha = l;
            break;
          }
          elapsed -= y;
          lordPointer = (lordPointer + 1) % 9;
        }
      }

      // Check if current dasha activates wealth
      const l2 = this.lordOfHouse(2);
      const l11 = this.lordOfHouse(11);
      const l9 = this.lordOfHouse(9);
      const induLord = this.lordOfSign(this.induSign);

      if ([l2, l11, l9, induLord].includes(currentDasha)) {
        dashaMultiplier = 1.15; // Dasha booster
      } else if ([this.lordOfHouse(6), this.lordOfHouse(8), this.lordOfHouse(12)].includes(currentDasha)) {
        dashaMultiplier = 0.85; // Dasha dampener
      }

      const pHi = this.t.PLANET_NAMES_HI;
      const nextLord = dashaOrder[(lordPointer + 1) % 9];
      const thirdLord = dashaOrder[(lordPointer + 2) % 9];

      const startY = Math.floor(currentYear);
      const timeline = [
        {
          period: `${startY} - ${startY + 3}`,
          dasha: `${pHi[currentDasha]} महादशा`,
          focus: "सिस्टम्स का निर्माण, वैश्विक डिजिटल पहुंच एवं एसेट क्रिएशन।"
        },
        {
          period: `${startY + 3} - ${startY + 6}`,
          dasha: `${pHi[nextLord]} काल`,
          focus: "संचित संपत्ति में भारी उछाल एवं नए विस्तार द्वारा उच्च श्रेणी में प्रवेश।"
        },
        {
          period: `${startY + 6} - ${startY + 9}`,
          dasha: `${pHi[thirdLord]} काल`,
          focus: "जीवन का सर्वोच्च वित्तीय लाभ, ब्रांड मोनेटाइजेशन एवं स्थायी संपत्ति सिद्धि।"
        }
      ];

      return {
        currentDasha: pHi[currentDasha] || currentDasha,
        dashaMultiplier,
        timeline
      };
    }
  }

  // =============================================================================
  // 6. ADAPTERS & PUBLIC EXPORTS
  // =============================================================================
  function analyzePatrikaChart(calcResult, options = {}) {
    if (!calcResult || !calcResult.planets) {
      throw new ChartInputError("Invalid Patrika calculation result provided");
    }
    const analyzer = new MasterDhanYogaAnalyzer(calcResult);
    return analyzer.evaluateAllYogas();
  }

  return {
    ARCSEC_PER_DEG,
    ARCSEC_PER_SIGN,
    ARCSEC_PER_CIRCLE,
    SIGN_COUNT,
    REFERENCE_TABLES,
    NET_WORTH_TIERS,
    ChartInputError,
    houseFrom,
    housePlus,
    angleToArcsec,
    analyzePatrikaChart
  };
});
