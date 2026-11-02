/* SHRI RAMJI ASTRO — SHARED UI CHROME (presentation only, no calculations)
   1. Surya Dev / Chandra Dev day-night toggle, identical on every page
   2. Gentle reveal-on-scroll movement for cards and sections
   Loaded with `defer` after theme.js on every public page. */
(function() {
  // ══════════════════════════════════════════════════════════════════════════
  // 1. SURYA / CHANDRA THEME TOGGLE
  // ══════════════════════════════════════════════════════════════════════════
  function suryaSvg() {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30) * Math.PI / 180;
      const r1 = 20.5, r2 = i % 2 ? 26 : 29;
      const x1 = 32 + r1 * Math.cos(a), y1 = 32 + r1 * Math.sin(a);
      const x2 = 32 + r2 * Math.cos(a), y2 = 32 + r2 * Math.sin(a);
      rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <g class="sra-tt-rays">${rays}</g>
        <circle cx="32" cy="32" r="15"/>
        <path d="M24.5 30.5q3 2.4 6 0M33.5 30.5q3 2.4 6 0"/>
        <path d="M26.5 37.5q5.5 4 11 0"/>
        <path d="M32 21.5v4"/>
      </g></svg>`;
  }

  function chandraSvg() {
    // Ardha-chandra with a serene face on its inner curve, cradling a star
    return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M34.2 12.5A20 20 0 1 0 48.2 40.4A16 16 0 1 1 34.2 12.5Z"/>
        <path d="M14 27.5q2.8 2.2 5.6 0"/>
        <path d="M15.5 36.5q3 2.4 6 0.2"/>
        <path d="M44 25l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="currentColor" stroke="none"/>
        <path d="M52 14l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z" fill="currentColor" stroke="none"/>
      </g></svg>`;
  }

  function isHindi() {
    return (document.documentElement.getAttribute('lang') || 'hi') !== 'en';
  }

  function toggleTitle() {
    return isHindi() ? 'दिन (सूर्यदेव) / रात्रि (चंद्रदेव)' : 'Day (Surya Dev) / Night (Chandra Dev)';
  }

  const TOGGLE_SELECTOR = '.theme-toggle-container, #themeToggleBtn, .theme-toggle-btn';

  function upgradeToggle(el) {
    if (el.dataset.sraToggle) return;
    el.dataset.sraToggle = '1';
    el.classList.add('sra-tt');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', el.getAttribute('tabindex') || '0');
    el.setAttribute('aria-label', toggleTitle());
    el.title = toggleTitle();
    el.innerHTML = `
      <span class="sra-tt-knob" aria-hidden="true"></span>
      <span class="sra-tt-ico sra-tt-sun">${suryaSvg()}</span>
      <span class="sra-tt-ico sra-tt-moon">${chandraSvg()}</span>`;
    if (el.tagName !== 'BUTTON') {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      });
    }
  }

  function upgradeAllToggles() {
    document.querySelectorAll(TOGGLE_SELECTOR).forEach(upgradeToggle);
    document.querySelectorAll('.sra-tt').forEach(el => {
      el.title = toggleTitle();
      el.setAttribute('aria-label', toggleTitle());
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2. GENTLE MOVEMENT: REVEAL CARDS AS THEY ENTER THE VIEWPORT
  // ══════════════════════════════════════════════════════════════════════════
  const REVEAL_SELECTOR = [
    '.app-service-card', '.highlight-card', '.pillar-card', '.anatomy-card', '.blog-card',
    '.rule-card', '.report-card', '.boxed-card', '.sra-pillar', '.section-header',
    '.section-heading', '.daivagya-header', '.panchang-card', '.app-quick-tile', '.matrix-box'
  ].join(',');

  let revealObserver = null;

  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sra-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px 8% 0px', threshold: 0.01 });
    observeReveal(document);
  }

  function observeReveal(root) {
    if (!revealObserver) return;
    root.querySelectorAll(REVEAL_SELECTOR).forEach((el, i) => {
      if (el.dataset.sraReveal) return;
      el.dataset.sraReveal = '1';
      const rect = el.getBoundingClientRect();
      // Already on screen at load: show immediately, no flash.
      if (rect.top < window.innerHeight && rect.bottom > 0) { el.classList.add('sra-in'); return; }
      el.classList.add('sra-reveal');
      el.style.setProperty('--sra-delay', ((i % 3) * 50) + 'ms');
      revealObserver.observe(el);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3. NAV FIT: when links overflow, tuck the last plain links away (all of them
  //    remain in the hamburger drawer) so language, app and theme stay visible.
  // ══════════════════════════════════════════════════════════════════════════
  function fitNav() {
    document.querySelectorAll('nav:not(.mobile-bottom-nav)').forEach(nav => {
      const links = nav.querySelector('.nav-links');
      if (!links) return;
      const tucked = links.querySelectorAll('.sra-nav-tucked');
      tucked.forEach(el => el.classList.remove('sra-nav-tucked'));
      if (getComputedStyle(links).display === 'none') return;
      // The sanctuary link is the one link that must never be tucked away.
      const candidates = [...links.children].filter(el =>
        (el.tagName === 'A' || el.tagName === 'BUTTON') && !/consultation\.html/.test(el.getAttribute('href') || ''));
      while (nav.scrollWidth > nav.clientWidth + 1 && candidates.length) {
        candidates.pop().classList.add('sra-nav-tucked');
      }
    });
  }

  let fitTimer = null;
  function scheduleFitNav() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitNav, 60);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BOOT
  // ══════════════════════════════════════════════════════════════════════════
  function boot() {
    upgradeAllToggles();
    setupReveal();
    fitNav();
    window.addEventListener('resize', scheduleFitNav);
    document.addEventListener('sra:langchange', scheduleFitNav);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);
    // theme.js and page scripts inject nav pieces and cards after load
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        upgradeAllToggles();
        observeReveal(document);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.SRAUI = { refreshToggles: upgradeAllToggles };
  document.addEventListener('sra:langchange', upgradeAllToggles);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* 3. ONE TAB PER SCREEN ON PHONES
   A row of tab buttons that does not fit a phone screen (the D1…D60 varga strip, chart
   chips, section navigators) shows one whole tab at a time; swipe to the next one.
   Settling on a tab selects it, so what is shown is what is open.
   Only real tab sets (one button marked active) that do not fit are changed; prev/next
   controls and bars fixed to the screen are left alone. Add data-no-onetab to a row to opt out. */
(function() {
  const PHONE = window.matchMedia('(max-width: 640px)');
  // each tab is the row's width minus 16px of side margin (and never scaled up), so its rounded
  // ends and shadow are never cut; tab i still starts at i × the row's width, which the index math relies on
  const css = `
    .sra-onetab{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;
      scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none!important;min-width:0;max-width:100%;gap:0!important;
      -webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;padding:4px 0 6px!important;box-sizing:border-box}
    .sra-onetab::-webkit-scrollbar{display:none}
    .sra-onetab>*{flex:0 0 calc(100% - 16px)!important;width:calc(100% - 16px)!important;max-width:calc(100% - 16px)!important;
      min-width:0!important;margin:0 8px!important;transform:none!important;scroll-snap-align:center;white-space:normal!important;overflow:hidden;
      line-height:1.3!important;overflow-wrap:anywhere;text-align:center;justify-content:center;box-sizing:border-box;
      height:auto!important;min-height:44px}
    .sra-onetab.sra-onetab.sra-onetab>*{transform:none!important;transition:background-color .2s ease,color .2s ease!important;margin:0 8px!important}`;
  let styled = false;

  const isTab = (el) => el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'tab';
  const isActive = (el) => /\bactive\b/.test(el.className) || el.getAttribute('aria-selected') === 'true';
  const excluded = (el) => el.closest('[data-no-onetab], header, [role="dialog"], .notranslate, .sra-gn-actions');

  // a row of 3+ tabs on one line that overflows, or whose labels wrap or get cut
  function needsOneTab(row) {
    const kids = [...row.children];
    if (kids.length < 3 || !kids.every(isTab) || excluded(row) || row.offsetParent === null) return false;
    if (!kids.some(isActive)) return false;          // a real tab set has one open tab (not quick-pick chips)
    if (kids.some(k => /^[‹«❮<←]|[›»❯>→]$|पिछला|अगला|\bprev|\bnext/i.test(k.textContent.trim()))) return false;   // prev / next controls
    for (let el = row, d = 0; el && el !== document.body && d < 8; el = el.parentElement, d++) {
      if (getComputedStyle(el).position === 'fixed') return false;   // bars fixed to the screen (bottom navigation) stay as they are
    }
    const top = kids[0].getBoundingClientRect().top;
    if (kids.some(k => Math.abs(k.getBoundingClientRect().top - top) > 4)) return false;
    if (row.scrollWidth > row.clientWidth + 2) return true;
    return kids.some(k => k.scrollWidth > k.clientWidth + 1 ||
      k.getBoundingClientRect().height > 2.2 * (parseFloat(getComputedStyle(k).lineHeight) || 20));
  }

  function tabs(row) { return [...row.children].filter(isTab); }
  function current(row) {
    const w = row.clientWidth || 1;
    return Math.max(0, Math.min(tabs(row).length - 1, Math.round(row.scrollLeft / w)));
  }

  // open the tab now in view, only after the user swiped
  // (buttons only; a link would navigate away on a swipe)
  function settle(row) {
    if (!row._byUser || !row.classList.contains('sra-onetab')) return;
    row._byUser = false;
    const tab = tabs(row)[current(row)];
    if (tab && tab.tagName !== 'A' && !isActive(tab)) tab.click();
  }

  function showActive(row) {
    if (!row.classList.contains('sra-onetab')) return;
    const i = tabs(row).findIndex(isActive);
    row.style.scrollBehavior = 'auto';               // jump, do not animate, when the page itself changes tab
    row.scrollLeft = Math.max(0, i) * row.clientWidth;
    row.style.scrollBehavior = '';
  }

  function enhance(row) {
    if (!styled) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); styled = true; }
    row.classList.add('sra-onetab');
    if (row._onetabWired) { requestAnimationFrame(() => showActive(row)); return; }
    row._onetabWired = true;
    ['pointerdown', 'touchstart', 'wheel'].forEach(ev => row.addEventListener(ev, () => { row._byUser = true; }, { passive: true }));
    let timer;
    row.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(() => settle(row), 140); }, { passive: true });
    // a tab clicked from code: keep it in view
    row.addEventListener('click', (e) => { if (e.isTrusted) return; requestAnimationFrame(() => showActive(row)); });
    new MutationObserver(() => requestAnimationFrame(() => showActive(row))).observe(row, { attributes: true, subtree: true, attributeFilter: ['class', 'aria-selected'] });
    requestAnimationFrame(() => showActive(row));
  }

  function scan() {
    if (!PHONE.matches) { document.querySelectorAll('.sra-onetab').forEach(r => r.classList.remove('sra-onetab')); return; }
    document.querySelectorAll('body *').forEach(el => {
      if (el.classList.contains('sra-onetab') || el.childElementCount < 3) return;
      if (needsOneTab(el)) enhance(el);
    });
  }

  let pending = false;
  const later = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; scan(); }, 200); };
  function start() {
    scan();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    PHONE.addEventListener('change', scan);
    window.addEventListener('resize', later);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
