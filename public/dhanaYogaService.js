/**
 * DHANA / DARIDRA ANALYSIS ENGINE (JavaScript Port)
 * ─────────────────────────────────────────────────────────────
 * Read-only consumer of host Patrika engine.
 * 
 * Strict Shastric & Computational Principles:
 * - No chart constants in code. All classical tables, tunables, and rules in data structures.
 * - Exact Integer arc-seconds everywhere internally.
 * - Tri-state data evaluation: TRIGGERED (true), NOT_TRIGGERED (false), NOT_EVALUATED (absent data).
 * - Exact mathematical parity with classical Dhan/Daridra engine specification.
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
  // 1. GEOMETRY
  // =============================================================================
  const ARCSEC_PER_DEG = 3600;
  const ARCSEC_PER_SIGN = 30 * ARCSEC_PER_DEG;
  const ARCSEC_PER_CIRCLE = 360 * ARCSEC_PER_DEG;
  const SIGN_COUNT = 12;
  const NAVAMSHA_PER_SIGN = 9;
  const ARCSEC_PER_NAVAMSHA = Math.floor(ARCSEC_PER_SIGN / NAVAMSHA_PER_SIGN);

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

  function angleToArcsec(spec, policy, flags, label) {
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
      let sec;
      if (Number.isInteger(s)) {
        sec = s;
      } else {
        sec = Math.round(s);
        flags.push(`${label}: fractional arc-seconds rounded to nearest integer`);
      }
      if (sec < 0 || sec >= 60) {
        throw new ChartInputError(`${label}: invalid seconds ${s}`);
      }
      arc = d * ARCSEC_PER_DEG + m * 60 + sec;
    } else if (kind === 'deg') {
      if (policy === 'reject') {
        throw new ChartInputError(`${label}: float degrees rejected by policy`);
      }
      arc = Math.round(Number(val) * ARCSEC_PER_DEG);
      flags.push(`${label}: float degrees converted (error up to 0.5 arc-sec + input precision)`);
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
    NODE_DIGNITY: {},
    INDU_KALAS: { SU: 30, MO: 16, MA: 6, ME: 8, JU: 10, VE: 12, SA: 1 },
    NAVAMSHA_START_BY_ELEMENT: { 0: 0, 1: 9, 2: 6, 3: 3 },
    PUSHKARA_NAVAMSHA_BY_ELEMENT: { 0: [6, 8], 1: [2, 4], 2: [5, 7], 3: [0, 2] }
  };

  // =============================================================================
  // 3. CONFIG
  // =============================================================================
  const CONFIG = {
    float_input_policy: "accept_with_flag",
    required_zodiac: "sidereal",
    supported_house_systems: ["whole_sign"],
    mt_overrides_exaltation: true,
    chara_karaka_scheme: 7,
    karaka_labels: {
      7: ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"],
      8: ["AK", "AmK", "BK", "MK", "PiK", "PK", "GK", "DK"]
    },
    sav_total: 337,
    bav_totals: { SU: 48, MO: 49, MA: 39, ME: 54, JU: 56, VE: 52, SA: 39 },
    shadbala_input_unit: "rupa",
    shadbala_plausible_max_rupa: 20.0,
    shadbala_min_rupa: { SU: 6.5, MO: 6.0, MA: 5.0, ME: 7.0, JU: 6.5, VE: 5.5, SA: 5.0 },
    shadbala_weights: { JU: 0.6, VE: 0.4 },
    house_sets: {
      kendra: [1, 4, 7, 10],
      trikona: [1, 5, 9],
      kendra_trikona: [1, 4, 5, 7, 9, 10],
      upachaya: [3, 6, 10, 11],
      dusthana: [6, 8, 12]
    },
    groups: {
      physical: ["SU", "MO", "MA", "ME", "JU", "VE", "SA"],
      benefic_candidates: ["ME", "JU", "VE"],
      kemadruma_planets: ["MA", "ME", "JU", "VE", "SA"],
      mahapurusha_planets: ["MA", "ME", "JU", "VE", "SA"]
    },
    combustion_limits_deg: {
      MO: { direct: 12 },
      MA: { direct: 17 },
      ME: { direct: 14, retro: 12 },
      JU: { direct: 11 },
      VE: { direct: 10, retro: 8 },
      SA: { direct: 15 }
    },
    aspects: {
      base: [7],
      special: {
        MA: [4, 8],
        JU: [5, 9],
        SA: [3, 10],
        RA: [5, 9],
        KE: [5, 9]
      }
    },
    relation_priority: [
      "Parivartana", "Yuti", "Mutual_Drishti", "Jaimini_Drishti", "Trine", "Single_Drishti"
    ],
    benefic: {
      always: ["JU", "VE"],
      moon_requires_shukla: true,
      mercury_malefic_if_with: ["SU", "MA", "SA", "RA", "KE"]
    },
    neechabhanga: {
      min_conditions: 1,
      conditions: [
        { id: "DEBIL_SIGN_LORD_KENDRA", enabled: true },
        { id: "PLANET_EXALTED_IN_DEBIL_SIGN_KENDRA", enabled: true },
        { id: "EXALT_SIGN_LORD_KENDRA", enabled: true },
        { id: "EXALT_SIGN_LORD_ASPECTS", enabled: true },
        { id: "DEBIL_AND_EXALT_LORDS_MUTUAL_KENDRA", enabled: false },
        { id: "PUSHKARA_NAVAMSHA", enabled: false }
      ]
    },
    strength_modifiers: { combust: 0.5, debilitated_uncancelled: 0.5, dignity_bonus: {} },
    strength_applies_to: ["DHANA", "RAJA_DHANA"],
    sav_low_ratio: 0.85,
    multipliers: {
      sav: { gain_house: 11, loss_house: 12, pos_step: 0.025, pos_cap: 1.20, neg_step: 0.03, neg_floor: 0.80 },
      shadbala: { floor: 0.75, cap: 1.25 }
    },
    scoring: { scale_max: 1000, saturation_fraction: 0.5, calibrated: false },
    inr_display: {
      enabled: true,
      basis: "net-worth capacity (indicative), not income",
      calibrated: false,
      disclaimer: "Indicative classical-style band from an uncalibrated score; not a prediction or guarantee."
    },
    bands: [
      { tier: 1,  upper: 100,  label: "Alpa-sanchaya / Low retention",
        sanskrit: "Alpa-Dhana / Nirvaha",   inr: "₹0 – ₹10 lakh" },
      { tier: 2,  upper: 200,  label: "Fragile accumulation",
        sanskrit: "Sadharana Lakhpati",     inr: "₹10 lakh – ₹50 lakh" },
      { tier: 3,  upper: 300,  label: "Modest, steady",
        sanskrit: "Madhyama Lakhpati",      inr: "₹50 lakh – ₹1.5 crore" },
      { tier: 4,  upper: 400,  label: "Reliable base",
        sanskrit: "Varishtha Lakhpati",     inr: "₹1.5 crore – ₹5 crore" },
      { tier: 5,  upper: 500,  label: "Good capacity",
        sanskrit: "Koti-Pati",              inr: "₹5 crore – ₹15 crore" },
      { tier: 6,  upper: 600,  label: "Strong capacity",
        sanskrit: "Bahu-Kotipati",          inr: "₹15 crore – ₹50 crore" },
      { tier: 7,  upper: 700,  label: "Very strong capacity",
        sanskrit: "Maha-Kotipati",          inr: "₹50 crore – ₹150 crore" },
      { tier: 8,  upper: 800,  label: "Exceptional capacity",
        sanskrit: "Shata-Kotipati",         inr: "₹150 crore – ₹500 crore" },
      { tier: 9,  upper: 900,  label: "Rare capacity",
        sanskrit: "Arabpati",               inr: "₹500 crore – ₹2,500 crore (5 – 25 arab)" },
      { tier: 10, upper: 1000, label: "Highest indicated capacity",
        sanskrit: "Maha-Arabpati",          inr: "₹2,500 crore+ (25 arab+)" }
    ],
    unknown_policy: "neutral_and_flag"
  };

  // =============================================================================
  // 4. YOGA RULE REGISTRY
  // =============================================================================
  function _src(text, school = "") {
    return { text, ref: null, verified: false, school };
  }

  const _REL3 = ["Parivartana", "Yuti", "Mutual_Drishti"];
  const _SAME_PLACED = {
    all: [
      { p: "same_planet", a: "{A}", b: "{B}" },
      { p: "in_houses", sel: "{A}", houses: "set:kendra_trikona", frm: "lagna" }
    ],
    meta: { relation: "Same_Lord_Placed" }
  };

  function _lordPairRule(rid, name, category, ha, hb, values, text) {
    const a = `lord:${ha}`;
    const b = `lord:${hb}`;
    const same = JSON.parse(JSON.stringify(_SAME_PLACED).replace(/\{A\}/g, a).replace(/\{B\}/g, b));
    return {
      id: rid,
      name: name,
      category: category,
      weight: { by: "relation", values: values, default: 0 },
      when: { any: [{ p: "related", a: a, b: b, types: _REL3 }, same] },
      strength_planets: [a, b],
      source: _src(text)
    };
  }

  const RULES = [
    _lordPairRule("DH_L2_L11", "Dhanesh-Labhesh sambandha", "DHANA", 2, 11,
                  { Parivartana: 70, Yuti: 55, Mutual_Drishti: 45, Same_Lord_Placed: 60 }, "BPHS dhana yogas"),
    _lordPairRule("DH_L1_L2", "Lagnesh-Dhanesh sambandha", "DHANA", 1, 2,
                  { Parivartana: 55, Yuti: 50, Mutual_Drishti: 40, Same_Lord_Placed: 45 }, "BPHS dhana yogas"),
    _lordPairRule("DH_L5_L11", "Putresh-Labhesh sambandha", "DHANA", 5, 11,
                  { Parivartana: 50, Yuti: 45, Mutual_Drishti: 35, Same_Lord_Placed: 40 }, "BPHS dhana yogas"),
    _lordPairRule("DH_L9_L2", "Bhagyesh-Dhanesh sambandha", "DHANA", 9, 2,
                  { Parivartana: 55, Yuti: 50, Mutual_Drishti: 40, Same_Lord_Placed: 45 }, "BPHS dhana yogas"),
    _lordPairRule("RJ_L9_L10", "Dharma-Karmadhipati sambandha", "RAJA_DHANA", 9, 10,
                  { Parivartana: 60, Yuti: 55, Mutual_Drishti: 45, Same_Lord_Placed: 50 }, "BPHS / Laghu Parashari"),
    {
      id: "PD_VASUMATI_FULL", name: "Vasumati (full)", category: "DHANA", weight: 80,
      when: {
        any: [
          { p: "count_in_houses", group: "benefic_candidates", houses: "set:upachaya", frm: "lagna", min: 3, benefic_only: true },
          { p: "count_in_houses", group: "benefic_candidates", houses: "set:upachaya", frm: "moon", min: 3, benefic_only: true }
        ]
      },
      source: _src("Phaladeepika / Brihat Jataka")
    },
    {
      id: "PD_VASUMATI_PARTIAL", name: "Vasumati (partial)", category: "DHANA", weight: 45,
      when: {
        all: [
          { not: { rule_triggered: "PD_VASUMATI_FULL" } },
          {
            any: [
              { p: "count_in_houses", group: "benefic_candidates", houses: "set:upachaya", frm: "lagna", min: 2, benefic_only: true },
              { p: "count_in_houses", group: "benefic_candidates", houses: "set:upachaya", frm: "moon", min: 2, benefic_only: true }
            ]
          }
        ]
      },
      source: _src("Phaladeepika", "partial form is school-dependent")
    },
    {
      id: "BJ_CHANDRADHI_FULL", name: "Chandradhi (full)", category: "DHANA", weight: 85,
      when: { p: "count_in_houses", group: "benefic_candidates", houses: [6, 7, 8], frm: "moon", min: 3, benefic_only: true },
      source: _src("Brihat Jataka / Phaladeepika")
    },
    {
      id: "BJ_CHANDRADHI_PARTIAL", name: "Chandradhi (partial)", category: "DHANA", weight: 50,
      when: {
        all: [
          { not: { rule_triggered: "BJ_CHANDRADHI_FULL" } },
          { p: "count_in_houses", group: "benefic_candidates", houses: [6, 7, 8], frm: "moon", min: 2, benefic_only: true }
        ]
      },
      source: _src("Brihat Jataka", "partial form is school-dependent")
    },
    {
      id: "BPHS_INDU_EXALTED", name: "Exalted planet in Indu Lagna", category: "DHANA", weight: 95,
      when: { p: "count_in_houses", group: "physical", houses: [1], frm: "indu", min: 1, dignity: ["Exalted"] },
      source: _src("BPHS (Indu Lagna)")
    },
    {
      id: "BPHS_INDU_BENEFIC", name: "Benefic in Indu Lagna", category: "DHANA", weight: 60,
      when: {
        all: [
          { not: { rule_triggered: "BPHS_INDU_EXALTED" } },
          { p: "count_in_houses", group: "physical", houses: [1], frm: "indu", min: 1, benefic_only: true }
        ]
      },
      source: _src("BPHS (Indu Lagna)")
    },
    {
      id: "JM_AK_AMK", name: "AK-AmK connection", category: "RAJA_DHANA",
      weight: { by: "relation", values: { Parivartana: 65, Yuti: 65, Jaimini_Drishti: 45 }, default: 0 },
      when: { p: "related", a: "karaka:AK", b: "karaka:AmK", types: ["Parivartana", "Yuti", "Jaimini_Drishti"] },
      strength_planets: ["karaka:AK", "karaka:AmK"],
      source: _src("Jaimini Upadesha Sutras")
    },
    {
      id: "JM_AL_11", name: "Planets in 11th from Arudha Lagna", category: "DHANA",
      weight: { per: "count", unit: 30, cap: 60 },
      when: { p: "count_in_houses", group: "physical", houses: [11], frm: "al", min: 1 },
      source: _src("Jaimini Upadesha Sutras")
    },
    {
      id: "SC_VIPARITA", name: "Viparita (trik lords in trik)", category: "DHANA",
      weight: { per: "count", unit: 25, cap: 75 },
      when: { p: "count_lords_in_houses", lords: [6, 8, 12], houses: "set:dusthana", frm: "lagna", min: 1 },
      source: _src("Sarvartha Chintamani / BPHS", "single-lord form is traditional; strictness varies")
    },
    {
      id: "NB_RAJA", name: "Neechabhanga Rajayoga ({P})", category: "RAJA_DHANA", weight: 55,
      for_each: "physical", when: { p: "neechabhanga", sel: "$P" },
      strength_planets: ["$P"], source: _src("Phaladeepika", "condition list is school-dependent")
    },
    {
      id: "MP_YOGA", name: "Pancha-Mahapurusha ({P})", category: "RAJA_DHANA", weight: 45,
      for_each: "mahapurusha_planets",
      when: {
        all: [
          { p: "in_houses", sel: "$P", houses: "set:kendra", frm: "lagna" },
          { p: "dignity_in", sel: "$P", values: ["Exalted", "Moolatrikona", "Own"] }
        ]
      },
      strength_planets: ["$P"], source: _src("Brihat Jataka / BPHS")
    },
    {
      id: "BPHS_GAJAKESARI", name: "Gajakesari", category: "DHANA", weight: 30,
      when: { p: "in_houses", sel: "JU", houses: "set:kendra", frm: "moon" },
      strength_planets: ["JU"], source: _src("BPHS / Jataka Parijata")
    },
    {
      id: "MN_CHANDRA_MANGALA", name: "Chandra-Mangala (conjunction)", category: "DHANA",
      weight: 35, when: { p: "related", a: "MO", b: "MA", types: ["Yuti"] },
      strength_planets: ["MO", "MA"], source: _src("Manasagari / classical lists")
    },
    // ---- Daridra / leakage (negative weights; cancel_when gives a documented bhanga)
    {
      id: "DR_KEMADRUMA", name: "Kemadruma", category: "DARIDRA", weight: -65,
      when: { p: "count_in_houses", group: "kemadruma_planets", houses: [2, 12], frm: "moon", max: 0 },
      cancel_when: {
        any: [
          { p: "count_in_houses", group: "kemadruma_planets", houses: "set:kendra", frm: "moon", min: 1 },
          { p: "count_in_houses", group: "kemadruma_planets", houses: "set:kendra", frm: "lagna", min: 1 }
        ]
      },
      cancel_factor: 0.0, source: _src("Brihat Jataka / Phaladeepika")
    },
    {
      id: "DR_L11_DUSTHANA", name: "Labhesh in dusthana", category: "DARIDRA", weight: -30,
      when: { p: "in_houses", sel: "lord:11", houses: "set:dusthana", frm: "lagna" },
      source: _src("BPHS")
    },
    {
      id: "DR_L11_DUSTHANA_AFFLICTED", name: "Labhesh in dusthana and afflicted", category: "DARIDRA",
      weight: -20,
      when: {
        all: [
          { p: "in_houses", sel: "lord:11", houses: "set:dusthana", frm: "lagna" },
          { p: "afflicted", sel: "lord:11" }
        ]
      },
      source: _src("BPHS")
    },
    {
      id: "DR_L2_IN_12", name: "Dhanesh in 12th", category: "DARIDRA", weight: -40,
      when: { p: "in_houses", sel: "lord:2", houses: [12], frm: "lagna" }, source: _src("Manasagari")
    },
    {
      id: "DR_SAV_H2_LOW", name: "Low SAV in 2nd house", category: "DARIDRA", weight: -35,
      when: { p: "sav_house_low", house: 2 }, source: _src("BPHS Ashtakavarga")
    }
  ];

  // =============================================================================
  // 5. HOST ADAPTER
  // =============================================================================
  const HOST_MAPPING = {
    aliases: {
      Surya: "SU", Sun: "SU", Chandra: "MO", Moon: "MO",
      Mangal: "MA", Mangala: "MA", Mars: "MA", Budh: "ME", Budha: "ME", Mercury: "ME",
      Guru: "JU", Jupiter: "JU", Shukra: "VE", Venus: "VE",
      Shani: "SA", Saturn: "SA", Rahu: "RA", Ketu: "KE"
    },
    ascendant: { path: ["ascendant_degree"], lon_key: null, unit: "deg" },
    planets: { path: ["planets"], lon_key: "degree", unit: "deg", retro_key: "is_retrograde" },
    sav: { path: ["ashtakvarga", "sav"], indexing: "sign" },
    bav: { path: ["ashtakvarga", "bav"], indexing: "sign" },
    shadbala: { path: ["shadbala"], value_key: null },
    zodiac: { path: ["zodiac"], default: "sidereal" },
    house_system: { path: ["house_system"], default: "whole_sign" }
  };

  function _dig(d, path) {
    let cur = d;
    for (let i = 0; i < path.length; i++) {
      const k = path[i];
      if (!cur || typeof cur !== 'object' || !(k in cur)) return null;
      cur = cur[k];
    }
    return cur;
  }

  function _spec(val, unit) {
    return unit === "deg" ? { deg: val } : { arcsec: val };
  }

  function adaptHostPayload(host, mapping = HOST_MAPPING) {
    const raw = { flags: [] };
    const am = mapping.ascendant;
    let asc = _dig(host, am.path);
    if (asc && typeof asc === 'object' && am.lon_key) {
      asc = asc[am.lon_key];
    }
    raw.ascendant = asc !== null && asc !== undefined ? _spec(asc, am.unit) : null;

    const pm = mapping.planets;
    const planets = {};
    const hostPlanets = _dig(host, pm.path) || {};
    for (const hname in hostPlanets) {
      const val = hostPlanets[hname];
      const pid = mapping.aliases[hname];
      if (!pid) {
        raw.flags.push(`unmapped host planet name ignored: ${hname}`);
        continue;
      }
      const lon = val && typeof val === 'object' ? val[pm.lon_key] : val;
      const retro = val && typeof val === 'object' ? val[pm.retro_key] : null;
      planets[pid] = {
        lon: lon !== null && lon !== undefined ? _spec(lon, pm.unit) : null,
        retro: retro !== undefined ? retro : null
      };
    }
    raw.planets = planets;

    function _houseToSign(arr, ascSign) {
      const out = new Array(SIGN_COUNT).fill(0);
      for (let h = 0; h < arr.length; h++) {
        out[(ascSign + h) % SIGN_COUNT] = arr[h];
      }
      return out;
    }

    raw._sav_host = _dig(host, mapping.sav.path) || host.sav || null;
    raw._sav_indexing = mapping.sav.indexing;
    raw._bav_host = _dig(host, mapping.bav.path) || host.bav || null;
    raw._bav_indexing = mapping.bav.indexing;

    const sb = _dig(host, mapping.shadbala.path) || host.shadbala || null;
    const vk = mapping.shadbala.value_key;
    raw.shadbala = sb === null ? null : {};
    if (sb !== null) {
      for (const k in sb) {
        const v = sb[k];
        const pid = mapping.aliases[k] || k;
        raw.shadbala[pid] = (v && typeof v === 'object' && vk) ? v[vk] : v;
      }
    }

    raw.zodiac = _dig(host, mapping.zodiac.path) || host.zodiac || mapping.zodiac.default;
    raw.house_system = _dig(host, mapping.house_system.path) || host.house_system || mapping.house_system.default;
    raw._house_to_sign = _houseToSign;
    return raw;
  }

  // =============================================================================
  // 6. VALIDATION + CANONICALISATION
  // =============================================================================
  function prepareChart(raw, cfg = CONFIG) {
    const flags = [...(raw.flags || [])];
    if (raw.zodiac !== cfg.required_zodiac) {
      throw new ChartInputError(`zodiac must be explicitly '${cfg.required_zodiac}', got ${JSON.stringify(raw.zodiac)}`);
    }
    if (!cfg.supported_house_systems.includes(raw.house_system)) {
      throw new ChartInputError(`unsupported/absent house_system: ${JSON.stringify(raw.house_system)}`);
    }
    if (raw.ascendant === null || raw.ascendant === undefined) {
      throw new ChartInputError("ascendant missing");
    }

    const pol = cfg.float_input_policy;
    const asc = angleToArcsec(raw.ascendant, pol, flags, "ascendant");
    const asc_sign = Math.floor(asc / ARCSEC_PER_SIGN);

    const planets = {};
    const rawPlanets = raw.planets || {};
    for (const pid in rawPlanets) {
      const v = rawPlanets[pid];
      if (v.lon === null || v.lon === undefined) {
        throw new ChartInputError(`${pid}: longitude missing`);
      }
      const retro = v.retro;
      if (retro !== null && retro !== undefined && typeof retro !== 'boolean') {
        throw new ChartInputError(`${pid}: retro must be bool or None`);
      }
      planets[pid] = {
        arc: angleToArcsec(v.lon, pol, flags, pid),
        retro: retro !== undefined ? retro : null
      };
    }

    for (let i = 0; i < cfg.groups.physical.length; i++) {
      const pid = cfg.groups.physical[i];
      if (!(pid in planets)) {
        throw new ChartInputError(`required planet missing: ${pid}`);
      }
    }

    for (let i = 0; i < cfg.groups.physical.length; i++) {
      const pid = cfg.groups.physical[i];
      if (pid in cfg.combustion_limits_deg && planets[pid].retro === null && "retro" in cfg.combustion_limits_deg[pid]) {
        flags.push(`${pid}: retrograde status unknown; combustion may be undetermined`);
      }
    }

    function _toSignIndex(arr, indexing) {
      if (indexing === "sign") return [...arr];
      return raw._house_to_sign(arr, asc_sign);
    }

    let sav = null;
    if (raw.sav !== undefined && raw.sav !== null) {
      sav = raw.sav;
    } else if (raw._sav_host !== undefined && raw._sav_host !== null) {
      sav = raw._sav_host;
    }

    if (sav !== null) {
      if (!Array.isArray(sav) || sav.length !== SIGN_COUNT || !sav.every(x => Number.isInteger(x) && x >= 0)) {
        throw new ChartInputError("SAV must be 12 non-negative ints");
      }
      const total = sav.reduce((a, b) => a + b, 0);
      if (total !== cfg.sav_total) {
        throw new ChartInputError(`SAV total ${total} != ${cfg.sav_total}`);
      }
      sav = _toSignIndex(sav, raw._sav_indexing || "sign");
    }

    let bav = null;
    const bsrc = (raw.bav !== undefined && raw.bav !== null) ? raw.bav : raw._bav_host;
    if (bsrc !== undefined && bsrc !== null) {
      bav = {};
      for (const k in bsrc) {
        const arr = bsrc[k];
        if (!Array.isArray(arr) || arr.length !== SIGN_COUNT) {
          throw new ChartInputError(`BAV ${k}: need 12 entries`);
        }
        const btotal = arr.reduce((a, b) => a + b, 0);
        if (k in cfg.bav_totals && btotal !== cfg.bav_totals[k]) {
          throw new ChartInputError(`BAV ${k} total ${btotal} != ${cfg.bav_totals[k]}`);
        }
        bav[k] = _toSignIndex(arr, raw._bav_indexing || "sign");
      }
      if (sav !== null && Object.keys(cfg.bav_totals).every(p => p in bav)) {
        for (let s = 0; s < SIGN_COUNT; s++) {
          const sumBav = Object.keys(cfg.bav_totals).reduce((acc, p) => acc + bav[p][s], 0);
          if (sumBav !== sav[s]) {
            throw new ChartInputError(`SAV[${s}] != sum of BAVs`);
          }
        }
      }
    }

    let shad = null;
    if (raw.shadbala !== undefined && raw.shadbala !== null) {
      shad = {};
      for (const k in raw.shadbala) {
        const v = raw.shadbala[k];
        if (typeof v === 'boolean' || typeof v !== 'number' || v <= 0) {
          throw new ChartInputError(`shadbala ${k}: invalid value ${JSON.stringify(v)}`);
        }
        const r = cfg.shadbala_input_unit === "virupa" ? v / 60.0 : Number(v);
        if (r > cfg.shadbala_plausible_max_rupa) {
          throw new ChartInputError(`shadbala ${k}: ${r} rupa implausible; check unit`);
        }
        shad[k] = r;
      }
    }

    return { flags, asc, planets, sav, bav, shadbala: shad };
  }

  // =============================================================================
  // 7. CHART CONTEXT
  // =============================================================================
  class PlanetFact {
    constructor(pid, arc, sign, pos, house, retro, combust, dignity, nav_sign, pushkara) {
      this.pid = pid;
      this.arc = arc;
      this.sign = sign;
      this.pos = pos;
      this.house = house;
      this.retro = retro;
      this.combust = combust;
      this.dignity = dignity;
      this.nav_sign = nav_sign;
      this.pushkara = pushkara;
    }
  }

  class ChartContext {
    constructor(canon, cfg, tables) {
      this.cfg = cfg;
      this.t = tables;
      this.flags = [...canon.flags];
      this.asc = canon.asc;
      this.asc_sign = Math.floor(this.asc / ARCSEC_PER_SIGN);
      this.sav = canon.sav;
      this.bav = canon.bav;
      this.shadbala = canon.shadbala;

      const sun = canon.planets.SU.arc;
      const moon = canon.planets.MO.arc;
      this.is_shukla = ((moon - sun) % ARCSEC_PER_CIRCLE + ARCSEC_PER_CIRCLE) % ARCSEC_PER_CIRCLE < Math.floor(ARCSEC_PER_CIRCLE / 2);

      this.planets = {};
      for (const pid in canon.planets) {
        const v = canon.planets[pid];
        const arc = v.arc;
        const sign = Math.floor(arc / ARCSEC_PER_SIGN);
        const pos = arc % ARCSEC_PER_SIGN;
        const elem = sign % 4;
        const nav_idx = Math.floor(pos / ARCSEC_PER_NAVAMSHA);
        const nav_start = this.t.NAVAMSHA_START_BY_ELEMENT[elem];
        const pushkaraList = this.t.PUSHKARA_NAVAMSHA_BY_ELEMENT[elem] || [];

        this.planets[pid] = new PlanetFact(
          pid,
          arc,
          sign,
          pos,
          houseFrom(this.asc_sign, sign),
          v.retro,
          this._combustion(pid, arc, sun, v.retro),
          this._dignity(pid, sign, pos),
          (nav_start + nav_idx) % SIGN_COUNT,
          pushkaraList.includes(nav_idx)
        );
      }

      if (!("RA" in this.planets) || !("KE" in this.planets)) {
        this.flags.push("nodes absent: node-dependent checks (e.g. Mercury affliction) ignore them");
      }

      this.indu_sign = this._induLagna();
      this.al_sign = this.arudhaOfHouse(1);
      const karakaRes = this._charaKarakas();
      this.karakas = karakaRes.out;
      for (let i = 0; i < karakaRes.amb.length; i++) {
        this.flags.push(`karaka ${karakaRes.amb[i]} ambiguous (equal degrees); rules using it not evaluated`);
      }
      this._nb_cache = {};
    }

    lordOfSign(sign) {
      return this.t.SIGN_LORDS[((sign % SIGN_COUNT) + SIGN_COUNT) % SIGN_COUNT];
    }

    lordOfHouse(h) {
      return this.lordOfSign(this.asc_sign + h - 1);
    }

    houseSav(h) {
      return this.sav === null ? null : this.sav[((this.asc_sign + h - 1) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT];
    }

    refSign(frm) {
      if (frm === "lagna") return this.asc_sign;
      if (frm === "moon") return this.planets.MO.sign;
      if (frm === "al") return this.al_sign;
      if (frm === "indu") return this.indu_sign;
      throw new Error(`Unknown refSign frame: ${frm}`);
    }

    _dignity(pid, sign, pos) {
      const t = this.t;
      if (pid === "RA" || pid === "KE") {
        const nd = t.NODE_DIGNITY[pid];
        if (!nd) return "Unassigned";
        return sign === nd.exalted ? "Exalted" : sign === nd.debilitated ? "Debilitated" : "Neutral";
      }
      const ex_sign = t.EXALTATION[pid][0];
      const deb_sign = (ex_sign + 6) % SIGN_COUNT;
      const [mt_sign, mt_s, mt_e] = t.MOOLATRIKONA[pid];
      const in_mt = sign === mt_sign && pos >= mt_s && pos < mt_e;

      if (this.cfg.mt_overrides_exaltation && in_mt) {
        return "Moolatrikona";
      }
      if (sign === ex_sign) return "Exalted";
      if (sign === deb_sign) return "Debilitated";
      if (in_mt) return "Moolatrikona";
      if (this.lordOfSign(sign) === pid) return "Own";
      return "Neutral";
    }

    _combustion(pid, arc, sun_arc, retro) {
      const lim = this.cfg.combustion_limits_deg[pid];
      if (!lim) return false;
      const diff = Math.abs(arc - sun_arc);
      const dist = Math.min(diff, ARCSEC_PER_CIRCLE - diff);
      const direct = lim.direct * ARCSEC_PER_DEG;
      const rlim = (lim.retro !== undefined ? lim.retro : lim.direct) * ARCSEC_PER_DEG;

      if (retro === true) return dist <= rlim;
      if (retro === false) return dist <= direct;
      const lo = Math.min(direct, rlim);
      const hi = Math.max(direct, rlim);
      if (dist <= lo) return true;
      if (dist > hi) return false;
      return null;
    }

    isBenefic(pid) {
      const b = this.cfg.benefic;
      if (b.always.includes(pid)) return true;
      if (pid === "MO") return b.moon_requires_shukla ? this.is_shukla : true;
      if (pid === "ME") {
        const meSign = this.planets.ME.sign;
        const withMalefic = b.mercury_malefic_if_with.some(m => m in this.planets && this.planets[m].sign === meSign);
        return !withMalefic;
      }
      return false;
    }

    aspectHouses(src) {
      const a = this.cfg.aspects;
      const h = this.planets[src].house;
      const special = a.special[src] || [];
      const offsets = [...a.base, ...special];
      return offsets.map(k => housePlus(h, k));
    }

    aspectsPlanet(src, tgt) {
      if (src === tgt) return false;
      return this.aspectHouses(src).includes(this.planets[tgt].house);
    }

    static jaiminiAspects(src, tgt) {
      if (src === tgt) return false;
      const ms = src % 3; // 0 movable, 1 fixed, 2 dual
      const mt = tgt % 3;
      if (ms === 2 && mt === 2) return true;
      if (ms === 0 && mt === 1) return tgt !== (src + 1) % SIGN_COUNT;
      if (ms === 1 && mt === 0) return tgt !== ((src - 1) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      return false;
    }

    relations(a, b) {
      if (a === b) return new Set();
      const pa = this.planets[a];
      const pb = this.planets[b];
      const r = new Set();
      if (pa.sign === pb.sign) {
        r.add("Yuti");
      }
      if (pa.sign !== pb.sign && this.lordOfSign(pa.sign) === b && this.lordOfSign(pb.sign) === a) {
        r.add("Parivartana");
      }
      const ab = this.aspectsPlanet(a, b);
      const ba = this.aspectsPlanet(b, a);
      if (ab && ba) {
        r.add("Mutual_Drishti");
      } else if (ab || ba) {
        r.add("Single_Drishti");
      }
      if (ChartContext.jaiminiAspects(pa.sign, pb.sign)) {
        r.add("Jaimini_Drishti");
      }
      const hDiff = ((pb.house - pa.house) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      if (hDiff === 4 || hDiff === 8) {
        r.add("Trine");
      }
      return r;
    }

    arudhaOfHouse(h) {
      const hs = ((this.asc_sign + h - 1) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      const ls = this.planets[this.lordOfSign(hs)].sign;
      const d = ((ls - hs) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      let a = (ls + d) % SIGN_COUNT;
      const aDiff = ((a - hs) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
      if (aDiff === 0 || aDiff === 6) {
        a = (a + 9) % SIGN_COUNT;
      }
      return a;
    }

    _induLagna() {
      const k = this.t.INDU_KALAS;
      const moonSign = this.planets.MO.sign;
      const asc9thLord = this.lordOfSign(this.asc_sign + 8);
      const moon9thLord = this.lordOfSign(moonSign + 8);
      const total = k[asc9thLord] + k[moon9thLord];
      const rem = total % SIGN_COUNT || SIGN_COUNT;
      return ((moonSign + rem - 1) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
    }

    _charaKarakas() {
      const scheme = this.cfg.chara_karaka_scheme;
      const labels = this.cfg.karaka_labels[scheme];
      const items = this.cfg.groups.physical.map(p => ({ pos: this.planets[p].pos, pid: p }));
      if (scheme === 8 && "RA" in this.planets) {
        items.push({ pos: ARCSEC_PER_SIGN - this.planets.RA.pos, pid: "RA" });
      }
      items.sort((a, b) => b.pos - a.pos);

      const out = {};
      const amb = [];
      for (let i = 0; i < items.length; i++) {
        const tied = (i > 0 && items[i - 1].pos === items[i].pos) ||
                     (i + 1 < items.length && items[i + 1].pos === items[i].pos);
        if (i < labels.length) {
          if (tied) {
            amb.push(labels[i]);
          } else {
            out[labels[i]] = items[i].pid;
          }
        }
      }
      return { out, amb };
    }

    neechabhanga(pid) {
      if (pid in this._nb_cache) return this._nb_cache[pid];
      const p = this.planets[pid];
      const hits = [];

      if (p.dignity === "Debilitated" && pid in this.t.EXALTATION) {
        const ks = this.cfg.house_sets.kendra;
        const self = this;

        function kendra(q) {
          if (!q || !(q in self.planets)) return false;
          const f = self.planets[q];
          return ks.includes(f.house) || ks.includes(houseFrom(self.planets.MO.sign, f.sign));
        }

        const ex_sign = this.t.EXALTATION[pid][0];
        const deb_lord = this.lordOfSign(p.sign);
        const ex_lord = this.lordOfSign(ex_sign);

        for (let i = 0; i < this.cfg.neechabhanga.conditions.length; i++) {
          const c = this.cfg.neechabhanga.conditions[i];
          if (!c.enabled) continue;
          const cid = c.id;

          if (cid === "DEBIL_SIGN_LORD_KENDRA" && kendra(deb_lord)) {
            hits.push(cid);
          } else if (cid === "PLANET_EXALTED_IN_DEBIL_SIGN_KENDRA") {
            const hasExaltedInDebilSign = Object.keys(this.t.EXALTATION).some(q => {
              const [s] = self.t.EXALTATION[q];
              return s === p.sign && q !== pid && kendra(q);
            });
            if (hasExaltedInDebilSign) hits.push(cid);
          } else if (cid === "EXALT_SIGN_LORD_KENDRA" && kendra(ex_lord)) {
            hits.push(cid);
          } else if (cid === "EXALT_SIGN_LORD_ASPECTS" && ex_lord in this.planets && this.aspectsPlanet(ex_lord, pid)) {
            hits.push(cid);
          } else if (cid === "DEBIL_AND_EXALT_LORDS_MUTUAL_KENDRA" && deb_lord in this.planets && ex_lord in this.planets) {
            const diff = ((this.planets[ex_lord].house - this.planets[deb_lord].house) % SIGN_COUNT + SIGN_COUNT) % SIGN_COUNT;
            if (diff === 3 || diff === 6 || diff === 9) {
              hits.push(cid);
            }
          } else if (cid === "PUSHKARA_NAVAMSHA" && p.pushkara) {
            hits.push(cid);
          }
        }
      }
      this._nb_cache[pid] = hits;
      return hits;
    }

    neechabhangaOk(pid) {
      return this.neechabhanga(pid).length >= this.cfg.neechabhanga.min_conditions;
    }

    strengthFactor(pid, notes) {
      const sm = this.cfg.strength_modifiers;
      const p = this.planets[pid];
      let f = 1.0;
      if (p.combust === true) {
        f *= sm.combust;
      } else if (p.combust === null) {
        notes.push(`${pid}: combustion undetermined (retro unknown); no reduction applied`);
      }
      if (p.dignity === "Debilitated" && !this.neechabhangaOk(pid)) {
        f *= sm.debilitated_uncancelled;
      }
      const bonus = (sm.dignity_bonus && sm.dignity_bonus[p.dignity]) || 1.0;
      return f * bonus;
    }

    resolve(sel, env) {
      if (sel.startsWith("$")) {
        return env[sel.slice(1)] || null;
      }
      if (sel.startsWith("lord:")) {
        return this.lordOfHouse(parseInt(sel.slice(5), 10));
      }
      if (sel.startsWith("karaka:")) {
        return this.karakas[sel.slice(7)] || null;
      }
      return sel in this.planets ? sel : null;
    }

    houses(spec) {
      if (typeof spec === 'string' && spec.startsWith("set:")) {
        return [...this.cfg.house_sets[spec.slice(4)]];
      }
      return Array.isArray(spec) ? [...spec] : [spec];
    }

    group(spec) {
      if (typeof spec === 'string' && spec in this.cfg.groups) {
        return [...this.cfg.groups[spec]];
      }
      return Array.isArray(spec) ? [...spec] : [spec];
    }
  }

  // =============================================================================
  // 8. RULE EVALUATION
  // =============================================================================
  class Outcome {
    constructor(value, detail = "", meta = {}) {
      this.value = value;
      this.detail = detail;
      this.meta = meta;
    }
  }

  function _p_related(ctx, env, c) {
    const a = ctx.resolve(c.a, env);
    const b = ctx.resolve(c.b, env);
    if (!a || !b) return new Outcome(null, "participant unavailable");
    if (a === b) {
      return new Outcome(false, `${a} is both participants (no self-relation)`, { same_planet: true });
    }
    const rels = ctx.relations(a, b);
    const hit = c.types.filter(t => rels.has(t));
    if (hit.length === 0) {
      return new Outcome(false, `${a}-${b}: no qualifying relation`);
    }
    const best = ctx.cfg.relation_priority.find(t => hit.includes(t)) || hit[0];
    return new Outcome(true, `${a}-${b}: ${best}`, { relation: best });
  }

  function _p_same_planet(ctx, env, c) {
    const a = ctx.resolve(c.a, env);
    const b = ctx.resolve(c.b, env);
    if (!a || !b) return new Outcome(null, "participant unavailable");
    return new Outcome(a === b, a === b ? `same planet ${a}` : "different planets");
  }

  function _p_in_houses(ctx, env, c) {
    const pid = ctx.resolve(c.sel, env);
    if (!pid) return new Outcome(null, "planet unavailable");
    const frm = c.frm || "lagna";
    const h = houseFrom(ctx.refSign(frm), ctx.planets[pid].sign);
    return new Outcome(ctx.houses(c.houses).includes(h), `${pid} in house ${h} from ${frm}`);
  }

  function _p_dignity_in(ctx, env, c) {
    const pid = ctx.resolve(c.sel, env);
    if (!pid) return new Outcome(null, "planet unavailable");
    const d = ctx.planets[pid].dignity;
    return new Outcome(c.values.includes(d), `${pid} dignity ${d}`);
  }

  function _p_afflicted(ctx, env, c) {
    const pid = ctx.resolve(c.sel, env);
    if (!pid) return new Outcome(null, "planet unavailable");
    const p = ctx.planets[pid];
    const deb = p.dignity === "Debilitated" && !ctx.neechabhangaOk(pid);
    if (p.combust === true || deb) {
      return new Outcome(true, `${pid} afflicted (combust=${p.combust}, uncancelled_debil=${deb})`);
    }
    return new Outcome(p.combust === null ? null : false, `${pid} not afflicted`);
  }

  function _p_count_in_houses(ctx, env, c) {
    const frm = c.frm || "lagna";
    const ref = ctx.refSign(frm);
    const hs = ctx.houses(c.houses);
    const hits = [];

    const pids = ctx.group(c.group);
    for (let i = 0; i < pids.length; i++) {
      const pid = pids[i];
      const p = ctx.planets[pid];
      if (!p || !hs.includes(houseFrom(ref, p.sign))) continue;
      if (c.benefic_only && !ctx.isBenefic(pid)) continue;
      if (c.dignity && !c.dignity.includes(p.dignity)) continue;
      hits.push(pid);
    }
    const n = hits.length;
    const minReq = c.min !== undefined ? c.min : 0;
    const maxReq = c.max !== undefined ? c.max : null;
    const ok = n >= minReq && (maxReq === null || n <= maxReq);
    return new Outcome(ok, `[${hits.join(", ")}] in houses [${hs.slice().sort((a,b)=>a-b).join(", ")}] from ${frm}`, { count: n, planets: hits });
  }

  function _p_count_lords(ctx, env, c) {
    const frm = c.frm || "lagna";
    const ref = ctx.refSign(frm);
    const hs = ctx.houses(c.houses);
    const hitsSet = new Set();

    for (let i = 0; i < c.lords.length; i++) {
      const lordPid = ctx.lordOfHouse(c.lords[i]);
      if (hs.includes(houseFrom(ref, ctx.planets[lordPid].sign))) {
        hitsSet.add(lordPid);
      }
    }
    const hits = Array.from(hitsSet).sort();
    const minReq = c.min !== undefined ? c.min : 1;
    return new Outcome(hits.length >= minReq, `lords [${hits.join(", ")}] placed in [${hs.slice().sort((a,b)=>a-b).join(", ")}]`, { count: hits.length });
  }

  function _p_neechabhanga(ctx, env, c) {
    const pid = ctx.resolve(c.sel, env);
    if (!pid) return new Outcome(null, "planet unavailable");
    if (ctx.planets[pid].dignity !== "Debilitated") {
      return new Outcome(false, `${pid} not debilitated`);
    }
    const hits = ctx.neechabhanga(pid);
    return new Outcome(ctx.neechabhangaOk(pid), `${pid} bhanga conditions: ${JSON.stringify(hits)}`, { conditions: hits });
  }

  function _p_sav_low(ctx, env, c) {
    if (ctx.sav === null) {
      return new Outcome(null, "SAV not provided");
    }
    const v = ctx.houseSav(c.house);
    const totalSav = ctx.sav.reduce((a, b) => a + b, 0);
    const thr = ctx.cfg.sav_low_ratio * totalSav / SIGN_COUNT;
    return new Outcome(v < thr, `house ${c.house} SAV ${v} vs threshold ${thr.toFixed(2)}`);
  }

  const PREDICATES = {
    related: _p_related,
    same_planet: _p_same_planet,
    in_houses: _p_in_houses,
    dignity_in: _p_dignity_in,
    afflicted: _p_afflicted,
    count_in_houses: _p_count_in_houses,
    count_lords_in_houses: _p_count_lords,
    neechabhanga: _p_neechabhanga,
    sav_house_low: _p_sav_low
  };

  function evalCond(c, ctx, env, results) {
    let out;
    if ("all" in c) {
      const outs = c.all.map(x => evalCond(x, ctx, env, results));
      if (outs.some(o => o.value === false)) {
        out = new Outcome(false, outs.filter(o => o.value === false).map(o => o.detail).join("; "));
      } else if (outs.some(o => o.value === null)) {
        out = new Outcome(null, outs.filter(o => o.value === null).map(o => o.detail).join("; "));
      } else {
        const meta = {};
        outs.forEach(o => Object.assign(meta, o.meta));
        out = new Outcome(true, outs.map(o => o.detail).join("; "), meta);
      }
    } else if ("any" in c) {
      const outs = c.any.map(x => evalCond(x, ctx, env, results));
      const first = outs.find(o => o.value === true);
      if (first) {
        out = new Outcome(true, first.detail, Object.assign({}, first.meta));
      } else if (outs.some(o => o.value === null)) {
        out = new Outcome(null, outs.filter(o => o.value === null).map(o => o.detail).join("; "));
      } else {
        out = new Outcome(false, "no alternative satisfied");
      }
    } else if ("not" in c) {
      const o = evalCond(c.not, ctx, env, results);
      out = new Outcome(o.value === null ? null : !o.value, o.detail);
    } else if ("rule_triggered" in c) {
      const r = results[c.rule_triggered];
      const val = (r === undefined || r.status === "NOT_EVALUATED") ? null : (r.status === "TRIGGERED");
      out = new Outcome(val, `depends on ${c.rule_triggered}`);
    } else if ("p" in c) {
      out = PREDICATES[c.p](ctx, env, c);
    } else {
      throw new Error(`bad condition node: ${JSON.stringify(c)}`);
    }

    if ("meta" in c && out.value === true) {
      out.meta = Object.assign({}, out.meta, c.meta);
    }
    return out;
  }

  function resolveWeight(spec, meta) {
    if (typeof spec === 'number') return Number(spec);
    if (spec && spec.by === "relation") {
      const rel = meta ? meta.relation : null;
      return Number(spec.values[rel] !== undefined ? spec.values[rel] : (spec.default || 0));
    }
    if (spec && "per" in spec) {
      const count = meta ? (meta[spec.per] || 0) : 0;
      return Number(Math.min(spec.cap, count * spec.unit));
    }
    throw new Error(`bad weight spec ${JSON.stringify(spec)}`);
  }

  function maxWeight(spec) {
    if (typeof spec === 'number') return Number(spec);
    if (spec && "per" in spec) return Number(spec.cap);
    if (spec && spec.values) {
      const vals = Object.values(spec.values);
      return Number(Math.max(...vals));
    }
    return 0;
  }

  function* expandRules(rules, ctx) {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if ("for_each" in r) {
        const grp = ctx.group(r.for_each);
        for (let j = 0; j < grp.length; j++) {
          const pid = grp[j];
          if (pid in ctx.planets) {
            const rr = Object.assign({}, r);
            rr.id = `${r.id}_${pid}`;
            rr.name = r.name.replace("{P}", ctx.t.PLANET_NAMES[pid] || pid);
            rr.env = { P: pid };
            yield rr;
          }
        }
      } else {
        yield Object.assign({}, r, { env: {} });
      }
    }
  }

  // =============================================================================
  // 9. SCORING & ENGINE RUNNER
  // =============================================================================
  function savMultiplier(ctx) {
    const m = ctx.cfg.multipliers.sav;
    if (ctx.sav === null) {
      return { value: 1.0, evaluated: false };
    }
    const diff = ctx.houseSav(m.gain_house) - ctx.houseSav(m.loss_house);
    let f;
    if (diff > 0) {
      f = Math.min(m.pos_cap, 1 + diff * m.pos_step);
    } else {
      f = Math.max(m.neg_floor, 1 + diff * m.neg_step);
    }
    return { value: Number(f.toFixed(3)), evaluated: true };
  }

  function shadbalaMultiplier(ctx) {
    const m = ctx.cfg.multipliers.shadbala;
    if (!ctx.shadbala) {
      return { value: 1.0, evaluated: false };
    }
    const w = {};
    for (const p in ctx.cfg.shadbala_weights) {
      if (p in ctx.shadbala) {
        w[p] = ctx.cfg.shadbala_weights[p];
      }
    }
    const wKeys = Object.keys(w);
    if (wKeys.length === 0) {
      return { value: 1.0, evaluated: false };
    }
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    let f = 0;
    for (const p in w) {
      f += (w[p] / tot) * (ctx.shadbala[p] / ctx.cfg.shadbala_min_rupa[p]);
    }
    if (wKeys.length < Object.keys(ctx.cfg.shadbala_weights).length) {
      ctx.flags.push("shadbala partial: weights renormalised over available planets");
    }
    const clamped = Math.max(m.floor, Math.min(m.cap, f));
    return { value: Number(clamped.toFixed(3)), evaluated: true };
  }

  function runEngine(canon, cfg = CONFIG, tables = REFERENCE_TABLES, rules = RULES) {
    const ctx = new ChartContext(canon, cfg, tables);
    const results = {};
    const ordered = [];
    const notes = [];
    let ref_max = 0.0;

    for (const r of expandRules(rules, ctx)) {
      if (cfg.strength_applies_to.includes(r.category)) {
        ref_max += maxWeight(r.weight);
      }
      const env = r.env;
      const o = evalCond(r.when, ctx, env, results);
      const res = {
        id: r.id,
        name: r.name,
        category: r.category,
        points: 0.0,
        detail: o.detail,
        source: r.source
      };

      if (o.value === null) {
        res.status = "NOT_EVALUATED";
      } else if (o.value === false) {
        res.status = "NOT_TRIGGERED";
      } else {
        let pts = resolveWeight(r.weight, o.meta);
        res.status = "TRIGGERED";

        if ("cancel_when" in r) {
          const co = evalCond(r.cancel_when, ctx, env, results);
          if (co.value === true) {
            pts *= (r.cancel_factor !== undefined ? r.cancel_factor : 0.0);
            res.detail += ` | cancelled: ${co.detail}`;
            if (pts === 0) {
              res.status = "CANCELLED";
            }
          } else if (co.value === null) {
            notes.push(`${r.id}: cancellation could not be evaluated`);
          }
        }

        if (pts > 0 && cfg.strength_applies_to.includes(r.category) && r.strength_planets) {
          const fs = [];
          for (let i = 0; i < r.strength_planets.length; i++) {
            const pid = ctx.resolve(r.strength_planets[i], env);
            if (pid) {
              fs.push(ctx.strengthFactor(pid, notes));
            }
          }
          if (fs.length > 0) {
            const avgStrength = fs.reduce((a, b) => a + b, 0) / fs.length;
            pts *= avgStrength;
          }
        }
        res.points = Number(pts.toFixed(2));
      }
      results[r.id] = res;
      ordered.push(res);
    }

    const pos = ordered.filter(x => x.points > 0).reduce((acc, x) => acc + x.points, 0);
    const neg = -ordered.filter(x => x.points < 0).reduce((acc, x) => acc + x.points, 0);
    const sav_mult = savMultiplier(ctx);
    const sb_mult = shadbalaMultiplier(ctx);
    const net = Math.max(0.0, pos - neg) * sav_mult.value * sb_mult.value;

    const sc = cfg.scoring;
    const ref = sc.saturation_fraction * ref_max;
    const index = ref > 0 ? Math.min(sc.scale_max, Math.round(sc.scale_max * net / ref)) : 0;
    const band = cfg.bands.find(b => index <= b.upper) || cfg.bands[cfg.bands.length - 1];

    const disp = cfg.inr_display;
    const band_out = {
      tier: band.tier,
      label: band.label,
      sanskrit: band.sanskrit
    };
    if (disp && disp.enabled) {
      band_out.indicative_net_worth_inr = band.inr;
      band_out.inr_basis = disp.basis;
      band_out.inr_calibrated = disp.calibrated;
      band_out.disclaimer = disp.disclaimer;
    }

    const nm = tables.SIGN_NAMES;
    const nm_hi = tables.SIGN_NAMES_HI;

    return {
      capacity_index: index,
      band: band_out,
      calibrated: sc.calibrated,
      components: {
        positive_points: Number(pos.toFixed(2)),
        penalty_points: Number(neg.toFixed(2)),
        sav_multiplier: sav_mult,
        shadbala_multiplier: sb_mult
      },
      special_lagnas: {
        lagna: nm[ctx.asc_sign],
        lagna_hi: nm_hi[ctx.asc_sign],
        arudha_lagna: nm[ctx.al_sign],
        arudha_lagna_hi: nm_hi[ctx.al_sign],
        a11: nm[ctx.arudhaOfHouse(11)],
        a11_hi: nm_hi[ctx.arudhaOfHouse(11)],
        indu_lagna: nm[ctx.indu_sign],
        indu_lagna_hi: nm_hi[ctx.indu_sign]
      },
      chara_karakas: ctx.karakas,
      triggered: ordered.filter(x => x.status === "TRIGGERED"),
      cancelled: ordered.filter(x => x.status === "CANCELLED"),
      not_evaluated: ordered.filter(x => x.status === "NOT_EVALUATED").map(x => ({ id: x.id, why: x.detail })),
      flags: [...ctx.flags, ...notes]
    };
  }

  function analyzeHostPayload(host, mapping = HOST_MAPPING, cfg = CONFIG) {
    return runEngine(prepareChart(adaptHostPayload(host, mapping), cfg), cfg);
  }

  /**
   * Adapter for Patrika Engine Bridge output:
   * Consumes calcResult = PatrikaEngineBridge.calculatePatrikaPlanets(input)
   * 100% read-only, ZERO changes to Patrika calculations.
   */
  function analyzePatrikaChart(calcResult, options = {}) {
    if (!calcResult || !calcResult.planets) {
      throw new ChartInputError("Invalid Patrika calculation result provided");
    }

    const lagnaObj = calcResult.planets.find(p => p.id === 'Lagna');
    const ascDegree = lagnaObj ? lagnaObj.abs : (calcResult.lagnaSign * 30);

    const hostPlanets = {};
    calcResult.planets.forEach(p => {
      if (p.id === 'Lagna') return;
      hostPlanets[p.id] = {
        degree: p.abs,
        is_retrograde: Boolean(p.retro)
      };
    });

    const hostPayload = {
      zodiac: "sidereal",
      house_system: "whole_sign",
      ascendant_degree: ascDegree,
      planets: hostPlanets,
      sav: options.sav || calcResult.sav || null,
      bav: options.bav || calcResult.bav || null,
      shadbala: options.shadbala || calcResult.shadbala || null
    };

    return analyzeHostPayload(hostPayload);
  }

  // Classical metadata and Hindi descriptions for UI rendering
  const YOGA_METADATA_HI = {
    "DH_L2_L11": {
      title: "धनेश-लाभेश महा धन योग",
      authority: "बृहत्पाराशर होराशास्त्र (धन योग अध्याय)",
      desc: "द्वितीय भाव (स्थिर धन संचय) एवं एकादश भाव (नियमित लाभ व आय) के स्वामियों के मध्य युति, दृष्टि या राशि परिवर्तन से जीवन में अखंड धन लाभ एवं निरंतर आय के स्रोत बनते हैं।"
    },
    "DH_L1_L2": {
      title: "लग्नेश-धनेश स्व-उपार्जित धन योग",
      authority: "बृहत्पाराशर होराशास्त्र",
      desc: "प्रथम भाव (स्वयं का सामर्थ्य) एवं द्वितीय भाव (कोष) के स्वामियों का शुभ सम्बन्ध जातक को अपनी बुद्धि, श्रम और पुरुषार्थ से विपुल संपत्ति का स्वामी बनाता है।"
    },
    "DH_L5_L11": {
      title: "पंचमेश-लाभेश पूर्वपुण्य लक्ष्मी योग",
      authority: "बृहत्पाराशर होराशास्त्र",
      desc: "त्रिकोण भाव (पंचम - पूर्वजन्म के संचित पुण्य) तथा लाभ भाव (एकादश) का दिव्य योग जातक को अनायास बड़े आर्थिक अवसर, निवेश से लाभ और महालक्ष्मी की कृपा प्रदान करता है।"
    },
    "DH_L9_L2": {
      title: "भाग्येश-धनेश महाभाग्य धन योग",
      authority: "बृहत्पाराशर होराशास्त्र",
      desc: "नवम भाव (परम भाग्य व धर्म) एवं द्वितीय भाव (धन भाव) का सम्बन्ध जातक के भाग्य को सदैव धनी बनाता है। ऐसे जातक का कोष कभी रिक्त नहीं होता।"
    },
    "RJ_L9_L10": {
      title: "धर्म-कर्माधिपति साम्राज्य राज-धन योग",
      authority: "बृहत्पाराशर होराशास्त्र / लघु पाराशरी",
      desc: "नवम भाव (धर्म/भाग्य) एवं दशम भाव (कर्म/सत्ता) के अधिपति का संगम ज्योतिष का सर्वोच्च राज-धन योग है, जो अपार ऐश्वर्य, पद-प्रतिष्ठा और सत्तात्मक अधिकार प्रदान करता है।"
    },
    "PD_VASUMATI_FULL": {
      title: "अखंड वसुमती योग (पूर्ण)",
      authority: "फलदीपिका / बृहज्जातक",
      desc: "लग्न या चंद्र से सभी उपचय भावों (3, 6, 10, 11) में नैसर्गिक शुभ ग्रह (बुध, गुरु, शुक्र) विराजमान हैं। यह योग जातक को अचल संपत्ति, बहुमूल्य रत्न और कुबेर समान वैभव देता है।"
    },
    "PD_VASUMATI_PARTIAL": {
      title: "वसुमती योग (आंशिक)",
      authority: "फलदीपिका",
      desc: "लग्न या चंद्र से उपचय भावों में दो शुभ ग्रहों की स्थिति जातक को स्थिर आय, व्यवसाय में निरंतर प्रगति और वित्तीय स्थिरता प्रदान करती है।"
    },
    "BJ_CHANDRADHI_FULL": {
      title: "पूर्ण चंद्राधि योग",
      authority: "बृहज्जातक / फलदीपिका",
      desc: "चंद्रमा से छठे, सातवें और आठवें भाव में शुभ ग्रह स्थित हैं। यह योग जातक को राजा के समान ऐश्वर्यशाली, शत्रुओं पर विजयी और दीर्घायु धनवान बनाता है।"
    },
    "BJ_CHANDRADHI_PARTIAL": {
      title: "आंशिक चंद्राधि योग",
      authority: "बृहज्जातक",
      desc: "चंद्रमा से 6, 7, 8 भावों में दो शुभ ग्रह स्थित हैं, जिससे जातक समाज में सम्मानित, आर्थिक रूप से आत्मनिर्भर और प्रभावशाली बनता है।"
    },
    "BPHS_INDU_EXALTED": {
      title: "इन्दु लग्न में उच्च ग्रह योग",
      authority: "बृहत्पाराशर होराशास्त्र (इन्दु लग्न विचार)",
      desc: "इन्दु लग्न (विशेष चंद्र-धन लग्न) में उच्च राशिस्थ ग्रह की उपस्थिति शास्त्रों में सर्वश्रेष्ठ धन दायक मानी गई है। यह जातक को कोटिपति या महाधनी बनाती है।"
    },
    "BPHS_INDU_BENEFIC": {
      title: "इन्दु लग्न में शुभ ग्रह योग",
      authority: "बृहत्पाराशर होराशास्त्र",
      desc: "इन्दु लग्न में नैसर्गिक शुभ ग्रह विराजमान होकर जातक के धन कोष की रक्षा करते हैं और आर्थिक संकटों से सुरक्षा प्रदान करते हैं।"
    },
    "JM_AK_AMK": {
      title: "आत्मकारक-अमात्यकारक जैमिनी राजयोग",
      authority: "महर्षि जैमिनी उपदेश सूत्र",
      desc: "आत्मकारक (AK) और अमात्यकारक (AmK) के बीच युति, दृष्टि या राशि परिवर्तन उच्च प्रशासनिक अधिकार, शीर्ष नेतृत्व और विपुल वित्तीय प्रभाव प्रदान करता है।"
    },
    "JM_AL_11": {
      title: "आरूढ़ लग्न से एकादश लाभ योग",
      authority: "महर्षि जैमिनी उपदेश सूत्र",
      desc: "आरूढ़ लग्न (AL) के 11वें भाव में ग्रहों का बैठना बाह्य जगत में अतुलनीय समृद्धि, बड़े उद्योग/व्यापार से लाभ और समाज में अपार प्रतिष्ठा का सूचक है।"
    },
    "SC_VIPARITA": {
      title: "विपरीत राजयोग (त्रिक भावेश त्रिक में)",
      authority: "सर्वार्थ चिंतामणि / पाराशर होरा",
      desc: "दुस्थानों (6, 8, 12 भाव) के स्वामी परस्पर 6, 8, 12 भावों में ही स्थित होकर विपरीत परिस्थितियों, प्रतिस्पर्धा और अप्रत्याशित स्रोतों से भारी आर्थिक लाभ कराते हैं।"
    },
    "NB_RAJA": {
      title: "नीचभंग राजयोग",
      authority: "फलदीपिका",
      desc: "नीच राशि में स्थित ग्रह का शास्त्रीय नियमों से नीचत्व भंग हो गया है। ऐसा ग्रह पहले संघर्ष कराकर फिर जातक को असाधारण आर्थिक ऊंचाई और कीर्ति दिलाता है।"
    },
    "MP_YOGA": {
      title: "पंच महापुरुष योग",
      authority: "बृहज्जातक / बृहत्पाराशर होराशास्त्र",
      desc: "मंगल (रुचक), बुध (भद्र), गुरु (हंस), शुक्र (मालव्य) या शनि (शश) केंद्र भाव में अपनी स्वराशि, मूलत्रिकोण या उच्च राशि में स्थित होकर महापुरुष योग निर्मित कर रहे हैं।"
    },
    "BPHS_GAJAKESARI": {
      title: "गजकेसरी योग",
      authority: "बृहत्पाराशर होराशास्त्र / जातक पारिजात",
      desc: "चंद्रमा से केंद्र भाव (1, 4, 7, 10) में देवगुरु बृहस्पति स्थित हैं। यह योग बुद्धि, प्रतिष्ठा, यश, राजकीय सम्मान और अक्षय धन प्रदान करता है।"
    },
    "MN_CHANDRA_MANGALA": {
      title: "चंद्र-मंगल महालक्ष्मी योग",
      authority: "मानसागरी",
      desc: "चंद्रमा और मंगल की शुभ युति से निर्मित यह योग जातक को वाणिज्य, रियल एस्टेट, उद्यमशीलता और पैतृक संपत्ति से प्रचुर धन दिलाता है।"
    },
    "DR_KEMADRUMA": {
      title: "केमद्रुम योग (दरिद्र/अस्थिरता सूचक)",
      authority: "बृहज्जातक / फलदीपिका",
      desc: "चंद्रमा के आगे और पीछे (द्वितीय व द्वादश) कोई भौतिक ग्रह नहीं है। हालांकि यदि लग्न या चंद्र से केंद्र में ग्रह हों, तो इसका भंग हो जाता है।"
    },
    "DR_L11_DUSTHANA": {
      title: "लाभेश का त्रिक भाव में बैठना",
      authority: "बृहत्पाराशर होराशास्त्र",
      desc: "ग्यारहवें भाव (लाभ) का स्वामी 6, 8, या 12वें भाव में स्थित होने से जातक की आय में उतार-चढ़ाव या लाभ प्राप्ति में विलंब होता है।"
    },
    "DR_L11_DUSTHANA_AFFLICTED": {
      title: "लाभेश त्रिक भाव में पीड़ित/अस्त",
      authority: "बृहत्पाराशर होराशास्त्र",
      desc: "लाभेश त्रिक भाव में बैठकर अस्त या बिना नीचभंग के नीच है, जिससे आर्थिक योजनाओं में अवरोध आ सकते हैं।"
    },
    "DR_L2_IN_12": {
      title: "धनेश का द्वादश (व्यय) भाव में होना",
      authority: "मानसागरी",
      desc: "द्वितीय भाव (संचित धन) का स्वामी बारहवें भाव (व्यय) में होने से संचित पूंजी का तेजी से व्यय या अनावश्यक खर्चों का भय रहता है।"
    },
    "DR_SAV_H2_LOW": {
      title: "द्वितीय भाव में न्यून अष्टकवर्ग बिंदु",
      authority: "बृहत्पाराशर अष्टकवर्ग",
      desc: "द्वितीय भाव में सर्वाष्टकवर्ग (SAV) बिंदु औसत (28) से काफी कम होने के कारण धन संचय में विशेष सावधानी बरतने की आवश्यकता होती है।"
    }
  };

  function getLocalizedYogaInfo(yogaId) {
    // If it is dynamic (e.g., MP_YOGA_MA or NB_RAJA_ME)
    for (const prefix in YOGA_METADATA_HI) {
      if (yogaId === prefix || yogaId.startsWith(prefix + "_")) {
        return YOGA_METADATA_HI[prefix];
      }
    }
    return {
      title: yogaId,
      authority: "वैदिक ज्योतिष शास्त्र",
      desc: "शास्त्रीय धन अथवा दरिद्र योग नियम।"
    };
  }

  function analyzeCareerTrajectory(currentStatus = 'salaried_govt', currentScale = 'middle', dhanResult = {}, calcResult = {}) {
    const statusMeta = {
      salaried_govt: {
        title: "वेतनभोगी / सरकारी सेवा",
        baselineCap: "₹1.5 करोड़ – ₹3 करोड़ (नियमित वेतन, पीएफ व पेंशन सीमा)",
        isOpenEnded: false,
        advice: "वेतन व पेंशन का दायरा स्वाभाविक रूप से सुरक्षित परंतु सीमित होता है। यदि आपकी कुंडली में उच्च धन योग सक्रिय हैं, तो केवल मासिक वेतन पर निर्भर रहने के बजाय बचत को रियल एस्टेट, सुरक्षित म्यूचुअल फंड्स, या सेवानिवृत्ति उपरांत परामर्श (Consultancy / Side Venture) में लगाना चाहिए ताकि कुंडली की पूर्ण क्षमता अनलॉक हो सके।"
      },
      professional: {
        title: "स्वतंत्र पेशेवर / सलाहकार / चिकित्सक / सीए",
        baselineCap: "₹5 करोड़ – ₹25 करोड़ (फीस, कंसल्टिंग व ब्रांड वैल्यू)",
        isOpenEnded: true,
        advice: "पेशेवर क्षेत्र में आपकी आय आपके व्यक्तिगत कौशल, प्रतिष्ठा और विशेषज्ञता से संचालित होती है। उच्च धन योगों का लाभ उठाने हेतु अपने कार्य को एक संस्था, फर्म या डिजिटल प्लेटफॉर्म के रूप में विकसित करें।"
      },
      business: {
        title: "व्यापार / उद्योग / स्टार्टअप",
        baselineCap: "असीमित / खुला दायरा (टर्नओवर व इक्विटी आधारित)",
        isOpenEnded: true,
        advice: "व्यापार में वित्तीय सीमाएं पूरी तरह खुली होती हैं। आपकी कुंडली के धन योग सीधे व्यावसायिक विस्तार, नए बाज़ारों और नकदी प्रवाह को गति देने में सक्षम हैं। अनावश्यक देनदारियों व लीकेज से बचना ही मुख्य कुंजी है।"
      },
      investor: {
        title: "निवेशक / शेयर बाजार / रियल एस्टेट",
        baselineCap: "चक्रवृद्धि (Compounding) व एसेट वैल्यू आधारित",
        isOpenEnded: true,
        advice: "आपकी पूंजी ही आपका प्राथमिक धन स्रोत है। कुंडली के पंचम (बुद्धि/सट्टा) व एकादश (लाभ) भाव के योग दीर्घकालिक चक्रवृद्धि लाभ का संकेत करते हैं।"
      },
      starter: {
        title: "विद्यार्थी / नवयुवा / करियर प्रारंभ",
        baselineCap: "नींव निर्माण काल (Foundation Phase)",
        isOpenEnded: true,
        advice: "वर्तमान समय धन संचय से अधिक कौशल, नेटवर्क और ज्ञान अर्जन का है। आपकी कुंडली के धन योग जीवन के 28 से 35 वर्ष की आयु के पश्चात तीव्र गति से फलित होना प्रारंभ होंगे।"
      }
    };

    const cur = statusMeta[currentStatus] || statusMeta.salaried_govt;
    const band = dhanResult.band || {};
    
    let contrastNote = "";
    if (!cur.isOpenEnded && band.tier >= 5) {
      contrastNote = `वर्तमान में आपका कार्य-क्षेत्र '${cur.title}' है जहाँ केवल मासिक वेतन से ${band.indicative_net_worth_inr || ''} (${band.sanskrit || ''}) तक पहुँचना संभव नहीं है। अतः कुंडली संकेत देती है कि आपके धन योग बचत के अनुशासित निवेश (Investment / Assets) अथवा समानांतर ज्ञान-पूंजी के माध्यम से ही पूर्णतः प्रकट होंगे।`;
    } else if (cur.isOpenEnded && band.tier >= 5) {
      contrastNote = `आपका कार्य-क्षेत्र '${cur.title}' है जहाँ वित्तीय सीमाएं खुली हैं। आपकी कुंडली के सक्रिय धन योग आपके व्यवसाय/निवेश की स्वाभाविक स्केलिंग का पूर्ण समर्थन करते हैं।`;
    } else {
      contrastNote = `आपकी वर्तमान स्थिति और कुंडली की धन क्षमता आपस में संतुलित हैं। अनुशासित बचत एवं स्थिरता द्वारा आप इस संकेतात्मक दायरे को सुगमता से प्राप्त कर सकते हैं।`;
    }

    return {
      currentStatusKey: currentStatus,
      currentStatusTitle: cur.title,
      baselineCap: cur.baselineCap,
      isOpenEnded: cur.isOpenEnded,
      guidance: cur.advice,
      contrastNote: contrastNote,
      indicativeBand: band.indicative_net_worth_inr || band.label,
      sanskritTier: band.sanskrit || band.label
    };
  }

  return {
    ARCSEC_PER_DEG,
    ARCSEC_PER_SIGN,
    ARCSEC_PER_CIRCLE,
    SIGN_COUNT,
    REFERENCE_TABLES,
    CONFIG,
    RULES,
    HOST_MAPPING,
    ChartInputError,
    houseFrom,
    housePlus,
    angleToArcsec,
    adaptHostPayload,
    prepareChart,
    ChartContext,
    runEngine,
    analyzeHostPayload,
    analyzePatrikaChart,
    getLocalizedYogaInfo,
    analyzeCareerTrajectory
  };
});
