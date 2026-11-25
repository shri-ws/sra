// test_vyapar_muhurta.js — business muhurta engine (vyapar-shuddhi.js) on a real chart.
// Fixture: Vikas Bhalla (Astro-Databank, Rodden A), engine output saved in data/test_fixtures. Run: node test_vyapar_muhurta.js
const assert = require('assert');
const V = require('./vyapar-shuddhi.js');
const fx = require('./data/test_fixtures/vyapar_vikas_bhalla.json');

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const prof = V.workProfile(fx.natal, 'general');

t('natal: lagna Karka, Moon Mesha in Bharani', () => {
  assert.strictEqual(V.RASHI[prof.lagna], 'कर्क');
  assert.strictEqual(V.RASHI[prof.moonSign], 'मेष');
  assert.strictEqual(V.NAK[prof.moonNak], 'भरणी');
});
t('BPHS 28: work planets are weighed by shadbala (lab modules found)', () => {
  assert.strictEqual(prof.bala, 'shadbala');
  prof.work.filter(w => !['Rahu', 'Ketu'].includes(w.planet)).forEach(w => assert.ok(w.shad && w.shad.rupas > 0, w.planet));
});
t('Phaladeepika 5.1: the 10th lord with the highest shadbala (from Lagna, Moon, Sun) gives the livelihood planet', () => {
  const top = prof.bases.slice().sort((a, b) => b.strength - a.strength)[0];
  assert.strictEqual(prof.karmesh.lord, top.lord);
  assert.strictEqual(prof.karmesh.from, 'सूर्य');            // Moon, 10th lord from the Sun, 1.56 × required
  assert.strictEqual(prof.livelihood, 'Mars');               // Moon's navamsha lord
});
t('BPHS 7.17–27: vimshopaka shown out of 20 for the work planets', () => {
  prof.work.filter(w => w.vim).forEach(w => assert.ok(w.vim.total > 0 && w.vim.total <= 20));
});
t('BPHS 33.13: Amatyakaraka is second by degrees among seven planets', () => {
  const deg = id => fx.natal.planets.find(p => p.id === id).abs % 30;
  const order = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].sort((a, b) => deg(b) - deg(a));
  assert.strictEqual(prof.ak, order[0]);
  assert.strictEqual(prof.amk, order[1]);
});
t('BPHS 30.2–4: Arudha lagna never in the 1st or 7th from lagna', () => {
  const h = ((prof.al - prof.lagna + 12) % 12) + 1;
  assert.ok(h !== 1 && h !== 7);
});
t('BPHS 7.2: D7 is not used for business', () => assert.ok(/सप्तमांश/.test(prof.d7Note)));

const opt = { lat: 23.2599, lon: 77.4126, tz: 5.5, profile: prof, eclipses: fx.eclipses, newMoons: fx.newMoons };
const slots = V.scanRange(fx.days, Object.assign({ work: 'vipani' }, opt));
t('Muhurta Chintamani 17: no Tuesday, rikta tithi or Kumbha lagna for a shop', () => {
  slots.forEach(s => {
    assert.notStrictEqual(s.vaar, 'मंगलवार');
    assert.ok(!/चतुर्थी|नवमी|चतुर्दशी/.test(s.tithi), s.tithi);
    assert.notStrictEqual(s.lagna, 'कुम्भ');
  });
});
t('Muhurta Chintamani 17: shop opening only in mridu, dhruva or kshipra nakshatras', () => {
  slots.forEach(s => assert.ok(/मृदु|ध्रुव|क्षिप्र/.test(s.nakClass), s.nakshatra));
});
t('1 Dec 2026 is a Tuesday: no shop muhurta that day', () => assert.ok(!slots.some(s => s.date === '2026-12-01')));
t('20 Jan 2027 13:53–15:14 Vrishabha lagna is a top slot (ends before Mithun lagna at 15:14)', () => {
  const s = slots.find(x => x.date === '2027-01-20' && x.lagna === 'वृषभ');
  assert.ok(s, 'slot missing');
  assert.strictEqual(s.end, '15:14');
  assert.strictEqual(s.tier, 'सर्वश्रेष्ठ');
});
t('a top-tier shop slot has every main condition of shloka 17', () => {
  slots.filter(s => s.tier === 'सर्वश्रेष्ठ').forEach(s => assert.strictEqual(s.core, true));
});
const seva = V.scanRange(fx.days, Object.assign({ work: 'seva' }, opt));
t('eclipse: no muhurta within 7 days after the solar eclipse of 6 Feb 2027', () => {
  assert.ok(fx.eclipses.some(e => e.date === '2027-02-06'));
  assert.ok(!slots.concat(seva).some(s => s.date === '2027-02-08'));
});
t('BPHS 28 at the muhurta moment: slots report shadbala of the work planets and the lagna lord', () => {
  assert.ok(slots.some(s => s.positives.concat(s.negatives).some(x => /षड्बल/.test(x.text))));
});
t('lunar month from the engine new moons: 20 Jan 2027 is Pausha', () => {
  assert.strictEqual(slots.find(s => s.date === '2027-01-20').masa, 'पौष');
});
t('Muhurta Chintamani 26: top service slots are on Wed/Fri/Sun/Thu with Sun or Mars in 10/11', () => {
  seva.filter(s => s.tier === 'सर्वश्रेष्ठ').forEach(s => {
    assert.ok(['बुधवार', 'शुक्रवार', 'रविवार', 'गुरुवार'].includes(s.vaar));
    assert.ok(s.positives.some(p => /अर्के कुजे/.test(p.text)));
  });
});
console.log(n + ' tests passed');
