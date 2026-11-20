// node scripts/test_kaalsarp_rules.js — checks the Kaal Sarp / sarpa rules on hand-made charts
const K = require('../kaalsarpRules.js');
const assert = require('assert');
// sign index 0=Mesh; abs = sign*30 + deg
const mk = (lagna, pl) => ({ planets: [{ id: 'Lagna', abs: lagna * 30 + 5 }].concat(Object.entries(pl).map(([id, [s, d]]) => ({ id, abs: s * 30 + (d || 10) }))) });
const get = (r, id) => r.rules.find(x => x.id === id);

// 1. full Kalasarpa: Rahu in 5th from Mesh lagna (Simha), Ketu Kumbha, all planets Simha..Makar side
let r = K.evaluate(mk(0, { Rahu: [4, 15], Sun: [5], Moon: [6], Mars: [7], Mercury: [5, 20], Jupiter: [8], Venus: [6, 25], Saturn: [9] }));
assert(r.kalasarpa.applies && r.kalasarpa.full, 'full kalasarpa');
assert.strictEqual(r.kalasarpa.name, 'पद्म');
assert(get(r, 'sarpa-shapa-pd').applies, 'PD 12.22: Rahu in 5th');
// 2. not Kalasarpa when planets on both sides
r = K.evaluate(mk(0, { Rahu: [4, 15], Sun: [5], Moon: [1], Mars: [7], Mercury: [5], Jupiter: [8], Venus: [2], Saturn: [9] }));
assert(!r.kalasarpa.applies, 'split chart');
// 3. partial (one planet outside)
r = K.evaluate(mk(0, { Rahu: [4, 15], Sun: [5], Moon: [1], Mars: [7], Mercury: [5], Jupiter: [8], Venus: [6, 3], Saturn: [9] }));
assert(r.kalasarpa.partial, 'partial');
// 4. BPHS 83.10: Rahu in 5th aspected by Mars (Mars in 1st aspects 5th? no: Mars aspects 4,7,8 — put Mars in 10th: 8th from 10th = 5th)
r = K.evaluate(mk(0, { Rahu: [4], Mars: [9], Sun: [2], Moon: [3], Mercury: [2], Jupiter: [1], Venus: [2], Saturn: [6] }));
assert(get(r, 'sarpa-shapa-10').applies, '83.10 Mars 8th aspect');
// 5. Manasagari: Sun, Saturn, Rahu in 7th
r = K.evaluate(mk(0, { Rahu: [6], Sun: [6, 3], Saturn: [6, 20], Moon: [2], Mars: [3], Mercury: [5], Jupiter: [8], Venus: [5] }));
assert(get(r, 'sarpa-dansha-ms').applies, 'sarpadansha');
// 6. Sarpa nabhasa: Sun 1, Mars 4, Saturn 7, benefics not in kendras
r = K.evaluate(mk(0, { Sun: [0], Mars: [3], Saturn: [6], Moon: [1], Mercury: [1], Jupiter: [4], Venus: [11], Rahu: [2] }));
assert(get(r, 'sarpa-nabhasa').applies, 'sarpa nabhasa');
// ...and not when a benefic is in a kendra
r = K.evaluate(mk(0, { Sun: [0], Mars: [3], Saturn: [6], Moon: [9], Mercury: [1], Jupiter: [4], Venus: [11], Rahu: [2] }));
assert(!get(r, 'sarpa-nabhasa').applies, 'benefic in kendra');
// 7. sarpa drekkana: lagna Vrishchik 5° (1st drekkana)
r = K.evaluate({ planets: [{ id: 'Lagna', abs: 7 * 30 + 5 }, { id: 'Rahu', abs: 20 }, { id: 'Sun', abs: 100 }, { id: 'Moon', abs: 130 }, { id: 'Mars', abs: 200 }, { id: 'Mercury', abs: 110 }, { id: 'Jupiter', abs: 250 }, { id: 'Venus', abs: 80 }, { id: 'Saturn', abs: 300 }] });
assert(get(r, 'sarpa-drekkana').applies, 'lagna in sarpa drekkana');
// 8. every rule and remedy carries its shloka source with book and verse
for (const x of r.rules.concat(r.remedies)) {
  assert(x.sources.length, 'sources for ' + x.id);
  for (const s of x.sources) assert(s.granth && (s.status === 'tradition' || s.status === 'modern' || s.text.length || s.arth_hi), 'source fields ' + s.id);
}
assert(r.rules.find(x => x.id === 'kalasarpa').sources[0].status === 'tradition');
// navamsa sanity: 0° Mesh -> Mesh navamsa; 29° Mesh -> Dhanu
assert.strictEqual(K.navamsa(1), 0); assert.strictEqual(K.navamsa(29), 8);

// 9. new BPHS rules
// Rahu in 8th (Vrishchik from Mesh lagna), no benefic contact
r = K.evaluate(mk(0, { Rahu: [7], Sun: [2], Moon: [3], Mars: [9], Mercury: [2], Jupiter: [4], Venus: [4], Saturn: [10] }));
assert(get(r, 'rahu-dasha-dusthana').applies, 'Rahu 8th, no benefic');
// ...but Jupiter aspecting Rahu (Jupiter in 4th: 5th aspect lands on 8th) cancels it
r = K.evaluate(mk(0, { Rahu: [7], Sun: [2], Moon: [10], Mars: [9], Mercury: [2], Jupiter: [3], Venus: [10], Saturn: [10] }));
assert(!get(r, 'rahu-dasha-dusthana').applies, 'Jupiter aspect');
assert(get(r, 'rahu-kendra-trikona').applies === false);
r = K.evaluate(mk(0, { Rahu: [9], Sun: [2], Moon: [3], Mars: [9], Mercury: [2], Jupiter: [4], Venus: [4], Saturn: [10] }));
assert(get(r, 'rahu-kendra-trikona').applies, 'Rahu in 10th');
// 8th lord (Mars for Mesh lagna is lord of 1 and 8) in 6th
r = K.evaluate(mk(0, { Rahu: [9], Sun: [2], Moon: [3], Mars: [5], Mercury: [2], Jupiter: [4], Venus: [4], Saturn: [10] }));
assert(get(r, 'l8-in-6').applies, '8th lord in 6th');
// 10. eclipse births through the real engine (Nagpur-ish coordinates)
const B = require('../patrikaEngineBridge.js');
const at = (date, time, lat, lon) => K.evaluate(B.calculatePatrikaPlanets({ name: 'T', date, time, lat, lon, tz: 5.5 }));
let g = get(at('2009-07-22', '06:30', 25.3176, 82.9739), 'grahan-janma');
assert(g.applies && g.eclipse === 'सूर्य', 'solar eclipse 22 Jul 2009: ' + g.why);
g = get(at('2018-07-28', '01:50', 28.6139, 77.209), 'grahan-janma');
assert(g.applies && g.eclipse === 'चन्द्र', 'lunar eclipse 28 Jul 2018: ' + g.why);
g = get(at('2018-07-20', '12:00', 28.6139, 77.209), 'grahan-janma');
assert(!g.applies, 'ordinary day: ' + g.why);
assert(at('2009-07-22', '06:30', 25.3176, 82.9739).remedies.some(m => m.id === 'grahan-shanti'), 'eclipse shanti offered');
console.log('all Kaal Sarp rule tests passed (' + r.rules.length + ' rules, ' + Object.keys(K.SOURCES).length + ' sources)');
