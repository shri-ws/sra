// Test Script for North Indian SVG Diamond Chart Rendering Engine

function renderNorthIndianChartSVG(chart) {
    const lagnaRashiNum = chart.lagnaRashiIdx + 1;

    // Group planets by house (1 to 12)
    const housePlanets = {};
    for (let h = 1; h <= 12; h++) housePlanets[h] = [];

    const planetShortNames = {
        "Sun": "सू", "Moon": "चं", "Mars": "मं", "Mercury": "बु",
        "Jupiter": "गु", "Venus": "शु", "Saturn": "श", "Rahu": "रा", "Ketu": "के"
    };

    chart.planetList.forEach(p => {
        if (p.name.includes("लग्न")) return;
        const pRashiIdx = Math.floor(p.rawDeg / 30);
        const houseNum = (pRashiIdx - chart.lagnaRashiIdx + 12) % 12 + 1;
        for (const key in planetShortNames) {
            if (p.name.includes(key)) {
                let tag = planetShortNames[key];
                if (p.isVaki) tag += "(व)";
                if (p.isCombust) tag += "*";
                housePlanets[houseNum].push(tag);
                break;
            }
        }
    });

    // Rashi number for each house (1 to 12)
    const getHouseRashiNum = (h) => ((lagnaRashiNum + h - 2) % 12) + 1;

    // Center coordinates for labels and planet lists per house in 300x300 viewBox
    const houseCoords = {
        1:  { rX: 150, rY: 85,  pX: 150, pY: 115 }, // Top Center Diamond
        2:  { rX: 75,  rY: 45,  pX: 75,  pY: 65  }, // Top Left
        3:  { rX: 45,  rY: 75,  pX: 45,  pY: 95  }, // Upper Left
        4:  { rX: 85,  rY: 150, pX: 115, pY: 150 }, // Left Center Diamond
        5:  { rX: 45,  rY: 225, pX: 45,  pY: 245 }, // Lower Left
        6:  { rX: 75,  rY: 255, pX: 75,  pY: 275 }, // Bottom Left
        7:  { rX: 150, rY: 215, pX: 150, pY: 235 }, // Bottom Center Diamond
        8:  { rX: 225, rY: 255, pX: 225, pY: 275 }, // Bottom Right
        9:  { rX: 255, rY: 225, pX: 255, pY: 245 }, // Lower Right
        10: { rX: 215, rY: 150, pX: 185, pY: 150 }, // Right Center Diamond
        11: { rX: 255, rY: 75,  pX: 255, pY: 95  }, // Upper Right
        12: { rX: 225, rY: 45,  pX: 225, pY: 65  }  // Top Right
    };

    let housesSVG = "";
    for (let h = 1; h <= 12; h++) {
        const c = houseCoords[h];
        const rashiNum = getHouseRashiNum(h);
        const pList = housePlanets[h].join(" ");

        housesSVG += `
            <text x="${c.rX}" y="${c.rY}" font-size="11" font-weight="bold" fill="#D4A017" text-anchor="middle">${rashiNum}</text>
            <text x="${c.pX}" y="${c.pY}" font-size="10" font-weight="bold" fill="#F3E5AB" text-anchor="middle">${pList}</text>
        `;
    }

    return `
        <svg viewBox="0 0 300 300" style="width:100%; max-width:280px; background:#0B0E14; border:2px solid #D4A017; border-radius:12px; margin:10px auto; display:block;">
            <!-- Outer Square Box -->
            <rect x="5" y="5" width="290" height="290" fill="none" stroke="#D4A017" stroke-width="2" />
            <!-- Diagonals -->
            <line x1="5" y1="5" x2="295" y2="295" stroke="#D4A017" stroke-width="1.2" />
            <line x1="295" y1="5" x2="5" y2="295" stroke="#D4A017" stroke-width="1.2" />
            <!-- Inner Diamond Lines -->
            <line x1="150" y1="5" x2="5" y2="150" stroke="#D4A017" stroke-width="1.5" />
            <line x1="5" y1="150" x2="150" y2="295" stroke="#D4A017" stroke-width="1.5" />
            <line x1="150" y1="295" x2="295" y2="150" stroke="#D4A017" stroke-width="1.5" />
            <line x1="295" y1="150" x2="150" y2="5" stroke="#D4A017" stroke-width="1.5" />
            
            ${housesSVG}
        </svg>
    `;
}

// Test Chart Mock
const mockChart = {
    lagnaRashiIdx: 0, // Aries (1)
    planetList: [
        { name: "🚩 लग्न (Ascendant)", rawDeg: 12.5 },
        { name: "☀️ सूर्य (Sun)", rawDeg: 125.3, isVaki: false, isCombust: false }, // Leo (h5)
        { name: "🌙 चंद्रमा (Moon)", rawDeg: 320.1, isVaki: false, isCombust: false }, // Aqu (h11)
        { name: "♂️ मंगल (Mars)", rawDeg: 12.5, isVaki: false, isCombust: false }, // Aries (h1)
        { name: "☿ बुध (Mercury)", rawDeg: 128.0, isVaki: true, isCombust: true }, // Leo (h5)
        { name: "♃ बृहस्पति (Jupiter)", rawDeg: 240.2, isVaki: false, isCombust: false }, // Sag (h9)
        { name: "♀️ शुक्र (Venus)", rawDeg: 180.4, isVaki: false, isCombust: false }, // Libra (h7)
        { name: "♄ शनि (Saturn)", rawDeg: 345.8, isVaki: true, isCombust: false }, // Pisces (h12)
        { name: "☊ राहु (Rahu)", rawDeg: 50.0, isVaki: false, isCombust: false }, // Taurus (h2)
        { name: "☋ केतु (Ketu)", rawDeg: 230.0, isVaki: false, isCombust: false } // Scorpio (h8)
    ]
};

const svgOutput = renderNorthIndianChartSVG(mockChart);
console.log("SVG Chart Rendered Successfully! Length:", svgOutput.length);
