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

  // Auto-load SraCouponEngine for site-wide URL referral tracking
  if (!window.SraCouponEngine) {
    try {
      const cs = document.createElement('script');
      cs.src = 'sra-coupon-engine.js';
      cs.async = true;
      document.head.appendChild(cs);
    } catch(e) {}
  }

  const L = (hi, en) => ({ hi, en });
  const MENU = [
    { href: 'patrika.html', label: L('जन्म पत्रिका', 'Birth Chart'), icon: '📜' },
    { label: L('मुहूर्त', 'Muhurta'), icon: '🪔', items: [
      { href: 'vmm.html', label: L('विवाह मुहूर्त मंथन', 'Vivah Muhurt Manthan'), icon: '💍' },
      { href: 'gun-milan.html', label: L('गुण मिलान (36 गुण)', 'Gun Milan (36 Guna)'), icon: '💑' },
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
      { href: 'about.html', label: L('अबाउट व जर्नल', 'About & Journal'), icon: '🪷' },
      { href: 'careers.html', label: L('Careers', 'Careers'), icon: '🏛️', drawerOnly: true }
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
      if (m.drawerOnly) return '';
      if (!m.items) {
        return `<a class="sra-gn-link${m.accent ? ' sra-gn-accent' : ''}" href="${m.href}"${isHere(m.href) ? ' aria-current="page"' : ''}>${esc(t(m.label))}</a>`;
      }
      const visibleItems = m.items.filter(it => !it.drawerOnly);
      if (!visibleItems.length) return '';
      const active = visibleItems.some(it => isHere(it.href));
      return `<div class="sra-gn-dd" data-dd="${i}">
        <button type="button" class="sra-gn-link sra-gn-dd-btn${active ? ' is-active' : ''}" aria-haspopup="true" aria-expanded="false">
          ${esc(t(m.label))}<svg class="sra-gn-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>
        </button>
        <div class="sra-gn-dd-menu" role="menu">
          ${visibleItems.map(it => `<a role="menuitem" href="${it.href}"${isHere(it.href) ? ' aria-current="page"' : ''}>
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
      if (m.drawerOnly) { html += row(m); return; }
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
      <div class="sra-gd-foot">
        <button type="button" class="sra-gn-app sra-gd-app"></button>
        <div class="sra-gd-support" style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;font-size:12px;color:#94a3b8;">
          सहायता / Support: <a href="mailto:support@shriramjiastro.in" style="color:#d4af37;text-decoration:none;font-weight:600;">support@shriramjiastro.in</a>
        </div>
        <div class="sra-gd-wa-community" style="margin-top:8px;text-align:center;">
          <a href="https://chat.whatsapp.com/CbJyZIEC5Lc02ytEVTGPIb" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.35);color:#25d366;font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;text-decoration:none;">
            💬 WhatsApp ज्योतिष समूह जॉइन करें ➔
          </a>
        </div>
      </div>`;
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

    injectFooterSupport();
    window.addEventListener('load', injectFooterSupport);
  }

  function injectWhatsAppFloatingWidget() {
    if (document.getElementById('sra-wa-float-btn')) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', injectWhatsAppFloatingWidget);
      return;
    }
    const groupUrl = "https://chat.whatsapp.com/CbJyZIEC5Lc02ytEVTGPIb";
    
    const container = document.createElement('div');
    container.id = 'sra-wa-float-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;pointer-events:auto;';

    container.innerHTML = `
      <style>
        #sra-wa-popover {
          position: absolute;
          bottom: 74px;
          right: 0;
          width: 320px;
          background: #11141c;
          border: 1.5px solid rgba(212, 175, 55, 0.4);
          border-radius: 18px;
          padding: 18px 18px 16px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.65), 0 0 25px rgba(37,211,102,0.15);
          color: #ffffff;
          display: none;
          flex-direction: column;
          gap: 12px;
          animation: sraWaFadeIn 0.25s ease-out;
          transform-origin: bottom right;
        }
        #sra-wa-popover.sra-open {
          display: flex !important;
        }
        @keyframes sraWaFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sra-wa-pop-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sra-wa-pop-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #25D366;
          background: rgba(37, 211, 102, 0.12);
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(37, 211, 102, 0.3);
        }
        .sra-wa-pop-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
          padding: 2px 6px;
          line-height: 1;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .sra-wa-pop-close:hover {
          color: #ffffff;
          background: rgba(255,255,255,0.1);
        }
        .sra-wa-pop-title {
          font-size: 16px;
          font-weight: 700;
          color: #f1d58a;
          line-height: 1.3;
        }
        .sra-wa-pop-desc {
          font-size: 13px;
          line-height: 1.45;
          color: #cbd5e1;
        }
        .sra-wa-pop-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #25D366;
          color: #0b101b;
          font-size: 14px;
          font-weight: 800;
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(37,211,102,0.4);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .sra-wa-pop-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(37,211,102,0.55);
        }
        .sra-wa-pop-sub {
          font-size: 11px;
          text-align: center;
          color: #64748b;
        }
        #sra-wa-float-btn {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #25D366;
          box-shadow: 0 6px 24px rgba(37,211,102,0.5), 0 2px 6px rgba(0,0,0,0.3);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        #sra-wa-float-btn:hover {
          transform: scale(1.08);
        }
        #sra-wa-float-btn:active {
          transform: scale(0.95);
        }
        .sra-wa-badge-pulse {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          background: #ff4757;
          border: 2px solid #ffffff;
          border-radius: 50%;
          animation: sraWaPulse 2s infinite;
        }
        @keyframes sraWaPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(255, 71, 87, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
        }
        .sra-wa-hint {
          position: absolute;
          right: 68px;
          top: 50%;
          transform: translateY(-50%);
          white-space: nowrap;
          background: rgba(17, 20, 28, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #f1d58a;
          font-size: 12px;
          font-weight: 700;
          padding: 7px 14px;
          border-radius: 20px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.5);
          pointer-events: none;
          opacity: 0.95;
          transition: opacity 0.2s;
        }
        @media (max-width: 640px) {
          #sra-wa-float-container { bottom: 20px; right: 20px; }
          #sra-wa-popover { width: calc(100vw - 40px); max-width: 310px; right: 0; }
          .sra-wa-hint { display: none; }
        }
      </style>

      <div id="sra-wa-popover">
        <div class="sra-wa-pop-top">
          <span class="sra-wa-pop-badge">🟢 Live Vedic Community</span>
          <button type="button" class="sra-wa-pop-close" id="sra-wa-close-btn" aria-label="Close">✕</button>
        </div>
        <div class="sra-wa-pop-title">Join Our WhatsApp Group ✨</div>
        <div class="sra-wa-pop-desc">
          Get daily authentic Panchang, BPHS planetary insights, auspicious Muhurtas, and classical remedies directly on WhatsApp.
        </div>
        <a class="sra-wa-pop-cta" href="${groupUrl}" target="_blank" rel="noopener">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          Join WhatsApp Group ➔
        </a>
        <div class="sra-wa-pop-sub">Direct access • Free & spam-free community</div>
      </div>

      <button type="button" id="sra-wa-float-btn" aria-label="Join WhatsApp Group for daily updates">
        <span class="sra-wa-hint">Daily Updates 💬</span>
        <span class="sra-wa-badge-pulse"></span>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </button>
    `;

    document.body.appendChild(container);

    const popover = document.getElementById('sra-wa-popover');
    const floatBtn = document.getElementById('sra-wa-float-btn');
    const closeBtn = document.getElementById('sra-wa-close-btn');

    floatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('sra-open');
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.remove('sra-open');
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        popover.classList.remove('sra-open');
      }
    });
  }

  // Run floating widget independently
  if (document.body) {
    injectWhatsAppFloatingWidget();
  } else {
    document.addEventListener('DOMContentLoaded', injectWhatsAppFloatingWidget);
  }
  window.addEventListener('load', injectWhatsAppFloatingWidget);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
