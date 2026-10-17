/* SHRI RAMJI ASTRO — UNIFIED THEME, MULTI-LANGUAGE & ADAPTIVE APP ENGINE */
(function() {
  // ══════════════════════════════════════════════════════════════════════════
  // 1. DAY / NIGHT THEME ENGINE
  // ══════════════════════════════════════════════════════════════════════════
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('sra_theme', theme); } catch(e) {}
  }

  window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || 'day';
    const next = current === 'night' ? 'day' : 'night';
    applyTheme(next);
  };
  window.toggleThemeEngine = window.toggleTheme;
  window.applyTheme = applyTheme;

  const savedTheme = (function() {
    try { return localStorage.getItem('sra_theme'); } catch(e) { return null; }
  })() || 'day';
  applyTheme(savedTheme);

  // Eagerly inject core navigation and drawer styles if document head is available
  try {
    if (document.head) injectBottomNavStyles();
  } catch(e) {}

  // ══════════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════
  // 2. MULTI-LANGUAGE (I18N) & SHASTRA-FIRST TERMINOLOGY ENGINE
  // ══════════════════════════════════════════════════════════════════════════
  const I18N_GLOBAL = {
    hi: {
      brand_main: "PATRIKA",
      brand_sub: "by Shri Ram Ji Astro",
      lang_label: "हिन्दी",
      lang_alt: "English",
      nav_home: "गृह",
      menu_muhurt: "मुहूर्त",
      menu_reports: "रिपोर्ट्स",
      
      // Mobile Tab Bar
      tab_home: "होम",
      tab_kundli: "कुण्डली",
      tab_muhurat: "मुहूर्त",
      tab_sanctuary: "परामर्श",
      tab_reports: "रिपोर्ट्स",

      // Sacred seal
      sacred_seal: "👑 प्रति दिवस केवल एक जातक",

      // 8 Home Grid Service Cards (Shastra-First Terminology)
      card_vivah_title: "विवाह मुहूर्त शोध",
      card_vivah_sub: "१० महादोष व त्रिबल शुद्धि",
      card_patrika_title: "पत्रिका (Patrika)",
      card_patrika_sub: "सर्वाधिक सटीक शास्त्रीय जन्म चक्र",
      card_vastu_title: "वास्तु एवं गृह प्रवेश",
      card_vastu_sub: "विश्वकर्मा प्रकाश सम्मत शोध",
      card_yajno_title: "यज्ञोपवीत (उपनयन)",
      card_yajno_sub: "पारस्कर गृह्यसूत्र सम्मत",
      card_mundan_title: "चूड़ाकर्म (मुंडन)",
      card_mundan_sub: "शास्त्रोक्त मास व तिथि विचार",
      card_sanctuary_title: "परामर्श Sanctuary",
      card_sanctuary_sub: "१-ऑन-१ एस्ट्रो रामजी",
      card_kaalsarp_title: "कालसर्प दोष निवारण",
      card_kaalsarp_sub: "१२ प्रकार के योग शांति",
      card_mangal_title: "मंगल दोष परिहार",
      card_mangal_sub: "२८ शास्त्रीय नियम परीक्षण",

      // Shastra Description Tags
      desc_vivah_shastra: "मुहूर्त चिंतामणि एवं शास्त्र सम्मत 10 महादोष व त्रिबल शुद्धि परीक्षण।",
      desc_patrika_shastra: "बृहत्पाराशर होराशास्त्र सम्मत सूक्ष्म ग्रह स्थिति एवं षोडशवर्ग विश्लेषण।",
      desc_vastu_shastra: "विश्वकर्मा प्रकाश एवं शास्त्रोक्त शिलान्यास/गृह प्रवेश मुहूर्त।",
      desc_yajno_shastra: "पारस्कर गृह्यसूत्र एवं मुहूर्त ग्रंथों पर आधारित षोडश संस्कार निर्णय।",
      desc_mundan_shastra: "शास्त्रोक्त मास, तिथि, नक्षत्र व लग्न शुद्धि विचार।",

      // Tab 1: Kundli Quick Form
      kundli_page_title: "📜 प्रामाणिक जन्म चक्र (Patrika 360)",
      kundli_page_sub: "बृहत्पाराशर सम्मत षोडशवर्ग, विंशोत्तरी दशा व भाव चलित",
      lbl_name: "जातक का नाम (Full Name)",
      ph_name: "उदा: राहुल शर्मा",
      lbl_dob: "जन्म तिथि (DOB)",
      lbl_tob: "जन्म समय (Time)",
      lbl_city: "जन्म स्थान (City / Place)",
      ph_city: "उदा: Varanasi, Delhi, Mumbai",
      btn_generate_kundli: "✨ जन्म चक्र तैयार करें (Open Patrika ➔)",
      badge_sripati: "☀️ श्रीपति भाव चलित",
      badge_vimsottari: "🪐 विंशोत्तरी दशाएं",
      badge_ashtakvarga: "🛡️ सर्वाष्टकवर्ग सारणी",
      badge_shodashvarga: "📜 षोडशवर्ग सूक्ष्म चक्र",
      btn_full_calculator: "पूर्ण शास्त्रीय पत्रिका पर जाएं ➔",

      // Tab 2: Muhurat Hub
      muhurat_page_title: "💍 समस्त शास्त्रीय मुहूर्त शोधन",
      muhurat_page_sub: "मुहूर्त चिन्तामणि व निर्णयसिंधु अनुसार ४ महा-शोध साधन",
      muhurat_vivah_title: "शास्त्रीय विवाह मुहूर्त शोध",
      muhurat_vivah_sub: "१० महादोष परिहार • ३६ गुण मिलान",
      muhurat_vastu_title: "वास्तु एवं गृह प्रवेश मुहूर्त",
      muhurat_vastu_sub: "विश्वकर्मा प्रकाश • नींव पूजन • शिलान्यास",
      muhurat_yajno_title: "यज्ञोपवीत (उपनयन) संस्कार",
      muhurat_yajno_sub: "पारस्कर गृह्यसूत्र • त्रिबल शुद्धि • अष्टम रिक्त",
      muhurat_mundan_title: "चूड़ाकर्म (मुंडन) संस्कार",
      muhurat_mundan_sub: "१४ शास्त्रीय नियम • चंद्रबल • ताराबल",
      muhurat_notice: "ℹ️ सभी मुहूर्त शोधन ₹1,111 VIP शास्त्रीय शोध सत्र (20 मिनट पूर्ण एक्सेस) द्वारा संचालित हैं।",

      // Tab 3: Sanctuary
      sanctuary_page_title: "🪔 पर्सनल परामर्श (Sanctuary)",
      sanctuary_page_sub: "Strictly One Soul Per Solar Day • Astro Raamji",
      sanctuary_heading: "SACRED SANCTUARY",
      sanctuary_p1: "प्रति दिवस केवल एक जातक का गहन अध्ययन। सूर्योदय से सूर्यास्त तक आपकी सम्पूर्ण कुण्डली, सूक्ष्म वर्ग और ग्रह स्थितियों का व्यक्तिगत विश्लेषण।",
      sanctuary_b1: "✓ ९० मिनट विस्तृत 1-on-1 संवाद",
      sanctuary_b2: "✓ षोडशवर्ग सूक्ष्म कुंडलियों का गहन परीक्षण",
      sanctuary_b3: "✓ सटीक रत्न, रुद्राक्ष व वैदिक मंत्र अनुष्ठान उपाय",
      sanctuary_b4: "✓ कोई असिस्टेंट नहीं — सीधे आचार्य रामजी से चर्चा",
      btn_sanctuary_booking: "पूर्ण विवरण व बुकिंग कैलेंडर देखें ➔",

      // Tab 4: Reports
      reports_page_title: "📊 विशिष्ट जन्मपत्री रिपोर्ट्स",
      reports_page_sub: "विस्तृत जीवन विश्लेषण एवं प्रामाणिक वैदिक उपाय",
      rep_kaalsarp_title: "कालसर्प दोष निवारण",
      rep_kaalsarp_sub: "१२ प्रकार के योग विश्लेषण व शांति",
      rep_mangal_title: "मंगल दोष एवं सामर्थ्य",
      rep_mangal_sub: "भौम दोष परिहार व दांपत्य जीवन समाधान",
      rep_sadesati_title: "साढ़ेसाती व शनि ढैय्या",
      rep_sadesati_sub: "शनि गोचर प्रभाव व अमोघ वैदिक शांति",
      rep_ratna_title: "रत्न परामर्श व वैदिक उपाय",
      rep_ratna_sub: "अनुकूल रत्न, धारण विधि व मंत्र शुद्धि",
      blog_section_title: "📚 शास्त्रीय शोध व आलेख",
      blog_section_sub: "महर्षि पराशर व मुहूर्त चिंतामणि सम्मत प्रामाणिक शोध",
      btn_view_all_blogs: "सभी देखें ➔",
      btn_sra_blogs: "📚 सभी 7 शास्त्रीय ब्लॉग्स व परिचर्चा देखें ➔",

      // VIP Modal Copy (Task 2)
      vip_modal_header: "शास्त्रीय मुहूर्त शोध — VIP सत्र (20 मिनट)",
      vip_hl_1: "✓ मुहूर्त चिंतामणि अनुसार 10 महादोष एवं त्रिबल शुद्धि",
      vip_hl_2: "✓ प्रामाणिक अष्टकूट मिलान (36 गुण विचार)",
      vip_hl_3: "✓ 20 मिनट तक असीमित शास्त्रीय मुहूर्त शोध",
      vip_price_label: "शास्त्रीय मुहूर्त शोध सत्र",
      vip_cta_btn: "⚡ ₹1,111 का भुगतान करें (सुरक्षित माध्यम)",
      vip_lock_note: "🔒 100% सुरक्षित पेमेंट (Razorpay) • 20 मिनट असीमित सत्र",

      // Dropdown sub items & common
      sub_vivah_title: "शास्त्रीय विवाह मुहूर्त शोध",
      sub_vivah_desc: "10 महादोष व त्रिबल शुद्धि",
      sub_vastu_title: "वास्तु व गृह प्रवेश",
      sub_vastu_desc: "विश्वकर्मा प्रकाश व नींव पूजन",
      sub_yajno_title: "यज्ञोपवीत (उपनयन)",
      sub_yajno_desc: "पारस्कर गृह्यसूत्र व चंद्र शुद्धि",
      sub_mundan_title: "चूड़ाकर्म (मुंडन) मुहूर्त",
      sub_mundan_desc: "शुभ सौर मास, वार व नक्षत्र शुद्धि",
      sub_patrika_title: "पत्रिका (Patrika)",
      sub_patrika_desc: "षोडशवर्ग, विंशोत्तरी व योग",
      sub_kaalsarp_title: "कालसर्प दोष रिपोर्ट",
      sub_kaalsarp_desc: "12 कालसर्प व अचूक उपाय",
      sub_mangal_title: "मंगल दोष निवारण",
      sub_mangal_desc: "28 शास्त्रीय परिहार नियम",
      sub_ratna_title: "रत्न और वैदिक उपाय",
      sub_ratna_desc: "लग्नेश-भाग्येश शोधन व रुद्राक्ष",
      nav_patrika: "पत्रिका (Patrika)",
      nav_vivah: "विवाह मुहूर्त",
      nav_vastu: "वास्तु मुहूर्त",
      nav_yajno: "यज्ञोपवीत",
      nav_mundan: "चूड़ाकर्म (मुंडन)",
      nav_consult: "परामर्श (Sanctuary)",
      nav_course: "कोर्स (Academy)",
      nav_about: "अबाउट व ब्लॉग",
      nav_admin: "एडमिन",
      bnav_home: "Home",
      bnav_patrika: "Patrika",
      bnav_muhurt: "Muhurt",
      bnav_sanctuary: "Sanctuary",
      cta_vivah: "मुहूर्त शोधें ➔",
      cta_match: "अभी मिलान करें ➔",
      cta_yajno: "मुहूर्त देखें ➔",
      cta_vastu: "वास्तु मुहूर्त देखें ➔",
      cta_patrika: "पत्रिका बनाएँ ➔",
      cta_course: "कोर्स जॉइन करें (₹24,000) ➔",
      cta_consult: "स्लॉट बुक करें (₹5,100) ➔",
      preorder_btn: "🚀 प्री-ऑर्डर / नोटिफाई मी (Notify Me)",
      preorder_heading: "यह रिपोर्ट जल्द आ रही है (Coming Soon)",
      preorder_sub: "विशेष शास्त्रीय श्लोकों और सटीक उपायों से सुसज्जित। प्री-ऑर्डर करने और लॉन्च ऑफर पाने के लिए अपना फोन नंबर दर्ज करें।",
      preorder_success: "धन्यवाद! आपका प्री-ऑर्डर दर्ज हो गया है। रिपोर्ट लॉन्च होते ही आपको सूचित किया जाएगा।"
    },
    en: {
      brand_main: "PATRIKA",
      brand_sub: "by Shri Ram Ji Astro",
      lang_label: "English",
      lang_alt: "हिन्दी",
      nav_home: "Home",
      menu_muhurt: "Muhurts",
      menu_reports: "Reports",

      // Mobile Tab Bar
      tab_home: "Home",
      tab_kundli: "Kundli",
      tab_muhurat: "Muhurat",
      tab_sanctuary: "Sanctuary",
      tab_reports: "Reports",

      // Sacred seal
      sacred_seal: "👑 Strictly One Soul Per Day",

      // 8 Home Grid Service Cards (Shastra-First Terminology)
      card_vivah_title: "Classical Vivah Muhurta",
      card_vivah_sub: "10 Mahadosha & Tribala Test",
      card_patrika_title: "Patrika (Birth Chart)",
      card_patrika_sub: "Authentic Classical Birth Chart",
      card_vastu_title: "Vastu & Griha Pravesh",
      card_vastu_sub: "Vishwakarman Shastra Guidance",
      card_yajno_title: "Yajnopavita (Upanayana)",
      card_yajno_sub: "Paraskara Grihyasutra Guidance",
      card_mundan_title: "Mundan (Chudakarma)",
      card_mundan_sub: "Classical Tithi & Month Shuddhi",
      card_sanctuary_title: "Sanctuary Consultation",
      card_sanctuary_sub: "1-on-1 Astro Raamji",
      card_kaalsarp_title: "Kaal Sarp Dosh Remedy",
      card_kaalsarp_sub: "12 Yoga Parihar & Puja",
      card_mangal_title: "Mangal Dosh Analysis",
      card_mangal_sub: "28 Classical Parihar Rules",

      // Shastra Description Tags
      desc_vivah_shastra: "Muhurta Chintamani & Shastra authenticated 10 Mahadosha & Tribala verification.",
      desc_patrika_shastra: "Brihat Parashara Hora Shastra verified micro-planetary positions and Shodashvarga.",
      desc_vastu_shastra: "Vishwakarman Prakasha based foundation laying and Griha Pravesh auspicious timings.",
      desc_yajno_shastra: "Paraskara Grihyasutra and classical scripture based sacred thread investiture.",
      desc_mundan_shastra: "Scripture-backed solar month, lunar day, asterism and ascendant purity.",

      // Tab 1: Kundli Quick Form
      kundli_page_title: "📜 Classical Birth Chart (Patrika 360)",
      kundli_page_sub: "Parashara Shodashvarga, Vimsottari Dasha & Bhava Chalita",
      lbl_name: "Native Full Name",
      ph_name: "e.g. Rahul Sharma",
      lbl_dob: "Date of Birth (DOB)",
      lbl_tob: "Time of Birth (Time)",
      lbl_city: "Place of Birth (City / Place)",
      ph_city: "e.g. Varanasi, Delhi, Mumbai",
      btn_generate_kundli: "✨ Generate Birth Chart (Open Patrika ➔)",
      badge_sripati: "☀️ Sripati Bhava Chalita",
      badge_vimsottari: "🪐 Vimsottari Dashas",
      badge_ashtakvarga: "🛡️ Sarvashtakavarga Table",
      badge_shodashvarga: "📜 Shodashvarga Cycles",
      btn_full_calculator: "Go to Full Classical Patrika ➔",

      // Tab 2: Muhurat Hub
      muhurat_page_title: "💍 All Classical Muhurta Elections",
      muhurat_page_sub: "4 Master Systems as per Muhurta Chintamani & Nirnaya Sindhu",
      muhurat_vivah_title: "Classical Vivah Muhurta Election",
      muhurat_vivah_sub: "10 Mahadosha Parihar • 36 Guna Milan",
      muhurat_vastu_title: "Vastu & Griha Pravesh Muhurta",
      muhurat_vastu_sub: "Vishwakarman Shastra • Neev Pujan • Sthira Lagna",
      muhurat_yajno_title: "Yajnopavita (Upanayana) Ceremony",
      muhurat_yajno_sub: "Paraskara Grihyasutra • Tribala Shuddhi",
      muhurat_mundan_title: "Chudakarma (Mundan) Ceremony",
      muhurat_mundan_sub: "14 Classical Injunctions • Moon & Tara Bala",
      muhurat_notice: "ℹ️ All Muhurta elections are backed by ₹1,111 VIP Classical Session (20 Mins unmetered access).",

      // Tab 3: Sanctuary
      sanctuary_page_title: "🪔 Personal Consultation (Sanctuary)",
      sanctuary_page_sub: "Strictly One Soul Per Solar Day • Astro Raamji",
      sanctuary_heading: "SACRED SANCTUARY",
      sanctuary_p1: "Deep personalized analysis of strictly one soul per day. Detailed study of micro-divisional charts, yogas, and life destiny from dawn to dusk.",
      sanctuary_b1: "✓ 90-Minute in-depth 1-on-1 dialogue",
      sanctuary_b2: "✓ Examination of micro-divisional Shodashvarga charts",
      sanctuary_b3: "✓ Precise gemstones, Rudraksha, and Vedic ritual remedies",
      sanctuary_b4: "✓ No assistants — direct dialogue with Acharya Raamji",
      btn_sanctuary_booking: "View Details & Booking Calendar ➔",

      // Tab 4: Reports
      reports_page_title: "📊 Specialized Horoscope Reports",
      reports_page_sub: "In-depth life analysis and authentic Vedic remedial guidance",
      rep_kaalsarp_title: "Kaal Sarp Dosh Remedy",
      rep_kaalsarp_sub: "12 Yoga analysis and authentic remedial shanti",
      rep_mangal_title: "Mangal Dosh Analysis",
      rep_mangal_sub: "Bhauma dosha parihar and marital harmony solutions",
      rep_sadesati_title: "Sade Sati & Shani Dhaiya",
      rep_sadesati_sub: "Saturn transit impact and classical Vedic peace rituals",
      rep_ratna_title: "Gemstones & Vedic Remedies",
      rep_ratna_sub: "Auspicious gemstones, wearing rituals, and mantra purity",
      blog_section_title: "📚 Classical Research & Articles",
      blog_section_sub: "Authentic Research based on BPHS & Muhurta Chintamani",
      btn_view_all_blogs: "View All ➔",
      btn_sra_blogs: "📚 View All 7 Classical Blogs & Discussion ➔",

      // VIP Modal Copy (Task 2)
      vip_modal_header: "Classical Muhurta Election — VIP Session (20 Mins)",
      vip_hl_1: "✓ 10 Mahadosha and Tribala test per Muhurta Chintamani",
      vip_hl_2: "✓ Authentic Ashtakoota compatibility (36 Guna analysis)",
      vip_hl_3: "✓ 20 minutes unmetered classical election session",
      vip_price_label: "Classical Muhurta Session",
      vip_cta_btn: "⚡ Pay ₹1,111 (Secure Gateway)",
      vip_lock_note: "🔒 100% Secure Payment (Razorpay) • 20 Mins Session",

      // Dropdown sub items & common
      sub_vivah_title: "Classical Vivah Muhurta",
      sub_vivah_desc: "10 Mahadoshas & Tribala",
      sub_vastu_title: "Vastu & Griha Pravesh",
      sub_vastu_desc: "Vishwakarman & Neev Pujan",
      sub_yajno_title: "Yajnopavita Muhurta",
      sub_yajno_desc: "Paraskara Grihyasutra & Moon",
      sub_mundan_title: "Mundan (Chudakarma)",
      sub_mundan_desc: "Solar Month, Vara & Star Shuddhi",
      sub_patrika_title: "Patrika (Birth Chart)",
      sub_patrika_desc: "Shodashvarga, Dashas & Yogas",
      sub_kaalsarp_title: "Kaal Sarp Dosh Report",
      sub_kaalsarp_desc: "12 Types & Shastra Remedies",
      sub_mangal_title: "Mangal Dosh Report",
      sub_mangal_desc: "28 Classical Parihar Rules",
      sub_ratna_title: "Gemstones & Remedies",
      sub_ratna_desc: "Ascendant/9th Lord Analysis",
      nav_patrika: "Patrika (Birth Chart)",
      nav_vivah: "Vivah Muhurta",
      nav_vastu: "Vastu Muhurta",
      nav_yajno: "Yajnopavita",
      nav_mundan: "Mundan Muhurta",
      nav_consult: "Sanctuary",
      nav_course: "Academy Course",
      nav_about: "About & Blog",
      nav_admin: "Admin",
      bnav_home: "Home",
      bnav_patrika: "Patrika",
      bnav_muhurt: "Muhurt",
      bnav_sanctuary: "Sanctuary",
      cta_vivah: "Check Muhurta ➔",
      cta_match: "Match Kundli ➔",
      cta_yajno: "View Muhurta ➔",
      cta_vastu: "Check Vastu ➔",
      cta_patrika: "Create Patrika ➔",
      cta_course: "Join Academy (₹24,000) ➔",
      cta_consult: "Book Sanctuary (₹5,100) ➔",
      preorder_btn: "🚀 Pre-Order / Notify Me",
      preorder_heading: "Report Coming Soon",
      preorder_sub: "Engineered with authentic classical verses and planetary remedies. Enter your WhatsApp/Phone to claim early launch pricing.",
      preorder_success: "Thank you! Your pre-order has been registered. You will be notified instantly upon launch."
    }
  };

  window.I18N_GLOBAL = I18N_GLOBAL;

  // ══════════════════════════════════════════════════════════════════════════
  // DYNAMIC TITHI & ASTRONOMICAL PANCHANG ENGINE
  // ══════════════════════════════════════════════════════════════════════════
  function norm360(d) {
    d = d % 360;
    return d < 0 ? d + 360 : d;
  }

  function toHindiDigits(num) {
    const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).split('').map(c => (c >= '0' && c <= '9') ? hindiDigits[parseInt(c, 10)] : c).join('');
  }

  function calculateLivePanchang(date, lang) {
    if (!date) date = new Date();
    if (!lang) lang = getCurrentLanguage();

    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const h = date.getUTCHours() + date.getUTCMinutes() / 60.0;

    let year = y, month = m;
    if (month <= 2) { year -= 1; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5 + h / 24.0;
    const T = (jd - 2451545.0) / 36525.0;

    // Sun True Longitude
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T) * Math.sin(M * Math.PI / 180) + 0.02 * Math.sin(2 * M * Math.PI / 180);
    const sunLon = norm360(L0 + C);

    // Moon Longitude (Leading Meeus ELP Terms)
    const L_prime = 218.3164477 + 481267.88123421 * T;
    const D = 297.8501921 + 445267.1114034 * T;
    const M_prime = 134.9633964 + 477198.8675055 * T;
    const moonLon = norm360(L_prime + 6.288774 * Math.sin(M_prime * Math.PI / 180) + 1.274027 * Math.sin((2*D - M_prime) * Math.PI / 180) + 0.658314 * Math.sin(2*D * Math.PI / 180));

    // Angular distance for Tithi
    const diff = norm360(moonLon - sunLon);
    const tithiIndex = Math.floor(diff / 12) + 1; // 1 to 30

    const isShukla = tithiIndex <= 15;
    const tithiNum = isShukla ? tithiIndex : (tithiIndex - 15);

    const tithiNamesHi = [
      '', 'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी',
      'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
      'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा'
    ];
    const tithiNamesEn = [
      '', 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shasthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dvadashi', 'Trayodashi', 'Chaturdashi', 'Purnima'
    ];

    let tithiNameHi = tithiNamesHi[tithiNum] || '';
    let tithiNameEn = tithiNamesEn[tithiNum] || '';
    if (!isShukla && tithiNum === 15) {
      tithiNameHi = 'अमावस्या';
      tithiNameEn = 'Amavasya';
    }

    const pakshaHi = isShukla ? 'शुक्ल' : 'कृष्ण';
    const pakshaEn = isShukla ? 'Shukla' : 'Krishna';

    // Solar month (Masa) from Sidereal Sun
    const ayanamsa = 23.85 + 1.396 * T;
    const sidSunLon = norm360(sunLon - ayanamsa);
    const sunRashiIndex = Math.floor(sidSunLon / 30);

    const masaNamesHi = [
      'वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन',
      'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
    ];
    const masaNamesEn = [
      'Vaisakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwina',
      'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna', 'Chaitra'
    ];

    const masaHi = masaNamesHi[sunRashiIndex] || 'आश्विन';
    const masaEn = masaNamesEn[sunRashiIndex] || 'Ashwina';

    // Day of week
    const dayOfWeek = date.getDay();
    const varaNamesHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
    const varaNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Vikram Samvat: Chaitra Shukla Pratipada transition
    const samvat = (m > 3 || (m === 3 && d >= 22)) ? (y + 57) : (y + 56);

    if (lang === 'en') {
      return `Vikram Samvat ${samvat} • ${masaEn} ${pakshaEn} ${tithiNameEn} • ${varaNamesEn[dayOfWeek]}`;
    } else {
      return `विक्रम संवत् ${toHindiDigits(samvat)} • ${masaHi} ${pakshaHi} ${tithiNameHi} • ${varaNamesHi[dayOfWeek]}`;
    }
  }
  window.calculateLivePanchang = calculateLivePanchang;

  function updateLivePanchangDisplay(lang) {
    if (!lang) lang = getCurrentLanguage();
    const panchangStr = calculateLivePanchang(new Date(), lang);

    document.querySelectorAll('#panchangText, [data-i18n-panchang]').forEach(el => {
      el.textContent = panchangStr;
    });

    document.querySelectorAll('.vedic-date-chip').forEach(chip => {
      const lastSpan = chip.querySelector('span:last-child');
      if (lastSpan && (!lastSpan.id || lastSpan.id === 'panchangText')) {
        lastSpan.textContent = panchangStr;
      }
    });
  }
  window.updateLivePanchangDisplay = updateLivePanchangDisplay;

  function getCurrentLanguage() {
    try {
      const saved = localStorage.getItem('sra_lang');
      if (saved === 'hi' || saved === 'en') return saved;
    } catch(e) {}
    return 'hi';
  }

  function applyLanguage(lang) {
    if (!I18N_GLOBAL[lang]) lang = 'hi';
    try { localStorage.setItem('sra_lang', lang); } catch(e) {}
    document.documentElement.setAttribute('lang', lang);

    const dict = I18N_GLOBAL[lang];

    // 1. Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    // 2. Elements with data-i18n-hi and data-i18n-en
    document.querySelectorAll('[data-i18n-hi][data-i18n-en]').forEach(el => {
      const txt = el.getAttribute('data-i18n-' + lang);
      if (txt) el.textContent = txt;
    });

    // 3. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });

    // 4. Update language toggle button labels and active pill state
    document.querySelectorAll('.lang-pill-btn, .lang-toggle-btn, #langToggleBtn, #globalLangBtn').forEach(btn => {
      const label = btn.querySelector('.lang-current, .lang-active-label, #langPillText');
      if (label) {
        label.textContent = lang === 'hi' ? 'हिन्दी' : 'English';
      }
      const optHi = btn.querySelector('.lang-hi');
      const optEn = btn.querySelector('.lang-en');
      if (optHi && optEn) {
        optHi.classList.toggle('active', lang === 'hi');
        optEn.classList.toggle('active', lang === 'en');
      }
    });

    // 5. Update Dynamic Panchang Header
    updateLivePanchangDisplay(lang);

    // 6. Trigger page-specific I18N if implemented (e.g., vmm.html, mmm.html)
    if (typeof window.setLanguage === 'function' && window.setLanguage !== applyLanguage && !window._langSyncing) {
      try {
        window._langSyncing = true;
        window.setLanguage(lang);
        window._langSyncing = false;
      } catch(e) { window._langSyncing = false; }
    }
  }

  window.toggleLanguage = function() {
    const current = getCurrentLanguage();
    const next = current === 'hi' ? 'en' : 'hi';
    applyLanguage(next);
  };
  window.setSiteLanguage = applyLanguage;

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ADAPTIVE STICKY MOBILE BOTTOM NAVIGATION BAR (< 768px)
  // ══════════════════════════════════════════════════════════════════════════
  function injectBottomNavStyles() {
    if (document.getElementById('sra-bottom-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'sra-bottom-nav-styles';
    style.textContent = `
      /* SECONDARY FLOATING/BOTTOM NAVBAR PERMANENTLY DISABLED */
      .mobile-bottom-nav {
        display: none !important;
      }

      /* UNIFIED RESPONSIVE BRANDING */
      .nav-brand-group {
        display: inline-flex;
        flex-direction: column;
        line-height: 1.15;
        text-align: left;
      }
      .brand-title {
        font-family: 'Cinzel', serif;
        font-size: 15px;
        font-weight: 800;
        color: var(--gold-dark, #c5a059);
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      .brand-sub {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 9px;
        font-weight: 600;
        color: var(--muted, #94a3b8);
        letter-spacing: 0.5px;
        text-transform: uppercase;
        display: block;
        white-space: nowrap;
      }
      .nav-logo-img {
        height: 36px;
        width: 36px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid var(--gold-border, rgba(212, 175, 55, 0.3));
        flex-shrink: 0;
      }
      @media (max-width: 767px) {
        html, body {
          width: 100% !important;
          max-width: 100vw !important;
          overflow-x: hidden !important;
          position: relative !important;
          -webkit-text-size-adjust: 100% !important;
          box-sizing: border-box !important;
        }
        body {
          padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px)) !important;
          width: 100% !important;
        }

        /* UNIFIED NATIVE MOBILE APP TOP BAR */
        nav:not(.mobile-bottom-nav) {
          height: 56px !important;
          padding: 0 12px !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 9998 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          background: var(--nav-bg, rgba(255, 255, 255, 0.95)) !important;
          border-bottom: 1px solid var(--gold-border, rgba(212, 175, 55, 0.25)) !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05) !important;
          overflow: visible !important;
        }
        nav .nav-btns, nav .nav-actions {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          flex-shrink: 0 !important;
        }
        /* Hide bulky Day/Night slider and Register button from mobile top bar to avoid header overflow */
        nav .theme-toggle-container,
        nav #themeToggleBtn,
        nav .btn-register,
        nav #regNavBtn {
          display: none !important;
        }
        /* Suppress duplicate secondary brand banners on tool pages */
        .brand-banner {
          display: none !important;
        }
        nav .btn-login,
        nav #loginNavBtn {
          padding: 5px 9px !important;
          font-size: 10.5px !important;
          border-radius: 8px !important;
          background: var(--gold-dim, rgba(197, 160, 89, 0.1)) !important;
          border: 1px solid var(--gold-border, rgba(212, 175, 55, 0.3)) !important;
          color: var(--gold-dark, #c5a059) !important;
          font-weight: 700 !important;
        }
        nav .lang-pill-btn {
          padding: 4px 7px !important;
          font-size: 10px !important;
        }
        nav .hamburger, .hamburger {
          font-size: 22px !important;
          padding: 4px 6px !important;
          color: var(--gold-dark, #c5a059) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 38px !important;
          min-height: 38px !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          background: transparent !important;
          border: none !important;
          flex-shrink: 0 !important;
          z-index: 10001 !important;
        }
        nav .brand-title {
          font-size: 14px !important;
        }
        nav .brand-sub {
          font-size: 8px !important;
          max-width: 130px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
      }

      /* TYPOGRAPHY & DEVANAGARI FONT HARMONY */
      [data-i18n], :lang(hi), .devanagari {
        font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        line-height: 1.55;
        letter-spacing: 0.15px;
      }
      h1, h2, h3, h4 {
        line-height: 1.3;
      }

      /* ADAPTIVE BOTTOM-SHEET MODAL (< 768px) */
      .bottom-sheet-handle { display: none; }
      @media (max-width: 767px) {
        .modal-overlay {
          align-items: flex-end !important;
          padding: 0 !important;
        }
        .modal-overlay .modal {
          border-radius: 24px 24px 0 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 20px 20px calc(32px + env(safe-area-inset-bottom, 0px)) !important;
          transform: translateY(100%) !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.3) !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
        }
        .modal-overlay.open .modal {
          transform: translateY(0) !important;
        }
        .bottom-sheet-handle {
          display: block;
          width: 44px;
          height: 5px;
          background: var(--gold-border, rgba(212, 175, 55, 0.3));
          border-radius: 4px;
          margin: 0 auto 16px;
          opacity: 0.8;
        }
      }

      /* DESKTOP NESTED DROPDOWNS */
      .nav-dropdown {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .nav-dropdown-btn {
        background: transparent;
        border: none;
        font-family: 'Cinzel', serif;
        font-size: 10.5px;
        letter-spacing: 1.2px;
        color: var(--text, #cbd5e1);
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        text-transform: uppercase;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .nav-dropdown-btn:hover, .nav-dropdown.open .nav-dropdown-btn {
        color: var(--gold-dark, #c5a059);
        background: var(--gold-dim, rgba(197, 160, 89, 0.12));
      }
      .nav-dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        min-width: 270px;
        background: var(--card, #14171f);
        border: 1px solid var(--gold-border, rgba(212, 175, 55, 0.3));
        border-radius: 14px;
        padding: 8px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
        display: none;
        flex-direction: column;
        gap: 4px;
        z-index: 1000;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }
      .nav-dropdown:hover .nav-dropdown-menu, .nav-dropdown.open .nav-dropdown-menu {
        display: flex;
      }
      .nav-dropdown-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 12px;
        border-radius: 10px;
        text-decoration: none;
        transition: background 0.18s ease, transform 0.15s ease;
      }
      .nav-dropdown-item:hover {
        background: var(--gold-dim, rgba(197, 160, 89, 0.14));
        transform: translateX(3px);
      }
      .drop-item-icon {
        font-size: 18px;
        line-height: 1;
        flex-shrink: 0;
      }
      .drop-item-text {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .drop-item-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--heading-color, #f1f5f9);
        font-family: 'Cinzel', 'Noto Sans Devanagari', sans-serif;
      }
      .drop-item-desc {
        font-size: 10px;
        color: var(--muted, #94a3b8);
        margin-top: 2px;
      }
      .drop-badge {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 6px;
        background: rgba(185, 28, 28, 0.15);
        color: var(--red, #ef4444);
        border: 1px solid rgba(185, 28, 28, 0.3);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      /* COLLAPSIBLE SLIDE-OUT NAVIGATION DRAWER */
      .nav-drawer-backdrop {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(5, 3, 10, 0.65) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        z-index: 99999 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease !important;
      }
      .nav-drawer-backdrop.open {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      .nav-drawer {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 320px !important;
        max-width: 88vw !important;
        background: var(--nav-bg, #11141a) !important;
        border-left: 1px solid var(--gold-border, rgba(212, 175, 55, 0.25)) !important;
        z-index: 100000 !important;
        display: flex !important;
        flex-direction: column !important;
        box-shadow: -10px 0 35px rgba(0, 0, 0, 0.45) !important;
        transform: translateX(100%) !important;
        transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
        box-sizing: border-box !important;
      }
      .nav-drawer.open {
        transform: translateX(0) !important;
      }
      .drawer-header {
        padding: 14px 18px !important;
        border-bottom: 1px solid var(--gold-border, rgba(212, 175, 55, 0.2)) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: var(--card, #14171f) !important;
        flex-shrink: 0 !important;
        gap: 10px !important;
      }
      .drawer-brand {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        flex: 1 !important;
        min-width: 0 !important;
      }
      .drawer-logo-img {
        width: 36px !important;
        height: 36px !important;
        max-width: 36px !important;
        max-height: 36px !important;
        border-radius: 50% !important;
        object-fit: cover !important;
        border: 1px solid var(--gold-border, rgba(212, 175, 55, 0.3)) !important;
        flex-shrink: 0 !important;
      }
      .drawer-brand-text {
        display: flex !important;
        flex-direction: column !important;
        line-height: 1.15 !important;
        min-width: 0 !important;
      }
      .drawer-brand-title {
        font-family: 'Cinzel', serif !important;
        font-size: 15px !important;
        font-weight: 800 !important;
        color: var(--gold-dark, #c5a059) !important;
        letter-spacing: 0.5px !important;
        white-space: nowrap !important;
      }
      .drawer-brand-sub {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-size: 9px !important;
        font-weight: 600 !important;
        color: var(--muted, #94a3b8) !important;
        letter-spacing: 0.5px !important;
        text-transform: uppercase !important;
        white-space: nowrap !important;
      }
      .drawer-close-btn {
        background: none !important;
        border: none !important;
        color: var(--gold-dark, #c5a059) !important;
        font-size: 20px !important;
        cursor: pointer !important;
        padding: 6px 10px !important;
        line-height: 1 !important;
        border-radius: 8px !important;
        transition: background 0.2s !important;
        min-width: 36px !important;
        min-height: 36px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }
      .drawer-close-btn:hover {
        background: var(--gold-dim, rgba(197, 160, 89, 0.15)) !important;
      }
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .drawer-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        color: var(--text, #e2e8f0);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        font-family: 'Cinzel', 'Noto Sans Devanagari', sans-serif;
        transition: background 0.2s ease;
      }
      .drawer-item:hover, .drawer-item.active {
        background: var(--gold-dim, rgba(197, 160, 89, 0.15));
        color: var(--gold-dark, #c5a059);
      }
      .drawer-accordion-group {
        border: 1px solid var(--gold-border, rgba(212, 175, 55, 0.2));
        border-radius: 12px;
        overflow: hidden;
        background: var(--card, #14171f);
      }
      .drawer-accordion-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 13px 14px;
        background: transparent;
        border: none;
        color: var(--heading-color, #f1f5f9);
        font-family: 'Cinzel', 'Noto Sans Devanagari', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-align: left;
        transition: background 0.2s;
      }
      .drawer-accordion-btn:hover {
        background: var(--gold-dim, rgba(197, 160, 89, 0.1));
      }
      .drawer-acc-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .drawer-acc-arrow {
        font-size: 14px;
        transition: transform 0.25s ease;
        color: var(--gold-dark, #c5a059);
      }
      .drawer-accordion-btn.expanded .drawer-acc-arrow {
        transform: rotate(180deg);
      }
      .drawer-accordion-panel {
        display: none;
        flex-direction: column;
        gap: 2px;
        padding: 4px 8px 10px;
        background: var(--bg2, #0d1017);
        border-top: 1px solid var(--gold-border, rgba(212, 175, 55, 0.15));
      }
      .drawer-accordion-panel.open {
        display: flex;
      }
      .drawer-sub-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 8px;
        text-decoration: none;
        color: var(--text, #cbd5e1);
        transition: background 0.15s ease;
      }
      .drawer-sub-item:hover {
        background: var(--gold-dim, rgba(197, 160, 89, 0.15));
        color: var(--gold-dark, #c5a059);
      }
      .drawer-sub-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
      .drawer-sub-text {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
        flex: 1;
      }
      .drawer-sub-title {
        font-size: 12px;
        font-weight: 700;
      }
      .drawer-sub-hint {
        font-size: 9.5px;
        color: var(--muted, #94a3b8);
        margin-top: 2px;
      }
      .drawer-footer {
        padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid var(--gold-border, rgba(212, 175, 55, 0.2));
        background: var(--card, #14171f);
      }

      /* APP-LIKE MOBILE HERO QUICK ACTION GRID (< 768px) */
      .mobile-app-quick-grid {
        display: none;
      }
      @media (max-width: 767px) {
        .mobile-app-quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 18px 0 24px;
          width: 100%;
        }
        .app-quick-tile {
          background: var(--card);
          border: 1px solid var(--gold-border);
          border-radius: 14px;
          padding: 12px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .app-quick-tile:active {
          transform: scale(0.97);
          border-color: var(--gold-dark);
        }
        .app-tile-icon {
          font-size: 22px;
          line-height: 1;
          flex-shrink: 0;
        }
        .app-tile-info {
          text-align: left;
          line-height: 1.2;
        }
        .app-tile-title {
          font-size: 11.5px;
          font-weight: 800;
          color: var(--heading-color);
          font-family: 'Cinzel', 'Noto Sans Devanagari', sans-serif;
          display: block;
        }
        .app-tile-sub {
          font-size: 9px;
          color: var(--gold-dark);
          font-weight: 600;
        }
        .hero-sub {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 14px !important;
          font-size: 13px !important;
        }
        .hero-oath-card {
          display: none !important;
        }
        .hero-ctas {
          display: none !important;
        }
      }

      /* ENCAPSULATED BOX-WITHIN-A-BOX DESIGN PATTERN */
      .boxed-card {
        background: var(--card);
        border: 1.5px solid var(--gold-border);
        border-radius: 18px;
        padding: 22px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.04);
        transition: all 0.25s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .boxed-card:hover {
        border-color: var(--gold-dark);
        box-shadow: 0 10px 32px rgba(197, 160, 89, 0.18);
        transform: translateY(-2px);
      }
      .boxed-inner-tray {
        background: var(--bg2, #fbf8f2);
        border: 1px solid var(--gold-border);
        border-radius: 12px;
        padding: 12px 14px;
        margin: 14px 0;
      }
    `;
    document.head.appendChild(style);
  }

  function injectBottomNav() {
    // Secondary sticky scroll navbar completely disabled and removed
    const navs = document.querySelectorAll('.mobile-bottom-nav');
    navs.forEach(nav => nav.remove());
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4. UNIVERSAL SEO & INTERNAL LINKING GLOBAL FOOTER (SET AND FORGET)
  // ══════════════════════════════════════════════════════════════════════════
  function injectGlobalFooter() {
    if (document.querySelector('.site-global-footer')) return;
    if (window.location.pathname.includes('admin.html')) return;

    const footerHtml = `
<footer class="site-global-footer" style="background: #11141a; color: #cbd5e1; padding: 45px 20px 25px; margin-top: 50px; border-top: 1px solid rgba(212, 175, 55, 0.25); font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;">
  <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px;">
    <div>
      <h3 style="color: #e2b04a; font-family: 'Cinzel', serif; font-size: 1.15rem; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.5px;">Patrika by Shri Ram Ji Astro</h3>
      <p style="font-size: 0.88rem; line-height: 1.65; color: #94a3b8; margin: 0;">
        The gold standard in classical Vedic astrology software. Powered by True Chitra Paksha (Lahiri) Ayanamsa, 60-Term Meeus Lunar Expansion, and precise OpenStreetMap GPS Geocoding.
      </p>
    </div>
    <div>
      <h3 style="color: #ffffff; font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.5px;">Precision Astrology Tools</h3>
      <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.9;">
        <li><a href="/vmm.html" style="color: #60a5fa; text-decoration: none;">Vivah Muhurt & Matchmaking Engine</a></li>
        <li><a href="/vastu-muhurta.html" style="color: #60a5fa; text-decoration: none;">Vastu (Neev & Griha Pravesh) Muhurta</a></li>
        <li><a href="/yajnopavita.html" style="color: #60a5fa; text-decoration: none;">Upanayana (Yajnopavita) Scanner</a></li>
        <li><a href="/mmm.html" style="color: #60a5fa; text-decoration: none;">Mundan (Chudakarma) Scanner</a></li>
        <li><a href="/patrika.html" style="color: #60a5fa; text-decoration: none;">Astro 360 / Patrika (Birth Chart)</a></li>
        <li><a href="/consultation.html" style="color: #60a5fa; text-decoration: none;">VIP Sacred Consultations</a></li>
      </ul>
    </div>
    <div>
      <h3 style="color: #ffffff; font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.5px;">Classical Authority</h3>
      <p style="font-size: 0.88rem; line-height: 1.65; color: #94a3b8; margin: 0;">
        Algorithms strictly mapped to <em>Brihat Parashara Hora Shastra</em>, <em>Muhurta Chintamani</em>, and <em>Phaladeepika</em>. Zero approximations.
      </p>
    </div>
  </div>
  <div style="text-align: center; margin-top: 32px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; color: #64748b;">
    &copy; 2026 Patrika by Shri Ram Ji Astro. All rights reserved. Built for high-precision mathematical research.
  </div>
</footer>`;

    const placeholder = document.createElement('div');
    placeholder.innerHTML = footerHtml.trim();
    const newFooter = placeholder.firstElementChild;

    const existingFooter = document.querySelector('footer');
    if (existingFooter && !existingFooter.classList.contains('site-global-footer')) {
      existingFooter.replaceWith(newFooter);
    } else if (document.body) {
      document.body.appendChild(newFooter);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5. COLLAPSIBLE SLIDE-OUT NAVIGATION DRAWER & METHODS
  // ══════════════════════════════════════════════════════════════════════════
  window.openNavDrawer = function() {
    let drawer = document.getElementById('navDrawer');
    let backdrop = document.getElementById('navDrawerBackdrop');
    if (!drawer || !backdrop) {
      injectNavDrawer();
      drawer = document.getElementById('navDrawer');
      backdrop = document.getElementById('navDrawerBackdrop');
    }
    // Dismiss legacy menus if present
    document.querySelectorAll('.mobile-menu').forEach(m => {
      m.style.display = 'none';
      m.classList.remove('active', 'open');
    });
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    try { document.body.style.overflow = 'hidden'; } catch(e) {}
  };

  window.closeNavDrawer = function() {
    const drawer = document.getElementById('navDrawer');
    const backdrop = document.getElementById('navDrawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.querySelectorAll('.mobile-menu').forEach(m => {
      m.style.display = 'none';
      m.classList.remove('active', 'open');
    });
    try { document.body.style.overflow = ''; } catch(e) {}
  };

  window.toggleNavDrawer = function() {
    const drawer = document.getElementById('navDrawer');
    if (drawer && drawer.classList.contains('open')) {
      window.closeNavDrawer();
    } else {
      window.openNavDrawer();
    }
  };
  window.toggleMobileMenu = window.toggleNavDrawer;
  window.closeMobileMenu = window.closeNavDrawer;

  // GLOBAL CAPTURE-PHASE EVENT LISTENER FOR GUARANTEED HAMBURGER AND DRAWER CLICKS
  if (!window._sraNavDelegated) {
    window._sraNavDelegated = true;
    document.addEventListener('click', function(e) {
      // 1. Hamburger button click
      const hamburgerBtn = e.target.closest('.hamburger, [data-action="toggle-drawer"], #hamburgerBtn');
      if (hamburgerBtn) {
        e.preventDefault();
        e.stopPropagation();
        window.toggleNavDrawer();
        return;
      }

      // 2. Backdrop or Close Button click
      if (e.target.closest('#navDrawerBackdrop, .drawer-close-btn, [data-action="close-drawer"]')) {
        e.preventDefault();
        e.stopPropagation();
        window.closeNavDrawer();
        return;
      }
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        window.closeNavDrawer();
      }
    });
  }

  window.toggleDrawerAccordion = function(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const btn = panel.previousElementSibling;
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      if (btn) btn.classList.remove('expanded');
    } else {
      panel.classList.add('open');
      if (btn) btn.classList.add('expanded');
    }
  };

  window.openReportPreOrder = function(reportName, price) {
    window.closeNavDrawer();
    if (typeof window.openReportPreOrderModal === 'function') {
      window.openReportPreOrderModal(reportName, price);
    } else {
      window.location.href = `index.html?preorder=${encodeURIComponent(reportName)}&price=${price}#upcoming-reports`;
    }
  };

  window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      try { document.body.style.overflow = 'hidden'; } catch(e) {}
    }
  };

  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('open');
      try { document.body.style.overflow = ''; } catch(e) {}
    }
  };

  function injectNavDrawer() {
    if (window.location.pathname.includes('admin.html')) return;
    if (document.getElementById('navDrawer')) return;

    const drawerHtml = `
      <div class="nav-drawer-backdrop" id="navDrawerBackdrop" onclick="closeNavDrawer()"></div>
      <div class="nav-drawer" id="navDrawer" aria-label="Navigation Drawer">
        <div class="drawer-header">
          <div class="nav-brand-group">
            <span class="brand-title">PATRIKA</span>
            <span class="brand-sub" data-i18n="brand_sub">by Shri Ram Ji Astro</span>
          </div>
          <button type="button" class="drawer-close-btn" onclick="closeNavDrawer()" aria-label="Close Navigation Drawer">✕</button>
        </div>

        <div class="drawer-body">
          <!-- MUHURT ACCORDION -->
          <div class="drawer-accordion-group">
            <button type="button" class="drawer-accordion-btn" onclick="toggleDrawerAccordion('drawerMuhurtItems')" id="btnDrawerMuhurt">
              <span class="drawer-acc-title"><span>🪔</span> <span data-i18n="menu_muhurt">मुहूर्त (Muhurts)</span></span>
              <span class="drawer-acc-arrow">▾</span>
            </button>
            <div class="drawer-accordion-panel" id="drawerMuhurtItems">
              <a href="vmm.html" onclick="closeNavDrawer()" class="drawer-sub-item">
                <span class="drawer-sub-icon">💍</span>
                <div class="drawer-sub-text">
                  <span class="drawer-sub-title" data-i18n="sub_vivah_title">विवाह मुहूर्त व मिलान</span>
                  <span class="drawer-sub-hint" data-i18n="sub_vivah_desc">10 महादोष व त्रिबल शुद्धि</span>
                </div>
              </a>
              <a href="vastu-muhurta.html" onclick="closeNavDrawer()" class="drawer-sub-item">
                <span class="drawer-sub-icon">🏛️</span>
                <div class="drawer-sub-text">
                  <span class="drawer-sub-title" data-i18n="sub_vastu_title">वास्तु व गृह प्रवेश</span>
                  <span class="drawer-sub-hint" data-i18n="sub_vastu_desc">नींव पूजन व दिशा शुद्धि</span>
                </div>
              </a>
              <a href="yajnopavita.html" onclick="closeNavDrawer()" class="drawer-sub-item">
                <span class="drawer-sub-icon">🪔</span>
                <div class="drawer-sub-text">
                  <span class="drawer-sub-title" data-i18n="sub_yajno_title">यज्ञोपवीत (उपनयन) मुहूर्त</span>
                  <span class="drawer-sub-hint" data-i18n="sub_yajno_desc">16 नक्षत्र व चंद्र शुद्धि</span>
                </div>
              </a>
              <a href="mmm.html" onclick="closeNavDrawer()" class="drawer-sub-item">
                <span class="drawer-sub-icon">✂️</span>
                <div class="drawer-sub-text">
                  <span class="drawer-sub-title" data-i18n="sub_mundan_title">चूड़ाकर्म (मुंडन) मुहूर्त</span>
                  <span class="drawer-sub-hint" data-i18n="sub_mundan_desc">शुभ सौर मास, वार व नक्षत्र शुद्धि</span>
                </div>
              </a>
            </div>
          </div>

          <!-- REPORTS ACCORDION -->
          <div class="drawer-accordion-group">
            <button type="button" class="drawer-accordion-btn" onclick="toggleDrawerAccordion('drawerReportItems')" id="btnDrawerReports">
              <span class="drawer-acc-title"><span>📊</span> <span data-i18n="menu_reports">रिपोर्ट्स (Reports)</span></span>
              <span class="drawer-acc-arrow">▾</span>
            </button>
            <div class="drawer-accordion-panel" id="drawerReportItems">
              <a href="patrika.html" onclick="closeNavDrawer()" class="drawer-sub-item">
                <span class="drawer-sub-icon">📜</span>
                <div class="drawer-sub-text">
                  <span class="drawer-sub-title" data-i18n="sub_patrika_title">पत्रिका (Birth Chart)</span>
                  <span class="drawer-sub-hint" data-i18n="sub_patrika_desc">D1-D60, विंशोत्तरी व योग</span>
                </div>
              </a>
              <a href="javascript:void(0)" onclick="openReportPreOrder('कालसर्प दोष रिपोर्ट', '199')" class="drawer-sub-item">
                <span class="drawer-sub-icon">🐍</span>
                <div class="drawer-sub-text">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="drawer-sub-title" data-i18n="sub_kaalsarp_title">कालसर्प दोष रिपोर्ट</span>
                    <span class="drop-badge">₹199</span>
                  </div>
                  <span class="drawer-sub-hint" data-i18n="sub_kaalsarp_desc">12 कालसर्प व अचूक उपाय</span>
                </div>
              </a>
              <a href="javascript:void(0)" onclick="openReportPreOrder('मंगल दोष निवारण रिपोर्ट', '199')" class="drawer-sub-item">
                <span class="drawer-sub-icon">🔥</span>
                <div class="drawer-sub-text">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="drawer-sub-title" data-i18n="sub_mangal_title">मंगल दोष निवारण</span>
                    <span class="drop-badge">₹199</span>
                  </div>
                  <span class="drawer-sub-hint" data-i18n="sub_mangal_desc">28 शास्त्रीय परिहार नियम</span>
                </div>
              </a>
              <a href="javascript:void(0)" onclick="openReportPreOrder('रत्न और उपाय रिपोर्ट', '249')" class="drawer-sub-item">
                <span class="drawer-sub-icon">💎</span>
                <div class="drawer-sub-text">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="drawer-sub-title" data-i18n="sub_ratna_title">रत्न और उपाय रिपोर्ट</span>
                    <span class="drop-badge">₹249</span>
                  </div>
                  <span class="drawer-sub-hint" data-i18n="sub_ratna_desc">लग्नेश-भाग्येश शोधन व रुद्राक्ष</span>
                </div>
              </a>
            </div>
          </div>

          <!-- DIRECT LINKS -->
          <a href="consultation.html" onclick="closeNavDrawer()" class="drawer-item" style="color:var(--gold-dark); font-weight:800;">
            <span>🔮</span> <span data-i18n="nav_consult">1-on-1 Sanctuary Consultation</span>
          </a>
          <a href="course.html" onclick="closeNavDrawer()" class="drawer-item">
            <span>🎓</span> <span data-i18n="nav_course">1-Year Vedic Astrology Academy</span>
          </a>
          <a href="about.html" onclick="closeNavDrawer()" class="drawer-item">
            <span>📖</span> <span data-i18n="nav_about">अबाउट अस व ज्योतिष ब्लॉग</span>
          </a>
          <a href="admin.html" onclick="closeNavDrawer()" class="drawer-item">
            <span>🔐</span> <span data-i18n="nav_admin">एडमिन डैशबोर्ड</span>
          </a>
        </div>

        <div class="drawer-footer">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px;">
            <button type="button" class="lang-pill-btn" onclick="toggleLanguage()" style="flex:1; justify-content:center;">
              <span class="lang-hi active">हिन्दी</span>
              <span class="lang-sep">/</span>
              <span class="lang-en">EN</span>
            </button>
            <div class="theme-toggle-container" onclick="toggleTheme()" title="Switch Day/Night Mode">
              <span class="theme-label label-day">DAY</span>
              <span class="theme-slider"></span>
              <span class="theme-label label-night">NIGHT</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const placeholder = document.createElement('div');
    placeholder.innerHTML = drawerHtml.trim();
    while (placeholder.firstChild) {
      document.body.appendChild(placeholder.firstChild);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. NAVBAR BRANDING & LANGUAGE PILL AUTO-UPGRADE HELPER
  // ══════════════════════════════════════════════════════════════════════════
  function upgradeNavBrandAndLang() {
    if (window.location.pathname.includes('admin.html')) return;

    // 1. Upgrade .nav-logo if it lacks .nav-brand-group
    document.querySelectorAll('.nav-logo').forEach(logo => {
      if (!logo.querySelector('.nav-brand-group')) {
        const img = logo.querySelector('img');
        const imgSrc = img ? img.getAttribute('src') : 'logo.png';
        logo.innerHTML = `
          <img src="${imgSrc}" alt="Patrika Logo" class="nav-logo-img">
          <div class="nav-brand-group">
            <span class="brand-title">PATRIKA</span>
            <span class="brand-sub" data-i18n="brand_sub">by Shri Ram Ji Astro</span>
          </div>
        `;
      }
    });

    // 2. Ensure every top navigation bar has a visible, functional hamburger button
    document.querySelectorAll('nav:not(.mobile-bottom-nav)').forEach(nav => {
      if (!nav.querySelector('.hamburger')) {
        const target = nav.querySelector('.nav-btns') || nav.querySelector('.nav-actions') || nav;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hamburger';
        btn.setAttribute('aria-label', 'Menu');
        btn.setAttribute('title', 'Navigation Menu');
        btn.textContent = '☰';
        btn.onclick = window.toggleNavDrawer;
        target.appendChild(btn);
      }
    });

    // Wire up all hamburger buttons to toggleNavDrawer
    document.querySelectorAll('.hamburger').forEach(btn => {
      btn.onclick = window.toggleNavDrawer;
    });

    // 3. Ensure Language toggle pill is present in top navigation
    document.querySelectorAll('nav:not(.mobile-bottom-nav)').forEach(nav => {
      if (!nav.querySelector('.lang-pill-btn')) {
        const themeToggle = nav.querySelector('.theme-toggle-container, #themeToggleBtn');
        const targetContainer = themeToggle ? themeToggle.parentNode : (nav.querySelector('.nav-btns') || nav);
        if (targetContainer) {
          const langBtn = document.createElement('button');
          langBtn.type = 'button';
          langBtn.className = 'lang-pill-btn';
          langBtn.id = 'globalLangBtn';
          langBtn.title = 'Switch Language / भाषा बदलें';
          langBtn.onclick = window.toggleLanguage;
          const currentLang = getCurrentLanguage();
          langBtn.innerHTML = `
            <span class="lang-hi ${currentLang==='hi'?'active':''}">हिन्दी</span>
            <span class="lang-sep">/</span>
            <span class="lang-en ${currentLang==='en'?'active':''}">EN</span>
          `;
          if (themeToggle && themeToggle.parentNode) {
            themeToggle.parentNode.insertBefore(langBtn, themeToggle);
          } else {
            targetContainer.appendChild(langBtn);
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7. DESKTOP NAV DROPDOWNS AUTO-UPGRADE HELPER
  // ══════════════════════════════════════════════════════════════════════════
  function upgradeNavLinks() {
    if (window.location.pathname.includes('admin.html')) return;
    document.querySelectorAll('.nav-links').forEach(container => {
      if (!container.querySelector('.nav-dropdown')) {
        container.innerHTML = `
          <!-- MUHURT DROPDOWN -->
          <div class="nav-dropdown" id="navDropdownMuhurt">
            <button type="button" class="nav-dropdown-btn" aria-haspopup="true" aria-expanded="false">
              <span>🪔</span> <span data-i18n="menu_muhurt">मुहूर्त</span> <span style="font-size:10px;">▾</span>
            </button>
            <div class="nav-dropdown-menu" role="menu">
              <a href="vmm.html" class="nav-dropdown-item" role="menuitem">
                <span>💍 <span data-i18n="sub_vivah_title">विवाह मुहूर्त व मिलान</span></span>
              </a>
              <a href="vastu-muhurta.html" class="nav-dropdown-item" role="menuitem">
                <span>🏡 <span data-i18n="sub_vastu_title">वास्तु, नींव व गृह प्रवेश</span></span>
              </a>
              <a href="yajnopavita.html" class="nav-dropdown-item" role="menuitem">
                <span>🧵 <span data-i18n="sub_yajno_title">यज्ञोपवीत (उपनयन)</span></span>
              </a>
              <a href="mmm.html" class="nav-dropdown-item" role="menuitem">
                <span>✂️ <span data-i18n="sub_mundan_title">चूड़ाकर्म (मुंडन)</span></span>
              </a>
            </div>
          </div>

          <!-- REPORTS DROPDOWN -->
          <div class="nav-dropdown" id="navDropdownReports">
            <button type="button" class="nav-dropdown-btn" aria-haspopup="true" aria-expanded="false">
              <span>📜</span> <span data-i18n="menu_reports">रिपोर्ट्स</span> <span style="font-size:10px;">▾</span>
            </button>
            <div class="nav-dropdown-menu" role="menu">
              <a href="patrika.html" class="nav-dropdown-item" role="menuitem" style="color:var(--gold-dark); font-weight:700;">
                <span>✨ <span data-i18n="sub_patrika_title">पत्रिका (Birth Chart)</span></span>
              </a>
              <a href="javascript:void(0)" onclick="openReportPreOrder('कालसर्प दोष रिपोर्ट', '199')" class="nav-dropdown-item" role="menuitem">
                <span>🐍 <span data-i18n="sub_kaalsarp_title">कालसर्प दोष रिपोर्ट</span></span>
                <span class="drop-badge">₹199</span>
              </a>
              <a href="javascript:void(0)" onclick="openReportPreOrder('मंगल दोष निवारण रिपोर्ट', '199')" class="nav-dropdown-item" role="menuitem">
                <span>🔥 <span data-i18n="sub_mangal_title">मंगल दोष निवारण</span></span>
                <span class="drop-badge">₹199</span>
              </a>
              <a href="javascript:void(0)" onclick="openReportPreOrder('रत्न और उपाय रिपोर्ट', '249')" class="nav-dropdown-item" role="menuitem">
                <span>💎 <span data-i18n="sub_ratna_title">रत्न और उपाय रिपोर्ट</span></span>
                <span class="drop-badge">₹249</span>
              </a>
            </div>
          </div>

          <!-- DIRECT LINKS -->
          <a href="consultation.html" data-i18n="nav_consult" style="color:var(--gold-dark); font-weight:800;">परामर्श (Sanctuary)</a>
          <a href="course.html" data-i18n="nav_course">कोर्स (Academy)</a>
          <a href="about.html" data-i18n="nav_about">अबाउट व ब्लॉग</a>
          <a href="admin.html" data-i18n="nav_admin">एडमिन</a>
        `;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION ON DOM READY
  // ══════════════════════════════════════════════════════════════════════════
  function initAll() {
    injectBottomNavStyles();
    upgradeNavBrandAndLang();
    upgradeNavLinks();
    injectNavDrawer();
    injectBottomNav();
    injectGlobalFooter();
    applyLanguage(getCurrentLanguage());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
