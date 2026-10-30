/* SHRI RAMJI ASTRO — ONE NAVIGATION BAR FOR EVERY PAGE (presentation only)
   Every page used to carry its own top bar, so the menu changed from page to page
   and some pages had no hamburger. This script draws the same bar everywhere:
   brand, desktop links with Muhurta / Reports / Learn dropdowns, the page's own
   login / language / theme buttons, an app button and a hamburger that opens a
   scrollable drawer with every link.

   The page's original bar is hidden, not deleted: its buttons that carry page
   logic (login, saved kundali, language, theme) are moved into the new bar so
   their own handlers keep working. Loaded with `defer` on every public page. */
(function() {
  if (/admin\.html$/.test(location.pathname)) return;

  const L = (hi, en) => ({ hi, en });
  const MENU = [
    { href: 'patrika.html', label: L('जन्म पत्रिका', 'Birth Chart'), icon: '📜' },
    { label: L('मुहूर्त', 'Muhurta'), icon: '🪔', items: [
      { href: 'vmm.html', label: L('विवाह मुहूर्त व मिलान', 'Marriage Muhurta & Matching'), icon: '💍' },
      { href: 'vastu-muhurta.html', label: L('वास्तु, नींव व गृह प्रवेश', 'Vastu & Griha Pravesh'), icon: '🏡' },
      { href: 'yajnopavita.html', label: L('यज्ञोपवीत (उपनयन)', 'Yajnopavita (Upanayana)'), icon: '🧵' },
      { href: 'mmm.html', label: L('चूड़ाकर्म (मुंडन)', 'Chudakarma (Mundan)'), icon: '✂️' }
    ] },
    { label: L('रिपोर्ट्स', 'Reports'), icon: '📑', items: [
      { href: 'parashara-report.html', label: L('पराशरी रिपोर्ट', 'Parashari Report'), icon: '📖', badge: '₹1111' },
      { href: 'manglik-dosh-calculator.html', label: L('मंगल दोष कैलकुलेटर', 'Manglik Dosha Calculator'), icon: '🔥' },
      { href: 'dhan-yoga-calculator.html', label: L('धन योग कैलकुलेटर', 'Dhan Yoga Calculator'), icon: '💰' },
      { href: 'bphs-encyclopedia.html', label: L('BPHS विश्वकोश', 'BPHS Encyclopedia'), icon: '🕉️' }
    ] },
    { label: L('ज्ञान', 'Learn'), icon: '📚', items: [
      { href: 'blogs.html', label: L('शोध ब्लॉग', 'Research Blog'), icon: '📝' },
      { href: 'course.html', label: L('ज्योतिष कोर्स', 'Jyotish Course'), icon: '🎓' },
      { href: 'srai.html', label: L('SRA AI', 'SRA AI'), icon: '🤖' },
      { href: 'ai-samvad.html', label: L('AI महासंवाद', 'AI Mahasamvad'), icon: '💬' },
      { href: 'about.html', label: L('अबाउट व जर्नल', 'About & Journal'), icon: '🪷' }
    ] },
    { href: 'consultation.html', label: L('1-on-1 परामर्श', '1-on-1 Consultation'), icon: '🔱', accent: true }
  ];
  const T = {
    brand: L('श्री रामजी एस्ट्रो', 'Shri Ramji Astro'),
    patrika: L('पत्रिका', 'Patrika'),
    home: L('मुख्य पृष्ठ', 'Home'),
    menu: L('मेनू', 'Menu'),
    close: L('बंद करें', 'Close'),
    app: L('पत्रिका ऐप डाउनलोड करें', 'Download Patrika App'),
    appShort: L('पत्रिका ऐप', 'Patrika App'),
    lang: L('भाषा बदलें', 'Switch language'),
    languages: L('भाषा चुनें', 'Choose language'),
    guest: L('अतिथि (Guest)', 'Guest'),
    guestSub: L('कुण्डलियां खाते में सहेजने हेतु लॉगिन करें', 'Log in to keep your kundalis in your account'),
    login: L('लॉगिन / रजिस्टर', 'Log in / Register'),
    myKundalis: L('मेरी कुण्डलियां', 'My kundalis'),
    logout: L('लॉग आउट', 'Log out')
  };

  const lang = () => (document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'hi');
  const t = (o) => o[lang()];
  const here = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/, '') || 'index';
  const isHere = (href) => href && href.replace(/\.html.*$/, '') === here;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let header, drawer, backdrop, legacy;

  // ── Markup ──────────────────────────────────────────────────────────────
  function desktopLinks() {
    return MENU.map((m, i) => {
      if (!m.items) {
        return `<a class="sra-gn-link${m.accent ? ' sra-gn-accent' : ''}" href="${m.href}"${isHere(m.href) ? ' aria-current="page"' : ''}>${esc(t(m.label))}</a>`;
      }
      const active = m.items.some(it => isHere(it.href));
      return `<div class="sra-gn-dd" data-dd="${i}">
        <button type="button" class="sra-gn-link sra-gn-dd-btn${active ? ' is-active' : ''}" aria-haspopup="true" aria-expanded="false">
          ${esc(t(m.label))}<svg class="sra-gn-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
        </button>
        <div class="sra-gn-dd-menu" role="menu">
          ${m.items.map(it => `<a role="menuitem" href="${it.href}"${isHere(it.href) ? ' aria-current="page"' : ''}>
            <span class="sra-gn-ico" aria-hidden="true">${it.icon}</span><span class="sra-gn-txt">${esc(t(it.label))}</span>${it.badge ? `<span class="sra-gn-badge">${it.badge}</span>` : ''}
          </a>`).join('')}
        </div>
      </div>`;
    }).join('');
  }

  function drawerLinks() {
    const row = (it) => `<a class="sra-gd-item${it.accent ? ' sra-gd-accent' : ''}" href="${it.href}"${isHere(it.href) ? ' aria-current="page"' : ''}>
      <span class="sra-gn-ico" aria-hidden="true">${it.icon}</span><span class="sra-gn-txt">${esc(t(it.label))}</span>${it.badge ? `<span class="sra-gn-badge">${it.badge}</span>` : ''}</a>`;
    let html = row({ href: 'index.html', label: T.home, icon: '🏠' });
    MENU.forEach(m => {
      if (!m.items) { html += row(m); return; }
      html += `<div class="sra-gd-group"><div class="sra-gd-head">${m.icon} ${esc(t(m.label))}</div>${m.items.map(row).join('')}</div>`;
    });
    return html;
  }

  function build() {
    header = document.createElement('header');
    header.className = 'sra-gnav';
    header.setAttribute('data-no-i18n', '');      // labels are drawn per language here
    header.innerHTML = `
      <div class="sra-gn-inner" role="navigation" aria-label="Main">
        <a class="sra-gn-brand" href="index.html">
          <img src="logo.png" alt="" width="38" height="38">
          <span class="sra-gn-brand-txt"><b class="sra-gn-brand-name"></b><small class="sra-gn-brand-sub"></small></span>
        </a>
        <div class="sra-gn-links"></div>
        <div class="sra-gn-actions">
          <span class="sra-gn-slot"></span>
          <button type="button" class="sra-gn-globe notranslate" translate="no">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>
          </button>
          <button type="button" class="sra-gn-app"></button>
          <button type="button" class="sra-gn-burger" aria-controls="sraGnDrawer" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>`;

    drawer = document.createElement('aside');
    drawer.className = 'sra-gdrawer';
    drawer.id = 'sraGnDrawer';
    drawer.setAttribute('data-no-i18n', '');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <div class="sra-gd-top">
        <span class="sra-gd-title"></span>
        <button type="button" class="sra-gd-close">✕</button>
      </div>
      <div class="sra-gd-account"></div>
      <div class="sra-gd-body"></div>
      <div class="sra-gd-foot"><button type="button" class="sra-gn-app sra-gd-app"></button></div>`;
    backdrop = document.createElement('div');
    backdrop.className = 'sra-gbackdrop';

    legacy = [...document.body.children].find(el =>
      /^(NAV|HEADER)$/.test(el.tagName) && !/hero/.test(el.className) && el.querySelectorAll('a').length >= 2);
    if (legacy) {
      legacy.classList.add('sra-legacy-nav');
      legacy.parentNode.insertBefore(header, legacy);
    } else {
      document.body.insertBefore(header, document.body.firstChild);
    }
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    document.documentElement.classList.add('sra-has-gnav');
    // A centred flex/grid body (feedback.html) would pull a sticky bar into the middle
    if (/flex|grid/.test(getComputedStyle(document.body).display)) {
      header.classList.add('sra-gn-fixed');
      const pad = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
      document.body.style.paddingTop = (pad + header.offsetHeight) + 'px';
    }

    header.querySelector('.sra-gn-burger').addEventListener('click', () => toggleDrawer());
    drawer.querySelector('.sra-gd-close').addEventListener('click', () => toggleDrawer(false));
    backdrop.addEventListener('click', () => toggleDrawer(false));
    [...document.querySelectorAll('.sra-gn-app')].forEach(b => b.addEventListener('click', openApp));
    header.querySelector('.sra-gn-globe').addEventListener('click', () => {
      toggleDrawer(true);
      const langs = drawer.querySelector('#sraGdLangs');
      if (langs) langs.scrollIntoView({ block: 'start' });
    });
    drawer.addEventListener('click', (e) => {
      const chip = e.target.closest('.sra-gd-langs button');
      if (!chip || !window.SRATranslate) return;
      toggleDrawer(false);
      window.SRATranslate.set(chip.dataset.lang);
    });
    document.addEventListener('sra:translate', () => render());
    document.addEventListener('sra:auth', () => render());
    drawer.addEventListener('click', (e) => {
      const b = e.target.closest('[data-auth]');
      if (!b || !window.SRAAuth) return;
      const act = b.dataset.auth;
      toggleDrawer(false);
      if (act === 'login') window.SRAAuth.open();
      else if (act === 'logout') window.SRAAuth.logout();
      else if (typeof window.openSavedKundaliModal === 'function') window.openSavedKundaliModal();
      else location.href = 'patrika.html?open=saved';
    });
    // Following a link, or pressing the page's login / kundali button, closes the drawer
    drawer.addEventListener('click', (e) => { if (e.target.closest('a, .sra-gd-account button, .sra-gd-account [onclick]')) toggleDrawer(false); });
  }

  function render() {
    header.querySelector('.sra-gn-links').innerHTML = desktopLinks();
    header.querySelector('.sra-gn-brand-name').textContent = t(T.patrika);
    header.querySelector('.sra-gn-brand-sub').textContent = t(T.brand);
    header.querySelector('.sra-gn-brand').setAttribute('aria-label', t(T.home));
    header.querySelectorAll('.sra-gn-app').forEach(b => {
      b.title = t(T.app);
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg><span>${esc(t(T.appShort))}</span>`;
    });
    const burger = header.querySelector('.sra-gn-burger');
    burger.setAttribute('aria-label', t(T.menu));
    burger.title = t(T.menu);
    drawer.querySelector('.sra-gd-title').textContent = t(T.menu);
    drawer.querySelector('.sra-gd-close').setAttribute('aria-label', t(T.close));
    drawer.querySelector('.sra-gd-body').innerHTML = accountCard() + drawerLinks() + langChips();
    const globe = header.querySelector('.sra-gn-globe');
    globe.title = t(T.languages);
    globe.setAttribute('aria-label', t(T.languages));
    const dApp = drawer.querySelector('.sra-gd-app');
    dApp.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg><span>${esc(t(T.app))}</span>`;
    const ownLang = header.querySelector('.sra-gn-lang');
    if (ownLang) {
      ownLang.title = t(T.lang);
      ownLang.querySelector('.lang-hi').classList.toggle('active', lang() === 'hi');
      ownLang.querySelector('.lang-en').classList.toggle('active', lang() === 'en');
    }
    wireDropdowns();
    requestAnimationFrame(fit);
  }

  // ── The page's own buttons move into the new bar ───────────────────────
  const ADOPT = [
    '[onclick*="openSavedKundaliModal"]',
    '#navAuthArea, #authStatusBadge, .nav-user-pill-btn',
    '#globalLangBtn, .lang-pill-btn',
    '.sra-tt, .theme-toggle-container, #themeToggleBtn, .theme-toggle-btn'
  ];

  function adoptControls() {
    if (!header) return;
    const slot = header.querySelector('.sra-gn-slot');
    ADOPT.forEach((sel, i) => {
      if (slot.querySelector(`[data-sra-adopt="${i}"]`) || drawer.querySelector(`[data-sra-adopt="${i}"]`)) return;
      const found = legacy && legacy.querySelector(sel);
      if (found) {
        // A wrapper like .theme-toggle-container moves as one piece
        found.setAttribute('data-sra-adopt', String(i));
        slot.appendChild(found);
      }
    });
    // Pages without their own language / theme buttons still get them
    if (!slot.querySelector('[data-sra-adopt="2"]') && typeof window.toggleLanguage === 'function' && !slot.querySelector('.sra-gn-lang')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-pill-btn sra-gn-lang';
      b.setAttribute('data-sra-adopt', '2');
      b.innerHTML = '<span class="lang-hi">हिन्दी</span><span class="lang-sep">/</span><span class="lang-en">EN</span>';
      b.addEventListener('click', () => window.toggleLanguage());
      slot.appendChild(b);
      render();
    }
    const themeFn = window.toggleTheme || window.toggleThemeEngine;
    if (!slot.querySelector('[data-sra-adopt="3"]') && typeof themeFn === 'function') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-toggle-btn';
      b.setAttribute('data-sra-adopt', '3');
      b.addEventListener('click', () => (window.toggleTheme || window.toggleThemeEngine)());
      slot.appendChild(b);
      if (window.SRAUI) window.SRAUI.refreshToggles();
    }
    placeAccount();
    // Keep a stable order: saved kundali, account, language, theme
    [...slot.children].sort((a, b) => (+a.dataset.sraAdopt || 0) - (+b.dataset.sraAdopt || 0)).forEach(el => slot.appendChild(el));
    slot.querySelectorAll('[data-sra-adopt="2"]').forEach(upgradeLang);
    requestAnimationFrame(fit);
  }

  // Language switch drawn like the Surya / Chandra switch: a knob sliding हि ⇄ EN.
  // The page's own click handler still does the switching; theme.js keeps toggling
  // .active on the two labels.
  function upgradeLang(btn) {
    if (btn.dataset.sraLt) return;
    btn.dataset.sraLt = '1';
    btn.classList.add('sra-lt', 'notranslate');
    btn.setAttribute('translate', 'no');
    btn.innerHTML = '<span class="sra-lt-knob" aria-hidden="true"></span><span class="lang-hi">हि</span><span class="lang-en">EN</span>';
    btn.querySelector('.lang-hi').classList.toggle('active', lang() === 'hi');
    btn.querySelector('.lang-en').classList.toggle('active', lang() === 'en');
    // While Google shows a third language, this switch brings the site's own Hindi / English back
    btn.addEventListener('click', (e) => {
      const st = window.SRATranslate;
      if (st && !st.OWN.includes(st.current())) {
        e.preventDefault();
        e.stopImmediatePropagation();
        st.set(lang());
      }
    }, true);
  }

  // Account card at the top of the drawer (sra-auth.js keeps the login)
  function accountCard() {
    const auth = window.SRAAuth;
    if (!auth) return '';
    const u = auth.user();
    if (!u) {
      return `<div class="sra-gd-me sra-gd-me-guest">
        <div class="sra-gd-me-row"><span class="sra-gd-me-av">👤</span>
          <span class="sra-gd-me-meta"><b>${esc(t(T.guest))}</b><small>${esc(t(T.guestSub))}</small></span></div>
        <button type="button" class="sra-gd-me-btn sra-gd-me-login" data-auth="login">🔑 ${esc(t(T.login))}</button>
      </div>`;
    }
    const initial = (u.name || 'U').replace(/[^A-Za-zऀ-ॿ]/g, '').charAt(0).toUpperCase() || 'U';
    const av = u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : esc(initial);
    const sub = u.email && !/@shriramjiastro\.in$/.test(u.email) ? u.email : (u.phone ? '+91 ' + u.phone : '');
    return `<div class="sra-gd-me">
      <div class="sra-gd-me-row"><span class="sra-gd-me-av">${av}</span>
        <span class="sra-gd-me-meta"><b>${esc(u.name)}</b><small>${esc(sub)}</small></span></div>
      <div class="sra-gd-me-actions">
        <button type="button" class="sra-gd-me-btn" data-auth="kundalis">📂 ${esc(t(T.myKundalis))}</button>
        <button type="button" class="sra-gd-me-btn sra-gd-me-out" data-auth="logout">⎋ ${esc(t(T.logout))}</button>
      </div>
    </div>`;
  }

  function langChips() {
    const st = window.SRATranslate;
    if (!st) return '';
    const cur = st.current();
    return `<div class="sra-gd-group sra-gd-lang-group" id="sraGdLangs">
      <div class="sra-gd-head">🌐 ${esc(t(T.languages))}</div>
      <div class="sra-gd-langs notranslate" translate="no">
        ${st.LANGS.map(([code, name]) => `<button type="button" data-lang="${code}"${code === cur ? ' aria-pressed="true"' : ''}>${name}</button>`).join('')}
      </div>
    </div>`;
  }

  // On phones the bar keeps only language, theme and the hamburger; the page's
  // saved-kundali and login buttons move to the top of the drawer, and back on wider screens.
  const phone = window.matchMedia('(max-width: 600px)');
  function placeAccount() {
    const slot = header.querySelector('.sra-gn-slot');
    const box = drawer.querySelector('.sra-gd-account');
    const pieces = [...slot.querySelectorAll(':scope > [data-sra-adopt="0"], :scope > [data-sra-adopt="1"]'),
                    ...box.querySelectorAll(':scope > [data-sra-adopt]')];
    pieces.sort((a, b) => +a.dataset.sraAdopt - +b.dataset.sraAdopt).forEach(el => {
      if (phone.matches) box.appendChild(el);
      else slot.insertBefore(el, slot.querySelector('[data-sra-adopt="2"], [data-sra-adopt="3"]'));
    });
  }

  // ── Desktop dropdowns: hover with a grace delay, click/tap/keyboard too ─
  const ddWired = new WeakSet();
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  function closeAllDd(except) {
    header.querySelectorAll('.sra-gn-dd.is-open').forEach(dd => {
      if (dd === except) return;
      dd.classList.remove('is-open');
      dd.querySelector('.sra-gn-dd-btn').setAttribute('aria-expanded', 'false');
    });
  }
  function wireDropdowns() {
    header.querySelectorAll('.sra-gn-dd').forEach(dd => {
      if (ddWired.has(dd)) return;
      ddWired.add(dd);
      const btn = dd.querySelector('.sra-gn-dd-btn');
      let timer = null;
      const open = () => { clearTimeout(timer); closeAllDd(dd); dd.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
      const close = () => { dd.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
      dd.addEventListener('mouseenter', () => { if (canHover.matches) open(); });
      // Generous delay so the pointer can travel from the button into the list
      dd.addEventListener('mouseleave', () => { clearTimeout(timer); timer = setTimeout(close, 380); });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // With a mouse the list is already open from hover: a click keeps it open.
        // On touch screens and keyboards the button toggles it.
        if (canHover.matches && e.detail > 0) open();
        else if (dd.classList.contains('is-open')) close();
        else open();
      });
      dd.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); btn.focus(); } });
      dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) close(); });
    });
  }

  // When the links and the page's buttons do not fit side by side (English labels,
  // login + register, a narrow laptop), the links move into the hamburger drawer.
  function fit() {
    if (!header) return;
    header.classList.remove('sra-gn-compact');
    const links = header.querySelector('.sra-gn-links');
    if (getComputedStyle(links).display === 'none') return;
    const actions = header.querySelector('.sra-gn-actions');
    const brand = header.querySelector('.sra-gn-brand');
    const l = links.getBoundingClientRect(), a = actions.getBoundingClientRect(), b = brand.getBoundingClientRect();
    const overlap = l.right > a.left - 8 || l.left < b.right + 8 || links.scrollWidth > links.clientWidth + 1;
    header.classList.toggle('sra-gn-compact', overlap);
  }

  // ── Drawer ──────────────────────────────────────────────────────────────
  function toggleDrawer(force) {
    const open = typeof force === 'boolean' ? force : !drawer.classList.contains('is-open');
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    header.querySelector('.sra-gn-burger').setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('sra-gd-lock', open);
    if (open) drawer.querySelector('.sra-gd-close').focus({ preventScroll: true });
  }

  function openApp() {
    toggleDrawer(false);
    if (typeof window.openAppDownloadModal === 'function') window.openAppDownloadModal();
    else location.href = 'app.html';
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  function boot() {
    if (header) return;
    build();
    render();
    adoptControls();
    // index.html keeps its login / register dialogs inside the desktop layout, which
    // phones hide, so the bar's Login did nothing there. Fixed overlays work from <body>.
    document.querySelectorAll('.desktop-main-layout .modal-overlay').forEach(m => document.body.appendChild(m));
    // theme.js and page scripts add their buttons to the old bar after load
    if (legacy) new MutationObserver(adoptControls).observe(legacy, { childList: true, subtree: true });
    window.addEventListener('load', adoptControls);
    phone.addEventListener('change', placeAccount);
    let fitTimer;
    window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    setTimeout(fit, 0);
    document.addEventListener('sra:langchange', render);
    new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    document.addEventListener('click', (e) => { if (!e.target.closest('.sra-gn-dd')) closeAllDd(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAllDd(); toggleDrawer(false); } });
    // Old drawer openers on the page now open this drawer
    // Old drawer openers (theme.js account pill, page buttons) open this drawer
    const claimDrawerApi = () => {
      window.toggleNavDrawer = () => toggleDrawer();
      window.openNavDrawer = () => toggleDrawer(true);
      window.closeNavDrawer = () => toggleDrawer(false);
    };
    claimDrawerApi();
    window.addEventListener('load', claimDrawerApi);
    window.SRANav = { open: () => toggleDrawer(true), close: () => toggleDrawer(false) };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
