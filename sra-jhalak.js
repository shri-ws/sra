/* ══════════════════════════════════════════════════════════════════════════
   SRA-JHALAK.JS — homepage preview cards ("एक झलक में")
   Renders into every <div class="jh" data-jh="..."> on the page: a strip with the
   best snippet of each service, then the services grouped, each with 3-4 snippets.
   Tapping a snippet opens a sheet with the larger screenshots at that snippet.
   All screenshots are real results of the site for a fictional person (राहुल,
   जयपुर, 15-07-1990, 10:00), cropped into assets/jhalak/ (s-*.webp = small tile).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var IMG = 'assets/jhalak/';
  var V = '.webp?v=2';               // bump when the snippet images are retaken
  function S(id, short, cap, pos, fit) { return { id: id, short: short, cap: cap, pos: pos || 'center top', fit: fit }; }

  var TOOLS = {
    patrika: { title: 'जन्म पत्रिका', tag: 'पत्रिका', line: 'लग्न से षोडशवर्ग तक चक्र, हर ग्रह का अंश व नक्षत्र, और आज चल रही दशा।',
      cta: ['अपनी पत्रिका बनाएँ', 'patrika.html'], slides: [
      S('patrika-chart', 'लग्न कुंडली, हर ग्रह अपने भाव में', 'लग्न कुंडली — उत्तर भारतीय शैली में, हर ग्रह अपने भाव में। भाव चलित, नवमांश व दशमांश भी साथ में।', 'center'),
      S('patrika-dasha', 'आज की दशा — प्राण दशा तक', 'आज कौन-सी दशा चल रही है — महादशा से प्राण दशा तक, पाँचों स्तर एक नज़र में।', 'left center'),
      S('patrika-grah', 'ग्रह का अंश, राशि, नक्षत्र', 'हर ग्रह का अंश-कला-विकला, राशि स्वामी, नक्षत्र और मार्गी/वक्री स्थिति।', 'left top') ] },
    aaj: { title: 'आज आपका दिन', tag: 'आज का दिन', line: 'हर सुबह आपकी कुंडली से — क्या आगे बढ़ाएँ, कहाँ धीमे चलें, और क्यों।',
      cta: ['रोज़ सुबह 7 बजे पाएँ', 'patrika.html'], slides: [
      S('aaj-score', 'आज का दिन 100 में 54', 'आज का दिन 100 में कितना — और एक लाइन में क्यों।', 'center'),
      S('aaj-kyon', 'हर बात का कारण आपकी दशा से', 'हर बात का कारण: आपकी दशा, साढ़ेसाती, तारा बल और अष्टकवर्ग।', 'left top'),
      S('aaj-karen', 'क्या करें, कहाँ धीमे चलें', 'क्या आगे बढ़ाएँ और कहाँ धीमे चलें — सीधी भाषा में।', 'left top'),
      S('aaj-dincharya', 'वस्त्र का रंग, भोजन, दिशा शूल', 'वस्त्र का रंग, भोजन, दिशा शूल — आपकी चल रही दशा के हिसाब से।', 'left top') ] },
    mega: { title: 'मेगा पाराशर रिपोर्ट', tag: 'पाराशर रिपोर्ट', line: 'बृहत्पाराशरहोराशास्त्र के 97 अध्याय — हर अध्याय का श्लोक आपकी कुंडली पर लगाकर।',
      cta: ['रिपोर्ट देखें (₹1,111)', 'parashara-report.html'], slides: [
      S('mega-shloka', 'अध्याय 11: धनभाव, श्लोक सहित', 'हर अध्याय में मूल श्लोक, और आपकी कुंडली में वह कैसे लागू होता है।'),
      S('mega-summary', 'लग्न, राशि, कारक — सार', 'लग्न, चन्द्र राशि, आत्मकारक और मुख्य बातें एक तालिका में।'),
      S('mega-exec', 'पूरे जीवन का सार', 'पूरी रिपोर्ट का सार आज की भाषा में।') ] },
    kaalsarp: { title: 'कालसर्प रिपोर्ट', tag: 'कालसर्प', line: 'कालसर्प है या नहीं, कौन-सा, और हर नियम का मूल श्लोक व ग्रन्थ।',
      cta: ['कालसर्प रिपोर्ट (₹501)', 'kaalsarp-report.html'], slides: [
      S('kaalsarp-verdict', 'साफ़ फ़ैसला', 'कालसर्प है या नहीं — और कौन-सा (इस नमूने में आंशिक, "महापद्म")।', 'left center', 'contain'),
      S('kaalsarp-rule', 'मूल श्लोक व अर्थ', 'हर नियम का संस्कृत श्लोक, उसका अर्थ और ग्रन्थ-अध्याय।'),
      S('kaalsarp-chart', 'राहु-केतु अक्ष', 'कुंडली पर राहु-केतु का अक्ष और ग्रहों की स्थिति।', 'center') ] },
    gun: { title: 'गुण मिलान', tag: 'गुण मिलान', line: '36 गुण के साथ आठों कूट का कारण, और दोष का शास्त्रीय परिहार — श्लोक सहित।',
      cta: ['गुण मिलान करें', 'gun-milan.html'], slides: [
      S('gun-score', '21.5 / 36 — स्वीकार्य', '36 में से कितने गुण — और साफ़ बताया कि मिलान स्वीकार्य है या नहीं।', 'center', 'contain'),
      S('gun-table', 'आठों कूट, हर अंक का कारण', 'आठों कूट — वर और वधू दोनों का विवरण, हर अंक का कारण।', 'left top'),
      S('gun-parihar', 'भकूट दोष का परिहार, श्लोक 32', 'भकूट दोष है, पर शास्त्रोक्त परिहार भी — श्लोक संख्या के साथ। नाड़ी भिन्न, यानी उत्तम।', 'right top') ] },
    vmm: { title: 'विवाह मुहूर्त', tag: 'विवाह मुहूर्त', line: 'मुहूर्त चिन्तामणि अनुसार — वर-वधू दोनों की कुंडली पर हर तिथि की जाँच, दोष का कारण और श्लोक।',
      cta: ['विवाह मुहूर्त निकालें', 'vmm.html'], slides: [
      S('vmm-mahadosh', '10 महादोष की जाँच', 'मुहूर्त चिन्तामणि के 10 महादोष — लत्ता, पात, युति, वेध आदि — हर तिथि पर जाँचे जाते हैं।'),
      S('vmm-shloka', 'हर नियम का मूल श्लोक', 'त्रिबल, लत्ता-वेध — जिस श्लोक से नियम आया, वही श्लोक साथ में।'),
      S('vmm-couple', 'दम्पती व परिवार के नियम', 'जन्म-नक्षत्र, ज्येष्ठ संतान, एक घर में दो विवाह — परिवार सम्बन्धी शास्त्रीय विचार, श्लोक संख्या सहित।'),
      S('vmm-row', 'हर तिथि का त्रिबल व कारण', 'हर तिथि पर वर-वधू का चन्द्र बल, त्रिबल % और दोष का कारण — श्लोक 42–92 के अनुसार।') ] },
    vastu: { title: 'वास्तु व गृह प्रवेश', tag: 'वास्तु', line: 'नींव पूजन और गृह प्रवेश के दिन रैंक के साथ — राहु मुख, दिशा और शुभ लग्न समय।',
      cta: ['वास्तु मुहूर्त देखें', 'vastu-muhurta.html'], slides: [
      S('vastu-compass', 'वास्तु दिशा चक्र', 'किस दिशा में कौन-सा कक्ष — वास्तु शास्त्र अनुसार दिशा चक्र।'),
      S('vastu-neev', 'नींव पूजन — रैंक #1', 'नींव पूजन के दिन रैंक में: तिथि, नक्षत्र, राहु मुख, शुभ लग्न समय और प्रतिशत।', 'left top'),
      S('vastu-griha', 'गृह प्रवेश के दिन', 'गृह प्रवेश के दिन भी उसी तरह रैंक में।', 'left top'),
      S('vastu-rules', 'मुहूर्त चिन्तामणि के नियम', 'नींव और गृह प्रवेश के नियम — मुहूर्त चिन्तामणि के वास्तु प्रकरण से।') ] },
    yajno: { title: 'यज्ञोपवीत', tag: 'यज्ञोपवीत', line: 'बालक की कुंडली से उपनयन के शुद्ध मुहूर्त — ग्रेड, त्रिबल और अष्टम शुद्धि के साथ।',
      cta: ['यज्ञोपवीत मुहूर्त देखें', 'yajnopavita.html'], slides: [
      S('yajno-slot', '#1 मुहूर्त — Grade A+', 'सबसे अच्छा मुहूर्त ऊपर: तिथि, नक्षत्र, लग्न, अष्टम शुद्धि और सूर्य-चन्द्र-गुरु बल।'),
      S('yajno-chart', 'बालक की जन्म कुंडली', 'बालक की लग्न कुंडली और ग्रह स्पष्ट।'),
      S('yajno-grid', 'लग्न, राशि, नक्षत्र', 'जन्म लग्न, राशि, नक्षत्र-पद — एक नज़र में।'),
      S('yajno-summary', '29 मुहूर्त, क्रम से', 'चुनी अवधि के सारे शुद्ध मुहूर्त, गुणवत्ता के क्रम में।', 'left center', 'contain') ] },
    mundan: { title: 'मुंडन', tag: 'मुंडन', line: '14 शास्त्रीय नियमों से चूड़ाकर्म का मुहूर्त — शिशु के चन्द्र व तारा बल के साथ।',
      cta: ['मुंडन मुहूर्त देखें', 'mmm.html'], slides: [
      S('mundan-stats', 'महीने भर का सार', 'पूरे महीने के दिन: कितने उत्तम, कितने मध्यम, कितने वर्जित।'),
      S('mundan-chart', 'शिशु की लग्न कुंडली', 'शिशु की जन्म लग्न कुंडली।', 'center'),
      S('mundan-row', 'हर दिन, 14 नियम', 'हर दिन पर पंचांग, शिशु का चन्द्र व तारा बल और 14 नियमों का विश्लेषण।', 'left top') ] },
    consult: { title: 'परामर्श', tag: 'परामर्श', line: 'एस्ट्रो रामजी दिन में केवल एक व्यक्ति की कुंडली देखते हैं — 180 मिनट, तीन चरण।',
      cta: ['स्लॉट देखें (₹5,100)', 'consultation.html'], slides: [
      S('consult-one', 'दिन में केवल एक जातक', 'कॉल सेंटर नहीं — एक जातक की पूरी कुंडली के लिए पूरा दिन।'),
      S('consult-calendar', 'हर दिन ठीक 1 स्लॉट', 'मासिक कैलेंडर में हर दिन सिर्फ़ एक स्लॉट।'),
      S('consult-daivagya', 'दैवज्ञ नियम', 'परामर्श का समय व आचरण पाराशर एवं वराहमिहिर के दैवज्ञ नियमों से।'),
      S('consult-stages', '3 चरण, 180 मिनट', '90 मिनट पूर्व गणितीय परीक्षण, 60 मिनट निजी बातचीत, 30 मिनट हस्तनिर्मित उपाय-पत्र।') ] }
  };
  var GROUPS = [
    ['कुंडली और फल', ['patrika', 'aaj', 'mega', 'kaalsarp']],
    ['विवाह', ['gun', 'vmm']],
    ['संस्कार व गृह मुहूर्त', ['vastu', 'yajno', 'mundan']],
    ['परामर्श', ['consult']]
  ];
  var TOP = ['patrika', 'aaj', 'gun', 'mega', 'vmm', 'kaalsarp', 'vastu', 'yajno', 'mundan', 'consult'];
  var NOTE = 'नमूना: साइट के असली नतीजे, एक काल्पनिक व्यक्ति की कुंडली पर।';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function tile(k, i, withTag) {
    var t = TOOLS[k], sl = t.slides[i];
    return '<button class="jh-snip" type="button" data-jh-tool="' + k + '" data-jh-i="' + i + '" aria-label="' + esc(t.title + ': ' + sl.short) + '">' +
      '<span class="jh-img' + (sl.fit === 'contain' ? ' jh-contain' : '') + '" style="display:block;--pos:' + sl.pos + ';--fit:' + (sl.fit || 'cover') + '">' +
      '<img src="' + IMG + 's-' + sl.id + V + '" alt="" loading="lazy" decoding="async">' +
      (withTag ? '<span class="jh-tag">' + esc(t.tag) + '</span>' : '') + '</span>' +
      '<span class="jh-cap">' + esc(sl.short) + '</span></button>';
  }
  function card(k) {
    var t = TOOLS[k];
    return '<article class="jh-card"><div class="jh-head"><h3>' + esc(t.title) + '</h3><p>' + esc(t.line) + '</p></div>' +
      '<div class="jh-rail">' + t.slides.map(function (_, i) { return tile(k, i, false); }).join('') + '</div>' +
      '<div class="jh-actions"><button class="jh-btn jh-btn-quiet" type="button" data-jh-tool="' + k + '" data-jh-i="0">सारी झलक</button>' +
      '<a class="jh-btn jh-btn-main" href="' + t.cta[1] + '">' + esc(t.cta[0]) + '</a></div></article>';
  }
  function render(mount) {
    mount.innerHTML =
      '<div class="jh-top"><div class="jh-label"><h2>एक झलक में</h2><small>खिसकाकर देखें ›</small></div>' +
      '<div class="jh-rail" aria-label="नमूना नतीजे">' + TOP.map(function (k) { return tile(k, 0, true); }).join('') + '</div></div>' +
      GROUPS.map(function (g) {
        return '<section class="jh-sec"><div class="jh-label"><h2>' + esc(g[0]) + '</h2></div><div class="jh-cards">' + g[1].map(card).join('') + '</div></section>';
      }).join('');
  }

  // ── sheet (one for the page) ──
  var root, track, thumbs, prev, next, cta, title, lastFocus = null, count = 0;
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function buildSheet() {
    root = document.createElement('div');
    root.className = 'jh-sheet-root'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="jh-scrim" data-jh-close></div>' +
      '<section class="jh-sheet" role="dialog" aria-modal="true" aria-labelledby="jhTitle">' +
      '<div class="jh-grip" aria-hidden="true"></div>' +
      '<div class="jh-sh-head"><h4 id="jhTitle"></h4><button class="jh-x" type="button" data-jh-close aria-label="बंद करें">×</button></div>' +
      '<p class="jh-note">' + esc(NOTE) + '</p>' +
      '<div class="jh-track"></div><div class="jh-thumbs"></div>' +
      '<div class="jh-foot"><button type="button" class="jh-prev" aria-label="पिछली झलक">‹</button>' +
      '<a class="jh-btn jh-btn-main jh-cta" href="#"></a><button type="button" class="jh-next" aria-label="अगली झलक">›</button></div></section>';
    document.body.appendChild(root);
    track = root.querySelector('.jh-track'); thumbs = root.querySelector('.jh-thumbs');
    prev = root.querySelector('.jh-prev'); next = root.querySelector('.jh-next');
    cta = root.querySelector('.jh-cta'); title = root.querySelector('#jhTitle');
    root.querySelectorAll('[data-jh-close]').forEach(function (b) { b.addEventListener('click', close); });
    prev.addEventListener('click', function () { go(idx() - 1); });
    next.addEventListener('click', function () { go(idx() + 1); });
    track.addEventListener('scroll', function () { requestAnimationFrame(sync); }, { passive: true });
    var sheet = root.querySelector('.jh-sheet'), y0 = null;
    sheet.addEventListener('touchstart', function (e) { if (e.target.closest('.jh-frame, .jh-track, .jh-thumbs')) return; y0 = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', function (e) { if (y0 !== null && e.changedTouches[0].clientY - y0 > 80) close(); y0 = null; });
  }
  function idx() { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
  function sync() {
    var i = idx();
    Array.prototype.forEach.call(thumbs.children, function (b, k) { b.classList.toggle('on', k === i); });
    prev.disabled = i <= 0; next.disabled = i >= count - 1;
  }
  function go(i, instant) { track.scrollTo({ left: i * track.clientWidth, behavior: (instant || still.matches) ? 'auto' : 'smooth' }); }
  function open(k, start) {
    var t = TOOLS[k]; if (!t) return;
    if (!root) buildSheet();
    lastFocus = document.activeElement;
    title.textContent = t.title; cta.textContent = t.cta[0]; cta.href = t.cta[1];
    count = t.slides.length;
    track.innerHTML = t.slides.map(function (sl) {
      return '<figure class="jh-slide"><div class="jh-frame"><img src="' + IMG + sl.id + V + '" alt="' + esc(sl.short) + '" decoding="async"></div>' +
        '<figcaption>' + esc(sl.cap) + '</figcaption></figure>';
    }).join('');
    thumbs.innerHTML = t.slides.map(function (sl, n) {
      return '<button type="button" aria-label="झलक ' + (n + 1) + '"><img src="' + IMG + 's-' + sl.id + V + '" alt=""></button>';
    }).join('');
    Array.prototype.forEach.call(thumbs.children, function (b, n) { b.addEventListener('click', function () { go(n); }); });
    document.documentElement.classList.add('jh-open'); root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { go(start || 0, true); sync(); });
    setTimeout(function () { (next.disabled ? cta : next).focus(); }, 60);
  }
  function close() {
    document.documentElement.classList.remove('jh-open'); root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function init() {
    var mounts = document.querySelectorAll('.jh[data-jh]');
    if (!mounts.length) return;
    mounts.forEach(render);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-jh-tool]');
      if (b) { e.preventDefault(); open(b.getAttribute('data-jh-tool'), +b.getAttribute('data-jh-i')); }
    });
    document.addEventListener('keydown', function (e) {
      if (!document.documentElement.classList.contains('jh-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(idx() + 1);
      if (e.key === 'ArrowLeft') go(idx() - 1);
    });
    // cards rise in once as they reach the screen (the phone home view scrolls inside its own pane)
    var cards = document.querySelectorAll('.jh .jh-card');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      cards.forEach(function (c) { io.observe(c); });
    } else {
      cards.forEach(function (c) { c.classList.add('in'); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
