// Test script for Dynamic Local Generative Synthesis Engine

function generateDynamicAstroResponse(question, chart, matchedShlokas) {
    const q = (question || "").toLowerCase();
    
    // Analyze question intent
    let isCareer = q.includes("करियर") || q.includes("नौकरी") || q.includes("जॉब") || q.includes("बिज़नेस") || q.includes("व्यापार") || q.includes("प्रमोशन");
    let isMarriage = q.includes("विवाह") || q.includes("शादी") || q.includes("जीवनसाथी") || q.includes("लव") || q.includes("रिलेशन");
    let isWealth = q.includes("धन") || q.includes("आर्थिक") || q.includes("पैसा") || q.includes("प्रॉपर्टी") || q.includes("मकान") || q.includes("गाड़ी");
    let isHealth = q.includes("स्वास्थ्य") || q.includes("सेहत") || q.includes("बीमारी") || q.includes("रोग") || q.includes("आयु");
    let isDetail = q.includes("detail") || q.includes("विस्तार") || q.includes("समझाए") || q.includes("समझाओ") || q.includes("और") || (!isCareer && !isMarriage && !isWealth && !isHealth);

    const lagna = chart.lagna;
    const lagnaLord = chart.houseLords[1].lord;
    const moonRashi = chart.moonRashi;
    const nakshatra = chart.nakshatra;
    const pada = chart.pada;
    const ak = chart.jaiminiKarakas.atmakaraka.name;
    const amk = chart.jaiminiKarakas.sorted[1].name;
    const dk = chart.jaiminiKarakas.darakaraka.name;

    const dasha = chart.dashaInfo;
    const gochar = chart.gocharInfo;
    const sav = chart.savPoints;

    let responseHtml = "";

    // Header intro (Conversational & Empathetic Hindi)
    responseHtml += `🙏🏻 <b>सादर प्रणाम! आपकी जन्मपत्रिका एवं खगोलीय चक्र का सूक्ष्म अध्ययन किया गया है।</b><br><br>`;

    if (isDetail || (!isCareer && !isMarriage && !isWealth && !isHealth)) {
        responseHtml += `
            🔮 <b>आपकी कुण्डली का 360° सर्व-पक्षीय खगोलीय विश्लेषण (Gemini-Style Dynamic Synthesis):</b><br><br>
            • <b>मूल खगोलीय संरचना:</b> आपका <b>${lagna}</b> लग्न है और लग्नेश <b>${lagnaLord}</b> की स्थिति जीवन में आत्मबल का मुख्य आधार है। आपकी चंद्र राशि <b>${moonRashi}</b> एवं जन्म नक्षत्र <b>${nakshatra} (${pada})</b> है।<br><br>
            • <b>जैमिनी चर कारक व वर्ग कुण्डली:</b> आपकी आत्मा का मुख्य उद्देश्य आत्माकारक <b>${ak}</b> तथा D9 नवमांश (<b>${chart.d9Lagna}</b>) द्वारा नियंत्रित है। दाराकारक <b>${dk}</b> वैवाहिक संबंधों का संकेत दे रहा है।<br><br>
            • <b>कर्म व आजीविका (10th House):</b> दशम भाव का अष्टकवर्ग अंक <b>${sav[10]}/56</b> है। अमात्यकारक <b>${amk}</b> एवं D10 दशमांश (<b>${chart.d10Lagna}</b>) के प्रभाव से आपके कार्यक्षेत्र में उन्नति का योग निर्मित हो रहा है।<br><br>
            • <b>धन व लाभ (2nd & 11th House):</b> द्वितीय भाव (अंक: <b>${sav[2]}</b>) एवं एकादश भाव (अंक: <b>${sav[11]}</b>) का संबंध नियमित आय एवं संपत्ति संचय की क्षमता को दर्शाता है।<br><br>
            • <b>विवाह व दाम्पत्य सुख (7th House):</b> सप्तमेश <b>${chart.houseLords[7].lord}</b> एवं D9 नवमांश <b>${chart.d9Lagna}</b> की स्थिति जीवनसाथी के साथ सामंजस्य का निर्धारण कर रही है (7वें भाव का अष्टकवर्ग अंक: <b>${sav[7]}</b>)।
        `;
    } else if (isCareer) {
        responseHtml += `
            💼 <b>करियर, आजीविका व कर्मक्षेत्र सूक्ष्म विश्लेषण:</b><br><br>
            • <b>कर्मेश व दशम भाव:</b> आपकी <b>${lagna}</b> कुण्डली में दशमेश (कर्मेश) <b>${chart.houseLords[10].lord}</b> है। सर्वाष्टकवर्ग में 10वें भाव को <b>${sav[10]}/56 अंक</b> प्राप्त हैं, जो कार्यक्षेत्र में अधिकार व स्थायित्व का संकेत देता है।<br>
            • <b>D10 दशमांश कुण्डली:</b> D10 दशमांश में <b>${chart.d10Lagna}</b> राशि का प्रभाव है, तथा अमात्यकारक <b>${amk}</b> आपकी व्यावसायिक सफलता को नियंत्रित कर रहा है।<br>
            • <b>महादशा व समय चक्र:</b> वर्तमान <b>${dasha.activeMahadasha}-${dasha.activeAntardasha}</b> अंतर्दशा (${dasha.activeAntarEndFmt} तक) आपकी आजीविका में सकारात्मक मोड़ लाने हेतु अनुकूल है।
        `;
    } else if (isMarriage) {
        responseHtml += `
            💍 <b>विवाह, दाम्पत्य व सम्बन्ध सूक्ष्म विश्लेषण:</b><br><br>
            • <b>सप्तमेश व दाराकारक:</b> आपकी कुण्डली में सप्तमेश <b>${chart.houseLords[7].lord}</b> है तथा दाराकारक <b>${dk}</b> विवाह व पार्टनरशिप का निर्धारण कर रहा है। सप्तम भाव का अष्टकवर्ग अंक <b>${sav[7]}/56</b> है।<br>
            • <b>D9 नवमांश कुण्डली:</b> D9 नवमांश लग्न <b>${chart.d9Lagna}</b> है तथा कलत्र कारक शुक्र देव आपकी मैरिड लाइफ में सुख-शांति का मार्ग प्रशस्त कर रहे हैं।<br>
            • <b>गोचर प्रभाव:</b> वर्तमान में <b>${gochar.saturnStatus.split(' ')[0]}</b> एवं गुरु गोचर आपके विवाह योग में अनुकूल परिस्थितियाँ बना रहा है।
        `;
    } else if (isWealth) {
        responseHtml += `
            💰 <b>धन, आर्थिक स्थिति व संपत्ति सूक्ष्म विश्लेषण:</b><br><br>
            • <b>धनेश व लाभेश:</b> आपकी जन्मपत्रिका में धन भावेश <b>${chart.houseLords[2].lord}</b> एवं लाभेश <b>${chart.houseLords[11].lord}</b> का संबंध निर्मित हो रहा है। द्वितीय भाव का सर्वाष्टकवर्ग अंक <b>${sav[2]}</b> एवं एकादश भाव का अंक <b>${sav[11]}</b> है।<br>
            • <b>बृहस्पति देव व मातृकारक:</b> धन कारक बृहस्पति देव (Shadbala Score) एवं मातृकारक <b>${chart.jaiminiKarakas.sorted[3].name}</b> अचल संपत्ति (घर/गाड़ी) के संचय का योग दे रहे हैं।
        `;
    }

    // Shloka references
    if (matchedShlokas && matchedShlokas.length > 0) {
        responseHtml += `<br><br>📜 <b>शास्त्रीय ग्रन्थ प्रमाण (Classical Citation):</b><br>`;
        matchedShlokas.forEach(s => {
            responseHtml += `• <b>${s.book_title} (${s.chapter}):</b> <i>"${s.sanskrit_reference}"</i> — ${s.translation}<br>`;
        });
    }

    // Vimshottari & Transit section
    responseHtml += `
        <br>⏳ <b>विंशोत्तरी समय चक्र (Vimshottari Timeline):</b><br>
        • <b>सक्रिय महादशा:</b> <b>${dasha.activeMahadasha}</b> (प्रभावी: ${dasha.activeMahaStartFmt} से ${dasha.activeMahaEndFmt})<br>
        • <b>सक्रिय अंतर्दशा:</b> <b>${dasha.activeMahadasha}-${dasha.activeAntardasha}</b> (${dasha.activeAntarStartFmt} से ${dasha.activeAntarEndFmt})<br>
        • <b>सूक्ष्म प्रत्यंतर्दशा:</b> <b>${dasha.activePratyantardasha}</b> (${dasha.activePratyantarEndFmt} तक)<br><br>
        🌌 <b>आज का लाइव गोचर (Today's Live Transit):</b><br>
        • <b>शनि गोचर:</b> ${gochar.saturnStatus}<br>
        • <b>गुरु गोचर:</b> ${gochar.jupiterStatus}<br><br>
        ✨ <b>प्रामाणिक वैदिक उपाय व रुद्राक्ष परामर्श:</b><br>
        • <b>अनुशंसित रुद्राक्ष:</b> 5-मुखी या 7-मुखी रुद्राक्ष (5-Mukhi / 7-Mukhi Rudraksha)<br>
        • <b>स्तोत्र जाप:</b> <a href="vmm.html" target="_blank" style="color:var(--gold); font-weight:bold;">विष्णु सहस्रनाम / ग्रह शांति स्तोत्र (VMM Module)</a>
    `;

    return responseHtml;
}

// Mock chart test
const mockChart = {
    lagna: "मेष (Aries)",
    lagnaRashiIdx: 0,
    moonRashi: "वृषभ (Taurus)",
    nakshatra: "रोहिणी",
    pada: "पद 2",
    d9Lagna: "वृश्चिक",
    d10Lagna: "सिंह",
    jaiminiKarakas: {
        atmakaraka: { name: "☀️ सूर्य" },
        darakaraka: { name: "♀️ शुक्र" },
        sorted: [{ name: "☀️ सूर्य" }, { name: "♃ बृहस्पति" }, { name: "♂️ मंगल" }, { name: "🌙 चंद्रमा" }]
    },
    houseLords: {
        1: { lord: "मंगल" },
        2: { lord: "शुक्र" },
        7: { lord: "शुक्र" },
        10: { lord: "शनि" },
        11: { lord: "शनि" }
    },
    savPoints: { 1: 28, 2: 31, 7: 30, 10: 34, 11: 36 },
    dashaInfo: {
        activeMahadasha: "बृहस्पति",
        activeAntardasha: "शनि",
        activePratyantardasha: "बुध",
        activeMahaStartFmt: "15 मार्च 2020",
        activeMahaEndFmt: "15 मार्च 2036",
        activeAntarStartFmt: "10 जनवरी 2024",
        activeAntarEndFmt: "25 अगस्त 2026",
        activePratyantarEndFmt: "12 नवंबर 2026"
    },
    gocharInfo: {
        saturnStatus: "शनि गोचर चंद्र से 11वें भाव में (अत्यंत शुभ व लाभप्रद)",
        jupiterStatus: "बृहस्पति गोचर चंद्र से 2रे भाव में (भाग्योदय कारक)"
    }
};

const result = generateDynamicAstroResponse("detail me samjhaye", mockChart, []);
console.log("Dynamic Generative Response Length:", result.length);
console.log("Sample Preview:\n", result.substring(0, 500));
