// 36-Point Ashtakoot Partner Gun Milan & Manglik Verification Script
const RASHIS = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];
const RASHI_LORDS = ["मंगल", "शुक्र", "बुध", "चंद्र", "सूर्य", "बुध", "शुक्र", "मंगल", "गुरु", "शनि", "शनि", "गुरु"];

// 27 Nakshatras & properties
const NAKSHATRAS = [
    { name: "अश्विनी", lord: "केतु", yoni: "Horse", gana: "Deva", nadi: "Adi" },
    { name: "भरणी", lord: "शुक्र", yoni: "Elephant", gana: "Manushya", nadi: "Madhya" },
    { name: "कृत्तिका", lord: "सूर्य", yoni: "Sheep", gana: "Rakshasa", nadi: "Antya" },
    { name: "रोहिणी", lord: "चंद्र", yoni: "Serpent", gana: "Manushya", nadi: "Antya" },
    { name: "मृगशिरा", lord: "मंगल", yoni: "Serpent", gana: "Deva", nadi: "Madhya" },
    { name: "आर्द्रा", lord: "राहु", yoni: "Dog", gana: "Manushya", nadi: "Adi" },
    { name: "पुनर्वसु", lord: "गुरु", yoni: "Cat", gana: "Deva", nadi: "Adi" },
    { name: "पुष्य", lord: "शनि", yoni: "Sheep", gana: "Deva", nadi: "Madhya" },
    { name: "अश्लेषा", lord: "बुध", yoni: "Cat", gana: "Rakshasa", nadi: "Antya" },
    { name: "मघा", lord: "केतु", yoni: "Rat", gana: "Rakshasa", nadi: "Antya" },
    { name: "पूर्वाफाल्गुनी", lord: "शुक्र", yoni: "Rat", gana: "Manushya", nadi: "Madhya" },
    { name: "उत्तराफाल्गुनी", lord: "सूर्य", yoni: "Cow", gana: "Manushya", nadi: "Adi" },
    { name: "हस्त", lord: "चंद्र", yoni: "Buffalo", gana: "Deva", nadi: "Adi" },
    { name: "चित्रा", lord: "मंगल", yoni: "Tiger", gana: "Rakshasa", nadi: "Madhya" },
    { name: "स्वाती", lord: "राहु", yoni: "Deer", gana: "Deva", nadi: "Antya" },
    { name: "विशाखा", lord: "गुरु", yoni: "Tiger", gana: "Rakshasa", nadi: "Antya" },
    { name: "अनुराधा", lord: "शनि", yoni: "Deer", gana: "Deva", nadi: "Madhya" },
    { name: "ज्येष्ठा", lord: "बुध", yoni: "Deer", gana: "Rakshasa", nadi: "Adi" },
    { name: "मूल", lord: "केतु", yoni: "Dog", gana: "Rakshasa", nadi: "Adi" },
    { name: "पूर्वाषाढ़ा", lord: "शुक्र", yoni: "Monkey", gana: "Manushya", nadi: "Madhya" },
    { name: "उत्तराषाढ़ा", lord: "सूर्य", yoni: "Mongoose", gana: "Manushya", nadi: "Antya" },
    { name: "श्रवण", lord: "चंद्र", yoni: "Monkey", gana: "Deva", nadi: "Antya" },
    { name: "धनिष्ठा", lord: "मंगल", yoni: "Lion", gana: "Rakshasa", nadi: "Madhya" },
    { name: "शतभिषा", lord: "राहु", yoni: "Horse", gana: "Rakshasa", nadi: "Adi" },
    { name: "पूर्वाभाद्रपद", lord: "गुरु", yoni: "Lion", gana: "Manushya", nadi: "Adi" },
    { name: "उत्तराभाद्रपद", lord: "शनि", yoni: "Cow", gana: "Manushya", nadi: "Madhya" },
    { name: "रेवती", lord: "बुध", yoni: "Elephant", gana: "Deva", nadi: "Antya" }
];

// Yoni Compatibility Matrix (0 to 4)
const YONI_COMPAT = {
    "Horse": { "Horse": 4, "Elephant": 2, "Sheep": 2, "Serpent": 2, "Dog": 2, "Cat": 2, "Rat": 1, "Cow": 2, "Buffalo": 0, "Tiger": 1, "Deer": 3, "Monkey": 3, "Mongoose": 2, "Lion": 1 },
    "Elephant": { "Horse": 2, "Elephant": 4, "Sheep": 3, "Serpent": 3, "Dog": 2, "Cat": 2, "Rat": 2, "Cow": 2, "Buffalo": 3, "Tiger": 1, "Deer": 2, "Monkey": 2, "Mongoose": 2, "Lion": 0 },
    "Sheep": { "Horse": 2, "Elephant": 3, "Sheep": 4, "Serpent": 2, "Dog": 1, "Cat": 2, "Rat": 2, "Cow": 3, "Buffalo": 3, "Tiger": 0, "Deer": 3, "Monkey": 2, "Mongoose": 2, "Lion": 1 },
    "Serpent": { "Horse": 2, "Elephant": 3, "Sheep": 2, "Serpent": 4, "Dog": 2, "Cat": 2, "Rat": 2, "Cow": 2, "Buffalo": 2, "Tiger": 2, "Deer": 2, "Monkey": 2, "Mongoose": 0, "Lion": 2 },
    "Dog": { "Horse": 2, "Elephant": 2, "Sheep": 1, "Serpent": 2, "Dog": 4, "Cat": 0, "Rat": 2, "Cow": 2, "Buffalo": 2, "Tiger": 2, "Deer": 1, "Monkey": 2, "Mongoose": 2, "Lion": 1 },
    "Cat": { "Horse": 2, "Elephant": 2, "Sheep": 2, "Serpent": 2, "Dog": 0, "Cat": 4, "Rat": 0, "Cow": 2, "Buffalo": 2, "Tiger": 2, "Deer": 2, "Monkey": 3, "Mongoose": 2, "Lion": 2 },
    "Rat": { "Horse": 1, "Elephant": 2, "Sheep": 2, "Serpent": 2, "Dog": 2, "Cat": 0, "Rat": 4, "Cow": 2, "Buffalo": 2, "Tiger": 2, "Deer": 2, "Monkey": 2, "Mongoose": 2, "Lion": 2 },
    "Cow": { "Horse": 2, "Elephant": 2, "Sheep": 3, "Serpent": 2, "Dog": 2, "Cat": 2, "Rat": 2, "Cow": 4, "Buffalo": 3, "Tiger": 0, "Deer": 3, "Monkey": 2, "Mongoose": 2, "Lion": 1 },
    "Buffalo": { "Horse": 0, "Elephant": 3, "Sheep": 3, "Serpent": 2, "Dog": 2, "Cat": 2, "Rat": 2, "Cow": 3, "Buffalo": 4, "Tiger": 1, "Deer": 2, "Monkey": 2, "Mongoose": 2, "Lion": 1 },
    "Tiger": { "Horse": 1, "Elephant": 1, "Sheep": 0, "Serpent": 2, "Dog": 2, "Cat": 2, "Rat": 2, "Cow": 0, "Buffalo": 1, "Tiger": 4, "Deer": 1, "Monkey": 2, "Mongoose": 2, "Lion": 1 },
    "Deer": { "Horse": 3, "Elephant": 2, "Sheep": 3, "Serpent": 2, "Dog": 1, "Cat": 2, "Rat": 2, "Cow": 3, "Buffalo": 2, "Tiger": 1, "Deer": 4, "Monkey": 2, "Mongoose": 2, "Lion": 2 },
    "Monkey": { "Horse": 3, "Elephant": 2, "Sheep": 2, "Serpent": 2, "Dog": 2, "Cat": 3, "Rat": 2, "Cow": 2, "Buffalo": 2, "Tiger": 2, "Deer": 2, "Monkey": 4, "Mongoose": 2, "Lion": 2 },
    "Mongoose": { "Horse": 2, "Elephant": 2, "Sheep": 2, "Serpent": 0, "Dog": 2, "Cat": 2, "Rat": 2, "Cow": 2, "Buffalo": 2, "Tiger": 2, "Deer": 2, "Monkey": 2, "Mongoose": 4, "Lion": 2 },
    "Lion": { "Horse": 1, "Elephant": 0, "Sheep": 1, "Serpent": 2, "Dog": 1, "Cat": 2, "Rat": 2, "Cow": 1, "Buffalo": 1, "Tiger": 1, "Deer": 2, "Monkey": 2, "Mongoose": 2, "Lion": 4 }
};

function calculateAshtakootMatch(boyNakIdx, boyRashiIdx, girlNakIdx, girlRashiIdx) {
    const boyNak = NAKSHATRAS[boyNakIdx];
    const girlNak = NAKSHATRAS[girlNakIdx];

    // 1. Varna (1 Point)
    const varnaOrder = { "Brahmin": 4, "Kshatriya": 3, "Vaishya": 2, "Shudra": 1 };
    const getVarna = (rashiIdx) => {
        if ([3, 7, 11].includes(rashiIdx)) return "Brahmin"; // Cancer, Scorpio, Pisces
        if ([0, 4, 8].includes(rashiIdx)) return "Kshatriya"; // Aries, Leo, Sag
        if ([1, 5, 9].includes(rashiIdx)) return "Vaishya"; // Taurus, Virgo, Cap
        return "Shudra"; // Gemini, Libra, Aqu
    };
    const boyVarna = getVarna(boyRashiIdx);
    const girlVarna = getVarna(girlRashiIdx);
    const varnaPts = (varnaOrder[boyVarna] >= varnaOrder[girlVarna]) ? 1 : 0;

    // 2. Vashya (2 Points)
    let vashyaPts = 1;
    if (boyRashiIdx === girlRashiIdx) vashyaPts = 2;
    else if (Math.abs(boyRashiIdx - girlRashiIdx) === 6) vashyaPts = 0;
    else vashyaPts = 1;

    // 3. Tara (3 Points)
    const count1 = (girlNakIdx - boyNakIdx + 27) % 27;
    const count2 = (boyNakIdx - girlNakIdx + 27) % 27;
    const tara1 = (count1 % 9) + 1;
    const tara2 = (count2 % 9) + 1;
    const badTaras = [3, 5, 7]; // Vipat, Pratyak, Vadha
    let taraPts = 3;
    if (badTaras.includes(tara1) && badTaras.includes(tara2)) taraPts = 0;
    else if (badTaras.includes(tara1) || badTaras.includes(tara2)) taraPts = 1.5;

    // 4. Yoni (4 Points)
    const yoniPts = (YONI_COMPAT[boyNak.yoni] && YONI_COMPAT[boyNak.yoni][girlNak.yoni] !== undefined)
        ? YONI_COMPAT[boyNak.yoni][girlNak.yoni] : 2;

    // 5. Graha Maitri (5 Points)
    const boyLord = RASHI_LORDS[boyRashiIdx];
    const girlLord = RASHI_LORDS[girlRashiIdx];
    let maitriPts = 0;
    if (boyLord === girlLord) maitriPts = 5;
    else {
        const friends = {
            "सूर्य": ["चंद्र", "मंगल", "गुरु"],
            "चंद्र": ["सूर्य", "बुध"],
            "मंगल": ["सूर्य", "चंद्र", "गुरु"],
            "बुध": ["सूर्य", "शुक्र"],
            "गुरु": ["सूर्य", "चंद्र", "मंगल"],
            "शुक्र": ["बुध", "शनि"],
            "शनि": ["बुध", "शुक्र"]
        };
        const isBoyFriendOfGirl = (friends[girlLord] || []).includes(boyLord);
        const isGirlFriendOfBoy = (friends[boyLord] || []).includes(girlLord);
        if (isBoyFriendOfGirl && isGirlFriendOfBoy) maitriPts = 5;
        else if (isBoyFriendOfGirl || isGirlFriendOfBoy) maitriPts = 3;
        else maitriPts = 1;
    }

    // 6. Gana (6 Points)
    let ganaPts = 0;
    if (boyNak.gana === girlNak.gana) ganaPts = 6;
    else if (boyNak.gana === "Deva" && girlNak.gana === "Manushya") ganaPts = 5;
    else if (boyNak.gana === "Manushya" && girlNak.gana === "Deva") ganaPts = 6;
    else if (boyNak.gana === "Deva" && girlNak.gana === "Rakshasa") ganaPts = 1;
    else if (boyNak.gana === "Rakshasa" && girlNak.gana === "Deva") ganaPts = 0;
    else ganaPts = 0; // Manushya vs Rakshasa

    // 7. Bhakoot (7 Points)
    const rashiDist = (girlRashiIdx - boyRashiIdx + 12) % 12 + 1;
    let bhakootPts = 7;
    // Doshas: 2-12, 5-9, 6-8
    if ([2, 12, 5, 9, 6, 8].includes(rashiDist)) {
        // Exemption if lords are friends or same
        if (boyLord === girlLord || maitriPts >= 4) bhakootPts = 7;
        else bhakootPts = 0;
    }

    // 8. Nadi (8 Points)
    let nadiPts = 8;
    if (boyNak.nadi === girlNak.nadi) {
        // Nadi Dosha unless exempted
        if (boyRashiIdx !== girlRashiIdx && boyLord === girlLord) nadiPts = 8;
        else nadiPts = 0;
    }

    const totalPts = varnaPts + vashyaPts + taraPts + yoniPts + maitriPts + ganaPts + bhakootPts + nadiPts;

    let matchQuality = "उत्कृष्ट व शुभ (Optimal Match)";
    if (totalPts >= 28) matchQuality = "उत्कृष्ट व सर्वश्रेष्ठ मिलान (Highly Compatible)";
    else if (totalPts >= 18) matchQuality = "मध्यम व अनुकूल मिलान (Good Match)";
    else matchQuality = "अशुभ / उपाय आवश्यक (Low Score - Remedies Needed)";

    return {
        varnaPts, vashyaPts, taraPts, yoniPts, maitriPts, ganaPts, bhakootPts, nadiPts,
        totalPts, matchQuality,
        boyDetails: { rashi: RASHIS[boyRashiIdx], nakshatra: boyNak.name, gana: boyNak.gana, nadi: boyNak.nadi },
        girlDetails: { rashi: RASHIS[girlRashiIdx], nakshatra: girlNak.name, gana: girlNak.gana, nadi: girlNak.nadi }
    };
}

// Quick Test: Boy Ashwini (0, Aries 0) & Girl Rohini (3, Taurus 1)
const testResult = calculateAshtakootMatch(0, 0, 3, 1);
console.log("Ashtakoot Test Result:", testResult);
