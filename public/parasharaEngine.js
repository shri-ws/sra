/**
 * =============================================================================
 * MEGA PARASHARA KUNDALI ENGINE (मेगा पाराशर कुण्डली इंजन)
 * Based on the Classical Canon: बृहत्पाराशरहोराशास्त्रम् (Brihat Parashara Hora Shastra)
 * Chapters 1 to 20 Shloka Matching & Computational Evaluation Engine
 * =============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParasharaEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const RASHI_NAMES = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"
  ];

  const GRAHA_NAMES = {
    Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध",
    Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु"
  };

  const RASHI_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
  ];

  const EXALTATION_SIGNS = {
    Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 8
  };

  const DEBILITATION_SIGNS = {
    Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 2
  };

  const MOOLATRIKONA_SIGNS = {
    Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10
  };

  const OWN_SIGNS = {
    Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
    Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10]
  };

  // Helper: Get sign index (0-11)
  function getSignIndex(deg360) {
    let d = deg360 % 360;
    if (d < 0) d += 360;
    return Math.floor(d / 30);
  }

  // Helper: Get degree within sign (0-30)
  function getDegInSign(deg360) {
    let d = deg360 % 360;
    if (d < 0) d += 360;
    return d % 30;
  }

  // Helper: Get house index (1-12) from Lagna Sign
  function getHouse(sign, lagnaSign) {
    return ((sign - lagnaSign + 12) % 12) + 1;
  }

  // Helper: Check if planet is in a Kendra (1, 4, 7, 10)
  function isKendra(house) {
    return [1, 4, 7, 10].includes(house);
  }

  // Helper: Check if planet is in a Trikona (1, 5, 9)
  function isTrikona(house) {
    return [1, 5, 9].includes(house);
  }

  // Helper: Check if planet is in a Trika/Dusthana (6, 8, 12)
  function isTrika(house) {
    return [6, 8, 12].includes(house);
  }

  // Helper: Compute Varga Sign for 16 Divisional Charts
  function getVargaSign(sign, deg, varga) {
    const eps = 0.00001;
    switch(varga) {
      case 1: return sign;
      case 2: // Hora
        if (sign % 2 === 0) return deg < 15 ? 4 : 3;
        return deg < 15 ? 3 : 4;
      case 3: { // Drekkana
        const dPart = Math.floor((deg - eps) / 10);
        const shift = dPart === 0 ? 0 : (dPart === 1 ? 4 : 8);
        return (sign + shift) % 12;
      }
      case 4: // Chaturthamsha
        return (sign + Math.floor((deg - eps) / 7.5) * 3) % 12;
      case 7: { // Saptamsha
        const sStart = (sign % 2 === 0) ? sign : (sign + 6) % 12;
        return (sStart + Math.floor((deg - eps) / (30/7))) % 12;
      }
      case 9: { // Navamsha
        let nStart = (sign % 3 === 0) ? sign : (sign % 3 === 1 ? (sign + 8) % 12 : (sign + 4) % 12);
        return (nStart + Math.floor((deg - eps) / (3 + 20/60))) % 12;
      }
      case 10: { // Dashamsha
        let dsStart = (sign % 2 === 0) ? sign : (sign + 8) % 12;
        return (dsStart + Math.floor((deg - eps) / 3.0)) % 12;
      }
      case 12: // Dwadashamsha
        return (sign + Math.floor((deg - eps) / 2.5)) % 12;
      case 16: { // Shodashamsha
        let shStart = (sign % 3 === 0) ? 0 : (sign % 3 === 1 ? 4 : 8);
        return (shStart + Math.floor((deg - eps) / 1.875)) % 12;
      }
      case 20: { // Vimshamsha
        let vStart = (sign % 3 === 0) ? 0 : (sign % 3 === 1 ? 8 : 4);
        return (vStart + Math.floor((deg - eps) / 1.5)) % 12;
      }
      case 24: { // Chaturvimshamsha
        let sidStart = (sign % 2 === 0) ? 4 : 3;
        return (sidStart + Math.floor((deg - eps) / 1.25)) % 12;
      }
      case 27: // Saptavimshamsha
        return ((sign % 4) * 3 + Math.floor((deg - eps) / (1 + 7/60))) % 12;
      case 30: // Trimshamsha
        if (sign % 2 === 0) {
          if (deg < 5) return 0; if (deg < 10) return 10; if (deg < 18) return 8; if (deg < 25) return 2; return 6;
        } else {
          if (deg < 5) return 1; if (deg < 12) return 5; if (deg < 20) return 11; if (deg < 25) return 9; return 7;
        }
      case 40: // Khavedamsha
        return (((sign % 2 === 0) ? 0 : 6) + Math.floor((deg - eps) / 0.75)) % 12;
      case 45: { // Akshavedamsha
        let akStart = (sign % 3 === 0) ? 0 : (sign % 3 === 1 ? 4 : 8);
        return (akStart + Math.floor((deg - eps) / (30/45))) % 12;
      }
      case 60: // Shashtiamsha
        return (sign + Math.floor((deg * 2) - eps) % 12) % 12;
      default: return sign;
    }
  }

  // Check if a planet is in dignity (Exalted, Moolatrikona, or Own sign) in a varga sign
  function isPlanetDignifiedInSign(planetId, vSign) {
    if (EXALTATION_SIGNS[planetId] === vSign) return true;
    if (MOOLATRIKONA_SIGNS[planetId] === vSign) return true;
    if (OWN_SIGNS[planetId] && OWN_SIGNS[planetId].includes(vSign)) return true;
    return false;
  }

  // =============================================================================
  // MAIN ANALYSIS FUNCTION: EVALUATE CHAPTERS 1 TO 10
  // =============================================================================
  function evaluateParasharaReport(calcResult, options = {}) {
    if (!calcResult || !calcResult.planets) {
      throw new Error("Invalid calculation payload provided to ParasharaEngine");
    }

    const planets = calcResult.planets;
    const lagnaObj = planets.find(p => p.id === 'Lagna') || calcResult.lagna || { abs: 0 };
    const lagnaAbs = lagnaObj.abs || 0;
    const lagnaSign = getSignIndex(lagnaAbs);
    const lagnaDeg = getDegInSign(lagnaAbs);

    // Planet index mapping
    const planetMap = {};
    planets.forEach(p => {
      const abs = p.abs !== undefined ? p.abs : 0;
      const sign = getSignIndex(abs);
      const deg = getDegInSign(abs);
      const house = getHouse(sign, lagnaSign);
      planetMap[p.id] = {
        ...p,
        abs,
        sign,
        deg,
        house,
        rashiName: RASHI_NAMES[sign],
        grahaName: GRAHA_NAMES[p.id] || p.id
      };
    });

    const lagneshaId = RASHI_LORDS[lagnaSign];
    const lagnesha = planetMap[lagneshaId];
    const moon = planetMap['Moon'];
    const sun = planetMap['Sun'];
    const mars = planetMap['Mars'];
    const mercury = planetMap['Mercury'];
    const jupiter = planetMap['Jupiter'];
    const venus = planetMap['Venus'];
    const saturn = planetMap['Saturn'];
    const rahu = planetMap['Rahu'];
    const ketu = planetMap['Ketu'];

    // Atmakaraka (Highest degree among 7 planets excluding nodes)
    const sevenGrahas = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    let atmakarakaId = 'Sun';
    let maxDeg = -1;
    sevenGrahas.forEach(gid => {
      if (planetMap[gid] && planetMap[gid].deg > maxDeg) {
        maxDeg = planetMap[gid].deg;
        atmakarakaId = gid;
      }
    });
    const atmakaraka = planetMap[atmakarakaId];

    const matchedShlokas = [];

    // =========================================================================
    // CHAPTER 1: प्रथमोऽध्यायः — सृष्टिक्रमकथनाध्यायः (The Foundational Invocation)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 1,
      chapterTitle: "प्रथमोऽध्यायः — सृष्टिक्रमकथनाध्यायः",
      chapterSignificance: "सृष्टि की उत्पत्ति, काल-चक्र एवं महर्षि पाराशर की दिव्य प्रतिज्ञा",
      verseNumbers: "श्लोक १–४",
      shlokaSanskrit: `शान्तं गुणातीतं सर्वव्यापीशमीश्वरम् ।
जगत्कर्तृस्वरूपं च परावरदृशं विभुम् ॥ १ ॥
प्रणम्य जगन्नाथं पराशरो मुनिसत्तमम् ।
मैत्रेयः परिपप्रच्छ विनयावनतो द्विजः ॥ २ ॥`,
      applicabilityStatus: "सर्व-जातक सार्वभौमिक आधार (Universal Foundational Shloka)",
      natalTrigger: `जातक: ${calcResult.name || options.name || "जातक"} • लग्न: ${RASHI_NAMES[lagnaSign]} (${lagnaDeg.toFixed(2)}°) • नक्षत्र: ${lagnaObj.nakshatraName || "—"}`,
      classicalPrediction: "महर्षि पाराशर सृष्टि के मूल नियमों का उद्घाटन करते हुए स्पष्ट करते हैं कि मानव जीवन पूर्वजन्म के संचित कर्मों और काल-पुरुष के अधिष्ठान से संचालित होता है। यह जातक की संपूर्ण जीवन-यात्रा का दार्शनिक आधार-स्तंभ है।",
      deepMeaning: "पाराशर होराशास्त्र का प्रथम सूत्र यह स्थापित करता है कि जन्म केवल आकस्मिक घटना नहीं है, अपितु आत्मा के विकास की एक निश्चित काल-योजना है।",
      badges: ["शास्त्र-प्रतिज्ञा", "काल-चक्र आधार"]
    });

    // =========================================================================
    // CHAPTER 2: द्वितीयोऽध्यायः — ग्रहावताराध्यायः (Planetary Avatars of Lord Vishnu)
    // =========================================================================
    const AVATAR_MAP = {
      Sun: { avatar: "भगवान श्रीराम (Lord Rama)", attribute: "मर्यादा, सत्यनिष्ठा, आत्मबल, धर्म-रक्षण एवं पितृ-आज्ञा", verse: "श्लोक ३" },
      Moon: { avatar: "भगवान श्रीकृष्ण (Lord Krishna)", attribute: "आनंद, प्रेम, लीला, सम्मोहन, मानसिक समता एवं कूटनीति", verse: "श्लोक ३" },
      Mars: { avatar: "भगवान नृसिंह (Lord Narasimha)", attribute: "अदम्य पराक्रम, निर्भयता, अनिष्ट-विनाश एवं रक्षा-सामर्थ्य", verse: "श्लोक ३" },
      Mercury: { avatar: "भगवान बुद्ध (Lord Buddha)", attribute: "विवेक, अहिंसा, वाक्-सिद्धि, परम शांति एवं वैज्ञानिक बुद्धि", verse: "श्लोक ३" },
      Jupiter: { avatar: "भगवान वामन (Lord Vamana)", attribute: "सर्वोच्च ज्ञान, उदारता, ईश्वरीय अनुग्रह एवं गुरु-तत्व", verse: "श्लोक ४" },
      Venus: { avatar: "भगवान परशुराम (Lord Parashurama)", attribute: "तपस्या, तेज, अस्त्र-विद्या, न्याय एवं नैतिक संप्रभुता", verse: "श्लोक ४" },
      Saturn: { avatar: "भगवान कच्छप / कूर्म (Lord Kurma)", attribute: "धैर्य, अचल स्थिरता, सहनशीलता एवं गहन साधना", verse: "श्लोक ४" },
      Rahu: { avatar: "भगवान वराह (Lord Varaha)", attribute: "संकट से उद्धार, पाताल-भेदन क्षमता एवं अद्भुत विजय", verse: "श्लोक ५" },
      Ketu: { avatar: "भगवान मत्स्य (Lord Matsya)", attribute: "मोक्ष, प्रलय-तरण, आत्म-ज्ञान एवं गुप्त आध्यात्मिक बोध", verse: "श्लोक ५" }
    };

    const akAvatar = AVATAR_MAP[atmakarakaId];
    matchedShlokas.push({
      chapterNumber: 2,
      chapterTitle: "द्वितीयोऽध्यायः — ग्रहावताराध्यायः",
      chapterSignificance: "नवग्रहों के माध्यम से परमब्रह्म के दशावतारों का दिव्य रहस्य",
      verseNumbers: akAvatar.verse,
      shlokaSanskrit: `रामोऽवतारः सूर्यस्य चन्द्रस्य यदुनायकः ।
नृसिंहो भूमिसूनोश्च बुद्धः सोमसुतस्य च ॥ ३ ॥
वामनो विबुधेज्यस्य भार्गवो भार्गवस्य च ।
कूर्मो मन्दस्य भवति वराहश्च तमोग्रहः ॥ ४ ॥
केतोर्मत्स्यावतारश्च ज्ञेया ह्येते ग्रहोद्भवाः ॥ ५ ॥`,
      applicabilityStatus: "आत्मकारक ग्रह द्वारा ईष्टदेव एवं आत्मिक स्वरूप मिलान",
      natalTrigger: `आपकी कुंडली के आत्मकारक ग्रह '${GRAHA_NAMES[atmakarakaId]}' हैं, जो ${RASHI_NAMES[atmakaraka.sign]} राशि के ${atmakaraka.deg.toFixed(2)}° पर स्थित होकर सर्वाधिक परिपक्व हैं।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार आपकी आत्मा का सर्वोच्च अधिष्ठान ${akAvatar.avatar} के दिव्य स्वरूप से संबद्ध है। आपके भीतर ${akAvatar.attribute} की अंतर्निहित नैसर्गिक शक्ति विद्यमान है।`,
      deepMeaning: `जब भी जीवन में गंभीर दिशा-भ्रम या संकट उत्पन्न हो, तब ${akAvatar.avatar} का ध्यान व मंत्र जातक के समस्त अवरोधों को नष्ट कर आत्म-उन्नयन प्रदान करता है।`,
      badges: ["आत्मकारक ईष्टदेव", akAvatar.avatar]
    });

    // =========================================================================
    // CHAPTER 3: तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः (Cabinet, Tridosha & Dignities)
    // =========================================================================
    
    // 3.1 Planetary Cabinet (राज्याधिकार)
    let cabinetRole = "";
    let cabinetGraha = "";
    if (planetMap['Sun'].house === 1 || planetMap['Sun'].house === 10) {
      cabinetRole = "राजा (King / Supreme Sovereign Authority)";
      cabinetGraha = "सूर्य";
    } else if (planetMap['Jupiter'].house === 1 || planetMap['Jupiter'].house === 10) {
      cabinetRole = "मंत्री / राजगुरु (Chief Minister & Wisdom Counselor)";
      cabinetGraha = "गुरु";
    } else if (planetMap['Mars'].house === 1 || planetMap['Mars'].house === 10) {
      cabinetRole = "सेनापति / नेता (Commander-in-Chief & Bold Leader)";
      cabinetGraha = "मंगल";
    } else if (planetMap['Mercury'].house === 1 || planetMap['Mercury'].house === 10) {
      cabinetRole = "युवराज (Crown Prince & Intellectual Strategist)";
      cabinetGraha = "बुध";
    } else if (planetMap['Venus'].house === 1 || planetMap['Venus'].house === 10) {
      cabinetRole = "आमात्य / नीति-परामर्शक (Diplomat & Creative Minister)";
      cabinetGraha = "शुक्र";
    } else {
      cabinetRole = "प्रशासकीय समन्वय (Administrative Harmonizer)";
      cabinetGraha = GRAHA_NAMES[lagneshaId];
    }

    matchedShlokas.push({
      chapterNumber: 3,
      chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
      chapterSignificance: "ग्रहों का राज्याधिकार, गुण, तत्व, वर्ण एवं स्वभाव विचार",
      verseNumbers: "श्लोक २१–२२",
      shlokaSanskrit: `सूर्यश्चन्द्रमसो राज्ञौ नेता स्यादवनीसुतः ।
बुधो राजकुमारश्च मन्त्री ज्ञेयो बृहस्पतिः ॥ २१ ॥
शुक्रो मन्त्री भवेच्चापि मन्दः प्रेष्यो भवेत्तथा ।
सेनाङ्गौ राहुकेतू च प्रोक्तौ मुनिवरोत्तमैः ॥ २२ ॥`,
      applicabilityStatus: "कर्म एवं व्यक्तित्व का पाराशर राज्याधिकार मिलान",
      natalTrigger: `लग्न अथवा दशम भाव पर '${cabinetGraha}' का मुख्य प्रभाव है, जो जातक को काल-पुरुष के राज्याधिकार में स्थान दिलाता है।`,
      classicalPrediction: `जातक के स्वभाव और आजीविका में पाराशर के अनुसार **'${cabinetRole}'** के गुण प्रमुख रूप से दृष्टिगोचर होंगे। जातक समाज में स्वतंत्र अधिकार, नेतृत्व और सम्मान की दिशा में अग्रसर रहता है।`,
      deepMeaning: "पाराशर के अनुसार जब ग्रह अपने नैसर्गिक राज्याधिकार का प्रतिनिधित्व करते हैं, तो व्यक्ति उसी के अनुरूप कार्य-क्षेत्र में यश प्राप्त करता है।",
      badges: ["ग्रह-मंत्रिमंडल", cabinetRole]
    });

    // 3.2 Ayurvedic Tridosha (त्रिदोष प्रकृति)
    const DOSHA_PROFILES = {
      Sun: { dosha: "पित्त (Pitta)", desc: "तीक्ष्ण पाचक अग्नि, ऊर्जावान, साहसी, उष्ण प्रकृति एवं नेतृत्वकारी तेज" },
      Mars: { dosha: "पित्त (Pitta)", desc: "अत्यधिक शारीरिक ऊर्जा, त्वरित निर्णय, उष्ण स्वभाव एवं मांसपेशियों का सुदृढ़ बल" },
      Moon: { dosha: "वात-कफ (Vata-Kapha)", desc: "सौम्य शरीर, जल-तत्व की अधिकता, संवेदनशील मन एवं शीतल स्वभाव" },
      Venus: { dosha: "वात-कफ (Vata-Kapha)", desc: "आकर्षक देह-यष्टि, सौंदर्य, कफ व वात का संतुलित समन्वय एवं ललित रुचि" },
      Jupiter: { dosha: "कफ प्रधान (Kapha Dominant)", desc: "गंभीर, पुष्ट देह, मेधा, उत्तम पाचन एवं धैर्यवान शारीरिक संरचना" },
      Saturn: { dosha: "वात प्रधान (Vata Dominant)", desc: "कृश अथवा दीर्घाकार देह, शुष्कता, स्नायु तंत्र की संवेदनशीलता एवं चंचलता" },
      Mercury: { dosha: "त्रिदोष सम (Tridosha Balanced)", desc: "वात, पित्त और कफ का पूर्ण संतुलन, त्वरित अनुकूलन क्षमता व लचीलापन" }
    };
    const lagneshDosha = DOSHA_PROFILES[lagneshaId] || DOSHA_PROFILES['Jupiter'];

    matchedShlokas.push({
      chapterNumber: 3,
      chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
      chapterSignificance: "शारीरिक संरचना एवं त्रिदोष (वात/पित्त/कफ) धातु विधान",
      verseNumbers: "श्लोक ३०–३१",
      shlokaSanskrit: `पित्तप्रकृतिको भानुश्चन्द्रो वातकफात्मकः ।
पित्तप्रकृतिको भौमः श्लेष्मलो वातको गुरुः ॥ ३० ॥
वातपित्तकफप्रकृतिर्बुधो वातकफः कविः ।
मन्दस्तु वातलो ज्ञेयः सर्वशास्त्रविशारदैः ॥ ३१ ॥`,
      applicabilityStatus: "लग्नेश आधारित नैसर्गिक शारीरिक त्रिदोष प्रकृति",
      natalTrigger: `आपकी कुंडली के लग्नेश '${GRAHA_NAMES[lagneshaId]}' हैं, जिनका नैसर्गिक दोष '${lagneshDosha.dosha}' है।`,
      classicalPrediction: `महर्षि पाराशर के अनुसार जातक का मूल शारीरिक संविधान **'${lagneshDosha.dosha}'** से संचालित है। विशेषताएँ: ${lagneshDosha.desc}।`,
      deepMeaning: "आयुर्वेद और वैदिक ज्योतिष का यह अटूट सूत्र जातक के खान-पान, दिनचर्या और स्वास्थ्य-संतुलन की अचूक कुंजी है।",
      badges: ["आयुर्वेदिक त्रिदोष", lagneshDosha.dosha]
    });

    // 3.3 Exaltation / Debilitation / Moolatrikona Check
    sevenGrahas.forEach(gid => {
      const p = planetMap[gid];
      if (p.sign === EXALTATION_SIGNS[gid]) {
        matchedShlokas.push({
          chapterNumber: 3,
          chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
          chapterSignificance: "ग्रहों के परम उच्च, मूलत्रिकोण एवं स्वक्षेत्रीय बल",
          verseNumbers: "श्लोक ४९–५१",
          shlokaSanskrit: `मेषे रविस्तुङ्गो वृषे चन्द्रः कुजो नक्रगतस्तथा ।
कन्यायां च बुधस्तुङ्गः कर्के जीवः प्रकीर्तितः ॥ ४९ ॥
मीने शुक्रः शनिश्चापि तुलायां तुङ्गसंज्ञकः ॥ ५० ॥`,
          applicabilityStatus: `ग्रह उच्च बल मिलान (${p.grahaName} उच्च राशि में)`,
          natalTrigger: `${p.grahaName} देव ${p.rashiName} राशि के ${p.deg.toFixed(2)}° पर स्थित होकर कुंडली के ${p.house}वें भाव में पूर्ण 'उच्च' (Exalted) हैं।`,
          classicalPrediction: `महर्षि पाराशर के अनुसार उच्च राशि का ${p.grahaName} जातक को अपने कारकत्व और भाव से संबंधित सर्वोच्च फल, सम्मान, अतुल्य सामर्थ्य और सिद्धि प्रदान करता है।`,
          deepMeaning: "उच्च का ग्रह जीवन में कम से कम एक ऐसा क्षेत्र अवश्य बनाता है जहाँ जातक दूसरों से मीलों आगे निकल जाता है।",
          badges: ["उच्च ग्रह (Exalted)", `${p.grahaName} उच्च`]
        });
      } else if (p.sign === DEBILITATION_SIGNS[gid]) {
        matchedShlokas.push({
          chapterNumber: 3,
          chapterTitle: "तृतीयोऽध्यायः — ग्रहगुणादिस्वरूपाध्यायः",
          chapterSignificance: "ग्रहों की नीच राशि एवं उसके परिहार के नियम",
          verseNumbers: "श्लोक ५१–५२",
          shlokaSanskrit: `सप्तमे तु भवेन्नीचं यद्भावे परमोच्चयः ।
नीचग्रहोऽपि शुभदो यदि केन्द्रे व्यवस्थितः ॥ ५१ ॥`,
          applicabilityStatus: `ग्रह नीच स्थिति विश्लेषण (${p.grahaName})`,
          natalTrigger: `${p.grahaName} देव ${p.rashiName} राशि में ${p.house}वें भाव में नीच राशि में स्थित हैं।`,
          classicalPrediction: `महर्षि पाराशर के अनुसार नीच ग्रह जातक को उस क्षेत्र में विशेष संघर्ष के बाद ही सफलता देता है, किंतु यदि इसका नीचभंग हो जाए तो यह अप्रत्याशित राजयोग में बदल जाता है।`,
          deepMeaning: "नीच ग्रह जातक को आत्ममंथन और दृढ़ संकल्प सिखाता है।",
          badges: ["नीच स्थिति", `${p.grahaName} नीच`]
        });
      }
    });

    // =========================================================================
    // CHAPTER 4: चतुर्थोऽध्यायः — राशिस्वरूपाध्यायः (Zodiac Sign Characteristics)
    // =========================================================================
    const SHIRSHODAYA_SIGNS = [2, 4, 5, 6, 7, 10]; // मिथुन, सिंह, कन्या, तुला, वृश्चिक, कुम्भ
    const PRISHTODAYA_SIGNS = [0, 1, 3, 8, 9];    // मेष, वृषभ, कर्क, धनु, मकर
    const isShirshodaya = SHIRSHODAYA_SIGNS.includes(lagnaSign);
    const risingNature = isShirshodaya ? "शीर्षोदय राशि (Shirshodaya)" : (lagnaSign === 11 ? "उभयोदय राशि (Ubhayodaya)" : "पृष्ठोदय राशि (Prishtodaya)");

    const MOBILITY_MAP = ["चर (Movable)", "स्थिर (Fixed)", "द्विस्वभाव (Dual)"];
    const lagnaMobility = MOBILITY_MAP[lagnaSign % 3];

    matchedShlokas.push({
      chapterNumber: 4,
      chapterTitle: "चतुर्थोऽध्यायः — राशिस्वरूपाध्यायः",
      chapterSignificance: "द्वादश राशियों का स्वरूप, उदय-प्रकृति, गति एवं देह-अंग विचार",
      verseNumbers: "श्लोक ५–१०",
      shlokaSanskrit: `शीर्षोदया भवन्त्येते मिथुनं सिंहकन्यके ।
तुला च वृश्चिको मन्दः कुम्भो ज्ञेयः शुभप्रदः ॥ ५ ॥
पृष्ठोदयास्तथान्ये स्युर्मीनो ह्युभयतोमुखः ।
चरस्थिरद्विस्वभावा राशयः परिकीर्तिताः ॥ ६ ॥`,
      applicabilityStatus: "जन्म लग्न राशि का मौलिक स्वरूप एवं उदय-विधान",
      natalTrigger: `आपका जन्म लग्न '${RASHI_NAMES[lagnaSign]}' है, जो कि '${risingNature}' एवं '${lagnaMobility}' राशि है।`,
      classicalPrediction: isShirshodaya 
        ? "महर्षि पाराशर के अनुसार शीर्षोदय लग्न में जन्म लेने वाले जातक के कार्यों के फल जीवन के पूर्वार्ध एवं मध्यकाल में सहजता, त्वरित बुद्धि और उत्साह के साथ प्रकट होते हैं।"
        : (lagnaSign === 11 
            ? "उभयोदय लग्न होने से जीवन में ज्ञान, आध्यात्मिकता और व्यावहारिक कर्म का अनुपम संतुलन रहता है।"
            : "पृष्ठोदय लग्न होने से जीवन के आरंभ में कठोर श्रम और अनुभव प्राप्त होते हैं, किंतु उत्तरार्ध में स्थायी सफलता, स्थिरता और विपुल सिद्धि प्राप्त होती है।"),
      deepMeaning: "लग्न राशि जातक का वह आंतरिक लेंस है जिससे वह समस्त बाह्य संसार को देखता और उस पर प्रतिक्रिया करता है।",
      badges: [risingNature, lagnaMobility]
    });

    // =========================================================================
    // CHAPTER 5: पञ्चमोऽध्यायः — विशेषलग्नाध्यायः (Special Lagnas - Hora & Ghatika)
    // =========================================================================
    // Computation of Hora Lagna (HL) and Ghatika Lagna (GL)
    // Formula: HL advances at 1 sign per 2.5 ghatis (60 mins). GL advances at 1 sign per 1 ghati (24 mins).
    // Indu Lagna: Sum of 9th house lords' rays from Lagna & Moon modulo 12.
    const RAY_POINTS = { Sun: 30, Moon: 16, Mars: 6, Mercury: 8, Jupiter: 10, Venus: 12, Saturn: 1 };
    const h9LordFromLagna = RASHI_LORDS[(lagnaSign + 8) % 12];
    const h9LordFromMoon = RASHI_LORDS[(moon.sign + 8) % 12];
    const induSum = (RAY_POINTS[h9LordFromLagna] || 10) + (RAY_POINTS[h9LordFromMoon] || 10);
    const induSign = (moon.sign + (induSum % 12)) % 12;
    const induHouse = getHouse(induSign, lagnaSign);

    matchedShlokas.push({
      chapterNumber: 5,
      chapterTitle: "पञ्चमोऽध्यायः — विशेषलग्नाध्यायः",
      chapterSignificance: "होरा लग्न, घटिका लग्न एवं इन्दु लग्न के विशेष राजयोग सूत्र",
      verseNumbers: "श्लोक ३–६",
      shlokaSanskrit: `लग्नात् पञ्चमतो ज्ञेयं घटिकायाश्च लक्षणम् ।
होरायाश्च तथैवेह धनधान्यसमृद्धिदम् ॥ ३ ॥
इन्दुना संस्थितो योगो नृपकोटिपतिप्रदः ।
यद्भावे संस्थितश्चेन्दुस्तद्भावफलमुत्तमम् ॥ ४ ॥`,
      applicabilityStatus: "विशेष इन्दु लग्न एवं वित्तीय शक्ति मिलान",
      natalTrigger: `आपकी कुंडली में नवमेश रश्मि योग से 'इन्दु लग्न' ${RASHI_NAMES[induSign]} राशि में स्थित है, जो लग्न से ${induHouse}वें भाव में पड़ता है।`,
      classicalPrediction: isKendra(induHouse) || isTrikona(induHouse) || induHouse === 11 || induHouse === 2
        ? "महर्षि पाराशर के अनुसार आपका इन्दु लग्न अत्यंत शुभ भाव (केन्द्र/त्रिकोण/लाभ) में है! यह जातक को जीवन में विपुल वित्तीय संचय, अचल संपत्ति और वित्तीय संकटों से स्वतः मुक्ति का 'पाराशर कुबेर योग' प्रदान करता है।"
        : "इन्दु लग्न की यह स्थिति दर्शाती है कि जातक को धन संचय के लिए योजनाबद्ध निवेश और अनुशासित व्यय पर ध्यान केंद्रित करना चाहिए।",
      deepMeaning: "पाराशर होराशास्त्र में सामान्य लग्न देह का प्रतीक है, जबकि इन्दु लग्न जातक के पूर्वार्जित धन-पुण्य की तिजोरी है।",
      badges: ["विशेष इन्दु लग्न", `इन्दु भाव: ${induHouse}`]
    });

    // =========================================================================
    // CHAPTERS 6 & 7: षष्ठो व सप्तमोऽध्यायः — षोडशवर्ग एवं वैशेषिकांश (Vaisheshikamsa)
    // =========================================================================
    // Evaluate how many good vargas each planet attains
    const VAISHESHIKAMSA_LEVELS = [
      { count: 2, title: "पारिजात (Parijata)", badge: "पारिजातांश", desc: "सदा शुभ, निरंतर प्रगति, समाज में सम्मान एवं स्थिर आजीविका" },
      { count: 3, title: "उत्तम (Uttama)", badge: "उत्तमांश", desc: "उत्कृष्ट चरित्र, उच्च प्रतिष्ठा, धर्म-परायणता एवं सद्गुण" },
      { count: 4, title: "गोपुर (Gopura)", badge: "गोपुरांश", desc: "विपुल भूमि, भवन, विद्वत्ता, शास्त्र-ज्ञान एवं बुद्धिजीवियों में आदर" },
      { count: 5, title: "सिंहासन (Simhasana)", badge: "सिंहासनांश", desc: "प्रशासकीय अधिकार, राजसत्ता, उच्च नेतृत्व एवं निर्णायक शक्ति" },
      { count: 6, title: "पारावत (Paravata)", badge: "पारावतांश", desc: "राजतुल्य ऐश्वर्य, उत्कृष्ट वाहन सुख, अक्षय कीर्ति एवं अपार समृद्धि" },
      { count: 7, title: "देवलोक (Devaloka)", badge: "देवलोकांश", desc: "संत-तुल्य गरिमा, आध्यात्मिक प्रभाव, ईश्वरीय कृपा एवं सार्वभौम यश" },
      { count: 8, title: "ऐरावत (Airavata)", badge: "ऐरावतांश", desc: "सर्वोच्च संप्रभुता, कालजयी ख्याति, ऐतिहासिक नेतृत्व एवं असीम सम्मान" }
    ];

    const vargaList = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
    const bestVaisheshikamsa = [];

    sevenGrahas.forEach(gid => {
      const p = planetMap[gid];
      let goodCount = 0;
      vargaList.forEach(vNum => {
        const vSign = getVargaSign(p.sign, p.deg, vNum);
        if (isPlanetDignifiedInSign(gid, vSign)) {
          goodCount++;
        }
      });

      if (goodCount >= 2) {
        let matchedTier = VAISHESHIKAMSA_LEVELS[0];
        for (let i = VAISHESHIKAMSA_LEVELS.length - 1; i >= 0; i--) {
          if (goodCount >= VAISHESHIKAMSA_LEVELS[i].count) {
            matchedTier = VAISHESHIKAMSA_LEVELS[i];
            break;
          }
        }
        bestVaisheshikamsa.push({
          planetId: gid,
          grahaName: p.grahaName,
          goodCount,
          tier: matchedTier
        });
      }
    });

    if (bestVaisheshikamsa.length > 0) {
      // Pick top planet
      bestVaisheshikamsa.sort((a, b) => b.goodCount - a.goodCount);
      const topBadge = bestVaisheshikamsa[0];

      matchedShlokas.push({
        chapterNumber: 7,
        chapterTitle: "सप्तमोऽध्यायः — वर्गविवेकाध्यायः",
        chapterSignificance: "षोडशवर्गों में ग्रहों के वैशेषिकांश एवं सर्वोच्च राजयोग सम्मान",
        verseNumbers: "श्लोक ३३–३६",
        shlokaSanskrit: `द्वाभ्यां पारिजातांशश्च त्रिभिः स्यादुत्तमो मतः ।
चतुर्भिर्गोपुरः प्रोक्तः पञ्चभिः सिंहसंज्ञकः ॥ ३३ ॥
षड्भिः पारावतश्चापि सप्तभिर्देवलोककः ।
अष्टभिश्चैरावतो ज्ञेयः सर्वराजसुपूजितः ॥ ३४ ॥`,
        applicabilityStatus: `वैशेषिकांश राजयोग मिलान (${topBadge.grahaName}: ${topBadge.tier.title})`,
        natalTrigger: `आपके ${topBadge.grahaName} देव ने १६ सूक्ष्म वर्गों में से ${topBadge.goodCount} वर्गों में शुभ स्व/उच्च/मूलत्रिकोण स्थान प्राप्त करके '**${topBadge.tier.title}**' उपाधि अर्जित की है।`,
        classicalPrediction: `महर्षि पाराशर के अनुसार जब कोई ग्रह ${topBadge.tier.title} में प्रवेश करता है, तो: "${topBadge.tier.desc}"। यह जातक के जीवन का सबसे मजबूत आधार बन जाता है।`,
        deepMeaning: "स्थूल कुंडली में ग्रह सामान्य दिख सकता है, किंतु सूक्ष्म षोडशवर्गों में वैशेषिकांश प्राप्त ग्रह जातक के भाग्य का वास्तविक निर्माता होता है।",
        badges: [topBadge.tier.badge, `${topBadge.grahaName}: ${topBadge.goodCount} वर्ग`]
      });
    }

    // =========================================================================
    // CHAPTER 8: अष्टमोऽध्यायः — ग्रहाणां दृष्टयः (Planetary Aspects)
    // =========================================================================
    // Check Jupiter's 5th, 7th, 9th aspect or Mars 4, 8 or Saturn 3, 10
    const jupHouse = jupiter.house;
    const jupAspectHouses = [((jupHouse + 4) % 12) || 12, ((jupHouse + 6) % 12) || 12, ((jupHouse + 8) % 12) || 12];
    
    let jupAspectOnLagnaOrMoon = false;
    let jupAspectTarget = "";
    if (jupAspectHouses.includes(1)) {
      jupAspectOnLagnaOrMoon = true;
      jupAspectTarget = "प्रथम भाव (लग्न)";
    } else if (jupAspectHouses.includes(moon.house)) {
      jupAspectOnLagnaOrMoon = true;
      jupAspectTarget = "चन्द्रमा (मन व बुद्धि)";
    }

    if (jupAspectOnLagnaOrMoon) {
      matchedShlokas.push({
        chapterNumber: 8,
        chapterTitle: "अष्टमोऽध्यायः — ग्रहाणां दृष्टयः",
        chapterSignificance: "देवगुरु बृहस्पति की दिव्य अमृत दृष्टि एवं सर्व-दोष शमन विधान",
        verseNumbers: "श्लोक ५–६",
        shlokaSanskrit: `पश्यन्ति त्रिदशं मन्दश्चतुरष्टमवं कुजः ।
त्रिकोणं गुरुणा दृष्टं सर्वदोषविनाशनम् ॥ ५ ॥
एकोऽपि विमले केंद्रे गुरुर्दोषसहस्रहन्ता ॥ ६ ॥`,
        applicabilityStatus: "देवगुरु बृहस्पति की अमृत दृष्टि मिलान",
        natalTrigger: `देवगुरु बृहस्पति कुंडली के ${jupHouse}वें भाव से अपनी अमृतमयी दृष्टि आपके ${jupAspectTarget} पर डाल रहे हैं।`,
        classicalPrediction: "महर्षि पाराशर का अमर वचन है कि गुरु की त्रिकोण दृष्टि हजारों दुर्योगों को शांत कर देती है। यह जातक को आंतरिक विवेक, संकटों से ईश्वरीय रक्षा, सात्विक यश और दीर्घायु का वरदान प्रदान करती है।",
        deepMeaning: "जब देवगुरु लग्न या चंद्रमा को अपनी दृष्टि से अभिसिंचित करते हैं, तो व्यक्ति कठिन से कठिन परिस्थिति में भी सही निर्णय लेने में सक्षम होता है।",
        badges: ["गुरु अमृत दृष्टि", "सहस्रदोषहन्ता"]
      });
    }

    // =========================================================================
    // CHAPTER 9: नवमोऽध्यायः — द्वादशभावविचाराध्यायः (Master House Significations)
    // =========================================================================
    matchedShlokas.push({
      chapterNumber: 9,
      chapterTitle: "नवमोऽध्यायः — द्वादशभावविचाराध्यायः",
      chapterSignificance: "द्वादश भावों के प्रामाणिक कारकत्व, अधिकार एवं जीवन-विभाग",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `देहं रूपं च ज्ञानं च वर्णं चैव बलाबलम् ।
सुखं दुःखं स्वभावञ्च लग्नभावान्निरीक्षयेत् ॥ १ ॥
वित्तं धान्यं कुटुम्बञ्च मृत्युजालं धनादिकम् ।
धात्वादि सर्वं वाग्जालं द्वितीयात् परिचिन्तयेत् ॥ २ ॥`,
      applicabilityStatus: "द्वादश भाव कारकत्व एवं जीवन-क्षेत्र विभाजन",
      natalTrigger: `लग्न भाव (${RASHI_NAMES[lagnaSign]}) जातक की देह, रूप व ज्ञान का केंद्र है; तथा द्वितीय भाव (${RASHI_NAMES[(lagnaSign + 1) % 12]}) कुटुम्ब, वाणी व संचित कोष का नियंत्रक है।`,
      classicalPrediction: "महर्षि पाराशर ने स्पष्ट किया है कि संपूर्ण जीवन के फल इन्हीं 12 भावों के दर्पण में प्रतिबिंबित होते हैं। जातक का संपूर्ण व्यक्तित्व लग्न और द्वितीय भाव के तालमेल से निर्मित होता है।",
      deepMeaning: "पाराशर के अनुसार जब तक भाव के मूल कारकत्व का ध्यान न रखा जाए, तब तक कोई भी फलकथन सटीक नहीं हो सकता।",
      badges: ["द्वादश भाव विधान", "पाराशर कारकत्व"]
    });

    // =========================================================================
    // CHAPTER 10: दशमोऽध्यायः — तनुभावफलाध्यायः (1st House Predictive Evaluation)
    // =========================================================================

    // 10.1 Lagnesha in Kendra/Trikona vs Trika (श्लोक १)
    const lagneshHouse = lagnesha.house;
    if (isKendra(lagneshHouse) || isTrikona(lagneshHouse)) {
      matchedShlokas.push({
        chapterNumber: 10,
        chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
        chapterSignificance: "तनुभाव (लग्न) फल — शारीरिक सुख, आरोग्य एवं व्यक्तित्व",
        verseNumbers: "श्लोक १",
        shlokaSanskrit: `सपापो देहपोऽष्टारिव्ययगो देहसौख्यहृत् ।
केन्द्रे कोणे स्थितोऽङ्गेशः सदा देहसुखं दिशेत् ॥ १ ॥`,
        applicabilityStatus: `लग्नेश केन्द्र/त्रिकोण राजयोग मिलान (${lagnesha.grahaName} भाव ${lagneshHouse} में)`,
        natalTrigger: `आपके लग्नेश (देहप) '${lagnesha.grahaName}' कुंडली के ${lagneshHouse}वें भाव में स्थित हैं, जो कि सर्वोच्च शुभ केन्द्र/त्रिकोण स्थान है।`,
        classicalPrediction: "महर्षि पाराशर का प्रत्यक्ष सूत्र: 'केन्द्रे कोणे स्थितोऽङ्गेशः सदा देहसुखं दिशेत्' — लग्नेश का केन्द्र या त्रिकोण में होना जातक को निरंतर शारीरिक सुख, उत्तम आरोग्य, प्रबल जीवनी-शक्ति (Ojas) और समाज में दीर्घायु व प्रतिष्ठा प्रदान करता है।",
        deepMeaning: "लग्नेश देह का प्राण है; जब प्राण-रक्षक स्वयं केन्द्र या त्रिकोण रूपी विष्णु-लक्ष्मी स्थानों में विराजता है, तो समस्त शारीरिक व्याधियों पर जातक की विजय होती है।",
        badges: ["देहसुख योग", `${lagnesha.grahaName} भाव ${lagneshHouse}`]
      });
    } else if (isTrika(lagneshHouse)) {
      matchedShlokas.push({
        chapterNumber: 10,
        chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
        chapterSignificance: "लग्नेश की त्रिक स्थिति एवं आरोग्य सुरक्षा निर्देश",
        verseNumbers: "श्लोक १–२",
        shlokaSanskrit: `सपापो देहपोऽष्टारिव्ययगो देहसौख्यहृत् ।
नीचग्रहोऽपि शुभदो यदि केन्द्रे व्यवस्थितः ॥ १ ॥`,
        applicabilityStatus: `लग्नेश त्रिक भाव विश्लेषण (${lagnesha.grahaName} भाव ${lagneshHouse} में)`,
        natalTrigger: `आपके लग्नेश '${lagnesha.grahaName}' कुंडली के ${lagneshHouse}वें भाव में स्थित हैं।`,
        classicalPrediction: "महर्षि पाराशर सचेत करते हैं कि लग्नेश के ६, ८, या १२वें भाव में होने पर जातक को अपनी दिनचर्या, उदर-स्वास्थ्य और नियमित व्यायाम के प्रति सदैव सतर्क रहना चाहिए ताकि देहसुख बाधित न हो।",
        deepMeaning: "पाराशर के अनुसार ऐसे जातक को लग्नेश के मंत्र-जप और साधना से अपनी प्राण-शक्ति को निरंतर जागृत रखना चाहिए।",
        badges: ["त्रिक लग्नेश", "आरोग्य सतर्कता"]
      });
    }

    // 10.2 Benefics in Lagna (श्लोक ३–५)
    const planetsInLagna = planets.filter(p => p.id !== 'Lagna' && p.house === 1);
    const hasBeneficInLagna = planetsInLagna.some(p => ['Jupiter', 'Venus', 'Mercury'].includes(p.id));
    if (hasBeneficInLagna) {
      const beneficNames = planetsInLagna.filter(p => ['Jupiter', 'Venus', 'Mercury'].includes(p.id)).map(p => GRAHA_NAMES[p.id]).join(', ');
      matchedShlokas.push({
        chapterNumber: 10,
        chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
        chapterSignificance: "लग्न में शुभ ग्रहों की उपस्थिति — कांति, आकर्षण एवं दीर्घायु",
        verseNumbers: "श्लोक ३–४",
        shlokaSanskrit: `लग्ने सौम्यग्रहे संस्थे रूपवान् सुभगो भवेत् ।
दीर्घायुः सर्वसम्पन्नः सत्यवादी जितेन्द्रियः ॥ ३ ॥`,
        applicabilityStatus: `लग्नस्थ शुभ ग्रह योग (${beneficNames})`,
        natalTrigger: `आपके लग्न भाव में शुभ ग्रह '${beneficNames}' विराजमान हैं।`,
        classicalPrediction: "महर्षि पाराशर के अनुसार लग्न में शुभ ग्रह की स्थिति जातक को मनमोहक शारीरिक स्वरूप, कांतिमान चेहरा, मधुर वाणी, दीर्घायु, सत्यवादिता और सभी संपत्तियों से युक्त बनाती है।",
        deepMeaning: "लग्न में शुभ ग्रह जातक के प्रभामंडल (Aura) को इतना शक्तिशाली बना देते हैं कि लोग अनायास ही उसकी ओर आकर्षित और प्रभावित होते हैं।",
        badges: ["सुभग रूप योग", beneficNames]
      });
    }

    // 10.3 Bodily Marks & Moles (देह-चिह्न / तिल / मस्सा / व्रण विचार - श्लोक ११–१५)
    // Parashara assigns the three Drekkanas of Lagna:
    // 1st Drekkana (0-10 deg): Head, Forehead, Face (शिरोभाग, ललाट, मुख)
    // 2nd Drekkana (10-20 deg): Neck, Chest, Abdomen (कण्ठ, वक्षःस्थल, उदर)
    // 3rd Drekkana (20-30 deg): Lower Back, Pelvis, Knees, Feet (कटि, जंघा, पाद)
    const drekkanaNum = Math.floor(lagnaDeg / 10) + 1; // 1, 2, or 3
    let anatomicalRegion = "";
    let bodyMarkDesc = "";

    if (drekkanaNum === 1) {
      anatomicalRegion = "मस्तक, ललाट अथवा मुख-मण्डल (Head, Forehead, Face)";
      bodyMarkDesc = "जातक के मस्तक, ललाट, भौंह अथवा चेहरे पर एक विशिष्ट तिल, मस्सा अथवा जन्मजात पहचान-चिह्न विद्यमान होता है।";
    } else if (drekkanaNum === 2) {
      anatomicalRegion = "कण्ठ, कंधा, वक्षःस्थल अथवा उदर (Neck, Chest, Abdomen)";
      bodyMarkDesc = "जातक के कण्ठ, कंधे, वक्षःस्थल (छाती) अथवा नाभि/पेट के आसपास एक प्राकृतिक तिल, मस्सा अथवा सूक्ष्म स्थायी चिह्न रहता है।";
    } else {
      anatomicalRegion = "कटि, जंघा, घुटने अथवा पैर (Waist, Thighs, Feet)";
      bodyMarkDesc = "जातक के कमर के निचले भाग, जंघा, घुटने अथवा पैर के तलवे/अंगूठे पर एक विशेष तिल अथवा जन्म-चिह्न का प्रभाव रहता है।";
    }

    matchedShlokas.push({
      chapterNumber: 10,
      chapterTitle: "दशमोऽध्यायः — तनुभावफलाध्यायः",
      chapterSignificance: "लग्न द्रेष्काण द्वारा देह-चिह्न, तिल, मस्सा एवं व्रण विचार",
      verseNumbers: "श्लोक ११–१२",
      shlokaSanskrit: `लग्नांशकद्रेष्काणवशाच्छरीरे लक्ष्म निर्दिशेत् ।
प्रथमे मूनि विज्ञेयं द्वितीये ग्रीवकण्ठयोः ॥ ११ ॥
तृतीये पादकटिगे लक्ष्म चिह्नानि निर्दिशेत् ।
पापग्रहेण संदृष्टे व्रणो भवति निश्चितम् ॥ १२ ॥`,
      applicabilityStatus: `लग्न द्रेष्काण देह-चिह्न मिलान (द्रेष्काण ${drekkanaNum})`,
      natalTrigger: `आपकी जन्म कुंडली का लग्न ${lagnaDeg.toFixed(2)}° पर है, जो कि **प्रथम, द्वितीय या तृतीय में से '${drekkanaNum}रा द्रेष्काण'** है।`,
      classicalPrediction: `महर्षि पाराशर का प्रत्यक्ष शरीर-लक्षण सूत्र: **${anatomicalRegion}** में स्थायी देह-चिह्न! ${bodyMarkDesc}`,
      deepMeaning: "पाराशर की यह सूक्ष्म द्रेष्काण शरीर-रचना प्रणाली वैदिक ज्योतिष की गणितीय सूक्ष्मता का प्रत्यक्ष और जीवंत प्रमाण है।",
      badges: [`द्रेष्काण ${drekkanaNum}`, anatomicalRegion.split(' ')[0]]
    });

    // =========================================================================
    // BHAVA LORDS & OCCUPANTS MAP (Chapters 11 to 20 Evaluation)
    // =========================================================================
    const bhavaLords = {};
    for (let h = 1; h <= 12; h++) {
      const sIndex = (lagnaSign + h - 1) % 12;
      const lId = RASHI_LORDS[sIndex];
      bhavaLords[h] = {
        house: h,
        sign: sIndex,
        rashiName: RASHI_NAMES[sIndex],
        lordId: lId,
        grahaName: GRAHA_NAMES[lId] || lId,
        planet: planetMap[lId]
      };
    }

    const houseOccupants = {};
    for (let h = 1; h <= 12; h++) houseOccupants[h] = [];
    ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].forEach(gid => {
      const p = planetMap[gid];
      if (p && p.house) {
        houseOccupants[p.house].push(p);
      }
    });

    const h2 = bhavaLords[2];
    const h3 = bhavaLords[3];
    const h4 = bhavaLords[4];
    const h5 = bhavaLords[5];
    const h6 = bhavaLords[6];
    const h7 = bhavaLords[7];
    const h8 = bhavaLords[8];
    const h9 = bhavaLords[9];
    const h10 = bhavaLords[10];
    const h11 = bhavaLords[11];
    const h12 = bhavaLords[12];

    // =========================================================================
    // CHAPTER 11: एकादशोऽध्यायः — धनभावफलाध्यायः (2nd House / Dhana Bhava Phala)
    // =========================================================================
    const isH2LordAuspicious = isKendra(h2.planet.house) || isTrikona(h2.planet.house) || h2.planet.house === 11 || h2.planet.house === 2;
    matchedShlokas.push({
      chapterNumber: 11,
      chapterTitle: "एकादशोऽध्यायः — धनभावफलाध्यायः",
      chapterSignificance: "द्वितीय भाव — संचित धन, पैतृक संपदा, वाणी एवं कुटुम्ब समृद्धि",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `धनेशे केन्द्रकोणे वा लाभे वा धनसंयुते ।
स्वोच्चमित्रस्वगे वापि बहुवित्तयुतो भवेत् ॥ १ ॥
धने शुभग्रहैर्युक्ते दृष्टे वा धनवान् भवेत् ।
वागीशे गुरुणा युक्ते वाक्पटुर्विशारदः ॥ २ ॥`,
      applicabilityStatus: isH2LordAuspicious 
        ? `पाराशर धन-संचय एवं समृद्ध कुटुम्ब योग (धनेश '${h2.grahaName}' भाव ${h2.planet.house} में)`
        : `धनेश त्रिक विश्लेषण एवं वित्तीय अनुशासन सूत्र (${h2.grahaName} भाव ${h2.planet.house} में)`,
      natalTrigger: `द्वितीय भाव (धन, संचय व कुटुम्ब) की राशि ${h2.rashiName} है तथा इसके स्वामी '${h2.grahaName}' कुंडली के ${h2.planet.house}वें भाव (${h2.planet.rashiName} राशि) में स्थित हैं।`,
      classicalPrediction: isH2LordAuspicious
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: 'धनेशे केन्द्रकोणे वा लाभे वा बहुवित्तयुतो भवेत्' — धनेश का शुभ केन्द्र, त्रिकोण या लाभ स्थान में होना जातक को विपुल संचित धन, पैतृक संपत्ति, आदरणीय वाणी एवं संपन्न कुटुम्ब का सुख प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार धनेश की स्थिति दर्शाती है कि जातक को धन संचय के लिए विशेष वित्तीय अनुशासन, सुरक्षित निवेश और दूरदर्शी योजना अपनानी चाहिए। दूरस्थ व्यापार या तकनीकी कार्यों से धन-वृद्धि होती है।`,
      deepMeaning: "द्वितीय भाव केवल मुद्रा का नहीं, अपितु व्यक्ति के नैतिक मूल्य और वाणी की साख का अधिष्ठान है। शुभ धनेश जातक के वचनों को प्रभावोत्पादक और विश्वसनीय बनाता है।",
      badges: [isH2LordAuspicious ? "पाराशर धन-संचय योग" : "वित्तीय अनुशासन", `धनेश: ${h2.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 12: द्वादशोऽध्यायः — सहजभावफलाध्यायः (3rd House / Sahaja & Bhratri Phala)
    // =========================================================================
    const isH3LordStrong = isKendra(h3.planet.house) || isTrikona(h3.planet.house) || h3.planet.house === 3 || h3.planet.house === 11;
    matchedShlokas.push({
      chapterNumber: 12,
      chapterTitle: "द्वादशोऽध्यायः — सहजभावफलाध्यायः",
      chapterSignificance: "तृतीय भाव — अदम्य साहस, पराक्रम, भ्रातृ-सौख्य, संचार एवं बाहुबल",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सहजपे केन्द्रकोणे वा स्वोच्चे वा स्वगृहे स्थिते ।
भ्रातृवृद्धिर्भवेत्तस्य भ्रातृमान् साहसी नरः ॥ १ ॥
पराक्रमे बलोपेते धैर्यवान् कीर्तिवर्धनः ।
शौर्यवीर्यगुणोपेतः सर्वशत्रुभयंकरः ॥ २ ॥`,
      applicabilityStatus: `पाराशर अदम्य पराक्रम एवं भ्रातृ-सौख्य योग (तृतीयेश '${h3.grahaName}')`,
      natalTrigger: `तृतीय भाव (पराक्रम, उद्यम व सहज) की राशि ${h3.rashiName} है; तृतीयेश '${h3.grahaName}' भाव ${h3.planet.house} में स्थित हैं तथा कारक मंगल ${mars.rashiName} राशि में हैं।`,
      classicalPrediction: isH3LordStrong
        ? `महर्षि पाराशर के अनुसार तृतीयेश का बलवान होना जातक को निडर स्वभाव, अदम्य साहस, भाई-बहनों का सहयोग, उत्कृष्ट लेखन व संचार कौशल तथा उद्यम द्वारा स्वयं का भाग्य निर्मित करने का वरदान देता है।`
        : `महर्षि पाराशर के अनुसार जातक अपने व्यक्तिगत पुरुषार्थ, सतत धैर्य और स्वतंत्र संकल्प शक्ति के बल पर जीवन में सभी कठिनाइयों पर विजय प्राप्त करता है।`,
      deepMeaning: "तृतीय भाव आंतरिक इच्छा-शक्ति और उद्यम का केंद्र है; शास्त्रों के अनुसार बिना पराक्रम के कोई भी भाग्य या राजयोग फलीभूत नहीं होता।",
      badges: ["अदम्य पराक्रम योग", `तृतीयेश: ${h3.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 13: त्रयोदशोऽध्यायः — सुखभावफलाध्यायः (4th House / Sukha, Matri & Vahana Phala)
    // =========================================================================
    const isH4LordStrong = isKendra(h4.planet.house) || isTrikona(h4.planet.house) || h4.planet.house === 4;
    matchedShlokas.push({
      chapterNumber: 13,
      chapterTitle: "त्रयोदशोऽध्यायः — सुखभावफलाध्यायः",
      chapterSignificance: "चतुर्थ भाव — माता, गृह, भूमि, अचल संपत्ति, श्रेष्ठ वाहन एवं आंतरिक शांति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सुखे शुभग्रहैर्युक्ते सुखेन्द्रे केन्द्रकोणगे ।
वाहनाढ्यः सुखी मर्त्यो मातृदीर्घायुरुच्यते ॥ १ ॥
शुक्रश्चतुर्थे यदि वा सुखेन्द्रे वाहनाधिपः ।
राजतुल्यसुखं प्राप्य गृहे लक्ष्म्या विराजते ॥ २ ॥`,
      applicabilityStatus: `पाराशर गृह-वाहन एवं मातृ-सौख्य योग (सुखेश '${h4.grahaName}')`,
      natalTrigger: `चतुर्थ भाव (माता, भवन, वाहन व आंतरिक सुख) के स्वामी '${h4.grahaName}' कुंडली के ${h4.planet.house}वें भाव में हैं; कारक शुक्र ${venus.rashiName} में एवं चन्द्रमा ${moon.rashiName} में हैं।`,
      classicalPrediction: isH4LordStrong
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: चतुर्थेश का केन्द्र या त्रिकोण में होना जातक को भव्य आवास, उत्तम वाहनों का सुख, भूमि-भवन लाभ, मातृ-स्नेह तथा मानसिक शांति का 'अखंड सुख योग' प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार चतुर्थेश की यह स्थिति दर्शाती है कि जातक को मातृ-सेवा, गृह-सद्भाव एवं संपत्ति प्रबंधन में धैर्य रखना चाहिए जिससे आंतरिक सुख निरंतर समृद्ध रहे।`,
      deepMeaning: "चतुर्थ भाव जातक का 'हृदय' है। बाह्य जगत में कितनी भी प्रतिष्ठा हो, यदि चतुर्थ भाव शुभ है तभी व्यक्ति वास्तविक शांति और संतोष का अनुभव करता है।",
      badges: ["अखंड सुख योग", `सुखेश: ${h4.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 14: चतुर्दशोऽध्यायः — पुत्रभावफलाध्यायः (5th House / Putra, Buddhi & Mantra Phala)
    // =========================================================================
    const isH5LordStrong = isKendra(h5.planet.house) || isTrikona(h5.planet.house) || h5.planet.house === 5 || h5.planet.house === 11;
    matchedShlokas.push({
      chapterNumber: 14,
      chapterTitle: "चतुर्दशोऽध्यायः — पुत्रभावफलाध्यायः",
      chapterSignificance: "पंचम भाव — प्रखर मेधा, विवेक, पूर्वपुण्य, मंत्र-सिद्धि एवं श्रेष्ठ संतति",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सुतेशे केन्द्रकोणे वा स्वोच्चे वा मित्रभे स्थिते ।
पुत्रलाभं सुखं चैव मन्त्रसिद्धिमवाप्नुयात् ॥ १ ॥
जीवः पञ्चमभावस्थः सुतेशे बलसंयुते ।
मेधावी बुद्धिमान् प्राज्ञः सर्वशास्त्रविशारदः ॥ २ ॥`,
      applicabilityStatus: `पाराशर मेधा, मन्त्रसिद्धि एवं सुत-सौख्य योग (पंचमेश '${h5.grahaName}')`,
      natalTrigger: `पंचम भाव (बुद्धि, विद्या, पूर्वपुण्य व संतान) की राशि ${h5.rashiName} है; पंचमेश '${h5.grahaName}' भाव ${h5.planet.house} में हैं तथा कारक गुरु ${jupiter.rashiName} में हैं।`,
      classicalPrediction: isH5LordStrong
        ? `महर्षि पाराशर के अनुसार पंचम भाव पूर्वजन्म के संचित पुण्यों का कोष है। बलवान पंचमेश जातक को तीव्र स्मरण-शक्ति, कुशाग्र प्रज्ञा, रणनीतिक अंतर्दृष्टि, मंत्र-साधना में सफलता तथा योग्य संतति का वरदान देता है।`
        : `महर्षि पाराशर के अनुसार पंचमेश जातक को निरंतर स्वाध्याय, उच्च विद्या, विवेकपूर्ण निर्णय और इष्ट-आराधना द्वारा पूर्वपुण्यों को जाग्रत रखने की प्रेरणा देता है।`,
      deepMeaning: "पंचम भाव जातक की प्रज्ञा (Intuition) का स्रोत है। यहाँ से जातक केवल सूचना नहीं, अपितु जीवन का व्यावहारिक विवेक और आध्यात्मिक प्रकाश प्राप्त करता है।",
      badges: ["कुशाग्र मेधा योग", `पंचमेश: ${h5.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 15: पञ्चदशोऽध्यायः — शत्रुभावफलाध्यायः (6th House / Shatru, Roga & Vijaya Phala)
    // =========================================================================
    const maleficsIn6 = houseOccupants[6].filter(p => ['Sun', 'Mars', 'Saturn', 'Rahu'].includes(p.id));
    const isHarshaYoga = [6, 8, 12].includes(h6.planet.house);
    matchedShlokas.push({
      chapterNumber: 15,
      chapterTitle: "पञ्चदशोऽध्यायः — शत्रुभावफलाध्यायः",
      chapterSignificance: "षष्ठ भाव — शत्रु-दमन, रोग-निवारण, ऋण-मुक्ति एवं स्पर्धा में अजेय विजय",
      verseNumbers: "श्लोक १–३",
      shlokaSanskrit: `षष्ठे पापग्रहाः शस्ताः शत्रूणां नाशकारकाः ।
जयं ददति युद्धेषु नृपपूजां तथैव च ॥ १ ॥
षष्ठेशे रिपुगे वापि व्यये वा रन्ध्रगेऽपि वा ।
हर्षाख्यो राजयोगः स्यात् कीर्तिमान् विजयी नरः ॥ २ ॥`,
      applicabilityStatus: maleficsIn6.length > 0 
        ? `षष्ठ भाव में पापग्रह — शत्रुहन्ता योग (${maleficsIn6.map(p => p.grahaName).join(', ')})`
        : (isHarshaYoga ? "हर्ष विपरीत राजयोग (षष्ठेश त्रिक स्थान में)" : `षष्ठेश प्रभाव एवं आरोग्य-सुरक्षा सूत्र (${h6.grahaName})`),
      natalTrigger: maleficsIn6.length > 0
        ? `षष्ठ भाव में क्रूर ग्रह '${maleficsIn6.map(p => p.grahaName).join(', ')}' विराजमान हैं, जो पाराशर के अनुसार सर्व-शत्रुनाशक हैं।`
        : `षष्ठ भाव के स्वामी '${h6.grahaName}' कुंडली के ${h6.planet.house}वें भाव में स्थित हैं।`,
      classicalPrediction: maleficsIn6.length > 0
        ? `महर्षि पाराशर का अद्वितीय सिद्धांत: 'षष्ठे पापग्रहाः शस्ताः शत्रूणां नाशकारकाः' — षष्ठ में क्रूर ग्रहों की स्थिति जातक को किसी भी प्रतियोगिता, न्यायालयीन विवाद अथवा शत्रुता में अपराजेय विजय दिलाती है।`
        : (isHarshaYoga
            ? `महर्षि पाराशर के अनुसार षष्ठेश का त्रिक भाव में स्थित होना 'हर्ष विपरीत राजयोग' का निर्माण करता है, जिससे जातक संकटों और बाधाओं के बीच से अप्रत्याशित सफलता और ख्याति अर्जित करता है।`
            : `महर्षि पाराशर के अनुसार जातक को दिनचर्या, खान-पान और स्वास्थ्य के प्रति सचेत रहना चाहिए; नियमित व्यायाम और अनुशासन से रोग व ऋण स्वतः नष्ट होते हैं।`),
      deepMeaning: "षष्ठ भाव जीवन की चुनौतियों का युद्ध-क्षेत्र है; यहाँ का बल जातक को विपरीत परिस्थितियों में अडिग रहने वाला योद्धा बनाता है।",
      badges: [maleficsIn6.length > 0 ? "शत्रुहन्ता योग" : (isHarshaYoga ? "हर्ष विपरीत राजयोग" : "आरोग्य सतर्कता"), `षष्ठेश: ${h6.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 16: षोडशोऽध्यायः — कलत्रभावफलाध्यायः (7th House / Kalatra & Vivaha Phala)
    // =========================================================================
    const isH7LordStrong = isKendra(h7.planet.house) || isTrikona(h7.planet.house) || h7.planet.house === 7 || h7.planet.house === 2;
    matchedShlokas.push({
      chapterNumber: 16,
      chapterTitle: "षोडशोऽध्यायः — कलत्रभावफलाध्यायः",
      chapterSignificance: "सप्तम भाव — दांपत्य जीवन, सुलक्षण जीवनसाथी, साझेदारी एवं लोक-व्यवहार",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `सप्तमेशे बलोपेते शुभयुक्ते शुभेक्षिते ।
भार्या रूपवती शीला साध्वी कुलविवर्धिनी ॥ १ ॥
शुक्रः कलत्रगो वापि सप्तमेशेन संयुतः ।
कामिनीसुखसम्पन्नो विलासी धनवान् भवेत् ॥ २ ॥`,
      applicabilityStatus: `पाराशर दांपत्य सौख्य एवं जीवनसाथी लक्षण योग (सप्तमेश '${h7.grahaName}')`,
      natalTrigger: `सप्तम भाव (विवाह, दांपत्य व साझेदारी) की राशि ${h7.rashiName} है; सप्तमेश '${h7.grahaName}' भाव ${h7.planet.house} में हैं तथा विवाह कारक शुक्र ${venus.rashiName} राशि में हैं।`,
      classicalPrediction: isH7LordStrong
        ? `महर्षि पाराशर के अनुसार सप्तमेश का शुभ केन्द्र/त्रिकोण में होना जातक को सुरुचिपूर्ण, सुसंस्कृत, गुणवान तथा कुल की प्रतिष्ठा बढ़ाने वाला जीवनसाथी प्रदान करता है। साझेदारी के कार्यों में निरंतर लाभ प्राप्त होता है।`
        : `महर्षि पाराशर के अनुसार दांपत्य जीवन में परस्पर संवाद, सम्मान और परिपक्वता रखने से संबंध सदा प्रगाढ़ और सुखमय बने रहते हैं।`,
      deepMeaning: "सप्तम भाव व्यक्ति के बाह्य संसार से जुड़ने का मुख्य द्वार है; यह केवल वैवाहिक सुख ही नहीं, अपितु समाज में आपके व्यक्तित्व के प्रति आकर्षण का भी सूचक है।",
      badges: ["सुलक्षण दांपत्य योग", `सप्तमेश: ${h7.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 17: सप्तदशोऽध्यायः — आयुर्भावफलाध्यायः (8th House / Ayur & Randhra Phala)
    // =========================================================================
    const isSaralaYoga = [6, 8, 12].includes(h8.planet.house);
    const isSaturnIn8 = saturn.house === 8;
    matchedShlokas.push({
      chapterNumber: 17,
      chapterTitle: "सप्तदशोऽध्यायः — आयुर्भावफलाध्यायः",
      chapterSignificance: "अष्टम भाव — दीर्घायु, गूढ़-विद्या, अनुसंधान, आकस्मिक धन एवं रूपांतरण",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `अष्टमेशे बलयुते लग्नेशे केन्द्रसंस्थिते ।
दीर्घायुर्भवति प्राणी सर्वव्याधिविवर्जितः ॥ १ ॥
शनौ रन्ध्रगते दीर्घमायुर्भवति निश्चितम् ।
सरलाख्यो भवेद्योगो रन्ध्रेशे रिपुगे व्यये ॥ २ ॥`,
      applicabilityStatus: isSaturnIn8
        ? "आयुष्कारक शनि अष्टम में — पूर्णायु योग"
        : (isSaralaYoga ? "सरल विपरीत राजयोग (अष्टमेश त्रिक भाव में)" : `पाराशर दीर्घायु एवं गूढ़ विद्या विधान (अष्टमेश '${h8.grahaName}')`),
      natalTrigger: `अष्टम भाव (आयु, अनुसंधान व गूढ़ ज्ञान) के स्वामी '${h8.grahaName}' कुंडली के ${h8.planet.house}वें भाव में हैं तथा आयुष्कारक शनि ${saturn.rashiName} में हैं।`,
      classicalPrediction: (isSaturnIn8 || isKendra(lagneshHouse))
        ? `महर्षि पाराशर का प्रत्यक्ष सूत्र: अष्टम भाव व लग्नेश का संतुलन जातक को 'दीर्घायु' और सभी गंभीर व्याधियों से रक्षा प्रदान करता है। जातक में गूढ़ रहस्यों, अनुसंधान और आध्यात्मिक सत्यों को समझने की अद्भूत क्षमता होती है।`
        : (isSaralaYoga
            ? `महर्षि पाराशर के अनुसार अष्टमेश का त्रिक स्थान में होना 'सरल राजयोग' बनाता है, जिससे जातक निर्भय, दीर्घायु, विद्वान तथा आकस्मिक संकटों से अविचल बाहर निकलने वाला बनता है।`
            : `महर्षि पाराशर के अनुसार अष्टमेश जातक को आत्म-अवलोकन, योग-प्राणायाम और गूढ़ विद्याओं के अध्ययन द्वारा जीवनी-शक्ति बढ़ाने का निर्देश देता है।`),
      deepMeaning: "अष्टम भाव केवल आयु का नहीं, अपितु आत्मिक रूपांतरण और कुण्डलिनी जागरण का भाव है; यहाँ से जातक के भीतर छिपी असीम आत्मिक क्षमता जाग्रत होती है।",
      badges: [isSaturnIn8 ? "पूर्णायु योग" : (isSaralaYoga ? "सरल राजयोग" : "गूढ़ विद्या योग"), `अष्टमेश: ${h8.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 18: अष्टादशोऽध्यायः — भाग्यभावफलाध्यायः (9th House / Bhagya & Dharma Phala)
    // =========================================================================
    const isH9LordStrong = isKendra(h9.planet.house) || isTrikona(h9.planet.house) || h9.planet.house === 9 || h9.planet.house === 11;
    const isLakshmiYoga = (lagneshHouse === 9 || h9.planet.house === 1 || (lagneshaId === h9.lordId) || (lagneshHouse === h9.planet.house));
    matchedShlokas.push({
      chapterNumber: 18,
      chapterTitle: "अष्टादशोऽध्यायः — भाग्यभावफलाध्यायः",
      chapterSignificance: "नवम भाव — महाभाग्य, धर्म, पिता, गुरु-कृपा, तीर्थ-पुण्य एवं दैवीय अनुग्रह",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `भाग्येशे केन्द्रकोणे वा स्वोच्चे वा स्वगृहे स्थिते ।
महाभाग्ययुतो मर्त्यो धर्मिष्ठो गुरुभक्तिमान् ॥ १ ॥
लग्नेश-भाग्येश-योगे लक्ष्मीयोगः प्रकीर्तितः ।
सर्वसम्पत्प्रदः साक्षात् कीर्तिधर्मविवर्धनः ॥ २ ॥`,
      applicabilityStatus: isLakshmiYoga
        ? `पाराशर लक्ष्मी योग (लग्नेश व भाग्येश का शुभ संबंध)`
        : `पाराशर महाभाग्य एवं धर्म-वृद्धि योग (भाग्येश '${h9.grahaName}' भाव ${h9.planet.house} में)`,
      natalTrigger: `नवम भाव (भाग्य व धर्म) की राशि ${h9.rashiName} है; भाग्येश '${h9.grahaName}' भाव ${h9.planet.house} में विराजमान हैं तथा धर्मकारक गुरु ${jupiter.rashiName} में हैं।`,
      classicalPrediction: isH9LordStrong
        ? `महर्षि पाराशर का अमर सूत्र: नवम भाव कुंडली का सर्वोच्च धर्म-त्रिकोण है। भाग्येश का सुदृढ़ होना जातक को जीवन के प्रत्येक कदम पर दैवीय सहायता, गुरुजनों का स्नेह, पैतृक आशीर्वाद, तीर्थ-पुण्य तथा 'महाभाग्य योग' की अखंड प्रतिष्ठा दिलाता है।`
        : `महर्षि पाराशर के अनुसार जातक अपने सत्कर्मों, गुरु-भक्ति और धर्म-परायण आचरण से अपने भाग्य को निरंतर चमकाता है और समाज में आदरणीय बनता है।`,
      deepMeaning: "भाग्य वस्तुतः पूर्वजन्मों में अर्जित शुभ कर्मों की पूंजी है; जब भाग्य भाव जागृत होता है, तो थोड़े प्रयास से भी अद्भुत और युगान्तकारी परिणाम प्राप्त होते हैं।",
      badges: [isLakshmiYoga ? "लक्ष्मी योग" : "महाभाग्य योग", `भाग्येश: ${h9.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 19: एकोनविंशोऽध्यायः — राज्यभावफलाध्यायः (10th House / Rajya & Karma Phala)
    // =========================================================================
    const hasDigbalaIn10 = houseOccupants[10].some(p => ['Sun', 'Mars'].includes(p.id));
    const isH10LordStrong = isKendra(h10.planet.house) || isTrikona(h10.planet.house) || h10.planet.house === 10 || h10.planet.house === 11;
    const isDharmaKarmaYoga = (h9.planet.house === 10 || h10.planet.house === 9 || h9.planet.house === h10.planet.house);
    matchedShlokas.push({
      chapterNumber: 19,
      chapterTitle: "एकोनविंशोऽध्यायः — राज्यभावफलाध्यायः",
      chapterSignificance: "दशम भाव — राज्य-सम्मान, पद-प्रतिष्ठा, सर्वोच्च आजीविका, कर्म-सिद्धि एवं नेतृत्व",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `दशमेशे केन्द्रकोणे वा स्वोच्चे वा मित्रभे स्थिते ।
राज्यसम्मानसंयुक्तः कीर्तिमान् विजयी भवेत् ॥ १ ॥
दशमे सूर्यभौमौ तु दिग्बलसहितौ शुभौ ।
धर्मकर्माधिपत्योगे राजयोगः परमो मतः ॥ २ ॥`,
      applicabilityStatus: hasDigbalaIn10
        ? `दशम भाव में सूर्य/मंगल — सर्वोच्च दिग्बल राज्याधिकार योग`
        : (isDharmaKarmaYoga ? "धर्मकर्माधिपति राजयोग (नवमेश व दशमेश योग)" : `पाराशर कर्म-सिद्धि एवं राज्य-सम्मान योग (दशमेश '${h10.grahaName}')`),
      natalTrigger: `दशम भाव (कर्म, आजीविका व प्रतिष्ठा) की राशि ${h10.rashiName} है; दशमेश '${h10.grahaName}' भाव ${h10.planet.house} में हैं।`,
      classicalPrediction: (isH10LordStrong || hasDigbalaIn10)
        ? `महर्षि पाराशर के अनुसार दशम भाव काल-पुरुष का सर्वोच्च मुकुट है। दशमेश का शुभ स्थान जातक को उच्च सामाजिक अधिकार, शासकीय या कॉरपोरेट नेतृत्व, निष्कलंक ख्याति तथा अपने कार्यक्षेत्र में शीर्षस्थ सफलता प्रदान करता है।`
        : `महर्षि पाराशर के अनुसार जातक निष्काम कर्म और कर्तव्यनिष्ठा के बल पर अपने क्षेत्र में सम्माननीय स्थान अर्जित करता है।`,
      deepMeaning: "दशम भाव व्यक्ति के जीवन का मूर्त परिणाम है जिसे संसार देखता है। यहाँ के योग व्यक्ति को केवल आजीविका नहीं, अपितु युग को दिशा देने वाला कर्मयोगी बनाते हैं।",
      badges: [hasDigbalaIn10 ? "दिग्बल राज्याधिकार" : (isDharmaKarmaYoga ? "धर्मकर्माधिपति योग" : "कर्म-सिद्धि योग"), `दशमेश: ${h10.grahaName}`]
    });

    // =========================================================================
    // CHAPTER 20: विंशोऽध्यायः — लाभभावफलाध्यायः (11th House / Labha & Aya Phala)
    // =========================================================================
    const planetsIn11 = houseOccupants[11];
    const isMahaDhanapati = (h11.planet.house === 2 || h2.planet.house === 11 || (h11.planet.house === h2.planet.house));
    matchedShlokas.push({
      chapterNumber: 20,
      chapterTitle: "विंशोऽध्यायः — लाभभावफलाध्यायः",
      chapterSignificance: "एकादश भाव — सर्व-मनोरथ सिद्धि, नियमित आय, महा-धनपति योग एवं विशिष्ट मित्र-मंडल",
      verseNumbers: "श्लोक १–२",
      shlokaSanskrit: `एकादशे ग्रहाः सर्वे शुभा वाऽप्यशुभास्तथा ।
बहुवित्तप्रदा ज्ञेया लाभभावफलप्रदाः ॥ १ ॥
लाभाधिपे धने संस्थे धनेशे लाभगेऽपि वा ।
महाधनपतिर्योगी कोटिश्रीर्लभते नरः ॥ २ ॥`,
      applicabilityStatus: planetsIn11.length > 0
        ? `एकादश भावस्थ ग्रह — पाराशर सर्व-लाभ योग (${planetsIn11.map(p => p.grahaName).join(', ')})`
        : (isMahaDhanapati ? "पाराशर महा-धनपति योग (द्वितीयेश व एकादशेश संबंध)" : `पाराशर लाभ एवं मनोरथ-सिद्धि विधान (लाभेश '${h11.grahaName}')`),
      natalTrigger: planetsIn11.length > 0
        ? `एकादश भाव में ग्रह '${planetsIn11.map(p => p.grahaName).join(', ')}' विराजमान हैं; तथा लाभेश '${h11.grahaName}' भाव ${h11.planet.house} में स्थित हैं।`
        : `एकादश भाव (लाभ व आय) की राशि ${h11.rashiName} है; लाभेश '${h11.grahaName}' कुंडली के ${h11.planet.house}वें भाव में स्थित हैं।`,
      classicalPrediction: `महर्षि पाराशर का अद्वितीय सिद्धांत: 'एकादशे ग्रहाः सर्वे बहुवित्तप्रदा ज्ञेयाः' — एकादश भाव जीवन की समस्त आकांक्षाओं की सिद्धि का महा-द्वार है। लाभेश का प्रभाव जातक को निरंतर आर्थिक प्रवाह, प्रभावशाली संपर्कों का लाभ, महत्वाकांक्षाओं की पूर्ति तथा समाज में प्रतिष्ठित समृद्धि सुनिश्चित करता है।`,
      deepMeaning: "एकादश भाव जीवन में इच्छाओं की परिपूर्णता का भाव है। जब यह भाव जागृत होता है, तो व्यक्ति का कोई भी सत्संकल्प अधूरा नहीं रहता।",
      badges: [planetsIn11.length > 0 ? "सर्व-लाभ योग" : (isMahaDhanapati ? "महा-धनपति योग" : "मनोरथ सिद्धि"), `लाभेश: ${h11.grahaName}`]
    });

    return {
      name: calcResult.name || options.name || "जातक",
      lagnaRashi: RASHI_NAMES[lagnaSign],
      lagnaDegStr: `${Math.floor(lagnaDeg)}° ${Math.round((lagnaDeg % 1) * 60)}'`,
      moonRashi: moon.rashiName,
      moonDegStr: `${Math.floor(moon.deg)}° ${Math.round((moon.deg % 1) * 60)}'`,
      atmakarakaGraha: GRAHA_NAMES[atmakarakaId],
      atmakarakaAvatar: akAvatar.avatar,
      ayurvedicDosha: lagneshDosha.dosha,
      topVaisheshikamsa: bestVaisheshikamsa.length > 0 ? bestVaisheshikamsa[0] : null,
      induLagnaRashi: RASHI_NAMES[induSign],
      induLagnaHouse: induHouse,
      drekkanaNumber: drekkanaNum,
      anatomicalMarkRegion: anatomicalRegion,
      bhavaLords: {
        dhanesha: `${h2.grahaName} (${h2.planet.rashiName}, भाव ${h2.planet.house})`,
        sahajesha: `${h3.grahaName} (${h3.planet.rashiName}, भाव ${h3.planet.house})`,
        sukhesha: `${h4.grahaName} (${h4.planet.rashiName}, भाव ${h4.planet.house})`,
        sutadhipa: `${h5.grahaName} (${h5.planet.rashiName}, भाव ${h5.planet.house})`,
        shatrupesha: `${h6.grahaName} (${h6.planet.rashiName}, भाव ${h6.planet.house})`,
        kalatresha: `${h7.grahaName} (${h7.planet.rashiName}, भाव ${h7.planet.house})`,
        randhresha: `${h8.grahaName} (${h8.planet.rashiName}, भाव ${h8.planet.house})`,
        bhagyesha: `${h9.grahaName} (${h9.planet.rashiName}, भाव ${h9.planet.house})`,
        karmesha: `${h10.grahaName} (${h10.planet.rashiName}, भाव ${h10.planet.house})`,
        labhesha: `${h11.grahaName} (${h11.planet.rashiName}, भाव ${h11.planet.house})`
      },
      matchedShlokasCount: matchedShlokas.length,
      matchedShlokas: matchedShlokas,
      engineVersion: "2.0.0 (BPHS Chapters 1-20 Canonical Edition)",
      generatedAt: new Date().toISOString()
    };
  }

  return {
    evaluateParasharaReport,
    RASHI_NAMES,
    GRAHA_NAMES,
    getVargaSign,
    EXALTATION_SIGNS,
    DEBILITATION_SIGNS
  };
}));
