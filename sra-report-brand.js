/* Whose name goes on a printed / downloaded report (23 Nov 2026, owner's rule).
   - Signed in with a number registered as an active SaaS astrologer (admin → SaaS): every report he
     prints or downloads carries only HIS saved name. "Shri Ramji Astro" stays as a tiny credit at the
     bottom; the site's logo and its donate / consultation / support / WhatsApp links are left out.
   - Anyone else: Shri Ramji Astro, with the donate and consultation links at the end of every report.
   Works on every report page without page changes: it steps in when html2pdf takes a report element
   and when the page is printed. Loaded by sra-coupon-engine.js. Server: GET /api/sutradhar/saas/brand.
   API: SRABrand.get() -> {member, name}, SRABrand.apply(el), SRABrand.refresh(). */
(function () {
  if (window.SRABrand) return;
  var CACHE = 'sra_report_brand_v1', TTL = 12 * 3600 * 1000;
  var state = { member: false, name: '' };
  var BRAND_RE = /Shri\s*Ram\s*Ji\s*Astro|Shri\s*Ramji\s*Astro|SHRI\s*RAM\s*JI\s*ASTRO|SHRI\s*RAMJI\s*ASTRO|श्री\s*राम\s*जी\s*एस्ट्रो|श्री\s*रामजी\s*एस्ट्रो|Astro\s*Raamji|shriramjiastro\.in/gi;
  var SITE_ONLY = 'a[href*="donate"],a[href*="consultation"],a[href*="payment.html"],a[href*="course.html"],a[href*="sutradhar"],' +
    'a[href*="careers"],a[href*="wa.me"],a[href*="whatsapp"],img[src*="logo"],[data-sra-site-only]';

  function loginPhone() {
    try {
      var p = localStorage.getItem('sra_verified_mobile') || localStorage.getItem('sra_user_phone') || '';
      p = String(p).split('@')[0].replace(/\D/g, '').slice(-10);
      return p.length === 10 ? p : '';
    } catch (e) { return ''; }
  }
  function apiBase() { return (window.SraCouponEngine && SraCouponEngine.apiBase()) || window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com'; }

  function fromCache(phone) {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (c && c.phone === phone && Date.now() - c.at < TTL) return c;
    } catch (e) {}
    return null;
  }
  async function refresh() {
    var phone = loginPhone();
    if (!phone) { state = { member: false, name: '' }; return state; }
    var c = fromCache(phone);
    if (c) state = { member: !!c.member, name: c.name || '' };
    try {
      var headers = (window.SraCouponEngine && SraCouponEngine.authHeaders) ? await SraCouponEngine.authHeaders() : {};
      if (!headers.Authorization) return state;       // not signed in with Firebase on this page
      var r = await fetch(apiBase() + '/api/sutradhar/saas/brand', { headers: headers });
      if (r.ok) {
        var d = await r.json();
        state = { member: !!d.member, name: d.name || '' };
        localStorage.setItem(CACHE, JSON.stringify({ phone: phone, at: Date.now(), member: state.member, name: state.name }));
      }
    } catch (e) {}
    return state;
  }

  // ---------- putting the brand on a report element ----------
  function foot(member) {
    var d = document.createElement('div');
    d.setAttribute('data-sra-brand-foot', member ? 'member' : 'site');
    d.className = 'notranslate';
    d.style.cssText = 'margin-top:18px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-family:inherit;color:#334155;page-break-inside:avoid';
    if (member) {
      d.innerHTML = '<div style="font-size:16px;font-weight:700;color:#0f172a"></div>' +
        '<div style="font-size:8px;color:#94a3b8;margin-top:6px">Shri Ramji Astro</div>';
      d.firstChild.textContent = state.name;
    } else {
      d.innerHTML = '<div style="font-size:14px;font-weight:700;color:#0f172a">Shri Ramji Astro · shriramjiastro.in</div>' +
        '<div style="font-size:12px;margin-top:4px">दैवज्ञ परामर्श: <a href="https://shriramjiastro.in/consultation.html" style="color:#2563eb">shriramjiastro.in/consultation.html</a>' +
        ' &nbsp;·&nbsp; सहयोग (दान): <a href="https://shriramjiastro.in/donate.html" style="color:#2563eb">shriramjiastro.in/donate.html</a></div>';
    }
    return d;
  }

  var undo = [];   // for print: put the page back afterwards
  function apply(el, keep) {
    if (!el || el.nodeType !== 1) return;
    var member = state.member && state.name;
    var old = el.querySelector('[data-sra-brand-foot]');
    if (old && old.getAttribute('data-sra-brand-foot') === (member ? 'member' : 'site')) return;   // already done
    if (old) old.remove();
    if (member) {
      var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName) || p.closest('[data-sra-brand-foot]')) return NodeFilter.FILTER_REJECT;
          BRAND_RE.lastIndex = 0;
          return BRAND_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      var list = [], n;
      while ((n = tw.nextNode())) list.push(n);
      list.forEach(function (t) {
        if (!keep) undo.push(['text', t, t.nodeValue]);
        t.nodeValue = t.nodeValue.replace(BRAND_RE, state.name);
      });
      el.querySelectorAll(SITE_ONLY).forEach(function (x) {
        if (x.closest('[data-sra-brand-foot]')) return;
        if (!keep) undo.push(['hide', x, x.style.display]);
        x.style.setProperty('display', 'none', 'important');
      });
    }
    var f = foot(member);
    el.appendChild(f);
    if (!keep) undo.push(['node', f]);
  }
  function revert() {
    while (undo.length) {
      var u = undo.pop();
      try {
        if (u[0] === 'text') u[1].nodeValue = u[2];
        else if (u[0] === 'hide') { u[1].style.removeProperty('display'); if (u[2]) u[1].style.display = u[2]; }
        else if (u[0] === 'node') u[1].remove();
      } catch (e) {}
    }
  }

  // ---------- html2pdf: brand the element it is given ----------
  function wrap(lib) {
    try {
      if (!lib || lib.__sraBrand) return lib;
      // the object that owns .from (html2pdf.Worker.prototype; each worker has its own object in between)
      var proto = lib.Worker && lib.Worker.prototype;
      if (!proto || !Object.prototype.hasOwnProperty.call(proto, 'from')) {
        proto = Object.getPrototypeOf(lib());
        while (proto && !Object.prototype.hasOwnProperty.call(proto, 'from')) proto = Object.getPrototypeOf(proto);
      }
      if (proto && proto.from && !proto.__sraBrand) {
        var from = proto.from;
        proto.from = function (src) {
          try { if (src && src.nodeType === 1) apply(src, true); } catch (e) {}
          return from.apply(this, arguments);
        };
        proto.__sraBrand = true;
      }
      lib.__sraBrand = true;
    } catch (e) {}
    return lib;
  }
  try {
    var cur = window.html2pdf;
    if (cur) wrap(cur);
    Object.defineProperty(window, 'html2pdf', {
      configurable: true,
      get: function () { return cur; },
      set: function (v) { cur = wrap(v); }
    });
  } catch (e) {}

  // ---------- printing the page ----------
  window.addEventListener('beforeprint', function () {
    var root = document.querySelector('main') || document.body;
    try { apply(root, false); } catch (e) {}
  });
  window.addEventListener('afterprint', revert);

  window.SRABrand = { get: function () { return state; }, apply: function (el) { apply(el, true); }, refresh: refresh };
  var phone = loginPhone(), c = phone && fromCache(phone);
  if (c) state = { member: !!c.member, name: c.name || '' };
  if (phone) setTimeout(refresh, 300);
})();
