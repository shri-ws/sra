/* vivah-shuddhi.js — विवाह मुहूर्त शुद्धि, मुहूर्त चिन्तामणि (विवाह प्रकरण) के अनुसार
   Every rule cites its shloka and the book page of the Acharya's copy (पीयूषधारा +
   पीताम्बरा, pp. 301–427). Input is the engine's noon chart for the date (Swiss
   Ephemeris, true Chitra-paksha ayanamsa: positions, speeds, retrograde flags, Moon's
   latitude, sunrise/sunset); planets are moved through the day with their own speeds.
   Output: whole-day doshas, and for every rising lagna the minutes that pass every rule,
   with the reasons the rest fail. Pure functions: no DOM. */
(function (root) {
  'use strict';
  const N = x => ((x % 360) + 360) % 360;
  const D2R = Math.PI / 180;
  const NAKW = 40 / 3, PADW = 10 / 3;
  const signOf = l => Math.floor(N(l) / 30) + 1;              // 1..12
  const nakOf = l => Math.floor(N(l) / NAKW);                  // 0..26 (अश्विनी = 0)
  const padaOf = l => Math.floor((N(l) % NAKW) / PADW) + 1;    // 1..4
  const houseFrom = (from, s) => ((s - from + 12) % 12) + 1;
  const sgn = (s, k) => ((s - 1 + k) % 12 + 12) % 12 + 1;      // k signs on from s
  const angDist = (a, b) => { const d = N(a - b); return Math.min(d, 360 - d); };

  const LORD = { 1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon', 5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars', 9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter' };
  const OWN = { sun: [5], moon: [4], mars: [1, 8], mercury: [3, 6], jupiter: [9, 12], venus: [2, 7], saturn: [10, 11] };
  const EXALT = { sun: 1, moon: 2, mars: 10, mercury: 6, jupiter: 4, venus: 12, saturn: 7 };
  const DEBIL = { sun: 7, moon: 8, mars: 4, mercury: 12, jupiter: 10, venus: 6, saturn: 1 };
  // नैसर्गिक मैत्री (श्लोक 27–28, p.336–338)
  const FRIENDS = { sun: ['moon', 'mars', 'jupiter'], moon: ['sun', 'mercury'], mars: ['sun', 'moon', 'jupiter'], mercury: ['sun', 'venus'], jupiter: ['sun', 'moon', 'mars'], venus: ['mercury', 'saturn'], saturn: ['mercury', 'venus'] };
  const ENEMIES = { sun: ['venus', 'saturn'], moon: [], mars: ['mercury'], mercury: ['moon'], jupiter: ['mercury', 'venus'], venus: ['sun', 'moon'], saturn: ['sun', 'moon', 'mars'] };
  const BENEFIC = ['moon', 'mercury', 'jupiter', 'venus'];
  const KRURA = ['sun', 'mars', 'saturn', 'rahu', 'ketu'];
  const PAPA = ['sun', 'mars', 'saturn', 'rahu', 'ketu'];
  const PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const isFriend = (a, b) => a === b || (FRIENDS[a] || []).includes(b);

  function aspects(planet, fromSign, toSign) {
    const h = houseFrom(fromSign, toSign);
    if (h === 7) return true;
    return (planet === 'mars' && (h === 4 || h === 8)) || (planet === 'jupiter' && (h === 5 || h === 9)) || (planet === 'saturn' && (h === 3 || h === 10));
  }
  const seesOrIn = (planet, pSign, target) => pSign === target || aspects(planet, pSign, target);

  // ── Astronomy ──────────────────────────────────────────────────────────
  function tropicalAscendant(jdUT, lat, lon) {
    const d = jdUT - 2451545.0, T = d / 36525;
    const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T * T * T / 38710000;
    const ramc = N(gmst + lon) * D2R, eps = (23.4392911 - 0.0130042 * T) * D2R;
    return N(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * D2R) * Math.sin(eps))) / D2R);
  }
  const localToJd = (y, m, d, minutes, tz) => (Date.UTC(y, m - 1, d) + minutes * 60000 - tz * 3600000) / 86400000 + 2440587.5;
  function declination(sayana, beta) {
    const e = 23.4393 * D2R;
    return Math.asin(Math.sin(beta * D2R) * Math.cos(e) + Math.cos(beta * D2R) * Math.sin(e) * Math.sin(sayana * D2R)) / D2R;
  }

  // ── Tables from the text ───────────────────────────────────────────────
  // श्लोक 55 (p.375–376) विवाह नक्षत्र: मृगशिरा, हस्त, मूल, अनुराधा, मघा, रोहिणी, रेवती, तीनों उत्तरा, स्वाती
  const VIVAH_NAK = [4, 12, 18, 16, 9, 3, 26, 11, 20, 25, 14];   // 0-based
  // श्लोक 49–51 (p.372–374) विषघटी: नक्षत्र की इस घटी से 4 घटी (60-घटी भोग पर)
  const VISH = [50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 56, 24, 20, 10, 10, 18, 16, 24, 30];
  // श्लोक 66 (p.389) दग्धा तिथि, सूर्य-राशि से
  const DAGDHA = { 9: 2, 12: 2, 2: 4, 11: 4, 4: 6, 1: 6, 6: 8, 3: 8, 5: 10, 8: 10, 10: 12, 7: 12 };
  // श्लोक 56 (p.376–378) पञ्चशलाका वेध-युग्म (28 नक्षत्र, अभिजित् = 21)
  const VEDHA_PAIRS = [[3, 21], [1, 16], [20, 4], [22, 9], [12, 26], [14, 24], [18, 6], [11, 27]];
  const VEDHA = {}; VEDHA_PAIRS.forEach(([a, b]) => { VEDHA[a] = b; VEDHA[b] = a; });
  // श्लोक 59 (p.381) लत्ता: नक्षत्र आगे (+) / पीछे (−), अपने नक्षत्र को 1 गिनकर
  const LATTA = { sun: 11, saturn: 7, jupiter: 5, mars: 2, mercury: -6, venus: -4, rahu: 8 };
  // श्लोक 63 (p.386) उपग्रह: सूर्य-नक्षत्र से चन्द्र-नक्षत्र
  const UPAGRAHA = [5, 7, 8, 10, 14, 15, 18, 19, 21, 22, 23, 24, 25];
  // श्लोक 62 (p.385) एकार्गल के योग: विष्कम्भ, अतिगण्ड, शूल, गण्ड, व्याघात, वज्र, व्यतीपात, परिघ, वैधृति
  const EKARGALA_YOGA = [1, 6, 9, 10, 13, 15, 17, 19, 27];
  // श्लोक 60 (p.382) पात: इन योगों के अन्त में जो नक्षत्र — शूल, गण्ड, हर्षण, व्यतीपात, साध्य, वैधृति
  const PATA_YOGA = [9, 10, 14, 17, 21, 27];
  // श्लोक 70 (p.391–392) दशयोग: (सूर्य-नक्षत्र + चन्द्र-नक्षत्र) ÷ 27 का शेष
  const DASHAYOGA = [0, 1, 4, 6, 10, 11, 15, 18, 19, 20];
  // श्लोक 80 (p.400) ग्रह-संक्रान्ति की वर्ज्य घटी (आगे-पीछे मिलाकर)
  const SANKRANTI_GHATI = { moon: 2, mars: 9, mercury: 6, jupiter: 88, venus: 9, saturn: 160 };
  // श्लोक 52–54, 64–65 (p.374–388) — वार 0 = रवि
  const DURMUHURTA_DAY = { 0: [14], 1: [9, 12], 2: [4], 3: [8], 4: [6, 12], 5: [9, 4], 6: [1, 2] };
  const DURMUHURTA_NIGHT = { 2: [7] };
  const KULIKA_DAY = { 0: 14, 1: 12, 2: 10, 3: 8, 4: 6, 5: 4, 6: 2 };
  const KULIKA_NIGHT = { 0: 13, 1: 11, 2: 9, 3: 7, 4: 5, 5: 3, 6: 1 };
  const ARDHAYAMA = { 0: 4, 1: 7, 2: 2, 3: 5, 4: 8, 5: 3, 6: 6 };
  // श्लोक 81 (p.400–401)
  const DAY_SENSE = { 7: 'badhir', 8: 'badhir', 5: 'andha', 1: 'andha', 2: 'andha', 11: 'pangu' };
  const NIGHT_SENSE = { 9: 'badhir', 10: 'badhir', 6: 'andha', 3: 'andha', 4: 'andha', 12: 'pangu' };
  // श्लोक 84 (p.402–403) शुभ नवांश
  const GOOD_NAV = { 3: 'uttam', 6: 'uttam', 7: 'uttam', 9: 'uttam', 12: 'madhyam' };
  const CHARA = [1, 4, 7, 10];
  // चान्द्र मास (अमान्त): अमावस्या पर सूर्य की राशि से
  const MONTH_BY_SUN_SIGN = { 12: 'chaitra', 1: 'vaishakha', 2: 'jyeshtha', 3: 'ashadha', 4: 'shravana', 5: 'bhadrapada', 6: 'ashvina', 7: 'kartika', 8: 'margashirsha', 9: 'pausha', 10: 'magha', 11: 'phalguna' };

  function nak28(l) {
    l = N(l);
    if (l >= 276 + 2 / 3 && l < 280 + 8 / 9) return 21;          // अभिजित्
    const i = nakOf(l);
    return i <= 20 ? i : i + 1;
  }
  function trimshamshaLord(sign, deg) {
    const odd = sign % 2 === 1;
    const parts = odd ? [[5, 'mars'], [10, 'saturn'], [18, 'jupiter'], [25, 'mercury'], [30, 'venus']]
                      : [[5, 'venus'], [12, 'mercury'], [20, 'jupiter'], [25, 'saturn'], [30, 'mars']];
    for (const [lim, p] of parts) if (deg < lim) return p;
    return parts[4][1];
  }

  // ── Reason labels ─────────────────────────────────────────────────────
  function labels(L) {
    return {
      nav: L('शुभ नवांश नहीं (श्लोक 84)', 'no auspicious navamsha (shl. 84)'),
      last: L('अन्तिम नवांश (85)', 'last navamsha (85)'),
      chara: L('चर लग्न-नवांश (85)', 'movable lagna & navamsha (85)'),
      badhir: L('बधिर लग्न (81)', 'deaf lagna (81)'), andha: L('अन्ध लग्न (81)', 'blind lagna (81)'), pangu: L('पंगु लग्न (81)', 'lame lagna (81)'),
      bhadra: L('भद्रा (विष्टि करण)', 'Bhadra (Vishti karana)'),
      rikta: L('रिक्ता तिथि (55)', 'Rikta tithi (55)'), amavasya: L('अमावस्या (55)', 'Amavasya (55)'),
      dagdha: L('दग्धा तिथि (66)', 'Dagdha tithi (66)'),
      nakshatra: L('अविहित नक्षत्र (55)', 'nakshatra not prescribed (55)'),
      yoga: L('व्यतीपात/वैधृति योग', 'Vyatipata/Vaidhriti yoga'),
      tGanda: L('तिथि गण्डान्त (43)', 'tithi gandanta (43)'), nGanda: L('नक्षत्र गण्डान्त (43)', 'nakshatra gandanta (43)'), lGanda: L('लग्न गण्डान्त (43)', 'lagna gandanta (43)'),
      vish: L('विषघटी (49–51)', 'Vishaghati (49–51)'),
      vedha: L('पञ्चशलाका वेध (56)', 'Panchashalaka vedha (56)'),
      krura: L('क्रूर-आक्रान्त/मुक्त/गन्तव्य नक्षत्र (58)', 'malefic-held nakshatra (58)'),
      latta: L('लत्ता (59)', 'Latta (59)'), pata: L('पात (60)', 'Pata (60)'), mahapata: L('महापात/क्रान्तिसाम्य (61)', 'Mahapata (61)'),
      ekargala: L('एकार्गल (62)', 'Ekargala (62)'), upagraha: L('उपग्रह (63)', 'Upagraha (63)'), dashayoga: L('दशयोग (70)', 'Dashayoga (70)'),
      bana: L('मृत्यु बाण (73–74)', 'Mrityu bana (73–74)'),
      sankranti: L('संक्रान्ति काल (79–80)', 'sankranti period (79–80)'),
      durmuhurta: L('दुर्मुहूर्त (54)', 'Durmuhurta (54)'), kulika: L('कुलिक (65)', 'Kulika (65)'), ardhayama: L('अर्धयाम (64)', 'Ardhayama (64)'),
      kartari: L('कर्तरी (44)', 'Kartari (44)'), sangraha: L('सङ्ग्रह — चन्द्र पाप-युत (45)', 'Sangraha (45)'),
      moon6812: L('चन्द्र 6/8/12 (21 दोष)', 'Moon 6/8/12'),
      ashtama: L('जन्म-राशि/लग्न से अष्टम (46–48)', '8th from natal sign/lagna (46–48)'),
      dwadasha: L('जन्म-राशि/लग्न से द्वादश (48)', '12th from natal sign/lagna (48)'),
      shadvarga: L('पाप षड्वर्ग (42)', 'malefic shadvarga (42)'),
      udayasta: L('उदयास्त शुद्धि नहीं (75–78)', 'no udayasta shuddhi (75–78)'),
      vishopaka: L('विशोपक बल 5 से कम (92)', 'vishopaka below 5 (92)'),
      janma: L('प्रथम-गर्भ का जन्म नक्षत्र/तिथि (14)', 'first-born\'s birth nakshatra/tithi (14)'),
      eclipse: L('ग्रहण के बाद 7 दिन', 'within 7 days after an eclipse')
    };
  }

  // ── The analysis ─────────────────────────────────────────────────────
  // ctx: { dStr, chart, lat, lon, tz, vivah, groom, bride, groomEldest, brideEldest, L }
  // groom/bride: { moonRashi, ascRashi, planets } (planets as in vmm profile: {sun:{sidereal,rashi},...})
  function analyzeDay(ctx) {
    const L = ctx.L || ((hi) => hi);
    const LBL = labels(L);
    const [y, mo, d] = ctx.dStr.split('-').map(Number);
    const ch = ctx.chart, tz = ctx.tz, lat = ctx.lat, lon = ctx.lon, vivah = ctx.vivah !== false;
    const ast = ch.astronomy || {};
    const ayan = typeof ast.ayanamsa_deg === 'number' ? ast.ayanamsa_deg : ctx.ayanamsa;
    const get = id => (ch.planets || []).find(p => p.id === id) || { abs: 0, speed: 0, retro: false, latitude: 0 };
    const P = {};
    [['sun', 'Sun'], ['moon', 'Moon'], ['mars', 'Mars'], ['mercury', 'Mercury'], ['jupiter', 'Jupiter'], ['venus', 'Venus'], ['saturn', 'Saturn'], ['rahu', 'Rahu'], ['ketu', 'Ketu']].forEach(([k, id]) => {
      const p = get(id);
      P[k] = { abs: p.abs, speed: typeof p.speed === 'number' ? p.speed : 0, retro: !!p.retro || k === 'rahu' || k === 'ketu', latitude: p.latitude || 0 };
    });
    const at = (k, min) => N(P[k].abs + P[k].speed * (min - 720) / 1440);
    const sunSpd = P.sun.speed || 0.9856, moonSpd = P.moon.speed || 13.18, rel = moonSpd - sunSpd;
    const noonSign = k => signOf(P[k].abs);
    const dayDoshas = [];   // { key, text, absolute }
    const addDay = (key, text, absolute = true) => dayDoshas.push({ key, text, absolute });

    // चान्द्र मास, अधिक मास
    const E0 = N(P.moon.abs - P.sun.abs);
    const sinceNM = E0 / rel, toNM = (360 - E0) / rel;
    const sunAtNM = signOf(P.sun.abs - sunSpd * sinceNM), sunAtNextNM = signOf(P.sun.abs + sunSpd * toNM);
    const month = MONTH_BY_SUN_SIGN[sunAtNM];
    const adhik = sunAtNM === sunAtNextNM;
    const tithiIdxNoon = Math.floor(E0 / 12);

    if (vivah) {
      // श्लोक 13 (p.316–317) विवाह मास: सूर्य मेष, वृष, मिथुन, वृश्चिक, मकर, कुम्भ में; मिथुन में केवल आषाढ़ शुक्ल 1–10;
      // हरिशयन (आषाढ़ शुक्ल 11) से देवोत्थान (कार्तिक शुक्ल 11) तक नहीं
      const ss = noonSign('sun');
      if (![1, 2, 3, 8, 10, 11].includes(ss)) addDay('month', L('विवाह मास नहीं — सूर्य ', 'Not a marriage month — Sun in ') + ss + L(' राशि में (श्लोक 13)', ' (shl. 13)'));
      else if (ss === 3 && !(month === 'ashadha' && tithiIdxNoon < 10)) addDay('month', L('मिथुन के सूर्य में केवल आषाढ़ शुक्ल 1–10 (श्लोक 13)', 'Sun in Gemini: only Ashadha Shukla 1–10 (shl. 13)'));
      if (['shravana', 'bhadrapada', 'ashvina'].includes(month) || (month === 'ashadha' && tithiIdxNoon >= 10) || (month === 'kartika' && tithiIdxNoon < 10))
        addDay('harishayan', L('हरिशयन / चातुर्मास (श्लोक 13)', 'Harishayan / Chaturmasa (shl. 13)'));
      if (adhik) addDay('adhik', L('अधिक (मल) मास', 'Adhika (mala) masa'));
      // गुरु / शुक्र अस्त (21 महादोष में "उदयास्त-शुद्धि रहित", p.356)
      if (angDist(P.jupiter.abs, P.sun.abs) < 11) addDay('guruAsta', L('गुरु अस्त', 'Jupiter combust'));
      if (angDist(P.venus.abs, P.sun.abs) < (P.venus.retro ? 8 : 10)) addDay('shukraAsta', L('शुक्र अस्त', 'Venus combust'));
      // श्लोक 79 (p.399–400) अयन/विषुव संक्रान्ति का पूर्व, वर्तमान, आगामी दिन
      const sNow = N(P.sun.abs);
      const tNext = (Math.floor(sNow / 30) * 30 + 30 - sNow) / sunSpd, tPrev = (sNow - Math.floor(sNow / 30) * 30) / sunSpd;
      const nextB = N(Math.floor(sNow / 30) * 30 + 30), prevB = Math.floor(sNow / 30) * 30;
      const dayOff = t => Math.floor((720 + t * 1440) / 1440);
      if ([0, 90, 180, 270].includes(nextB % 360) && Math.abs(dayOff(tNext)) <= 1) addDay('sankrantiDay', L('अयन/विषुव संक्रान्ति के निकट (श्लोक 79)', 'near a solstice/equinox sankranti (shl. 79)'));
      else if ([0, 90, 180, 270].includes(prevB % 360) && Math.abs(dayOff(-tPrev)) <= 1) addDay('sankrantiDay', L('अयन/विषुव संक्रान्ति के निकट (श्लोक 79)', 'near a solstice/equinox sankranti (shl. 79)'));
      // ग्रहण: ग्रहण के दिन से 7 दिन (p.364, "ग्रहणाद्दिनसप्तकम्")
      [[-E0 / rel, 0], [(360 - E0) / rel, 0], [(180 - E0) / rel, 180], [(540 - E0) / rel, 180], [(-180 - E0) / rel, 180]].forEach(([t, kind]) => {
        const off = dayOff(t);
        if (off > 0 || off < -7) return;
        const ml = N(P.moon.abs + moonSpd * t), rl = N(P.rahu.abs + P.rahu.speed * t);
        const beta = Math.abs(5.145 * Math.sin((ml - rl) * D2R));
        if ((kind === 0 && beta < 1.4) || (kind === 180 && beta < 0.6))
          addDay('eclipse', (kind === 0 ? L('सूर्य', 'Solar') : L('चन्द्र', 'Lunar')) + L(' ग्रहण के बाद 7 दिन', ' eclipse within the last 7 days'));
      });
      // श्लोक 15 (p.319) त्रिज्येष्ठ: ज्येष्ठ मास + ज्येष्ठ वर + ज्येष्ठा कन्या
      if (month === 'jyeshtha' && ctx.groomEldest && ctx.brideEldest) addDay('trijyeshtha', L('त्रिज्येष्ठ — ज्येष्ठ मास में दोनों ज्येष्ठ (श्लोक 15)', 'Tri-jyeshtha (shl. 15)'));
    }

    // प्रथम-गर्भ: जन्म नक्षत्र / तिथि / मास (श्लोक 14, p.318)
    const firstBorn = [];
    [[ctx.groomEldest, ctx.groom], [ctx.brideEldest, ctx.bride]].forEach(([eldest, prof]) => {
      if (!eldest || !prof || !prof.planets) return;
      const ps = prof.planets.sun.sidereal, pm = prof.planets.moon.sidereal;
      const e = N(pm - ps), bMonth = MONTH_BY_SUN_SIGN[signOf(ps - 0.9856 * e / 12.19)];
      firstBorn.push({ nak: nakOf(pm), tithi: Math.floor(e / 12), month: bMonth });
    });
    if (vivah) firstBorn.forEach(fb => { if (fb.month === month) addDay('janmaMasa', L('प्रथम-गर्भ के जन्म मास में (श्लोक 14)', 'in the first-born\'s birth month (shl. 14)')); });

    const absoluteDay = dayDoshas.some(x => x.absolute);

    // ── Lagna windows of the day ────────────────────────────────────────
    const ascAt = min => N(tropicalAscendant(localToJd(y, mo, d, min, tz), lat, lon) - ayan);
    const wins = [];
    { let start = 0, s = signOf(ascAt(0.5));
      for (let m = 1; m <= 1440; m++) {
        const s2 = m < 1440 ? signOf(ascAt(m + 0.5)) : -1;
        if (s2 !== s) { wins.push({ sign: s, from: start, to: m }); start = m; s = s2; }
      } }

    // Sunrise / sunset (engine, for this place)
    const sr = (ast.sunrise && ast.sunrise.sunrise_local_hrs != null ? ast.sunrise.sunrise_local_hrs : 6) * 60;
    const ss = (ast.sunset && ast.sunset.sunset_local_hrs != null ? ast.sunset.sunset_local_hrs : 18) * 60;
    const ratri = (ast.sunset && ast.sunset.ratrimana_hrs ? ast.sunset.ratrimana_hrs : 24 - (ss - sr) / 60) * 60;
    const din = ss - sr;
    const gregDay = new Date(y, mo - 1, d).getDay();

    // Graha sankranti windows (श्लोक 79–80)
    const sankWin = [];
    PLANETS.filter(k => k !== 'rahu' && k !== 'ketu').forEach(k => {
      const spd = P[k].speed; if (!spd) return;
      const half = (k === 'sun' ? 16 : SANKRANTI_GHATI[k] / 2) * 24;    // minutes each side
      const l = N(P[k].abs), base = Math.floor(l / 30) * 30;
      [base, base + 30].forEach(b => {
        const t = (b - l) / spd;                    // days from noon
        if (Math.abs(t) > 5) return;
        const cardinal = k === 'sun' && [0, 90, 180, 270].includes(N(b));
        if (cardinal) return;                       // whole days handled above
        const mm = 720 + t * 1440;
        sankWin.push([mm - half, mm + half]);
      });
    });

    // Pata nakshatras (श्लोक 60): moon nakshatras during which a पात-योग ends
    const sumAt = m => N(at('sun', m) + at('moon', m));
    const sumSpd = sunSpd + moonSpd;
    const pataCache = {};
    function isPataNak(min) {
      const ml = at('moon', min), n = nakOf(ml);
      if (n in pataCache) return pataCache[n];
      const ts = min - (N(ml) - n * NAKW) / moonSpd * 1440, te = min + ((n + 1) * NAKW - N(ml)) / moonSpd * 1440;
      const s0 = sumAt(ts);
      let hit = false;
      PATA_YOGA.forEach(yn => { const tb = ts + N(yn * NAKW - s0) / sumSpd * 1440; if (tb <= te) hit = true; });
      return (pataCache[n] = hit);
    }

    // Per-planet noon facts
    const pnak = {}, ppada = {};
    PLANETS.forEach(k => { pnak[k] = nakOf(P[k].abs); ppada[k] = padaOf(P[k].abs); });
    const combust = k => k !== 'sun' && k !== 'moon' && k !== 'rahu' && k !== 'ketu' && angDist(P[k].abs, P.sun.abs) < ({ mars: 17, mercury: 14, jupiter: 11, venus: 10, saturn: 15 })[k];
    const weak = k => {
      if (k === 'rahu' || k === 'ketu') return false;
      const s = noonSign(k);
      return DEBIL[k] === s || (ENEMIES[k] || []).includes(LORD[s]) || combust(k);
    };

    // Natal 8th / 12th (श्लोक 46–48)
    const natal = [];
    [ctx.groom, ctx.bride].forEach(p => { if (p) { if (p.ascRashi) natal.push(p.ascRashi); if (p.moonRashi) natal.push(p.moonRashi); } });

    wins.forEach(w => {
      w.segs = []; w.why = new Set(); w.faults = [];
      const mid = (w.from + w.to) / 2;
      const ms = signOf(at('moon', mid));
      const sOf = k => k === 'moon' ? ms : noonSign(k);
      const hOf = k => houseFrom(w.sign, sOf(k));
      const lord = LORD[w.sign];
      // श्लोक 86 (p.403–404) वर्जित ग्रह-स्थान, अपवाद श्लोक 88 (p.407–408)
      const nm = { sun: L('सूर्य', 'Sun'), moon: L('चन्द्र', 'Moon'), mars: L('मंगल', 'Mars'), mercury: L('बुध', 'Mercury'), jupiter: L('गुरु', 'Jupiter'), venus: L('शुक्र', 'Venus'), saturn: L('शनि', 'Saturn'), rahu: L('राहु', 'Rahu'), ketu: L('केतु', 'Ketu') };
      const moonNav = signOf(at('moon', mid) * 9);
      const moonExempt = ms === 8 || moonNav === 8;   // 88: नीच राशि/नीच नवांश का चन्द्र
      const f = w.faults;
      if (hOf('saturn') === 12) f.push(nm.saturn + ' 12');
      if (hOf('mars') === 10) f.push(nm.mars + ' 10');
      if (hOf('venus') === 3) f.push(nm.venus + ' 3');
      ['moon', 'sun', 'mars', 'saturn', 'rahu', 'ketu'].forEach(k => { if (hOf(k) === 1 && !(k === 'moon' && moonExempt)) f.push(nm[k] + ' ' + L('लग्न में', 'in lagna')); });
      [...new Set([lord, 'venus', 'moon'])].forEach(k => {
        if (hOf(k) !== 6) return;
        if (k === 'venus' && weak('venus')) return;      // 88
        if (k === 'moon' && moonExempt) return;          // 88
        f.push(nm[k] + ' 6');
      });
      [...new Set(['moon', lord, 'mercury', 'jupiter', 'venus', 'mars'])].forEach(k => {
        if (hOf(k) !== 8) return;
        if (k === 'mars' && weak('mars')) return;        // 88
        if (k === 'moon' && moonExempt) return;          // 88
        f.push(nm[k] + ' 8');
      });
      if (hOf('moon') === 12 && !moonExempt) f.push(nm.moon + ' 12');
      ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'].forEach(k => { if (hOf(k) === 7) f.push(nm[k] + ' 7'); });
      // श्लोक 44 (p.366–369) कर्तरी: 12वें मार्गी पाप + 2रे वक्री पाप; अपवाद 88 (दोनों दुर्बल)
      const in12 = PAPA.filter(k => hOf(k) === 12 && !P[k].retro), in2 = PAPA.filter(k => hOf(k) === 2 && P[k].retro);
      if (in12.some(a => in2.some(b => !(weak(a) && weak(b))))) f.push(LBL.kartari);
      // श्लोक 45 (p.369–370) सङ्ग्रह; परिहार: चन्द्र स्वक्षेत्र/उच्च/मित्रक्षेत्र में
      if (!(ms === 4 || ms === 2 || ['sun', 'mercury'].includes(LORD[ms]))) {
        const withMoon = ['sun', 'mars', 'saturn', 'rahu', 'ketu', 'venus'].filter(k => sOf(k) === ms);
        if (withMoon.length) f.push(LBL.sangraha + ': ' + withMoon.map(k => nm[k]).join(', '));
      }
      // श्लोक 46–47 (p.370–371) जन्म-राशि/लग्न से अष्टम लग्न; परिहार: एक स्वामी या मैत्री
      natal.forEach(J => {
        const e8 = sgn(J, 7);
        if (w.sign === e8 && !(LORD[e8] === LORD[J] || (isFriend(LORD[e8], LORD[J]) && isFriend(LORD[J], LORD[e8])))) f.push(LBL.ashtama);
        // 48: अष्टमेश / द्वादशेश लग्न में
        if (sOf(LORD[e8]) === w.sign) f.push(LBL.ashtama + ' — ' + nm[LORD[e8]]);
        if (sOf(LORD[sgn(J, 11)]) === w.sign) f.push(LBL.dwadasha + ' — ' + nm[LORD[sgn(J, 11)]]);
      });
      w.faults = [...new Set(f)];
      // श्लोक 83 (p.401–402): लग्नेश/गुरु की दृष्टि — अन्ध/बधिर/पंगु नहीं
      w.sensoryCancelled = aspects(lord, sOf(lord), w.sign) || aspects('jupiter', sOf('jupiter'), w.sign);
      // श्लोक 90–91 (p.410): गुरु केन्द्र/त्रिकोण, सप्तम छोड़कर
      w.jupiterParihar = [1, 4, 5, 9, 10].includes(hOf('jupiter'));
      // श्लोक 89 (p.408–409): बुध/गुरु/शुक्र केन्द्र-त्रिकोण में — रिक्ता, दग्धा, क्रूर-युत नक्षत्र, अन्ध-बधिर लग्न के दोष नहीं
      w.benKendra = ['mercury', 'jupiter', 'venus'].some(k => [1, 4, 5, 9, 10].includes(hOf(k)));
      // श्लोक 71 (p.393) दशयोग परिहार: गुरु लग्नेश, या शुक्र/गुरु लग्न में या लग्न को देखें, या केन्द्र में
      w.dashayogaParihar = lord === 'jupiter' || ['venus', 'jupiter'].some(k => seesOrIn(k, sOf(k), w.sign) || [1, 4, 7, 10].includes(hOf(k)));
      // श्लोक 87, 92 (p.405–412) विशोपक बल
      const good = { sun: [3, 6, 8, 11], saturn: [3, 6, 8, 11], rahu: [3, 6, 8, 11], ketu: [3, 6, 8, 11], mars: [3, 6, 11], moon: [2, 3, 11], venus: [1, 2, 4, 5, 9, 10, 11] };
      const okHouse = k => (k === 'mercury' || k === 'jupiter') ? ![7, 8, 12].includes(hOf(k)) : good[k].includes(hOf(k));
      w.vishopaka = (okHouse('mercury') ? 2 : 0) + (okHouse('venus') ? 2 : 0) + (okHouse('moon') ? 5 : 0) + (okHouse('sun') ? 3.5 : 0)
        + (okHouse('jupiter') ? 3 : 0) + (okHouse('saturn') ? 1.5 : 0) + (okHouse('mars') ? 1.5 : 0) + ((okHouse('rahu') || okHouse('ketu')) ? 1.5 : 0);
      w.moonHouse = hOf('moon');
      w.sOf = sOf;
    });

    // ── Minute by minute ────────────────────────────────────────────────
    let cur = null;
    for (let m = 0; m < 1440; m++) {
      const t = m + 0.5;
      const w = wins.find(x => m >= x.from && m < x.to) || wins[wins.length - 1];
      const why = [];
      const sl = at('sun', t), ml = at('moon', t);
      const E = N(ml - sl), tIdx = Math.floor(E / 12), tNum = tIdx % 15 + 1;
      const yoga = Math.floor(N(sl + ml) / NAKW) + 1;
      const mN = nakOf(ml), mP = padaOf(ml), sN = nakOf(sl), sP = padaOf(sl);
      const asc = ascAt(t), aSign = signOf(asc), aDeg = asc % 30;
      const navIdx = Math.floor(aDeg / (30 / 9)), nav = (Math.floor(asc * 9 / 30) % 12) + 1;

      // Time of day: muhurta numbers
      let isDay, muh, wd;
      if (t >= sr && t < ss) { isDay = true; muh = Math.floor((t - sr) / (din / 15)) + 1; wd = gregDay; }
      else if (t >= ss) { isDay = false; muh = Math.floor((t - ss) / (ratri / 15)) + 1; wd = gregDay; }
      else { isDay = false; muh = Math.floor((t - (sr - ratri)) / (ratri / 15)) + 1; wd = (gregDay + 6) % 7; }
      const abhijit = isDay && muh === 8 && wd !== 3;

      // नवांश / लग्न (84, 85, 81)
      let grade = GOOD_NAV[nav] || null;
      if (!grade) why.push('nav');
      if (grade && navIdx === 8 && nav !== aSign) { grade = null; why.push('last'); }
      if (grade && [7, 10].includes(signOf(ml)) && CHARA.includes(aSign) && CHARA.includes(nav)) { grade = null; why.push('chara'); }
      if (grade && !w.sensoryCancelled && !w.benKendra) { const s = (isDay ? DAY_SENSE : NIGHT_SENSE)[aSign]; if (s) { grade = null; why.push(s); } }
      if (grade && w.faults.length) grade = null;
      if (grade && w.vishopaka < 5) { grade = null; why.push('vishopaka'); }

      if (vivah && grade) {
        const chk = (cond, key) => { if (cond) why.push(key); };
        // पञ्चाङ्ग
        const k = Math.floor(E / 6);
        chk(k >= 1 && k <= 56 && (k - 1) % 7 === 6, 'bhadra');
        chk([4, 9, 14].includes(tNum) && tIdx !== 29 && !w.benKendra, 'rikta');
        chk(tIdx === 29, 'amavasya');
        chk(DAGDHA[signOf(sl)] === tNum && !w.benKendra, 'dagdha');
        chk(!VIVAH_NAK.includes(mN), 'nakshatra');
        chk(yoga === 17 || yoga === 27, 'yoga');
        // गण्डान्त (43): तिथि ±1 घटी (चन्द्र बली हो तो नहीं), नक्षत्र ±2 घटी, लग्न ±½ घटी (गुरु बली हो तो नहीं); अभिजित् में नहीं
        if (!abhijit) {
          const moonStrong = signOf(ml) === 4 || signOf(ml) === 2;
          const jupStrong = [9, 12, 4].includes(noonSign('jupiter'));
          chk(!moonStrong && [0, 60, 120, 180, 240, 300, 360].some(b => Math.abs(E - b) < 0.2), 'tGanda');
          chk([0, 120, 240, 360].some(b => Math.abs(N(ml) - b) < 2 / 60 * NAKW || Math.abs(N(ml) - b) > 360 - 2 / 60 * NAKW), 'nGanda');
          const nearEdge = wins.some(x => [4, 8, 12].includes(x.sign) && x.to < 1440 && Math.abs(t - x.to) < 12);
          chk(!jupStrong && nearEdge, 'lGanda');
        }
        // विषघटी (49–51); परिहार: चन्द्र लग्न से केन्द्र/त्रिकोण (लग्न छोड़कर)
        const g = (N(ml) % NAKW) / NAKW * 60;
        chk(g >= VISH[mN] && g < VISH[mN] + 4 && ![4, 5, 7, 9, 10].includes(w.moonHouse), 'vish');
        // पञ्चशलाका वेध (56)
        const m28 = nak28(ml), partner = VEDHA[m28];
        if (partner !== undefined) {
          const hit = ['sun', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'].some(pk => {
            if (nak28(P[pk].abs) !== partner) return false;
            return KRURA.includes(pk) ? true : (5 - ppada[pk]) === mP;
          });
          chk(hit, 'vedha');
        }
        // क्रूर-आक्रान्त / मुक्त / गन्तव्य (58); अपवाद: चन्द्र प्रथम पाद, क्रूर तृतीय पाद; परिहार 89
        if (!w.benKendra) chk(KRURA.some(pk => {
          const dir = P[pk].speed < 0 ? -1 : 1, pn = pnak[pk];
          if (mN === pn) return !(mP === 1 && ppada[pk] === 3);
          return mN === (pn - dir + 27) % 27 || mN === (pn + dir + 27) % 27;
        }), 'krura');
        // लत्ता (59, 64: केवल ग्रह-चरण तुल्य चरण)
        chk(Object.entries(LATTA).some(([pk, off]) => mN === (pnak[pk] + off + 27 * 2) % 27 && mP === ppada[pk]), 'latta');
        // पात (60, 64: सूर्य-चरण तुल्य चरण)
        chk(isPataNak(t) && mP === sP, 'pata');
        // महापात / क्रान्तिसाम्य (61)
        { const S = N(sl + ayan), M = N(ml + ayan), sum = N(S + M);
          if (Math.abs(sum - 180) < 25 || sum < 25 || sum > 335) {
            const beta = 5.145 * Math.sin((ml - at('rahu', t)) * D2R);
            chk(Math.abs(Math.abs(declination(S, 0)) - Math.abs(declination(M, beta))) < 0.53, 'mahapata');
          } }
        // एकार्गल (62): दुष्ट योग + सूर्य-नक्षत्र से चन्द्र-नक्षत्र विषम (अभिजित् सहित)
        chk(EKARGALA_YOGA.includes(yoga) && ((nak28(ml) - nak28(sl) + 28) % 28 + 1) % 2 === 1, 'ekargala');
        // उपग्रह (63, 64: सूर्य-चरण तुल्य चरण)
        chk(UPAGRAHA.includes((mN - sN + 27) % 27 + 1) && mP === sP, 'upagraha');
        // दशयोग (70), परिहार 71
        chk(DASHAYOGA.includes(((sN + 1) + (mN + 1)) % 27) && !w.dashayogaParihar, 'dashayoga');
        // मृत्यु बाण (73–74): सूर्य के गत अंश + 4, ÷ 9, शेष 5
        chk((Math.floor(N(sl) % 30) + 4) % 9 === 5, 'bana');
        // संक्रान्ति काल (79–80)
        chk(sankWin.some(([a, b]) => t >= a && t <= b), 'sankranti');
        // दुर्मुहूर्त (54), कुलिक (65), अर्धयाम (64)
        if (isDay) {
          chk((DURMUHURTA_DAY[wd] || []).includes(muh), 'durmuhurta');
          chk(KULIKA_DAY[wd] === muh || (wd === 6 && muh === 15), 'kulika');
          chk(Math.floor((t - sr) / (din / 8)) + 1 === ARDHAYAMA[wd], 'ardhayama');
        } else {
          chk((DURMUHURTA_NIGHT[wd] || []).includes(muh), 'durmuhurta');
          chk(KULIKA_NIGHT[wd] === muh, 'kulika');
        }
        // पाप षड्वर्ग (42)
        { const lords = [LORD[aSign],
            (aSign % 2 === 1) === (aDeg < 15) ? 'sun' : 'moon',
            LORD[sgn(aSign, aDeg < 10 ? 0 : aDeg < 20 ? 4 : 8)],
            LORD[nav],
            LORD[sgn(aSign, Math.floor(aDeg / 2.5))],
            trimshamshaLord(aSign, aDeg)];
          const ben = lords.filter(x => BENEFIC.includes(x)).length;
          chk(lords.length - ben > ben, 'shadvarga'); }
        // उदयास्त शुद्धि (75–78)
        { const sOf = w.sOf, NL = LORD[nav], N7 = sgn(nav, 6), L7 = sgn(aSign, 6), N7L = LORD[N7], LL = LORD[aSign];
          const friendSees = (lordK, target) => BENEFIC.some(b => isFriend(lordK, b) && seesOrIn(b, sOf(b), target));
          const groomOk = seesOrIn(NL, sOf(NL), nav) || seesOrIn(NL, sOf(NL), aSign) || seesOrIn(LL, sOf(LL), aSign) || friendSees(NL, nav) || friendSees(LL, aSign);
          const brideOk = seesOrIn(N7L, sOf(N7L), N7) || seesOrIn(N7L, sOf(N7L), L7) || seesOrIn(LL, sOf(LL), L7) || friendSees(N7L, N7) || friendSees(LORD[L7], L7);
          chk(!(groomOk && brideOk), 'udayasta'); }
        // प्रथम-गर्भ का जन्म नक्षत्र / तिथि (14)
        chk(firstBorn.some(fb => fb.nak === mN || fb.tithi === tIdx), 'janma');
        if (why.length) grade = null;
      }
      why.forEach(k => w.why.add(k));
      if (absoluteDay && vivah) grade = null;
      if (grade) {
        if (cur && cur.w === w && cur.nav === nav && cur.to === m) cur.to = m + 1;
        else { cur = { w, nav, grade, from: m, to: m + 1, vishopaka: w.vishopaka }; w.segs.push(cur); }
      } else cur = null;
    }
    wins.forEach(w => { w.segs.forEach(sg => delete sg.w); delete w.sOf; });

    return { dayDoshas, wins, month, adhik, labels: LBL };
  }

  // Couple-level warnings (not date-based) — श्लोक 15, 19–20 (p.319, 328–329)
  function coupleWarnings(groom, bride, groomEldest, brideEldest, L) {
    L = L || (hi => hi);
    const out = [];
    const chk = (prof, isBride) => {
      if (!prof || !prof.nakshatraIdx) return;
      const n = prof.nakshatraIdx, p = prof.pada, who = isBride ? L('वधू', 'Bride') : L('वर', 'Groom');
      if (n === 9 && p !== 1) out.push(who + L(' — आश्लेषा जन्म: सास के लिए अनिष्ट (श्लोक 19–20; प्रथम चरण में दोष नहीं)', ' — born in Ashlesha: harmful to mother-in-law (19–20)'));
      if (n === 19 && p !== 4) out.push(who + L(' — मूल जन्म: ससुर के लिए अनिष्ट (श्लोक 19–20; चतुर्थ चरण में दोष नहीं)', ' — born in Mula: harmful to father-in-law (19–20)'));
      if (isBride && n === 18) out.push(who + L(' — ज्येष्ठा जन्म: जेठ के लिए अनिष्ट (श्लोक 19)', ' — born in Jyeshtha: harmful to husband\'s elder brother (19)'));
      if (isBride && n === 16 && p === 4) out.push(who + L(' — विशाखा चतुर्थ चरण: देवर के लिए अनिष्ट (श्लोक 19–20)', ' — Vishakha 4th pada: harmful to husband\'s younger brother (19–20)'));
    };
    chk(groom, false); chk(bride, true);
    if (groomEldest && brideEldest) out.push(L('ज्येष्ठ वर व ज्येष्ठा कन्या: ज्येष्ठ मास में विवाह कदापि नहीं (श्लोक 15); गर्ग के मत से दोनों ज्येष्ठों का परस्पर विवाह भी निषिद्ध', 'Eldest son & eldest daughter: never in Jyeshtha month (15); Garga forbids it altogether'));
    return out;
  }

  const api = { analyzeDay, coupleWarnings, VIVAH_NAK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.VivahShuddhi = api;
})(typeof window !== 'undefined' ? window : globalThis);
