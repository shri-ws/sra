/* SHRI RAMJI ASTRO — FULL-PAGE LANGUAGE LAYER (presentation only)
   Hindi selected  → every translated string shows in Hindi only.
   English selected → every translated string shows in English only.

   Dictionaries live in sra-i18n/: common.js (nav, drawer, footer) plus one file
   per page. Each entry is [hindi, english, ...otherSpellingsOfTheSameString].
   Works alongside theme.js (data-i18n) and page-level setLanguage() handlers:
   whatever they write, this layer maps to the selected language afterwards. */
(function() {
  // Folder this script was loaded from, so pages in sub-folders (offer/) find the dictionaries too
  const SCRIPT_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/sra-i18n\.js(\?.*)?$/, '');
  const pairs = new Map();      // normalized text → [hi, en]
  const origin = new WeakMap(); // text node → normalized key it was matched with
  let writing = false;
  let currentLang = 'hi';

  // Variation selectors (U+FE0E/FE0F) never change the meaning of a string
  function norm(s) { return s.replace(/[\uFE0E\uFE0F]/g, '').replace(/\s+/g, ' ').trim(); }

  // sra-icons.js turns colour emoji into separate line icons, so the text node that is
  // left has no emoji: every entry is also known without its emoji, and when a
  // translation still carries one, the icon layer converts it again.
  const KEEP_SIGNS = '♈♉♊♋♌♍♎♏♐♑♒♓♂♀⚧☉☽☾☿♃♄♅♆♇☊☋⚶★☆✓✗✕✖✦✧➔❮❯☰⎋⌘⌂☐❖✱✳❇';
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B05}-\u{2B55}\u{1F3FB}-\u{1F3FF}\u200D]/gu;
  const stripEmoji = s => s.replace(EMOJI, c => (KEEP_SIGNS.includes(c) ? c : '')).replace(/[\uFE0E\uFE0F]/g, '').replace(/\s+/g, ' ').trim();
  const hasEmoji = s => { EMOJI.lastIndex = 0; return [...s.matchAll(EMOJI)].some(m => !KEEP_SIGNS.includes(m[0])); };

  // Patterns for text built at runtime, e.g. "September 2026" → "सितम्बर 2026".
  // Each: regExpForHindi, regExpForEnglish, toHindi(match), toEnglish(match), and optionally
  // normHi(match) to clean a mixed Hindi+English original into pure Hindi.
  const patterns = [];

  window.SRA_I18N = {
    addPattern(reHi, reEn, toHi, toEn, normHi) {
      patterns.push({ reHi, reEn, toHi, toEn, normHi });
      if (booted) applyAll();
    },
    lookup(s) { return pairs.get(norm(s)); },
    add(entries) {
      entries.forEach(entry => {
        const pair = [entry[0], entry[1]];
        entry.forEach(s => { if (s) pairs.set(norm(s), pair); });
        const bare = [stripEmoji(entry[0] || ''), stripEmoji(entry[1] || '')];
        entry.forEach(s => {
          if (!s) return;
          const k = norm(stripEmoji(s));
          if (k && k !== norm(s) && !pairs.has(k)) pairs.set(k, bare);
        });
      });
      if (booted) applyAll();
    }
  };

  function readLang() {
    try {
      const saved = localStorage.getItem('sra_lang');
      if (saved === 'hi' || saved === 'en') return saved;
    } catch (e) {}
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'hi';
  }

  const SKIP = 'script,style,noscript,textarea,code,pre,svg,[data-no-i18n],[contenteditable="true"]';
  // The shared nav bar is data-no-i18n (it labels itself), but the page's own buttons it
  // adopts into .sra-gn-slot (login pill, saved kundalis…) still need translating.
  const HARD_SKIP = 'script,style,noscript,textarea,code,pre,svg,[contenteditable="true"]';
  function blocked(el) {
    if (!el.closest(SKIP)) return false;
    if (el.closest(HARD_SKIP)) return true;
    const slot = el.closest('.sra-gn-slot');
    const nb = el.closest('[data-no-i18n]');
    return !(slot && nb && nb.contains(slot));
  }

  function translateText(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    const parent = node.parentElement;
    if (!parent || blocked(parent)) return;
    let key = origin.get(node);
    let pair = key && pairs.get(key);
    if (!pair) {
      key = norm(raw);
      pair = pairs.get(key) || matchPattern(key);
      if (!pair) return;
      origin.set(node, key);
    }
    const target = pair[currentLang === 'en' ? 1 : 0];
    // compare normalised forms: a target that differs only by a variation selector or
    // spacing must not be written again (each write re-triggers the observer: endless loop)
    if (!target || norm(raw) === norm(target)) return;
    const mrec = mtText.get(node);
    if (mrec && raw === mrec.out && mrec.src === norm(target)) return;   // machine layer already finished this one
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + target + trail;
    if (hasEmoji(target) && typeof window.sraIconize === 'function') { try { window.sraIconize(node); } catch (e) {} }
  }

  function matchPattern(s) {
    for (const p of patterns) {
      let pair = null;
      let m = p.reEn.exec(s);
      if (m) pair = [p.toHi(m), s];
      else if ((m = p.reHi.exec(s))) pair = [p.normHi ? p.normHi(m) : s, p.toEn(m)];
      if (pair) {
        // Remember both sides so switching back finds the original again.
        [s, pair[0], pair[1]].forEach(v => pairs.set(norm(v), pair));
        return pair;
      }
    }
    return null;
  }

  const ATTRS = ['placeholder', 'title', 'aria-label'];

  function translateAttrs(el) {
    if (blocked(el)) return;
    ATTRS.forEach(attr => {
      const v = el.getAttribute(attr);
      if (!v) return;
      const store = 'sraI18n' + attr.replace(/-./g, m => m[1].toUpperCase());
      const key = el.dataset[store] || norm(v);
      const pair = pairs.get(key);
      if (!pair) return;
      el.dataset[store] = key;
      const target = pair[currentLang === 'en' ? 1 : 0];
      const mrec = (mtAttr.get(el) || {})[attr];
      if (mrec && v === mrec.out && mrec.src === norm(target)) return;
      if (target && v !== target) el.setAttribute(attr, target);
    });
    if (el.tagName === 'INPUT' && /^(button|submit)$/i.test(el.type) && el.value) {
      const key = el.dataset.sraI18nValue || norm(el.value);
      const pair = pairs.get(key);
      if (pair) {
        el.dataset.sraI18nValue = key;
        const target = pair[currentLang === 'en' ? 1 : 0];
        if (target && el.value !== target) el.value = target;
      }
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) translateText(n);
    if (root.nodeType === 1) translateAttrs(root);
    root.querySelectorAll('[placeholder],[title],[aria-label],input[type=button],input[type=submit]').forEach(translateAttrs);
  }

  // While Google translates the page into a third language (sra-translate.js), do not
  // react to the text it rewrites (the page itself is first switched to English)
  const machineTranslating = () => document.documentElement.classList.contains('sra-gt-active');

  function applyAll() {
    writing = true;
    try {
      document.title && pairs.get(norm(document.title)) && (document.title = pairs.get(norm(document.title))[currentLang === 'en' ? 1 : 0]);
      translateTree(document.body);
    } finally { writing = false; }
  }

  function setLang(lang) {
    currentLang = lang === 'en' ? 'en' : 'hi';
    document.documentElement.setAttribute('lang', currentLang);
    if (typeof mtRestore === 'function' && booted) mtRestore();
    applyAll();
    if (booted) scheduleScan(null, 150);
  }

  // Pages that do not load theme.js still get a working language pill.
  function ensureToggle() {
    if (typeof window.toggleLanguage === 'function') return;
    window.toggleLanguage = function() {
      // flip what the page shows now: sra-translate.js saves the wanted language before it calls this,
      // so reading the saved value here would flip it straight back
      const next = currentLang === 'hi' ? 'en' : 'hi';
      try { localStorage.setItem('sra_lang', next); } catch (e) {}
      document.querySelectorAll('.lang-pill-btn, #globalLangBtn').forEach(btn => {
        const hi = btn.querySelector('.lang-hi'), en = btn.querySelector('.lang-en');
        if (hi && en) { hi.classList.toggle('active', next === 'hi'); en.classList.toggle('active', next === 'en'); }
      });
      if (typeof window.setLanguage === 'function') { try { window.setLanguage(next); } catch (e) {} }
      setLang(next);
      try { document.dispatchEvent(new CustomEvent('sra:langchange', { detail: { lang: next } })); } catch (e) {}
    };
  }

  function loadDictionaries() {
    const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/, '') || 'index';
    // Pages that show another page's content (the journal lists the blog articles)
    const shared = { about: ['blogs', 'blog-articles'], blogs: ['blog-articles'] };
    ['common'].concat(shared[page] || [], [page]).forEach(name => {
      const s = document.createElement('script');
      s.src = SCRIPT_BASE + 'sra-i18n/' + name + '.js';
      s.async = false;
      s.onerror = () => s.remove();
      document.head.appendChild(s);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MACHINE FILL-IN: whatever is still in the wrong language after the dictionaries
  // (runtime text, placeholders, pages without a dictionary) is translated by the
  // engine (/api/i18n/translate, Gemini, cached there) and kept in localStorage.
  //   Hindi chosen   → leftover English becomes Hindi (UPI, PDF, WhatsApp… stay).
  //   English chosen → leftover Hindi becomes English.
  //   Another language (Google, sra-translate.js) → leftover Hindi becomes English
  //   first so Google can take it on; placeholders/titles, which Google skips,
  //   go straight into the chosen language.
  // ══════════════════════════════════════════════════════════════════════════
  const DEV = /[ऀ-ॿ]/;
  // translate="no" alone is not skipped: the home ticker uses it only to keep Google off its animation
  const MT_SKIP = '.lang-pill-btn,[data-lang],.notranslate,[data-no-mt],.shloka,[lang="sa"],' +
                  '.goog-te-combo,#google_translate_element,.skiptranslate';
  const KEEP_EN = /^(?:[\s\d₹$€£.,:;!?%&()[\]\/+\-–—•|#@*'"’“”…=<>~_^]|UPI|PDF|OTP|GST|EMI|SMS|AI|ID|IST|AM|PM|OK|SRA|SRAI|WhatsApp|Razorpay|Google|Gmail|Facebook|YouTube|Instagram|Telegram|LinkedIn|Twitter|Android|iPhone|iOS|Apple|Paytm|PhonePe|GPay|BHIM|Visa|RuPay|Mastercard|D\d{1,2}|Shri|Ram|Ji|Astro|SHRI|RAM|JI|ASTRO|Patrika|PATRIKA)+$/;
  const MT_MAX = 2500;
  const mtApi = () => ((window.SRA_API_BASE != null ? window.SRA_API_BASE
    : (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? '' : 'https://sra-canonical-engine.onrender.com')) + '/api/i18n/translate');
  const mtText = new WeakMap();   // text node → { src, out, lang }
  const mtAttr = new WeakMap();   // element → { attr: { src, out, lang } }
  const mtLive = new Set();       // nodes/elements written, to put back on a language change
  let mtTitle = null;             // { src, out, lang, orig } for document.title
  const mtMem = {};               // lang → { src: out }
  const mtWaiting = {};           // lang → Map(src → [apply fns])
  let mtTimer = null;

  function pageSrc() { return document.documentElement.getAttribute('data-translate-from') || 'en'; }
  function machineLang() {
    try { const t = window.SRATranslate; const c = t && t.current && t.current(); if (c && !t.OWN.includes(c)) return c; } catch (e) {}
    return '';
  }
  // translations kept under the first key (before the Sutradhar-name rule) are dropped once
  try { Object.keys(localStorage).forEach(k => { if (/^sra_mt_/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
  function mtStore(lang) {
    if (!mtMem[lang]) { try { mtMem[lang] = JSON.parse(localStorage.getItem('sra_mt2_' + lang) || '{}'); } catch (e) { mtMem[lang] = {}; } }
    return mtMem[lang];
  }
  let saveTimer = null;
  function mtSave(lang) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const m = mtStore(lang), keys = Object.keys(m);
      if (keys.length > 4000) keys.slice(0, keys.length - 3000).forEach(k => delete m[k]);
      try { localStorage.setItem('sra_mt2_' + lang, JSON.stringify(m)); }
      catch (e) { try { localStorage.removeItem('sra_mt2_' + lang); } catch (x) {} }
    }, 800);
  }
  const KEEP_WORDS = new Set(['upi', 'pdf', 'otp', 'gst', 'emi', 'sms', 'whatsapp', 'razorpay', 'google', 'gmail', 'facebook',
    'youtube', 'instagram', 'telegram', 'android', 'iphone', 'paytm', 'phonepe', 'gpay', 'bhim', 'visa', 'rupay', 'mastercard',
    'shri', 'ram', 'astro', 'sra', 'srai', 'bphs', 'zoom']);
  // English words that would need translating (domains and brand/acronym words do not count)
  const englishWords = s => (s.replace(/\S+\.(in|com|org|net)\S*/gi, ' ').match(/[A-Za-z]{3,}/g) || [])
    .filter(w => !KEEP_WORDS.has(w.toLowerCase()) && !/^[A-Z]{2,5}$/.test(w)).length;
  const isLink = s => /^(https?:\/\/|www\.)\S+$/i.test(s) || /^\S+@\S+\.\S+$/.test(s);
  function wrongFor(lang, s) {
    if (!s || s.length > MT_MAX || isLink(s) || (s.length < 2 && !/[०-९]/.test(s))) return false;
    if (/\d{1,2}:\d{2}:\d{2}/.test(s)) return false;   // a ticking clock would ask for a new string every second
    if (lang === 'hi') return !KEEP_EN.test(s) && englishWords(s) > 0;
    if (/^[०-९\s.,:\/\-–]+$/.test(s)) return true;          // Devanagari digits only
    if (DEV.test(s)) return s.replace(/[^ऀ-ॿ]/g, '').length >= 2;
    return lang !== 'en' && /[A-Za-z]{3,}/.test(s) && !KEEP_EN.test(s);
  }
  // The nav is data-no-i18n for the dictionaries (it labels itself in hi/en), but a label it has
  // only in Hindi still needs the machine layer, so only the hard skips and MT_SKIP apply here.
  function mtBlocked(el) { return !!el.closest(HARD_SKIP) || !!el.closest(MT_SKIP); }

  const DEV_DIGITS = '०१२३४५६७८९';
  const DIGITS_ONLY = /^[०-९\s.,:\/\-–]+$/;
  function want(lang, src, apply) {
    // Devanagari digits alone (१, २०८३) need no translator outside Hindi
    if (lang !== 'hi' && DIGITS_ONLY.test(src)) { apply(src.replace(/[०-९]/g, d => String(DEV_DIGITS.indexOf(d)))); return; }
    const hit = mtStore(lang)[src];
    if (hit !== undefined) { if (hit !== src) apply(hit); return; }
    const w = mtWaiting[lang] = mtWaiting[lang] || new Map();
    if (!w.has(src)) w.set(src, []);
    w.get(src).push(apply);
  }

  // Another script that keeps writing its own words back would start a tug of war (thousands of
  // writes a second). A page that redraws a value every second is fine; more than 20 writes to
  // one node within 2 s means a fight, and the node is left to the other script.
  const mtFlips = new WeakMap();
  function tooMany(x) {
    const now = Date.now(), f = mtFlips.get(x) || { n: 0, t: now };
    if (now - f.t > 2000) { f.n = 0; f.t = now; }
    f.n++;
    mtFlips.set(x, f);
    return f.n > 20;
  }
  function scan(root) {
    if (!root || !document.body) return;
    const mlang = machineLang();
    const lang = mlang || currentLang;
    // text: Hindi page → leftover English to Hindi; otherwise leftover Hindi to English
    // (Google turns English into a third language; a Hindi-source page is Google's alone)
    const textLang = lang === 'hi' ? 'hi' : (mlang && pageSrc() !== 'en' ? '' : 'en');
    if (textLang) {
      const walker = document.createTreeWalker(root.nodeType === 3 ? root.parentNode || document.body : root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const raw = n.nodeValue;
        if (!raw || !raw.trim()) continue;
        const rec = mtText.get(n);
        if (rec && raw === rec.out && rec.lang === textLang) continue;
        const src = norm(rec && raw === rec.out ? rec.src : raw);
        if (!wrongFor(textLang, src) || !n.parentElement || mtBlocked(n.parentElement)) continue;
        const node = n, lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        want(textLang, src, out => {
          if (!node.isConnected || !out) return;
          const cur = mtText.get(node);
          if (node.nodeValue !== raw && !(cur && node.nodeValue === cur.out)) return;   // page changed it meanwhile
          const val = lead + out + trail;
          mtText.set(node, { src, out: val, lang: textLang, orig: (cur && cur.orig) || raw });
          mtLive.add(node);
          if (node.nodeValue !== val) { if (tooMany(node)) return; writing = true; try { node.nodeValue = val; } finally { writing = false; } }
        });
      }
    }
    // the browser tab's title
    if (root === document.body && document.title) {
      const t = document.title;
      if (!(mtTitle && t === mtTitle.out && mtTitle.lang === lang)) {
        const src = norm(mtTitle && t === mtTitle.out ? mtTitle.src : t);
        if (wrongFor(lang, src)) {
          const orig = (mtTitle && mtTitle.orig) || t;
          want(lang, src, out => { if (document.title === t || (mtTitle && document.title === mtTitle.out)) { mtTitle = { src, out, lang, orig }; document.title = out; } });
        }
      }
    }
    // placeholders, titles, labels: always straight into the chosen language
    const els = root.nodeType === 1 ? [root, ...root.querySelectorAll('[placeholder],[title],[aria-label]')] : [];
    els.forEach(el => {
      if (!el.getAttribute || mtBlocked(el)) return;
      ATTRS.forEach(attr => {
        const v = el.getAttribute(attr);
        if (!v) return;
        const all = mtAttr.get(el) || {};
        const rec = all[attr];
        if (rec && v === rec.out && rec.lang === lang) return;
        const src = norm(rec && v === rec.out ? rec.src : v);
        if (!wrongFor(lang, src)) return;
        want(lang, src, out => {
          if (!el.isConnected || !out) return;
          const now = el.getAttribute(attr), cur = (mtAttr.get(el) || {})[attr];
          if (now !== v && !(cur && now === cur.out)) return;
          const a = mtAttr.get(el) || {};
          a[attr] = { src, out, lang, orig: (cur && cur.orig) || v };
          mtAttr.set(el, a);
          mtLive.add(el);
          if (now !== out) { if (tooMany(el)) return; writing = true; try { el.setAttribute(attr, out); } finally { writing = false; } }
        });
      });
    });
    mtFetchAll();
  }

  const mtBusy = {};
  let mtPauseUntil = 0;
  async function mtFetchAll() {
    if (Date.now() < mtPauseUntil) { clearTimeout(mtFetchAll.t); mtFetchAll.t = setTimeout(() => scheduleScan(null, 0), mtPauseUntil - Date.now() + 50); return; }
    for (const lang of Object.keys(mtWaiting)) {
      const w = mtWaiting[lang];
      if (!w.size || mtBusy[lang]) continue;
      mtBusy[lang] = true;
      try {
        while (w.size) {
          const batch = [...w.keys()].slice(0, 60);
          let outs = null;
          try {
            const r = await fetch(mtApi(), { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                             body: JSON.stringify({ lang, texts: batch }) });
            if (r.ok) outs = (await r.json()).translations;
          } catch (e) {}
          const store = mtStore(lang);
          batch.forEach((src, i) => {
            const fns = w.get(src) || [];
            w.delete(src);
            const out = outs && outs[i];
            if (!out) return;
            store[src] = out;                  // kept even when unchanged, so it is not asked again
            if (out === src) return;
            fns.forEach(fn => { try { fn(out); } catch (e) {} });
          });
          mtSave(lang);
          if (!outs) { mtPauseUntil = Date.now() + 30000; break; }   // server asleep or refusing: wait 30 s
        }
      } finally { mtBusy[lang] = false; }
    }
  }

  // Back to the page's own words before the dictionaries run for a new language
  function mtRestore() {
    writing = true;
    try {
      mtLive.forEach(x => {
        if (x.nodeType === 3) {
          const rec = mtText.get(x);
          if (rec && x.isConnected && x.nodeValue === rec.out) x.nodeValue = rec.orig;
          mtText.delete(x);
        } else {
          const all = mtAttr.get(x) || {};
          Object.keys(all).forEach(attr => { if (x.getAttribute(attr) === all[attr].out) x.setAttribute(attr, all[attr].orig); });
          mtAttr.delete(x);
        }
      });
      mtLive.clear();
      if (mtTitle && document.title === mtTitle.out) document.title = mtTitle.orig;
      mtTitle = null;
      Object.keys(mtWaiting).forEach(l => mtWaiting[l].clear());
    } finally { writing = false; }
  }

  function scheduleScan(root, delay) {
    if (root && root !== document.body) { scan(root); return; }
    clearTimeout(mtTimer);
    mtTimer = setTimeout(() => scan(document.body), delay == null ? 250 : delay);
  }
  document.addEventListener('sra:translate', () => scheduleScan(null, 600));
  window.SRA_I18N.fill = () => scheduleScan(null, 0);
  window.SRA_I18N.mtState = () => ({ cached: Object.fromEntries(Object.entries(mtMem).map(([l, m]) => [l, Object.keys(m).length])),
    waiting: Object.fromEntries(Object.entries(mtWaiting).map(([l, w]) => [l, w.size])), pausedFor: Math.max(0, mtPauseUntil - Date.now()) });

  let booted = false;
  function boot() {
    booted = true;
    ensureToggle();
    currentLang = readLang();
    setLang(currentLang);
    let queue = [];
    let scheduled = false;
    new MutationObserver(mutations => {
      if (writing || machineTranslating()) return;
      mutations.forEach(m => {
        if (m.type === 'characterData' || m.type === 'attributes') queue.push(m.target);
        else m.addedNodes.forEach(n => queue.push(n));
      });
      if (scheduled) return;
      scheduled = true;
      const flush = () => {
        if (!scheduled) return;
        scheduled = false;
        const batch = queue; queue = [];
        writing = true;
        try { batch.forEach(n => { if (n.isConnected) translateTree(n); }); } finally { writing = false; }
        batch.forEach(n => { if (n.isConnected) scan(n.nodeType === 3 ? n.parentNode : n); });
      };
      // rAF translates before paint; the timer covers background tabs, where rAF never fires.
      requestAnimationFrame(flush);
      setTimeout(flush, 50);
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    scheduleScan(null, 400);
  }

  document.addEventListener('sra:langchange', e => setLang((e.detail && e.detail.lang) || readLang()));

  loadDictionaries();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  else setTimeout(boot, 0);
})();
