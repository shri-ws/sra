// Test script for improved domain classifier & follow-up intent detection

const NON_ASTROLOGY_BLOCKLIST = [
    "python", "javascript", "html", "css", "code", "coding", "program", "recipe", "pizza", "burger", 
    "cricket", "football", "score", "modi", "biden", "trump", "capital of", "weather", "forecast", 
    "math", "equation", "calculator", "movie", "song", "cinema"
];

const ASTROLOGY_KEYWORDS = [
    "कुंडली", "ग्रह", "दशा", "करियर", "नौकरी", "जॉब", "बिज़नेस", "व्यापार", "प्रमोशन", "विवाह", "शादी", "जीवनसाथी", "लव", "रिलेशन",
    "स्वास्थ्य", "सेहत", "बीमारी", "रोग", "आयु", "धन", "आर्थिक", "पैसा", "प्रॉपर्टी", "मकान", "गाड़ी", "लग्न", "राशि", "नक्षत्र",
    "उपाय", "रुद्राक्ष", "मंत्र", "पूजा", "मुहूर्त", "गोचर", "शनि", "गुरु", "सूर्य", "चंद्र", "मंगल", "बुध", "शुक्र", "राहु", "केतु",
    "भाग्यांक", "भविष्य", "ज्योतिष", "astrology", "kundli", "horoscope", "marriage", "career", "job", "wealth", "health", "future",
    "detail", "details", "samjhaye", "samjhao", "samjhaen", "samjhaaiye", "batao", "bataiye", "bataen", "explain", "more", "expansion",
    "विस्तार", "विस्तृत", "गहराई", "समझाइए", "समझायें", "बताओ", "और", "बताएं", "बताइए", "उपाय", "महत्व", "प्रभाव", "नक्शा", "हस्तरेखा"
];

function isAstrologyOrSpiritualQuery(text, hasBirthData) {
    if (!text || text.trim().length === 0) return true;
    const lower = text.toLowerCase();

    // 1. Check if query matches explicit non-astrology topics (blocklist)
    for (let i = 0; i < NON_ASTROLOGY_BLOCKLIST.length; i++) {
        if (lower.includes(NON_ASTROLOGY_BLOCKLIST[i])) {
            return false;
        }
    }

    // 2. Check if query contains any astrology/follow-up keyword
    for (let i = 0; i < ASTROLOGY_KEYWORDS.length; i++) {
        if (lower.includes(ASTROLOGY_KEYWORDS[i])) {
            return true;
        }
    }

    // 3. If birth details are already entered by user, treat all general questions as Kundli follow-ups!
    if (hasBirthData) {
        return true;
    }

    // 4. Default check for common Hindi question phrases
    if (lower.includes("क्या होगा") || lower.includes("कब") || lower.includes("कैसा") || lower.includes("बताएं") || lower.includes("बताओ")) {
        return true;
    }

    return false;
}

// Test cases
console.log("'DETAIL ME SAMJHAYE' (has birth data):", isAstrologyOrSpiritualQuery("DETAIL ME SAMJHAYE", true)); // Expected: true
console.log("'DETAIL ME SAMJHAYE' (no birth data):", isAstrologyOrSpiritualQuery("DETAIL ME SAMJHAYE", false)); // Expected: true (via keyword 'detail' / 'samjhaye')
console.log("'write python code for calculator':", isAstrologyOrSpiritualQuery("write python code for calculator", true)); // Expected: false
console.log("'विस्तार से बताओ':", isAstrologyOrSpiritualQuery("विस्तार से बताओ", true)); // Expected: true
console.log("'recipe for pizza':", isAstrologyOrSpiritualQuery("recipe for pizza", true)); // Expected: false
