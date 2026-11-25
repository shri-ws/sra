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
t('Phaladeepika 5.1: strongest base gives the 10th lord, its navamsha lord is the livelihood planet', () => {
  assert.ok(['लग्न', 'चन्द्र', 'सूर्य'].includes(prof.karmesh.from));
  assert.strictEqual(prof.livelihood, 'Mercury');
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

const slots = V.scanRange(fx.days, { lat: 23.2599, lon: 77.4126, tz: 5.5, work: 'vipani', profile: prof });
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
const seva = V.scanRange(fx.days, { lat: 23.2599, lon: 77.4126, tz: 5.5, work: 'seva', profile: prof });
t('Muhurta Chintamani 26: top service slots are on Wed/Fri/Sun/Thu with Sun or Mars in 10/11', () => {
  seva.filter(s => s.tier === 'सर्वश्रेष्ठ').forEach(s => {
    assert.ok(['बुधवार', 'शुक्रवार', 'रविवार', 'गुरुवार'].includes(s.vaar));
    assert.ok(s.positives.some(p => /अर्के कुजे/.test(p.text)));
  });
});
console.log(n + ' tests passed');
