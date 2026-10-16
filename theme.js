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
      menu_muhurt: "मुहूर्त",
      menu_reports: "रिपोर्ट्स",
      sub_vivah_title: "विवाह मुहूर्त व मिलान",
      sub_vivah_desc: "10 महादोष व त्रिबल शुद्धि",
      sub_vastu_title: "वास्तु व गृह प्रवेश",
      sub_vastu_desc: "नींव पूजन व दिशा शुद्धि",
      sub_yajno_title: "यज्ञोपवीत (उपनयन) मुहूर्त",
      sub_yajno_desc: "16 नक्षत्र व चंद्र शुद्धि",
      sub_patrika_title: "पत्रिका (Birth Chart)",
      sub_patrika_desc: "D1-D60, विंशोत्तरी व योग",
      sub_kaalsarp_title: "कालसर्प दोष रिपोर्ट",
      sub_kaalsarp_desc: "12 कालसर्प व अचूक उपाय",
      sub_mangal_title: "मंगल दोष निवारण",
      sub_mangal_desc: "28 शास्त्रीय परिहार नियम",
      sub_ratna_title: "रत्न और वैदिक उपाय",
      sub_ratna_desc: "लग्नेश-भाग्येश शोधन व रुद्राक्ष",
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
      menu_muhurt: "Muhurts",
      menu_reports: "Reports",
      sub_vivah_title: "Vivah & Matchmaking",
      sub_vivah_desc: "10 Mahadoshas & Tribala",
      sub_vastu_title: "Vastu & Griha Pravesh",
      sub_vastu_desc: "Neev Pujan & Disha Shuddhi",
      sub_yajno_title: "Yajnopavita Muhurta",
      sub_yajno_desc: "16 Asterisms & Moon Shuddhi",
      sub_patrika_title: "Patrika (Birth Chart)",
      sub_patrika_desc: "D1-D60, Dashas & Yogas",
      sub_kaalsarp_title: "Kaal Sarp Dosh Report",
      sub_kaalsarp_desc: "12 Types & Shastra Remedies",
      sub_mangal_title: "Mangal Dosh Report",
      sub_mangal_desc: "28 Classical Parihar Rules",
      sub_ratna_title: "Gemstones & Remedies",
      sub_ratna_desc: "Ascendant/9th Lord Analysis",
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
          overflow: hidden !important;
        }
        nav .nav-btns {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
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
        nav .hamburger {
          font-size: 22px !important;
          padding: 2px 4px !important;
          color: var(--gold-dark, #c5a059) !important;
          display: block !important;
        }
        nav .brand-title {
          font-size: 14px !important;
        }
        nav .brand-sub {
          font-size: 8px !important;
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

      /* COLLAPSIBLE SLIDE-OUT NAVIGATION DRAWER (< 1024px) */
      .nav-drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(5, 3, 10, 0.65);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 9998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .nav-drawer-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }
      .nav-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 320px;
        max-width: 88vw;
        background: var(--nav-bg, #11141a);
        border-left: 1px solid var(--gold-border, rgba(212, 175, 55, 0.25));
        z-index: 9999;
        display: flex;
        flex-direction: column;
        box-shadow: -10px 0 35px rgba(0, 0, 0, 0.45);
        transform: translateX(100%);
        transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }
      .nav-drawer.open {
        transform: translateX(0);
      }
      .drawer-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--gold-border, rgba(212, 175, 55, 0.2));
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--card, #14171f);
      }
      .drawer-close-btn {
        background: none;
        border: none;
        color: var(--gold-dark, #c5a059);
        font-size: 20px;
        cursor: pointer;
        padding: 6px 10px;
        line-height: 1;
        border-radius: 8px;
        transition: background 0.2s;
      }
      .drawer-close-btn:hover {
        background: var(--gold-dim, rgba(197, 160, 89, 0.15));
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
  // 5. COLLAPSIBLE SLIDE-OUT NAVIGATION DRAWER & METHODS
  // ══════════════════════════════════════════════════════════════════════════
  window.openNavDrawer = function() {
    const drawer = document.getElementById('navDrawer');
    const backdrop = document.getElementById('navDrawerBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    try { document.body.style.overflow = 'hidden'; } catch(e) {}
  };

  window.closeNavDrawer = function() {
    const drawer = document.getElementById('navDrawer');
    const backdrop = document.getElementById('navDrawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
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

    // 2. Wire up hamburger button to toggleNavDrawer
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
