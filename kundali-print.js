/* Kundali print / PDF report for patrika.html.
 * The user ticks what the report should hold (charts, Sudarshan chakra, shodashvarga,
 * dashas, panchang, tables); the report is built from the page's own calculation
 * (currentCalculation, dashaTreeData, charaDashaData, yoginiDashaData) and turned into
 * an A4 PDF in parts, so long reports stay inside phone canvas limits. */
(function () {
  'use strict';

  const hi = () => (document.documentElement.getAttribute('lang') || 'hi').toLowerCase() !== 'en';
  const L = (h, e) => (hi() ? h : e);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- names ----------
  const SIGN_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const SIGN_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const SIGN_SHORT_HI = ['मेष', 'वृष', 'मिथु', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चि', 'धनु', 'मकर', 'कुंभ', 'मीन'];
  const SIGN_SHORT_EN = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
  const NAK_HI = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वाफाल्गुनी', 'उत्तराफाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वाभाद्रपद', 'उत्तराभाद्रपद', 'रेवती'];
  const NAK_EN = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const PL = {
    Lagna: ['लग्न', 'Lagna', 'ल', 'As'], Sun: ['सूर्य', 'Sun', 'सू', 'Su'], Moon: ['चन्द्र', 'Moon', 'चं', 'Mo'],
    Mars: ['मंगल', 'Mars', 'मं', 'Ma'], Mercury: ['बुध', 'Mercury', 'बु', 'Me'], Jupiter: ['गुरु', 'Jupiter', 'गु', 'Ju'],
    Venus: ['शुक्र', 'Venus', 'शु', 'Ve'], Saturn: ['शनि', 'Saturn', 'श', 'Sa'], Rahu: ['राहु', 'Rahu', 'रा', 'Ra'], Ketu: ['केतु', 'Ketu', 'के', 'Ke']
  };
  const plName = id => (PL[id] ? PL[id][hi() ? 0 : 1] : id);
  const plShort = id => (PL[id] ? PL[id][hi() ? 2 : 3] : id);
  // inside chart boxes: Hindi names are short; English uses the usual two-letter forms
  const chName = id => (hi() ? plName(id) : (id === 'Lagna' ? 'Asc' : plShort(id)));
  const signName = s => (hi() ? SIGN_HI : SIGN_EN)[((s % 12) + 12) % 12];
  const signShort = s => (hi() ? SIGN_SHORT_HI : SIGN_SHORT_EN)[((s % 12) + 12) % 12];
  const nakName = i => (hi() ? NAK_HI : NAK_EN)[i % 27];
  const NAK_LORD_IDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const SIGN_LORD_IDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  const VARGAS = [
    [1, 'राशि', 'Rashi'], [2, 'होरा', 'Hora'], [3, 'द्रेष्काण', 'Drekkana'], [4, 'चतुर्थांश', 'Chaturthamsha'],
    [7, 'सप्तांश', 'Saptamsha'], [9, 'नवमांश', 'Navamsha'], [10, 'दशमांश', 'Dashamsha'], [12, 'द्वादशांश', 'Dwadashamsha'],
    [16, 'षोडशांश', 'Shodashamsha'], [20, 'विंशांश', 'Vimshamsha'], [24, 'सिद्धांश (चतुर्विंशांश)', 'Siddhamsha'], [27, 'भांश (सप्तविंशांश)', 'Bhamsha'],
    [30, 'त्रिंशांश', 'Trimshamsha'], [40, 'खवेदांश', 'Khavedamsha'], [45, 'अक्षवेदांश', 'Akshavedamsha'], [60, 'षष्ट्यंश', 'Shashtyamsha']
  ];
  const VARGA_USE = {
    1: ['शरीर, सम्पूर्ण जीवन', 'body, whole life'], 2: ['धन', 'wealth'], 3: ['भाई-बहन, पराक्रम', 'siblings, courage'],
    4: ['भाग्य, भवन-सम्पत्ति', 'fortune, property'], 7: ['सन्तान', 'children'], 9: ['जीवनसाथी, धर्म', 'spouse, dharma'],
    10: ['कर्म, आजीविका', 'career'], 12: ['माता-पिता', 'parents'], 16: ['वाहन, सुख', 'vehicles, comforts'],
    20: ['उपासना', 'spiritual practice'], 24: ['विद्या', 'learning'], 27: ['बल-निर्बलता', 'strength'],
    30: ['अरिष्ट', 'misfortune'], 40: ['मातृ-पक्ष शुभाशुभ', 'maternal legacy'], 45: ['पितृ-पक्ष शुभाशुभ', 'paternal legacy'], 60: ['सर्वफल', 'overall results']
  };
  const vargaTitle = v => { const r = VARGAS.find(x => x[0] === v); return 'D' + v + ' ' + (r ? r[hi() ? 1 : 2] : ''); };

  // ---------- options ----------
  const OPTIONS = [
    { group: ['मूल विवरण', 'Basics'], items: [
      ['birth', 'जन्म विवरण व सारांश', 'Birth details & summary', true],
      ['planets', 'ग्रह स्पष्ट व नक्षत्र तालिका', 'Planet positions & nakshatras', true]
    ] },
    { group: ['मुख्य कुण्डलियाँ', 'Main charts'], items: [
      ['d1', 'लग्न कुण्डली (D1)', 'Lagna chart (D1)', true],
      ['chalit', 'भाव चलित कुण्डली', 'Bhava Chalit chart', true],
      ['d9', 'नवमांश कुण्डली (D9)', 'Navamsha chart (D9)', true],
      ['d10', 'दशमांश कुण्डली (D10)', 'Dashamsha chart (D10)', true],
      ['d7', 'सप्तांश कुण्डली (D7)', 'Saptamsha chart (D7)', true],
      ['sudarshan', 'सुदर्शन चक्र (लग्न, चन्द्र व सूर्य कुण्डली संयुक्त)', 'Sudarshan Chakra (Lagna, Moon & Sun combined)', true],
      ['moonchart', 'चन्द्र कुण्डली (अलग से)', 'Moon chart (separate)', false],
      ['sunchart', 'सूर्य कुण्डली (अलग से)', 'Sun chart (separate)', false],
      ['gochar', 'वर्तमान गोचर कुण्डली', 'Current transit chart', false]
    ] },
    { group: ['षोडशवर्ग', 'Shodashavarga (16 divisional charts)'], items: [
      ['vargatable', 'षोडशवर्ग तालिका (हर ग्रह की 16 वर्गों में राशि)', 'Shodashavarga table (each planet in all 16 vargas)', true]
    ].concat([2, 3, 4, 12, 16, 20, 24, 27, 30, 40, 45, 60].map(v => {
      const r = VARGAS.find(x => x[0] === v);
      return ['v' + v, 'D' + v + ' ' + r[1] + ' कुण्डली', 'D' + v + ' ' + r[2] + ' chart', false];
    })), vargas: true },
    { group: ['दशाएँ', 'Dashas'], items: [
      ['vimshottari', 'विंशोत्तरी महादशा व अन्तर्दशा (तिथि व अवधि सहित)', 'Vimshottari Mahadasha & Antardasha (dates & durations)', true],
      ['pratyantar', 'प्रत्यन्तर दशा (सभी अन्तर्दशाओं की)', 'Pratyantar dasha (for every antardasha)', false],
      ['yogini', 'योगिनी दशा', 'Yogini dasha', true],
      ['chara', 'जैमिनी चर दशा', 'Jaimini Chara dasha', true]
    ] },
    { group: ['पञ्चाङ्ग', 'Panchang'], items: [
      ['panchang', 'जन्म कालीन पञ्चाङ्ग (तिथि, वार, नक्षत्र, योग, करण, मुहूर्त, अवकहड़ा)', 'Birth panchang (tithi, vara, nakshatra, yoga, karana, muhurtas, avakahada)', true]
    ] },
    { group: ['अन्य तालिकाएँ', 'More tables'], items: [
      ['bhava', 'श्रीपति भाव स्पष्ट (भाव आरम्भ, मध्य, अन्त)', 'Sripati bhava cusps (start, middle, end)', false],
      ['sandhi', 'भाव संधि व ग्रह विस्थापन विश्लेषण', 'Bhava sandhi & planet shift analysis', false],
      ['upagraha', 'उपग्रह (गुलिक, मान्दि आदि)', 'Upagrahas (Gulika, Mandi etc.)', false],
      ['speciallagna', 'विशेष लग्न (होरा, घटी, प्राणपद, इन्दु, आरूढ़, उपपद आदि)', 'Special lagnas (Hora, Ghati, Pranapada, Indu, Arudha, Upapada etc.)', false],
      ['ashtakavarga', 'अष्टकवर्ग (भिन्नाष्टक व सर्वाष्टक)', 'Ashtakavarga (Bhinna & Sarva)', false]
    ] }
  ];
  const STORE_KEY = 'sra_kundali_print_opts';
  function loadChoices() {
    const def = {}; OPTIONS.forEach(g => g.items.forEach(i => { def[i[0]] = i[3]; }));
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
    if (saved && saved.opts) Object.keys(def).forEach(k => { if (typeof saved.opts[k] === 'boolean') def[k] = saved.opts[k]; });
    return { opts: def, style: (saved && saved.style) || (typeof currentChartStyle !== 'undefined' && currentChartStyle === 'south' ? 'south' : 'north') };
  }
  function saveChoices(c) { try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch (e) {} }

  // ---------- styles ----------
  function injectCss() {
    if (document.getElementById('kpCss')) return;
    const st = document.createElement('style');
    st.id = 'kpCss';
    st.textContent = `
.kp-open #sra-wa-float-container{display:none !important;}
.kp-overlay{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px;}
.kp-card{background:#fffdf8;color:#1f2937;width:min(720px,100%);max-height:92vh;display:flex;flex-direction:column;border-radius:16px;border:1.5px solid #d4a017;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:'Noto Sans Devanagari','Mukta',system-ui,sans-serif;}
.kp-head{padding:16px 18px 10px;border-bottom:1px solid #f1e3c0;}
.kp-head h3{margin:0;color:#7c1305;font-size:1.15rem;letter-spacing:0;}
.kp-head p{margin:4px 0 0;font-size:.85rem;color:#57534e;}
.kp-body{padding:10px 18px;overflow:auto;}
.kp-group{margin:10px 0 14px;}
.kp-group-h{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700;color:#92400e;font-size:.95rem;margin-bottom:6px;}
.kp-group-h button{background:none;border:1px solid #e7c873;color:#92400e;border-radius:999px;padding:2px 10px;font-size:.75rem;cursor:pointer;}
.kp-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:4px 12px;}
.kp-items.kp-vargas{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));}
.kp-item{display:flex;align-items:flex-start;gap:8px;font-size:.88rem;line-height:1.35;padding:5px 6px;border-radius:8px;cursor:pointer;}
.kp-item:hover{background:#fef3c7;}
.kp-item input{margin-top:2px;width:17px;height:17px;accent-color:#7c1305;flex:none;}
.kp-style{display:flex;gap:16px;flex-wrap:wrap;font-size:.88rem;margin-top:4px;}
.kp-style label{display:flex;gap:6px;align-items:center;cursor:pointer;}
.kp-foot{padding:12px 18px;border-top:1px solid #f1e3c0;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;}
.kp-foot button{border-radius:10px;padding:10px 18px;font-weight:700;font-size:.95rem;cursor:pointer;border:1.5px solid #7c1305;}
.kp-foot .kp-go{background:linear-gradient(135deg,#7c1305,#b45309);color:#fff;border-color:#7c1305;}
.kp-foot .kp-cancel{background:#fff;color:#7c1305;}
.kp-foot button:disabled{opacity:.6;cursor:wait;}
.kp-progress{font-size:.85rem;color:#92400e;align-self:center;margin-right:auto;}
@media (max-width:520px){.kp-items,.kp-items.kp-vargas{grid-template-columns:1fr 1fr;}.kp-item{font-size:.8rem;}.kp-foot button{flex:1;}}
@media (max-width:360px){.kp-items,.kp-items.kp-vargas{grid-template-columns:1fr;}}
.kp-sheet{position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px;}
.kp-sheet-card{background:#fff;border-radius:16px;padding:18px;width:min(440px,100%);font-family:'Noto Sans Devanagari',system-ui,sans-serif;}
.kp-sheet-card h4{margin:0 0 6px;color:#7c1305;letter-spacing:0;}
.kp-sheet-card p{margin:0 0 12px;font-size:.9rem;color:#57534e;}
.kp-sheet-card .row{display:flex;flex-direction:column;gap:8px;}
.kp-sheet-card .row>*{display:block;text-align:center;border-radius:10px;padding:11px;font-weight:700;font-size:.95rem;text-decoration:none;border:1.5px solid #7c1305;cursor:pointer;}
.kp-sheet-card .primary{background:#7c1305;color:#fff;}
.kp-sheet-card .ghost{background:#fff;color:#7c1305;}
.kp-sheet-card .close{background:#f5f5f4;color:#44403c;border-color:#d6d3d1;}

/* the report itself (A4 inner width ≈ 733 CSS px) */
.kp-doc{width:714px;max-width:714px;overflow:hidden;background:#fff;color:#1c1917;font-size:12px;line-height:1.4;-webkit-text-size-adjust:100%;text-size-adjust:100%;}
.kp-doc table{max-width:100%;}
.kp-dblock td{white-space:nowrap;}
.kp-doc img{max-width:100%;}
.kp-doc *{box-sizing:border-box;}
.kp-runhead{display:flex;justify-content:space-between;border-bottom:1.5px solid #b45309;padding:0 0 4px;margin-bottom:10px;font-size:10.5px;color:#7c1305;font-weight:700;}
.kp-h2{font-size:16px;color:#7c1305;margin:14px 0 8px;padding:4px 10px;background:#fdf6e3;border-left:4px solid #b45309;font-weight:700;}
.kp-h2:first-child{margin-top:0;}
.kp-note{font-size:10.5px;color:#57534e;margin:4px 0 8px;}
.kp-cover{text-align:center;padding:26px 20px 18px;border:2px solid #b45309;border-radius:10px;margin-bottom:14px;background:#fffbeb;}
.kp-cover .t1{font-size:26px;font-weight:800;color:#7c1305;}
.kp-cover .t2{font-size:20px;font-weight:700;margin-top:8px;}
.kp-cover .t3{font-size:12px;color:#57534e;margin-top:4px;}
.kp-kv{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e7d3a1;border-radius:8px;overflow:hidden;}
.kp-kv div{padding:6px 10px;border-bottom:1px solid #f1e3c0;display:flex;justify-content:space-between;gap:8px;}
.kp-kv div:nth-child(odd){border-right:1px solid #f1e3c0;}
.kp-kv b{color:#7c1305;}
.kp-tbl{width:100%;border-collapse:collapse;font-size:11px;}
.kp-tbl th{background:#7c1305;color:#fff;padding:5px 4px;font-weight:700;text-align:left;}
.kp-tbl td{padding:4px;border-bottom:1px solid #eee3c6;vertical-align:top;}
.kp-tbl tr:nth-child(even) td{background:#fffaf0;}
.kp-tbl tr.kp-now td{background:#fde68a !important;font-weight:700;}
.kp-tbl.kp-center td,.kp-tbl.kp-center th{text-align:center;}
.kp-chart{border:1px solid #e7d3a1;border-radius:8px;padding:6px 6px 4px;text-align:center;}
.kp-chart h4{margin:0 0 4px;font-size:12.5px;color:#7c1305;font-weight:700;}
.kp-chart .sub{font-size:10px;color:#78716c;margin:0 0 4px;}
.kp-chart img{width:320px;height:320px;display:block;margin:0 auto;}
.kp-sud{border:1px solid #e7d3a1;border-radius:8px;padding:8px;text-align:center;}
.kp-sud img{width:540px;height:540px;display:block;margin:0 auto;}
.kp-dblock{border:1px solid #e7d3a1;border-radius:8px;overflow:hidden;}
.kp-dblock .bh{background:#7c1305;color:#fff;padding:5px 8px;font-weight:700;font-size:11.5px;display:flex;justify-content:space-between;gap:6px;}
.kp-dblock.kp-now .bh{background:#b45309;}
.kp-dblock table{width:100%;border-collapse:collapse;font-size:10px;}
.kp-dblock td{padding:3px 6px;border-bottom:1px solid #f1e3c0;}
.kp-dblock tr.kp-now td{background:#fde68a;font-weight:700;}
.kp-pan .panchang-grid-5,.kp-pan .muhurta-grid{display:grid !important;grid-template-columns:repeat(3,1fr) !important;gap:8px !important;}
.kp-pan *{color:#1c1917 !important;box-shadow:none !important;animation:none !important;}
.kp-pan [class*="card"],.kp-pan [class*="item"],.kp-pan [class*="box"]{background:#fffaf0 !important;border:1px solid #eee3c6 !important;}
.kp-mega{border-color:#9a1b0a !important;background:#fff5f2 !important;color:#7c1305 !important;}
.kp-support{margin-top:14px;padding:9px 12px;border:1px dashed #c9a84c;border-radius:8px;background:#fffaf0;font-size:11.5px;color:#5b4a2e;text-align:center;}
.kp-pan h4{color:#7c1305 !important;margin:9px 0 5px !important;}
.kp-pan [class*="card"],.kp-pan [class*="item"],.kp-pan [class*="box"]{padding:6px 9px !important;margin:0 !important;min-height:0 !important;}
.kp-pan [class*="grid"]{gap:6px !important;margin:0 !important;}
.kp-pan .muhurta-item{display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important;}
.kp-pan .muhurta-item-name,.kp-pan .muhurta-item-time{border:0 !important;padding:0 !important;background:none !important;font-size:12px !important;line-height:1.3 !important;}
.kp-pan .muhurta-item-time{text-align:right !important;}
.kp-pan td strong,.kp-pan td b{font-size:11.5px !important;}
.kp-pan table{width:100%;border-collapse:collapse;}
.kp-pan td,.kp-pan th{border:1px solid #eee3c6 !important;padding:4px 6px !important;font-size:11px !important;background:#fff !important;}
.kp-avoid{page-break-inside:avoid;break-inside:avoid;}
.kp-row{display:flex;gap:10px;margin-bottom:10px;align-items:stretch;}
.kp-row>*{flex:1 1 0;min-width:0;}
.kp-row.three{gap:8px;}
.kp-row.three .kp-dblock table{font-size:9.5px;}
.kp-row.three .kp-dblock td{padding:2px 4px;}
`;
    document.head.appendChild(st);
  }

  // ---------- chart drawing (literal colours: SVG is rasterised without page CSS) ----------
  const C = { bg: '#fffbeb', line: '#92400e', sign: '#b45309', text: '#1c1917', retro: '#b91c1c', lagna: '#7c1305' };
  // house text centres (rx, ry) and sign-number spots (sx, sy) of the North Indian chart;
  // the side kendras (4, 10) hold their planets away from the sign number
  const NORTH = {
    1: { rx: 200, ry: 118, sx: 200, sy: 178 }, 2: { rx: 105, ry: 42, sx: 115, sy: 85 },
    3: { rx: 40, ry: 110, sx: 85, sy: 115 }, 4: { rx: 108, ry: 200, sx: 178, sy: 200 },
    5: { rx: 40, ry: 290, sx: 85, sy: 285 }, 6: { rx: 105, ry: 358, sx: 115, sy: 315 },
    7: { rx: 200, ry: 282, sx: 200, sy: 222 }, 8: { rx: 295, ry: 358, sx: 285, sy: 315 },
    9: { rx: 360, ry: 290, sx: 315, sy: 285 }, 10: { rx: 292, ry: 200, sx: 222, sy: 200 },
    11: { rx: 360, ry: 110, sx: 315, sy: 115 }, 12: { rx: 295, ry: 42, sx: 285, sy: 85 }
  };
  const SOUTH_BOX = [
    { s: 11, x: 5, y: 5 }, { s: 0, x: 102.5, y: 5 }, { s: 1, x: 200, y: 5 }, { s: 2, x: 297.5, y: 5 },
    { s: 10, x: 5, y: 102.5 }, { s: 3, x: 297.5, y: 102.5 },
    { s: 9, x: 5, y: 200 }, { s: 4, x: 297.5, y: 200 },
    { s: 8, x: 5, y: 297.5 }, { s: 7, x: 102.5, y: 297.5 }, { s: 6, x: 200, y: 297.5 }, { s: 5, x: 297.5, y: 297.5 }
  ];

  // bodies: [{id, sign, retro, deg}] ; ascSign: sign in house 1
  function northSvg(ascSign, bodies, opts) {
    opts = opts || {};
    const N = NORTH;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" font-family="Noto Sans Devanagari, Kohinoor Devanagari, Devanagari Sangam MN, Mukta, sans-serif"><rect x="5" y="5" width="390" height="390" fill="${C.bg}" stroke="${C.line}" stroke-width="2"/>`
      + `<line x1="5" y1="5" x2="395" y2="395" stroke="${C.line}" stroke-width="1.4"/><line x1="395" y1="5" x2="5" y2="395" stroke="${C.line}" stroke-width="1.4"/>`
      + `<polygon points="200,5 395,200 200,395 5,200" fill="none" stroke="${C.line}" stroke-width="1.4"/>`;
    for (let h = 1; h <= 12; h++) {
      const sign = (ascSign + h - 1) % 12;
      const pt = N[h];
      s += `<text x="${pt.sx}" y="${pt.sy}" fill="${C.sign}" font-size="14" font-weight="700" text-anchor="middle" dominant-baseline="middle">${sign + 1}</text>`;
      const occ = [];
      if (h === 1 && !opts.noLagna) occ.push({ t: chName('Lagna'), c: C.lagna });
      bodies.filter(b => (opts.houseOf ? opts.houseOf(b) === h : b.sign === sign)).forEach(b => occ.push({ t: chName(b.id) + (b.retro ? '(' + L('व', 'R') + ')' : '') + (opts.degrees ? ' ' + Math.floor(b.deg) + '°' : ''), c: b.retro ? C.retro : C.text }));
      s += northText(pt, h, occ);
    }
    return s + '</svg>';
  }
  function northText(pt, h, occ) {
    if (!occ.length) return '';
    const maxPer = [1, 4, 7, 10].includes(h) ? 2 : ([3, 5, 9, 11].includes(h) ? 1 : 2);
    const lines = [];
    for (let i = 0; i < occ.length; i += maxPer) lines.push(occ.slice(i, i + maxPer));
    const fs = lines.length > 3 ? 12 : 14;
    const lh = fs * 1.2, y0 = pt.ry - (lines.length - 1) * lh / 2;
    return lines.map((ln, i) => `<text x="${pt.rx}" y="${(y0 + i * lh).toFixed(1)}" font-size="${fs}" font-weight="700" text-anchor="middle" dominant-baseline="middle">`
      + ln.map((o, j) => `<tspan fill="${o.c}">${esc(o.t)}${j < ln.length - 1 ? ' ' : ''}</tspan>`).join('') + '</text>').join('');
  }
  function southSvg(ascSign, bodies, opts) {
    opts = opts || {};
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" font-family="Noto Sans Devanagari, Kohinoor Devanagari, Devanagari Sangam MN, Mukta, sans-serif"><rect x="5" y="5" width="390" height="390" fill="${C.bg}" stroke="${C.line}" stroke-width="2"/>`;
    [102.5, 200, 297.5].forEach(v => { s += `<line x1="${v}" y1="5" x2="${v}" y2="395" stroke="${C.line}" stroke-width="1.4"/><line x1="5" y1="${v}" x2="395" y2="${v}" stroke="${C.line}" stroke-width="1.4"/>`; });
    s += `<rect x="103.5" y="103.5" width="193" height="193" fill="#ffffff"/>`;
    if (opts.centerText) s += `<text x="200" y="200" fill="${C.lagna}" font-size="15" font-weight="700" text-anchor="middle" dominant-baseline="middle">${esc(opts.centerText)}</text>`;
    SOUTH_BOX.forEach(b => {
      s += `<text x="${b.x + 6}" y="${b.y + 14}" fill="${C.sign}" font-size="12" font-weight="700">${esc(signShort(b.s))}</text>`;
      if (b.s === ascSign) s += `<line x1="${b.x + 2}" y1="${b.y + 20}" x2="${b.x + 22}" y2="${b.y + 2}" stroke="${C.lagna}" stroke-width="1.6"/>`;
      const occ = [];
      if (b.s === ascSign && !opts.noLagna) occ.push({ t: chName('Lagna'), c: C.lagna });
      bodies.filter(x => x.sign === b.s).forEach(x => occ.push({ t: chName(x.id) + (x.retro ? '(' + L('व', 'R') + ')' : '') + (opts.degrees ? ' ' + Math.floor(x.deg) + '°' : ''), c: x.retro ? C.retro : C.text }));
      const lines = [];
      for (let i = 0; i < occ.length; i += 2) lines.push(occ.slice(i, i + 2));
      const fs = lines.length > 2 ? 11.5 : 13;
      const y0 = b.y + 52 - (lines.length - 1) * fs * 0.62;
      lines.forEach((ln, i) => {
        s += `<text x="${b.x + 48.75}" y="${(y0 + i * fs * 1.25).toFixed(1)}" font-size="${fs}" font-weight="700" text-anchor="middle" dominant-baseline="middle">`
          + ln.map((o, j) => `<tspan fill="${o.c}">${esc(o.t)}${j < ln.length - 1 ? ' ' : ''}</tspan>`).join('') + '</text>';
      });
    });
    return s + '</svg>';
  }
  // charts go into the report as images: html2canvas draws inline SVG shifted and clipped
  const svgImg = (svg, size) => `<img alt="" width="${size}" height="${size}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
  function chartCard(title, sub, svg) {
    return `<div class="kp-chart"><h4>${esc(title)}</h4>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}${svgImg(svg, 320)}</div>`;
  }

  // ---------- Sudarshan chakra: inner ring Lagna, middle Moon, outer Sun ----------
  function sudarshanSvg(planets) {
    const cx = 290, cy = 290, R = [62, 140, 212, 284];
    const lag = planets.find(p => p.id === 'Lagna'), moon = planets.find(p => p.id === 'Moon'), sun = planets.find(p => p.id === 'Sun');
    const refs = [lag.sign, moon.sign, sun.sign];
    const ringFill = ['#fff7ed', '#eff6ff', '#fefce8'];
    const ringStroke = ['#7c1305', '#1d4ed8', '#b45309'];
    const bodies = planets.filter(p => p.id !== 'Lagna');
    const pt = (r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="580" viewBox="0 0 580 580" font-family="Noto Sans Devanagari, Kohinoor Devanagari, Devanagari Sangam MN, Mukta, sans-serif">`;
    for (let k = 2; k >= 0; k--) s += `<circle cx="${cx}" cy="${cy}" r="${R[k + 1]}" fill="${ringFill[k]}" stroke="${ringStroke[k]}" stroke-width="1.6"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R[0]}" fill="#ffffff" stroke="#7c1305" stroke-width="1.6"/>`;
    for (let h = 1; h <= 12; h++) {
      const a = -90 - (h - 1) * 30 + 15;
      const [x1, y1] = pt(R[0], a), [x2, y2] = pt(R[3], a);
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#a8a29e" stroke-width="1"/>`;
    }
    for (let h = 1; h <= 12; h++) {
      const a = -90 - (h - 1) * 30;
      // house number just outside the chakra
      const [hx, hy] = pt(R[0] - 14, a);
      s += `<text x="${hx.toFixed(1)}" y="${hy.toFixed(1)}" font-size="12" font-weight="700" fill="#57534e" text-anchor="middle" dominant-baseline="middle">${h}</text>`;
      for (let k = 0; k < 3; k++) {
        const sign = (refs[k] + h - 1) % 12;
        const rIn = R[k + 1 - 0] - (R[k + 1] - R[k]) + 0, rOut = R[k + 1];
        const mid = (R[k] + R[k + 1]) / 2;
        // sign number near the inner edge of the cell
        const [sx, sy] = pt(R[k] + 11, a);
        s += `<text x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" font-size="12" font-weight="700" fill="${ringStroke[k]}" text-anchor="middle" dominant-baseline="middle">${sign + 1}</text>`;
        const occ = bodies.filter(b => b.sign === sign).map(b => ({ t: plShort(b.id) + (b.retro ? '*' : ''), c: b.retro ? C.retro : C.text }));
        if (h === 1 && k === 0) occ.unshift({ t: plShort('Lagna'), c: C.lagna });
        if (!occ.length) continue;
        const per = k === 0 ? 2 : 3;
        const lines = [];
        for (let i = 0; i < occ.length; i += per) lines.push(occ.slice(i, i + per));
        const fs = lines.length > 2 ? 13 : 15;
        const [px, py] = pt(mid + 6, a);
        const y0 = py - (lines.length - 1) * fs * 0.6;
        lines.forEach((ln, i) => {
          s += `<text x="${px.toFixed(1)}" y="${(y0 + i * fs * 1.2).toFixed(1)}" font-size="${fs}" font-weight="700" text-anchor="middle" dominant-baseline="middle">`
            + ln.map((o, j) => `<tspan fill="${o.c}">${esc(o.t)}${j < ln.length - 1 ? ' ' : ''}</tspan>`).join('') + '</text>';
        });
        void rIn; void rOut;
      }
    }
    s += `<text x="${cx}" y="${cy - 8}" font-size="13" font-weight="800" fill="#7c1305" text-anchor="middle">${esc(L('सुदर्शन', 'Sudarshan'))}</text>`
      + `<text x="${cx}" y="${cy + 10}" font-size="13" font-weight="800" fill="#7c1305" text-anchor="middle">${esc(L('चक्र', 'Chakra'))}</text>`;
    return s + '</svg>';
  }

  // ---------- helpers ----------
  // side-by-side boxes in rows; a whole row moves to the next page instead of splitting
  function rows(items, n, extra) {
    let out = '';
    for (let i = 0; i < items.length; i += n) {
      const cells = items.slice(i, i + n);
      while (cells.length < n) cells.push('<div></div>');
      out += `<div class="kp-row kp-avoid${extra ? ' ' + extra : ''}">${cells.join('')}</div>`;
    }
    return out;
  }
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => (d && !isNaN(d.getTime()) ? `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}` : '—');
  function fmtDur(ms) {
    const days = ms / 86400000;
    const yrs = days / 365.25;
    let y = Math.floor(yrs), mFloat = (yrs - y) * 12, m = Math.floor(mFloat), d = Math.round((mFloat - m) * 30.4375);
    if (d >= 30) { m += 1; d = 0; }
    if (m >= 12) { y += 1; m = 0; }
    const parts = [];
    if (y) parts.push(y + L(' वर्ष', 'y'));
    if (m) parts.push(m + L(' माह', 'm'));
    if (d || !parts.length) parts.push(d + L(' दिन', 'd'));
    return parts.join(' ');
  }
  function dms(deg) {
    const d = Math.floor(deg), mF = (deg - d) * 60, m = Math.floor(mF), s = Math.round((mF - m) * 60);
    return `${d}° ${pad(s === 60 ? m + 1 : m)}′ ${pad(s === 60 ? 0 : s)}″`;
  }
  // engine's own shodashavarga first (Swiss Ephemeris server), page formula as fallback
  const vSign = (p, v) => {
    const sv = typeof currentCalculation !== 'undefined' && currentCalculation.shodashavarga;
    const e = sv && sv['D' + v] && sv['D' + v][p.id];
    if (typeof e === 'number') return e;
    return typeof getVargaSign === 'function' ? getVargaSign(p.sign, p.deg, v) : p.sign;
  };

  // ---------- section builders ----------
  function runHead(calc) {
    const b = calc.birthDetails || {};
    return `<div class="kp-runhead"><span>${esc(b.candidateName || L('जातक', 'Native'))} • ${pad(b.day)}-${pad(b.month)}-${b.year} • ${pad(b.hour)}:${pad(b.minute)}</span><span>${L('श्री रामजी एस्ट्रो', 'Shri Ramji Astro')} • shriramjiastro.in</span></div>`;
  }

  function secBirth(calc) {
    const b = calc.birthDetails || {}, P = calc.planets;
    const lag = P.find(p => p.id === 'Lagna'), moon = P.find(p => p.id === 'Moon'), sun = P.find(p => p.id === 'Sun');
    const nakSpan = 40 / 3;
    const mNak = Math.floor(moon.abs / nakSpan) % 27, mPada = Math.floor((moon.abs % nakSpan) / (nakSpan / 4)) + 1;
    const lNak = Math.floor(lag.abs / nakSpan) % 27;
    const tz = (b.tz !== undefined ? b.tz : (document.getElementById('inTz') || {}).value);
    const rows = [
      [L('नाम', 'Name'), b.candidateName || '—'],
      [L('जन्म तिथि', 'Date of birth'), `${pad(b.day)}-${pad(b.month)}-${b.year}`],
      [L('जन्म समय', 'Time of birth'), `${pad(b.hour)}:${pad(b.minute)}:${pad(b.second || 0)}`],
      [L('जन्म स्थान', 'Place of birth'), b.placeName || '—'],
      [L('अक्षांश / देशांतर', 'Latitude / Longitude'), (b.lat != null ? Number(b.lat).toFixed(4) : '—') + '°, ' + (b.lon != null ? Number(b.lon).toFixed(4) : '—') + '°'],
      [L('समय क्षेत्र', 'Time zone'), tz !== undefined && tz !== '' ? 'UTC ' + (Number(tz) >= 0 ? '+' : '') + tz : '—'],
      [L('लग्न', 'Lagna (Ascendant)'), `${signName(lag.sign)} ${dms(lag.deg)}`],
      [L('लग्न नक्षत्र', 'Lagna nakshatra'), nakName(lNak)],
      [L('चन्द्र राशि', 'Moon sign (Rashi)'), signName(moon.sign)],
      [L('जन्म नक्षत्र', 'Birth nakshatra'), `${nakName(mNak)} — ${L('चरण', 'pada')} ${mPada}`],
      [L('सूर्य राशि', 'Sun sign'), signName(sun.sign)],
      [L('लग्नेश', 'Lagna lord'), plName(SIGN_LORD_IDS[lag.sign])]
    ];
    const ay = b.ayanamsa != null ? b.ayanamsa : (calc.astronomy && calc.astronomy.ayanamsa_deg);
    if (ay != null && !isNaN(parseFloat(ay))) rows.push([L('अयनांश (लाहिड़ी)', 'Ayanamsa (Lahiri)'), dms(parseFloat(ay))]);
    if (b.sunriseHrs != null && typeof formatTimeDecimalToAMPM === 'function') rows.push([L('सूर्योदय / सूर्यास्त', 'Sunrise / Sunset'), formatTimeDecimalToAMPM(b.sunriseHrs) + ' / ' + formatTimeDecimalToAMPM(b.sunsetHrs)]);
    if (rows.length % 2) rows.push(['', '']);
    return `<div class="kp-cover kp-avoid"><div class="t1">${L('॥ जन्म पत्रिका ॥', 'Janma Patrika — Birth Chart Report')}</div>`
      + `<div class="t2">${esc(b.candidateName || L('जातक', 'Native'))}</div>`
      + `<div class="t3">${L('स्विस एफेमेरिस आधारित सटीक गणना • पराशरी पद्धति • लाहिड़ी अयनांश', 'Swiss Ephemeris calculation • Parashari system • Lahiri ayanamsa')}</div></div>`
      + `<div class="kp-kv kp-avoid">${rows.map(r => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>`;
  }

  function secPlanets(calc) {
    const nakSpan = 40 / 3;
    const rows = calc.planets.map(p => {
      const nk = Math.floor(p.abs / nakSpan) % 27, pada = Math.floor((p.abs % nakSpan) / (nakSpan / 4)) + 1;
      const state = p.id === 'Lagna' ? '—' : (p.retro ? L('वक्री', 'Retro') : L('मार्गी', 'Direct'));
      const house = p.id === 'Lagna' ? 1 : (p.rasiHouse === p.chalitHouse ? p.rasiHouse : `${p.rasiHouse} → ${L('चलित', 'Chalit')} ${p.chalitHouse}`);
      const speed = p.id === 'Lagna' || p.speed == null ? '—' : (p.speed >= 0 ? '+' : '') + Number(p.speed).toFixed(3) + '°';
      return `<tr><td><b>${esc(plName(p.id))}</b></td><td>${state}</td><td>${esc(signName(p.sign))}</td><td>${dms(p.deg)}</td><td>${esc(nakName(nk))}</td><td>${pada}</td><td>${esc(plName(NAK_LORD_IDS[nk % 9]))}</td><td>${esc(plName(SIGN_LORD_IDS[p.sign]))}</td><td>${house}</td><td>${speed}</td></tr>`;
    }).join('');
    return `<div class="kp-h2">${L('ग्रह स्पष्ट एवं नक्षत्र', 'Planet positions & nakshatras')}</div>
<table class="kp-tbl"><thead><tr><th>${L('ग्रह', 'Planet')}</th><th>${L('गति', 'Motion')}</th><th>${L('राशि', 'Sign')}</th><th>${L('अंश', 'Degree')}</th><th>${L('नक्षत्र', 'Nakshatra')}</th><th>${L('चरण', 'Pada')}</th><th>${L('नक्षत्रेश', 'Nak. lord')}</th><th>${L('राशीश', 'Sign lord')}</th><th>${L('भाव', 'House')}</th><th>${L('दैनिक गति', 'Speed/day')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function vargaBodies(calc, v) {
    return calc.planets.filter(p => p.id !== 'Lagna').map(p => ({ id: p.id, sign: vSign(p, v), retro: p.retro, deg: p.deg }));
  }
  function vargaChart(calc, v, style, title, sub) {
    const lag = calc.planets.find(p => p.id === 'Lagna');
    const asc = vSign(lag, v);
    const bodies = vargaBodies(calc, v);
    const svg = style === 'south' ? southSvg(asc, bodies, { centerText: 'D' + v }) : northSvg(asc, bodies, { degrees: v === 1 });
    return chartCard(title || vargaTitle(v), sub, svg);
  }
  function chalitChart(calc, style) {
    const P = calc.planets, lag = P.find(p => p.id === 'Lagna');
    const bodies = P.filter(p => p.id !== 'Lagna').map(p => ({ id: p.id, sign: p.sign, retro: p.retro, deg: p.deg, house: p.chalitHouse }));
    const bh = calc.sripatiBhavas;
    let svg;
    if (style === 'south') {
      svg = southSvg(lag.sign, bodies.map(b => ({ ...b, sign: (lag.sign + (b.house || 1) - 1) % 12 })), { centerText: L('चलित', 'Chalit') });
    } else {
      const asc = bh && bh[0] && bh[0].midSign != null ? bh[0].midSign : lag.sign;
      svg = northSvg(asc, bodies, { houseOf: b => b.house });
    }
    return chartCard(L('भाव चलित कुण्डली', 'Bhava Chalit chart'), L('श्रीपति पद्धति • ग्रह अपने चलित भाव में', 'Sripati method • planets in their chalit house'), svg);
  }
  function refChart(calc, refId, style, title) {
    const ref = calc.planets.find(p => p.id === refId);
    const bodies = calc.planets.filter(p => p.id !== 'Lagna').map(p => ({ id: p.id, sign: p.sign, retro: p.retro, deg: p.deg }));
    const lag = calc.planets.find(p => p.id === 'Lagna');
    const withLagna = bodies.concat([{ id: 'Lagna', sign: lag.sign, retro: false, deg: lag.deg }]);
    const svg = style === 'south' ? southSvg(ref.sign, withLagna, { noLagna: true, centerText: title }) : northSvg(ref.sign, withLagna, { noLagna: true });
    return chartCard(title, L('प्रथम भाव में ', 'House 1 = ') + plName(refId) + L(' की राशि', "'s sign"), svg);
  }
  function gocharChart(calc, style) {
    const tr = (calc.transits || []).filter(p => p.id !== 'Lagna');
    if (!tr.length) return '';
    const lag = calc.planets.find(p => p.id === 'Lagna');
    const bodies = tr.map(p => ({ id: p.id, sign: p.sign, retro: p.retro, deg: p.deg != null ? p.deg : (p.abs % 30) }));
    const svg = style === 'south' ? southSvg(lag.sign, bodies, { centerText: L('गोचर', 'Transit') }) : northSvg(lag.sign, bodies, {});
    return chartCard(L('वर्तमान गोचर (जन्म लग्न पर)', 'Current transits (on birth lagna)'), L('रिपोर्ट बनने की तिथि: ', 'As on: ') + fmtDate(new Date()), svg);
  }

  function secVargaTable(calc) {
    const P = calc.planets;
    const head = VARGAS.map(v => `<th>D${v[0]}</th>`).join('');
    const rows = P.map(p => {
      const d1 = p.sign, d9 = vSign(p, 9);
      return `<tr><td style="text-align:left"><b>${esc(plName(p.id))}</b>${d1 === d9 && p.id !== 'Lagna' ? ' <span style="color:#15803d">✓</span>' : ''}</td>` + VARGAS.map(v => `<td>${esc(signShort(vSign(p, v[0])))}</td>`).join('') + '</tr>';
    }).join('');
    const legend = VARGAS.map(v => `D${v[0]} ${v[hi() ? 1 : 2]} — ${VARGA_USE[v[0]][hi() ? 0 : 1]}`).join(' • ');
    return `<div class="kp-h2">${L('षोडशवर्ग तालिका', 'Shodashavarga table')}</div>
<table class="kp-tbl kp-center" style="font-size:9.5px"><thead><tr><th style="text-align:left">${L('ग्रह', 'Planet')}</th>${head}</tr></thead><tbody>${rows}</tbody></table>
<div class="kp-note">✓ = ${L('वर्गोत्तम (D1 व D9 में एक ही राशि)', 'Vargottama (same sign in D1 and D9)')}. ${legend}</div>`;
  }

  function nowCls(a, b) { const n = Date.now(); return n >= a && n < b ? ' kp-now' : ''; }
  function secVimshottari() {
    const tree = (typeof dashaTreeData !== 'undefined') ? dashaTreeData : [];
    if (!tree.length) return '';
    const blocks = tree.map(md => {
      if (typeof generateSubNodes === 'function') generateSubNodes(md);
      const rows = md.children.map(ad => `<tr class="${nowCls(ad.startMs, ad.endMs).trim()}"><td>${esc(plName(md.lordEn))}–${esc(plName(ad.lordEn))}</td><td>${fmtDate(ad.startDate)}</td><td>${fmtDate(ad.endDate)}</td><td>${fmtDur(ad.durationMs)}</td></tr>`).join('');
      return `<div class="kp-dblock${nowCls(md.startMs, md.endMs)}"><div class="bh"><span>${esc(plName(md.lordEn))} ${L('महादशा', 'Mahadasha')}</span><span>${fmtDate(md.startDate)} → ${fmtDate(md.endDate)} • ${fmtDur(md.durationMs)}</span></div>`
        + `<table><tr style="color:#92400e;font-weight:700"><td>${L('अन्तर्दशा', 'Antardasha')}</td><td>${L('आरम्भ', 'Start')}</td><td>${L('समाप्ति', 'End')}</td><td>${L('अवधि', 'Duration')}</td></tr>${rows}</table></div>`;
    });
    const sum = tree.map(md => `<tr class="${nowCls(md.startMs, md.endMs).trim()}"><td><b>${esc(plName(md.lordEn))}</b></td><td>${fmtDate(md.startDate)}</td><td>${fmtDate(md.endDate)}</td><td>${fmtDur(md.durationMs)}</td></tr>`).join('');
    return `<div class="kp-h2">${L('विंशोत्तरी दशा — महादशा सारणी', 'Vimshottari dasha — Mahadasha summary')}</div>
<div class="kp-note">${L('पीली पंक्ति = वर्तमान में चल रही दशा। जन्म के समय की महादशा का शेष भाग जन्म से गिना गया है; उसकी आरम्भ तिथि जन्म से पहले की हो सकती है।', 'Yellow row = running now. The first mahadasha began before birth; only its balance runs after birth.')}</div>
<table class="kp-tbl"><thead><tr><th>${L('महादशा', 'Mahadasha')}</th><th>${L('आरम्भ', 'Start')}</th><th>${L('समाप्ति', 'End')}</th><th>${L('अवधि', 'Duration')}</th></tr></thead><tbody>${sum}</tbody></table>
<div class="kp-h2">${L('महादशा में अन्तर्दशा कालखण्ड', 'Antardasha periods in each Mahadasha')}</div>${rows(blocks, 2)}`;
  }
  function secPratyantar(mdSlice) {
    const blocks = [];
    mdSlice.forEach(md => {
      if (typeof generateSubNodes === 'function') generateSubNodes(md);
      md.children.forEach(ad => {
        if (typeof generateSubNodes === 'function') generateSubNodes(ad);
        const rows = ad.children.map(pd => `<tr class="${nowCls(pd.startMs, pd.endMs).trim()}"><td>${esc(plName(pd.lordEn))}</td><td>${fmtDate(pd.startDate)}</td><td>${fmtDate(pd.endDate)}</td></tr>`).join('');
        blocks.push(`<div class="kp-dblock${nowCls(ad.startMs, ad.endMs)}"><div class="bh"><span>${esc(plName(md.lordEn))}–${esc(plName(ad.lordEn))}</span></div><table>${rows}</table></div>`);
      });
    });
    return rows(blocks, 3, 'three');
  }
  function secYogini() {
    const data = (typeof yoginiDashaData !== 'undefined') ? yoginiDashaData : [];
    if (!data.length) return '';
    const YN = { 'मंगला': 'Mangala', 'पिँगला': 'Pingala', 'धान्या': 'Dhanya', 'भ्रामरी': 'Bhramari', 'भद्रिका': 'Bhadrika', 'उल्का': 'Ulka', 'सिद्ध': 'Siddha', 'सँकटा': 'Sankata' };
    const nm = n => { const m = String(n).match(/^(\S+)\s*\((\w+)\)/); if (!m) return n; return (hi() ? m[1] : (YN[m[1]] || m[1])) + ' (' + plName(m[2]) + ')'; };
    const rows = data.map(d => `<tr class="${nowCls(d.startMs, d.endMs).trim()}"><td><b>${esc(nm(d.name))}</b></td><td>${fmtDate(d.startDate)}</td><td>${fmtDate(d.endDate)}</td><td>${fmtDur(d.endMs - d.startMs)}</td></tr>`).join('');
    return `<div class="kp-h2">${L('योगिनी दशा', 'Yogini dasha')}</div><table class="kp-tbl"><thead><tr><th>${L('योगिनी (स्वामी)', 'Yogini (lord)')}</th><th>${L('आरम्भ', 'Start')}</th><th>${L('समाप्ति', 'End')}</th><th>${L('अवधि', 'Duration')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function secChara() {
    const data = (typeof charaDashaData !== 'undefined') ? charaDashaData : [];
    if (!data.length) return '';
    const rows = data.map(d => `<tr class="${nowCls(d.startMs, d.endMs).trim()}"><td><b>${esc(signName(d.signIndex))}</b></td><td>${d.years} ${L('वर्ष', 'yrs')}</td><td>${fmtDate(d.startDate)}</td><td>${fmtDate(d.endDate)}</td></tr>`).join('');
    return `<div class="kp-h2">${L('जैमिनी चर दशा', 'Jaimini Chara dasha')}</div><table class="kp-tbl"><thead><tr><th>${L('राशि दशा', 'Sign dasha')}</th><th>${L('अवधि', 'Duration')}</th><th>${L('आरम्भ', 'Start')}</th><th>${L('समाप्ति', 'End')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function cloneOut(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const c = el.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    c.querySelectorAll('button, input, select, script').forEach(e => e.remove());
    return c.outerHTML;
  }
  function secPanchang() {
    const t = id => { const e = document.getElementById(id); return e ? e.textContent.trim() : ''; };
    const sum = t('panchangBirthSummary');
    return `<div class="kp-h2">${L('जन्म कालीन पञ्चाङ्ग', 'Birth panchang')}</div>${sum ? `<div class="kp-note">${esc(sum)}</div>` : ''}<div class="kp-pan">`
      + `<h4>${L('पञ्चाङ्ग के ५ प्रधान अंग', 'The five limbs of the panchang')}</h4>${cloneOut('panchangLimbsGrid')}`
      + `<h4>${L('सौर व चान्द्र मान एवं दिन विभाजन', 'Solar & lunar measures, day division')}</h4>${cloneOut('panchangSolarGrid')}`
      + `<h4>${L('जन्म कालीन विशिष्ट मुहूर्त व कालवेला', 'Muhurtas & kaal-vela at birth')}</h4>${cloneOut('panchangMuhurtaGrid')}`
      + `<h4>${L('अवकहड़ा चक्र एवं जन्म नामाक्षर', 'Avakahada chakra & name syllable')}</h4>${cloneOut('tblAvakahada')}</div>`;
  }
  function secBhava(calc) {
    const bh = calc.sripatiBhavas || [];
    if (!bh.length) return '';
    const rows = bh.map(b => `<tr><td><b>${L('भाव', 'House')} ${b.house}</b></td><td>${esc(signName(b.sandhi1Sign))} ${dms(b.sandhi1Deg)}</td><td><b>${esc(signName(b.midSign))} ${dms(b.midDeg)}</b></td><td>${esc(signName(b.sandhi2Sign))} ${dms(b.sandhi2Deg)}</td></tr>`).join('');
    return `<div class="kp-h2">${L('श्रीपति भाव स्पष्ट', 'Sripati bhava cusps')}</div><table class="kp-tbl"><thead><tr><th>${L('भाव', 'House')}</th><th>${L('आरम्भ (संधि)', 'Start (sandhi)')}</th><th>${L('भाव मध्य', 'Middle')}</th><th>${L('अन्त (संधि)', 'End (sandhi)')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  // English names by engine key (the engine names are Hindi)
  const POINT_EN = { HoraLagna: 'Hora Lagna (HL)', GhatiLagna: 'Ghati Lagna (GL)', BhavaLagna: 'Bhava Lagna (BL)', Pranapada: 'Pranapada Lagna', SreeLagna: 'Sree Lagna (SL)', InduLagna: 'Indu Lagna', ArudhaLagna: 'Arudha Lagna (AL)', UpapadaLagna: 'Upapada Lagna (UL)' };
  function secPoints(list, title, lagnaSign) {
    const arr = Array.isArray(list) ? list.map(u => [u.id || u.name, u]) : (list ? Object.entries(list) : []);
    if (!arr.length) return '';
    // Indu, Arudha and Upapada lagna are whole-sign points: the engine gives a sign, no degree
    const rows = arr.map(([key, u]) => {
      const hasDeg = typeof u.abs === 'number' && isFinite(u.abs);
      const sign = hasDeg ? Math.floor(u.abs / 30) : u.sign;
      if (typeof sign !== 'number' || !isFinite(sign)) return '';
      const house = u.house || (typeof lagnaSign === 'number' ? (sign - lagnaSign + 12) % 12 + 1 : '');
      const name = hi() ? u.name : (POINT_EN[key] || u.name);
      return `<tr><td><b>${esc(name)}</b></td><td>${esc(signName(sign))}</td><td>${hasDeg ? dms(u.abs % 30) : L('— (राशि मात्र)', '— (sign only)')}</td><td>${house}</td></tr>`;
    }).join('');
    return `<div class="kp-h2">${title}</div><table class="kp-tbl"><thead><tr><th>${L('नाम', 'Name')}</th><th>${L('राशि', 'Sign')}</th><th>${L('अंश', 'Degree')}</th><th>${L('भाव', 'House')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function secAshtaka(calc) {
    const a = calc.ashtakavarga;
    if (!a || !a.bhinnashtakavarga) return '';
    const ids = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const head = SIGN_HI.map((x, i) => `<th>${esc(signShort(i))}</th>`).join('');
    const row = (label, arr, bold) => `<tr><td style="text-align:left">${bold ? '<b>' + esc(label) + '</b>' : esc(label)}</td>${arr.map(v => `<td>${bold ? '<b>' + v + '</b>' : v}</td>`).join('')}<td><b>${arr.reduce((x, y) => x + y, 0)}</b></td></tr>`;
    let rows = ids.filter(id => a.bhinnashtakavarga[id]).map(id => row(plName(id), a.bhinnashtakavarga[id])).join('');
    if (a.sarvashtakavarga) rows += row(L('सर्वाष्टकवर्ग', 'Sarvashtakavarga'), a.sarvashtakavarga, true);
    if (a.trikonaShodhita) rows += row(L('त्रिकोण शोधित', 'After trikona shodhana'), a.trikonaShodhita);
    if (a.ekadhipatyaShodhita) rows += row(L('एकाधिपत्य शोधित', 'After ekadhipatya shodhana'), a.ekadhipatyaShodhita);
    const lag = calc.planets.find(p => p.id === 'Lagna');
    const pinda = a.shodhitaPinda != null ? `<div class="kp-note">${L('राशि पिण्ड', 'Rashi pinda')}: ${a.rashiPinda} • ${L('ग्रह पिण्ड', 'Graha pinda')}: ${a.grahaPinda} • ${L('शोधित पिण्ड', 'Shodhita pinda')}: ${a.shodhitaPinda}</div>` : '';
    return `<div class="kp-h2">${L('अष्टकवर्ग', 'Ashtakavarga')}</div><div class="kp-note">${L('हर राशि में बिन्दु (मेष से मीन)। लग्न राशि: ', 'Bindus in each sign (Aries to Pisces). Lagna sign: ')}${esc(signName(lag.sign))}</div>
<table class="kp-tbl kp-center"><thead><tr><th style="text-align:left">${L('ग्रह', 'Planet')}</th>${head}<th>${L('योग', 'Total')}</th></tr></thead><tbody>${rows}</tbody></table>${pinda}`;
  }
  function secSandhi() {
    const html = cloneOut('sandhiAnalysisContent');
    return html ? `<div class="kp-h2">${L('भाव संधि व ग्रह विस्थापन', 'Bhava sandhi & planet shifts')}</div><div class="kp-pan">${html}</div>` : '';
  }

  // ---------- build the report as page groups ----------
  function buildChunks(calc, ch) {
    const o = ch.opts, st = ch.style, chunks = [];
    const head = runHead(calc);
    const push = html => { if (html && html.trim()) chunks.push(head + html); };

    let first = '';
    if (o.birth) first += secBirth(calc);
    if (o.planets) first += secPlanets(calc);
    if (first) first += `<div class="kp-support kp-mega" data-href="${MEGA_URL}">${L('अपनी कुण्डली का विस्तृत विश्लेषण चाहते हैं? <b>हमारी मेगा पाराशर रिपोर्ट डाउनलोड करें</b> — यहाँ क्लिक करें या <b>shriramjiastro.in/parashara-report.html</b> खोलें।', 'Want a detailed analysis of your kundali? <b>Download our Mega Parashara Report</b> — click here or open <b>shriramjiastro.in/parashara-report.html</b>.')}</div>`;
    if (first) first += `<div class="kp-support" data-href="${DONATE_URL}">${L('यह कुण्डली निःशुल्क है। इस सेवा को चलाए रखने में सहयोग करना चाहें तो यहाँ या हर पन्ने के नीचे <b>Donate / Support us</b> पर क्लिक करें, या <b>shriramjiastro.in/donate.html</b> खोलें। अपनी इच्छा से कोई भी राशि दे सकते हैं।', 'This kundali is free. To help keep the service running, tap here or <b>Donate / Support us</b> at the foot of any page, or open <b>shriramjiastro.in/donate.html</b>. Give any amount you wish.')}</div>`;
    push(first);

    const charts = [];
    if (o.d1) charts.push(vargaChart(calc, 1, st, L('लग्न कुण्डली (D1)', 'Lagna chart (D1)'), L('जन्म लग्न — अंश सहित', 'Birth chart with degrees')));
    if (o.chalit) charts.push(chalitChart(calc, st));
    if (o.d9) charts.push(vargaChart(calc, 9, st, L('नवमांश कुण्डली (D9)', 'Navamsha (D9)'), VARGA_USE[9][hi() ? 0 : 1]));
    if (o.d10) charts.push(vargaChart(calc, 10, st, L('दशमांश कुण्डली (D10)', 'Dashamsha (D10)'), VARGA_USE[10][hi() ? 0 : 1]));
    if (o.d7) charts.push(vargaChart(calc, 7, st, L('सप्तांश कुण्डली (D7)', 'Saptamsha (D7)'), VARGA_USE[7][hi() ? 0 : 1]));
    if (o.moonchart) charts.push(refChart(calc, 'Moon', st, L('चन्द्र कुण्डली', 'Moon chart')));
    if (o.sunchart) charts.push(refChart(calc, 'Sun', st, L('सूर्य कुण्डली', 'Sun chart')));
    if (o.gochar) charts.push(gocharChart(calc, st));
    // two charts per row; several page groups so each stays small
    const chartLabel = `<div class="kp-h2">${L('जन्म कुण्डलियाँ', 'Birth charts')}</div><div class="kp-note">${L('(व) = वक्री ग्रह। अंक = राशि क्रमांक (1 मेष … 12 मीन)।', '(R) = retrograde. Numbers = sign number (1 Aries … 12 Pisces). Asc = Lagna, Su = Sun, Mo = Moon, Ma = Mars, Me = Mercury, Ju = Jupiter, Ve = Venus, Sa = Saturn, Ra = Rahu, Ke = Ketu.')}</div>`;
    for (let i = 0; i < charts.length; i += 4) push((i === 0 ? chartLabel : '') + rows(charts.slice(i, i + 4), 2));

    if (o.sudarshan) {
      push(`<div class="kp-h2">${L('सुदर्शन चक्र', 'Sudarshan Chakra')}</div>
<div class="kp-note">${L('भीतरी वृत्त = लग्न कुण्डली (लाल), मध्य वृत्त = चन्द्र कुण्डली (नीला), बाहरी वृत्त = सूर्य कुण्डली (सुनहरा)। हर खाने में छोटा अंक राशि क्रमांक है; केंद्र के पास भाव संख्या। * = वक्री।', 'Inner ring = Lagna chart (red), middle = Moon chart (blue), outer = Sun chart (gold). Small number = sign number; numbers near the centre = house. * = retrograde.')}</div>
<div class="kp-sud kp-avoid">${svgImg(sudarshanSvg(calc.planets), 540)}</div>
<div class="kp-note">${['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Lagna'].map(id => plShort(id) + ' = ' + plName(id)).join(' • ')}</div>`);
    }

    let vt = '';
    if (o.vargatable) vt += secVargaTable(calc);
    const extra = [2, 3, 4, 12, 16, 20, 24, 27, 30, 40, 45, 60].filter(v => o['v' + v]).map(v => vargaChart(calc, v, st, vargaTitle(v), VARGA_USE[v][hi() ? 0 : 1]));
    if (vt || extra.length) {
      const first4 = extra.slice(0, 4);
      push(vt + (first4.length ? `<div class="kp-h2">${L('षोडशवर्ग कुण्डलियाँ', 'Divisional charts')}</div>${rows(first4, 2)}` : ''));
      for (let i = 4; i < extra.length; i += 4) push(rows(extra.slice(i, i + 4), 2));
    }

    if (o.vimshottari) push(secVimshottari());
    if (o.pratyantar && typeof dashaTreeData !== 'undefined' && dashaTreeData.length) {
      for (let i = 0; i < dashaTreeData.length; i += 2) {
        push((i === 0 ? `<div class="kp-h2">${L('प्रत्यन्तर दशा (महादशा–अन्तर्दशा के भीतर)', 'Pratyantar dasha (within each antardasha)')}</div>` : '') + secPratyantar(dashaTreeData.slice(i, i + 2)));
      }
    }
    let dd = '';
    if (o.yogini) dd += secYogini();
    if (o.chara) dd += secChara();
    push(dd);
    if (o.panchang) push(secPanchang());
    let more = '';
    if (o.bhava) more += secBhava(calc);
    if (o.sandhi) more += secSandhi();
    const lagSign = (calc.planets.find(p => p.id === 'Lagna') || {}).sign;
    if (o.upagraha) more += secPoints(calc.upagrahas, L('उपग्रह', 'Upagrahas'), lagSign);
    if (o.speciallagna) more += secPoints(calc.specialLagnas, L('विशेष लग्न', 'Special lagnas'), lagSign);
    push(more);
    if (o.ashtakavarga) push(secAshtaka(calc));
    return chunks;
  }

  // ---------- PDF ----------
  const isTouch = () => window.matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  function loadHtml2Pdf() {
    if (typeof html2pdf === 'function') return Promise.resolve();
    const tryLoad = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    return tryLoad('/html2pdf.bundle.min.js?v=13').catch(() => tryLoad('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'));
  }
  const SITE_URL = 'https://shriramjiastro.in/?src=pdf';
  const DONATE_URL = 'https://shriramjiastro.in/donate.html?src=pdf';
  const MEGA_URL = 'https://shriramjiastro.in/parashara-report.html';
  const PDF_FONT = "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Devanagari Sangam MN', 'Mukta', system-ui, sans-serif";
  function makeEl(html) {
    const box = document.createElement('div');
    box.className = 'kp-doc';
    box.setAttribute('data-no-i18n', '');
    box.innerHTML = html;
    // html2canvas breaks Hindi conjuncts when letters are spaced: force plain spacing inline
    [box, ...box.querySelectorAll('*')].forEach(el => {
      if (!el.style || el instanceof SVGElement) return;
      el.style.setProperty('letter-spacing', '0px', 'important');
      el.style.setProperty('word-spacing', 'normal', 'important');
      el.style.setProperty('font-family', PDF_FONT, 'important');
    });
    // the site's emoji→icon script must not touch the report
    box.querySelectorAll('svg.sra-ic').forEach(s => s.remove());
    return box;
  }

  async function generate(choice, progress) {
    const calc = window.currentCalculation || (typeof currentCalculation !== 'undefined' ? currentCalculation : null);
    if (!calc || !calc.planets || !calc.planets.length) throw new Error('nocalc');
    injectCss();
    // make sure the lazily rendered tabs (dashas, panchang, tables) exist
    if (typeof ensureDomainRendered === 'function') ['planets', 'panchang', 'dashas'].forEach(d => { try { ensureDomainRendered(d); } catch (e) {} });
    await loadHtml2Pdf();
    const chunks = buildChunks(calc, choice);
    if (!chunks.length) throw new Error('empty');
    const b = calc.birthDetails || {};
    const fname = 'kundali-' + String(b.candidateName || 'report').replace(/[^\wऀ-ॿ]+/g, '-').slice(0, 40) + '.pdf';
    const opt = {
      margin: [9, 8, 11, 8],
      filename: fname,
      image: { type: 'jpeg', quality: 0.86 },
      // lay the copy out in a desktop-width window: on phones (Safari above all) the
      // default is the phone's own width, which clips the right side of the A4 page
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: 1024,
        // html2canvas copies the whole page for every part; the kundali page is huge, so copy
        // only the report (this was most of the wait, worst on phones)
        ignoreElements: el => el.parentNode === document.body && !(el.classList && el.classList.contains('html2pdf__overlay')) },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.kp-avoid'] }
    };
    const y = window.scrollY;
    window.scrollTo(0, 0);
    try {
      progress(1, chunks.length);
      // html2pdf centres its copy inside a screen-sized box that clips overflow: on a phone
      // the A4 page is wider than the screen and its right side was cut. Pin it left.
      const pin = c => {
        const ov = c && c.parentNode;
        if (ov && ov.style) { ov.style.right = 'auto'; ov.style.bottom = 'auto'; ov.style.width = '1024px'; ov.style.height = 'auto'; ov.style.overflow = 'visible'; }
        if (c && c.style) { c.style.left = '0'; c.style.right = 'auto'; c.style.margin = '0'; }
      };
      // boxes with data-href on the first part become clickable areas on page 1
      const links = [];
      const measure = c => {
        pin(c);
        const box = c.getBoundingClientRect(), k = (210 - opt.margin[1] - opt.margin[3]) / box.width;
        c.querySelectorAll('[data-href]').forEach(el => {
          const r = el.getBoundingClientRect();
          links.push({ url: el.getAttribute('data-href'), x: opt.margin[1] + (r.left - box.left) * k, y: opt.margin[0] + (r.top - box.top) * k, w: r.width * k, h: r.height * k });
        });
      };
      let w = html2pdf().set(opt).from(makeEl(chunks[0])).toContainer().get('container').then(measure).toCanvas().toPdf()
        .get('pdf').then(pdf => links.forEach(l => { if (l.y + l.h < 297 - opt.margin[2]) pdf.link(l.x, l.y, l.w, l.h, { url: l.url }); }));
      for (let i = 1; i < chunks.length; i++) {
        const idx = i;
        w = w.get('pdf').then(pdf => { progress(idx + 1, chunks.length); pdf.addPage(); })
          .from(makeEl(chunks[idx])).toContainer().get('container').then(pin).toCanvas().toPdf();
      }
      // page numbers
      w = w.get('pdf').then(pdf => {
        const n = pdf.internal.getNumberOfPages();
        for (let p = 1; p <= n; p++) {
          pdf.setPage(p);
          // clickable footer: website on the left, donate on the right (jsPDF's built-in
          // font has no Devanagari, so these stay in English)
          pdf.setFontSize(8);
          pdf.setTextColor(120);
          pdf.text(`${p} / ${n}`, 105, 292, { align: 'center' });
          pdf.setTextColor(122, 90, 28);
          pdf.textWithLink('shriramjiastro.in', 10, 292, { url: SITE_URL });
          pdf.setTextColor(154, 27, 10);
          pdf.setFont(undefined, 'bold');
          const dn = 'Donate / Support us';
          pdf.textWithLink(dn, 200 - pdf.getTextWidth(dn), 292, { url: DONATE_URL });
          pdf.setFont(undefined, 'normal');
        }
      });
      const blob = await w.outputPdf('blob');
      return new File([blob], fname, { type: 'application/pdf' });
    } finally {
      window.scrollTo(0, y);
    }
  }

  function showSheet(file) {
    const url = URL.createObjectURL(file);
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    const sheet = document.createElement('div');
    sheet.className = 'kp-sheet';
    sheet.setAttribute('data-no-i18n', '');
    sheet.innerHTML = `<div class="kp-sheet-card" role="dialog" aria-modal="true">
      <h4>${L('कुण्डली PDF तैयार है', 'Kundali PDF is ready')}</h4>
      <p>${L('Files में सेव करें, WhatsApp पर भेजें या प्रिंट करें।', 'Save it to Files, send on WhatsApp or print.')}</p>
      <div class="row">
        ${canShare ? `<button type="button" class="primary" data-act="share">${L('शेयर / सेव / प्रिंट करें', 'Share / Save / Print')}</button>` : ''}
        <a class="${canShare ? 'ghost' : 'primary'}" href="${url}" download="${esc(file.name)}" target="_blank" rel="noopener">${L('PDF खोलें / डाउनलोड करें', 'Open / download PDF')}</a>
        <button type="button" class="close" data-act="close">${L('बंद करें', 'Close')}</button>
      </div></div>`;
    document.body.classList.add('kp-open');
    const close = () => { sheet.remove(); document.body.classList.remove('kp-open'); setTimeout(() => URL.revokeObjectURL(url), 60000); };
    sheet.addEventListener('click', async e => {
      const act = e.target.closest('[data-act]');
      if (e.target === sheet || (act && act.dataset.act === 'close')) return close();
      if (act && act.dataset.act === 'share') {
        try { await navigator.share({ files: [file], title: L('जन्म कुण्डली', 'Birth chart') }); close(); } catch (err) { /* cancelled */ }
      }
    });
    document.body.appendChild(sheet);
  }
  function download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // ---------- chooser ----------
  function open() {
    const calc = window.currentCalculation || (typeof currentCalculation !== 'undefined' ? currentCalculation : null);
    if (!calc || !calc.planets || !calc.planets.length) {
      alert(L('पहले अपनी कुण्डली बनाएँ, फिर प्रिंट / PDF चुनें।', 'Please make your kundali first, then choose Print / PDF.'));
      return;
    }
    injectCss();
    const ch = loadChoices();
    const ov = document.createElement('div');
    ov.className = 'kp-overlay';
    ov.setAttribute('data-no-i18n', '');
    const groups = OPTIONS.map((g, gi) => `<div class="kp-group"><div class="kp-group-h"><span>${g.group[hi() ? 0 : 1]}</span><button type="button" data-all="${gi}">${L('सभी चुनें', 'Select all')}</button></div>`
      + `<div class="kp-items${g.vargas ? ' kp-vargas' : ''}">${g.items.map(i => `<label class="kp-item"><input type="checkbox" data-k="${i[0]}" data-g="${gi}" ${ch.opts[i[0]] ? 'checked' : ''}><span>${esc(i[hi() ? 1 : 2])}</span></label>`).join('')}</div></div>`).join('');
    ov.innerHTML = `<div class="kp-card" role="dialog" aria-modal="true">
      <div class="kp-head"><h3>${L('कुण्डली प्रिंट / PDF', 'Kundali Print / PDF')}</h3><p>${L('जो-जो रिपोर्ट में चाहिए उस पर ✓ लगाएँ। मुख्य चीज़ें पहले से चुनी हैं।', 'Tick everything you want in the report. The main items are already ticked.')}</p></div>
      <div class="kp-body">
        <div class="kp-group"><div class="kp-group-h"><span>${L('कुण्डली की शैली', 'Chart style')}</span></div>
          <div class="kp-style"><label><input type="radio" name="kpStyle" value="north" ${ch.style !== 'south' ? 'checked' : ''}> ${L('उत्तर भारतीय', 'North Indian')}</label><label><input type="radio" name="kpStyle" value="south" ${ch.style === 'south' ? 'checked' : ''}> ${L('दक्षिण भारतीय', 'South Indian')}</label></div></div>
        ${groups}
      </div>
      <div class="kp-foot"><span class="kp-progress"></span><button type="button" class="kp-cancel">${L('बंद करें', 'Close')}</button><button type="button" class="kp-go">${L('PDF बनाएँ', 'Make PDF')}</button></div>
    </div>`;
    document.body.appendChild(ov);
    document.body.classList.add('kp-open');
    const close = () => { ov.remove(); document.body.classList.remove('kp-open'); };
    ov.addEventListener('click', e => {
      if (e.target === ov) close();
      const all = e.target.closest('[data-all]');
      if (all) {
        const boxes = [...ov.querySelectorAll(`input[data-g="${all.dataset.all}"]`)];
        const turnOn = boxes.some(x => !x.checked);
        boxes.forEach(x => { x.checked = turnOn; });
        all.textContent = turnOn ? L('कोई नहीं', 'Select none') : L('सभी चुनें', 'Select all');
      }
    });
    ov.querySelector('.kp-cancel').onclick = close;
    const go = ov.querySelector('.kp-go'), prog = ov.querySelector('.kp-progress');
    go.onclick = async () => {
      const choice = { opts: {}, style: (ov.querySelector('input[name="kpStyle"]:checked') || {}).value || 'north' };
      ov.querySelectorAll('input[data-k]').forEach(x => { choice.opts[x.dataset.k] = x.checked; });
      if (!Object.values(choice.opts).some(Boolean)) { alert(L('कम से कम एक चीज़ चुनें।', 'Please tick at least one item.')); return; }
      saveChoices(choice);
      go.disabled = true;
      const label = go.textContent;
      go.textContent = L('PDF बन रही है…', 'Making PDF…');
      try {
        const file = await generate(choice, (i, n) => { prog.textContent = L(`भाग ${i} / ${n} बन रहा है…`, `Building part ${i} of ${n}…`); });
        close();
        if (isTouch()) showSheet(file); else download(file);
      } catch (e) {
        console.error('Kundali PDF failed', e);
        alert(L('PDF नहीं बन सकी — कृपया दोबारा प्रयास करें।', 'Could not make the PDF — please try again.'));
        go.disabled = false; go.textContent = label; prog.textContent = '';
      }
    };
  }

  window.KundaliPrint = { open, _build: buildChunks, _generate: generate };
})();
