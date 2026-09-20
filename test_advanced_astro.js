// Test Script for Jaimini Karakas, D7 Saptamsha, D12 Dwadasamsha, Combustion, and Retrograde Motion

const RASHIS_PLAIN_HINDI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];

// 1. Jaimini Chara Karakas
function computeJaiminiKarakas(planetList) {
    // Only 7 classical planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)
    const validPlanets = planetList.filter(p => !p.name.includes("लग्न") && !p.name.includes("राहु") && !p.name.includes("केतु"));
    
    // Sort by degree in sign (rawDeg % 30) descending
    const sorted = [...validPlanets].sort((a, b) => (b.rawDeg % 30) - (a.rawDeg % 30));

    const karakaTitles = [
        "आत्माकारक (AK - Self & Destiny)",
        "अमात्यकारक (AmK - Career & Status)",
        "भ्रातृकारक (BK - Siblings & Mentor)",
        "मातृकारक (MK - Mother & Wealth)",
        "पुत्रकारक (PK - Children & Intellect)",
        "ज्ञातिकारक (GK - Struggles & Enemies)",
        "दाराकारक (DK - Spouse & Relationship)"
    ];

    const result = {};
    sorted.forEach((p, idx) => {
        result[p.name] = karakaTitles[idx];
    });

    return {
        sorted: sorted.map((p, idx) => ({ name: p.name, degInSign: (p.rawDeg % 30).toFixed(2) + "°", karaka: karakaTitles[idx] })),
        atmakaraka: sorted[0],
        darakaraka: sorted[6]
    };
}

// 2. D7 Saptamsha Calculation
function computeD7Saptamsha(sidDeg) {
    const rashiIdx = Math.floor(sidDeg / 30) % 12;
    const degInSign = sidDeg % 30;
    const d7Div = Math.floor(degInSign / (30 / 7)); // 0 to 6
    
    // Odd sign (Aries 0, Gemini 2, Leo 4, Libra 6, Sag 8, Aqu 10): starts from rashiIdx
    // Even sign (Taurus 1, Cancer 3, Virgo 5, Scorpio 7, Cap 9, Pisces 11): starts from (rashiIdx + 6) % 12 (7th sign)
    let startSign = rashiIdx;
    if (rashiIdx % 2 !== 0) {
        startSign = (rashiIdx + 6) % 12;
    }
    const d7SignIdx = (startSign + d7Div) % 12;
    return {
        rashiIdx: d7SignIdx,
        rashi: RASHIS_PLAIN_HINDI[d7SignIdx]
    };
}

// 3. D12 Dwadasamsha Calculation
function computeD12Dwadasamsha(sidDeg) {
    const rashiIdx = Math.floor(sidDeg / 30) % 12;
    const degInSign = sidDeg % 30;
    const d12Div = Math.floor(degInSign / 2.5); // 0 to 11
    const d12SignIdx = (rashiIdx + d12Div) % 12;
    return {
        rashiIdx: d12SignIdx,
        rashi: RASHIS_PLAIN_HINDI[d12SignIdx]
    };
}

// 4. Combustion Check (अस्त ग्रह)
function checkCombustion(planetName, planetDeg, sunDeg) {
    if (planetName.includes("सूर्य") || planetName.includes("लग्न") || planetName.includes("राहु") || planetName.includes("केतु")) {
        return false;
    }
    
    let diff = Math.abs(planetDeg - sunDeg);
    if (diff > 180) diff = 360 - diff;

    const combustionLimits = {
        "चंद्रमा": 12.0,
        "मंगल": 17.0,
        "बुध": 13.0,
        "बृहस्पति": 11.0,
        "शुक्र": 10.0,
        "शनि": 15.0
    };

    for (const key in combustionLimits) {
        if (planetName.includes(key)) {
            return diff <= combustionLimits[key];
        }
    }
    return false;
}

// Quick Verification
const mockPlanets = [
    { name: "☀️ सूर्य (Sun)", rawDeg: 295.3 }, // Cap 25.3°
    { name: "🌙 चंद्रमा (Moon)", rawDeg: 320.1 }, // Aqu 20.1°
    { name: "♂️ मंगल (Mars)", rawDeg: 12.5 }, // Aries 12.5°
    { name: "☿ बुध (Mercury)", rawDeg: 298.0 }, // Cap 28.0° (Combust!)
    { name: "♃ बृहस्पति (Jupiter)", rawDeg: 140.2 }, // Leo 20.2°
    { name: "♀️ शुक्र (Venus)", rawDeg: 280.4 }, // Cap 10.4°
    { name: "♄ शनि (Saturn)", rawDeg: 345.8 } // Pisces 15.8°
];

const karakas = computeJaiminiKarakas(mockPlanets);
console.log("Atmakaraka (Highest deg in sign):", karakas.atmakaraka.name);
console.log("Darakaraka (Lowest deg in sign):", karakas.darakaraka.name);

const d7Res = computeD7Saptamsha(12.5); // Aries 12.5°
console.log("D7 Saptamsha for Aries 12.5°:", d7Res);

const d12Res = computeD12Dwadasamsha(295.3); // Cap 25.3°
console.log("D12 Dwadasamsha for Cap 25.3°:", d12Res);

const isMercCombust = checkCombustion("☿ बुध (Mercury)", 298.0, 295.3);
console.log("Is Mercury Combust?:", isMercCombust);
