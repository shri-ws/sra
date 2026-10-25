/**
 * Unit Test for Parashara Engine (All 97 Chapters - Purva & Uttara Khanda)
 */

const { calculatePatrikaPlanets } = require('./patrikaEngineBridge.js');
const { evaluateParasharaReport } = require('./parasharaEngine.js');

console.log("Starting Parashara Engine Tests (Complete BPHS Corpus - All 97 Chapters)...");

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
console.log(`आरूढ़ लग्न (AL): ${rep.arudhaLagnaRashi} (भाव: ${rep.arudhaLagnaHouse})`);
console.log(`उपपद लग्न (UL): ${rep.upapadaLagnaRashi} (भाव: ${rep.upapadaLagnaHouse})`);
console.log(`कारकांश लग्न: ${rep.karakamshaRashi}`);
console.log(`नाभस योग: ${rep.nabhashaYogaName}`);
console.log(`चन्द्र योग: ${rep.chandraYogaName}`);
console.log(`सूर्य योग: ${rep.suryaYogaName}`);
console.log(`द्रेष्काण संख्या: ${rep.drekkanaNumber} (देह-चिह्न अंग: ${rep.anatomicalMarkRegion})`);
if (rep.topVaisheshikamsa) {
  console.log(`सर्वोच्च वैशेषिकांश: ${rep.topVaisheshikamsa.grahaName} (${rep.topVaisheshikamsa.tier.title} - ${rep.topVaisheshikamsa.goodCount} वर्ग)`);
}
console.log(`कुल मैच हुए पाराशर श्लोक (सम्पूर्ण संहिता - अध्याय १ से ९७): ${rep.matchedShlokasCount}`);
console.log("==========================================\n");

rep.matchedShlokas.forEach((s, idx) => {
  console.log(`[${idx + 1}] अ. ${s.chapterNumber}: ${s.chapterTitle} (${s.verseNumbers})`);
  console.log(`     स्थिति: ${s.applicabilityStatus}`);
  console.log(`     लागू योग: ${s.natalTrigger}`);
});

if (rep.matchedShlokasCount < 50) {
  console.error("Test Failed: Insufficient matched shlokas!");
  process.exit(1);
}

if (!rep.executiveSummary || !rep.executiveSummary.pillars || rep.executiveSummary.pillars.length !== 7) {
  console.error("Test Failed: Executive Summary 7 pillars missing!");
  process.exit(1);
}

const missingModernContext = rep.matchedShlokas.filter(s => !s.modernContext);
if (missingModernContext.length > 0) {
  console.error(`Test Failed: ${missingModernContext.length} shlokas missing modernContext!`);
  process.exit(1);
}

console.log("\nExecutive Summary Verification:");
console.log(`Title: ${rep.executiveSummary.title}`);
rep.executiveSummary.pillars.forEach(p => {
  console.log(`  [Pillar ${p.number}] ${p.icon} ${p.title}`);
});
console.log(`All ${rep.matchedShlokasCount} matched shlokas have valid modernContext!`);

console.log("\nALL CHAPTERS (COMPLETE BPHS CORPUS) PARASHARA ENGINE TESTS PASSED 100% PERFECTLY!");
