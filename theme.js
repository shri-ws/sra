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

  // ══════════════════════════════════════════════════════════════════════════
  // 2. MULTI-LANGUAGE (I18N) ENGINE (HINDI / ENGLISH / REGIONAL)
  // ══════════════════════════════════════════════════════════════════════════
  const I18N_GLOBAL = {
    hi: {
      brand_main: "PATRIKA",
      brand_sub: "by Shri Ram Ji Astro",
      lang_label: "हिन्दी",
      lang_alt: "English",
      nav_home: "गृह",
      nav_patrika: "पत्रिका (Birth Chart)",
      nav_vivah: "विवाह व मिलान",
      nav_vastu: "वास्तु मुहूर्त",
      nav_yajno: "यज्ञोपवीत",
      nav_consult: "परामर्श (Sanctuary)",
      nav_course: "कोर्स (Academy)",
      nav_about: "अबाउट व ब्लॉग",
      nav_admin: "एडमिन",
      bnav_home: "Home",
      bnav_patrika: "Patrika",
      bnav_muhurt: "Muhurt",
      bnav_sanctuary: "Sanctuary",
      cta_vivah: "मुहूर्त जाँचें ➔",
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
      nav_patrika: "Patrika (Birth Chart)",
      nav_vivah: "Vivah & Match",
      nav_vastu: "Vastu Muhurta",
      nav_yajno: "Yajnopavita",
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

    // 4. Update language toggle button labels
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

    // 5. Trigger page-specific I18N if implemented (e.g., vmm.html, mmm.html)
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
      /* ADAPTIVE APP STICKY BOTTOM NAV (< 768px) */
      .mobile-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: var(--nav-bg, #11141a);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-top: 1px solid var(--gold-border, rgba(212, 175, 55, 0.25));
        display: flex;
        align-items: center;
        justify-content: space-around;
        z-index: 9990;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25);
        box-sizing: border-box;
      }
      @media (min-width: 768px) {
        .mobile-bottom-nav {
          display: none !important;
        }
      }
      @media (max-width: 767px) {
        body {
          padding-bottom: calc(66px + env(safe-area-inset-bottom, 0px)) !important;
          overflow-x: hidden !important;
          width: 100% !important;
        }
      }
      .bnav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        flex: 1;
        height: 100%;
        color: var(--muted, #94a3b8);
        transition: color 0.2s ease, transform 0.15s ease;
        position: relative;
        -webkit-tap-highlight-color: transparent;
      }
      .bnav-item:hover, .bnav-item.active {
        color: var(--gold-dark, #c5a059);
      }
      .bnav-item.active::after {
        content: '';
        position: absolute;
        top: 0;
        left: 22%;
        right: 22%;
        height: 2.5px;
        background: linear-gradient(90deg, var(--gold2, #e5c07b), var(--gold-dark, #c5a059));
        border-radius: 0 0 4px 4px;
        box-shadow: 0 1px 6px rgba(197, 160, 89, 0.4);
      }
      .bnav-icon {
        font-size: 19px;
        line-height: 1.15;
        margin-bottom: 2px;
        transition: transform 0.2s ease;
      }
      .bnav-item.active .bnav-icon {
        transform: scale(1.1);
      }
      .bnav-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        font-family: 'Cinzel', 'Noto Sans Devanagari', sans-serif;
        text-transform: uppercase;
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
      @media (max-width: 480px) {
        .brand-title { font-size: 13.5px; }
        .brand-sub { font-size: 8px; }
        nav { height: 60px; padding: 0 10px; }
      }

      /* LANGUAGE SWITCH PILL BUTTON */
      .lang-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: var(--gold-dim, rgba(197, 160, 89, 0.1));
        border: 1px solid var(--gold-border, rgba(212, 175, 55, 0.3));
        border-radius: 20px;
        padding: 5px 10px;
        font-size: 11px;
        font-weight: 700;
        font-family: 'Cinzel', 'Noto Sans Devanagari', sans-serif;
        color: var(--gold-dark, #c5a059);
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
        white-space: nowrap;
      }
      .lang-pill-btn:hover {
        background: rgba(197, 160, 89, 0.22);
        border-color: var(--gold, #d4af37);
      }
      .lang-pill-btn .lang-sep { opacity: 0.5; font-size: 10px; margin: 0 1px; }
      .lang-pill-btn .active { color: var(--gold-dark, #c5a059); font-weight: 800; }

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
          padding: 24px 20px calc(32px + env(safe-area-inset-bottom, 0px)) !important;
          transform: translateY(100%) !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.3) !important;
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
    `;
    document.head.appendChild(style);
  }

  function injectBottomNav() {
    if (window.location.pathname.includes('admin.html')) return;
    injectBottomNavStyles();

    let nav = document.querySelector('.mobile-bottom-nav');
    const path = window.location.pathname.toLowerCase();

    const isHome = path.endsWith('/') || path.endsWith('index.html') || path === '';
    const isPatrika = path.includes('patrika.html');
    const isMuhurt = path.includes('vmm.html') || path.includes('vastu') || path.includes('yajno') || path.includes('mmm');
    const isSanctuary = path.includes('consultation.html');

    if (!nav && document.body) {
      nav = document.createElement('nav');
      nav.className = 'mobile-bottom-nav';
      nav.setAttribute('aria-label', 'Mobile Bottom Navigation');
      nav.innerHTML = `
        <a href="index.html" class="bnav-item ${isHome ? 'active' : ''}" id="bnavHome" title="Home">
          <span class="bnav-icon">🏠</span>
          <span class="bnav-label" data-i18n="bnav_home">Home</span>
        </a>
        <a href="patrika.html" class="bnav-item ${isPatrika ? 'active' : ''}" id="bnavPatrika" title="Patrika">
          <span class="bnav-icon">📜</span>
          <span class="bnav-label" data-i18n="bnav_patrika">Patrika</span>
        </a>
        <a href="vmm.html" class="bnav-item ${isMuhurt ? 'active' : ''}" id="bnavMuhurt" title="Muhurt">
          <span class="bnav-icon">🪔</span>
          <span class="bnav-label" data-i18n="bnav_muhurt">Muhurt</span>
        </a>
        <a href="consultation.html" class="bnav-item ${isSanctuary ? 'active' : ''}" id="bnavSanctuary" title="Sanctuary">
          <span class="bnav-icon">📞</span>
          <span class="bnav-label" data-i18n="bnav_sanctuary">Sanctuary</span>
        </a>
      `;
      document.body.appendChild(nav);
    } else if (nav) {
      // Sync active state if statically rendered
      const bHome = nav.querySelector('#bnavHome');
      const bPatrika = nav.querySelector('#bnavPatrika');
      const bMuhurt = nav.querySelector('#bnavMuhurt');
      const bSanctuary = nav.querySelector('#bnavSanctuary');
      if (bHome) bHome.classList.toggle('active', isHome);
      if (bPatrika) bPatrika.classList.toggle('active', isPatrika);
      if (bMuhurt) bMuhurt.classList.toggle('active', isMuhurt);
      if (bSanctuary) bSanctuary.classList.toggle('active', isSanctuary);
    }
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
  // 5. NAVBAR BRANDING & LANGUAGE PILL AUTO-UPGRADE HELPER
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

    // 2. Ensure Language toggle pill is present in top navigation
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

    // 3. Add to mobile-menu if not present
    const mobMenu = document.getElementById('mobileMenu') || document.querySelector('.mobile-menu');
    if (mobMenu && !mobMenu.querySelector('.lang-pill-btn')) {
      const mobTheme = mobMenu.querySelector('.theme-toggle-container');
      const langBtn = document.createElement('button');
      langBtn.type = 'button';
      langBtn.className = 'lang-pill-btn';
      langBtn.title = 'Switch Language / भाषा बदलें';
      langBtn.onclick = window.toggleLanguage;
      langBtn.style.cssText = 'display:inline-flex; justify-content:center; margin:8px 0; width:100%;';
      const currentLang = getCurrentLanguage();
      langBtn.innerHTML = `
        <span class="lang-hi ${currentLang==='hi'?'active':''}">हिन्दी</span>
        <span class="lang-sep">/</span>
        <span class="lang-en ${currentLang==='en'?'active':''}">EN</span>
      `;
      if (mobTheme && mobTheme.parentNode) {
        mobTheme.parentNode.insertBefore(langBtn, mobTheme);
      } else {
        mobMenu.appendChild(langBtn);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION ON DOM READY
  // ══════════════════════════════════════════════════════════════════════════
  function initAll() {
    upgradeNavBrandAndLang();
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
