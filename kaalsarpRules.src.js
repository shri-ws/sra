/* कालसर्प / सर्प-योग / राहु-केतु रिपोर्ट के नियम — Shri Ramji Astro
 *
 * GENERATED FILE kaalsarpRules.js is built from this source by scripts/build_kaalsarp_rules.py,
 * which copies the shloka text, book, chapter, verse and page of every rule from
 * data/sarpa_rahu_ketu/collection.json. Edit this file or the collection, never kaalsarpRules.js.
 *
 * Input: the patrika engine's calculation { planets: [{ id, sign (0-11), abs (0-360), deg }] }.
 * Output: { rules: [...], remedies: [...] } — each rule says whether it applies, why (in words a
 * reader can check on the chart), and the source it rests on (status: book_verified /
 * etext_unverified / ocr_reconstructed / tradition). Kalasarpa itself is "tradition": no shloka.
 *
 * Strength (बल) is judged by a stated, simple standard because BPHS ch.83 speaks only of
 * "बलवान / निर्बल": weak = debilitated, combust, or in 6/8/12; strong = exalted, own sign or
 * moolatrikona and not combust. The report prints this standard.
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else root.SRAKaalsarp = exp;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SOURCES = /*SOURCES*/{};

  const SIGN_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const P_HI = { Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु', Mandi: 'मान्दि' };
  const LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const DEBIL = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const MOOLA = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10 };
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  const COMBUST = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  // Parashari special aspects (houses counted from the planet, inclusive); everyone aspects the 7th
  const ASPECTS = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] };
  const NAMES = ['अनन्त', 'कुलिक', 'वासुकि', 'शंखपाल', 'पद्म', 'महापद्म', 'तक्षक', 'कर्कोटक', 'शंखचूड़', 'घातक', 'विषधर', 'शेषनाग'];
  // Sarpa (vyala) drekkanas — Brihajjataka 27: Cancer 2nd, Scorpio 1st & 2nd, Pisces 3rd
  const SARPA_DREKKANA = [[3, 1], [7, 0], [7, 1], [11, 2]];
  const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  function chart(calc) {
    if (!calc || !Array.isArray(calc.planets)) throw new Error('kundali data missing');
    const P = {};
    calc.planets.forEach(p => {
      const abs = (typeof p.abs === 'number') ? ((p.abs % 360) + 360) % 360
        : ((p.sign || 0) * 30 + (p.deg || 0));
      P[p.id] = { id: p.id, abs, sign: Math.floor(abs / 30), deg: abs % 30 };
    });
    if (!P.Lagna) throw new Error('lagna missing');
    if (P.Rahu && !P.Ketu) { const a = (P.Rahu.abs + 180) % 360; P.Ketu = { id: 'Ketu', abs: a, sign: Math.floor(a / 30), deg: a % 30 }; }
    const L = P.Lagna.sign;
    const house = id => P[id] ? ((P[id].sign - L + 12) % 12) + 1 : null;
    const signOfHouse = h => (L + h - 1) % 12;
    const lordOf = h => LORD[signOfHouse(h)];
    const resolve = id => /^L\d+$/.test(id) ? lordOf(+id.slice(1)) : id;
    const conj = (a, b) => { a = resolve(a); b = resolve(b); return a !== b && P[a] && P[b] && P[a].sign === P[b].sign; };
    const aspects = (by, target) => {
      by = resolve(by); target = resolve(target);
      if (!P[by] || !P[target] || by === target) return false;
      const d = ((P[target].sign - P[by].sign + 12) % 12) + 1;
      return (ASPECTS[by] || [7]).includes(d);
    };
    const combust = id => {
      if (!COMBUST[id] || !P.Sun || !P[id]) return false;
      const d = Math.abs(((P[id].abs - P.Sun.abs + 540) % 360) - 180);
      return d < COMBUST[id];
    };
    const dignity = id => {
      const s = P[id] && P[id].sign;
      if (s === undefined || EXALT[id] === undefined) return '';
      if (s === EXALT[id]) return 'उच्च';
      if (s === DEBIL[id]) return 'नीच';
      if (s === MOOLA[id]) return 'मूलत्रिकोण';
      if ((OWN[id] || []).includes(s)) return 'स्वराशि';
      return '';
    };
    const weak = id => { id = resolve(id); return dignity(id) === 'नीच' || combust(id) || [6, 8, 12].includes(house(id)); };
    const strong = id => { id = resolve(id); return ['उच्च', 'स्वराशि', 'मूलत्रिकोण'].includes(dignity(id)) && !combust(id); };
    const name = id => { const r = resolve(id); return P_HI[r] || r; };
    const where = id => { const r = resolve(id); return P[r] ? `${P_HI[r]} ${house(r)}वें भाव (${SIGN_HI[P[r].sign]}) में` : `${P_HI[r] || r} (स्थिति उपलब्ध नहीं)`; };
    const weakWhy = id => {
      const r = resolve(id), why = [];
      if (dignity(r) === 'नीच') why.push('नीच राशि'); if (combust(r)) why.push('अस्त'); if ([6, 8, 12].includes(house(r))) why.push(`${house(r)}वें भाव में`);
      return why.join(', ');
    };
    return { P, L, house, signOfHouse, lordOf, resolve, conj, aspects, combust, dignity, weak, strong, name, where, weakWhy };
  }

  // ---------- Kalasarpa (tradition) ----------
  function kalasarpa(c) {
    const { P } = c;
    if (!P.Rahu) return { applies: false, why: 'राहु की स्थिति उपलब्ध नहीं' };
    let a = 0, b = 0, onAxis = [];
    SEVEN.forEach(id => {
      if (!P[id]) return;
      const d = (P[id].abs - P.Rahu.abs + 360) % 360;
      if (d === 0 || d === 180) onAxis.push(id); else if (d < 180) a++; else b++;
    });
    const full = (a === 7 || b === 7);
    const partial = !full && (a === 6 || b === 6);
    const rh = c.house('Rahu');
    const side = a >= b ? 'राहु से केतु की ओर (राशि-चक्र के क्रम में)' : 'केतु से राहु की ओर (राशि-चक्र के क्रम में)';
    const outside = SEVEN.filter(id => {
      const d = (P[id].abs - P.Rahu.abs + 360) % 360; return a >= b ? d > 180 : d < 180;
    });
    return {
      applies: full || partial, full, partial, name: NAMES[rh - 1], rahuHouse: rh, side,
      why: full ? `सातों ग्रह राहु-केतु अक्ष के एक ही ओर (${side}) हैं; राहु ${rh}वें भाव में — "${NAMES[rh - 1]}" कालसर्प।`
        : partial ? `छह ग्रह एक ओर हैं, ${outside.map(x => P_HI[x]).join(', ')} दूसरी ओर — आंशिक कालसर्प (राहु ${rh}वें भाव में, "${NAMES[rh - 1]}")।`
          : `ग्रह राहु-केतु के दोनों ओर बँटे हैं (${a} और ${b}) — कालसर्प नहीं बनता।`
    };
  }

  // ---------- rules ----------
  // each: id, title, source ids, test(c) -> { applies, why }
  const RULES = [
    { id: 'kalasarpa', title: 'कालसर्प योग (परंपरा)', src: ['tradition-kalasarpa', 'modern-rath-kalasarpa'], group: 'परंपरा',
      test: c => kalasarpa(c) },
    { id: 'sarpa-nabhasa', title: 'सर्प (भुजङ्ग) नाभस-योग', src: ['bphs-36-3', 'bphs-36-8', 'bphs-36-23', 'bj-12.02', 'bj-12.11', 'bj-12.03'], group: 'शास्त्रीय योग',
      test: c => {
        const kendra = [1, 4, 7, 10];
        const mal = ['Sun', 'Mars', 'Saturn'].filter(id => kendra.includes(c.house(id)));
        const malHouses = [...new Set(mal.map(c.house))];
        const ben = ['Moon', 'Mercury', 'Jupiter', 'Venus'].filter(id => kendra.includes(c.house(id)));
        const applies = malHouses.length >= 3 && ben.length === 0;
        return { applies, why: applies
          ? `तीन केन्द्रों में पाप ग्रह — ${mal.map(c.where).join('; ')} — और किसी केन्द्र में शुभ ग्रह नहीं।`
          : `केन्द्रों में पाप ग्रह ${malHouses.length ? mal.map(c.where).join('; ') : 'नहीं'}${ben.length ? `; शुभ ग्रह भी केन्द्र में: ${ben.map(id => P_HI[id]).join(', ')}` : ''} — तीन केन्द्र केवल पाप ग्रहों से नहीं भरे।` };
      },
      note: 'पाप ग्रह = सूर्य, मंगल, शनि; शुभ = चन्द्र, बुध, गुरु, शुक्र। बृहज्जातक 12.3 के अनुसार कुछ आचार्य इस योग का अलग फल नहीं मानते।' },
    { id: 'sarpa-shapa-10', title: 'सर्प-शाप: पंचम में राहु पर मंगल', src: ['bphs-83-10'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const in5 = c.house('Rahu') === 5, asp = c.aspects('Mars', 'Rahu'), marsSign = [0, 7].includes(c.P.Rahu.sign);
        return { applies: in5 && (asp || marsSign), why: in5 ? `राहु पंचम में (${SIGN_HI[c.P.Rahu.sign]}); मंगल की दृष्टि ${asp ? 'है' : 'नहीं'}; राशि मंगल की ${marsSign ? 'है' : 'नहीं'}।` : `राहु पंचम में नहीं (${c.house('Rahu')}वें भाव में)।` };
      } },
    { id: 'sarpa-shapa-11', title: 'सर्प-शाप: पंचमेश-राहु, पंचम में शनि पर चन्द्र', src: ['bphs-83-11'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('L5', 'Rahu'), s5 = c.house('Saturn') === 5, m = c.conj('Moon', 'Saturn') || c.aspects('Moon', 'Saturn');
        return { applies: a && s5 && m, why: `पंचमेश (${c.name('L5')}) राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; शनि पंचम में: ${s5 ? 'हाँ' : 'नहीं'}; शनि पर चन्द्र की युति/दृष्टि: ${m ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-12', title: 'सर्प-शाप: गुरु-राहु, पंचमेश निर्बल, लग्नेश-मंगल', src: ['bphs-83-12'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('Jupiter', 'Rahu'), w = c.weak('L5'), m = c.resolve('L1') === 'Mars' || c.conj('L1', 'Mars');
        return { applies: a && w && m, why: `गुरु राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; पंचमेश निर्बल: ${w ? 'हाँ (' + c.weakWhy('L5') + ')' : 'नहीं'}; लग्नेश मंगल के साथ: ${m ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-13', title: 'सर्प-शाप: गुरु-मंगल, लग्न में राहु, पंचमेश दुःस्थान में', src: ['bphs-83-13'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('Jupiter', 'Mars'), r = c.house('Rahu') === 1, d = [6, 8, 12].includes(c.house(c.resolve('L5')));
        return { applies: a && r && d, why: `गुरु मंगल के साथ: ${a ? 'हाँ' : 'नहीं'}; राहु लग्न में: ${r ? 'हाँ' : 'नहीं'}; पंचमेश ${c.house(c.resolve('L5'))}वें भाव में।` };
      } },
    { id: 'sarpa-shapa-14', title: 'सर्प-शाप: पंचमेश बुध मंगल के साथ, लग्न में राहु-मान्दि', src: ['bphs-83-14'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const merc = c.resolve('L5') === 'Mercury', mm = c.conj('Mercury', 'Mars'), r = c.house('Rahu') === 1;
        const mandi = c.P.Mandi ? c.house('Mandi') === 1 : null;
        const nav = c.P.Mercury ? [0, 7].includes(navamsa(c.P.Mercury.abs)) : false;
        return { applies: merc && mm && nav && r && mandi === true, why: `पंचमेश बुध: ${merc ? 'हाँ' : 'नहीं'}; बुध मंगल के साथ: ${mm ? 'हाँ' : 'नहीं'}; बुध मंगल के नवांश में: ${nav ? 'हाँ' : 'नहीं'}; लग्न में राहु: ${r ? 'हाँ' : 'नहीं'}; लग्न में मान्दि: ${mandi === null ? 'मान्दि की गणना उपलब्ध नहीं' : mandi ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-15', title: 'सर्प-शाप: पंचम मंगल-राशि, पंचमेश-राहु पर बुध', src: ['bphs-83-15'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const s = [0, 7].includes(c.signOfHouse(5)), a = c.conj('L5', 'Rahu'), m = c.conj('L5', 'Mercury') || c.aspects('Mercury', 'L5') || c.resolve('L5') === 'Mercury';
        return { applies: s && a && m, why: `पंचम भाव ${SIGN_HI[c.signOfHouse(5)]}; पंचमेश राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; उस पर बुध की युति/दृष्टि: ${m ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-16', title: 'सर्प-शाप: पंचम में छह ग्रह, पंचमेश-लग्नेश निर्बल', src: ['bphs-83-16'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const six = ['Sun', 'Saturn', 'Mars', 'Rahu', 'Mercury', 'Jupiter'], inn = six.filter(id => c.house(id) === 5);
        const w = c.weak('L5') && c.weak('L1');
        return { applies: inn.length === 6 && w, why: `पंचम में इनमें से ${inn.length ? inn.map(id => P_HI[id]).join(', ') : 'कोई नहीं'}; पंचमेश व लग्नेश दोनों निर्बल: ${w ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-17', title: 'सर्प-शाप: लग्नेश-राहु, पंचमेश-मंगल, गुरु-राहु', src: ['bphs-83-17'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('L1', 'Rahu'), b = c.resolve('L5') === 'Mars' ? false : c.conj('L5', 'Mars'), g = c.conj('Jupiter', 'Rahu');
        return { applies: a && b && g, why: `लग्नेश राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; पंचमेश मंगल के साथ: ${b ? 'हाँ' : 'नहीं'}; गुरु राहु के साथ: ${g ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-pd', title: 'सर्प-शाप (फलदीपिका): पंचम में राहु या पंचमेश-राहु', src: ['pd-12-22'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.house('Rahu') === 5, b = c.conj('L5', 'Rahu');
        return { applies: a || b, why: a ? `राहु पंचम भाव (${SIGN_HI[c.P.Rahu.sign]}) में है।` : b ? `पंचमेश (${c.name('L5')}) राहु के साथ है।` : 'राहु न पंचम में है, न पंचमेश के साथ।' };
      },
      note: 'मन्त्रेश्वर यह शाप तभी कहते हैं जब कुंडली में संतान-बाधा के दूसरे लक्षण भी हों — अकेले इस योग से संतान-हानि न कहें।' },
    { id: 'sarpa-dansha-ms', title: 'सर्पदंश योग (मानसागरी)', src: ['ms-sarpadansha'], group: 'सर्प-भय',
      test: c => {
        const x = ['Saturn', 'Sun', 'Rahu'].filter(id => c.house(id) === 7);
        return { applies: x.length === 3, why: `सप्तम भाव में ${x.length ? x.map(id => P_HI[id]).join(', ') : 'इनमें से कोई नहीं'} (योग के लिए शनि, सूर्य, राहु तीनों चाहिए)।` };
      } },
    { id: 'sarpa-dansha-bphs-19', title: 'सर्पदंश-भय (BPHS 19.37): द्वितीय में राहु, सप्तम में मंगल', src: ['bphs-19-37'], group: 'सर्प-भय',
      test: c => {
        const a = c.house('Rahu') === 2, b = c.house('Mars') === 7;
        return { applies: a && b, why: `राहु दूसरे भाव में: ${a ? 'हाँ' : 'नहीं'}; मंगल सप्तम में: ${b ? 'हाँ' : 'नहीं'}।` };
      },
      note: 'यह शास्त्र-वचन है, निश्चित भविष्यवाणी नहीं; विवाह-मिलान में पूरी कुंडली देखकर ही विचार करें।' },
    { id: 'sarpa-bhaya-dasha', title: 'सूर्य-दशा में राहु-अन्तर: सर्प-भय (BPHS 53.30)', src: ['bphs-53-30'], group: 'सर्प-भय',
      test: c => {
        const h = c.house('Rahu'), a = [2, 7].includes(h), b = c.conj('Rahu', 'L2') || c.conj('Rahu', 'L7');
        return { applies: a || b, why: a ? `राहु ${h}वें भाव में — सूर्य महादशा में राहु की अन्तर्दशा के समय सावधानी।` : b ? 'राहु द्वितीय/सप्तम के स्वामी के साथ — सूर्य महादशा में राहु की अन्तर्दशा के समय सावधानी।' : `राहु ${h}वें भाव में, द्वितीय-सप्तम से सम्बन्ध नहीं।` };
      } },
    { id: 'sarpa-drekkana', title: 'लग्न या अष्टम में सर्प-द्रेष्काण', src: ['bj-27.12', 'bj-27.22', 'bj-27.23', 'bj-27.36', 'bj-25.04'], group: 'सर्प-द्रेष्काण',
      test: c => {
        const dk = abs => [Math.floor(abs / 30), Math.floor((abs % 30) / 10)];
        const isS = ([s, d]) => SARPA_DREKKANA.some(([a, b]) => a === s && b === d);
        const lag = isS(dk(c.P.Lagna.abs));
        // the 22nd drekkana from the lagna drekkana = the same drekkana-part of the 8th sign
        const l = dk(c.P.Lagna.abs), eighth = [(l[0] + 7) % 12, l[1]], e = isS(eighth);
        const nm = ([s, d]) => `${SIGN_HI[s]} का ${['पहला', 'दूसरा', 'तीसरा'][d]} द्रेष्काण`;
        return { applies: lag || e, why: `लग्न: ${nm(l)}${lag ? ' (सर्प-द्रेष्काण)' : ''}; 22वाँ द्रेष्काण: ${nm(eighth)}${e ? ' (सर्प-द्रेष्काण)' : ''}।` };
      },
      note: 'बृहज्जातक 25.4 के अनुसार अष्टम का सर्प-द्रेष्काण (और 5वें-9वें में अशुभ ग्रह) बन्धन-भय दिखाता है; यहाँ केवल द्रेष्काण की स्थिति बताई है।' },
    { id: 'rahu-conjunct', title: 'राहु जिन ग्रहों के साथ है (फलदीपिका 20)', src: ['pd-20-36'], group: 'राहु-केतु का प्रभाव',
      test: c => {
        const w = SEVEN.filter(id => c.conj(id, 'Rahu'));
        return { applies: w.length > 0, why: w.length ? `राहु ${w.map(id => P_HI[id]).join(', ')} के साथ है — इन ग्रहों की दशा के अन्त में विशेष सावधानी।` : 'राहु किसी ग्रह के साथ नहीं बैठा।' };
      } },
    { id: 'anapatya', title: 'अनपत्य योग (राहु सहित, BPHS 83.8–9)', src: ['bphs-83-8-9'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const allWeak = ['Jupiter', 'L1', 'L7', 'L5'].every(c.weak);
        const four = ['Sun', 'Mars', 'Rahu', 'Saturn'].filter(id => c.house(id) === 5 && (id === 'Rahu' || c.strong(id)));
        const b = four.length === 4 && c.weak('Jupiter') && c.weak('L5');
        return { applies: allWeak || b, why: allWeak ? 'गुरु, लग्नेश, सप्तमेश और पंचमेश चारों निर्बल हैं।' : b ? 'पंचम में बलवान सूर्य, मंगल, राहु, शनि और पुत्रकारक निर्बल।' : 'चारों कारक एक साथ निर्बल नहीं; पंचम में यह चतुष्टय भी नहीं।' };
      } }
    ,
    { id: 'grahan-janma', title: 'ग्रहण-काल में जन्म (BPHS 92)', src: ['bphs-92-1'], group: 'ग्रहण-जन्म',
      test: c => {
        const { P } = c;
        if (!P.Sun || !P.Moon || !P.Rahu) return { applies: false, why: 'सूर्य/चन्द्र/राहु की स्थिति उपलब्ध नहीं।' };
        const sep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
        const elong = sep(P.Moon.abs, P.Sun.abs);            // 0 = amavasya, 180 = purnima
        const nodeSun = Math.min(sep(P.Sun.abs, P.Rahu.abs), sep(P.Sun.abs, P.Ketu.abs));
        const nodeMoon = Math.min(sep(P.Moon.abs, P.Rahu.abs), sep(P.Moon.abs, P.Ketu.abs));
        // the eclipse itself lasts a few hours around the exact new/full moon: Moon within ~1.5°
        // of conjunction/opposition, and the luminary close enough to a node for an eclipse
        const solar = elong <= 1.5 && nodeSun <= 17;
        const lunar = (180 - elong) <= 1.5 && nodeMoon <= 11;
        return { applies: solar || lunar, eclipse: solar ? 'सूर्य' : lunar ? 'चन्द्र' : null,
          why: solar ? `जन्म अमावस्या के ठीक पास (सूर्य-चन्द्र ${elong.toFixed(1)}° दूर) और सूर्य राहु-केतु से ${nodeSun.toFixed(1)}° पर — सूर्य-ग्रहण के समय जन्म की प्रबल संभावना; पंचांग से पुष्टि करें।`
            : lunar ? `जन्म पूर्णिमा के ठीक पास (सूर्य-चन्द्र ${elong.toFixed(1)}° दूर) और चन्द्र राहु-केतु से ${nodeMoon.toFixed(1)}° पर — चन्द्र-ग्रहण के समय जन्म की प्रबल संभावना; पंचांग से पुष्टि करें।`
              : `सूर्य-चन्द्र की दूरी ${elong.toFixed(1)}° — जन्म ग्रहण-काल में नहीं।` };
      },
      note: 'ग्रहण की स्थिति ग्रह-अंशों से अनुमानित है (अमावस्या/पूर्णिमा से लगभग 1.5° के भीतर और ग्रहण-सीमा में); स्थानीय दृश्यता पंचांग से देखें।' },
    { id: 'rahu-dasha-dusthana', title: 'राहु 6/8/12 में, शुभ सम्बन्ध नहीं — अपनी दशा में कष्ट', src: ['bphs-45-23'], group: 'राहु-केतु के अन्य शास्त्रीय योग',
      test: c => {
        const h = c.house('Rahu'), dus = [6, 8, 12].includes(h);
        const ben = ['Jupiter', 'Venus', 'Mercury', 'Moon'].filter(id => c.conj(id, 'Rahu') || c.aspects(id, 'Rahu'));
        return { applies: dus && ben.length === 0, why: dus ? `राहु ${h}वें भाव में; शुभ ग्रहों की युति/दृष्टि: ${ben.length ? ben.map(id => P_HI[id]).join(', ') : 'नहीं'}।` : `राहु ${h}वें भाव में (6/8/12 नहीं)।` };
      },
      note: 'शुभ ग्रह = गुरु, शुक्र, बुध, चन्द्र; दृष्टि पराशरी (सबकी सप्तम, गुरु 5-9)।' },
    { id: 'rahu-kendra-trikona', title: 'राहु केन्द्र या त्रिकोण में — यज्ञकर्ता (शुभ योग)', src: ['bphs-22-3'], group: 'राहु-केतु के अन्य शास्त्रीय योग',
      test: c => { const h = c.house('Rahu'), ok = [1, 4, 5, 7, 9, 10].includes(h); return { applies: ok, why: `राहु ${h}वें भाव में${ok ? ' — केन्द्र/त्रिकोण।' : ' — केन्द्र/त्रिकोण में नहीं।'}` }; } },
    { id: 'l10-8-rahu', title: 'दशमेश अष्टम में राहु के साथ', src: ['bphs-22-6'], group: 'राहु-केतु के अन्य शास्त्रीय योग',
      test: c => { const h = c.house(c.resolve('L10')), a = h === 8 && c.conj('L10', 'Rahu'); return { applies: a, why: `दशमेश (${c.name('L10')}) ${h}वें भाव में; राहु के साथ: ${c.conj('L10', 'Rahu') ? 'हाँ' : 'नहीं'}।` }; } },
    { id: 'rahu-12-mars-sun', title: 'द्वादश में राहु-मंगल-सूर्य, द्वादशेश सूर्य के साथ', src: ['bphs-24-9'], group: 'राहु-केतु के अन्य शास्त्रीय योग',
      test: c => {
        const x = ['Rahu', 'Mars', 'Sun'].filter(id => c.house(id) === 12), l = c.resolve('L12') === 'Sun' || c.conj('L12', 'Sun');
        return { applies: x.length === 3 && l, why: `द्वादश में: ${x.length ? x.map(id => P_HI[id]).join(', ') : 'इनमें से कोई नहीं'}; द्वादशेश सूर्य के साथ: ${l ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'l8-in-6', title: 'अष्टमेश षष्ठ में — जल व सर्प से भय', src: ['bphs-25-90'], group: 'सर्प-भय',
      test: c => { const h = c.house(c.resolve('L8')); return { applies: h === 6, why: `अष्टमेश (${c.name('L8')}) ${h}वें भाव में।` }; } },
    { id: 'ketu-lagna-moon', title: 'लग्न व चन्द्र केतु के साथ, लग्नेश अष्टम में — दारिद्र्य', src: ['bphs-43-4'], group: 'राहु-केतु के अन्य शास्त्रीय योग',
      test: c => {
        const a = c.house('Ketu') === 1 && c.conj('Moon', 'Ketu'), l8 = c.house(c.resolve('L1')) === 8;
        const mar = ['L2', 'L7'].some(m => c.resolve(m) !== c.resolve('L1') && (c.conj('L1', m) || c.aspects(m, 'L1')));
        return { applies: a && l8 && mar, why: `केतु लग्न में चन्द्र के साथ: ${a ? 'हाँ' : 'नहीं'}; लग्नेश अष्टम में: ${l8 ? 'हाँ' : 'नहीं'}; मारकेश (2/7 के स्वामी) से युति/दृष्टि: ${mar ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'mars6-rahu7-sat8', title: 'षष्ठ में मंगल, सप्तम में राहु, अष्टम में शनि', src: ['bphs-19-40'], group: 'राहु-केतु के अन्य शास्त्रीय योग',
      test: c => { const a = c.house('Mars') === 6, b = c.house('Rahu') === 7, s = c.house('Saturn') === 8; return { applies: a && b && s, why: `मंगल षष्ठ में: ${a ? 'हाँ' : 'नहीं'}; राहु सप्तम में: ${b ? 'हाँ' : 'नहीं'}; शनि अष्टम में: ${s ? 'हाँ' : 'नहीं'}।` }; },
      note: 'यह शास्त्र-वचन है, निश्चित भविष्यवाणी नहीं; विवाह-विचार पूरी कुंडली और मिलान देखकर ही करें।' }
  ];

  function navamsa(abs) {
    const sign = Math.floor(abs / 30), part = Math.floor((abs % 30) / (30 / 9));
    const start = [0, 9, 6, 3][sign % 4];
    return (start + part) % 12;
  }

  const REMEDIES = [
    { id: 'nagapuja', title: 'सर्प-शाप की शान्ति: नागपूजा', src: ['bphs-83-18-20', 'pd-12-24'], when: r => r.some(x => x.applies && x.group === 'सर्प-शाप (संतान)') },
    { id: 'grahan-shanti', title: 'ग्रहण-जन्म दोष की शान्ति', src: ['bphs-92-2-3', 'bphs-92-4-10', 'bphs-92-11-12'], when: r => r.some(x => x.applies && x.id === 'grahan-janma') },
    { id: 'rahu-ketu-shanti', title: 'राहु-केतु की शान्ति: स्वरूप, धातु, जप, समिधा, दक्षिणा', src: ['bphs-85-12', 'bphs-85-13', 'bphs-85-4-5', 'bphs-85-17-20', 'bphs-85-21-23', 'bphs-85-26', 'bphs-85-27-28'], when: () => true }
  ];

  function src(id) { return SOURCES[id] || null; }

  function evaluate(calc) {
    const c = chart(calc);
    const rules = RULES.map(r => {
      let res;
      try { res = r.test(c); } catch (e) { res = { applies: false, why: 'गणना नहीं हो सकी: ' + e.message }; }
      return Object.assign({ id: r.id, title: r.title, group: r.group, note: r.note || null, sources: r.src.map(src).filter(Boolean) }, res);
    });
    const remedies = REMEDIES.filter(m => m.when(rules)).map(m => ({ id: m.id, title: m.title, sources: m.src.map(src).filter(Boolean) }));
    return {
      lagna: SIGN_HI[c.L], rahu: c.where('Rahu'), ketu: c.where('Ketu'),
      kalasarpa: rules[0], rules, remedies,
      strength_standard: 'बल का मानक: नीच, अस्त या 6/8/12वें भाव में बैठा ग्रह "निर्बल"; उच्च, स्वराशि या मूलत्रिकोण में (अस्त न हो) "बलवान"।'
    };
  }

  return { evaluate, RULES, SOURCES, navamsa };
});
