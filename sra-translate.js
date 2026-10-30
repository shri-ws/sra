/* SHRI RAMJI ASTRO — ANY-LANGUAGE TRANSLATION (presentation only)
   Hindi and English come from the site's own dictionaries (sra-i18n.js).
   Every other language is machine-translated by Google's website translator:
   the page is first switched to English (the best source for translation),
   sra-i18n stops rewriting text, and the choice is remembered on every page
   through Google's own "googtrans" cookie. Choosing हिन्दी or English again
   clears it. If Google's script cannot load, the page opens through the
   translate.goog proxy instead. */
(function() {
  const LANGS = [
    ['hi', 'हिन्दी'], ['en', 'English'],
    ['mr', 'मराठी'], ['gu', 'ગુજરાતી'], ['bn', 'বাংলা'], ['pa', 'ਪੰਜਾਬੀ'], ['ta', 'தமிழ்'],
    ['te', 'తెలుగు'], ['kn', 'ಕನ್ನಡ'], ['ml', 'മലയാളം'], ['or', 'ଓଡ଼ିଆ'], ['as', 'অসমীয়া'],
    ['ne', 'नेपाली'], ['sa', 'संस्कृतम्'], ['ur', 'اردو'], ['sd', 'سنڌي'],
    ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['ru', 'Русский'],
    ['ar', 'العربية'], ['zh-CN', '中文'], ['ja', '日本語']
  ];
  const OWN = ['hi', 'en'];

  function readCookie() {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!m) return null;
    const parts = decodeURIComponent(m[1]).split('/');
    return parts[2] || null;
  }

  function writeCookie(lang) {
    const host = location.hostname;
    const domains = ['', host, '.' + host.replace(/^www\./, '')];
    domains.forEach(d => {
      const dom = d ? `;domain=${d}` : '';
      if (lang) document.cookie = `googtrans=/en/${lang};path=/${dom}`;
      else document.cookie = `googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT${dom}`;
    });
  }

  function current() {
    const g = readCookie();
    if (g && !OWN.includes(g)) return g;
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'hi';
  }

  let scriptPromise = null;
  function loadGoogle() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
      if (!document.getElementById('google_translate_element')) {
        const holder = document.createElement('div');
        holder.id = 'google_translate_element';
        holder.style.display = 'none';
        document.body.appendChild(holder);
      }
      window.sraGoogleTranslateInit = function() {
        try {
          new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
          resolve();
        } catch (e) { reject(e); }
      };
      const s = document.createElement('script');
      s.src = 'https://translate.google.com/translate_a/element.js?cb=sraGoogleTranslateInit';
      s.onerror = reject;
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('timeout')), 9000);
    });
    return scriptPromise;
  }

  function markActive(on) {
    document.documentElement.classList.toggle('sra-gt-active', on);
  }

  function ensureEnglishBase() {
    try { localStorage.setItem('sra_lang', 'en'); } catch (e) {}
    if (document.documentElement.getAttribute('lang') !== 'en' && typeof window.toggleLanguage === 'function') {
      window.toggleLanguage();
    }
  }

  async function set(lang) {
    if (OWN.includes(lang)) {
      const wasMachine = !!readCookie();
      writeCookie(null);
      markActive(false);
      try { localStorage.setItem('sra_lang', lang); } catch (e) {}
      if (wasMachine) { location.reload(); return; }
      if (current() !== lang && typeof window.toggleLanguage === 'function') window.toggleLanguage();
      document.dispatchEvent(new CustomEvent('sra:translate', { detail: { lang } }));
      return;
    }
    ensureEnglishBase();
    writeCookie(lang);
    await new Promise(r => setTimeout(r, 300));   // English base drawn first
    markActive(true);
    try {
      await loadGoogle();
      // The widget's hidden <select> drives the translation
      for (let i = 0; i < 30; i++) {
        const combo = document.querySelector('.goog-te-combo');
        if (combo) { combo.value = lang; combo.dispatchEvent(new Event('change')); break; }
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      writeCookie(null);
      markActive(false);
      const host = location.hostname.replace(/\./g, '-');
      location.href = `https://${host}.translate.goog${location.pathname}?_x_tr_sl=en&_x_tr_tl=${encodeURIComponent(lang)}&_x_tr_hl=hi`;
      return;
    }
    document.dispatchEvent(new CustomEvent('sra:translate', { detail: { lang } }));
  }

  // A machine language chosen on an earlier page: switch to the English base and translate again
  function resume() {
    const g = readCookie();
    if (!g || OWN.includes(g)) return;
    ensureEnglishBase();
    // Let sra-i18n draw the English base first, then hand the page to Google
    setTimeout(() => {
      markActive(true);
      loadGoogle().catch(() => { writeCookie(null); markActive(false); });
    }, 800);
  }

  window.SRATranslate = { LANGS, OWN, current, set };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resume);
  else resume();
})();
