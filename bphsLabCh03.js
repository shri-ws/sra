/**
 * BPHS Lab — Chapter 3 rule engine (ग्रहस्वरूपवर्णनाध्यायः)
 * ─────────────────────────────────────────────────────────────
 * Every rule is written as the printed verse states it (book numbering,
 * data/bphs/bphs.json) and every result carries the verse ids it came from,
 * so the lab page can show "why" next to each answer.
 *
 * Input chart: the object returned by PatrikaEngineBridge.calculatePatrikaPlanets
 * (planets[] with id/sign/deg/abs, astronomy.ayanamsa_deg, birthDetails).
 * Signs are 0-based (0 = मेष … 11 = मीन).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BphsLabCh03 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const NINE = SEVEN.concat(['Rahu', 'Ketu']);
  const NAME_HI = { Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु' };
  const SIGN_HI = ['मेष', 'वृष', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const V = (ch, n) => `BPHS.${ch}.${n}`;

  // Sign lords as stated in the राशिशील chapter (book ch. 5).
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const SIGN_LORD_VERSE = [V(5, 7), V(5, 8), V(5, 10), V(5, 11), V(5, 12), V(5, 14), V(5, 16), V(5, 17), V(5, 17), V(5, 19), V(5, 22), V(5, 24)];

  // 3.50–51: exaltation sign and degree; debilitation is the 7th sign, same degree.
  const EXALT = { Sun: [0, 10], Moon: [1, 3], Mars: [9, 28], Mercury: [5, 15], Jupiter: [3, 5], Venus: [11, 27], Saturn: [6, 20] };

  // 3.52–55: मूलत्रिकोण sign and degree range [from, to).
  const MOOLA = {
    Sun: { sign: 4, from: 0, to: 20, verse: V(3, 52) },
    Moon: { sign: 1, from: 3, to: 30, verse: V(3, 52) },
    Mars: { sign: 0, from: 0, to: 12, verse: V(3, 53) },
    Mercury: { sign: 5, from: 15, to: 20, verse: V(3, 54) },
    Jupiter: { sign: 8, from: 0, to: 10, verse: V(3, 54) },
    Venus: { sign: 6, from: 0, to: 15, verse: V(3, 55) },
    Saturn: { sign: 10, from: 0, to: 20, verse: V(3, 55) }
  };

  // 3.56–59: नैसर्गिक मैत्री.
  const NATURAL = {
    Sun: { friends: ['Moon', 'Mars', 'Jupiter'], neutral: ['Mercury'], enemies: ['Venus', 'Saturn'], verse: V(3, 56) },
    Moon: { friends: ['Sun', 'Mercury'], neutral: ['Mars', 'Jupiter', 'Venus', 'Saturn'], enemies: [], verse: V(3, 56) },
    Mars: { friends: ['Sun', 'Moon', 'Jupiter'], neutral: ['Venus', 'Saturn'], enemies: ['Mercury'], verse: V(3, 57) },
    Mercury: { friends: ['Sun', 'Venus'], neutral: ['Mars', 'Jupiter', 'Saturn'], enemies: ['Moon'], verse: V(3, 57) },
    Jupiter: { friends: ['Sun', 'Moon', 'Mars'], neutral: ['Saturn'], enemies: ['Mercury', 'Venus'], verse: V(3, 58) },
    Venus: { friends: ['Mercury', 'Saturn'], neutral: ['Mars', 'Jupiter'], enemies: ['Sun', 'Moon'], verse: V(3, 58) },
    Saturn: { friends: ['Mercury', 'Venus'], neutral: ['Jupiter'], enemies: ['Sun', 'Moon', 'Mars'], verse: V(3, 59) }
  };

  // 3.36: direction of digbala, as the house (from lagna) that faces it.
  const DIGBALA_HOUSE = { Mercury: 1, Jupiter: 1, Sun: 10, Mars: 10, Saturn: 7, Moon: 4, Venus: 4 };
  const DIRECTION_HI = { 1: 'पूर्व (लग्न)', 10: 'दक्षिण (दशम)', 7: 'पश्चिम (सप्तम)', 4: 'उत्तर (चतुर्थ)' };

  const NATURAL_MALEFIC = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const DEFAULT_KSHINA_LIMIT = 96; // degrees of Sun–Moon separation; see lab_ch01_03.json (interpretation)

  const norm360 = x => ((x % 360) + 360) % 360;
  const houseFrom = (fromSign, toSign) => ((toSign - fromSign + 12) % 12) + 1;

  function naturalRelation(planet, other) {
    const t = NATURAL[planet];
    if (!t || planet === other) return null;
    if (t.friends.includes(other)) return 'friend';
    if (t.enemies.includes(other)) return 'enemy';
    return 'neutral';
  }

  /** 3.50–55 + 3.63: dignity of a planet at sign/degree. */
  function dignity(planet, sign, deg) {
    if (!EXALT[planet]) return { key: 'none', label: 'परिभाषित नहीं', verses: [V(3, 50)] };
    const [exSign, exDeg] = EXALT[planet];
    const debSign = (exSign + 6) % 12;
    const mt = MOOLA[planet];
    const lord = SIGN_LORD[sign];
    const base = { planet, sign, deg, signName: SIGN_HI[sign], lord, lordVerse: SIGN_LORD_VERSE[sign] };

    if (sign === mt.sign && deg >= mt.from && deg < mt.to) {
      return Object.assign(base, { key: 'moolatrikona', label: 'मूलत्रिकोण', verses: [mt.verse],
        reason: `${NAME_HI[planet]} का मूलत्रिकोण ${SIGN_HI[mt.sign]} ${mt.from}°–${mt.to}° है` });
    }
    // Moon and Mercury: the verse limits उच्च to the degrees before their मूलत्रिकोण
    // in the same sign (3.52, 3.53); after the मूलत्रिकोण comes स्वगृह.
    if (sign === exSign && !(mt.sign === exSign && deg >= mt.from)) {
      const dist = Math.abs(deg - exDeg);
      return Object.assign(base, { key: 'exalt', label: dist < 1 ? 'परम उच्च' : 'उच्च', verses: [V(3, 50), V(3, 51)],
        reason: `${NAME_HI[planet]} की उच्च राशि ${SIGN_HI[exSign]}, परम उच्च ${exDeg}°` });
    }
    if (sign === debSign) {
      const dist = Math.abs(deg - exDeg);
      return Object.assign(base, { key: 'debil', label: dist < 1 ? 'परम नीच' : 'नीच', verses: [V(3, 51)],
        reason: `उच्च राशि ${SIGN_HI[exSign]} से सातवीं ${SIGN_HI[debSign]} नीच है, परम नीच ${exDeg}°` });
    }
    if (lord === planet) {
      return Object.assign(base, { key: 'own', label: 'स्वगृह', verses: [SIGN_LORD_VERSE[sign]].concat(mt.sign === sign ? [mt.verse] : []),
        reason: `${SIGN_HI[sign]} का स्वामी स्वयं ${NAME_HI[planet]} है` });
    }
    const rel = naturalRelation(planet, lord);
    const key = { friend: 'friend_sign', neutral: 'neutral_sign', enemy: 'enemy_sign' }[rel];
    const label = { friend: 'मित्र-गृह', neutral: 'सम-गृह', enemy: 'शत्रु-गृह' }[rel];
    return Object.assign(base, { key, label, verses: [SIGN_LORD_VERSE[sign], NATURAL[planet].verse],
      reason: `${SIGN_HI[sign]} का स्वामी ${NAME_HI[lord]}, जो ${NAME_HI[planet]} का नैसर्गिक ${{ friend: 'मित्र', neutral: 'सम', enemy: 'शत्रु' }[rel]} है` });
  }

  /** 3.63–64: share of auspicious result by dignity (combust/अस्त is not decided here). */
  const STHANA_FRACTION = { exalt: 1, moolatrikona: 0.75, own: 0.5, friend_sign: 0.25, neutral_sign: 0.125, enemy_sign: 0, debil: 0 };
  const FRACTION_HI = { 1: 'पूर्ण (1)', 0.75: 'पौन (¾)', 0.5: 'आधा (½)', 0.25: 'चौथाई (¼)', 0.125: 'आठवाँ भाग (⅛)', 0: 'शून्य (0)' };
  function sthanaPhala(planet, sign, deg) {
    const d = dignity(planet, sign, deg);
    if (!(d.key in STHANA_FRACTION)) return null;
    const shubha = STHANA_FRACTION[d.key];
    return { dignity: d, shubha, ashubha: 1 - shubha, label: FRACTION_HI[shubha], verses: [V(3, 63), V(3, 64)].concat(d.verses) };
  }

  /** 3.60: tatkalika relation from the two signs. */
  function temporalRelation(signA, signB) {
    const h = houseFrom(signA, signB);
    const friend = [2, 3, 4, 10, 11, 12].includes(h);
    return { relation: friend ? 'friend' : 'enemy', house: h, verses: [V(3, 60)] };
  }

  /** 3.61–62: पञ्चधा मैत्री. */
  function compoundRelation(natural, temporal) {
    if (natural === 'friend' && temporal === 'friend') return 'adhimitra';
    if (natural === 'neutral' && temporal === 'friend') return 'mitra';
    if (natural === 'enemy' && temporal === 'enemy') return 'adhishatru';
    if (natural === 'neutral' && temporal === 'enemy') return 'shatru';
    return 'sama'; // friend+enemy or enemy+friend
  }
  const RELATION_HI = { friend: 'मित्र', neutral: 'सम', enemy: 'शत्रु', adhimitra: 'अधिमित्र', mitra: 'मित्र', sama: 'सम', shatru: 'शत्रु', adhishatru: 'अधिशत्रु' };

  function planetMap(chart) {
    const m = {};
    (chart.planets || []).forEach(p => { m[p.id] = p; });
    return m;
  }

  function relationshipMatrix(chart) {
    const P = planetMap(chart);
    const rows = {};
    SEVEN.forEach(a => {
      rows[a] = {};
      SEVEN.forEach(b => {
        if (a === b) return;
        const nat = naturalRelation(a, b);
        const tmp = temporalRelation(P[a].sign, P[b].sign);
        const comp = compoundRelation(nat, tmp.relation);
        rows[a][b] = { natural: nat, temporal: tmp.relation, house: tmp.house, compound: comp,
          verses: [NATURAL[a].verse, V(3, 60), V(3, 61), V(3, 62)] };
      });
    });
    return rows;
  }

  /** 3.11–12: natural benefic/malefic, with the Moon and Mercury conditions. */
  function nature(chart, opts) {
    const limit = (opts && opts.kshinaLimit) || DEFAULT_KSHINA_LIMIT;
    const P = planetMap(chart);
    const elong = norm360(P.Moon.abs - P.Sun.abs);
    const sep = Math.min(elong, 360 - elong);
    const moonKshina = sep < limit;
    const out = {};
    NINE.forEach(id => {
      if (!P[id]) return;
      if (NATURAL_MALEFIC.includes(id)) {
        out[id] = { nature: 'papa', reason: `${NAME_HI[id]} सदा पाप ग्रह है`, verses: [V(3, 11)] };
      } else if (id === 'Moon') {
        out[id] = moonKshina
          ? { nature: 'papa', reason: `सूर्य से केवल ${sep.toFixed(1)}° दूर — क्षीण चन्द्र (सीमा ${limit}°)`, verses: [V(3, 11)], interpretation: true }
          : { nature: 'saumya', reason: `सूर्य से ${sep.toFixed(1)}° दूर — अक्षीण चन्द्र`, verses: [V(3, 11), V(3, 12)], interpretation: true };
        out[id].paksha = elong < 180 ? 'शुक्ल' : 'कृष्ण';
      } else if (id === 'Mercury') {
        const withPapa = NINE.filter(o => o !== 'Mercury' && P[o] && P[o].sign === P.Mercury.sign &&
          (NATURAL_MALEFIC.includes(o) || (o === 'Moon' && moonKshina)));
        out[id] = withPapa.length
          ? { nature: 'papa', reason: `पाप ग्रह (${withPapa.map(o => NAME_HI[o]).join(', ')}) के साथ एक राशि में`, verses: [V(3, 11)] }
          : { nature: 'saumya', reason: 'किसी पाप ग्रह के साथ नहीं', verses: [V(3, 12)] };
      } else {
        out[id] = { nature: 'saumya', reason: `${NAME_HI[id]} सौम्य ग्रह है`, verses: [V(3, 12)] };
      }
    });
    return { planets: out, moonSeparation: sep, kshinaLimit: limit };
  }

  /** 3.12 (second line): lords of trikona are auspicious, of 3/6/11 inauspicious, for this lagna. */
  function functionalNature(chart) {
    const lagna = planetMap(chart).Lagna.sign;
    const out = {};
    SEVEN.forEach(id => {
      const houses = [];
      for (let h = 1; h <= 12; h++) if (SIGN_LORD[(lagna + h - 1) % 12] === id) houses.push(h);
      const good = houses.filter(h => [1, 5, 9].includes(h));
      const bad = houses.filter(h => [3, 6, 11].includes(h));
      const verdict = good.length && bad.length ? 'mixed' : good.length ? 'shubha' : bad.length ? 'ashubha' : 'neutral';
      out[id] = { houses, verdict, verses: [V(3, 12)] };
    });
    return out;
  }

  /** 3.36: is the planet in the house of its direction? */
  function digbala(chart) {
    const P = planetMap(chart);
    const lagna = P.Lagna.sign;
    const out = {};
    SEVEN.forEach(id => {
      const want = DIGBALA_HOUSE[id];
      const house = houseFrom(lagna, P[id].sign);
      out[id] = { house, strongHouse: want, direction: DIRECTION_HI[want], strong: house === want, verses: [V(3, 36)] };
    });
    return out;
  }

  /** 3.37–38: day/night, paksha and ayana strength. */
  function kaalabala(chart, natureResult) {
    const P = planetMap(chart);
    const bd = chart.birthDetails || {};
    const isDay = bd.birthLocalHrs >= bd.sunriseHrs && bd.birthLocalHrs < bd.sunsetHrs;
    const elong = norm360(P.Moon.abs - P.Sun.abs);
    const shukla = elong < 180;
    const ayan = (chart.astronomy && chart.astronomy.ayanamsa_deg) || 0;
    const nat = natureResult || nature(chart);
    const NIGHT = ['Moon', 'Mercury', 'Saturn']; // as printed in 3.37 (see interpretation note)
    const out = {};
    SEVEN.forEach(id => {
      const benefic = nat.planets[id].nature === 'saumya';
      const dayNight = id === 'Mercury' ? true : (isDay ? !NIGHT.includes(id) : NIGHT.includes(id));
      const paksha = shukla ? benefic : !benefic;
      const sayana = norm360(P[id].abs + ayan);
      const north = sayana < 180;
      const ayana = north ? benefic : !benefic;
      out[id] = { dayNight, paksha, ayana, benefic, sayana, verses: [V(3, 37), V(3, 38)] };
    });
    return { isDay, shukla, planets: out };
  }

  /** Everything the lab page needs for one chart. */
  function analyze(chart, opts) {
    const P = planetMap(chart);
    const nat = nature(chart, opts);
    const planets = {};
    SEVEN.forEach(id => {
      const p = P[id];
      planets[id] = { id, name: NAME_HI[id], sign: p.sign, signName: SIGN_HI[p.sign], deg: p.deg, house: houseFrom(P.Lagna.sign, p.sign),
        dignity: dignity(id, p.sign, p.deg), sthana: sthanaPhala(id, p.sign, p.deg) };
    });
    return {
      lagna: { sign: P.Lagna.sign, signName: SIGN_HI[P.Lagna.sign], deg: P.Lagna.deg },
      planets,
      nature: nat,
      functional: functionalNature(chart),
      relations: relationshipMatrix(chart),
      digbala: digbala(chart),
      kaalabala: kaalabala(chart, nat)
    };
  }

  return {
    SEVEN, NINE, NAME_HI, SIGN_HI, SIGN_LORD, SIGN_LORD_VERSE, EXALT, MOOLA, NATURAL, DIGBALA_HOUSE, RELATION_HI, FRACTION_HI,
    naturalRelation, dignity, sthanaPhala, temporalRelation, compoundRelation, relationshipMatrix,
    nature, functionalNature, digbala, kaalabala, analyze
  };
});
