/**
 * BPHS Lab — Chapter 27 (ग्रहस्पष्टदृष्टिविवेचनाध्याय): the exact (sphuta) aspect value
 * ─────────────────────────────────────────────────────────────
 * 27.5: subtract the seer's longitude from the seen; call the remainder R = s signs + x degrees.
 *   R > 6 signs:  (10 signs − R) in degrees ÷ 2        (27.5)
 *   R > 5 signs:  x × 2                                  (27.6)
 *   R > 4 signs:  5 signs − R, in degrees                (27.6)
 *   R > 3 signs:  (4 signs − R) ÷ 2 + 30                 (27.6–7)
 *   R > 2 signs:  x + 15                                 (27.7)
 *   R > 1 sign:   x ÷ 2                                  (27.8)
 * Special rules (27.9–12):
 *   शनि: R in the 1st sign x × 2; 2nd: 60 − x/2; 8th: x + 30; 9th: (30 − x) × 2
 *   मंगल: 2nd: x × 1.5 + 15; 3rd and 7th: 60 − x; 6th: full (60)
 *   गुरु: 3rd and 7th: x/2 + 45; 4th and 8th: 60 − 2x
 * ("sign" here is the count of whole signs in R, starting from 0.) Full aspect is 60.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BphsLabCh27 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const V = (ch, n) => `BPHS.27.${n}`;
  const SEERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  /** Aspect value (0–60) of `seer` at longitude `from` on a point at longitude `to`, with the rule used. */
  function drishti(seer, from, to) {
    const R = ((to - from) % 360 + 360) % 360;
    const s = Math.floor(R / 30), x = R - s * 30;
    const rule = (value, text, verses) => ({ value: Math.max(0, Math.min(60, value)), R, s, x, text, verses });
    if (seer === 'Saturn') {
      if (s === 1) return rule(x * 2, 'शनि: शेष 1 राशि से अधिक — अंश × 2', [V(27, 9), V(27, 10)]);
      if (s === 2) return rule(60 - x / 2, 'शनि: शेष 2 राशि से अधिक — 60 − अंश/2', [V(27, 10)]);
      if (s === 8) return rule(x + 30, 'शनि: शेष 8 राशि से अधिक — अंश + 30', [V(27, 10)]);
      if (s === 9) return rule((30 - x) * 2, 'शनि: शेष 9 राशि से अधिक — भोग्य अंश × 2', [V(27, 9)]);
    }
    if (seer === 'Mars') {
      if (s === 2) return rule(x * 1.5 + 15, 'मंगल: शेष 2 राशि से अधिक — डेढ़ गुने अंश + 15', [V(27, 11)]);
      if (s === 3 || s === 7) return rule(60 - x, `मंगल: शेष ${s} राशि से अधिक — 60 − भुक्त अंश`, [V(27, 11)]);
      if (s === 6) return rule(60, 'मंगल: शेष 6 राशि से अधिक — पूर्ण', [V(27, 11)]);
    }
    if (seer === 'Jupiter') {
      if (s === 3 || s === 7) return rule(x / 2 + 45, `गुरु: शेष ${s} राशि से अधिक — अंश/2 + 45`, [V(27, 12)]);
      if (s === 4 || s === 8) return rule(60 - 2 * x, `गुरु: शेष ${s} राशि से अधिक — 60 − 2 × अंश`, [V(27, 12)]);
    }
    if (s >= 10 || s === 0) return rule(0, 'शेष 1 राशि से कम या 10 राशि से अधिक — दृष्टि नहीं', [V(27, 5)]);
    if (s >= 6) return rule((300 - R) / 2, 'शेष 6 राशि से अधिक — (10 राशि − शेष) ÷ 2', [V(27, 5)]);
    if (s === 5) return rule(x * 2, 'शेष 5 राशि से अधिक — अंश × 2', [V(27, 6)]);
    if (s === 4) return rule(150 - R, 'शेष 4 राशि से अधिक — 5 राशि − शेष', [V(27, 6)]);
    if (s === 3) return rule((120 - R) / 2 + 30, 'शेष 3 राशि से अधिक — (4 राशि − शेष) ÷ 2 + 30', [V(27, 6), V(27, 7)]);
    if (s === 2) return rule(x + 15, 'शेष 2 राशि से अधिक — अंश + 15', [V(27, 7)]);
    return rule(x / 2, 'शेष 1 राशि से अधिक — अंश ÷ 2', [V(27, 8)]);
  }

  /** Matrix of aspect values: each of the seven seers on each body of the chart (planets and lagna). */
  function matrix(chart) {
    const P = {}; chart.planets.forEach(p => { P[p.id] = p; });
    const targets = ['Lagna'].concat(SEERS, ['Rahu', 'Ketu']).filter(id => P[id]);
    const out = {};
    SEERS.forEach(a => { out[a] = {}; targets.forEach(b => { if (a !== b) out[a][b] = drishti(a, P[a].abs, P[b].abs); }); });
    return { seers: SEERS, targets, values: out };
  }

  return { SEERS, drishti, matrix };
});
