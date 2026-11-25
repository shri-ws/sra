/**
 * BPHS Lab — Chapter 28 (स्पष्टबलनिर्णयाध्याय): the six strengths of the seven planets
 * ─────────────────────────────────────────────────────────────
 * All values are in kalas (षष्ट्यंश): 60 kalas = 1 रूप. Each part follows the printed verse;
 * where the verse leaves a detail open the choice is listed in `notes` and shown on the page.
 *
 *   स्थान  28.1–6   उच्च, सप्तवर्गज, ओज-युग्म, केन्द्रादि, द्रेष्काण
 *   दिक्   28.7–8
 *   काल   28.8–17  नतोन्नत, पक्ष, त्रिभाग, (वर्ष, मास,) वार, होरा, अयन
 *   चेष्टा  28.18, 24–25
 *   नैसर्गिक 28.14
 *   दृक्    28.19
 * Inputs: the engine's chart, BphsLabCh03.analyze(chart), BphsLabCh05_08 (vargas) and BphsLabCh27 (aspect).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BphsLabCh28 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const V = n => `BPHS.28.${n}`;
  const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const n360 = x => ((x % 360) + 360) % 360;
  const fold = d => { d = n360(d); return d > 180 ? 360 - d : d; };
  const DEBIL_POINT = { Sun: 190, Moon: 213, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20 };
  const MALE = ['Sun', 'Mars', 'Jupiter'], NEUTER = ['Mercury', 'Saturn'];
  const BENEFIC_PAKSHA = ['Moon', 'Mercury', 'Venus', 'Jupiter'];
  const NIGHT_LIKE = ['Moon', 'Mars', 'Saturn'];
  const NAISARGIKA_ORDER = ['Saturn', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Moon', 'Sun'];
  const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  const WEEK = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  /** 28.32–33 as the book's commentary reads them (kalas): totals for "सुबली". */
  const REQUIRED = { Sun: 390, Moon: 360, Mars: 300, Mercury: 420, Jupiter: 390, Venus: 330, Saturn: 300 };
  /** 28.34–36: per-part thresholds — स्थान, दिक्, चेष्टा, काल, अयन. */
  const REQUIRED_PART = {
    Jupiter: [165, 35, 50, 112, 30], Mercury: [165, 35, 50, 112, 30], Sun: [165, 35, 50, 112, 30],
    Venus: [133, 50, 30, 100, 40], Moon: [133, 50, 30, 100, 40], Mars: [96, 30, 40, 67, 20], Saturn: [96, 30, 40, 67, 20]
  };
  /** 28.2–3: सप्तवर्गज points by standing. */
  const SV_POINTS = { moolatrikona: 45, own: 30, adhimitra: 20, mitra: 15, sama: 10, shatru: 4, adhishatru: 2 };
  const SV_KEYS = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'];
  /** 28.15: अयन खण्ड. */
  const AYANA_KHANDA = [45, 33, 12];
  /** Mean heliocentric longitudes (tropical, J2000) for the चेष्टा-केन्द्र (28.24). */
  const MEAN = { Sun: [280.46646, 0.98564736], Mercury: [252.25084, 4.09233880], Venus: [181.97973, 1.60213047],
    Mars: [355.45332, 0.52403304], Jupiter: [34.40438, 0.08308676], Saturn: [49.94432, 0.03346063] };
  const meanLon = (id, jd) => n360(MEAN[id][0] + MEAN[id][1] * (jd - 2451545.0));

  function shadbala(chart, analysis, vargas, aspect) {
    const P = {}; chart.planets.forEach(p => { P[p.id] = p; });
    const lg = P.Lagna.sign, ast = chart.astronomy, ayan = ast.ayanamsa_deg, jd = ast.jd_ut;
    const house = id => ((P[id].sign - lg + 12) % 12) + 1;
    const mid = h => chart.sripatiBhavas.find(b => b.house === h).mid;
    const rel = analysis.relations;
    const out = {};

    // काल-बल inputs: day/night, its thirds, local noon, weekday and hora
    const eff = ast.sunrise.effective_jd, sset = ast.sunset.sunset_jd, next = ast.sunset.next_sunrise_jd;
    const isDay = jd >= eff && jd < sset;
    const [ps, pe] = isDay ? [eff, sset] : [sset, next];
    const third = Math.min(2, Math.floor((jd - ps) / ((pe - ps) / 3)));
    const triLord = (isDay ? ['Mercury', 'Sun', 'Saturn'] : ['Moon', 'Venus', 'Mars'])[third];
    const noon = (eff + sset) / 2;
    let fromNoon = Math.abs(jd - noon) * 60; // ghatis
    fromNoon = fromNoon % 60; if (fromNoon > 30) fromNoon = 60 - fromNoon;
    const weekday = chart.panchang.vaar.vedicDayIndex, dayLord = WEEK[weekday];
    const horaIndex = Math.floor((jd - eff) * 24);
    const horaLord = CHALDEAN[(CHALDEAN.indexOf(dayLord) + horaIndex) % 7]; // each hora passes to the next in शनि-गुरु-मंगल-सूर्य-शुक्र-बुध-चन्द्र order
    const elong = fold(P.Moon.abs - P.Sun.abs);

    SEVEN.forEach(id => {
      const p = P[id];
      // ── स्थान ──
      const uchcha = fold(p.abs - DEBIL_POINT[id]) / 3;
      const sv = SV_KEYS.map(key => {
        const v = vargas.varga(key, p.sign, p.deg);
        let k;
        if (v.lord === id) k = key === 'D1' && analysis.planets[id].dignity.key === 'moolatrikona' ? 'moolatrikona' : 'own';
        else k = rel[id][v.lord].compound;
        return { key, sign: v.sign, lord: v.lord, standing: k, points: SV_POINTS[k] };
      });
      const saptavarga = sv.reduce((a, b) => a + b.points, 0);
      const d9 = vargas.varga('D9', p.sign, p.deg).sign;
      const wantEven = id === 'Moon' || id === 'Venus';
      const oja = ((p.sign % 2 === 1) === wantEven ? 15 : 0) + ((d9 % 2 === 1) === wantEven ? 15 : 0);
      const h = house(id);
      const kendradi = [1, 4, 7, 10].includes(h) ? 60 : [2, 5, 8, 11].includes(h) ? 30 : 15;
      const dk = Math.min(2, Math.floor(p.deg / 10));
      const drekkana = (MALE.includes(id) && dk === 0) || (NEUTER.includes(id) && dk === 1) || (!MALE.includes(id) && !NEUTER.includes(id) && dk === 2) ? 15 : 0;
      const sthana = uchcha + saptavarga + oja + kendradi + drekkana;

      // ── दिक् ── (28.7: subtract the 4th from the Sun and Mars, the 7th from Jupiter and Mercury,
      //            the lagna from Saturn, the 10th from Venus and the Moon)
      const point = { Sun: 4, Mars: 4, Jupiter: 7, Mercury: 7, Saturn: 1, Venus: 10, Moon: 10 }[id];
      const dig = fold(p.abs - mid(point)) / 3;

      // ── काल ──
      const natonnata = id === 'Mercury' ? 60 : NIGHT_LIKE.includes(id) ? 2 * fromNoon : 60 - 2 * fromNoon;
      const pakshaBen = elong / 3;
      const paksha = BENEFIC_PAKSHA.includes(id) ? pakshaBen : 60 - pakshaBen;
      const tribhaga = id === 'Jupiter' || id === triLord ? 60 : 0;
      const vara = id === dayLord ? 45 : 0;
      const hora = id === horaLord ? 60 : 0;
      // अयन (28.15–17): bhuja of the sayana planet through the khandas 45, 33, 12, then ± 3 signs
      const say = n360(p.abs + ayan);
      const bhuja = say <= 90 ? say : say <= 180 ? 180 - say : say <= 270 ? say - 180 : 360 - say;
      const whole = Math.min(2, Math.floor(bhuja / 30));
      let ay = AYANA_KHANDA.slice(0, whole).reduce((a, b) => a + b, 0) + (bhuja - whole * 30) * AYANA_KHANDA[Math.min(2, whole)] / 30;
      const southHalf = say >= 180; // तुला आदि
      let add;
      if (id === 'Mercury') add = true;
      else if (id === 'Saturn' || id === 'Moon') add = southHalf;
      else add = !southHalf;
      const ayanaDeg = add ? 90 + ay : 90 - ay;
      const ayana = ayanaDeg / 3;
      const kala = natonnata + paksha + tribhaga + vara + hora + ayana;

      // ── चेष्टा ── (Sun: its ayana; Moon: its paksha — 28.18; others: the cheshta-kendra, 28.24–25)
      let cheshta, cheshtaKendra = null;
      if (id === 'Sun') cheshta = ayana;
      else if (id === 'Moon') cheshta = paksha;
      else {
        const sid = x => n360(x - ayan);
        const inner = id === 'Mercury' || id === 'Venus';
        const madhya = sid(inner ? meanLon('Sun', jd) : meanLon(id, jd));
        const shighra = sid(inner ? meanLon(id, jd) : meanLon('Sun', jd));
        const half = n360(madhya + (((p.abs - madhya) % 360 + 540) % 360 - 180) / 2); // midpoint of mean and true
        cheshtaKendra = fold(shighra - half);
        cheshta = cheshtaKendra / 3;
      }

      // ── नैसर्गिक ── (28.14)
      const naisargika = 60 / 7 * (NAISARGIKA_ORDER.indexOf(id) + 1);

      // ── दृक् ── (28.19): + ¼ of benefic aspects, − ¼ of malefic aspects, and Mercury's and Jupiter's in full
      let drik = 0; const drikParts = [];
      SEVEN.forEach(s => {
        if (s === id) return;
        const d = aspect.drishti(s, P[s].abs, p.abs).value;
        if (!d) return;
        const ben = analysis.nature.planets[s].nature === 'saumya';
        let c = (ben ? 1 : -1) * d / 4;
        if (s === 'Mercury' || s === 'Jupiter') c += d;
        drik += c; drikParts.push({ by: s, value: d, contribution: c });
      });

      const total = sthana + dig + kala + cheshta + naisargika + drik;
      out[id] = {
        sthana: { total: sthana, uchcha, saptavarga, sv, oja, kendradi, drekkana, verses: [V(1), V(2), V(3), V(4), V(5), V(6)] },
        dig: { total: dig, point, verses: [V(7), V(8)] },
        kala: { total: kala, natonnata, paksha, tribhaga, vara, hora, ayana, verses: [V(8), V(9), V(10), V(11), V(12), V(13), V(15), V(16), V(17)] },
        cheshta: { total: cheshta, kendra: cheshtaKendra, verses: id === 'Sun' || id === 'Moon' ? [V(18)] : [V(24), V(25)] },
        naisargika: { total: naisargika, verses: [V(14)] },
        drik: { total: drik, parts: drikParts, verses: [V(19)] },
        total, rupas: total / 60, required: REQUIRED[id], ratio: total / REQUIRED[id],
        requiredPart: REQUIRED_PART[id]
      };
    });

    // 28.20: planetary war (two of Mars–Saturn within one degree)
    const war = [];
    ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].forEach((a, i, arr) => arr.slice(i + 1).forEach(b => {
      if (fold(P[a].abs - P[b].abs) < 1) war.push([a, b]);
    }));

    return {
      planets: out, isDay, triLord, dayLord, horaLord, fromNoon, elong, war,
      notes: [
        'वर्ष-स्वामी और मास-स्वामी का बल (28.13) नहीं जोड़ा; उनकी गणना अहर्गण पर टिकी है।',
        'नतोन्नत (28.8–9) में "नत" को स्थानीय मध्याह्न से घटी-अन्तर (0–30) लिया है।',
        'ओज-युग्म बल (28.5) राशि और नवांश दोनों के लिए 15-15 कला लिया है।',
        'केन्द्र आदि (28.5) राशि-भाव से गिने हैं; दिग्बल (28.7) श्रीपति भाव-मध्य से।',
        'होरा समान घंटों की ली है; चेष्टा-केन्द्र के लिए मध्यम ग्रह आधुनिक माध्य गति से।',
        'दृग्बल (28.19) टीका के अनुसार: शुभ दृष्टि का चौथाई जोड़ा, पाप का घटाया, और बुध-गुरु की दृष्टि पूरी जोड़ी।',
        'ग्रह-युद्ध (28.20) में विजेता का नियम इस अध्याय में नहीं है; युद्ध केवल दिखाया है, बल नहीं बदला।',
        'सुबली होने की संख्याएँ (28.32–36) पुस्तक की टीका के अनुसार ली हैं।'
      ]
    };
  }

  /**
   * 28.26–31: strength of the twelve bhavas.
   *   दिक्: from the bhava (madhya) subtract the 7th, 4th, lagna or 10th, by the kind of its sign
   *         (27–28); fold over 6 signs and divide the degrees by 3.
   *   + ¼ of benefic aspects − ¼ of malefic aspects, + Mercury's and Jupiter's aspects in full (29)
   *   + the shadbala of the bhava's lord (29)
   *   + 60 if Mercury or Jupiter is in the bhava, − 60 if Saturn, Mars or the Sun is (30)
   *   + 15 for a शीर्षोदय sign by day, a पृष्ठोदय sign by night (31)
   * shad: the result of shadbala() for the same chart.
   */
  const SHIRSHA = [2, 4, 5, 6, 10], UBHAYA = [11]; // 5.9–23; धनु's rising is not stated there, so it counts as पृष्ठोदय
  function bhavaBala(chart, analysis, aspect, shad) {
    const P = {}; chart.planets.forEach(p => { P[p.id] = p; });
    const ast = chart.astronomy, jd = ast.jd_ut;
    const isDay = jd >= ast.sunrise.effective_jd && jd < ast.sunset.sunset_jd;
    const mid = h => chart.sripatiBhavas.find(b => b.house === h).mid;
    const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    const out = [];
    for (let h = 1; h <= 12; h++) {
      const m = mid(h), sign = Math.floor(m / 30), firstHalf = m % 30 < 15;
      // 28.27–28: which point to subtract
      let from;
      if ([2, 5, 6, 10].includes(sign) || (sign === 8 && firstHalf)) from = 7;
      else if ([0, 1, 4].includes(sign) || (sign === 9 && firstHalf) || (sign === 8 && !firstHalf)) from = 4;
      else if ([3, 7].includes(sign)) from = 1;
      else from = 10; // मीन and the second half of मकर
      const dig = fold(m - mid(from)) / 3;
      let drik = 0;
      SEVEN.forEach(sr => {
        const d = aspect.drishti(sr, P[sr].abs, m).value;
        if (!d) return;
        drik += (analysis.nature.planets[sr].nature === 'saumya' ? 1 : -1) * d / 4 + (sr === 'Mercury' || sr === 'Jupiter' ? d : 0);
      });
      const lord = SIGN_LORD[sign];
      const lordBala = shad.planets[lord].total;
      const inBhava = SEVEN.filter(id => chart.sripatiBhavas.find(b => b.house === h) && houseOfBhava(chart, P[id].abs) === h);
      const occupant = inBhava.reduce((a, id) => a + (['Mercury', 'Jupiter'].includes(id) ? 60 : ['Saturn', 'Mars', 'Sun'].includes(id) ? -60 : 0), 0);
      const rising = (isDay && SHIRSHA.includes(sign)) || (!isDay && !SHIRSHA.includes(sign) && !UBHAYA.includes(sign)) ? 15 : 0;
      const total = dig + drik + lordBala + occupant + rising;
      out.push({ house: h, sign, lord, from, dig, drik, lordBala, occupants: inBhava, occupant, rising, total, rupas: total / 60,
        verses: ['BPHS.28.26', 'BPHS.28.27', 'BPHS.28.28', 'BPHS.28.29', 'BPHS.28.30', 'BPHS.28.31'] });
    }
    const sorted = out.map(x => x.total).sort((a, b) => a - b);
    const median = (sorted[5] + sorted[6]) / 2;
    out.forEach(x => { x.strong = x.total >= median; });
    return { bhavas: out, median, isDay, notes: [
      'भाव की राशि उसके मध्य (श्रीपति भाव) से ली है; उसमें स्थित ग्रह भी सन्धि से सन्धि तक गिने हैं।',
      "'सन्ध्या में उभयोदय' (28.31) के लिए सन्ध्या-काल की सीमा नहीं दी गई, इसलिए केवल दिन और रात गिने हैं।",
      'भाव-बल के लिए "बली" होने की कोई संख्या श्लोकों में नहीं है; बारह भावों की माध्यिका से ऊपर वाले भाव को बली माना है।'
    ] };
  }
  function houseOfBhava(chart, abs) {
    const n = x => ((x % 360) + 360) % 360;
    const b = chart.sripatiBhavas.find(x => n(abs - x.sandhi1) < n(x.sandhi2 - x.sandhi1));
    return b ? b.house : null;
  }

  return { SEVEN, REQUIRED, REQUIRED_PART, SV_POINTS, AYANA_KHANDA, shadbala, bhavaBala, meanLon };
});
