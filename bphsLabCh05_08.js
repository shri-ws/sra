/**
 * BPHS Lab — Chapters 5–8 rule engine
 *   5 राशिशील (rashi qualities)        6 षोडशवर्ग (the sixteen divisions)
 *   7 वर्गविवेचन (vimshopaka, bhava names) 8 दृष्टिभेद (rashi drishti)
 * ─────────────────────────────────────────────────────────────
 * Every rule follows the printed verse (book numbering, data/bphs/bphs.json)
 * and returns the verse ids it came from. Where a verse leaves a detail open,
 * the choice is marked `interpretation` so the page can say so.
 * Signs are 0-based (0 = मेष … 11 = मीन); degrees are within the sign (0–30).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BphsLabCh05_08 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const V = (ch, n) => `BPHS.${ch}.${n}`;
  const SIGN_HI = ['मेष', 'वृष', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const NAME_HI = { Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु', Lagna: 'लग्न' };
  const EXALT_SIGN = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const isOdd = s => s % 2 === 0; // मेष (0) is the first, odd sign
  const modality = s => s % 3;    // 0 चर, 1 स्थिर, 2 द्विस्वभाव
  const MODALITY_HI = ['चर', 'स्थिर', 'द्विस्वभाव'];

  // ── Chapter 5 ────────────────────────────────────────────────
  /** 5.4–5: the limb of काल-पुरुष ruled by each sign. */
  const BODY = ['सिर', 'मुख', 'भुजाएँ', 'हृदय', 'पेट', 'कमर', 'बस्ति', 'गुह्य अंग', 'जाँघें', 'घुटने', 'पिंडलियाँ', 'पैर'];
  /** 5.6: पित्त, वात, त्रिधातु, कफ, repeating from मेष. */
  const PRAKRITI = ['पित्त', 'वात', 'त्रिधातु (मिश्र)', 'कफ'];

  /** The rules of 5.4–6 that hold for every sign by its position. */
  function signBasics(s) {
    return {
      sign: s, name: SIGN_HI[s], lord: SIGN_LORD[s],
      body: BODY[s], bodyVerses: [V(5, 4), V(5, 5)],
      modality: MODALITY_HI[modality(s)], nature: isOdd(s) ? 'क्रूर' : 'सौम्य', gender: isOdd(s) ? 'पुरुष' : 'स्त्री', basicsVerses: [V(5, 5)],
      prakriti: PRAKRITI[s % 4], prakritiVerses: [V(5, 6)]
    };
  }

  /** काल-पुरुष on a chart: which limbs (signs) hold which planets. */
  function kalapurusha(chart) {
    const rows = BODY.map((b, s) => ({ sign: s, name: SIGN_HI[s], body: b, planets: [] }));
    chart.planets.forEach(p => { if (NAME_HI[p.id]) rows[p.sign].planets.push(p.id); });
    return { rows, verses: [V(5, 4), V(5, 5)] };
  }

  /** 5.5: how the planets spread over चर/स्थिर/द्विस्वभाव and क्रूर/सौम्य signs. */
  function signSpread(chart) {
    const out = { modality: [0, 0, 0], odd: 0, even: 0, list: { modality: [[], [], []], odd: [], even: [] } };
    chart.planets.filter(p => SEVEN.includes(p.id) || p.id === 'Rahu' || p.id === 'Ketu').forEach(p => {
      out.modality[modality(p.sign)]++; out.list.modality[modality(p.sign)].push(p.id);
      if (isOdd(p.sign)) { out.odd++; out.list.odd.push(p.id); } else { out.even++; out.list.even.push(p.id); }
    });
    return Object.assign(out, { verses: [V(5, 5)] });
  }

  /**
   * 5.27–29: time of निषेक (conception) before birth, read as the book's own worked example does:
   *   A = मान्दि − शनि (distance from Saturn forward to Mandi);
   *   B = लग्न − नवम भाव (distance from the 9th bhava forward to the lagna);
   *   A + B in signs/degrees/minutes = months/days/ghatis before birth.
   *   If the lagna lord is in the unseen half (houses 1–6), add the degrees the Moon has run in its sign (as days).
   * bhavas: the engine's sripatiBhavas ({house, mid}); the 9th bhava is taken at its madhya.
   */
  function nisheka({ saturnAbs, mandiAbs, lagnaAbs, bhavas, lagnaLordHouse, moonDeg }) {
    const n360 = x => ((x % 360) + 360) % 360;
    const ninth = bhavas.find(b => b.house === 9);
    const A = n360(mandiAbs - saturnAbs);
    const B = n360(lagnaAbs - ninth.mid);
    const unseen = lagnaLordHouse >= 1 && lagnaLordHouse <= 6;
    const moonAdd = unseen ? moonDeg : 0;
    const total = n360(A + B) + moonAdd;
    const months = Math.floor(total / 30);
    const days = Math.floor(total % 30);
    const ghatis = ((total % 30) - days) * 60;
    return {
      A, ninthMid: ninth.mid, B, sumAB: n360(A + B), wrapped: A + B >= 360,
      unseen, moonAdd, total, months, days, ghatis, totalDays: months * 30 + days + ghatis / 60,
      verses: [V(5, 27), V(5, 28)], lagnaVerses: [V(5, 29)],
      interpretation: [
        'मान्दि को गुलिक ही लिया है (4.15), और नवम भाव को उसका मध्य (श्रीपति भाव)।',
        '1 राशि = 1 मास, 1 अंश = 1 दिन, 1 कला = 1 घटी; तारीख़ निकालने में मास को 30 दिन का लिया है।',
        "'अदृश्य दल' को लग्न से आगे की छह राशियाँ (भाव 1–6) और चन्द्र के 'भुक्त भाग' को उसकी राशि में बीते अंश लिया है।",
        'दोनों अन्तरों का जोड़ 12 राशि से अधिक हो तो 12 घटाया है; यह बात श्लोक में नहीं कही गई।'
      ]
    };
  }

  // ── Chapter 6: the sixteen vargas ─────────────────────────────
  const D7_DEV = ['क्षार', 'क्षीर', 'दधि', 'आज्य (घी)', 'इक्षुरस', 'मद्य', 'शुद्ध जल'];
  const D10_DEV = ['इन्द्र', 'अग्नि', 'यम', 'राक्षस', 'वरुण', 'मरुत्', 'कुबेर', 'ईशान', 'ब्रह्मा', 'अनन्त'];
  const D20_ODD = ['काली', 'गौरी', 'जया', 'लक्ष्मी', 'विजया', 'विमला', 'सती', 'तारा', 'ज्वालामुखी', 'श्वेता', 'ललिता', 'बगलामुखी', 'प्रत्यङ्गिरा', 'शची', 'रौद्री', 'भवानी', 'वरदा', 'जया', 'त्रिपुरा', 'सुमुखी'];
  const D20_EVEN = ['दया', 'मेधा', 'छिन्नशीर्षा', 'पिशाचिनी', 'धूमावती', 'मातङ्गी', 'बाला', 'भद्रा', 'अरुणा', 'अनला', 'पिङ्गला', 'छुच्छुका', 'घोरा', 'वाराही', 'वैष्णवी', 'सिता', 'भुवनेशी', 'भैरवी', 'मङ्गला', 'अपराजिता'];
  const D24_DEV = ['स्कन्द', 'पर्शुधर', 'अनल', 'विश्वकर्मा', 'भग', 'मित्र', 'मय', 'अन्तक', 'वृषध्वज', 'गोविन्द', 'मदन', 'भीम'];
  const D40_DEV = ['विष्णु', 'चन्द्र', 'मरीचि', 'त्वष्टा', 'धाता', 'शिव', 'रवि', 'यम', 'यक्षेश', 'गन्धर्व', 'काल', 'वरुण'];
  const D45_DEV = [['ब्रह्मा', 'ईश', 'केशव'], ['ईश', 'अच्युत', 'सुरज्येष्ठ'], ['विष्णु', 'क (ब्रह्मा)', 'ईश']];
  // 6.34–39, read so that the names come to sixty: 'मृत्युकाल' (6.36) is taken as one name.
  const D60_DEV = ['घोर', 'राक्षस', 'देव', 'कुबेर', 'यक्ष', 'किन्नर', 'भ्रष्ट', 'कुलघ्न', 'गरल', 'वह्नि', 'माया', 'पुरीषक',
    'अपांपति', 'मरुत्वान्', 'काल', 'सर्प', 'अमृत', 'इन्दु', 'मृदु', 'कोमल', 'हेरम्ब', 'ब्रह्मा', 'विष्णु', 'महेश्वर',
    'देव', 'आर्द्र', 'कलिनाश', 'क्षितीश', 'कमलाकर', 'गुलिक', 'मृत्युकाल', 'दावाग्नि', 'घोर', 'यम', 'कण्टक', 'सुधा',
    'अमृत', 'पूर्णनिशाकर', 'विषदग्ध', 'कुलान्त', 'मुख्य', 'वंशक्षय', 'उत्पात', 'काल', 'सौम्य', 'कोमल', 'शीतल', 'करालदंष्ट्र',
    'चन्द्रास्य', 'प्रवीण', 'कालपावक', 'दण्डभृत्', 'निर्मल', 'सौम्य', 'क्रूर', 'अतिशीतल', 'अमृत', 'पयोधि', 'भ्रमण', 'चन्द्ररेखा'];
  const D30_ODD = [[5, 'Mars', 0, 'वह्नि'], [10, 'Saturn', 10, 'समीर'], [18, 'Jupiter', 8, 'शक्र'], [25, 'Mercury', 2, 'धनद'], [30, 'Venus', 6, 'जलद']];
  const D30_EVEN = [[5, 'Venus', 1, 'जलद'], [12, 'Mercury', 5, 'धनद'], [20, 'Jupiter', 11, 'शक्र'], [25, 'Saturn', 9, 'समीर'], [30, 'Mars', 7, 'वह्नि']];

  /** The sixteen vargas in the order of 6.3–4, each with its rule. */
  const VARGAS = [
    { key: 'D1', n: 1, name: 'क्षेत्र (राशि)', verses: [V(6, 3), V(6, 5)] },
    { key: 'D2', n: 2, name: 'होरा', verses: [V(6, 5), V(6, 6)] },
    { key: 'D3', n: 3, name: 'द्रेष्काण', verses: [V(6, 7), V(6, 8)] },
    { key: 'D4', n: 4, name: 'तुर्यांश', verses: [V(6, 9)] },
    { key: 'D7', n: 7, name: 'सप्तमांश', verses: [V(6, 10), V(6, 11)] },
    { key: 'D9', n: 9, name: 'नवांश', verses: [V(6, 12)] },
    { key: 'D10', n: 10, name: 'दशमांश', verses: [V(6, 13), V(6, 14)] },
    { key: 'D12', n: 12, name: 'द्वादशांश', verses: [V(6, 15), V(6, 16)] },
    { key: 'D16', n: 16, name: 'षोडशांश', verses: [V(6, 16)] },
    { key: 'D20', n: 20, name: 'विंशांश', verses: [V(6, 17), V(6, 18), V(6, 19), V(6, 20), V(6, 21)] },
    { key: 'D24', n: 24, name: 'चतुर्विंशांश (सिद्धांश)', verses: [V(6, 22), V(6, 23), V(6, 24)] },
    { key: 'D27', n: 27, name: 'भांश', verses: [V(6, 24), V(6, 25), V(6, 26)] },
    { key: 'D30', n: 30, name: 'त्रिंशांश', verses: [V(6, 27), V(6, 28)] },
    { key: 'D40', n: 40, name: 'खवेदांश', verses: [V(6, 29), V(6, 30)] },
    { key: 'D45', n: 45, name: 'अक्षवेदांश', verses: [V(6, 31), V(6, 32)] },
    { key: 'D60', n: 60, name: 'षष्ट्यंश', verses: [V(6, 33), V(6, 34), V(6, 40)] }
  ];

  /** Sign, lord and deity of one varga for a body at `deg` degrees of sign `s`. */
  function varga(key, s, deg) {
    const v = VARGAS.find(x => x.key === key);
    const odd = isOdd(s), m = modality(s);
    const part = n => Math.min(n - 1, Math.floor(deg / (30 / n)));
    let sign, lord = null, deity = null, interpretation = null, p = 0;
    switch (key) {
      case 'D1': sign = s; break;
      case 'D2': {
        p = deg < 15 ? 0 : 1;
        const sun = odd ? p === 0 : p === 1;
        lord = sun ? 'Sun' : 'Moon'; sign = sun ? 4 : 3; deity = sun ? 'देव' : 'पितर';
        interpretation = 'सूर्य की होरा सिंह और चन्द्र की कर्क मानी है। 6.7 की पहली पंक्ति मेष से दो आवृत्ति वाली होरा भी बताती है।';
        break;
      }
      case 'D3': p = part(3); sign = (s + [0, 4, 8][p]) % 12; deity = ['नारद', 'अगस्ति', 'दुर्वासा'][p];
        interpretation = 'तीनों देवता हर राशि के पहले, दूसरे और तीसरे द्रेष्काण के लिए क्रम से लिए हैं।'; break;
      case 'D4': p = part(4); sign = (s + 3 * p) % 12; deity = ['सनक', 'सनन्द', 'कुमार', 'सनातन'][p]; break;
      case 'D7': p = part(7); sign = ((odd ? s : s + 6) + p) % 12; deity = odd ? D7_DEV[p] : D7_DEV[6 - p]; break;
      case 'D9': p = part(9); sign = ([s, s + 8, s + 4][m] + p) % 12; deity = ['देव', 'नर', 'राक्षस'][(p + m) % 3];
        interpretation = 'देव-नर-राक्षस का चक्र चर में देव से, स्थिर में नर से और द्विस्वभाव में राक्षस से आरम्भ माना है।'; break;
      case 'D10': p = part(10); sign = ((odd ? s : s + 8) + p) % 12; deity = odd ? D10_DEV[p] : D10_DEV[9 - p]; break;
      case 'D12': p = part(12); sign = (s + p) % 12; deity = ['गणेश', 'अश्विनीकुमार', 'यम', 'सर्प'][p % 4]; break;
      case 'D16': p = part(16); sign = ([0, 4, 8][m] + p) % 12; deity = (odd ? ['ब्रह्मा', 'विष्णु', 'हर', 'सूर्य'] : ['सूर्य', 'हर', 'विष्णु', 'ब्रह्मा'])[p % 4]; break;
      case 'D20': p = part(20); sign = ([0, 8, 4][m] + p) % 12; deity = (odd ? D20_ODD : D20_EVEN)[p]; break;
      case 'D24': p = part(24); sign = ((odd ? 4 : 3) + p) % 12; deity = odd ? D24_DEV[p % 12] : D24_DEV[11 - (p % 12)]; break;
      case 'D27': p = part(27); sign = ([0, 3, 6, 9][s % 4] + p) % 12;
        interpretation = 'मेष आदि चर राशियों से गणना: अग्नि राशियाँ मेष से, पृथ्वी कर्क से, वायु तुला से, जल मकर से। श्लोक 24–26 में अभिजित् सहित 28 देवता हैं, इसलिए भागों से उनका मिलान नहीं दिखाया।'; break;
      case 'D30': {
        const row = (odd ? D30_ODD : D30_EVEN).find(r => deg < r[0]) || (odd ? D30_ODD : D30_EVEN)[4];
        lord = row[1]; sign = row[2]; deity = row[3];
        p = (odd ? D30_ODD : D30_EVEN).indexOf(row);
        interpretation = 'श्लोक स्वामी बताता है; राशि विषम में स्वामी की विषम राशि और सम में सम राशि मानी है।'; break;
      }
      case 'D40': p = part(40); sign = ((odd ? 0 : 6) + p) % 12; deity = D40_DEV[p % 12]; break;
      case 'D45': p = part(45); sign = ([0, 4, 8][m] + p) % 12; deity = D45_DEV[m][p % 3]; break;
      case 'D60': p = Math.min(59, Math.floor(deg * 2)); sign = (s + p) % 12; deity = odd ? D60_DEV[p] : D60_DEV[59 - p];
        interpretation = "श्लोक 36 का 'मृत्युकाल' एक नाम लिया है, जिससे नाम साठ होते हैं।"; break;
      default: throw new Error('unknown varga ' + key);
    }
    return { key, n: v.n, name: v.name, part: p + 1, sign, signName: SIGN_HI[sign], lord: lord || SIGN_LORD[sign], deity, interpretation, verses: v.verses };
  }

  const allVargas = (s, deg) => VARGAS.map(v => varga(v.key, s, deg));

  /** A planet's standing in one varga sign: own or exaltation sign, else its relation to the sign lord. */
  function vargaStanding(planet, vSign, vLord, relations) {
    if (EXALT_SIGN[planet] === vSign) return { key: 'exalt', label: 'उच्च' };
    if ((EXALT_SIGN[planet] + 6) % 12 === vSign) return { key: 'debil', label: 'नीच' };
    if (vLord === planet) return { key: 'own', label: 'स्वगृह' };
    if (!relations) return { key: 'other', label: '' };
    const c = relations[planet][vLord].compound;
    return { key: c, label: { adhimitra: 'अधिमित्र', mitra: 'मित्र', sama: 'सम', shatru: 'शत्रु', adhishatru: 'अधिशत्रु' }[c] };
  }

  /** 6.42–51: the named varga yogas, by how many vargas of a scheme are good. */
  const SCHEMES = {
    shad: { name: 'षड्वर्ग', keys: ['D1', 'D2', 'D3', 'D9', 'D12', 'D30'], verses: [V(7, 17)] },
    sapta: { name: 'सप्तवर्ग', keys: ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'], verses: [V(7, 18), V(7, 19)] },
    dasha: { name: 'दशवर्ग', keys: ['D1', 'D2', 'D3', 'D7', 'D9', 'D10', 'D12', 'D16', 'D30', 'D60'], verses: [V(7, 20), V(7, 21)] },
    shodasha: { name: 'षोडशवर्ग', keys: VARGAS.map(v => v.key), verses: [V(7, 22), V(7, 23), V(7, 24)] }
  };
  const YOGA_NAMES = {
    shad: { 2: 'किंशुक', 3: 'व्यञ्जन', 4: 'चामर', 5: 'छत्र', 6: 'कुण्डल', 7: 'मुकुट' },
    sapta: { 2: 'पारिजात', 3: 'उत्तम', 4: 'गोपुर', 5: 'सिंहासन', 6: 'पारावत', 7: 'देवलोक' },
    dasha: { 2: 'पारिजात', 3: 'उत्तम', 4: 'गोपुर', 5: 'सिंहासन', 6: 'पारावत', 7: 'देवलोक', 8: 'ब्रह्मलोक', 9: 'शक्रवाहन', 10: 'श्रीधाम' },
    shodasha: { 2: 'भेदक', 3: 'कुसुम', 4: 'नागपुष्प', 5: 'कन्दुक', 6: 'केरल', 7: 'कल्पवृक्ष', 8: 'चन्दनवन', 9: 'पूर्णचन्द्र', 10: 'उच्चैःश्रवा', 11: 'धन्वन्तरि', 12: 'सूर्यकान्त', 13: 'विद्रुम', 14: 'शक्रसिंहासन', 15: 'गोलोक', 16: 'श्रीवल्लभ' }
  };
  const YOGA_VERSES = { shad: [V(6, 43), V(6, 44)], sapta: [V(6, 45), V(6, 46)], dasha: [V(6, 45), V(6, 46), V(6, 47)], shodasha: [V(6, 47), V(6, 48), V(6, 49), V(6, 50), V(6, 51)] };

  function vargaYogas(planet, s, deg) {
    const vs = allVargas(s, deg);
    const good = vs.filter(v => { const st = vargaStanding(planet, v.sign, v.lord); return st.key === 'exalt' || st.key === 'own'; }).map(v => v.key);
    const out = {};
    Object.entries(SCHEMES).forEach(([k, sc]) => {
      const count = sc.keys.filter(x => good.includes(x)).length;
      out[k] = { scheme: sc.name, count, of: sc.keys.length, yoga: YOGA_NAMES[k][count] || null, verses: YOGA_VERSES[k] };
    });
    return { good, schemes: out, verses: [V(6, 42), V(6, 52)],
      interpretation: 'गिनती उन वर्गों की है जहाँ ग्रह अपनी राशि या उच्च राशि में है। श्लोक 52 आरूढ़ से केन्द्रेशों के वर्ग भी गिनने को कहता है; वह भाग यहाँ नहीं जोड़ा।' };
  }

  // ── Chapter 7 ────────────────────────────────────────────────
  /** 7.17–23: vimshopaka weights of each varga in each scheme (each scheme totals 20). */
  const WEIGHTS = {
    shad: { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
    sapta: { D1: 5, D2: 2, D3: 3, D7: 2.5, D9: 4.5, D12: 2, D30: 1 },
    dasha: { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
    shodasha: { D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5, D16: 2, D20: 0.5, D24: 0.5, D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4 }
  };
  /** 7.24–25: points for the planet's standing in a varga sign. */
  const STANDING_POINTS = { exalt: 20, own: 20, adhimitra: 18, mitra: 15, sama: 10, shatru: 7, adhishatru: 5 };

  /**
   * 7.26–27: vimshopaka = Σ (weight × points) ÷ 20, out of 20.
   * relations: the five-fold friendship from the rashi chart (BphsLabCh03.relationshipMatrix).
   */
  function vimshopaka(planet, s, deg, relations) {
    const vs = allVargas(s, deg);
    const out = {};
    Object.entries(WEIGHTS).forEach(([k, w]) => {
      let total = 0;
      const rows = Object.keys(w).map(key => {
        const v = vs.find(x => x.key === key);
        const st = vargaStanding(planet, v.sign, v.lord, relations);
        const pts = st.key === 'debil' ? STANDING_POINTS[relations[planet][v.lord] ? relations[planet][v.lord].compound : 'sama'] : STANDING_POINTS[st.key];
        total += w[key] * pts / 20;
        return { key, weight: w[key], sign: v.sign, lord: v.lord, standing: st, points: pts };
      });
      const grade = total < 5 ? 'फल नहीं' : total <= 10 ? 'अल्प फल' : total <= 15 ? 'मध्यम फल' : 'पूर्ण फल';
      out[k] = { scheme: SCHEMES[k].name, total, grade, rows, verses: SCHEMES[k].verses.concat([V(7, 24), V(7, 25), V(7, 26), V(7, 27)]) };
    });
    return out;
  }

  /** 7.33–37: names of the houses. */
  const HOUSE_GROUPS = [
    { key: 'kendra', name: 'केन्द्र', houses: [1, 4, 7, 10], verses: [V(7, 33)] },
    { key: 'panaphara', name: 'पणफर', houses: [2, 5, 8, 11], verses: [V(7, 34)] },
    { key: 'apoklima', name: 'आपोक्लिम', houses: [3, 6, 9, 12], verses: [V(7, 34)] },
    { key: 'kona', name: 'कोण (त्रिकोण)', houses: [5, 9], verses: [V(7, 35)] },
    { key: 'trika', name: 'त्रिक (दुःस्थान)', houses: [6, 8, 12], verses: [V(7, 35)] },
    { key: 'chaturasra', name: 'चतुरस्र', houses: [4, 8], verses: [V(7, 36)] },
    { key: 'upachaya', name: 'उपचय', houses: [3, 6, 10, 11], verses: [V(7, 36)] }
  ];
  const HOUSE_NAMES = ['तनु', 'धन', 'सहज', 'बन्धु', 'पुत्र', 'अरि', 'युवती', 'रन्ध्र', 'धर्म', 'कर्म', 'लाभ', 'व्यय'];

  /** 7.39–42: a house is also read from its karaka planet. */
  const KARAKA_BHAVA = [
    { house: 9, from: 'Sun', topic: 'पिता', verses: [V(7, 39)] },
    { house: 10, from: 'Sun', topic: 'कर्म', verses: [V(7, 39)] },
    { house: 11, from: 'Sun', topic: 'लाभ', verses: [V(7, 39)] },
    { house: 4, from: 'Moon', topic: 'सुख', verses: [V(7, 40)] },
    { house: 1, from: 'Moon', topic: 'देह', verses: [V(7, 40)] },
    { house: 11, from: 'Moon', topic: 'लाभ', verses: [V(7, 40)] },
    { house: 9, from: 'Moon', topic: 'भाग्य', verses: [V(7, 40)] },
    { house: 3, from: 'Mars', topic: 'पराक्रम', verses: [V(7, 41)] },
    { house: 6, from: 'Mercury', topic: 'शत्रु-रोग', verses: [V(7, 41)] },
    { house: 5, from: 'Jupiter', topic: 'सन्तान', verses: [V(7, 42)] },
    { house: 7, from: 'Venus', topic: 'पत्नी', verses: [V(7, 42)] },
    { house: 8, from: 'Saturn', topic: 'आयु', verses: [V(7, 42)] },
    { house: 12, from: 'Saturn', topic: 'व्यय', verses: [V(7, 42)] }
  ];

  // ── Chapter 8 ────────────────────────────────────────────────
  /**
   * 8.2–5: a चर sign sees the स्थिर signs except the one next to it, a स्थिर sign sees the
   * चर signs except the one next to it, and a द्विस्वभाव sign sees the other द्विस्वभाव signs.
   */
  function rashiAspects(s) {
    const m = modality(s);
    const near = x => x === (s + 1) % 12 || x === (s + 11) % 12;
    const want = m === 0 ? 1 : m === 1 ? 0 : 2;
    const signs = [];
    for (let x = 0; x < 12; x++) if (x !== s && modality(x) === want && !near(x)) signs.push(x);
    return { sign: s, signs, verses: m === 2 ? [V(8, 3), V(8, 5)] : [V(8, 2), V(8, 3), V(8, 4)] };
  }

  /** Which bodies each body sees by rashi drishti on a chart. */
  function rashiDrishtiChart(chart) {
    const bodies = chart.planets.filter(p => NAME_HI[p.id]);
    return bodies.map(p => {
      const a = rashiAspects(p.sign);
      return { id: p.id, sign: p.sign, signs: a.signs, sees: bodies.filter(q => q.id !== p.id && a.signs.includes(q.sign)).map(q => q.id), verses: a.verses };
    });
  }

  /** 8.7–8: the square drishti-chakra — the side or corner each sign is drawn on. */
  const CHAKRA = [
    { place: 'पूर्व', signs: [0, 1] }, { place: 'उत्तर', signs: [3, 4] }, { place: 'पश्चिम', signs: [6, 7] }, { place: 'दक्षिण', signs: [9, 10] },
    { place: 'ईशान', signs: [2] }, { place: 'वायव्य', signs: [5] }, { place: 'नैर्ऋत्य', signs: [8] }, { place: 'आग्नेय', signs: [11] }
  ];

  return {
    SIGN_HI, SIGN_LORD, SEVEN, NAME_HI, MODALITY_HI, BODY, PRAKRITI, VARGAS, SCHEMES, YOGA_NAMES, WEIGHTS, STANDING_POINTS,
    HOUSE_GROUPS, HOUSE_NAMES, KARAKA_BHAVA, CHAKRA, D60_DEV,
    signBasics, kalapurusha, signSpread, nisheka, varga, allVargas, vargaStanding, vargaYogas, vimshopaka, rashiAspects, rashiDrishtiChart
  };
});
