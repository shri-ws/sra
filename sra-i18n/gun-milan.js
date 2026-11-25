/* Gun Milan (kundli matching) page dictionary, hand-written English (25 Nov 2026).
   Entry: [hindi, english, ...other spellings]. Text built at run time with names or numbers
   is matched by the patterns at the bottom. The Manglik section itself comes in English
   from mangalDoshaService.js when the page language is English (gun-milan.html, gmLang). */
(function () {
  var I = window.SRA_I18N;
  if (!I) return;

  // Sign, nakshatra and planet names on this page: Sanskrit name, as Jyotish readers expect
  var RASHI = [
    ["मेष", "Mesha", "Aries"], ["वृषभ", "Vrishabha", "Taurus"], ["मिथुन", "Mithuna", "Gemini"], ["कर्क", "Karka", "Cancer"],
    ["सिंह", "Simha", "Leo"], ["कन्या", "Kanya", "Virgo"], ["तुला", "Tula", "Libra"], ["वृश्चिक", "Vrishchika", "Scorpio"],
    ["धनु", "Dhanu", "Sagittarius"], ["मकर", "Makara", "Capricorn"], ["कुम्भ", "Kumbha", "Aquarius"], ["मीन", "Meena", "Pisces"]
  ];
  var NAK = [
    ["अश्विनी", "Ashwini"], ["भरणी", "Bharani"], ["कृत्तिका", "Krittika"], ["रोहिणी", "Rohini"], ["मृगशिरा", "Mrigashira"],
    ["आर्द्रा", "Ardra"], ["पुनर्वसु", "Punarvasu"], ["पुष्य", "Pushya"], ["आश्लेषा", "Ashlesha"], ["मघा", "Magha"],
    ["पूर्वाफाल्गुनी", "Purva Phalguni"], ["उत्तराफाल्गुनी", "Uttara Phalguni"], ["हस्त", "Hasta"], ["चित्रा", "Chitra"],
    ["स्वाति", "Swati"], ["विशाखा", "Vishakha"], ["अनुराधा", "Anuradha"], ["ज्येष्ठा", "Jyeshtha"], ["मूल", "Mula"],
    ["पूर्वाषाढ़ा", "Purva Ashadha"], ["उत्तराषाढ़ा", "Uttara Ashadha"], ["श्रवण", "Shravana"], ["धनिष्ठा", "Dhanishtha"],
    ["शतभिषा", "Shatabhisha"], ["पूर्वाभाद्रपद", "Purva Bhadrapada"], ["उत्तराभाद्रपद", "Uttara Bhadrapada"], ["रेवती", "Revati"]
  ];
  var GRAHA = [["सूर्य", "Sun"], ["चन्द्र", "Moon"], ["मंगल", "Mars"], ["बुध", "Mercury"], ["गुरु", "Jupiter"], ["शुक्र", "Venus"], ["शनि", "Saturn"], ["राहु", "Rahu"], ["केतु", "Ketu"]];

  function en(hi) { var p = I.lookup(hi); return p ? p[1] : hi; }
  function hi(e) { var p = I.lookup(e); return p ? p[0] : e; }

  I.add(RASHI.map(function (r) { return [r[0], r[1]]; }));
  I.add(NAK);
  I.add(GRAHA);

  I.add([
    // page title, nav, header
    ["गुण मिलान (36 गुण अष्टकूट) — वर-वधू कुंडली मिलान व नाड़ी-भकूट परिहार | Shri Ramji Astro", "Gun Milan (36-point Ashtakoota) — Kundli Matching with Nadi and Bhakoot Exceptions | Shri Ramji Astro"],
    ["गुण मिलान", "Gun Milan"],
    ["मंगल दोष", "Mangal Dosha"],
    ["💑 36 गुण अष्टकूट · नाड़ी-भकूट परिहार · मांगलिक मिलान", "36-point Ashtakoota · Nadi and Bhakoot exceptions · Manglik matching"],
    ["गुण मिलान — वर-वधू कुंडली मिलान", "Gun Milan — kundli matching for bride and groom"],
    ["वर और वधू की सटीक कुंडली से 36 गुण अष्टकूट मिलान, नाड़ी व भकूट दोष तथा उनके सारे शास्त्रीय परिहार, और मांगलिक मिलान — एक ही स्थान पर।",
      "The 36-point Ashtakoota match from both exact birth charts, Nadi and Bhakoot dosha with all their classical exceptions, and Manglik matching, in one place."],

    // tabs
    ["① दोनों कुंडली", "① Both charts"],
    ["② अष्टकूट (36 गुण)", "② Ashtakoota (36 points)"],
    ["③ मांगलिक मिलान", "③ Manglik match"],
    ["④ मुहूर्त", "④ Muhurta"],

    // input tab
    ["🤵 वर (Groom) का विवरण", "Groom's details"],
    ["👰 वधू (Bride) का विवरण", "Bride's details"],
    ["नाम", "Name"],
    ["जन्म तिथि", "Date of birth"],
    ["जन्म समय", "Time of birth"],
    ["जन्म स्थान", "Place of birth"],
    ["वर का नाम", "Groom's name"],
    ["वधू का नाम", "Bride's name"],
    ["शहर खोजें…", "Search city…"],
    ["💑 गुण मिलान करें ➔", "Match the charts ➔"],
    ["⏳ दोनों कुंडली बन रही हैं…", "Making both charts…"],
    ["टिप: शहर टाइप करने पर सूची से चुनें, या पूरा नाम लिखकर मिलान दबाएँ। स्थान और उस तारीख का टाइमज़ोन अपने आप निकाला जाता है।",
      "Tip: type the city and pick it from the list, or write the full name (for example London, UK or Edison, New Jersey) and press Match. The time zone and daylight-saving rule of that place on that date are found automatically."],

    // errors
    ["वर की जन्म तिथि व समय भरें।", "Enter the groom's date and time of birth.", "⚠️ वर की जन्म तिथि व समय भरें।"],
    ["वधू की जन्म तिथि व समय भरें।", "Enter the bride's date and time of birth.", "⚠️ वधू की जन्म तिथि व समय भरें।"],
    ["वर का जन्म स्थान नहीं मिला — सूची से शहर चुनें।", "The groom's birthplace was not found. Choose the city from the list, or add the country.", "⚠️ वर का जन्म स्थान नहीं मिला — सूची से शहर चुनें।"],
    ["वधू का जन्म स्थान नहीं मिला — सूची से शहर चुनें।", "The bride's birthplace was not found. Choose the city from the list, or add the country.", "⚠️ वधू का जन्म स्थान नहीं मिला — सूची से शहर चुनें।"],
    ["चंद्र स्थिति नहीं मिली।", "The Moon's position could not be found.", "⚠️ चंद्र स्थिति नहीं मिली।"],
    ["इंजन लोड नहीं हुआ — पेज रीफ्रेश करें।", "The calculation engine did not load. Please refresh the page.", "⚠️ इंजन लोड नहीं हुआ — पेज रीफ्रेश करें।"],

    // ashtakoota tab
    ["पहले ① टैब में वर व वधू का विवरण भरकर", "First fill in the groom's and bride's details in tab ① and press"],
    ["“गुण मिलान करें”", "“Match the charts”"],
    ["दबाएँ।", "."],
    ["/ 36", "/ 36"],
    ["उत्तम — सर्वश्रेष्ठ मिलान", "Excellent — a very good match"],
    ["शुभ — अनुकूल मिलान", "Good — a favourable match"],
    ["मध्यम — स्वीकार्य (दोष-परिहार देखें)", "Average — acceptable (see the dosha exceptions)"],
    ["अल्प — विवाह हेतु अनुकूल नहीं (पूरी कुंडली व उपाय आवश्यक)", "Low — not favourable for marriage (the full charts and remedies need to be seen)"],
    ["कूट (अधिकतम)", "Koota (max)"],
    ["वर", "Groom"],
    ["वधू", "Bride"],
    ["अंक", "Points"],
    ["विवरण", "Notes"],
    ["कुल गुण", "Total"],

    // koota names
    ["वर्ण", "Varna"], ["वश्य", "Vashya"], ["तारा", "Tara"], ["योनि", "Yoni"],
    ["ग्रह मैत्री", "Graha Maitri"], ["गण", "Gana"], ["भकूट", "Bhakoot"], ["नाड़ी", "Nadi"],

    // values in the koota table
    ["ब्राह्मण", "Brahmin"], ["क्षत्रिय", "Kshatriya"], ["वैश्य", "Vaishya"], ["शूद्र", "Shudra"],
    ["द्विपद", "Dvipada (human)"], ["चतुष्पद", "Chatushpada (four-footed)"], ["जलचर", "Jalachara (water)"], ["कीट", "Keeta (insect)"],
    ["जन्म तारा", "Janma tara"], ["सम्पत् तारा", "Sampat tara"], ["विपत् तारा", "Vipat tara"], ["क्षेम तारा", "Kshema tara"],
    ["प्रत्यरि तारा", "Pratyari tara"], ["साधक तारा", "Sadhaka tara"], ["वध तारा", "Vadha tara"], ["मित्र तारा", "Mitra tara"], ["अतिमित्र तारा", "Atimitra tara"],
    ["अश्व", "Ashva (horse)"], ["गज", "Gaja (elephant)"], ["सर्प", "Sarpa (serpent)"], ["श्वान", "Shvana (dog)"], ["मार्जार", "Marjara (cat)"],
    ["मूषक", "Mushaka (rat)"], ["गौ", "Gau (cow)"], ["महिष", "Mahisha (buffalo)"], ["व्याघ्र", "Vyaghra (tiger)"], ["मृग", "Mriga (deer)"],
    ["वानर", "Vanara (monkey)"], ["नकुल", "Nakula (mongoose)"],
    ["देव", "Deva"], ["मनुष्य", "Manushya"], ["राक्षस", "Rakshasa"],
    ["आदि", "Adi"], ["मध्य", "Madhya"], ["अन्त्य", "Antya"],

    // koota notes
    ["वर का वर्ण वधू के बराबर या उच्च है — शुभ।", "The groom's varna is equal to or higher than the bride's — favourable."],
    ["वधू का वर्ण वर से ऊँचा है — वर्ण मिलान शून्य।", "The bride's varna is higher than the groom's — no Varna point."],
    ["वश्य अनुकूल (श्लोक 23)।", "Vashya favourable (shloka 23)."],
    ["वश्य मध्यम (श्लोक 23)।", "Vashya moderate (shloka 23)."],
    ["वश्य अल्प — नर राशि का जलचर/चतुष्पद से (श्लोक 23)।", "Vashya weak — a human sign paired with a water or four-footed sign (shloka 23)."],
    ["दोनों दिशाओं की तारा शुभ।", "The tara is favourable both ways."],
    ["एक ओर अशुभ तारा।", "The tara is unfavourable one way."],
    ["दोनों ओर अशुभ तारा।", "The tara is unfavourable both ways."],
    ["समान योनि — शारीरिक अनुकूलता उत्तम।", "Same yoni — physical compatibility excellent."],
    ["परम शत्रु योनि।", "Sworn-enemy yonis."],
    ["मित्र योनि।", "Friendly yonis."],
    ["शत्रु योनि।", "Unfriendly yonis."],
    ["सम योनि।", "Neutral yonis."],
    ["राशि-स्वामी परस्पर मित्र — मानसिक मेल उत्तम।", "The Moon-sign lords are friends — mental compatibility excellent."],
    ["राशि-स्वामी सम/आंशिक।", "The Moon-sign lords are neutral or partly friendly."],
    ["राशि-स्वामी शत्रु — मानसिक मेल कठिन।", "The Moon-sign lords are enemies — mental compatibility difficult."],
    ["गण भिन्न, पर श्लोक 37 (नक्षत्र/राशि भेद) से गण दोष नहीं।", "Different ganas, but by shloka 37 (nakshatra or sign difference) there is no Gana dosha."],
    ["गण भिन्न, पर राशीश/नवांशेश मैत्री (श्लोक 33) से गण दोष नहीं।", "Different ganas, but by the friendship of the sign or navamsha lords (shloka 33) there is no Gana dosha."],
    ["गण अनुकूल — स्वभाव मेल।", "Gana favourable — temperaments match."],
    ["गण आंशिक अनुकूल।", "Gana partly favourable."],
    ["गण विरोध — स्वभाव में टकराव सम्भव।", "Gana opposed — temperaments may clash."],
    ["द्विर्द्वादश, पर मीनादि युग्म राशि — शुभ (p.343)।", "2-12 placement, but in the even-sign pairs counted from Pisces — favourable (p.343)."],
    ["भकूट दोष नहीं।", "No Bhakoot dosha."],
    ["भिन्न नाड़ी — उत्तम (संतान-स्वास्थ्य हेतु शुभ)।", "Different nadis — excellent (good for children's health)."],
    ["समान नाड़ी थी, पर परिहार से दोष भंग।", "Same nadi, but the dosha is cancelled by an exception."],
    ["समान नाड़ी — नाड़ी दोष, परिहार नहीं मिला।", "Same nadi — Nadi dosha, no exception found."],

    // nadi and bhakoot boxes
    ["नाड़ी दोष — परिहार से भंग", "Nadi dosha — cancelled by an exception"],
    ["नाड़ी दोष — सक्रिय (0/8)", "Nadi dosha — active (0/8)"],
    ["दोनों की नाड़ी", "Both have the"],
    ["समान है। नाड़ी दोष के शास्त्रीय परिहार:", "nadi. Classical exceptions for Nadi dosha:"],
    ["नाड़ी — निर्दोष", "Nadi — no dosha"],
    ["वर की नाड़ी", "Groom's nadi"],
    [", वधू की", ", bride's"],
    ["— भिन्न नाड़ी, संतान-स्वास्थ्य हेतु शुभ।", "— different nadis, good for children's health."],
    ["एक नक्षत्र, भिन्न राशि — श्लोक 37", "Same nakshatra, different signs — shloka 37"],
    ["एक नक्षत्र, भिन्न चरण (चरण-वेध न हो: 1↔4, 2↔3) — श्लोक 37, p.353", "Same nakshatra, different padas (unless the padas pierce each other: 1↔4, 2↔3) — shloka 37, p.353"],
    ["एक राशि, भिन्न नक्षत्र — श्लोक 37", "Same sign, different nakshatras — shloka 37"],
    ["राशि-स्वामी एक या मित्र — अन्य ग्रन्थों का मत, मुहूर्त चिन्तामणि में नहीं; ज्योतिषी से पुष्टि करें",
      "Same or friendly sign lords — accepted by other texts, not by Muhurta Chintamani; confirm with an astrologer"],
    ["भकूट दोष के शास्त्रीय परिहार:", "Classical exceptions for Bhakoot dosha:"],
    ["भकूट — निर्दोष", "Bhakoot — no dosha"],
    ["राशि-दूरी शुभ — भकूट दोष नहीं।", "The distance between the Moon signs is favourable — no Bhakoot dosha."],
    ["दोनों राशियों का एक ही स्वामी (एकाधिपत्य) — श्लोक 32", "Both signs have the same lord (ekadhipatya) — shloka 32"],
    ["राशि-स्वामी परस्पर मित्र — श्लोक 32–33", "The sign lords are mutual friends — shlokas 32–33"],
    ["तारा शुद्धि — श्लोक 32", "Tara is clean — shloka 32"],
    ["गण शुद्धि (एक गण) — पीताम्बरा p.348", "Gana is clean (same gana) — Pitambara commentary, p.348"],
    ["राशि-वश्यता — श्लोक 32", "The signs are vashya to each other — shloka 32"],
    ["नाड़ी दोष होने से कोई भकूट परिहार मान्य नहीं (p.348)", "With Nadi dosha present, no Bhakoot exception applies (p.348)"],
    ["वर्ण-प्रधानता:", "Varna priority:"],
    ["③ अब मांगलिक मिलान देखें 🔒 ➔", "③ Now see the Manglik match ➔"],

    // manglik tab: placeholder and paywall
    ["पहले दोनों कुंडली बनाएं", "First make both charts"],
    ["संयुक्त मांगलिक मिलान के लिए वर व वधू — दोनों की जन्म जानकारी भरकर कुंडली बनाना आवश्यक है।", "For the joint Manglik match, fill in the birth details of both the groom and the bride first."],
    ["① दोनों कुंडली भरें ➔", "① Fill in both charts ➔"],
    ["🔒 संयुक्त मांगलिक दोष जाँच एवं मिलान", "Joint Manglik dosha check and match"],
    ["वर व वधू — दोनों का त्रि-लग्न (लग्न · चंद्र · शुक्र) मांगलिक परीक्षण", "Manglik check for both, from three points (Ascendant · Moon · Venus)"],
    ["मंगल की भाव-राशि स्थिति, नवांश (D9) पुष्टि व दोष प्रतिशत", "Mars's house and sign, confirmation in the Navamsha (D9), and the dosha as a percentage"],
    ["परस्पर दोष-कटाव —", "Mutual cancellation —"],
    ["मांगलिक-साम्य (पाप-साम्य)", "Manglik balance (paap samya)"],
    ["गणना", "worked out"],
    ["लागू शास्त्रीय परिहार व शुद्ध (नेट) दोष प्रतिशत", "The classical exceptions that apply, and the net dosha percentage"],
    ["अंतिम स्पष्ट निर्णय —", "A clear conclusion —"],
    ["“मिलेगी / नहीं मिलेगी”", "“suitable / not suitable”"],
    ["व उपाय", "and remedies"],
    ["🔒 सुरक्षित 256-bit Razorpay · तत्काल ऑटो-अनलॉक · UPI / कार्ड / नेट बैंकिंग", "Secure 256-bit Razorpay · opens at once after payment · international card, UPI or net banking"],
    ["प्रोमो / एक्सेस कोड", "Promo / access code"],
    ["लागू करें", "Apply"],
    ["कोड मान्य नहीं है।", "This code is not valid."],
    ["कृपया कूपन या पासकोड दर्ज करें।", "Please enter a coupon or pass code."],
    ["🎉 रिपोर्ट अनलॉक हो गई!", "The report is unlocked."],

    // manglik report
    ["— संयुक्त मांगलिक मिलान", "— joint Manglik match"],
    ["मिलेगी — मांगलिक बाधा नहीं", "Suitable — no Manglik obstacle"],
    ["वर व वधू — दोनों में से किसी की भी कुंडली में मांगलिक दोष नहीं है। वैवाहिक दृष्टि से मंगल सम्बन्धी कोई बाधा नहीं।",
      "Neither the groom's nor the bride's chart has Manglik dosha. Mars places no obstacle on the marriage."],
    ["मिलेगी — मांगलिक-साम्य (दोष परस्पर भंग)", "Suitable — Manglik balance (the doshas cancel each other)"],
    ["दोनों की कुंडली मांगलिक है, अतः शास्त्रानुसार मांगलिक-साम्य (पाप-साम्य) से दोनों का दोष परस्पर कटकर प्रायः शून्य हो जाता है — “विष से विष का नाश”। यह संयोग वैवाहिक दृष्टि से शुभ माना गया है।",
      "Both charts are Manglik, so by the classical rule of Manglik balance (paap samya) the two doshas cancel each other and come close to zero — “poison cancels poison”. This combination is considered good for marriage."],
    ["मिलेगी — परिहार सहित (दोष प्रायः शमित)", "Suitable — with exceptions (the dosha is largely cancelled)"],
    ["सावधानी — आंशिक दोष शेष", "Caution — part of the dosha remains"],
    ["बिना शांति-उपाय के उपयुक्त नहीं", "Not suitable without remedies"],
    ["🤵 वर की मांगलिक रिपोर्ट", "Groom's Manglik report"],
    ["👰 वधू की मांगलिक रिपोर्ट", "Bride's Manglik report"],
    ["✓ निर्मांगलिक", "✓ Not Manglik"],
    ["आंशिक मांगलिक", "Partly Manglik"],
    ["मांगलिक", "Manglik"],
    ["वक्री", "retrograde"],
    ["अस्त", "combust"],
    ["मंगल —", "Mars —"],
    ["राशि,", "sign,"],
    ["संदर्भ", "From"],
    ["मंगल भाव", "Mars in house"],
    ["स्थिति", "Result"],
    ["भार", "Weight"],
    ["दोष", "Dosha"],
    ["निर्दोष", "No dosha"],
    ["नवांश (D9) — मंगल", "Navamsha (D9) — Mars in"],
    ["वर्गोत्तम", "vargottama"],
    ["स्थूल दोष", "Gross dosha"],
    ["शुद्ध (नेट) दोष — परिहार के बाद", "Net dosha — after exceptions"],
    ["शास्त्रीय स्थिति:", "Classical status:"],
    ["जीवनसाथी-साम्य:", "Partner balance:"],
    ["उपाय:", "Remedies:"],
    ["शास्त्रीय टिप्पणी:", "Classical note:"],
    ["मांगलिक निर्णय केवल मंगल की स्थिति पर नहीं — सप्तम भाव, सप्तमेश, चंद्र-बल व दशा-क्रम का समग्र विचार भी आवश्यक है। यह रिपोर्ट त्रि-लग्न मांगलिक विश्लेषण व मांगलिक-साम्य सिद्धांत पर आधारित है।",
      "A Manglik decision does not rest on Mars alone — the 7th house, its lord, the Moon's strength and the order of the dashas must be weighed together. This report is based on the three-point Manglik analysis and the principle of Manglik balance."],
    ["④ अब विवाह मुहूर्त देखें ➔", "④ Now see the wedding muhurta ➔"],
    ["मांगलिक इंजन लोड नहीं हुआ — पेज रीफ्रेश करें।", "The Manglik engine did not load. Please refresh the page."],
    ["कुंडली से मांगलिक गणना नहीं हो सकी।", "The Manglik calculation could not be made from the charts."],

    // muhurta tab
    ["वर-वधू की जन्म जानकारी से शुभ मुहूर्त — नीचे किसी भी संस्कार पर क्लिक कर मुहूर्त कैलकुलेटर खोलें।", "Auspicious muhurtas from the couple's birth details — click any ceremony below to open the muhurta calculator."],
    ["किसी भी संस्कार पर क्लिक कर प्रामाणिक", "Click any ceremony to open the classical"],
    ["मुहूर्त चिंतामणि", "Muhurta Chintamani"],
    ["कैलकुलेटर खोलें — वहाँ वर-वधू का विवरण भरकर शुभ मुहूर्त निकालें।", "calculator; the couple's details are filled in there to find the auspicious time."],
    ["विवाह मुहूर्त", "Wedding (Vivah) muhurta"],
    ["शुभ विवाह तिथि, लग्न व अभिजित — त्रिबल शुद्धि सहित", "Auspicious wedding dates, lagna and Abhijit — with Tribala shuddhi"],
    ["सगाई / वाग्दान मुहूर्त", "Engagement (Vagdana) muhurta"],
    ["उभय वरण, संकल्प एवं श्रेष्ठ लग्न काल", "Mutual acceptance, sankalpa and the best lagna time"],
    ["वर-वरण / बरीछा (तिलक)", "Var-varan / Tilak ceremony"],
    ["चिंतामणि श्लोक ११ — विहित नक्षत्र साधन", "Chintamani shloka 11 — the prescribed nakshatras"],
    ["गोद भराई / वधू-वरण", "Godh bharai / Vadhu-varan"],
    ["सीमंतोन्नयन — चिंतामणि श्लोक १०, चन्द्र शुद्धि सहित", "Simantonnayana — Chintamani shloka 10, with Moon shuddhi"],
    ["मुहूर्त गणना प्रामाणिक", "The muhurta calculation follows the classical"],
    ["मुहूर्त चिंतामणि एवं बृहत्पाराशर", "Muhurta Chintamani and Brihat Parashara"],
    ["पर आधारित। (विस्तृत मुहूर्त शोध सत्र vmm पृष्ठ पर VIP अनलॉक के बाद।)", "texts. (The detailed muhurta search opens on the muhurta page after unlocking.)"],

    // footer
    ["श्री रामजी एस्ट्रो · गुण मिलान शास्त्रीय अष्टकूट (मुहूर्त परंपरा) पर आधारित। कुंडली गणना: सत्य चित्रा पक्ष अयनांश।",
      "Shri Ramji Astro · Gun Milan follows the classical Ashtakoota (muhurta tradition). Charts: True Chitra Paksha (Lahiri) ayanamsa."],
    ["अंतिम निर्णय हेतु पूरी कुंडली — सप्तम भाव, सप्तमेश व दशाएँ — भी देखें।", "For a final decision, also look at the full charts: the 7th house, its lord and the dashas."]
  ]);

  // ---------- text with names or numbers ----------
  var BH_TYPE = [["द्विर्द्वादश (2-12)", "2-12 (dvirdvadasha)"], ["नवपंचम (5-9)", "5-9 (navapanchama)"], ["षडाष्टक (6-8)", "6-8 (shadashtaka)"]];
  var bt = function (h) { for (var i = 0; i < BH_TYPE.length; i++) if (BH_TYPE[i][0] === h) return BH_TYPE[i][1]; return h; };
  var btHi = function (e) { for (var i = 0; i < BH_TYPE.length; i++) if (BH_TYPE[i][1] === e) return BH_TYPE[i][0]; return e; };
  var BT_HI = '(द्विर्द्वादश \\(2-12\\)|नवपंचम \\(5-9\\)|षडाष्टक \\(6-8\\))';
  var BT_EN = '(2-12 \\(dvirdvadasha\\)|5-9 \\(navapanchama\\)|6-8 \\(shadashtaka\\))';
  function westOf(sanskrit) { for (var i = 0; i < RASHI.length; i++) if (RASHI[i][1] === sanskrit) return RASHI[i][2]; return ''; }

  // bhakoot box heading and notes
  I.addPattern(new RegExp('^भकूट दोष — ' + BT_HI + ' — (परिहार से भंग|सक्रिय \\(0/7\\))$'),
    new RegExp('^Bhakoot dosha — ' + BT_EN + ' — (cancelled by an exception|active \\(0/7\\))$'),
    function (m) { return 'भकूट दोष — ' + btHi(m[1]) + ' — ' + (m[2][0] === 'c' ? 'परिहार से भंग' : 'सक्रिय (0/7)'); },
    function (m) { return 'Bhakoot dosha — ' + bt(m[1]) + ' — ' + (m[2] === 'परिहार से भंग' ? 'cancelled by an exception' : 'active (0/7)'); });
  I.addPattern(new RegExp('^' + BT_HI + ' दोष था, पर स्वामी-मैत्री से भंग \\(श्लोक 32–33\\)।$'),
    new RegExp('^' + BT_EN + ' dosha, cancelled by the friendship of the lords \\(shlokas 32–33\\)\\.$'),
    function (m) { return btHi(m[1]) + ' दोष था, पर स्वामी-मैत्री से भंग (श्लोक 32–33)।'; },
    function (m) { return bt(m[1]) + ' dosha, cancelled by the friendship of the lords (shlokas 32–33).'; });
  I.addPattern(new RegExp('^' + BT_HI + ' भकूट दोष — शास्त्रोक्त परिहार है, विवाह शुभ \\(श्लोक 32\\); गुण नहीं जुड़ते।$'),
    new RegExp('^' + BT_EN + ' Bhakoot dosha — a classical exception applies, so the marriage is favourable \\(shloka 32\\); the points are not added\\.$'),
    function (m) { return btHi(m[1]) + ' भकूट दोष — शास्त्रोक्त परिहार है, विवाह शुभ (श्लोक 32); गुण नहीं जुड़ते।'; },
    function (m) { return bt(m[1]) + ' Bhakoot dosha — a classical exception applies, so the marriage is favourable (shloka 32); the points are not added.'; });
  I.addPattern(new RegExp('^' + BT_HI + ' भकूट दोष — परिहार नहीं मिला।$'),
    new RegExp('^' + BT_EN + ' Bhakoot dosha — no exception found\\.$'),
    function (m) { return btHi(m[1]) + ' भकूट दोष — परिहार नहीं मिला।'; },
    function (m) { return bt(m[1]) + ' Bhakoot dosha — no exception found.'; });

  // navamsha-lord exception: "नवांश-स्वामी (मंगल–शुक्र) एक या परस्पर मित्र — श्लोक 32–33"
  I.addPattern(/^नवांश-स्वामी \((\S+)–(\S+)\) एक या परस्पर मित्र — श्लोक 32–33$/,
    /^The navamsha lords \((\S+)–(\S+)\) are the same or mutual friends — shlokas 32–33$/,
    function (m) { return 'नवांश-स्वामी (' + hi(m[1]) + '–' + hi(m[2]) + ') एक या परस्पर मित्र — श्लोक 32–33'; },
    function (m) { return 'The navamsha lords (' + en(m[1]) + '–' + en(m[2]) + ') are the same or mutual friends — shlokas 32–33'; });

  // couple line: "— अश्विनी पाद 2, मेष ×"
  I.addPattern(/^— (.+) पाद (\d), (\S+)( ×)?$/,
    /^— (.+) pada (\d), (\S+)(?: \([A-Za-z]+\))?( ×)?$/,
    function (m) { return '— ' + hi(m[1]) + ' पाद ' + m[2] + ', ' + hi(m[3]) + (m[4] || ''); },
    function (m) { var r = en(m[3]), w = westOf(r); return '— ' + en(m[1]) + ' pada ' + m[2] + ', ' + r + (w ? ' (' + w + ')' : '') + (m[4] || ''); });

  // total row: "36 में से 24 गुण (67%)"
  I.addPattern(/^36 में से ([\d.]+) गुण \((\d+)%\)$/, /^([\d.]+) of 36 points \((\d+)%\)$/,
    function (m) { return '36 में से ' + m[1] + ' गुण (' + m[2] + '%)'; },
    function (m) { return m[1] + ' of 36 points (' + m[2] + '%)'; });

  // varna priority note
  var KOOTA = { "नाड़ी": "Nadi", "वर्ण": "Varna", "गण": "Gana", "योनि": "Yoni" };
  var VARNA = { "ब्राह्मण": "Brahmin", "क्षत्रिय": "Kshatriya", "वैश्य": "Vaishya", "शूद्र": "Shudra" };
  function back(map, v) { for (var k in map) if (map[k] === v) return k; return v; }
  I.addPattern(/^शास्त्र के अनुसार प्रधान कूट — ब्राह्मण: नाड़ी, क्षत्रिय: वर्ण, वैश्य: गण, शूद्र: योनि। वर \((\S+)\) हेतु « (\S+) » तथा वधू \((\S+)\) हेतु « (\S+) » कूट सबसे महत्वपूर्ण।$/,
    /^By the texts, the koota that matters most is Nadi for a Brahmin, Varna for a Kshatriya, Gana for a Vaishya and Yoni for a Shudra\. For the groom \((\S+)\) it is « (\S+) », and for the bride \((\S+)\) it is « (\S+) »\.$/,
    function (m) { return 'शास्त्र के अनुसार प्रधान कूट — ब्राह्मण: नाड़ी, क्षत्रिय: वर्ण, वैश्य: गण, शूद्र: योनि। वर (' + back(VARNA, m[1]) + ') हेतु « ' + back(KOOTA, m[2]) + ' » तथा वधू (' + back(VARNA, m[3]) + ') हेतु « ' + back(KOOTA, m[4]) + ' » कूट सबसे महत्वपूर्ण।'; },
    function (m) { return 'By the texts, the koota that matters most is Nadi for a Brahmin, Varna for a Kshatriya, Gana for a Vaishya and Yoni for a Shudra. For the groom (' + (VARNA[m[1]] || m[1]) + ') it is « ' + (KOOTA[m[2]] || m[2]) + ' », and for the bride (' + (VARNA[m[3]] || m[3]) + ') it is « ' + (KOOTA[m[4]] || m[4]) + ' ».'; });

  // paywall: "A × B — प्रामाणिक त्रि-लग्न विश्लेषण"
  I.addPattern(/^(.+) — प्रामाणिक त्रि-लग्न विश्लेषण$/, /^(.+) — three-point \(tri-lagna\) analysis$/,
    function (m) { return m[1] + ' — प्रामाणिक त्रि-लग्न विश्लेषण'; },
    function (m) { return m[1] + ' — three-point (tri-lagna) analysis'; });

  // unlock button, with the price in rupees or dollars: "🔓 रिपोर्ट अनलॉक करें (₹1,101)"
  I.addPattern(/^(?:🔓 )?रिपोर्ट अनलॉक करें \((.+)\)$/, /^Unlock the report \((.+)\)$/,
    function (m) { return '🔓 रिपोर्ट अनलॉक करें (' + m[1] + ')'; },
    function (m) { return 'Unlock the report (' + m[1] + ')'; });

  // section heading in the Manglik report: "🤵 वर — Name"
  I.addPattern(/^(?:🤵 |👰 )?(वर|वधू) — (.+)$/, /^(Groom|Bride) — (.+)$/,
    function (m) { return (m[1] === 'Groom' ? '🤵 वर' : '👰 वधू') + ' — ' + m[2]; },
    function (m) { return (m[1] === 'वर' ? 'Groom' : 'Bride') + ' — ' + m[2]; });

  // "भाव 7"
  I.addPattern(/^भाव (\d+)$/, /^House (\d+)$/,
    function (m) { return 'भाव ' + m[1]; }, function (m) { return 'House ' + m[1]; });

  // Mars line tail: ", 12.5°, Yuva (वक्री, अस्त)"
  I.addPattern(/^(,.*)\((वक्री|अस्त)(?:, (वक्री|अस्त))?\)$/, /^(,.*)\((retrograde|combust)(?:, (retrograde|combust))?\)$/,
    function (m) { var f = function (w) { return w === 'retrograde' ? 'वक्री' : 'अस्त'; }; return m[1] + '(' + f(m[2]) + (m[3] ? ', ' + f(m[3]) : '') + ')'; },
    function (m) { var f = function (w) { return w === 'वक्री' ? 'retrograde' : 'combust'; }; return m[1] + '(' + f(m[2]) + (m[3] ? ', ' + f(m[3]) : '') + ')'; });

  // D9 line tail: "। <note>"
  I.addPattern(/^। (.+)$/, /^\. (.+)$/, function (m) { return '। ' + m[1]; }, function (m) { return '. ' + m[1]; });

  // partner balance: "साथी की कुंडली में Saturn in house 7 — पाप-साम्य से दोष परस्पर कट जाता है।"
  I.addPattern(/^साथी की कुंडली में (.+) — पाप-साम्य से दोष परस्पर कट जाता है।$/,
    /^The partner's chart has (.+), so by paap samya the doshas cancel each other\.$/,
    function (m) { return 'साथी की कुंडली में ' + m[1] + ' — पाप-साम्य से दोष परस्पर कट जाता है।'; },
    function (m) { return 'The partner\'s chart has ' + m[1] + ', so by paap samya the doshas cancel each other.'; });

  // "लागू शास्त्रीय परिहार (3)"
  I.addPattern(/^लागू शास्त्रीय परिहार \((\d+)\)$/, /^Classical exceptions that apply \((\d+)\)$/,
    function (m) { return 'लागू शास्त्रीय परिहार (' + m[1] + ')'; },
    function (m) { return 'Classical exceptions that apply (' + m[1] + ')'; });

  // combined verdict texts with the names
  I.addPattern(/^(.+) की कुंडली में मांगलिक दोष है, परंतु शास्त्रीय परिहार( व (.+) की कुंडली के समदोष-साम्य)? से शुद्ध दोष अत्यल्प \((\d+(?:\.\d+)?)%\) रह जाता है — विवाह उपयुक्त।$/,
    /^(.+)'s chart has Manglik dosha, but the classical exceptions( and the matching dosha in (.+)'s chart)? leave only a very small net dosha \((\d+(?:\.\d+)?)%\) — the marriage is suitable\.$/,
    function (m) { return m[1] + ' की कुंडली में मांगलिक दोष है, परंतु शास्त्रीय परिहार' + (m[3] ? ' व ' + m[3] + ' की कुंडली के समदोष-साम्य' : '') + ' से शुद्ध दोष अत्यल्प (' + m[4] + '%) रह जाता है — विवाह उपयुक्त।'; },
    function (m) { return m[1] + '\'s chart has Manglik dosha, but the classical exceptions' + (m[3] ? ' and the matching dosha in ' + m[3] + '\'s chart' : '') + ' leave only a very small net dosha (' + m[4] + '%) — the marriage is suitable.'; });
  I.addPattern(/^(.+) की कुंडली में आंशिक मांगलिक दोष \((\d+(?:\.\d+)?)%\) परिहार के पश्चात् भी शेष है, जबकि (.+) की कुंडली निर्मांगलिक है। मंगल-शांति उपाय के बाद ही विवाह शुभ रहेगा।$/,
    /^(.+)'s chart keeps a partial Manglik dosha \((\d+(?:\.\d+)?)%\) even after the exceptions, while (.+)'s chart is not Manglik\. The marriage is favourable only after Mars-shanti remedies\.$/,
    function (m) { return m[1] + ' की कुंडली में आंशिक मांगलिक दोष (' + m[2] + '%) परिहार के पश्चात् भी शेष है, जबकि ' + m[3] + ' की कुंडली निर्मांगलिक है। मंगल-शांति उपाय के बाद ही विवाह शुभ रहेगा।'; },
    function (m) { return m[1] + '\'s chart keeps a partial Manglik dosha (' + m[2] + '%) even after the exceptions, while ' + m[3] + '\'s chart is not Manglik. The marriage is favourable only after Mars-shanti remedies.'; });
  I.addPattern(/^(.+) की कुंडली में प्रबल मांगलिक दोष \((\d+(?:\.\d+)?)%\) है और (.+) की कुंडली निर्मांगलिक — साम्य नहीं बनता। कुंभ\/अर्क विवाह व मंगल-शांति महायज्ञ के उपरांत ही विवाह विचारणीय है।$/,
    /^(.+)'s chart has a strong Manglik dosha \((\d+(?:\.\d+)?)%\) and (.+)'s chart is not Manglik, so there is no balance\. The marriage should be considered only after a Kumbh or Ark vivah and a Mars-shanti yajna\.$/,
    function (m) { return m[1] + ' की कुंडली में प्रबल मांगलिक दोष (' + m[2] + '%) है और ' + m[3] + ' की कुंडली निर्मांगलिक — साम्य नहीं बनता। कुंभ/अर्क विवाह व मंगल-शांति महायज्ञ के उपरांत ही विवाह विचारणीय है।'; },
    function (m) { return m[1] + '\'s chart has a strong Manglik dosha (' + m[2] + '%) and ' + m[3] + '\'s chart is not Manglik, so there is no balance. The marriage should be considered only after a Kumbh or Ark vivah and a Mars-shanti yajna.'; });
})();
