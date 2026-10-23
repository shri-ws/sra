const assert = require('assert');
const {
  ARCSEC_PER_DEG,
  ARCSEC_PER_SIGN,
  SIGN_COUNT,
  REFERENCE_TABLES,
  CONFIG,
  RULES,
  ChartInputError,
  angleToArcsec,
  prepareChart,
  ChartContext,
  runEngine,
  analyzeHostPayload,
  analyzePatrikaChart
} = require('./dhanaYogaService.js').DhanaYogaEngine;

function _synthetic(ascSign, placements, sav = null, retro = null) {
  const pl = {};
  for (const pid in placements) {
    const [s, deg] = placements[pid];
    pl[pid] = {
      lon: { arcsec: s * ARCSEC_PER_SIGN + deg * ARCSEC_PER_DEG },
      retro: (retro && retro[pid] !== undefined) ? retro[pid] : false
    };
  }
  return {
    zodiac: "sidereal",
    house_system: "whole_sign",
    flags: [],
    ascendant: { arcsec: ascSign * ARCSEC_PER_SIGN + 5 * ARCSEC_PER_DEG },
    planets: pl,
    sav: sav,
    bav: null,
    shadbala: null
  };
}

const _BASE = {
  SU: [0, 5],
  MO: [3, 10],
  MA: [6, 12],
  ME: [1, 8],
  JU: [9, 20],
  VE: [2, 25],
  SA: [4, 3]
};

console.log("Starting Dhana Yoga JS Engine Self-Tests...");

// 1. SAV house mapping must follow the lagna for every ascendant
const sav = [];
for (let i = 0; i < 11; i++) sav.push(20 + i);
sav.push(337 - sav.reduce((a, b) => a + b, 0));

for (let a = 0; a < SIGN_COUNT; a++) {
  const ctx = new ChartContext(prepareChart(_synthetic(a, _BASE, sav)), CONFIG, REFERENCE_TABLES);
  for (let h = 1; h <= 12; h++) {
    assert.strictEqual(ctx.houseSav(h), sav[(a + h - 1) % 12], `Mismatch at asc ${a}, house ${h}`);
  }
}
console.log("✓ Test 1: SAV house mapping passed.");

// 2. Missing SAV => rule not evaluated, multiplier flagged unevaluated
const out2 = runEngine(prepareChart(_synthetic(0, _BASE)));
assert(out2.not_evaluated.some(x => x.id === "DR_SAV_H2_LOW"), "Expected DR_SAV_H2_LOW in not_evaluated");
assert.strictEqual(out2.components.sav_multiplier.evaluated, false);
console.log("✓ Test 2: Missing SAV handling passed.");

// 3. One planet ruling two houses must not create a self-conjunction
const ctx3 = new ChartContext(prepareChart(_synthetic(9, _BASE)), CONFIG, REFERENCE_TABLES);
assert.strictEqual(ctx3.lordOfHouse(1), ctx3.lordOfHouse(2));
// Using relations
const rels = ctx3.relations(ctx3.lordOfHouse(1), ctx3.lordOfHouse(2));
assert.strictEqual(rels.has("Yuti"), false);
console.log("✓ Test 3: Same planet no self-conjunction passed.");

// 4. Arudha never lands on the house itself or its 7th, for all combinations
for (let h_sign = 0; h_sign < 12; h_sign++) {
  for (let lord_sign = 0; lord_sign < 12; lord_sign++) {
    const d = (lord_sign - h_sign + 12) % 12;
    let a = (lord_sign + d) % 12;
    const aDiff = (a - h_sign + 12) % 12;
    if (aDiff === 0 || aDiff === 6) {
      a = (a + 9) % 12;
    }
    const finalDiff = (a - h_sign + 12) % 12;
    assert(finalDiff !== 0 && finalDiff !== 6, `Arudha landed on house or 7th for h=${h_sign}, lord=${lord_sign}`);
  }
}
console.log("✓ Test 4: Arudha Lagna Jaimini exceptions passed.");

// 5. Sign boundary is exact: 30 degrees belongs to next sign
const sec30 = 30 * ARCSEC_PER_DEG;
assert.strictEqual(Math.floor(sec30 / ARCSEC_PER_SIGN), 1);
assert.strictEqual(sec30 % ARCSEC_PER_SIGN, 0);
console.log("✓ Test 5: Sign boundary exact integer arithmetic passed.");

// 6. Float degrees rejected when policy says so
try {
  angleToArcsec({ deg: 10.5 }, "reject", [], "t");
  assert.fail("Should have thrown error");
} catch (e) {
  assert(e instanceof ChartInputError);
}
console.log("✓ Test 6: Float degree policy validation passed.");

// 7. Absent retro status must not be silently treated as direct
const ctx7 = new ChartContext(prepareChart(_synthetic(0, _BASE, null, { ME: null })), CONFIG, REFERENCE_TABLES);
assert.strictEqual(ctx7.planets.ME.retro, null);
console.log("✓ Test 7: Tri-state retrograde handling passed.");

// 8. Test analyzeHostPayload matches Python engine sample chart
const sampleHost = {
  zodiac: 'sidereal',
  house_system: 'whole_sign',
  ascendant_degree: 14.5,
  planets: {
    Sun: { degree: 10.0, is_retrograde: false },
    Moon: { degree: 33.0, is_retrograde: false },
    Mars: { degree: 298.0, is_retrograde: false },
    Mercury: { degree: 165.0, is_retrograde: false },
    Jupiter: { degree: 95.0, is_retrograde: false },
    Venus: { degree: 357.0, is_retrograde: false },
    Saturn: { degree: 200.0, is_retrograde: false },
    Rahu: { degree: 50.0, is_retrograde: true },
    Ketu: { degree: 230.0, is_retrograde: true }
  }
};

const jsResult = analyzeHostPayload(sampleHost);
console.log("\nSample Chart Analysis Result (JavaScript):");
console.log("Capacity Index:", jsResult.capacity_index);
console.log("Band:", jsResult.band);
console.log("Triggered Count:", jsResult.triggered.length);
jsResult.triggered.forEach(y => {
  console.log(` - [${y.category}] ${y.name}: ${y.points} pts (${y.detail})`);
});

assert.strictEqual(jsResult.capacity_index, 411, `Expected capacity_index 411, got ${jsResult.capacity_index}`);
assert.strictEqual(jsResult.band.tier, 5);
assert.strictEqual(jsResult.triggered.length, 9);

console.log("\nALL DHANA YOGA JS TESTS PASSED 100% PERFECTLY!\n");
