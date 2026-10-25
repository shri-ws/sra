/**
 * Unit Test for Parashara Engine (Chapters 1 to 20)
 */

const { calculatePatrikaPlanets } = require('./patrikaEngineBridge.js');
const { evaluateParasharaReport } = require('./parasharaEngine.js');

console.log("Starting Parashara Engine Tests...");

// Test with sample chart
const sampleInput = {
  name: "श्रीधर मिश्र",
  gender: "male",
  date: "1993-10-26",
  time: "02:55",
  city: "सीतापुर, उत्तर प्रदेश",
  lat: 27.57,
  lon: 80.68,
  tz: 5.5
};

const calc = calculatePatrikaPlanets(sampleInput);
const rep = evaluateParasharaReport(calc, { name: sampleInput.name });

console.log("\n==========================================");
console.log(`जातक: ${rep.name}`);
console.log(`लग्न: ${rep.lagnaRashi} (${rep.lagnaDegStr}) • चंद्र राशि: ${rep.moonRashi} (${rep.moonDegStr})`);
console.log(`आत्मकारक ग्रह: ${rep.atmakarakaGraha} -> ${rep.atmakarakaAvatar}`);
console.log(`आयुर्वेदिक त्रिदोष: ${rep.ayurvedicDosha}`);
console.log(`इन्दु लग्न: ${rep.induLagnaRashi} (भाव: ${rep.induLagnaHouse})`);
console.log(`द्रेष्काण संख्या: ${rep.drekkanaNumber} (देह-चिह्न अंग: ${rep.anatomicalMarkRegion})`);
if (rep.topVaisheshikamsa) {
  console.log(`सर्वोच्च वैशेषिकांश: ${rep.topVaisheshikamsa.grahaName} (${rep.topVaisheshikamsa.tier.title} - ${rep.topVaisheshikamsa.goodCount} वर्ग)`);
}
console.log(`कुल मैच हुए पाराशर श्लोक (अध्याय १-२०): ${rep.matchedShlokasCount}`);
console.log("==========================================\n");

rep.matchedShlokas.forEach((s, idx) => {
  console.log(`[${idx + 1}] अ. ${s.chapterNumber}: ${s.chapterTitle} (${s.verseNumbers})`);
  console.log(`     स्थिति: ${s.applicabilityStatus}`);
  console.log(`     लागू योग: ${s.natalTrigger}`);
});

if (rep.matchedShlokasCount < 8) {
  console.error("Test Failed: Insufficient matched shlokas!");
  process.exit(1);
}

console.log("\nALL PARASHARA ENGINE TESTS PASSED 100% PERFECTLY!");
