const assert = require('assert');
const { calculateMangalDoshaReport, getRelativeHouse, extractMangalDoshaContract, isMarsDashaActiveInWindow } = require('./mangalDoshaService.js');

console.log("=== RUNNING MANGAL DOSHA & 21 PARIHARA ENGINE TESTS ===");

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
// 18. Lagnesha Exemption: Aries Lagna (rashi 1) -> -45%
// Total raw deductions = 50 + 30 + 40 + 30 + 45 = 195%. Clamped finalDeduction = 100%. Net Dosha = 0%.
assert.strictEqual(res1.applied_pariharas.some(p => p.rule_id === 18), true, "Rule 18 (Lagnesha) must be applied");
assert.strictEqual(res1.all_pariharas.length, 21, "Total Parihara rules must be 21");
console.log("Raw Deductions:", res1.raw_deduction_percentage + "% -> Clamped:", res1.parihara_deduction_percentage + "%");

// TEST 2: Zero Gross Dosha (Mars in 3rd house from all)
const zeroDoshaInput = {
  jataka_info: { name: "Anand", dob: "2005-01-01" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 3, rashi: 4, degree: 15.0 },
    Moon: { house: 1, rashi: 2 },
    Venus: { house: 1, rashi: 2 },
    Jupiter: { house: 2, rashi: 3 }
  },
  d9: {
    Mars: { house: 2, rashi: 5 }
  }
};
const resZero = calculateMangalDoshaReport(zeroDoshaInput, 'hi');
console.log("\n[TEST 2 Result - Zero Gross Dosha]:", resZero.net_dosha_percentage, resZero.dosha_category);
assert.strictEqual(resZero.gross_dosha_percentage, 0, "Should have 0 gross score");
assert.strictEqual(resZero.net_dosha_percentage, 0, "Should have 0 net dosha");
assert.strictEqual(resZero.is_manglik, false);

// TEST 3: Severe Mangal Dosha
const severeInput = {
  jataka_info: { name: "Rohan", dob: "2010-01-01", day_of_birth: "Friday" }, // age < 28, not Tuesday
  d1: {
    lagna: { rashi: 2 }, // Taurus Lagna (not Aries or Scorpio, so Rule 18 fails)
    Mars: { house: 1, rashi: 7, degree: 14.0, nakshatra_number: 15 }, // Nakshatra 15 (Swati, not exempt in Rule 16)
    Moon: { house: 10, rashi: 4 }, // from Moon: house 4 (+30)
    Venus: { house: 6, rashi: 1 }, // from Venus: house 8 (+20)
    Jupiter: { house: 2, rashi: 8 } // no aspect, 2nd house
  },
  d9: {
    Mars: { house: 8, rashi: 2 } // not vargottama, not upachaya (8), not jupiter sign
  },
  dasha_info: {
    mars_dasha_active_in_window: true // Dasha is active, so Rule 20 fails
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
  Saturn: { house: 7 }
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

// ─────────────────────────────────────────────────────────────
// SPECIFIC TESTS FOR ADDITIONAL RULES 15 THROUGH 21
// ─────────────────────────────────────────────────────────────

// TEST 6: Rule 15 - South Indian 2nd House in Gemini/Virgo (-30%)
const testRule15Input = {
  jataka_info: { name: "South Indian 2nd House", dob: "2010-01-01" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 2, rashi: 3, degree: 14.0 }, // 2nd house, Gemini (3)
    Moon: { house: 8, rashi: 9 }, // relative house: getRelativeHouse(8, 2) = 7 (Dosha house +30)
    Venus: { house: 2, rashi: 3 }, // conjoined with Mars (+20 from Venus, also Rule 17)
    Jupiter: { house: 3, rashi: 4 }
  }
};
const resRule15 = calculateMangalDoshaReport(testRule15Input, 'hi');
const p15 = resRule15.applied_pariharas.find(p => p.rule_id === 15);
console.log("\n[TEST 6 Result - Rule 15]:", p15 ? p15.title : "Not applied");
assert.ok(p15, "Rule 15 must be applied when Mars is in 2nd house in Gemini (3) or Virgo (6)");
assert.strictEqual(p15.deduction, 30, "Rule 15 deduction must be 30%");
assert.strictEqual(p15.shloka, "द्वितीये बुधराशौ चेत्कुजदोषो न विद्यते।");

// TEST 7: Rule 16 - Nakshatra-based Exemption (1, 5, 10, 17, 19) (-30%)
const testRule16Input = {
  jataka_info: { name: "Nakshatra Native", dob: "2010-01-01" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 1, rashi: 1, degree: 5.0, nakshatra_number: 1 }, // Ashwini nakshatra 1
    Moon: { house: 10, rashi: 10 },
    Venus: { house: 6, rashi: 6 },
    Jupiter: { house: 3, rashi: 3 }
  }
};
const resRule16 = calculateMangalDoshaReport(testRule16Input, 'hi');
const p16 = resRule16.applied_pariharas.find(p => p.rule_id === 16);
console.log("\n[TEST 7 Result - Rule 16]:", p16 ? p16.title : "Not applied");
assert.ok(p16, "Rule 16 must apply for Ashwini (1)");
assert.strictEqual(p16.deduction, 30, "Rule 16 deduction must be 30%");
assert.ok(p16.shloka.includes("अश्विनी मघामूलेषु भौमदोषो न विद्यते।"));

// TEST 8: Rule 17 - Conjunction with Venus or Jupiter (-35%)
const testRule17Input = {
  jataka_info: { name: "Guru-Mangal Yuti", dob: "2010-01-01" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 1, rashi: 2, degree: 15.0 },
    Moon: { house: 10, rashi: 11 },
    Venus: { house: 5, rashi: 6 },
    Jupiter: { house: 1, rashi: 2 } // Conjoined in House 1!
  }
};
const resRule17 = calculateMangalDoshaReport(testRule17Input, 'hi');
const p17 = resRule17.applied_pariharas.find(p => p.rule_id === 17);
console.log("\n[TEST 8 Result - Rule 17]:", p17 ? p17.title : "Not applied");
assert.ok(p17, "Rule 17 must apply for Mars-Jupiter conjunction");
assert.strictEqual(p17.deduction, 35, "Rule 17 deduction must be 35%");
assert.strictEqual(p17.shloka, "गुरुणा भृगुणा वापि युक्ते भौमे न दोषभाक्।");

// TEST 9: Rule 18 - Lagnesha Exemption for Aries/Scorpio (-45%)
const testRule18Input = {
  jataka_info: { name: "Vrishchika Lagna", dob: "2010-01-01" },
  d1: {
    lagna: { rashi: 8 }, // Scorpio Lagna (8)
    Mars: { house: 7, rashi: 2, degree: 15.0 },
    Moon: { house: 1, rashi: 8 },
    Venus: { house: 3, rashi: 10 },
    Jupiter: { house: 2, rashi: 9 }
  }
};
const resRule18 = calculateMangalDoshaReport(testRule18Input, 'hi');
const p18 = resRule18.applied_pariharas.find(p => p.rule_id === 18);
console.log("\n[TEST 9 Result - Rule 18]:", p18 ? p18.title : "Not applied");
assert.ok(p18, "Rule 18 must apply for Scorpio Lagna");
assert.strictEqual(p18.deduction, 45, "Rule 18 deduction must be 45%");
assert.ok(p18.shloka.includes("कुजो यदि स्वयं लग्नेशः सर्वदोषहरो भवेत्॥"));

// TEST 10: Rule 19 - 7th Lord Strong in Kendra/Trikona (-35%)
const testRule19Input = {
  jataka_info: { name: "Strong 7th Lord", dob: "2010-01-01" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 1, rashi: 2, degree: 15.0 },
    Moon: { house: 10, rashi: 11 },
    Venus: { house: 3, rashi: 4 },
    Jupiter: { house: 2, rashi: 3 },
    "7th_lord": {
      planet: "Mars",
      house: 7, // In 7th house (Kendra)
      rashi: 8, // Scorpio (own sign)
      is_own_sign: true,
      is_exalted: false
    }
  }
};
const resRule19 = calculateMangalDoshaReport(testRule19Input, 'hi');
const p19 = resRule19.applied_pariharas.find(p => p.rule_id === 19);
console.log("\n[TEST 10 Result - Rule 19]:", p19 ? p19.title : "Not applied");
assert.ok(p19, "Rule 19 must apply when 7th lord is in own sign in Kendra");
assert.strictEqual(p19.deduction, 35, "Rule 19 deduction must be 35%");
assert.ok(p19.shloka.includes("सप्तमेशे बलोपेते शुभग्रहनिरीक्षिते।"));

// TEST 11: Rule 20 - Absence of Mars Dasha in Marital Window (21-36) (-25%)
const testRule20Input = {
  jataka_info: { name: "No Mars Dasha", dob: "2010-01-01" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 1, rashi: 2, degree: 15.0 },
    Moon: { house: 10, rashi: 11 },
    Venus: { house: 3, rashi: 4 },
    Jupiter: { house: 2, rashi: 3 }
  },
  dasha_info: {
    mars_dasha_active_in_window: false
  }
};
const resRule20 = calculateMangalDoshaReport(testRule20Input, 'hi');
const p20 = resRule20.applied_pariharas.find(p => p.rule_id === 20);
console.log("\n[TEST 11 Result - Rule 20]:", p20 ? p20.title : "Not applied");
assert.ok(p20, "Rule 20 must apply when mars_dasha_active_in_window is false");
assert.strictEqual(p20.deduction, 25, "Rule 20 deduction must be 25%");
assert.ok(p20.shloka.includes("दशाविरोधे जाते तु न दोषः फलदायकः।"));

// TEST 12: Rule 21 - Tuesday Birth Exemption (-20%)
const testRule21Input = {
  jataka_info: { name: "Tuesday Child", dob: "2010-01-01", day_of_birth: "Tuesday" },
  d1: {
    lagna: { rashi: 2 },
    Mars: { house: 1, rashi: 2, degree: 15.0 },
    Moon: { house: 10, rashi: 11 },
    Venus: { house: 3, rashi: 4 },
    Jupiter: { house: 2, rashi: 3 }
  }
};
const resRule21 = calculateMangalDoshaReport(testRule21Input, 'hi');
const p21 = resRule21.applied_pariharas.find(p => p.rule_id === 21);
console.log("\n[TEST 12 Result - Rule 21]:", p21 ? p21.title : "Not applied");
assert.ok(p21, "Rule 21 must apply on Tuesday birth");
assert.strictEqual(p21.deduction, 20, "Rule 21 deduction must be 20%");
assert.strictEqual(p21.shloka, "भौमवारे यदा जन्म कुजदोषो न विद्यते।");

// TEST 13: extractMangalDoshaContract integration
const mockCalc = {
  birthDetails: {
    candidateName: "प्रशांत",
    gender: "male",
    year: 1998,
    month: 10,
    day: 20, // 1998-10-20 was a Tuesday!
    hour: 8,
    minute: 30,
    placeName: "दिल्ली"
  },
  planets: [
    { id: "Lagna", sign: 0, deg: 15.0, abs: 15.0 }, // Aries Lagna
    { id: "Sun", sign: 6, deg: 3.0, abs: 183.0 },
    { id: "Moon", sign: 6, deg: 20.0, abs: 200.0 }, // Chitra Nakshatra
    { id: "Mars", sign: 4, deg: 10.0, abs: 130.0 }, // Leo -> Magha Nakshatra 10!
    { id: "Mercury", sign: 6, deg: 12.0, abs: 192.0 },
    { id: "Jupiter", sign: 10, deg: 27.0, abs: 327.0 },
    { id: "Venus", sign: 5, deg: 25.0, abs: 175.0 },
    { id: "Saturn", sign: 0, deg: 7.0, abs: 7.0 },
    { id: "Rahu", sign: 4, deg: 6.0, abs: 126.0 },
    { id: "Ketu", sign: 10, deg: 6.0, abs: 306.0 }
  ]
};
const contract = extractMangalDoshaContract(mockCalc);
console.log("\n[TEST 13 Result - extractMangalDoshaContract]:");
console.log("Day of birth:", contract.jataka_info.day_of_birth);
console.log("Mars Nakshatra Number:", contract.d1.Mars.nakshatra_number);
console.log("7th Lord:", contract.d1["7th_lord"].planet, "House:", contract.d1["7th_lord"].house);
console.log("Mars Dasha in Window:", contract.dasha_info.mars_dasha_active_in_window);

assert.strictEqual(contract.jataka_info.day_of_birth, "Tuesday", "1998-10-20 is Tuesday");
assert.strictEqual(contract.d1.Mars.nakshatra_number, 10, "Mars at 130 deg is Magha (10)");
assert.strictEqual(contract.d1["7th_lord"].planet, "Venus", "7th Lord for Aries Lagna is Venus");
assert.strictEqual(typeof contract.dasha_info.mars_dasha_active_in_window, "boolean");

const resContract = calculateMangalDoshaReport(contract, 'hi');
console.log("Contract calculation applied rules:", resContract.applied_pariharas.map(p => p.rule_id));
assert.ok(resContract.applied_pariharas.some(p => p.rule_id === 16), "Rule 16 applies because Mars is in Magha (10)");
assert.ok(resContract.applied_pariharas.some(p => p.rule_id === 18), "Rule 18 applies because Lagna is Aries (1)");
assert.ok(resContract.applied_pariharas.some(p => p.rule_id === 21), "Rule 21 applies because born on Tuesday");

console.log("\n✅ ALL 21 MANGAL DOSHA ENGINE & CONTRACT TESTS PASSED PERFECTLY!");

