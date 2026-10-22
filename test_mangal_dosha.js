const assert = require('assert');
const { calculateMangalDoshaReport, getRelativeHouse, extractMangalDoshaContract } = require('./mangalDoshaService.js');

console.log("=== RUNNING MANGAL DOSHA & 14 PARIHARA ENGINE TESTS ===");

// TEST 1: User's Exact PRD Specification JSON
const prdInput = {
  "jataka_info": {
    "name": "श्रीधर मिश्र",
    "gender": "male",
    "dob": "1995-05-15",
    "tob": "10:30",
    "pob": "Varanasi, UP"
  },
  "d1": {
    "lagna": { "rashi": 1, "degree": 12.45 },
    "Sun":     { "house": 7, "rashi": 7, "degree": 28.10, "is_retrograde": false, "is_combust": false },
    "Moon":    { "house": 4, "rashi": 4, "degree": 14.22, "is_retrograde": false, "is_combust": false },
    "Mars":    { "house": 7, "rashi": 7, "degree": 18.05, "is_retrograde": false, "is_combust": false, "state": "yuva" },
    "Jupiter": { "house": 11, "rashi": 11, "degree": 5.12, "is_retrograde": false, "is_combust": false },
    "Venus":   { "house": 8, "rashi": 8, "degree": 22.30, "is_retrograde": false, "is_combust": false },
    "Saturn":  { "house": 12, "rashi": 12, "degree": 9.40, "is_retrograde": false, "is_combust": false },
    "Rahu":    { "house": 6, "rashi": 6, "degree": 11.15, "is_retrograde": true, "is_combust": false },
    "Ketu":    { "house": 12, "rashi": 12, "degree": 11.15, "is_retrograde": true, "is_combust": false }
  },
  "d9": {
    "lagna": { "rashi": 5 },
    "Mars":  { "house": 7, "rashi": 7 },
    "Moon":  { "house": 1, "rashi": 1 },
    "Venus": { "house": 4, "rashi": 4 }
  },
  "partner_d1": null
};

const res1 = calculateMangalDoshaReport(prdInput, 'hi');
console.log("\n[TEST 1 Result - PRD Input]:");
console.log("Jataka:", res1.jataka_name);
console.log("Gross Score:", res1.gross_dosha_percentage + "%");
console.log("Parihara Deduction:", res1.parihara_deduction_percentage + "%");
console.log("Net Dosha:", res1.net_dosha_percentage + "%");
console.log("Category:", res1.dosha_category);
console.log("Badge:", res1.badge_color);
console.log("Applied Pariharas Count:", res1.applied_pariharas.length);
res1.applied_pariharas.forEach(p => {
  console.log(`  - Parihara ${p.rule_id}: ${p.title} (-${p.deduction}%)`);
});

assert.strictEqual(res1.gross_dosha_percentage, 100, "Gross score must be 100% (Lagna 50 + Moon 30 + Venus 20)");
assert.strictEqual(res1.tri_lagna_breakup[0].points, 50, "Lagna score 50");
assert.strictEqual(res1.tri_lagna_breakup[1].points, 30, "Moon score 30");
assert.strictEqual(res1.tri_lagna_breakup[2].points, 20, "Venus score 20");
assert.strictEqual(res1.d9_validation.is_vargottama, true, "Mars in 7th rashi in D1 and D9 is Vargottama");

// Pariharas triggered in Test 1:
// 1. Agastya Samhita: 7th house Libra (Tula) -> -50%
// 3. Vargottama Mars in D9: rashi 7 == 7 -> -30%
// 4. Jupiter in 11, Mars in 7: getRelativeHouse(11, 7) = 9 (Jupiter 9th aspect) -> -40%
// 13. Age >= 28: born 1995 -> -30%
// Total raw deductions = 50 + 30 + 40 + 30 = 150%. Clamped finalDeduction = 100%. Net Dosha = 0%.
console.log("Raw Deductions:", res1.raw_deduction_percentage + "% -> Clamped:", res1.parihara_deduction_percentage + "%");

// TEST 2: Zero Gross Dosha (Mars in 3rd house from all)
const zeroDoshaInput = {
  jataka_info: { name: "Anand", dob: "2005-01-01" },
  d1: {
    lagna: { rashi: 1 },
    Mars: { house: 3, rashi: 3, degree: 15.0 },
    Moon: { house: 1, rashi: 1 },
    Venus: { house: 1, rashi: 1 },
    Jupiter: { house: 2, rashi: 2 }
  },
  d9: {
    Mars: { house: 2, rashi: 4 }
  }
};
const resZero = calculateMangalDoshaReport(zeroDoshaInput, 'hi');
console.log("\n[TEST 2 Result - Zero Gross Dosha]:", resZero.net_dosha_percentage, resZero.dosha_category);
assert.strictEqual(resZero.gross_dosha_percentage, 0, "Should have 0 gross score");
assert.strictEqual(resZero.net_dosha_percentage, 0, "Should have 0 net dosha");
assert.strictEqual(resZero.is_manglik, false);

// TEST 3: Severe Mangal Dosha (No pariharas triggered)
const severeInput = {
  jataka_info: { name: "Rohan", dob: "2010-01-01" }, // age < 28
  d1: {
    lagna: { rashi: 1 },
    Mars: { house: 1, rashi: 7, degree: 14.0 }, // 1st house in Libra (not Aries, so Parihara 1 & 2 fail)
    Moon: { house: 10, rashi: 4 }, // from Moon: getRelativeHouse(10, 1) = 4 (Dosha house +30)
    Venus: { house: 6, rashi: 1 }, // from Venus: getRelativeHouse(6, 1) = 8 (Dosha house +20, and 6 is not kendra/trikona)
    Jupiter: { house: 2, rashi: 8 } // from Jupiter: getRelativeHouse(2, 1) = 12 (no aspect, 2nd house is not kendra/trikona)
  },
  d9: {
    Mars: { house: 8, rashi: 2 } // not vargottama, not upachaya (8), not jupiter sign
  }
};
const resSevere = calculateMangalDoshaReport(severeInput, 'hi');
console.log("\n[TEST 3 Result - Severe Manglik]: Gross:", resSevere.gross_dosha_percentage, "Net:", resSevere.net_dosha_percentage, resSevere.dosha_category);
assert.strictEqual(resSevere.gross_dosha_percentage, 100);
assert.strictEqual(resSevere.net_dosha_percentage, 100);
assert.strictEqual(resSevere.badge_color, "Red");
assert.strictEqual(resSevere.spouse_recommendation.must_marry_manglik, true);

// TEST 4: Partner Matching Counter-Dosha (Parihara 14 - Samdosha)
const severeWithPartner = JSON.parse(JSON.stringify(severeInput));
severeWithPartner.partner_d1 = {
  Saturn: { house: 7 } // Partner has Saturn in 7th
};
const resPartner = calculateMangalDoshaReport(severeWithPartner, 'hi');
console.log("\n[TEST 4 Result - Partner Counter Dosha]: Net:", resPartner.net_dosha_percentage, resPartner.dosha_category);
assert.strictEqual(resPartner.net_dosha_percentage, 0, "Partner counter-dosha should cancel dosha to 0");
assert.strictEqual(resPartner.applied_pariharas.some(p => p.rule_id === 14), true, "Parihara 14 applied");

// TEST 5: English language test
const resEn = calculateMangalDoshaReport(prdInput, 'en');
console.log("\n[TEST 5 Result - English Localization]: Category:", resEn.dosha_category);
assert.strictEqual(typeof resEn.dosha_category, "string");
assert.strictEqual(resEn.report_title, "Classical Mangal Dosha & Authentic Parihara Certification");

console.log("\n✅ ALL MANGAL DOSHA ENGINE TESTS PASSED PERFECTLY!");
