const RASHIS_HINDI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];

// Classical D9 Navamsha Calculation
function calculateD9Navamsha(degVal) {
  const rashiIdx = Math.floor(degVal / 30);
  const degInRashi = degVal % 30;
  const navIdx = Math.floor(degInRashi / 3.3333333333333335); // 3° 20'

  let startSign = 0;
  if (rashiIdx % 3 === 0) { // Movable signs (0, 3, 6, 9): Starts from sign itself
    startSign = rashiIdx;
  } else if (rashiIdx % 3 === 1) { // Fixed signs (1, 4, 7, 10): Starts from 9th sign
    startSign = (rashiIdx + 8) % 12;
  } else { // Dual signs (2, 5, 8, 11): Starts from 5th sign
    startSign = (rashiIdx + 4) % 12;
  }

  const d9SignIdx = (startSign + navIdx) % 12;
  const isVargottama = (rashiIdx === d9SignIdx);

  return {
    d9SignIdx,
    d9Rashi: RASHIS_HINDI[d9SignIdx],
    isVargottama
  };
}

// Classical D10 Dasamsha Calculation
function calculateD10Dasamsha(degVal) {
  const rashiIdx = Math.floor(degVal / 30);
  const degInRashi = degVal % 30;
  const d10Idx = Math.floor(degInRashi / 3.0); // 3° 0'

  let startSign = 0;
  if (rashiIdx % 2 === 0) { // Odd sign (0, 2, 4, 6, 8, 10): Starts from sign itself
    startSign = rashiIdx;
  } else { // Even sign (1, 3, 5, 7, 9, 11): Starts from 9th sign
    startSign = (rashiIdx + 8) % 12;
  }

  const d10SignIdx = (startSign + d10Idx) % 12;
  return {
    d10SignIdx,
    d10Rashi: RASHIS_HINDI[d10SignIdx]
  };
}

// Test D9 & D10 for Venus at 101.93° (Cancer 11°55')
const sunLong = 92.3655; // Cancer 2°21'
const moonLong = 311.8347; // Aquarius 11°50'
const venusLong = 101.9301; // Cancer 11°55'

console.log("=== DIVISIONAL CHARTS TEST ===");
console.log("Sun (Cancer 2°21'): D9 ->", calculateD9Navamsha(sunLong));
console.log("Moon (Aquarius 11°50'): D9 ->", calculateD9Navamsha(moonLong));
console.log("Venus (Cancer 11°55'): D9 ->", calculateD9Navamsha(venusLong));
console.log("Venus D10 Dasamsha ->", calculateD10Dasamsha(venusLong));
