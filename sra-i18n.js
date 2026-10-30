/* SHRI RAMJI ASTRO — FULL-PAGE LANGUAGE LAYER (presentation only)
   Hindi selected  → every translated string shows in Hindi only.
   English selected → every translated string shows in English only.

   Dictionaries live in sra-i18n/: common.js (nav, drawer, footer) plus one file
   per page. Each entry is [hindi, english, ...otherSpellingsOfTheSameString].
   Works alongside theme.js (data-i18n) and page-level setLanguage() handlers:
   whatever they write, this layer maps to the selected language afterwards. */
(function() {
  const pairs = new Map();      // normalized text → [hi, en]
  const origin = new WeakMap(); // text node → normalized key it was matched with
  let writing = false;
  let currentLang = 'hi';

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

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

  function translateText(node) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return;
    let key = origin.get(node);
    let pair = key && pairs.get(key);
    if (!pair) {
      key = norm(raw);
      pair = pairs.get(key) || matchPattern(key);
      if (!pair) return;
      origin.set(node, key);
    }
    const target = pair[currentLang === 'en' ? 1 : 0];
    if (!target || norm(raw) === target) return;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + target + trail;
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
    if (el.closest(SKIP)) return;
    ATTRS.forEach(attr => {
      const v = el.getAttribute(attr);
      if (!v) return;
      const store = 'sraI18n' + attr.replace(/-./g, m => m[1].toUpperCase());
      const key = el.dataset[store] || norm(v);
      const pair = pairs.get(key);
      if (!pair) return;
      el.dataset[store] = key;
      const target = pair[currentLang === 'en' ? 1 : 0];
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
    applyAll();
  }

  // Pages that do not load theme.js still get a working language pill.
  function ensureToggle() {
    if (typeof window.toggleLanguage === 'function') return;
    window.toggleLanguage = function() {
      const next = readLang() === 'hi' ? 'en' : 'hi';
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
      s.src = 'sra-i18n/' + name + '.js';
      s.async = false;
      s.onerror = () => s.remove();
      document.head.appendChild(s);
    });
  }

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
        if (m.type === 'characterData') queue.push(m.target);
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
      };
      // rAF translates before paint; the timer covers background tabs, where rAF never fires.
      requestAnimationFrame(flush);
      setTimeout(flush, 50);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  document.addEventListener('sra:langchange', e => setLang((e.detail && e.detail.lang) || readLang()));

  loadDictionaries();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  else setTimeout(boot, 0);
})();
